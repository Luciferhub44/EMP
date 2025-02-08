import { Badge } from "@/components/ui/badge"
import { OrderStatus, PaymentStatus } from "@/types"

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const variants: Record<OrderStatus, "default" | "destructive" | "outline" | "secondary" | "success"> = {
    pending: "outline",
    processing: "default",
    shipped: "secondary",
    delivered: "success",
    cancelled: "destructive",
    paid: "success"
  }

  return (
    <Badge variant={variants[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const variants: Record<PaymentStatus, "default" | "destructive" | "outline" | "secondary" | "success"> = {
    pending: "outline",
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