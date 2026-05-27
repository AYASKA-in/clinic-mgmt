"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Calendar,
  Bell,
  Settings,
  HelpCircle,
  LogOut,
  Plus,
  Search,
  Menu,
  X,
  Leaf,
  ClipboardList,
  Shield,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/reminders", label: "Reminders", icon: Bell },
  { href: "/overdue", label: "Overdue", icon: ClipboardList },
  { href: "/audit", label: "Audit Log", icon: Shield },
  { href: "/users", label: "Users", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
]

function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  const pathname = usePathname()
  const [userName, setUserName] = useState("User")
  const [userInitials, setUserInitials] = useState("")

  useEffect(() => {
    try {
      const match = document.cookie.match(/session_user=([^;]+)/)
      if (match) {
        const data = JSON.parse(decodeURIComponent(match[1]))
        setUserName(data.name || "User")
        setUserInitials(
          data.name
            ? data.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
            : ""
        )
      }
    } catch {}
  }, [])

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Leaf className="size-5" />
        </div>
        <div>
          <h3 className="font-heading text-sm font-semibold leading-tight text-foreground">
            ZenFlow Clinic
          </h3>
          <p className="text-xs text-muted-foreground">{userName}</p>
        </div>
      </div>

      <Separator />

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavClick}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 pb-2">
        <Link href="/calendar" className="block">
          <Button className="w-full gap-2">
            <Plus className="size-4" />
            New Appointment
          </Button>
        </Link>
      </div>

      <Separator />

      <div className="space-y-1 px-3 py-3">
        <Link
          href="/help"
          onClick={onNavClick}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <HelpCircle className="size-4 shrink-0" />
          Help Center
        </Link>
        <button
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" })
            window.location.href = "/login"
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="size-4 shrink-0" />
          Logout
        </button>
      </div>
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [avatarInitials, setAvatarInitials] = useState("")

  useEffect(() => {
    try {
      const match = document.cookie.match(/session_user=([^;]+)/)
      if (match) {
        const data = JSON.parse(decodeURIComponent(match[1]))
        setAvatarInitials(
          data.name
            ? data.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
            : ""
        )
      }
    } catch {}
  }, [])

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[280px] flex-col border-r border-border bg-card md:flex">
        <SidebarContent />
      </aside>

      <Button
        variant="ghost"
        size="icon"
        className="fixed top-3 left-3 z-50 md:hidden"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="size-5" />
      </Button>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[280px] p-0" showCloseButton={false}>
          <div className="flex items-center justify-end p-2">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setMobileOpen(false)}
            >
              <X className="size-4" />
            </Button>
          </div>
          <SidebarContent onNavClick={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <header className="fixed inset-x-0 top-0 z-20 flex h-14 items-center gap-4 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 md:left-[280px]">
        <div className="flex flex-1 items-center gap-4 px-4 md:px-6">
          <div className="hidden md:relative md:flex md:flex-1 md:max-w-sm">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search patients, appointments..."
              className="h-8 pl-8 text-sm"
            />
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <Link href="/reminders">
              <Button variant="ghost" size="icon">
                <Bell className="size-4" />
              </Button>
            </Link>
            <Link href="/help">
              <Button variant="ghost" size="icon">
                <HelpCircle className="size-4" />
              </Button>
            </Link>
            <Link href="/patients">
              <Button size="sm" className="gap-1.5">
                <Plus className="size-3.5" />
                <span className="hidden sm:inline">New Patient</span>
              </Button>
            </Link>
            <Avatar className="size-7">
              <AvatarFallback>{avatarInitials || "DR"}</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <main className="relative flex-1 pt-14 md:ml-[280px]">
        {children}
      </main>
    </div>
  )
}
