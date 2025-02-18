import { useState } from "react"  
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import type { PaymentType } from "@/types/employee"

interface PaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: {
    type: PaymentType
    amount: number
    description: string
    reference?: string
  }) => Promise<void>
  employeeName: string
}

export function PaymentDialog({
  open,
  onOpenChange,
  onSubmit,
  employeeName
}: PaymentDialogProps) {
  const [type, setType] = useState<PaymentType>('salary')
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [reference, setReference] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!type || !amount || !description) return

    setIsSubmitting(true)
    try {
      await onSubmit({
        type,
        amount: parseFloat(amount),
        description,
        reference: reference || undefined
      })
      setType('salary')
      setAmount("")
      setDescription("")
      setReference("")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Issue Payment to {employeeName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Payment Type</Label>
            <Select
              value={type}
              onValueChange={(value) => setType(value as PaymentType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payment type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="salary">Salary</SelectItem>
                <SelectItem value="commission">Commission</SelectItem>
                <SelectItem value="bonus">Bonus</SelectItem>
                <SelectItem value="misc">Miscellaneous</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Payment description..."
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reference">Reference (Optional)</Label>
            <Input
              id="reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Payment reference..."
            />
          </div>
          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={isSubmitting || !type || !amount || !description}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Issue Payment'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 