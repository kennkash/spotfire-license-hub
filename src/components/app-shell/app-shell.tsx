"use client"

import * as React from "react"
import AppHeader from "./app-header"
import AppSidebar from "./app-sidebar"
import AppFooter from "./app-footer"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"

export default function AppShell({ children }: { children: React.ReactNode }) {
    const [navOpen, setNavOpen] = React.useState(false)

    return (
        <div className="min-h-dvh flex flex-col bg-background text-foreground">
            <AppHeader onOpenNav={() => setNavOpen(true)} />

            {/* Nav drawer available on all screen sizes */}
            <Sheet open={navOpen} onOpenChange={setNavOpen}>
                <SheetContent side="left" className="w-72 p-0">
                    <SheetHeader className="border-b px-4 py-3">
                        <SheetTitle className="text-base font-semibold">
                        Navigation
                        </SheetTitle>
                    </SheetHeader>

                    <div className="p-3">
                        <AppSidebar onNavigate={() => setNavOpen(false)} />
                    </div>
                </SheetContent>
            </Sheet>


            <div className="flex flex-1">
                <main className="flex-1 p-4">{children}</main>
            </div>

            <AppFooter />
        </div>
    )
}
