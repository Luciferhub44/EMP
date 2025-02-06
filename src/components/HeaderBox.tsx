import { Link } from 'react-router-dom'
import { Search } from '@/components/Search'
import { UserNav } from '@/components/UserNav'
import { ThemeToggle } from '@/components/theme-toggle'
import { Bell, Menu } from 'lucide-react'
import { MobileNav } from '@/components/mobile-nav'

export function HeaderBox() {
  return (
    <header className="header-container">
      <div className="header-content">
        <div className="flex items-center gap-4 lg:hidden">
          <MobileNav />
        </div>
        
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-primary p-2 rounded-md">
              <span className="font-bold text-primary-foreground">EMP</span>
            </div>
          </Link>
        </div>

        <div className="flex-1 px-4">
          <Search />
        </div>

        <div className="ml-auto flex items-center gap-4">
          <ThemeToggle />
          <button className="header-icon-button relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center">
              3
            </span>
          </button>
          <UserNav />
        </div>
      </div>
    </header>
  )
}
