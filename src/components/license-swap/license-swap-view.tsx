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

type CurrentLicense = "Analyst" | "Consumer" | "Unlicensed"

type LicenseUserRow = {
  id?: number | null
  fullName: string
  username: string
  gadId?: string
  email: string | null
  costCenterName: string
  departmentName: string | null
  title: string | null
  currentLicense: CurrentLicense
  licenseGroups?: string[]
  licenseGrantedAt?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  existsInLicensedUsers?: boolean
}

type CostCentersResponse = {
  success: boolean
  costCenters: string[]
}

type UsersResponse = {
  costCenterName: string
  users: LicenseUserRow[]
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

type SortKey =
  | "fullName"
  | "username"
  | "email"
  | "costCenterName"
  | "departmentName"
  | "title"
  | "currentLicense"

type SortDir = "asc" | "desc"

function normalizeLicense(value: unknown): CurrentLicense {
  const text = String(value ?? "").trim()

  if (text === "Analyst") return "Analyst"
  if (text === "Consumer") return "Consumer"
  return "Unlicensed"
}

function normalizeUser(row: any): LicenseUserRow {
  const username = String(row.username ?? row.gadId ?? row.gad_id ?? row.user ?? "").trim()

  return {
    id: row.id ?? null,
    fullName: String(row.fullName ?? row.full_name ?? row.name ?? username).trim(),
    username,
    gadId: String(row.gadId ?? row.gad_id ?? username).trim(),
    email: row.email ?? row.smtp ?? null,
    costCenterName: String(row.costCenterName ?? row.cost_center_name ?? "").trim(),
    departmentName: row.departmentName ?? row.department_name ?? row.dept_name ?? null,
    title: row.title ?? null,
    currentLicense: normalizeLicense(row.currentLicense ?? row.current_license),
    licenseGroups: row.licenseGroups ?? row.license_groups ?? [],
    licenseGrantedAt: row.licenseGrantedAt ?? row.license_granted_at ?? null,
    createdAt: row.createdAt ?? row.created_at ?? null,
    updatedAt: row.updatedAt ?? row.updated_at ?? null,
    existsInLicensedUsers: row.existsInLicensedUsers ?? row.exists_in_licensed_users,
  }
}

function normalizeUsersResponse(data: any): LicenseUserRow[] {
  const rawUsers = Array.isArray(data) ? data : data?.users ?? []
  return rawUsers.map(normalizeUser).filter((user: LicenseUserRow) => user.username)
}

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

async function fetchLicensedUsers(costCenter: string): Promise<LicenseUserRow[]> {
  const base = getApiBase()

  const url = new URL(`${base}/v0/license-swap/licensed-users`, window.location.origin)
  url.searchParams.set("cost_center_name", costCenter)

  const res = await fetch(url.toString(), {
    credentials: "include",
    headers: { "Cache-Control": "no-store" },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `API error ${res.status}`)
  }

  const data = await res.json()
  return normalizeUsersResponse(data)
}

async function fetchUsersByCostCenter(costCenter: string): Promise<LicenseUserRow[]> {
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

  const data: UsersResponse = await res.json()
  return normalizeUsersResponse(data)
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
  if (data) return data

  throw new Error(`API error ${res.status}`)
}

function LicenseBadge({ value }: { value: CurrentLicense }) {
  if (value === "Analyst") {
    return <Badge variant="secondary" className="bg-green-100 text-green-800">Analyst</Badge>
  }

  if (value === "Consumer") {
    return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Consumer</Badge>
  }

  return <Badge variant="secondary" className="bg-slate-100 text-slate-700">Unlicensed</Badge>
}

function sortIcon(active: boolean, dir: SortDir) {
  if (!active) return ""
  return dir === "asc" ? "▲" : "▼"
}

function userMatchesSearch(row: LicenseUserRow, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true

  return [
    row.fullName,
    row.username,
    row.email,
    row.costCenterName,
    row.departmentName,
    row.title,
    row.currentLicense,
  ]
    .map((value) => String(value ?? "").toLowerCase())
    .some((value) => value.includes(q))
}

export default function LicenseSwapView() {
  const [costCenter, setCostCenter] = React.useState("")
  const [search, setSearch] = React.useState("")
  const [sortKey, setSortKey] = React.useState<SortKey | null>(null)
  const [sortDir, setSortDir] = React.useState<SortDir>("asc")

  const [expandedUser, setExpandedUser] = React.useState<string | null>(null)
  const [selectedSourceUser, setSelectedSourceUser] = React.useState<LicenseUserRow | null>(null)
  const [selectedTargetUser, setSelectedTargetUser] = React.useState<LicenseUserRow | null>(null)
  const [targetSearch, setTargetSearch] = React.useState("")
  const [swapResult, setSwapResult] = React.useState<SwapResponse | null>(null)

  const searchRef = React.useRef<HTMLInputElement | null>(null)

  const { data: costCenters = [], isLoading: costCentersLoading } = useQuery({
    queryKey: ["license-swap-cost-centers"],
    queryFn: fetchAuthorizedCostCenters,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const {
    data: rows = [],
    isLoading,
    refetch: refetchLicensedUsers,
  } = useQuery({
    queryKey: ["license-swap-licensed-users", costCenter],
    queryFn: () => fetchLicensedUsers(costCenter),
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
    enabled: !!costCenter && !!expandedUser,
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000,
    retry: 1,
  })

  React.useEffect(() => {
    setSearch("")
    setSortKey(null)
    setSortDir("asc")
    setExpandedUser(null)
    setSelectedSourceUser(null)
    setSelectedTargetUser(null)
    setTargetSearch("")
    setSwapResult(null)
  }, [costCenter])

  const analystCount = React.useMemo(
    () => rows.filter((r) => r.currentLicense === "Analyst").length,
    [rows]
  )

  const consumerCount = React.useMemo(
    () => rows.filter((r) => r.currentLicense === "Consumer").length,
    [rows]
  )

  const filteredRows = React.useMemo(() => {
    return rows.filter((row) => userMatchesSearch(row, search))
  }, [rows, search])

  const finalRows = React.useMemo(() => {
    if (!sortKey) {
      return filteredRows.slice().sort((a, b) => {
        const licenseOrder = { Analyst: 0, Consumer: 1, Unlicensed: 2 }
        const licenseCompare = licenseOrder[a.currentLicense] - licenseOrder[b.currentLicense]
        if (licenseCompare !== 0) return licenseCompare
        return a.username.localeCompare(b.username, undefined, { sensitivity: "base" })
      })
    }

    const dir = sortDir === "asc" ? 1 : -1

    return filteredRows.slice().sort((a, b) => {
      const av = String(a[sortKey] ?? "")
      const bv = String(b[sortKey] ?? "")
      return av.localeCompare(bv, undefined, { sensitivity: "base" }) * dir
    })
  }, [filteredRows, sortKey, sortDir])

  const targetOptions = React.useMemo(() => {
    const sourceUser = selectedSourceUser?.username.trim().toLowerCase()

    return costCenterUsers
      .filter((user) => user.username.trim().toLowerCase() !== sourceUser)
      .filter((user) => userMatchesSearch(user, targetSearch))
  }, [costCenterUsers, selectedSourceUser, targetSearch])

  const swapMutation = useMutation({
    mutationFn: postSwap,
    onSuccess: async (data, variables) => {
      setSwapResult(data)

      if (data.success && !variables.dry_run) {
        await Promise.all([refetchLicensedUsers(), refetchUsers()])
      }
    },
    onError: (error: Error) => {
      setSwapResult({
        success: false,
        code: "LICENSE_SWAP_REQUEST_FAILED",
        message: error.message || "License swap request failed.",
        licenseType:
          selectedSourceUser?.currentLicense === "Analyst" ? "Analyst" : "Consumer",
        groupName: "",
        costCenterName: costCenter,
        requestedFrom: selectedSourceUser?.username ?? "",
        requestedTo: selectedTargetUser?.username ?? "",
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

  const openInlineSwap = (row: LicenseUserRow) => {
    const isSameRow = expandedUser === row.username

    if (isSameRow) {
      setExpandedUser(null)
      setSelectedSourceUser(null)
      setSelectedTargetUser(null)
      setTargetSearch("")
      setSwapResult(null)
      return
    }

    setExpandedUser(row.username)
    setSelectedSourceUser(row)
    setSelectedTargetUser(null)
    setTargetSearch("")
    setSwapResult(null)
  }

  const runSwap = (dryRun: boolean) => {
    if (!selectedSourceUser || !selectedTargetUser || !costCenter) return
    if (selectedSourceUser.currentLicense === "Unlicensed") return

    setSwapResult(null)

    swapMutation.mutate({
      from_username: selectedSourceUser.username,
      to_username: selectedTargetUser.username,
      license_type: selectedSourceUser.currentLicense,
      cost_center_name: costCenter,
      dry_run: dryRun,
    })
  }

  const canSubmitSwap =
    !!selectedSourceUser &&
    selectedSourceUser.currentLicense !== "Unlicensed" &&
    !!selectedTargetUser &&
    !!costCenter &&
    !swapMutation.isPending

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

  const UserColumns = ({ user }: { user: LicenseUserRow }) => (
    <>
      <TableCell>{user.fullName || "—"}</TableCell>
      <TableCell>{user.username || "—"}</TableCell>
      <TableCell>{user.email || "—"}</TableCell>
      <TableCell>{user.costCenterName || "—"}</TableCell>
      <TableCell>{user.departmentName || "—"}</TableCell>
      <TableCell>{user.title || "—"}</TableCell>
      <TableCell>
        <LicenseBadge value={user.currentLicense} />
      </TableCell>
    </>
  )

  return (
    <div className="w-full px-4">
      <Card className="shadow-md">
        <CardHeader>
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
                <p className="text-foreground">
                  Select a licensed user, choose another user in the same cost center, and submit the license swap.
                </p>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-4">
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

            <div className="flex items-center gap-2">
              <div className="relative sm:w-[340px]">
                <Input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search users…"
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
                  >
                    ✕
                  </button>
                )}
              </div>

              {sortKey && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSortKey(null)
                    setSortDir("asc")
                  }}
                >
                  Reset
                </Button>
              )}
            </div>
          </div>

          {costCenter && rows.length > 0 && (
            <div className="mt-4 p-3 bg-background rounded border">
              <div className="font-medium mb-2">Current License Distribution</div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-green-500">Analysts</span>
                  <span>{analystCount} users</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-blue-500">Consumers</span>
                  <span>{consumerCount} users</span>
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
              Please select a cost center above.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead label="Full Name" k="fullName" />
                  <SortableHead label="Username" k="username" />
                  <SortableHead label="Email" k="email" />
                  <SortableHead label="Cost Center" k="costCenterName" />
                  <SortableHead label="Department" k="departmentName" />
                  <SortableHead label="Title" k="title" />
                  <SortableHead label="Current License" k="currentLicense" />
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {finalRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  finalRows.flatMap((row) => {
                    const isExpanded = expandedUser === row.username

                    return [
                      <TableRow key={`row-${row.username}`}>
                        <UserColumns user={row} />
                        <TableCell>
                          <Button
                            size="sm"
                            variant={isExpanded ? "secondary" : "default"}
                            onClick={() => openInlineSwap(row)}
                            disabled={row.currentLicense === "Unlicensed"}
                          >
                            {isExpanded ? "Close Swap" : "Swap License"}
                          </Button>
                        </TableCell>
                      </TableRow>,

                      ...(isExpanded
                        ? [
                            <TableRow key={`expand-${row.username}`}>
                              <TableCell colSpan={8} className="bg-muted/20">
                                <div className="py-4">
                                  <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
                                    <div className="space-y-4">
                                      <div className="rounded border bg-background p-4">
                                        <div className="text-sm text-muted-foreground">Swap from</div>
                                        <div className="mt-1 font-medium">{row.fullName}</div>
                                        <div className="text-sm text-muted-foreground">{row.username}</div>
                                      </div>

                                      <div className="rounded border bg-background p-4">
                                        <div className="text-sm text-muted-foreground mb-2">License to swap</div>
                                        <LicenseBadge value={row.currentLicense} />
                                      </div>

                                      {selectedTargetUser && (
                                        <div className="rounded border bg-background p-4">
                                          <div className="text-sm text-muted-foreground">Swap to</div>
                                          <div className="mt-1 font-medium">{selectedTargetUser.fullName}</div>
                                          <div className="text-sm text-muted-foreground">{selectedTargetUser.username}</div>
                                          <div className="mt-2">
                                            <LicenseBadge value={selectedTargetUser.currentLicense} />
                                          </div>
                                        </div>
                                      )}

                                      <div className="flex flex-wrap gap-2">
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

                                    <div className="rounded border bg-background">
                                      <div className="border-b p-4">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                          <div>
                                            <div className="font-medium">Select replacement user</div>
                                            <div className="text-sm text-muted-foreground">
                                              Users in {costCenter}, excluding {row.username}
                                            </div>
                                          </div>

                                          <Input
                                            value={targetSearch}
                                            onChange={(e) => setTargetSearch(e.target.value)}
                                            placeholder="Search users…"
                                            className="sm:w-[260px]"
                                          />
                                        </div>
                                      </div>

                                      <div className="max-h-[420px] overflow-y-auto">
                                        <Table>
                                          <TableHeader className="sticky top-0 bg-background z-10">
                                            <TableRow>
                                              <TableHead className="w-[96px]">Select</TableHead>
                                              <TableHead>Full Name</TableHead>
                                              <TableHead>Username</TableHead>
                                              <TableHead>Email</TableHead>
                                              <TableHead>Cost Center</TableHead>
                                              <TableHead>Department</TableHead>
                                              <TableHead>Title</TableHead>
                                              <TableHead>Current License</TableHead>
                                            </TableRow>
                                          </TableHeader>

                                          <TableBody>
                                            {usersLoading ? (
                                              <TableRow>
                                                <TableCell colSpan={8} className="text-center py-8">
                                                  Loading users…
                                                </TableCell>
                                              </TableRow>
                                            ) : targetOptions.length === 0 ? (
                                              <TableRow>
                                                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                                  No users found.
                                                </TableCell>
                                              </TableRow>
                                            ) : (
                                              targetOptions.map((user) => {
                                                const isSelected = selectedTargetUser?.username === user.username

                                                return (
                                                  <TableRow
                                                    key={user.username}
                                                    className={isSelected ? "bg-accent/40" : ""}
                                                  >
                                                    <TableCell>
                                                      <Button
                                                        size="sm"
                                                        variant={isSelected ? "default" : "outline"}
                                                        onClick={() =>
                                                          setSelectedTargetUser(isSelected ? null : user)
                                                        }
                                                      >
                                                        {isSelected ? "Selected" : "Select"}
                                                      </Button>
                                                    </TableCell>
                                                    <UserColumns user={user} />
                                                  </TableRow>
                                                )
                                              })
                                            )}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    </div>
                                  </div>

                                  {swapResult && selectedSourceUser?.username === row.username && (
                                    <div
                                      className={
                                        swapResult.success
                                          ? "mt-4 rounded border border-green-200 bg-green-50 px-3 py-3 text-sm text-green-900"
                                          : "mt-4 rounded border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-900"
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
                                </div>
                              </TableCell>
                            </TableRow>,
                          ]
                        : []),
                    ]
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
