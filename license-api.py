[
  {
    "USER_NAME": "vdasika4950",
    "USER_EMAIL": "v.dasika@samsung.com",
    "LAST_ACTIVITY": "2025-12-16 17:25:05",
    "ANALYST_FUNCTIONS": 29,
    "NON_ANALYST_FUNCTIONS": 0,
    "ANALYST_PCT": 100,
    "ANALYST_USER_FLAG": true,
    "ANALYST_THRESHOLD": 50,
    "ANALYST_ACTIONS_PER_DAY": 0.3222,
    "ANALYST_ACTIONS_PER_ACTIVE_DAYS": 29,
    "ACTIVE_DAYS": 1,
    "cost_center_name": "T1 MIE",
    "dept_name": "MIE RMG/MOL",
    "title": "Senior Engineer",
    "TITLE_CATEGORY": "Engineer"
  },
  {
    "USER_NAME": "ymao",
    "USER_EMAIL": "yingjun.mao@samsung.com",
    "LAST_ACTIVITY": "2025-12-14 08:54:17",
    "ANALYST_FUNCTIONS": 0,
    "NON_ANALYST_FUNCTIONS": 0,
    "ANALYST_PCT": 0,
    "ANALYST_USER_FLAG": false,
    "ANALYST_THRESHOLD": 50,
    "ANALYST_ACTIONS_PER_DAY": 0,
    "ANALYST_ACTIONS_PER_ACTIVE_DAYS": 0,
    "ACTIVE_DAYS": 0,
    "cost_center_name": "T1 MIE",
    "dept_name": "MIE",
    "title": "Staff Engineer I TR",
    "TITLE_CATEGORY": "Engineer"
  },


from fastapi import APIRouter, Query, HTTPException
from typing import List, Optional, Dict, Any
import pandas as pd
from pathlib import Path

router = APIRouter()


def load_df() -> pd.DataFrame:
    df = pd.read_csv('http://s3.api.com:9090/spotfire-admin/analyst-functions-users.csv')

    # normalize headers (trim + lowercase)
    df.columns = [c.strip() for c in df.columns]

    return df

@router.get("/cost-centers", response_model=List[str])
def get_cost_centers() -> List[str]:
    df = load_df()
    if "cost_center_name" not in df.columns:
        raise HTTPException(status_code=400, detail="CSV missing 'cost_center_name' column")

    centers = sorted({str(x).strip() for x in df["cost_center_name"].dropna().tolist() if str(x).strip()})
    return centers

@router.get("/license-reduction", response_model=List[Dict[str, Any]])
def get_license_reduction(cost_center_name: str = Query(...)) -> List[Dict[str, Any]]:
    df = load_df()

    if "cost_center_name" not in df.columns:
        raise HTTPException(status_code=400, detail="CSV missing 'cost_center_name' column")

    # filter
    filtered = df[df["cost_center_name"].astype(str).str.strip() == cost_center_name].copy()

    # Make sure numeric comparisons work (CSV can parse as strings)
    if "ANALYST_ACTIONS_PER_DAY" in filtered.columns:
        filtered["ANALYST_ACTIONS_PER_DAY"] = pd.to_numeric(
            filtered["ANALYST_ACTIONS_PER_DAY"], errors="coerce"
        ).fillna(0)

    # Compute recommendedAction
    filtered["recommendedAction"] = filtered["ANALYST_ACTIONS_PER_DAY"].apply(
        lambda x: "Analyst" if x >= 1 else "Consumer"
    )

    # Build a clean response that matches the React UI
    def row_to_ui(r: pd.Series) -> Dict[str, Any]:
        return {
            # UI columns
            "name": "",  # you don't have full name in CSV; keep empty for now
            "user": r.get("USER_NAME", ""),
            "email": r.get("USER_EMAIL", ""),
            "costCenterName": r.get("cost_center_name", ""),
            "departmentName": r.get("dept_name", ""),
            "title": r.get("title", ""),
            "recommendedAction": r.get("recommendedAction", ""),

            # Optional extras (handy later)
            "lastActivity": r.get("LAST_ACTIVITY", ""),
            "analystActionsPerDay": float(r.get("ANALYST_ACTIONS_PER_DAY", 0) or 0),
            "analystFunctions": int(r.get("ANALYST_FUNCTIONS", 0) or 0),
            "nonAnalystFunctions": int(r.get("NON_ANALYST_FUNCTIONS", 0) or 0),
            "activeDays": int(r.get("ACTIVE_DAYS", 0) or 0),
            "titleCategory": r.get("TITLE_CATEGORY", ""),
            "analystPct": r.get("ANALYST_PCT", ""),
            "analystUserFlag": bool(r.get("ANALYST_USER_FLAG", False)),
            "analystThreshold": r.get("ANALYST_THRESHOLD", ""),
        }

    # Convert to records
    records = [row_to_ui(row) for _, row in filtered.iterrows()]
    return records

