"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import { getApiBase } from "@/lib/apiBase"

type LicenseRow = {
  name: string
  user: string
  email: string
  costCenterName: string
  departmentName: string
  title: string
  statusName: string
  recommendedAction: "Analyst" | "Consumer" | string
}

async function fetchCostCenters(): Promise<string[]> {
  const base = getApiBase()
  const res = await fetch(`${base}/v0/cost-centers`, {
    credentials: "include",
    headers: { "Cache-Control": "no-store" },
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

async function fetchRows(costCenter: string): Promise<LicenseRow[]> {
  const base = getApiBase()
  const url = new URL(`${base}/v0/license-reduction`, window.location.origin)
  url.searchParams.set("cost_center_name", costCenter)

  const res = await fetch(url.toString(), {
    credentials: "include",
    headers: { "Cache-Control": "no-store" },
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

function SortHeader({
  title,
  column,
}: {
  title: string
  column: any
}) {
  const s = column.getIsSorted() as false | "asc" | "desc"
  return (
    <Button
      variant="ghost"
      className="px-0 h-auto font-medium"
      onClick={() => column.toggleSorting(s === "asc")}
    >
      {title}
      <span className="ml-1 text-muted-foreground">
        {s === "asc" ? "▲" : s === "desc" ? "▼" : ""}
      </span>
    </Button>
  )
}

export default function LicenseReductionView() {
  const [costCenter, setCostCenter] = React.useState("")
  const [search, setSearch] = React.useState("")

  const { data: costCenters = [] } = useQuery({
    queryKey: ["cost-centers"],
    queryFn: fetchCostCenters,
    staleTime: 5 * 60 * 1000,
  })

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["license-reduction", costCenter],
    queryFn: () => fetchRows(costCenter),
    enabled: !!costCenter,
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000,
    retry: 1,
  })

  // clear search when cost center changes
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

  // Keep your existing default order:
  // Analysts first, then by username (and stable within that)
  const defaultOrderedRows = React.useMemo<LicenseRow[]>(() => {
    if (!rows.length) return []

    const analysts = rows.filter((r) => r.recommendedAction === "Analyst")
    const consumers = rows.filter((r) => r.recommendedAction !== "Analyst")

    const byUsername = (a: LicenseRow, b: LicenseRow) =>
      String(a.user ?? "").localeCompare(String(b.user ?? ""))

    analysts.sort(byUsername)
    consumers.sort(byUsername)

    return [...analysts, ...consumers]
  }, [rows])

  // Search filters the already-default-ordered list
  const filteredRows = React.useMemo<LicenseRow[]>(() => {
    const q = search.trim().toLowerCase()
    if (!q) return defaultOrderedRows

    return defaultOrderedRows.filter((r) => {
      const name = String(r.name ?? "").toLowerCase()
      const email = String(r.email ?? "").toLowerCase()
      const user = String(r.user ?? "").toLowerCase()
      return name.includes(q) || email.includes(q) || user.includes(q)
    })
  }, [defaultOrderedRows, search])

  // Sorting state only applies AFTER your default ordering + search.
  // If no column sorting is selected, you still get your default order.
  const [sorting, setSorting] = React.useState<SortingState>([])

  const columns = React.useMemo<ColumnDef<LicenseRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <SortHeader title="Full Name" column={column} />,
        cell: ({ row }) => {
          const name = row.original.name
          return name === "Possibly Terminated" ? (
            <span className="text-red-500 italic">{name}</span>
          ) : (
            <span>{name}</span>
          )
        },
      },
      {
        accessorKey: "user",
        header: ({ column }) => <SortHeader title="Username" column={column} />,
      },
      {
        accessorKey: "email",
        header: ({ column }) => <SortHeader title="Email" column={column} />,
      },
      {
        accessorKey: "costCenterName",
        header: ({ column }) => <SortHeader title="Cost Center" column={column} />,
      },
      {
        accessorKey: "departmentName",
        header: ({ column }) => <SortHeader title="Department" column={column} />,
      },
      {
        accessorKey: "title",
        header: ({ column }) => <SortHeader title="Title" column={column} />,
      },
      {
        accessorKey: "statusName",
        header: ({ column }) => <SortHeader title="Employee Status" column={column} />,
        cell: ({ row }) => {
          const s = row.original.statusName
          return s === "Unknown" || s === "Terminated" ? (
            <Badge variant="secondary" className="bg-red-100 text-red-800">
              {s}
            </Badge>
          ) : (
            <span>{s}</span>
          )
        },
      },
      {
        accessorKey: "recommendedAction",
        header: ({ column }) => <SortHeader title="Recommended License" column={column} />,
        cell: ({ row }) => {
          const rec = row.original.recommendedAction
          return rec === "Analyst" ? (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              {rec}
            </Badge>
          ) : (
            <span>{rec}</span>
          )
        },
      },
    ],
    []
  )

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="w-full px-4">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>License Reduction Data</CardTitle>

          {/* Description */}
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
                  Users who perform 1+ analyst actions <strong>per day</strong> over the 90-day period are considered a
                  candidate for an Analyst license
                </span>
              </li>
            </ul>
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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

            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, or username…"
              className="sm:w-[340px]"
              disabled={!costCenter || isLoading}
            />
          </div>

          {!!search.trim() && (
            <div className="mt-2 text-sm text-muted-foreground">
              Showing {filteredRows.length} of {defaultOrderedRows.length}
            </div>
          )}

          {/* Summary */}
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
                    <span className="text-blue-500">Consumers</span>
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

        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <div className="text-center py-8">Loading…</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((hg) => (
                    <TableRow key={hg.id}>
                      {hg.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>

                <TableBody>
                  {table.getRowModel().rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="text-center py-4">
                        No matching results
                      </TableCell>
                    </TableRow>
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
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