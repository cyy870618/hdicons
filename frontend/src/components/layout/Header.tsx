import { Link, useLocation } from 'react-router-dom'
import { Moon, Sun, LogIn, User, Settings, LogOut } from 'lucide-react'
import { Button } from '../ui/button'
import { useThemeStore } from '../../stores/themeStore'
import { useAuthStore } from '../../stores/authStore'
import { useEffect, useState } from 'react'
import { systemApi } from '../../services/api'

export function Header() {
  const location = useLocation()
  const { theme, toggleTheme } = useThemeStore()
  const { isAuthenticated, user, logout } = useAuthStore()
  const [title, setTitle] = useState('HD-Icons 图标库')
  
  useEffect(() => {
    systemApi.getConfig().then((res: any) => {
      if (res.data?.title) setTitle(res.data.title)
    }).catch(() => {})
  }, [])
  
  const isActive = (path: string) => location.pathname === path
  
  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link to="/" className="text-xl font-bold text-primary">
          {title}
        </Link>
        
        <nav className="hidden md:flex items-center gap-6">
          <Link 
            to="/" 
            className={`text-sm font-medium transition-colors hover:text-primary ${isActive('/') ? 'text-primary' : 'text-muted-foreground'}`}
          >
            GitHub图标
          </Link>
          <Link 
            to="/upload" 
            className={`text-sm font-medium transition-colors hover:text-primary ${isActive('/upload') ? 'text-primary' : 'text-muted-foreground'}`}
          >
            用户上传
          </Link>
          {isAuthenticated && user?.role === 'admin' && (
            <Link 
              to="/admin" 
              className={`text-sm font-medium transition-colors hover:text-primary ${isActive('/admin') ? 'text-primary' : 'text-muted-foreground'}`}
            >
              管理后台
            </Link>
          )}
        </nav>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden md:inline">
                {user?.username}
              </span>
              <Button variant="ghost" size="icon" onClick={logout}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            <Link to="/login">
              <Button variant="outline" size="sm">
                <LogIn className="mr-2 h-4 w-4" />
                <span className="hidden md:inline">登录</span>
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
