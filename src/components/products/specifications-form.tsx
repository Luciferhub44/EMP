import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, X } from "lucide-react"

interface SpecificationsFormProps {
  specifications: Record<string, string | number>
  onChange: (specs: Record<string, string | number>) => void
}

export function SpecificationsForm({ specifications, onChange }: SpecificationsFormProps) {
  const [newKey, setNewKey] = useState("")
  const [newValue, setNewValue] = useState("")

  const handleAdd = () => {
    if (!newKey.trim()) return
    onChange({
      ...specifications,
      [newKey]: newValue
    })
    setNewKey("")
    setNewValue("")
  }

  const handleRemove = (key: string) => {
    const newSpecs = { ...specifications }
    delete newSpecs[key]
    onChange(newSpecs)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[1fr,1fr,auto] gap-2">
        {Object.entries(specifications).map(([key, value]) => (
          <div key={key} className="contents">
            <Input value={key} disabled />
            <Input 
              value={value}
              onChange={(e) => 
                onChange({
                  ...specifications,
                  [key]: e.target.value
                })
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => handleRemove(key)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[1fr,1fr,auto] gap-2">
        <div>
          <Label>Key</Label>
          <Input
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="e.g., enginePower"
          />
        </div>
        <div>
          <Label>Value</Label>
          <Input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="e.g., 245hp"
          />
        </div>
        <div className="flex items-end">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleAdd}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
} 