// Frontend database API client
const dbClient = {
  async connect() {
    return {
      query: this.query,
      release: () => {},
    }
  },
  async query(text: string, params?: any[]) {
    try {
      const response = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, params }),
      })
      if (!response.ok) throw new Error('Database query failed')
      return response.json()
    } catch (error) {
      console.error('Database query error:', error)
      throw error
    }
  }
}

export const db = dbClient