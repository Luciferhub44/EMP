import * as React from "react"
import { Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2, Circle } from "lucide-react"

interface ChecklistItem {
  id: string
  title: string
  description: string
  completed: boolean
  link: string
  buttonText: string
}

const checklistItems: ChecklistItem[] = [
  {
    id: "profile",
    title: "Complete your profile",
    description: "Add your company details and preferences",
    completed: false,
    link: "/settings/profile",
    buttonText: "Update Profile"
  },
  {
    id: "products",
    title: "Add your first product",
    description: "Start building your product catalog",
    completed: false,
    link: "/products/new",
    buttonText: "Add Product"
  },
  {
    id: "customer",
    title: "Add a customer",
    description: "Create your first customer profile",
    completed: false,
    link: "/customers",
    buttonText: "Add Customer"
  },
  {
    id: "order",
    title: "Create your first order",
    description: "Process a new equipment order",
    completed: false,
    link: "/orders/new",
    buttonText: "Create Order"
  }
]

export function OnboardingChecklist() {
  const [items, setItems] = React.useState(() => {
    const saved = localStorage.getItem("onboarding-checklist")
    return saved ? JSON.parse(saved) : checklistItems
  })

  const progress = Math.round(
    (items.filter((item: ChecklistItem) => item.completed).length / items.length) * 100
  )

  const handleComplete = (id: string) => {
    setItems((prev: ChecklistItem[]) => {
      const updated = prev.map((item: ChecklistItem) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
      localStorage.setItem("onboarding-checklist", JSON.stringify(updated))
      return updated
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Getting Started</span>
          <span className="text-sm font-normal text-muted-foreground">
            {progress}% completed
          </span>
        </CardTitle>
        <Progress value={progress} className="h-2" />
      </CardHeader>
      <CardContent className="grid gap-4">
        {items.map((item: ChecklistItem) => (
          <div
            key={item.id}
            className="flex items-start gap-4 rounded-lg border p-4"
          >
            <button
              onClick={() => handleComplete(item.id)}
              className="mt-1 hover:text-primary"
            >
              {item.completed ? (
                <CheckCircle2 className="h-5 w-5 text-primary" />
              ) : (
                <Circle className="h-5 w-5" />
              )}
            </button>
            <div className="flex-1 space-y-1">
              <p className="font-medium leading-none">{item.title}</p>
              <p className="text-sm text-muted-foreground">
                {item.description}
              </p>
            </div>
            <Link to={item.link}>
              <Button variant={item.completed ? "outline" : "default"} size="sm">
                {item.buttonText}
              </Button>
            </Link>
          </div>
        ))}
      </CardContent>
    </Card>
  )
} 