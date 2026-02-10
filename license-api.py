from fastapi import APIRouter, Query, HTTPException
from typing import List, Dict, Any, Optional
import pandas as pd
from io import BytesIO

from bigdataloader2 import getData
from s2cloudapi import s3api as s3

from aiocache import cached
from aiocache.serializers import PickleSerializer

router = APIRouter()

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

CACHE_TTL_SECONDS = 86400  # 24 hours
S3_BUCKET = "spotfire-admin"
S3_KEY = "analyst-functions-users.csv"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def read_csv_from_bucket(bucket: str, key: str) -> pd.DataFrame:
    """
    Read a CSV object from S3 and return a pandas DataFrame.
    """
    boto_object = s3.get_object(bucket=bucket, key=key)
    csv_bytes = boto_object["Body"].read()
    df = pd.read_csv(BytesIO(csv_bytes))
    return df


def get_license_df() -> pd.DataFrame:
    """
    Pull the license reduction dataset from S3.
    """
    return read_csv_from_bucket(bucket=S3_BUCKET, key=S3_KEY)


def _get_primary_employee_data() -> pd.DataFrame:
    """
    Primary employee lookup (full_name, smtp, status_name).
    """
    params = {"data_type": "pageradm_employee_ghr", "MLR": "L"}
    custom_columns = ["full_name", "smtp", "status_name"]
    return getData(params=params, custom_columns=custom_columns)


def _get_fallback_employee_data() -> pd.DataFrame:
    """
    Secondary/fallback employee lookup (full_name, smtp, status_name).
    Used only when the primary merge fails to resolve FULL_NAME.
    """
    params = {"data_type": "dss_employee_ghr", "MLR": "L"}
    custom_columns = ["full_name", "smtp", "status_name"]
    return getData(params=params, custom_columns=custom_columns)


def _partner_to_samsung_email(email: Optional[str]) -> Optional[str]:
    """
    If a license row uses a contractor/partner email but the employee tables
    now contain @samsung.com, we try an alternate email.

    Example:
      someone@partner.samsung.com -> someone@samsung.com
    """
    if not email:
        return email
    e = str(email).strip()
    if "@partner.samsung" in e:
        left = e.split("@", 1)[0]
        return f"{left}@samsung.com"
    return e


# ---------------------------------------------------------------------------
# Cached data builders
# ---------------------------------------------------------------------------


@cached(ttl=CACHE_TTL_SECONDS, serializer=PickleSerializer())
async def get_cached_final_df() -> pd.DataFrame:
    """
    Build the fully-enriched dataset once (per TTL) and cache it:

    1) Load license CSV from S3
    2) Compute recommendedAction
    3) Primary merge on USER_EMAIL -> smtp to get FULL_NAME + STATUS_NAME
    4) Fallback merge for remaining missing FULL_NAME
    5) Partner email repair (partner -> samsung) for still-missing
    """
    # 1) Load license activity CSV
    df = get_license_df()
    df.columns = [c.strip() for c in df.columns]
    df = df.where(df.notna(), None)

    # Numeric conversion (csv sometimes produces strings)
    if "ANALYST_ACTIONS_PER_DAY" in df.columns:
        df["ANALYST_ACTIONS_PER_DAY"] = pd.to_numeric(
            df["ANALYST_ACTIONS_PER_DAY"], errors="coerce"
        ).fillna(0)

    # Compute recommendedAction once
    df["recommendedAction"] = df["ANALYST_ACTIONS_PER_DAY"].apply(
        lambda x: "Analyst" if float(x) >= 1 else "Consumer"
    )

    # Partner repair candidate email (used later if needed)
    df["USER_EMAIL_ALT"] = df["USER_EMAIL"].apply(_partner_to_samsung_email)

    # 2) Primary employee lookup
    user_data = _get_primary_employee_data().copy()
    user_data["smtp"] = user_data["smtp"].astype(str).str.strip()

    # 3) Primary merge on email
    merged = (
        df.merge(
            user_data,
            how="left",
            left_on="USER_EMAIL",
            right_on="smtp",
            suffixes=("", "_emp"),
        )
        .drop(columns=["smtp"], errors="ignore")
        .rename(columns={"full_name": "FULL_NAME", "status_name": "STATUS_NAME"})
    )

    # 4) Fallback merge ONLY where FULL_NAME is missing
    missing_mask = merged["FULL_NAME"].isna()
    if missing_mask.any():
        fallback_emp = _get_fallback_employee_data().copy()
        fallback_emp["smtp"] = fallback_emp["smtp"].astype(str).str.strip()

        to_fix = merged.loc[missing_mask].merge(
            fallback_emp,
            how="left",
            left_on="USER_EMAIL",
            right_on="smtp",
            suffixes=("", "_fb"),
        )

        # Fill missing FULL_NAME/STATUS_NAME from fallback merge
        name_map = to_fix.set_index("USER_EMAIL")["full_name"].to_dict()
        status_map = to_fix.set_index("USER_EMAIL")["status_name"].to_dict()

        merged.loc[missing_mask, "FULL_NAME"] = merged.loc[
            missing_mask, "USER_EMAIL"
        ].map(name_map)
        merged.loc[missing_mask, "STATUS_NAME"] = merged.loc[
            missing_mask, "USER_EMAIL"
        ].map(status_map)

    # 5) Partner email repair (still missing + partner email)
    still_missing = merged["FULL_NAME"].isna()
    partner_missing = still_missing & merged["USER_EMAIL"].astype(str).str.contains(
        "@partner.samsung", na=False
    )

    if partner_missing.any():
        to_fix2 = merged.loc[partner_missing].merge(
            user_data,
            how="left",
            left_on="USER_EMAIL_ALT",
            right_on="smtp",
            suffixes=("", "_alt"),
        )

        name_map2 = to_fix2.set_index("USER_EMAIL")["full_name"].to_dict()
        status_map2 = to_fix2.set_index("USER_EMAIL")["status_name"].to_dict()

        merged.loc[partner_missing, "FULL_NAME"] = merged.loc[
            partner_missing, "USER_EMAIL"
        ].map(name_map2)
        merged.loc[partner_missing, "STATUS_NAME"] = merged.loc[
            partner_missing, "USER_EMAIL"
        ].map(status_map2)

    return merged


