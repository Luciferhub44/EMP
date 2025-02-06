import * as React from "react"
import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { useNotifications } from "@/contexts/notification-context"

const items = [
  {
    title: "Overview",
    href: "/",
  },
  {
    title: "Products",
    href: "/products",
  },
  {
    title: "Orders",
    href: "/orders",
  },
  {
    title: "Fulfillment",
    href: "/fulfillment",
  },
  {
    title: "Customers",
    href: "/customers",
  },
  {
    title: "Inbox",
    href: "/inbox",
  },
]

export function MainNav() {
  const location = useLocation()
  const { unreadCount } = useNotifications()

  return (
    <nav className="flex items-center space-x-4 lg:space-x-6">
      {items.map((item) => (
        <Link
          key={item.href}
          to={item.href}
          className={cn(
            "text-sm font-medium transition-colors hover:text-primary",
            location.pathname === item.href
              ? "text-primary"
              : "text-muted-foreground"
          )}
        >
          {item.title}
          {item.href === "/inbox" && unreadCount > 0 && (
            <Badge
              variant="secondary"
              className="ml-2"
            >
              {unreadCount}
            </Badge>
          )}
        </Link>
      ))}
    </nav>
  )
} 