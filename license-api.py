from fastapi import APIRouter, Query, HTTPException
from typing import List, Optional, Dict, Any
import pandas as pd
from pathlib import Path

router = APIRouter(prefix="/v0", tags=["license-reduction"])

CSV_PATH = Path(__file__).resolve().parents[1] / "data" / "license_reduction.csv"

def load_df() -> pd.DataFrame:
    if not CSV_PATH.exists():
        raise HTTPException(status_code=500, detail=f"CSV not found at {CSV_PATH}")
    df = pd.read_csv(CSV_PATH)

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

    # OPTIONAL: map/clean types here
    # e.g. if column exists as string, convert to numeric
    if "est_savings_usd" in filtered.columns:
        filtered["est_savings_usd"] = pd.to_numeric(filtered["est_savings_usd"], errors="coerce").fillna(0).astype(int)

    # return list of dicts
    return filtered.fillna("").to_dict(orient="records")
