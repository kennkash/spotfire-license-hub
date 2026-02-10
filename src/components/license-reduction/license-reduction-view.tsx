"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DATA_BY_TEAM } from "./data"
import type { Row, Team } from "./types"

export default function LicenseReductionView() {
  const [selectedTeam, setSelectedTeam] = React.useState<Team | null>(null)
  const [rows, setRows] = React.useState<Row[]>([])
  const [loading, setLoading] = React.useState(false)

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
    <div className="max-w-5xl">
      <Card>
        <CardHeader className="gap-3">
          <CardTitle>License Reduction Data</CardTitle>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="text-sm text-muted-foreground">Team</div>
            <Select value={selectedTeam ?? ""} onValueChange={(v) => setSelectedTeam(v as Team)}>
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
              Pick a team to load the table.
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
                      <TableCell className="text-right">{r.estSavingsUsd.toLocaleString()}</TableCell>
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
  )
}
