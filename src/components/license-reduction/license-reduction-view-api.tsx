"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type LicenseRow = {
  user: string
  current_license: string
  last_active: string
  recommended_action: string
  est_savings_usd: number
  cost_center_name: string
}

const COST_CENTERS = ["ETCH", "PHOTO", "CMP", "METRO"] as const

async function fetchLicenseReduction(costCenter: string): Promise<LicenseRow[]> {
  const res = await fetch(
    `/api/license-reduction?cost_center_name=${encodeURIComponent(costCenter)}`,
    { cache: "no-store" }
  )
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

export default function LicenseReductionView() {
  const [costCenter, setCostCenter] = React.useState("")

  const {
    data: rows = [],
    isLoading,
    isError,
    error,
    isFetching,
  } = useQuery({
    queryKey: ["license-reduction", costCenter],
    queryFn: () => fetchLicenseReduction(costCenter),
    enabled: !!costCenter, // don’t run until selected
  })

  return (
    <div className="max-w-5xl">
      <Card>
        <CardHeader className="gap-3">
          <CardTitle>License reduction data</CardTitle>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="text-sm text-muted-foreground">Cost Center</div>
            <Select value={costCenter} onValueChange={setCostCenter}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Select a cost center" />
              </SelectTrigger>
              <SelectContent>
                {COST_CENTERS.map((cc) => (
                  <SelectItem key={cc} value={cc}>
                    {cc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {!!costCenter && (
              <div className="text-xs text-muted-foreground">
                {isFetching ? "Refreshing…" : ""}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {!costCenter && (
            <div className="text-sm text-muted-foreground">
              Select a cost center to load data.
            </div>
          )}

          {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}

          {isError && (
            <div className="text-sm text-red-500">
              {(error as Error)?.message ?? "Error loading data"}
            </div>
          )}

          {!!costCenter && !isLoading && !isError && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Current License</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead>Recommended Action</TableHead>
                    <TableHead className="text-right">Est. Savings ($)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={`${r.user}-${r.cost_center_name}`}>
                      <TableCell className="font-medium">{r.user}</TableCell>
                      <TableCell>{r.current_license}</TableCell>
                      <TableCell>{r.last_active}</TableCell>
                      <TableCell>{r.recommended_action}</TableCell>
                      <TableCell className="text-right">
                        {r.est_savings_usd.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}

                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                        No rows returned for {costCenter}.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
