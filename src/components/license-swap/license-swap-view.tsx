"use client"

import * as React from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Info } from "lucide-react"

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

type CostCentersResponse = {
  success: boolean
  code: string
  message: string
  requesterKnoxId: string
  isSpotfireAdmin: boolean
  costCenters: string[]
}

type CostCenterUser = {
  fullName: string
  gadId: string
}

type UsersByCostCenterResponse = {
  costCenterName: string
  users: CostCenterUser[]
}

type SwapIssue = {
  code: string
  message: string
  field?: string | null
  value?: string | null
}

type SwapResponse = {
  success: boolean
  code: string
  message: string
  licenseType: "Analyst" | "Consumer"
  groupName: string
  costCenterName: string
  requestedFrom: string
  requestedTo: string
  removed: string[]
  added: string[]
  notLicensed: string[]
  alreadyLicensed: string[]
  failed: string[]
  issues: SwapIssue[]
  membersBefore: string[]
  membersAfter: string[]
  rollbackAttempted: boolean
  rollbackSucceeded?: boolean | null
}

type SortKey = keyof Pick<
  LicenseRow,
  "name" | "user" | "email" | "costCenterName" | "departmentName" | "title" | "statusName" | "recommendedAction"
>

type SortDir = "asc" | "desc"

async function fetchAuthorizedCostCenters(): Promise<string[]> {
  const base = getApiBase()

  const res = await fetch(`${base}/v0/license-swap/cost-centers`, {
    credentials: "include",
    headers: { "Cache-Control": "no-store" },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `API error ${res.status}`)
  }

  const data: CostCentersResponse = await res.json()
  return data.costCenters ?? []
}

async function fetchReductionRows(costCenter: string): Promise<LicenseRow[]> {
  const base = getApiBase()

  const url = new URL(`${base}/v0/license-reduction`, window.location.origin)
  url.searchParams.set("cost_center_name", costCenter)

  const res = await fetch(url.toString(), {
    credentials: "include",
    headers: { "Cache-Control": "no-store" },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `API error ${res.status}`)
  }

  return res.json()
}

async function fetchUsersByCostCenter(costCenter: string): Promise<CostCenterUser[]> {
  const base = getApiBase()

  const url = new URL(`${base}/v0/license-swap/users-by-cost-center`, window.location.origin)
  url.searchParams.set("cost_center_name", costCenter)

  const res = await fetch(url.toString(), {
    credentials: "include",
    headers: { "Cache-Control": "no-store" },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `API error ${res.status}`)
  }

  const data: UsersByCostCenterResponse = await res.json()
  return data.users ?? []
}

async function postSwap(payload: {
  from_username: string
  to_username: string
  license_type: "Analyst" | "Consumer"
  cost_center_name: string
  dry_run: boolean
}): Promise<SwapResponse> {
  const base = getApiBase()

  const res = await fetch(`${base}/v0/license-swap`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(payload),
  })

  const data = await res.json().catch(() => null)

  if (data) {
    return data
  }

  throw new Error(`API error ${res.status}`)
}

function sortIcon(active: boolean, dir: SortDir) {
  if (!active) return ""
  return dir === "asc" ? "▲" : "▼"
}

function badgeForRecommendation(value: string) {
  if (value === "Analyst") {
    return <Badge variant="secondary" className="bg-green-100 text-green-800">Analyst</Badge>
  }

  return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Consumer</Badge>
}

