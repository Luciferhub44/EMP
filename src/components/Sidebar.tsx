import * as React from "react"
import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/contexts/auth-context"
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  BarChart,
  Settings,
  UserCog,
  ClipboardList,
  MessageSquare,
  FileText,
} from "lucide-react"

interface SidebarLink {
  title: string
  href: string
  icon: React.ReactNode
  adminOnly?: boolean
}

const links: SidebarLink[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    title: "Orders",
    href: "/orders",
    icon: <ShoppingCart className="h-5 w-5" />,
  },
  {
    title: "Customers",
    href: "/customers",
    icon: <Users className="h-5 w-5" />,
  },
  {
    title: "Products",
    href: "/products",
    icon: <Package className="h-5 w-5" />,
  },
  {
    title: "Fulfillment",
    href: "/fulfillment",
    icon: <ClipboardList className="h-5 w-5" />,
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: <BarChart className="h-5 w-5" />,
  },
  {
    title: "Messages",
    href: "/messages",
    icon: <MessageSquare className="h-5 w-5" />,
    adminOnly: false
  },
  {
    title: "Reports",
    href: "/reports",
    icon: <FileText className="h-5 w-5" />,
  },
  {
    title: "Employees",
    href: "/employees",
    icon: <UserCog className="h-5 w-5" />,
    adminOnly: true,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: <Settings className="h-5 w-5" />,
  },
]

export function Sidebar() {
  const { pathname } = useLocation()
  const { user } = useAuth()

  console.log('Current user:', user)

  return (
    <div className="hidden border-r bg-background md:block md:w-64">
      <div className="flex h-16 items-center border-b px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <Package className="h-6 w-6" />
          <span>Equipment Manager</span>
        </Link>
      </div>
      <ScrollArea className="h-[calc(100vh-4rem)]">
        <div className="flex flex-col gap-1 p-3">
          {links.map((link) => {
            // Hide admin-only links from non-admin users
            if (link.adminOnly && (!user || user.role !== "admin")) {
              return null
            }

            return (
              <Button
                key={link.href}
                variant={pathname === link.href ? "secondary" : "ghost"}
                className={cn(
                  "justify-start gap-2",
                  pathname === link.href && "bg-secondary"
                )}
                asChild
              >
                <Link to={link.href}>
                  {link.icon}
                  {link.title}
                </Link>
              </Button>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
