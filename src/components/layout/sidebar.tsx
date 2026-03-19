"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Dumbbell,
  Activity,
  Apple,
  User,
  LayoutDashboard,
  History,
  BookOpen,
  CalendarDays,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Agenda",
    href: "/agenda",
    icon: CalendarDays,
  },
  {
    label: "Musculation",
    href: "/musculation",
    icon: Dumbbell,
  },
  {
    label: "Cardio",
    href: "/cardio",
    icon: Activity,
  },
  {
    label: "Nutrition",
    href: "/nutrition",
    icon: Apple,
  },
  {
    label: "Profil",
    href: "/profil",
    icon: User,
  },
  {
    label: "Mes séances",
    href: "/musculation/mes-seances",
    icon: BookOpen,
  },
  {
    label: "Historique",
    href: "/musculation/historique",
    icon: History,
  },
]

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/spartan-hero.png" alt="SpartOps" className="h-8 w-8 object-contain" />
        <span className="text-xl font-bold">SpartOps</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "text-white"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
              style={isActive ? { background: "linear-gradient(to right, #3F5EFB, #F50535)" } : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t">
        <p className="text-xs text-muted-foreground">SpartOps v0.1</p>
      </div>
    </div>
  )
}
