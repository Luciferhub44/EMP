import { supabase } from '@/lib/supabase'

export const taskService = {
  async createTask(
    title: string,
    description: string,
    priority: string,
    dueDate: string,
    createdBy: string,
    orderId?: string,
    estimatedHours?: number,
    assignedTo?: string[]
  ) {
    const { data, error } = await supabase.rpc('create_task', {
      p_title: title,
      p_description: description,
      p_priority: priority,
      p_due_date: dueDate,
      p_created_by: createdBy,
      p_order_id: orderId,
      p_estimated_hours: estimatedHours,
      p_assigned_to: assignedTo
    })

    if (error) throw error
    return data
  },

  async getTasks(userId: string, isAdmin: boolean) {
    const query = supabase
      .from('tasks')
      .select(`
        *,
        assignments:task_assignments(
          employee:employee_id(
            id,
            name,
            email,
            role
          ),
          status,
          notes
        ),
        dependencies:task_dependencies(
          depends_on,
          dependent_task:depends_on(
            id,
            title,
            status
          )
        ),
        comments:task_comments(
          id,
          content,
          user:user_id(
            id,
            name,
            role
          ),
          created_at
        ),
        order:order_id(
          id,
          status
        )
      `)
      .order('created_at', { ascending: false })

    if (!isAdmin) {
      query.eq('task_assignments.employee_id', userId)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  },

  async getTask(taskId: string) {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        assignments:task_assignments(
          employee:employee_id(
            id,
            name,
            email,
            role
          ),
          assigned_by(
            id,
            name,
            role
          ),
          status,
          notes,
          created_at
        ),
        dependencies:task_dependencies(
          depends_on,
          dependent_task:depends_on(
            id,
            title,
            status
          )
        ),
        comments:task_comments(
          id,
          content,
          user:user_id(
            id,
            name,
            role
          ),
          created_at
        ),
        order:order_id(
          id,
          status,
          customer:customer_id(
            name
          )
        )
      `)
      .eq('id', taskId)
      .single()

    if (error) throw error
    return data
  },

  async updateTaskStatus(
    taskId: string,
    status: string,
    actualHours?: number,
    notes?: string
  ) {
    const { error } = await supabase.rpc('update_task_status', {
      p_task_id: taskId,
      p_status: status,
      p_actual_hours: actualHours,
      p_notes: notes
    })

    if (error) throw error
  },

  async addComment(taskId: string, userId: string, content: string) {
    const { data, error } = await supabase.rpc('add_task_comment', {
      p_task_id: taskId,
      p_user_id: userId,
      p_content: content
    })

    if (error) throw error
    return data
  },

  async getEmployeeTasks(employeeId: string) {
    const { data, error } = await supabase
      .from('task_assignments')
      .select(`
        task:task_id(
          id,
          title,
          description,
          priority,
          status,
          due_date,
          estimated_hours,
          actual_hours
        )
      `)
      .eq('employee_id', employeeId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data?.map(item => item.task) || []
  },

  async getOrderTasks(orderId: string) {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        assignments:task_assignments(
          employee:employee_id(
            id,
            name,
            role
          ),
          status
        )
      `)
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }
}