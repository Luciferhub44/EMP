import * as React from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Loader2, MessageSquare, Plus } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { messagesService } from "@/lib/services/messages"
import { formatDate } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"
import { NewThreadDialog } from "@/components/messages/new-thread-dialog"
import type { ChatThread } from "@/types/messages"

export default function MessagesPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [threads, setThreads] = React.useState<ChatThread[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [showNewThread, setShowNewThread] = React.useState(false)

  React.useEffect(() => {
    const loadThreads = async () => {
      if (!user) return
      setIsLoading(true)
      try {
        const data = await messagesService.getThreads(user.id, user.role === 'admin')
        setThreads(data)
      } catch (error) {
        console.error("Failed to load message threads:", error)
        toast({
          title: "Error",
          description: "Failed to load message threads",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadThreads()
  }, [user])

  const handleNewThread = async (department: string, message: string) => {
    if (!user) return
    
    try {
      const thread = await messagesService.startThread(user.id, department as any, message)
      setThreads(prev => [thread, ...prev])
      navigate(`/messages/${thread.id}`)
      setShowNewThread(false)
    } catch (error) {
      console.error("Failed to create thread:", error)
      toast({
        title: "Error",
        description: "Failed to create message thread",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Messages</h2>
          <p className="text-muted-foreground">
            {user?.role === 'admin' 
              ? 'Manage all support conversations'
              : 'Chat with support teams'
            }
          </p>
        </div>
        {user?.role !== 'admin' && (
          <Button onClick={() => setShowNewThread(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Message
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conversations</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-lg font-medium">No messages yet</p>
              <p className="text-sm text-muted-foreground">
                {user?.role === 'admin'
                  ? 'No support conversations to display'
                  : 'Start a conversation with support'
                }
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {threads.map(thread => (
                  <div
                    key={thread.id}
                    className="flex items-start justify-between rounded-lg border p-4 hover:bg-accent cursor-pointer"
                    onClick={() => navigate(`/messages/${thread.id}`)}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {thread.department}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(thread.updatedAt)}
                        </span>
                      </div>
                      {thread.lastMessage && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          <span className="font-medium">
                            {thread.lastMessage.senderName}:
                          </span>{" "}
                          {thread.lastMessage.content}
                        </p>
                      )}
                    </div>
                    {!thread.lastMessage?.read && thread.lastMessage?.senderId !== user?.id && (
                      <Badge>New</Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <NewThreadDialog 
        open={showNewThread}
        onOpenChange={setShowNewThread}
        onSubmit={handleNewThread}
      />
    </div>
  )
} 