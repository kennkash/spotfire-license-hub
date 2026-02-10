"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import { Menu, Moon, Sun } from "lucide-react"

export default function AppHeader({ onOpenNav }: { onOpenNav: () => void }) {
  const { theme, setTheme } = useTheme()

  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  const isDark = mounted && theme === "dark"

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

      <Button
        variant="outline"
        size="icon"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        aria-label="Toggle theme"
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
    </header>
  )
}
