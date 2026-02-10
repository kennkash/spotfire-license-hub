"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

async function fetchCostCenters(): Promise<string[]> {
  const res = await fetch("/api/cost-centers", { cache: "no-store" })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

async function fetchRows(costCenter: string): Promise<any[]> {
  const res = await fetch(
    `/api/license-reduction-csv?cost_center_name=${encodeURIComponent(costCenter)}`,
    { cache: "no-store" }
  )
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

export default function LicenseReductionView() {
  const [costCenter, setCostCenter] = React.useState("")

  // 🔽 Hooks must be inside the component
  const { data: costCenters = [] } = useQuery({
    queryKey: ["cost-centers"],
    queryFn: fetchCostCenters,
  })

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["license-reduction-csv", costCenter],
    queryFn: () => fetchRows(costCenter),
    enabled: !!costCenter,
  })

  return (
    <div className="max-w-5xl">
      <Card>
        <CardHeader>
          <CardTitle>License reduction data</CardTitle>

          <Select value={costCenter} onValueChange={setCostCenter}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Select a cost center" />
            </SelectTrigger>
            <SelectContent>
              {costCenters.map((cc) => (
                <SelectItem key={cc} value={cc}>
                  {cc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>

        <CardContent>
          {isLoading && <div>Loading…</div>}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>License</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead>Recommended</TableHead>
                <TableHead className="text-right">Savings</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, idx) => (
                <TableRow key={idx}>
                  <TableCell>{r.user}</TableCell>
                  <TableCell>{r.current_license}</TableCell>
                  <TableCell>{r.last_active}</TableCell>
                  <TableCell>{r.recommended_action}</TableCell>
                  <TableCell className="text-right">
                    {Number(r.est_savings_usd).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
