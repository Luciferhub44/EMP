import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface SpecificationsTableProps {
  specifications: Record<string, string | number>
}

export function SpecificationsTable({ specifications }: SpecificationsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Specification</TableHead>
          <TableHead>Value</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Object.entries(specifications).map(([key, value]) => (
          <TableRow key={key}>
            <TableCell className="font-medium">
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </TableCell>
            <TableCell>{value}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
} 