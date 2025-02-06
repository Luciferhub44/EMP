import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg"
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12"
}

export function LoadingSpinner({ size = "md", className, ...props }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center justify-center" {...props}>
      <Loader2 className={cn("animate-spin", sizeClasses[size], className)} />
    </div>
  )
} 