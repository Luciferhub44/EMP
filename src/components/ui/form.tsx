import { cn } from "@/lib/utils"
import { forwardRef } from "react"
export interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {}

const Form = forwardRef<HTMLFormElement, FormProps>(
  ({ className, ...props }, ref) => {
    return (
      <form
        ref={ref}
        className={cn(
          "space-y-6",
          className
        )}
        {...props}
      />
    )
  }
)
Form.displayName = "Form"

const FormField = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("space-y-2", className)}
      {...props}
    />
  )
})
FormField.displayName = "FormField"

const FormLabel = forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => {
  return (
    <label
      ref={ref}
      className={cn(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className
      )}
      {...props}
    />
  )
})
FormLabel.displayName = "FormLabel"

const FormControl = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("relative", className)}
      {...props}
    />
  )
})
FormControl.displayName = "FormControl"

export {
  Form,
  FormField,
  FormLabel,
  FormControl,
}
