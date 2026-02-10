import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const costCenterName = searchParams.get("cost_center_name") ?? ""

  // Optional: basic validation
  if (!costCenterName) {
    return NextResponse.json(
      { error: "Missing required query param: cost_center_name" },
      { status: 400 }
    )
  }

  const base = process.env.FASTAPI_BASE_URL
  if (!base) {
    return NextResponse.json(
      { error: "FASTAPI_BASE_URL is not configured" },
      { status: 500 }
    )
  }

  // Build upstream URL safely
  const upstream = new URL("/api/license-reduction", base)
  upstream.searchParams.set("cost_center_name", costCenterName)

  try {
    // Forward request to FastAPI
    const res = await fetch(upstream.toString(), {
      method: "GET",
      // If you need auth later, add headers here.
      headers: {
        "Accept": "application/json",
        // Example for future:
        // "Authorization": `Bearer ${token}`,
      },
      // For frequently-changing data, avoid caching:
      cache: "no-store",
    })

    const contentType = res.headers.get("content-type") || ""

    // If FastAPI returns non-JSON, pass it through as text
    if (!contentType.includes("application/json")) {
      const text = await res.text()
      return new NextResponse(text, { status: res.status })
    }

    const data = await res.json()

    // Pass through status and data
    return NextResponse.json(data, { status: res.status })
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to reach FastAPI", detail: err?.message ?? String(err) },
      { status: 502 }
    )
  }
}
