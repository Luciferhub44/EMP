import { useState } from "react"
import { Link } from "react-router-dom"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import { mainNav } from "@/config/nav"

export function MobileNav() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[240px] sm:w-[300px]">
        <nav className="flex flex-col gap-4">
          {mainNav.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className="text-sm font-medium transition-colors hover:text-primary"
              onClick={() => setOpen(false)}
            >
              {item.title}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  )
} 