import { NextResponse } from "next/server"
import fs from "node:fs/promises"
import path from "node:path"
import Papa from "papaparse"

type Row = Record<string, string>

export async function GET() {
  const csvPath = path.join(process.cwd(), "src", "data", "license_reduction.csv")

  try {
    const csvText = await fs.readFile(csvPath, "utf8")
    const parsed = Papa.parse<Row>(csvText, { header: true, skipEmptyLines: true })

    if (parsed.errors?.length) {
      return NextResponse.json({ error: "CSV parse error", details: parsed.errors }, { status: 500 })
    }

    const set = new Set<string>()
    for (const r of parsed.data) {
      const cc = (r.cost_center_name ?? "").trim()
      if (cc) set.add(cc)
    }

    return NextResponse.json(Array.from(set).sort(), { status: 200 })
  } catch (e: any) {
    return NextResponse.json(
      { error: "Failed to read CSV", detail: e?.message ?? String(e) },
      { status: 500 }
    )
  }
}
