"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useTheme } from "next-themes"

type Team = "ETCH" | "PHOTO" | "CMP" | "METRO"

type Row = {
  user: string
  currentLicense: "Analyst" | "Business Author" | "Consumer"
  lastActive: string
  recommendedAction: string
  estSavingsUsd: number
}

// mock “data source” (replace with API later)
const DATA_BY_TEAM: Record<Team, Row[]> = {
  ETCH: [
    { user: "kkashmiry0641", currentLicense: "Analyst", lastActive: "2026-02-01", recommendedAction: "Downgrade to Business Author", estSavingsUsd: 1200 },
    { user: "icastillo2", currentLicense: "Business Author", lastActive: "2026-01-28", recommendedAction: "Keep", estSavingsUsd: 0 },
  ],
  PHOTO: [
    { user: "jdoe", currentLicense: "Analyst", lastActive: "2025-12-20", recommendedAction: "Downgrade to Consumer", estSavingsUsd: 1800 },
  ],
  CMP: [
    { user: "asmith", currentLicense: "Consumer", lastActive: "2026-01-15", recommendedAction: "Keep", estSavingsUsd: 0 },
  ],
  METRO: [
    { user: "bnguyen", currentLicense: "Analyst", lastActive: "2025-11-02", recommendedAction: "Review usage", estSavingsUsd: 600 },
  ],
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const isDark = theme === "dark"

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      {isDark ? "Light mode" : "Dark mode"}
    </Button>
  )
}

export default function DashboardShell() {
  const [selectedTeam, setSelectedTeam] = React.useState<Team | null>(null)
  const [rows, setRows] = React.useState<Row[]>([])
  const [loading, setLoading] = React.useState(false)
  const [menuOpen, setMenuOpen] = React.useState(true)

  React.useEffect(() => {
    if (!selectedTeam) return
    setLoading(true)
    const t = setTimeout(() => {
      setRows(DATA_BY_TEAM[selectedTeam])
      setLoading(false)
    }, 350)
    return () => clearTimeout(t)
  }, [selectedTeam])

  return (
    <div className="min-h-dvh flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="h-14 border-b flex items-center justify-between px-4">
        <div className="font-semibold text-lg">Spotfire License Hub</div>
        <ThemeToggle />
      </header>

      {/* Body */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-64 border-r p-3">
          <div className="text-xs font-medium text-muted-foreground px-2 pb-2">MENU</div>

          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                License reduction data
                <span className="text-muted-foreground">{menuOpen ? "▾" : "▸"}</span>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-60" align="start">
              {(["ETCH", "PHOTO", "CMP", "METRO"] as Team[]).map((team) => (
                <DropdownMenuItem key={team} onClick={() => setSelectedTeam(team)}>
                  {team}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator className="my-3" />

          <div className="px-2 text-sm text-muted-foreground">
            Selected team:{" "}
            <span className="text-foreground font-medium">{selectedTeam ?? "None"}</span>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 p-4">
          <div className="max-w-5xl">
            <Card>
              <CardHeader className="gap-3">
                <CardTitle>License reduction data</CardTitle>

                <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                  <div className="text-sm text-muted-foreground">Team</div>
                  <Select
                    value={selectedTeam ?? ""}
                    onValueChange={(v) => setSelectedTeam(v as Team)}
                  >
                    <SelectTrigger className="w-[260px]">
                      <SelectValue placeholder="Select a team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ETCH">ETCH</SelectItem>
                      <SelectItem value="PHOTO">PHOTO</SelectItem>
                      <SelectItem value="CMP">CMP</SelectItem>
                      <SelectItem value="METRO">METRO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>

              <CardContent>
                {!selectedTeam && (
                  <div className="text-sm text-muted-foreground">
                    Pick a team from the sidebar (or dropdown) to load the table.
                  </div>
                )}

                {selectedTeam && loading && (
                  <div className="text-sm text-muted-foreground">Loading {selectedTeam}…</div>
                )}

                {selectedTeam && !loading && (
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
                          <TableRow key={r.user}>
                            <TableCell className="font-medium">{r.user}</TableCell>
                            <TableCell>{r.currentLicense}</TableCell>
                            <TableCell>{r.lastActive}</TableCell>
                            <TableCell>{r.recommendedAction}</TableCell>
                            <TableCell className="text-right">
                              {r.estSavingsUsd.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                        {rows.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                              No data for {selectedTeam}.
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
        </main>
      </div>

      {/* Footer */}
      <footer className="h-12 border-t flex items-center justify-center text-sm text-muted-foreground">
        Digital Solutions - KS
      </footer>
    </div>
  )
}
