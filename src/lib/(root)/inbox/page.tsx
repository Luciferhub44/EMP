import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDate } from "@/lib/utils"
import { cn } from "@/lib/utils"
import {
  Bell,
  Package,
  AlertCircle,
  CreditCard,
  MessageSquare,
  CheckCircle2,
  Search,
  Trash2,
} from "lucide-react"
import type { Notification, NotificationType } from "@/types/notification"
import { useNotifications } from "@/contexts/notification-context"

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case "order":
      return <Package className="h-4 w-4" />
    case "inventory":
      return <AlertCircle className="h-4 w-4" />
    case "payment":
      return <CreditCard className="h-4 w-4" />
    case "chat":
      return <MessageSquare className="h-4 w-4" />
    default:
      return <Bell className="h-4 w-4" />
  }
}

function getNotificationColor(type: NotificationType): string {
  switch (type) {
    case "order":
      return "bg-blue-500"
    case "inventory":
      return "bg-yellow-500"
    case "payment":
      return "bg-green-500"
    case "chat":
      return "bg-purple-500"
    default:
      return "bg-gray-500"
  }
}

export default function InboxPage() {
  const navigate = useNavigate()
  const { notifications, markAsRead, markAllAsRead, clearAll } = useNotifications()
  const [search, setSearch] = useState("")
  const [selectedType, setSelectedType] = useState<NotificationType | "all">("all")

  const filteredNotifications = useMemo(() => {
    return notifications.filter(notification => {
      const matchesSearch = 
        notification.title.toLowerCase().includes(search.toLowerCase()) ||
        notification.message.toLowerCase().includes(search.toLowerCase())
      
      const matchesType = selectedType === "all" || notification.type === selectedType

      return matchesSearch && matchesType
    })
  }, [notifications, search, selectedType])

  const unreadCount = notifications.filter(n => !n.isRead).length

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id)
    if (notification.actionUrl) {
      navigate(notification.actionUrl)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Inbox</h2>
          <p className="text-muted-foreground">
            Manage your notifications and updates
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={markAllAsRead}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Mark all as read
            </Button>
          )}
          <Button
            variant="outline"
            onClick={clearAll}
            disabled={notifications.length === 0}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear all
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notifications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <Tabs defaultValue="all" onValueChange={(value) => setSelectedType(value as NotificationType | "all")}>
        <TabsList>
          <TabsTrigger value="all">
            All
            {notifications.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {notifications.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="order">Orders</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="payment">Payments</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>All Notifications</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-20rem)]">
                {filteredNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Bell className="h-12 w-12 text-muted-foreground" />
                    <p className="mt-2 text-lg font-medium">No notifications</p>
                    <p className="text-sm text-muted-foreground">
                      {search || selectedType !== "all" ? 
                        "Try adjusting your search or filter" : 
                        "You're all caught up!"}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={cn(
                          "flex items-start gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors",
                          !notification.isRead && "bg-muted/30"
                        )}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className={cn(
                          "rounded-full p-2 text-white",
                          getNotificationColor(notification.type)
                        )}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{notification.title}</p>
                            {!notification.isRead && (
                              <Badge variant="secondary">New</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(notification.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Add other tab contents for specific notification types */}
        {["order", "inventory", "payment", "system"].map((type) => (
          <TabsContent key={type} value={type} className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>{type.charAt(0).toUpperCase() + type.slice(1)} Notifications</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-20rem)]">
                  {filteredNotifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Bell className="h-12 w-12 text-muted-foreground" />
                      <p className="mt-2 text-lg font-medium">No {type} notifications</p>
                      <p className="text-sm text-muted-foreground">
                        {search ? 
                          "Try adjusting your search" : 
                          `You have no ${type} notifications`}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredNotifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={cn(
                            "flex items-start gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors",
                            !notification.isRead && "bg-muted/30"
                          )}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className={cn(
                            "rounded-full p-2 text-white",
                            getNotificationColor(notification.type)
                          )}>
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{notification.title}</p>
                              {!notification.isRead && (
                                <Badge variant="secondary">New</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(notification.timestamp)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
} 