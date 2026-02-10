import { NextResponse } from "next/server"
import fs from "node:fs/promises"
import path from "node:path"
import Papa from "papaparse"

type Row = Record<string, string>

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const costCenter = searchParams.get("cost_center_name") ?? ""

  // Path to your CSV in the repo
  const csvPath = path.join(process.cwd(), "src", "data", "license_reduction.csv")

  try {
    const csvText = await fs.readFile(csvPath, "utf8")

    const parsed = Papa.parse<Row>(csvText, {
      header: true,
      skipEmptyLines: true,
    })

    if (parsed.errors?.length) {
      return NextResponse.json(
        { error: "CSV parse error", details: parsed.errors },
        { status: 500 }
      )
    }

    let rows = parsed.data

    // Filter server-side by cost_center_name (dropdown value)
    if (costCenter) {
      rows = rows.filter((r) => (r.cost_center_name ?? "") === costCenter)
    }

    const mapped = rows.map((r) => ({
    user: r.user,
    currentLicense: r.current_license,
    lastActive: r.last_active,
    recommendedAction: r.recommended_action,
    estSavingsUsd: Number(r.est_savings_usd),
    costCenterName: r.cost_center_name,
    }))

    return NextResponse.json(mapped, { status: 200 })
  } catch (e: any) {
    return NextResponse.json(
      { error: "Failed to read CSV", detail: e?.message ?? String(e) },
      { status: 500 }
    )
  }
}
