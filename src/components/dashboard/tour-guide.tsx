import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface TourStep {
  title: string
  description: string
  highlight?: string
}

const tourSteps: TourStep[] = [
  {
    title: "Welcome to your Dashboard",
    description: "Let's take a quick tour of the main features available to you.",
    highlight: "dashboard"
  },
  {
    title: "Manage Orders",
    description: "Track and manage all your equipment orders in one place.",
    highlight: "orders"
  },
  {
    title: "Customer Management",
    description: "Keep track of your customers and their order history.",
    highlight: "customers"
  },
  {
    title: "Product Catalog",
    description: "Manage your equipment catalog and inventory levels.",
    highlight: "products"
  },
  {
    title: "Analytics & Reports",
    description: "Get insights into your business performance.",
    highlight: "analytics"
  }
]

export function TourGuide() {
  const [showTour, setShowTour] = useState(() => {
    const stored = localStorage.getItem("show-tour")
    return stored === null ? true : JSON.parse(stored)
  })
  const [currentStep, setCurrentStep] = useState(0)

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      setShowTour(false)
      localStorage.setItem("show-tour", "false")
    }
  }

  const handleSkip = () => {
    setShowTour(false)
    localStorage.setItem("show-tour", "false")
  }

  if (!showTour) return null

  const step = tourSteps[currentStep]

  return (
    <Dialog open={showTour} onOpenChange={setShowTour}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{step.title}</DialogTitle>
          <DialogDescription>
            {step.description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <div className="flex w-full items-center justify-between">
            <Button
              variant="ghost"
              onClick={handleSkip}
            >
              Skip Tour
            </Button>
            <div className="flex items-center gap-2">
              <div className="text-sm text-muted-foreground">
                {currentStep + 1} of {tourSteps.length}
              </div>
              <Button onClick={handleNext}>
                {currentStep === tourSteps.length - 1 ? "Finish" : "Next"}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 