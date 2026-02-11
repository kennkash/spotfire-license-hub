"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import { Menu, Moon, Sun } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { getApiBase } from "@/lib/apiBase"

type UserResponse = {
  user: string | null
}

async function fetchCurrentUser(): Promise<UserResponse> {
  const base = getApiBase()

  const res = await fetch(`${base}/v0/user`, {
    credentials: "include",
    headers: { "Cache-Control": "no-store" },
  })

  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

export default function AppHeader({ onOpenNav }: { onOpenNav: () => void }) {
  const { theme, setTheme } = useTheme()

  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  const isDark = mounted && theme === "dark"

  const { data, isLoading, isError } = useQuery({
    queryKey: ["current-user"],
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000, // 5 min
    refetchOnWindowFocus: false,
    retry: 1,
  })

  const username = data?.user ?? null

  return (
    <header className="h-14 border-b flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        {/* Always visible hamburger */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenNav}
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Title links to / */}
        <Link href="/" className="font-semibold text-lg hover:opacity-80">
          Spotfire License Hub
        </Link>
      </div>

      <div className="flex items-center gap-3">
        {/* User display */}
        {isLoading ? (
          <span className="text-sm text-muted-foreground">Loading…</span>
        ) : isError ? (
          <span className="text-sm text-muted-foreground">User unavailable</span>
        ) : (
          <span className="text-sm">
            <span className="text-muted-foreground">Signed in as </span>
            <span className="font-medium">{username ?? "Unknown"}</span>
          </span>
        )}

        {/* Theme toggle */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  )
}
