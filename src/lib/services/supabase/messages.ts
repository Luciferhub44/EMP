import { supabase } from '@/lib/supabase'
import type { Message, ChatThread, Department } from '@/types/messages'

export const messageService = {
  async getThreads(userId: string) {
    const { data, error } = await supabase
      .from('message_threads')
      .select(`
        *,
        participants:message_participants!inner(
          user_id,
          role,
          last_read_at
        ),
        last_message:messages(
          id,
          content,
          sender_id,
          created_at,
          is_read
        )
      `)
      .eq('participants.user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) throw error
    return data
  },

  async getThread(threadId: string, userId: string) {
    const { data, error } = await supabase
      .from('message_threads')
      .select(`
        *,
        participants:message_participants(
          user:users(
            id,
            name,
            email,
            role
          ),
          role,
          last_read_at
        ),
        messages(
          id,
          content,
          sender:sender_id(
            id,
            name,
            role
          ),
          attachments,
          created_at,
          is_read
        )
      `)
      .eq('id', threadId)
      .single()

    if (error) throw error
    return data
  },

  async createThread(
    subject: string,
    department: Department,
    creatorId: string,
    initialMessage: string,
    participants: string[] = []
  ) {
    const { data, error } = await supabase.rpc('create_message_thread', {
      p_subject: subject,
      p_department: department,
      p_creator_id: creatorId,
      p_initial_message: initialMessage,
      p_participants: participants
    })

    if (error) throw error
    return data
  },

  async sendMessage(
    threadId: string,
    senderId: string,
    content: string,
    attachments: any[] = []
  ) {
    const { data, error } = await supabase.rpc('send_message', {
      p_thread_id: threadId,
      p_sender_id: senderId,
      p_content: content,
      p_attachments: attachments
    })

    if (error) throw error
    return data
  },

  async markThreadAsRead(threadId: string, userId: string) {
    const { error } = await supabase
      .from('message_participants')
      .update({
        last_read_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('thread_id', threadId)
      .eq('user_id', userId)

    if (error) throw error
  },

  async getUnreadCount(userId: string) {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false)
      .in('thread_id', (qb) =>
        qb.select('thread_id')
          .from('message_participants')
          .eq('user_id', userId)
      )

    if (error) throw error
    return count || 0
  }
}