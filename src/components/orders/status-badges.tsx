import { Badge } from "@/components/ui/badge"
import { OrderStatus, PaymentStatus } from "@/types"

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const variants: Record<OrderStatus, "default" | "success" | "warning" | "destructive" | "secondary"> = {
    pending: "warning",
    processing: "default",
    shipped: "info",
    delivered: "success",
    cancelled: "destructive"
  }

  return (
    <Badge variant={variants[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const variants: Record<PaymentStatus, "default" | "success" | "warning" | "destructive"> = {
    pending: "warning",
    paid: "success",
    failed: "destructive",
    refunded: "default"
  }

  return (
    <Badge variant={variants[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
} 