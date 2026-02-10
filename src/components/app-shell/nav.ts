export type NavItem = { label: string; href: string }
export type NavSection = { label: string; items: NavItem[] }

export const NAV: NavSection[] = [
  {
    label: "License Reduction Data",
    items: [
      { label: "By team", href: "/license-reduction" },
      // future:
      // { label: "By cost center", href: "/license-reduction/cost-center" },
    ],
  },
  {
    label: "Usage & Insights",
    items: [
      // future:
      // { label: "Usage trends", href: "/usage" },
      // { label: "Role distribution", href: "/roles" },
    ],
  },
  {
    label: "Admin",
    items: [
      // future:
      // { label: "Settings", href: "/settings" },
    ],
  },
]
