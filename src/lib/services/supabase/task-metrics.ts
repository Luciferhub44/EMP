import { supabase } from '@/lib/supabase'

export const taskMetricsService = {
  async getTaskMetrics(taskId: string) {
    const { data, error } = await supabase
      .from('task_metrics')
      .select('*')
      .eq('task_id', taskId)
      .single()

    if (error) throw error
    return data
  },

  async getTaskTimeLogs(taskId: string) {
    const { data, error } = await supabase
      .from('task_time_logs')
      .select(`
        *,
        user:user_id (
          name,
          role
        )
      `)
      .eq('task_id', taskId)
      .order('start_time', { ascending: false })

    if (error) throw error
    return data
  },

  async startTimeLog(taskId: string, userId: string, description?: string) {
    const { data, error } = await supabase.rpc('log_task_time', {
      p_task_id: taskId,
      p_user_id: userId,
      p_start_time: new Date().toISOString(),
      p_description: description
    })

    if (error) throw error
    return data
  },

  async endTimeLog(logId: string, taskId: string, userId: string) {
    const { error } = await supabase
      .from('task_time_logs')
      .update({
        end_time: new Date().toISOString(),
        duration: null, // Will be calculated by trigger
        updated_at: new Date().toISOString()
      })
      .eq('id', logId)
      .eq('task_id', taskId)
      .eq('user_id', userId)

    if (error) throw error
  },

  async getTaskTemplates() {
    const { data, error } = await supabase
      .from('task_templates')
      .select('*')
      .order('name')

    if (error) throw error
    return data
  },

  async createTaskFromTemplate(
    templateId: string,
    createdBy: string,
    orderId?: string,
    assignedTo?: string[],
    dueDate?: string
  ) {
    const { data, error } = await supabase.rpc('create_task_from_template', {
      p_template_id: templateId,
      p_created_by: createdBy,
      p_order_id: orderId,
      p_assigned_to: assignedTo,
      p_due_date: dueDate
    })

    if (error) throw error
    return data
  },

  async getTaskChecklist(taskId: string) {
    const { data, error } = await supabase
      .from('task_checklists')
      .select(`
        *,
        completed_by_user:completed_by (
          name,
          role
        )
      `)
      .eq('task_id', taskId)
      .order('created_at')

    if (error) throw error
    return data
  },

  async updateChecklistItem(
    itemId: string,
    completed: boolean,
    userId: string
  ) {
    const { error } = await supabase
      .from('task_checklists')
      .update({
        completed,
        completed_by: completed ? userId : null,
        completed_at: completed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId)

    if (error) throw error
  }
}