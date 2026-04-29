import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Compass, Menu, X, User, LogOut, Settings } from 'lucide-react'

export function Navbar() {
  const { profile, isAuthenticated, logout, isLoading } = useAuth()
  const navigate = useNavigate()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const isReadyUser = isAuthenticated && !!profile && profile.role !== 'admin'

  const handleLogout = async () => {
    await logout()
  }

  const getDashboardLink = () => {
    switch (profile?.role) {
      case 'student':
        return '/student/dashboard'
      case 'advisor':
        return '/advisor/dashboard'
      case 'mentor':
        return '/mentor/dashboard'
      default:
        return '/profile'
    }
  }

  return (
    <nav className="sticky top-0 z-[9999] border-b bg-background">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold">
          <Compass className="h-5 w-5" />
          CareerPath
        </Link>

        <div className="hidden md:flex items-center gap-4">
          {isLoading ? null : isReadyUser ? (
            <>
              <Link to={getDashboardLink()} className="text-sm font-medium hover:text-primary">
                Dashboard
              </Link>

              {profile?.role === 'student' && (
                <>
                  <Link to="/student/recommendations" className="text-sm font-medium hover:text-primary">
                    Recommendations
                  </Link>

                  <Link to="/student/mentors" className="text-sm font-medium hover:text-primary">
                    Find Mentors
                  </Link>

                  <Link to="/student/advisors" className="text-sm font-medium hover:text-primary">
                    Find Advisors
                  </Link>

                  <Link to="/student/transcript" className="text-sm font-medium hover:text-primary">
                    Transcript
                  </Link>

                  <Link to="/student/advisor-reports" className="text-sm font-medium hover:text-primary">
                    Reports
                  </Link>
                </>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button">
                    <Avatar>
                      <AvatarFallback>{profile?.name?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end">
                  <div className="px-2 py-2">
                    <div className="font-medium">{profile?.name || 'User'}</div>
                    <div className="text-sm text-muted-foreground capitalize">
                      {profile?.role || 'member'}
                    </div>
                  </div>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link to="/auth">
                <Button variant="ghost">Sign In</Button>
              </Link>

              <Link to="/auth">
                <Button>Get Started</Button>
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="md:hidden"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="flex flex-col gap-3 border-t px-4 py-4 md:hidden bg-background">
          {isLoading ? null : isReadyUser ? (
            <>
              <Link to={getDashboardLink()} onClick={() => setIsMobileMenuOpen(false)}>
                Dashboard
              </Link>

              {profile?.role === 'student' && (
                <>
                  <Link to="/student/recommendations" onClick={() => setIsMobileMenuOpen(false)}>
                    Recommendations
                  </Link>

                  <Link to="/student/mentors" onClick={() => setIsMobileMenuOpen(false)}>
                    Find Mentors
                  </Link>

                  <Link to="/student/advisors" onClick={() => setIsMobileMenuOpen(false)}>
                    Find Advisors
                  </Link>

                  <Link to="/student/transcript" onClick={() => setIsMobileMenuOpen(false)}>
                    Transcript
                  </Link>

                  <Link to="/student/advisor-reports" onClick={() => setIsMobileMenuOpen(false)}>
                    Reports
                  </Link>
                </>
              )}

              <Link to="/profile" onClick={() => setIsMobileMenuOpen(false)}>
                Profile
              </Link>

              <Link to="/settings" onClick={() => setIsMobileMenuOpen(false)}>
                Settings
              </Link>

              <button type="button" onClick={handleLogout} className="text-left">
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/auth" onClick={() => setIsMobileMenuOpen(false)}>
                Sign In
              </Link>

              <Link to="/auth" onClick={() => setIsMobileMenuOpen(false)}>
                Get Started
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}