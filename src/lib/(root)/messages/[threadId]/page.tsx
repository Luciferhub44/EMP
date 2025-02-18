import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Loader2, Send } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { messagesService } from "@/lib/services/messages"
import { formatDate } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"
import type { Message, ChatThread } from "@/types/messages"

export default function ThreadPage() {
  const { threadId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [thread, setThread] = useState<ChatThread | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadThread = async () => {
      if (!user || !threadId) return
      setIsLoading(true)
      try {
        const [threadData, messagesData] = await Promise.all([
          messagesService.getThread(threadId, user.id, user.role === 'admin'),
          messagesService.getMessages(threadId, user.id, user.role === 'admin')
        ])
        setThread(threadData)
        setMessages(messagesData)
      } catch (error) {
        console.error("Failed to load thread:", error)
        toast({
          title: "Error",
          description: "Failed to load conversation",
          variant: "destructive",
        })
        navigate("/messages")
      } finally {
        setIsLoading(false)
      }
    }

    loadThread()
  }, [threadId, user, navigate])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !threadId || !newMessage.trim()) return

    setIsSending(true)
    try {
      const message = await messagesService.sendMessage(
        threadId,
        newMessage,
        user.id,
        user.role === 'admin'
      )
      setMessages(prev => [...prev, message])
      setNewMessage("")
    } catch (error) {
      console.error("Failed to send message:", error)
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!thread) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/messages")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {thread.department} Support
          </h2>
          <p className="text-muted-foreground">
            Started {formatDate(thread.createdAt)}
          </p>
        </div>
      </div>

      <Card className="flex flex-col h-[calc(100vh-12rem)]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Messages</CardTitle>
            <Badge variant="outline">{thread.department}</Badge>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.senderId === user?.id ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`rounded-lg px-4 py-2 max-w-[80%] ${
                      message.senderId === user?.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">
                        {message.senderName}
                      </span>
                      <span className="text-xs opacity-70">
                        {formatDate(message.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <form onSubmit={handleSendMessage} className="mt-4">
            <div className="flex gap-2">
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="min-h-[80px]"
              />
              <Button 
                type="submit"
                size="icon"
                disabled={isSending || !newMessage.trim()}
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 