@cached(ttl=CACHE_TTL_SECONDS, serializer=PickleSerializer())
async def get_cached_cost_centers_list() -> List[str]:
    """
    Cache the cost center list so the UI dropdown doesn't cause repeated work.
    """
    df = await get_cached_final_df()

    if "cost_center_name" not in df.columns:
        raise HTTPException(status_code=400, detail="CSV missing 'cost_center_name' column")

    centers = sorted(
        {
            str(x).strip()
            for x in df["cost_center_name"].dropna().tolist()
            if str(x).strip()
        }
    )
    return centers


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.get("/cost-centers", response_model=List[str])
async def get_cost_centers() -> List[str]:
    return await get_cached_cost_centers_list()


@router.get("/license-reduction", response_model=List[Dict[str, Any]])
async def get_license_reduction(
    cost_center_name: str = Query(..., description="Exact cost-center name"),
) -> List[Dict[str, Any]]:
    """
    Return a list of records in the exact shape expected by the Next frontend.
    """
    df = await get_cached_final_df()

    if "cost_center_name" not in df.columns:
        raise HTTPException(status_code=400, detail="CSV missing 'cost_center_name' column")

    mask = df["cost_center_name"].astype(str).str.strip().eq(cost_center_name.strip())
    filtered = df.loc[mask].copy()

    def safe(v):
        return None if pd.isna(v) else v

    def row_to_ui(r: pd.Series) -> Dict[str, Any]:
        return {
            # UI-visible columns
            "name": safe(r.get("FULL_NAME")),
            "statusName": safe(r.get("STATUS_NAME")),
            "user": safe(r.get("USER_NAME")),
            "email": safe(r.get("USER_EMAIL")),
            "costCenterName": safe(r.get("cost_center_name")),
            "departmentName": safe(r.get("dept_name")),
            "title": safe(r.get("title")),
            "recommendedAction": safe(r.get("recommendedAction")),

            # Extra fields (optional; safe to keep for later UI expansion)
            "lastActivity": safe(r.get("LAST_ACTIVITY")),
            "analystActionsPerDay": float(r.get("ANALYST_ACTIONS_PER_DAY") or 0),
            "analystFunctions": int(r.get("ANALYST_FUNCTIONS") or 0),
            "nonAnalystFunctions": int(r.get("NON_ANALYST_FUNCTIONS") or 0),
            "activeDays": int(r.get("ACTIVE_DAYS") or 0),
            "titleCategory": safe(r.get("TITLE_CATEGORY")),
            "analystPct": safe(r.get("ANALYST_PCT")),
            "analystUserFlag": bool(r.get("ANALYST_USER_FLAG") or False),
            "analystThreshold": safe(r.get("ANALYST_THRESHOLD")),
        }

    return [row_to_ui(row) for _, row in filtered.iterrows()]
    
    
    @router.get("/license-reduction/missing-names", response_model=List[Dict[str, Any]])
async def get_missing_full_names() -> List[Dict[str, Any]]:
    """
    Returns all rows that still do not have FULL_NAME after
    primary merge, fallback merge, and partner repair.
    """
    df = await get_cached_final_df()

    missing = df[df["FULL_NAME"].isna()].copy()

    def safe(v):
        return None if pd.isna(v) else v

    return [
        {
            "user": safe(r.get("USER_NAME")),
            "email": safe(r.get("USER_EMAIL")),
            "altEmail": safe(r.get("USER_EMAIL_ALT")),
            "costCenterName": safe(r.get("cost_center_name")),
            "departmentName": safe(r.get("dept_name")),
            "analystActionsPerDay": safe(r.get("ANALYST_ACTIONS_PER_DAY")),
        }
        for _, r in missing.iterrows()
    ]