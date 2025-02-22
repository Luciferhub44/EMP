import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatDate, formatCurrency } from "@/lib/utils"
import type { PaymentHistory } from "@/types/employee"

type PaymentItem = PaymentHistory['payments'][0]

interface PaymentHistoryProps {
  payments: PaymentItem[]
}

export function PaymentHistory({ payments }: PaymentHistoryProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Reference</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {payments.map((payment) => (
          <TableRow key={payment.id}>
            <TableCell>{formatDate(payment.paymentDate)}</TableCell>
            <TableCell>
              <Badge variant="outline">
                {payment.type}
              </Badge>
            </TableCell>
            <TableCell>{formatCurrency(payment.amount)}</TableCell>
            <TableCell>{payment.description}</TableCell>
            <TableCell>
              <Badge
                variant={
                  payment.status === 'completed'
                    ? 'success'
                    : payment.status === 'failed'
                    ? 'destructive'
                    : 'default'
                }
              >
                {payment.status}
              </Badge>
            </TableCell>
            <TableCell>{payment.reference || '-'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
} 