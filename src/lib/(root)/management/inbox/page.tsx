import { useState } from "react"
import { 
  Mail,
  Star,
  Circle,
  CheckCircle2,
  ArrowUpDown,
  Trash2,
  Archive,
  Tag
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/ui/search-input"
import { Pagination } from "@/components/ui/pagination"
import { sortData, type SortConfig } from "@/lib/utils/sort"

const emails = [
  {
    id: 1,
    from: "support@acme.com",
    name: "Acme Support",
    subject: "Your Recent Order #45678",
    preview: "Thank you for your recent order. We wanted to inform you about...",
    date: "2024-02-15",
    read: false,
    starred: true,
    labels: ["support", "orders"]
  },
  {
    id: 2,
    from: "newsletter@tech.com",
    name: "Tech Weekly",
    subject: "This Week in Technology",
    preview: "Here are the top tech stories you need to know this week...",
    date: "2024-02-14",
    read: true,
    starred: false,
    labels: ["newsletter"]
  },
  {
    id: 3,
    from: "team@project.com",
    name: "Project Team",
    subject: "Sprint Planning Meeting",
    preview: "Let's discuss our upcoming sprint goals and objectives...",
    date: "2024-02-14",
    read: false,
    starred: true,
    labels: ["work", "important"]
  },
  {
    id: 4,
    from: "billing@service.com",
    name: "Billing Department",
    subject: "Invoice for February 2024",
    preview: "Your monthly invoice is ready. Please find attached...",
    date: "2024-02-13",
    read: true,
    starred: false,
    labels: ["billing"]
  },
  {
    id: 5,
    from: "events@conference.com",
    name: "Tech Conference",
    subject: "Your Ticket Confirmation",
    preview: "Thank you for registering for TechConf 2024...",
    date: "2024-02-13",
    read: false,
    starred: false,
    labels: ["events"]
  }
]

const ITEMS_PER_PAGE = 10

type Email = typeof emails[0]

export default function InboxPage() {
  const [search, setSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [sortConfig, setSortConfig] = useState<SortConfig<Email>>({
    key: 'date',
    direction: 'desc'
  })

  const handleSort = (key: keyof Email) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const filteredEmails = emails.filter((email) =>
    Object.values(email)
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  const sortedEmails = sortData(filteredEmails, sortConfig)

  const totalPages = Math.ceil(sortedEmails.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedEmails = sortedEmails.slice(
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
        <h2 className="text-3xl font-bold tracking-tight">Inbox</h2>
        <Button className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Compose
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        <SearchInput
          placeholder="Search emails..."
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
            onClick={() => handleSort('from')}
            className="flex items-center gap-2"
          >
            From
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        {paginatedEmails.map((email, index) => (
          <div
            key={email.id}
            className={`flex items-center justify-between p-4 ${
              index !== paginatedEmails.length - 1 ? 'border-b' : ''
            } ${!email.read ? 'bg-muted/30' : ''}`}
          >
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {email.read ? (
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Circle className="h-4 w-4 text-blue-500" />
                )}
                <Star 
                  className={`h-4 w-4 ${
                    email.starred ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'
                  }`} 
                />
              </div>
              <div className="grid gap-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{email.name}</p>
                  <p className="text-sm text-muted-foreground">({email.from})</p>
                  <p className="text-sm text-muted-foreground">{email.date}</p>
                </div>
                <p className="text-sm font-medium">{email.subject}</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {email.preview}
                  </p>
                  <div className="flex gap-1">
                    {email.labels.map((label) => (
                      <span
                        key={label}
                        className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <Archive className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {sortedEmails.length > 0 ? (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      ) : (
        <div className="text-center text-muted-foreground">
          No emails found.
        </div>
      )}
    </div>
  )
} 