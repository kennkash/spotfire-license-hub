"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { NAV } from "./nav"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { NavigationMenu, NavigationMenuList, NavigationMenuItem } from "@/components/ui/navigation-menu"
import { ChevronDown } from "lucide-react"

function isActive(pathname: string, href: string) {
  return pathname === href
}

export default function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

const [openSections, setOpenSections] = React.useState<Set<string>>(() => {
  const activeSection = NAV.find((s) =>
    s.items.some((i) => isActive(pathname, i.href))
  )
  return activeSection ? new Set([activeSection.label]) : new Set()
})


  function toggleSection(label: string) {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  return (
    <aside className="w-64 md:w-64 border-r md:border-r p-3">
      <div className="px-2 pb-2 text-xs font-medium text-muted-foreground">MENU</div>

      <NavigationMenu orientation="vertical" className="max-w-none">
        <NavigationMenuList className="flex w-full flex-col items-stretch gap-1">
          {NAV.map((section) => {
            const open = openSections.has(section.label)
            const sectionHasActive = section.items.some((i) => isActive(pathname, i.href))

            return (
              <NavigationMenuItem key={section.label} className="w-full">
                <Collapsible open={open} onOpenChange={() => toggleSection(section.label)}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn("w-full justify-between", sectionHasActive && "bg-muted/40")}
                    >
                      <span className="truncate">{section.label}</span>
                      <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
                    </Button>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="mt-1">
                    <div className="ml-2 flex flex-col gap-1">
                      {section.items.map((item) => {
                        const active = isActive(pathname, item.href)
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => onNavigate?.()}
                            className={cn(
                              "rounded-md px-3 py-2 text-sm transition-colors",
                              active
                                ? "bg-muted font-medium text-foreground"
                                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                            )}
                          >
                            {item.label}
                          </Link>
                        )
                      })}
                      {section.items.length === 0 && (
                        <div className="px-3 py-2 text-xs text-muted-foreground">Coming soon</div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
                <Separator className="my-2" />
              </NavigationMenuItem>
            )
          })}
        </NavigationMenuList>
      </NavigationMenu>
    </aside>
  )
}