export default function LicenseSwapView() {
  const [costCenter, setCostCenter] = React.useState("")
  const [search, setSearch] = React.useState("")
  const [sortKey, setSortKey] = React.useState<SortKey | null>(null)
  const [sortDir, setSortDir] = React.useState<SortDir>("asc")

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [selectedSourceUser, setSelectedSourceUser] = React.useState<LicenseRow | null>(null)
  const [targetSearch, setTargetSearch] = React.useState("")
  const [selectedTargetUser, setSelectedTargetUser] = React.useState<CostCenterUser | null>(null)
  const [swapLicenseType, setSwapLicenseType] = React.useState<"Analyst" | "Consumer">("Consumer")
  const [swapResult, setSwapResult] = React.useState<SwapResponse | null>(null)

  const searchRef = React.useRef<HTMLInputElement | null>(null)

  const { data: costCenters = [], isLoading: costCentersLoading } = useQuery({
    queryKey: ["license-swap-cost-centers"],
    queryFn: fetchAuthorizedCostCenters,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const { data: rows = [], isLoading: rowsLoading, refetch: refetchRows } = useQuery({
    queryKey: ["license-reduction", costCenter],
    queryFn: () => fetchReductionRows(costCenter),
    enabled: !!costCenter,
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000,
    retry: 1,
  })

  const {
    data: costCenterUsers = [],
    isLoading: usersLoading,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ["license-swap-users-by-cost-center", costCenter],
    queryFn: () => fetchUsersByCostCenter(costCenter),
    enabled: !!costCenter && dialogOpen,
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000,
    retry: 1,
  })

  React.useEffect(() => {
    setSearch("")
    setSortKey(null)
    setSortDir("asc")
    setDialogOpen(false)
    setSelectedSourceUser(null)
    setSelectedTargetUser(null)
    setTargetSearch("")
    setSwapResult(null)
  }, [costCenter])

  const analystCount = React.useMemo(
    () => rows.filter((r) => r.recommendedAction === "Analyst").length,
    [rows]
  )

  const consumerCount = React.useMemo(
    () => rows.filter((r) => r.recommendedAction === "Consumer").length,
    [rows]
  )

  const defaultOrderedRows = React.useMemo<LicenseRow[]>(() => {
    if (!rows.length) return []

    const analysts = rows.filter((r) => r.recommendedAction === "Analyst")
    const consumers = rows.filter((r) => r.recommendedAction !== "Analyst")

    const byUsername = (a: LicenseRow, b: LicenseRow) =>
      String(a.user ?? "").localeCompare(String(b.user ?? ""), undefined, { sensitivity: "base" })

    analysts.sort(byUsername)
    consumers.sort(byUsername)

    return [...analysts, ...consumers]
  }, [rows])

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

  const finalRows = React.useMemo<LicenseRow[]>(() => {
    if (!sortKey) return filteredRows

    const dir = sortDir === "asc" ? 1 : -1

    const compare = (a: LicenseRow, b: LicenseRow) => {
      const av = a[sortKey]
      const bv = b[sortKey]

      const as = String(av ?? "")
      const bs = String(bv ?? "")

      return as.localeCompare(bs, undefined, { sensitivity: "base" }) * dir
    }

    return filteredRows.slice().sort(compare)
  }, [filteredRows, sortKey, sortDir])

  const targetOptions = React.useMemo(() => {
    const sourceUser = String(selectedSourceUser?.user ?? "").trim().toLowerCase()
    const q = targetSearch.trim().toLowerCase()

    return costCenterUsers
      .filter((user) => user.gadId.trim().toLowerCase() !== sourceUser)
      .filter((user) => {
        if (!q) return true

        return (
          user.fullName.toLowerCase().includes(q) ||
          user.gadId.toLowerCase().includes(q)
        )
      })
  }, [costCenterUsers, selectedSourceUser, targetSearch])

  const swapMutation = useMutation({
    mutationFn: postSwap,
    onSuccess: async (data, variables) => {
      setSwapResult(data)

      if (data.success && !variables.dry_run) {
        await Promise.all([refetchRows(), refetchUsers()])
      }
    },
    onError: (error: Error) => {
      setSwapResult({
        success: false,
        code: "LICENSE_SWAP_REQUEST_FAILED",
        message: error.message || "License swap request failed.",
        licenseType: swapLicenseType,
        groupName: "",
        costCenterName: costCenter,
        requestedFrom: selectedSourceUser?.user ?? "",
        requestedTo: selectedTargetUser?.gadId ?? "",
        removed: [],
        added: [],
        notLicensed: [],
        alreadyLicensed: [],
        failed: [],
        issues: [],
        membersBefore: [],
        membersAfter: [],
        rollbackAttempted: false,
        rollbackSucceeded: null,
      })
    },
  })

  const onSort = (key: SortKey) => {
    if (sortKey !== key) {
      setSortKey(key)
      setSortDir("asc")
      return
    }

    setSortDir((d) => (d === "asc" ? "desc" : "asc"))
  }

  const openSwapDialog = (row: LicenseRow) => {
    setSelectedSourceUser(row)
    setSelectedTargetUser(null)
    setTargetSearch("")
    setSwapResult(null)

    if (row.recommendedAction === "Analyst") {
      setSwapLicenseType("Analyst")
    } else {
      setSwapLicenseType("Consumer")
    }

    setDialogOpen(true)
  }

  const closeSwapDialog = (open: boolean) => {
    setDialogOpen(open)

    if (!open) {
      setTargetSearch("")
      setSelectedTargetUser(null)
      setSwapResult(null)
    }
  }

  const runSwap = (dryRun: boolean) => {
    if (!selectedSourceUser || !selectedTargetUser || !costCenter) return

    setSwapResult(null)

    swapMutation.mutate({
      from_username: selectedSourceUser.user,
      to_username: selectedTargetUser.gadId,
      license_type: swapLicenseType,
      cost_center_name: costCenter,
      dry_run: dryRun,
    })
  }

  const SortableHead = ({ label, k }: { label: string; k: SortKey }) => {
    const active = sortKey === k
    return (
      <TableHead>
        <Button variant="ghost" className="px-0 h-auto font-medium" onClick={() => onSort(k)}>
          {label}
          <span className="ml-2 text-muted-foreground">{sortIcon(active, sortDir)}</span>
        </Button>
      </TableHead>
    )
  }

  const isLoading = rowsLoading
  const canSubmitSwap =
    !!selectedSourceUser &&
    !!selectedTargetUser &&
    !!costCenter &&
    !swapMutation.isPending

  return (
    <div className="w-full px-4">
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <CardTitle>License Swap</CardTitle>
              <Dialog>
                <DialogTrigger asChild>
                  <button className="p-1 rounded-full hover:bg-accent">
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Spotfire License Swap</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 text-foreground">
                    <p>
                      This page shows the same license reduction data, but also lets managers start a license swap for a user in their authorized cost center.
                    </p>
                    <ul className="space-y-2 list-disc pl-5 text-sm text-muted-foreground">
                      <li>Select a cost center you are allowed to manage</li>
                      <li>Click <strong>Swap License</strong> on the user you want to swap from</li>
                      <li>Select the target user in the same cost center</li>
                      <li>The backend will validate whether the swap is allowed and return any issues</li>
                    </ul>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="space-y-2 text-sm text-muted-foreground mt-2 mb-4">
            <p className="font-medium">Data includes:</p>
            <ul className="space-y-2 list-disc pl-5">
              <li>The same reduction data used on the License Reduction page</li>
              <li>Only cost centers the current user is allowed to manage</li>
              <li>A per-user swap action that opens a same-cost-center target selection flow</li>
            </ul>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Select value={costCenter} onValueChange={setCostCenter}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder={costCentersLoading ? "Loading cost centers..." : "Select a cost center"} />
              </SelectTrigger>
              <SelectContent>
                {costCenters.map((cc) => (
                  <SelectItem key={cc} value={cc}>
                    {cc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex flex-col gap-1 sm:items-end">
              <div className="flex items-center gap-2">
                <div className="relative sm:w-[340px]">
                  <Input
                    ref={searchRef}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name, email, or username…"
                    className="sm:w-[340px]"
                    disabled={!costCenter || isLoading}
                  />

                  {!!search.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch("")
                        requestAnimationFrame(() => searchRef.current?.focus())
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label="Clear search"
                      title="Clear"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="w-[72px]">
                  {sortKey && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSortKey(null)
                        setSortDir("asc")
                      }}
                      disabled={!costCenter || isLoading}
                      className="w-full"
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </div>

              {!!search.trim() && (
                <div className="text-sm text-muted-foreground w-[calc(340px+8px+72px)]">
                  Showing {finalRows.length} of {defaultOrderedRows.length}
                </div>
              )}
            </div>
          </div>

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
          ) : !costCenter ? (
            <div className="text-center py-8 text-muted-foreground">
              Please select a cost center above to view its license data.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead label="Full Name" k="name" />
                  <SortableHead label="Username" k="user" />
                  <SortableHead label="Email" k="email" />
                  <SortableHead label="Cost Center" k="costCenterName" />
                  <SortableHead label="Department" k="departmentName" />
                  <SortableHead label="Title" k="title" />
                  <SortableHead label="Status" k="statusName" />
                  <SortableHead label="Recommended" k="recommendedAction" />
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {finalRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No users found for this cost center.
                    </TableCell>
                  </TableRow>
                ) : (
                  finalRows.map((row) => (
                    <TableRow key={`${row.user}-${row.email}`}>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.user}</TableCell>
                      <TableCell>{row.email}</TableCell>
                      <TableCell>{row.costCenterName}</TableCell>
                      <TableCell>{row.departmentName}</TableCell>
                      <TableCell>{row.title}</TableCell>
                      <TableCell>{row.statusName}</TableCell>
                      <TableCell>{badgeForRecommendation(row.recommendedAction)}</TableCell>
                      <TableCell>
                        <Button size="sm" onClick={() => openSwapDialog(row)}>
                          Swap License
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={closeSwapDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Swap Spotfire License</DialogTitle>
          </DialogHeader>

          {!selectedSourceUser ? null : (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded border p-3">
                  <div className="text-sm text-muted-foreground">Swap from</div>
                  <div className="mt-1 font-medium">{selectedSourceUser.name}</div>
                  <div className="text-sm text-muted-foreground">{selectedSourceUser.user}</div>
                  <div className="text-sm text-muted-foreground">{selectedSourceUser.email}</div>
                </div>

                <div className="rounded border p-3">
                  <div className="text-sm text-muted-foreground">License type to swap</div>
                  <div className="mt-3">
                    <Select value={swapLicenseType} onValueChange={(v) => setSwapLicenseType(v as "Analyst" | "Consumer")}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select license type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Consumer">Consumer</SelectItem>
                        <SelectItem value="Analyst">Analyst</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="rounded border">
                <div className="border-b p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-medium">Select target user</div>
                      <div className="text-sm text-muted-foreground">
                        Showing active users in {costCenter}, excluding {selectedSourceUser.user}.
                      </div>
                    </div>

                    <Input
                      value={targetSearch}
                      onChange={(e) => setTargetSearch(e.target.value)}
                      placeholder="Search name or gad id…"
                      className="sm:w-[260px]"
                    />
                  </div>
                </div>

                <div className="max-h-[360px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead />
                        <TableHead>Full Name</TableHead>
                        <TableHead>GAD ID</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersLoading ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8">
                            Loading users…
                          </TableCell>
                        </TableRow>
                      ) : targetOptions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                            No eligible users found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        targetOptions.map((user) => {
                          const isSelected = selectedTargetUser?.gadId === user.gadId

                          return (
                            <TableRow
                              key={user.gadId}
                              className={isSelected ? "bg-accent/40" : ""}
                            >
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant={isSelected ? "default" : "outline"}
                                  onClick={() => setSelectedTargetUser(isSelected ? null : user)}
                                >
                                  {isSelected ? "Selected" : "Select"}
                                </Button>
                              </TableCell>
                              <TableCell>{user.fullName}</TableCell>
                              <TableCell>{user.gadId}</TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {selectedTargetUser && (
                <div className="rounded border p-3 bg-background">
                  <div className="font-medium mb-2">Pending Swap</div>
                  <div className="text-sm">
                    <span className="font-medium">{selectedSourceUser.user}</span>
                    {" → "}
                    <span className="font-medium">{selectedTargetUser.gadId}</span>
                    {" "}
                    ({swapLicenseType})
                  </div>
                </div>
              )}

              {swapResult && (
                <div
                  className={
                    swapResult.success
                      ? "rounded border border-green-200 bg-green-50 px-3 py-3 text-sm text-green-900"
                      : "rounded border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-900"
                  }
                >
                  <div className="font-medium">{swapResult.message}</div>

                  {!!swapResult.issues?.length && (
                    <ul className="mt-2 list-disc pl-5 space-y-1">
                      {swapResult.issues.map((issue, idx) => (
                        <li key={`${issue.code}-${idx}`}>{issue.message}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => runSwap(true)}
                  disabled={!canSubmitSwap}
                >
                  Validate Swap
                </Button>
                <Button
                  onClick={() => runSwap(false)}
                  disabled={!canSubmitSwap}
                >
                  Submit Swap
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
