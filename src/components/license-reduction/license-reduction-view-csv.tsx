"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

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

  const { data: costCenters = [] } = useQuery({
    queryKey: ["cost-centers"],
    queryFn: fetchCostCenters,
  })

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["license-reduction-csv", costCenter],
    queryFn: () => fetchRows(costCenter),
    enabled: !!costCenter,
  })

  const analystCount = React.useMemo(
  () => rows.filter(r => r.recommendedAction === "Analyst").length,
  [rows]
);

const consumerCount = React.useMemo(
  () => rows.filter(r => r.recommendedAction === "Consumer").length,
  [rows]
);
  return (
    <div className="w-full px-4"> {/* Make full width with padding */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>License Reduction Data</CardTitle>
          {/* Data description with bullet points */}
          <div className="space-y-2 text-sm text-muted-foreground mt-2 mb-4">
            <p className="font-medium">Data includes:</p>
            <ul className="space-y-1">
              <li className="flex items-start">
                <span className="mr-1">•</span>
                Users who have logged into Spotfire in the last 90 days
              </li>
              <li className="flex items-start">
                <span className="mr-1">•</span>
                <span>
                Users who perform 1+ analyst actions <strong>per day</strong> over the 90-day period are considered a candidate for an Analyst license
                </span>
              </li>
            </ul>
          </div>
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
          {/* Enhanced License Summary */}
          {costCenter && rows.length > 0 && (
            <div className="mt-4 p-3 bg-background rounded border">
              <div className="font-medium mb-2">License Distribution</div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-green-500">Analysts</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span>{analystCount} users</span>
                    <span className="bg-green-100 dark:bg-green-900/20 px-2 py-1 rounded text-green-800 dark:text-green-200 font-medium">
                      {Math.round((analystCount / rows.length) * 100)}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-500">Comsumers</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span>{consumerCount} users</span>
                    <span className="bg-blue-100 dark:bg-blue-900/20 px-2 py-1 rounded text-blue-800 dark:text-blue-200 font-medium">
                      {Math.round((consumerCount / rows.length) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}


        </CardHeader>

        <CardContent className="overflow-x-auto"> {/* Allow horizontal scrolling */}
          {isLoading ? (
            <div className="text-center py-8">Loading…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Cost Center</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Recommended License</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4">
                      No data available
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{r.name}</TableCell>
                      <TableCell>{r.user}</TableCell>
                      <TableCell>{r.email}</TableCell>
                      <TableCell>{r.costCenterName}</TableCell>
                      <TableCell>{r.departmentName}</TableCell>
                      <TableCell>{r.title}</TableCell>
                      <TableCell>
                      {r.recommendedAction === "Analyst" ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          {r.recommendedAction}
                        </Badge>
                      ) : (
                        <span>{r.recommendedAction}</span>
                      )}
                    </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
