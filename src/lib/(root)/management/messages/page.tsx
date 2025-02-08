import { useState } from "react"
import { 
  Star, 
  Circle, 
  CheckCircle2, 
  ArrowUpDown,
  Trash2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/ui/search-input"
import { Pagination } from "@/components/ui/pagination"
import { sortData, type SortConfig } from "@/lib/utils/sort"

const messages = [
  {
    id: 1,
    sender: "John Doe",
    subject: "New Product Launch",
    preview: "I wanted to discuss the upcoming product launch...",
    date: "2024-02-15",
    read: false,
    starred: true,
  },
  {
    id: 2,
    sender: "Sarah Wilson",
    subject: "Marketing Campaign Update",
    preview: "Here's the latest update on our Q1 marketing campaign...",
    date: "2024-02-14",
    read: true,
    starred: false,
  },
  {
    id: 3,
    sender: "Michael Brown",
    subject: "Customer Feedback Report",
    preview: "I've compiled the customer feedback from last month...",
    date: "2024-02-14",
    read: true,
    starred: true,
  },
  {
    id: 4,
    sender: "Emma Davis",
    subject: "Team Meeting Notes",
    preview: "Here are the notes from yesterday's team meeting...",
    date: "2024-02-13",
    read: false,
    starred: false,
  },
  {
    id: 5,
    sender: "James Wilson",
    subject: "Project Timeline",
    preview: "We need to discuss the project timeline for Q2...",
    date: "2024-02-13",
    read: true,
    starred: false,
  }
]

const ITEMS_PER_PAGE = 10

type Message = typeof messages[0]

export default function MessagesPage() {
  const [search, setSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [sortConfig, setSortConfig] = useState<SortConfig<Message>>({
    key: 'date',
    direction: 'desc'
  })

  const handleSort = (key: keyof Message) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const filteredMessages = messages.filter((message) =>
    Object.values(message)
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  const sortedMessages = sortData(filteredMessages, sortConfig)

  const totalPages = Math.ceil(sortedMessages.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedMessages = sortedMessages.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  )

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    setCurrentPage(1)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Messages</h2>
      </div>

      <div className="flex flex-col gap-4">
        <SearchInput
          placeholder="Search messages..."
          value={search}
          onChange={handleSearch}
          className="md:w-[300px]"
        />

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSort('date')}
            className="flex items-center gap-2"
          >
            Date
            <ArrowUpDown className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSort('sender')}
            className="flex items-center gap-2"
          >
            Sender
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        {paginatedMessages.map((message, index) => (
          <div
            key={message.id}
            className={`flex items-center justify-between p-4 ${
              index !== paginatedMessages.length - 1 ? 'border-b' : ''
            } ${!message.read ? 'bg-muted/30' : ''}`}
          >
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {message.read ? (
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Circle className="h-4 w-4 text-blue-500" />
                )}
                <Star 
                  className={`h-4 w-4 ${
                    message.starred ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'
                  }`} 
                />
              </div>
              <div className="grid gap-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{message.sender}</p>
                  <p className="text-sm text-muted-foreground">{message.date}</p>
                </div>
                <p className="text-sm font-medium">{message.subject}</p>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {message.preview}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {sortedMessages.length > 0 ? (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      ) : (
        <div className="text-center text-muted-foreground">
          No messages found.
        </div>
      )}
    </div>
  )
} 