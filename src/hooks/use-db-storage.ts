import * as React from "react"
import { db } from "@/lib/api/db"

export function useDbStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  // State to store our value
  const [storedValue, setStoredValue] = React.useState<T>(() => {
    try {
      // Try to get value from database on init
      const fetchInitialValue = async () => {
        const result = await db.query('SELECT data FROM storage WHERE key = $1', [key])
        return result.rows[0]?.data || initialValue
      }
      
      fetchInitialValue().catch(console.error)
      return initialValue
    } catch (error) {
      console.error(error)
      return initialValue
    }
  })

  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to database
  const setValue = React.useCallback(async (value: T) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value
      
      // Save to database
      await db.query(
        'INSERT INTO storage (key, data) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET data = $2',
        [key, valueToStore]
      )
      
      setStoredValue(valueToStore)
    } catch (error) {
      console.error(error)
    }
  }, [key, storedValue])

  return [storedValue, setValue]
} 