import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { 
  LifeBuoy,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle
} from "lucide-react"

const tickets = [
  {
    id: "TCK-001",
    subject: "Login Issues",
    status: "Open",
    priority: "High",
    lastUpdate: "2024-02-15",
    messages: 3
  },
  {
    id: "TCK-002",
    subject: "Payment Failed",
    status: "In Progress",
    priority: "Medium",
    lastUpdate: "2024-02-14",
    messages: 2
  },
  {
    id: "TCK-003",
    subject: "Feature Request",
    status: "Closed",
    priority: "Low",
    lastUpdate: "2024-02-13",
    messages: 5
  }
]

export default function SupportPage() {
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open':
        return 'text-green-600'
      case 'in progress':
        return 'text-blue-600'
      case 'closed':
        return 'text-gray-600'
      default:
        return 'text-gray-600'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'medium':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'low':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Support</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LifeBuoy className="h-5 w-5" />
              Create Support Ticket
            </CardTitle>
            <CardDescription>
              Submit a new support request
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief description of your issue"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Detailed explanation of your issue"
                  rows={5}
                />
              </div>
              <Button className="w-full">Submit Ticket</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Recent Tickets
            </CardTitle>
            <CardDescription>
              View and manage your support tickets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="grid gap-1">
                    <div className="flex items-center gap-2">
                      {getPriorityIcon(ticket.priority)}
                      <span className="font-medium">{ticket.subject}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{ticket.id}</span>
                      <span>•</span>
                      <span className={getStatusColor(ticket.status)}>
                        {ticket.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      <span>{ticket.messages}</span>
                    </div>
                    <div>{ticket.lastUpdate}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 