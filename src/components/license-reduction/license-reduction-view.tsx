"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"   // ✅ add
import { getApiBase } from "@/lib/apiBase"

// ...fetchCostCenters + fetchRows unchanged...

export default function LicenseReductionView() {
  const [costCenter, setCostCenter] = React.useState("")
  const [search, setSearch] = React.useState("") // ✅ add

  const { data: costCenters = [] } = useQuery({
    queryKey: ["cost-centers"],
    queryFn: fetchCostCenters,
  })

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["license-reduction", costCenter],
    queryFn: () => fetchRows(costCenter),
    enabled: !!costCenter,
    refetchOnWindowFocus: false,
  })

  // Optional: clear search when switching cost centers
  React.useEffect(() => {
    setSearch("")
  }, [costCenter])

  const analystCount = React.useMemo(
    () => rows.filter((r) => r.recommendedAction === "Analyst").length,
    [rows]
  )

  const consumerCount = React.useMemo(
    () => rows.filter((r) => r.recommendedAction === "Consumer").length,
    [rows]
  )

  const sortedRows = React.useMemo(() => {
    if (!rows.length) return []

    const analysts = rows.filter((r) => r.recommendedAction === "Analyst")
    const consumers = rows.filter((r) => r.recommendedAction !== "Analyst")

    const getGroupedAndSorted = (arr: any[]) => {
      const userMap = new Map<string, any[]>()
      arr.forEach((item) => {
        if (!userMap.has(item.user)) userMap.set(item.user, [])
        userMap.get(item.user)!.push(item)
      })

      userMap.forEach((group) => {
        group.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))
      })

      return Array.from(userMap.values())
        .sort((a, b) => (a[0].user ?? "").localeCompare(b[0].user ?? ""))
        .flat()
    }

    return [...getGroupedAndSorted(analysts), ...getGroupedAndSorted(consumers)]
  }, [rows])

  // ✅ Filter by name, email, or username
  const filteredRows = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return sortedRows

    return sortedRows.filter((r) => {
      const name = String(r.name ?? "").toLowerCase()
      const email = String(r.email ?? "").toLowerCase()
      const user = String(r.user ?? "").toLowerCase()
      return name.includes(q) || email.includes(q) || user.includes(q)
    })
  }, [sortedRows, search])

  return (
    <div className="w-full px-4">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>License Reduction Data</CardTitle>

          {/* ...your bullet list... */}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-3">
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

            {/* ✅ Search bar */}
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, or username…"
              className="sm:w-[340px]"
              disabled={!costCenter || isLoading}
            />
          </div>

          {/* optional: show count */}
          {!!search.trim() && (
            <div className="mt-2 text-sm text-muted-foreground">
              Showing {filteredRows.length} of {sortedRows.length}
            </div>
          )}

          {/* ...your license summary block... */}
        </CardHeader>

        <CardContent className="overflow-x-auto">
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
                  <TableHead>Employee Status</TableHead>
                  <TableHead>Recommended License</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-4">
                      No matching results
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((r, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        {r.name === "Possibly Terminated" ? (
                          <span className="text-red-500 italic">{r.name}</span>
                        ) : (
                          <span>{r.name}</span>
                        )}
                      </TableCell>
                      <TableCell>{r.user}</TableCell>
                      <TableCell>{r.email}</TableCell>
                      <TableCell>{r.costCenterName}</TableCell>
                      <TableCell>{r.departmentName}</TableCell>
                      <TableCell>{r.title}</TableCell>
                      <TableCell>
                        {r.statusName === "Unknown" || r.statusName === "Terminated" ? (
                          <Badge variant="secondary" className="bg-red-100 text-red-800">
                            {r.statusName}
                          </Badge>
                        ) : (
                          <span>{r.statusName}</span>
                        )}
                      </TableCell>
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