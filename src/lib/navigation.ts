import {
  LayoutDashboard,
  BarChart3,
  Users,
  Settings,
  HelpCircle,
  LifeBuoy,
  Package,
  LineChart,
  Mail,
  MessageSquare,
  ShoppingCart
} from "lucide-react"

export const mainNav = [
  { name: "Overview", href: "/", icon: LayoutDashboard },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Products", href: "/products", icon: Package },
  { name: "Orders", href: "/orders", icon: ShoppingCart },
]

export const managementNav = [
  { name: "Reports", href: "/reports", icon: LineChart },
  { name: "Messages", href: "/messages", icon: MessageSquare },
  { name: "Inbox", href: "/inbox", icon: Mail },
  { name: "Settings", href: "/settings", icon: Settings },
]

export const supportNav = [
  { name: "Help Center", href: "/help", icon: HelpCircle },
  { name: "Support", href: "/support", icon: LifeBuoy },
] 