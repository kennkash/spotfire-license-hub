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

    # return list of dicts
    return filtered.fillna("").to_dict(orient="records")
