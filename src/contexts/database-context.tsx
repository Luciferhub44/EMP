import { createContext, useContext, ReactNode } from 'react'
import { db } from '@/lib/api/db'

const DatabaseContext = createContext(db)

export function DatabaseProvider({ children }: { children: ReactNode }) {
  return (
    <DatabaseContext.Provider value={db}>
      {children}
    </DatabaseContext.Provider>
  )
}

export const useDatabase = () => useContext(DatabaseContext) 