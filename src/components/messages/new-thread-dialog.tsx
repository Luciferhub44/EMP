import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
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

interface NewThreadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (department: string, message: string) => Promise<void>
}

export function NewThreadDialog({
  open,
  onOpenChange,
  onSubmit
}: NewThreadDialogProps) {
  const [department, setDepartment] = useState("")
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!department || !message) return

    setIsSubmitting(true)
    try {
      await onSubmit(department, message)
      setDepartment("")
      setMessage("")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Select
              value={department}
              onValueChange={setDepartment}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="support">Support</SelectItem>
                <SelectItem value="fulfillment">Fulfillment</SelectItem>
                <SelectItem value="billing">Billing</SelectItem>
                <SelectItem value="management">Management</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              rows={4}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting || !department || !message}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Message'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 