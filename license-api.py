from fastapi import APIRouter, Query, HTTPException
from typing import List, Dict, Any
import pandas as pd
from bigdataloader2 import *
from io import BytesIO
from s2cloudapi import s3api as s3
from aiocache import cached
from aiocache.serializers import PickleSerializer

router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

# ----------------------------------------------------------------------
# Fetch the secondary employee lookup (exact same columns as the
# primary lookup, but a different data source)
# ----------------------------------------------------------------------
def _get_fallback_employee_data() -> pd.DataFrame:
    """
    Returns a DataFrame with columns ['full_name', 'smtp'] that will be used
    when the primary merge could not resolve a FULL_NAME.
    """
    params = {"data_type": "dss_employee_ghr", "MLR": "L"}
    custom_columns = ["full_name", "smtp"]
    return getData(params=params, custom_columns=custom_columns)


def read_json_from_bucket(bucket: str, key: str) -> dict:
    """Read a .json file from an s3 bucket as a dictionary"""
    boto_object = s3.get_object(bucket=bucket, key=key)
    csv_bytes = boto_object["Body"].read()
    df = pd.read_csv(BytesIO(csv_bytes))
    return df


def getCreds() -> pd.DataFrame:
    bucket = "spotfire-admin"
    key = "analyst-functions-users.csv"
    license_data = read_json_from_bucket(bucket=bucket, key=key)
    return license_data


async def get_cached_data():
    # This will automatically cache the result for 24 hours
    @cached(ttl=86400, serializer=PickleSerializer())
    async def load_data():
        df = getCreds()
        df.columns = [c.strip() for c in df.columns]

        df = df.where(df.notna(), None)

        if "ANALYST_ACTIONS_PER_DAY" in df.columns:
            df["ANALYST_ACTIONS_PER_DAY"] = pd.to_numeric(
                df["ANALYST_ACTIONS_PER_DAY"], errors="coerce"
            ).fillna(0)

        df["recommendedAction"] = df["ANALYST_ACTIONS_PER_DAY"].apply(
            lambda x: "Analyst" if x >= 1 else "Consumer"
        )

        params = {"data_type": "pageradm_employee_ghr", "MLR": "L"}
        custom_columns = ["full_name", "smtp"]
        user_data = getData(params=params, custom_columns=custom_columns)

        final_df = (
            df.merge(user_data, how="left", left_on="USER_EMAIL", right_on="smtp")
            .drop(columns="smtp")
            .rename(columns={"full_name": "FULL_NAME"})
        )

        return final_df

    return await load_data()


@router.get("/cost-centers", response_model=List[str])
async def get_cost_centers():
    df = await get_cached_data()
    if "cost_center_name" not in df.columns:
        raise HTTPException(
            status_code=400, detail="CSV missing 'cost_center_name' column"
        )

    centers = sorted(
        {
            str(x).strip()
            for x in df["cost_center_name"].dropna().tolist()
            if str(x).strip()
        }
    )
    return centers


@router.get("/license-reduction", response_model=List[Dict[str, Any]])
async def get_license_reduction(
    cost_center_name: str = Query(..., description="Exact cost‑center name")
) -> List[Dict[str, Any]]:
    """
    Retrieve licence‑reduction information for a given cost‑center.
    If a row does not have a FULL_NAME after the *primary* merge, we attempt
    a secondary merge against `user_data2` (fallback employee data).
    """
    # 1Load cached licence/analyst data
    df = await get_cached_data()

    # ------------------------------------------------------------------
    # Defensive check – the CSV must contain the column you are filtering on
    # ------------------------------------------------------------------
    if "cost_center_name" not in df.columns:
        raise HTTPException(
            status_code=400, detail="CSV missing 'cost_center_name' column"
        )

    # Filter to the requested cost‑center (case‑insensitive, stripped)
    filt_mask = (
        df["cost_center_name"].astype(str).str.strip().eq(cost_center_name.strip())
    )
    filtered = df.loc[filt_mask].copy()

    # ------------------------------------------------------------------
    # SECONDARY MERGE – only for rows where FULL_NAME is still null
    # ------------------------------------------------------------------
    missing_name_mask = filtered["FULL_NAME"].isna()
    if missing_name_mask.any():
        # Pull the fallback employee list (only once)
        fallback_emp = _get_fallback_employee_data()

        # Merge *just* the rows that need a name
        # We keep only the columns we need from the right side (full_name + smtp)
        to_fix = filtered.loc[missing_name_mask].merge(
            fallback_emp,
            how="left",
            left_on="USER_EMAIL",
            right_on="smtp",
            suffixes=("", "_fb"),
        )

        # Fill the missing FULL_NAME with whatever we got from the fallback
        # (`full_name` column comes from the right side of the merge)
        fallback_map = to_fix.set_index("USER_EMAIL")["full_name"].to_dict()
        filtered.loc[missing_name_mask, "FULL_NAME"] = filtered.loc[
            missing_name_mask, "USER_EMAIL"
        ].map(fallback_map)

        # Drop the temporary `smtp` column that was added.
        if "smtp" in filtered.columns:
            filtered = filtered.drop(columns="smtp")


    # ------------------------------------------------------------------
    # Helper: turn a pandas Series → the dict expected by the response model
    # ------------------------------------------------------------------
    def row_to_ui(r: pd.Series) -> Dict[str, Any]:
        """Safely convert pandas values to plain‑python / JSON‑serialisable types."""

        def safe_convert(value):
            # pandas uses its own NA type – treat it as None
            if pd.isna(value) or isinstance(value, pd._libs.missing.NAType):
                return None
            return value

        return {
            "name": safe_convert(r.get("FULL_NAME", "")),
            "user": safe_convert(r.get("USER_NAME", "")),
            "email": safe_convert(r.get("USER_EMAIL", "")),
            "costCenterName": safe_convert(r.get("cost_center_name", "")),
            "departmentName": safe_convert(r.get("dept_name", "")),
            "title": safe_convert(r.get("title", "")),
            "recommendedAction": safe_convert(r.get("recommendedAction", "")),
            "lastActivity": safe_convert(r.get("LAST_ACTIVITY", "")),
            "analystActionsPerDay": safe_convert(
                r.get("ANALYST_ACTIONS_PER_DAY", 0) or 0
            ),
            "analystFunctions": safe_convert(r.get("ANALYST_FUNCTIONS", 0) or 0),
            "nonAnalystFunctions": safe_convert(r.get("NON_ANALYST_FUNCTIONS", 0) or 0),
            "activeDays": safe_convert(r.get("ACTIVE_DAYS", 0) or 0),
            "titleCategory": safe_convert(r.get("TITLE_CATEGORY", "")),
            "analystPct": safe_convert(r.get("ANALYST_PCT", "")),
            "analystUserFlag": safe_convert(r.get("ANALYST_USER_FLAG", False)),
            "analystThreshold": safe_convert(r.get("ANALYST_THRESHOLD", "")),
        }

    # Build the list of dicts that FastAPI will serialise to JSON
    records = [row_to_ui(row) for _, row in filtered.iterrows()]
    return records
