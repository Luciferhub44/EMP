type SortDirection = 'asc' | 'desc'

export interface SortConfig<T> {
  key: keyof T
  direction: SortDirection
}

export function sortData<T>(data: T[], config: SortConfig<T>): T[] {
  return [...data].sort((a, b) => {
    const aValue = a[config.key]
    const bValue = b[config.key]

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return config.direction === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue)
    }

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return config.direction === 'asc'
        ? aValue - bValue
        : bValue - aValue
    }

    return 0
  })
} 