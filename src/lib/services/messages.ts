import type { Message, ChatThread, Department, AdminChatIdentity } from "@/types/messages"
import { employeeService } from "./employee"

// In-memory storage for demo
const threads = new Map<string, ChatThread>()
const messages = new Map<string, Message[]>()
const adminIdentities = new Map<Department, AdminChatIdentity>()

// Initialize default admin identities
const defaultAdminIdentities: AdminChatIdentity[] = [
  { name: "Support Team", department: "support", active: true },
  { name: "Fulfillment Team", department: "fulfillment", active: true },
  { name: "Billing Team", department: "billing", active: true },
  { name: "Management", department: "management", active: true }
]

defaultAdminIdentities.forEach(identity => {
  adminIdentities.set(identity.department, identity)
})

export const messagesService = {
  // Get threads for a user
  getThreads: async (userId: string, isAdmin: boolean) => {
    try {
      const userThreads = Array.from(threads.values()).filter(thread => {
        if (isAdmin) return true
        return thread.participants.some(p => p.id === userId)
      })
      
      return userThreads.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
    } catch (error) {
      console.error("Failed to get threads:", error)
      return []
    }
  },

  // Get messages for a thread
  getMessages: async (threadId: string, userId: string, isAdmin: boolean) => {
    const thread = threads.get(threadId)
    if (!thread) throw new Error("Thread not found")

    // Check access
    if (!isAdmin && !thread.participants.some(p => p.id === userId)) {
      throw new Error("Access denied")
    }

    return messages.get(threadId) || []
  },

  // Start a new thread
  startThread: async (
    employeeId: string,
    department: Department,
    initialMessage: string
  ) => {
    const employee = await employeeService.getEmployee(employeeId)
    if (!employee) throw new Error("Employee not found")

    const adminIdentity = adminIdentities.get(department)
    if (!adminIdentity || !adminIdentity.active) {
      throw new Error("Department not available")
    }

    const threadId = `THR${Date.now()}`
    const now = new Date().toISOString()

    const thread: ChatThread = {
      id: threadId,
      department,
      participants: [
        {
          id: employeeId,
          name: employee.name,
          role: 'employee'
        },
        {
          id: 'admin',
          name: adminIdentity.name,
          role: 'admin'
        }
      ],
      createdAt: now,
      updatedAt: now
    }

    const message: Message = {
      id: `MSG${Date.now()}`,
      senderId: employeeId,
      senderName: employee.name,
      senderRole: 'employee',
      department,
      content: initialMessage,
      timestamp: now,
      read: false
    }

    threads.set(threadId, thread)
    messages.set(threadId, [message])

    return thread
  },

  // Send a message
  sendMessage: async (
    threadId: string,
    content: string,
    userId: string,
    isAdmin: boolean
  ) => {
    const thread = threads.get(threadId)
    if (!thread) throw new Error("Thread not found")

    // Check access
    if (!isAdmin && !thread.participants.some(p => p.id === userId)) {
      throw new Error("Access denied")
    }

    const sender = thread.participants.find(p => 
      isAdmin ? p.role === 'admin' : p.id === userId
    )
    if (!sender) throw new Error("Sender not found in thread")

    const message: Message = {
      id: `MSG${Date.now()}`,
      senderId: sender.id,
      senderName: sender.name,
      senderRole: sender.role,
      department: thread.department,
      content,
      timestamp: new Date().toISOString(),
      read: false
    }

    const threadMessages = messages.get(threadId) || []
    threadMessages.push(message)
    messages.set(threadId, threadMessages)

    // Update thread
    thread.lastMessage = message
    thread.updatedAt = message.timestamp
    threads.set(threadId, thread)

    return message
  },

  // Admin methods
  updateAdminIdentity: async (
    department: Department,
    updates: Partial<AdminChatIdentity>,
    userId: string,
    isAdmin: boolean
  ) => {
    if (!isAdmin || !userId) {
      throw new Error("Only administrators can update chat identities")
    }

    const identity = adminIdentities.get(department)
    if (!identity) throw new Error("Department not found")

    const updatedIdentity = {
      ...identity,
      ...updates,
      lastUpdatedBy: userId
    }

    adminIdentities.set(department, updatedIdentity)
    return updatedIdentity
  },

  getAdminIdentities: async (userId: string, isAdmin: boolean) => {
    if (!isAdmin || !userId) {
      throw new Error("Only administrators can view chat identities")
    }

    return Array.from(adminIdentities.values())
  },

  // Add this method to the messagesService object
  getThread: async (threadId: string, userId: string, isAdmin: boolean) => {
    const thread = threads.get(threadId)
    if (!thread) throw new Error("Thread not found")

    // Check access
    if (!isAdmin && !thread.participants.some(p => p.id === userId)) {
      throw new Error("Access denied")
    }

    return thread
  }
} 