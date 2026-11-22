import { Link, useLocation } from 'react-router-dom'
import { Moon, Sun, LogIn, LogOut, User, Upload, ListChecks, ChevronDown, KeyRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Modal } from '../IconActionModals'
import { useThemeStore } from '../../stores/themeStore'
import { useAuthStore } from '../../stores/authStore'
import { useIconStore } from '../../stores/iconStore'
import { authApi, iconApi, systemApi } from '../../services/api'
import { toast } from 'sonner'

export function Header() {
  const location = useLocation()
  const { theme, toggleTheme } = useThemeStore()
  const { isAuthenticated, user, logout } = useAuthStore()
  const { selectMode, toggleSelectMode } = useIconStore()
  const [title, setTitle] = useState('HD-Icons 图标库')
  const [menuOpen, setMenuOpen] = useState(false)
  const [pwdOpen, setPwdOpen] = useState(false)
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' })
  const [pwdBusy, setPwdBusy] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const { data: totalData } = useQuery({
    queryKey: ['icons-total'],
    queryFn: () => iconApi.getIcons({ page_size: 1 }),
  })
  const total = (totalData as any)?.data?.total || 0

  useEffect(() => {
    systemApi.getConfig().then((res: any) => {
      if (res.data?.title) setTitle(res.data.title)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const isActive = (path: string) => location.pathname === path

  const openPwd = () => {
    setPwd({ current: '', next: '', confirm: '' })
    setPwdOpen(true)
  }

  const submitPwd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pwd.current || !pwd.next) {
      toast.error('请填写当前密码和新密码')
      return
    }
    if (pwd.next.length < 6) {
      toast.error('新密码长度至少6位')
      return
    }
    if (pwd.next !== pwd.confirm) {
      toast.error('两次输入的新密码不一致')
      return
    }
    setPwdBusy(true)
    try {
      await authApi.changePassword(pwd.current, pwd.next)
      toast.success('密码修改成功')
      setPwdOpen(false)
    } catch (err: any) {
      toast.error(err.message || '密码修改失败')
    } finally {
      setPwdBusy(false)
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="container mx-auto flex h-14 items-center gap-3 px-4">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold text-primary shrink-0">
          <span>{title}</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium">{total}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 ml-2">
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

        <div className="flex items-center gap-2 ml-auto">
          <Link to="/upload" className="hidden sm:block">
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-1" />
              <span className="hidden md:inline">上传</span>
            </Button>
          </Link>

          <Button
            variant={selectMode ? 'default' : 'ghost'}
            size="icon"
            title={selectMode ? '取消批量选择' : '批量选择'}
            onClick={toggleSelectMode}
          >
            <ListChecks className="h-5 w-5" />
          </Button>

          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          {isAuthenticated ? (
            <div className="relative" ref={menuRef}>
              <Button variant="outline" size="sm" onClick={() => setMenuOpen((v) => !v)}>
                <User className="h-4 w-4 mr-1" />
                <span className="max-w-[120px] truncate">{user?.username}</span>
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-40 rounded-md border bg-background py-1 shadow-lg">
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                    onClick={() => { setMenuOpen(false); openPwd() }}
                  >
                    <KeyRound className="h-4 w-4" />
                    修改密码
                  </button>
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent"
                    onClick={() => { setMenuOpen(false); logout(); toast.success('已退出登录') }}
                  >
                    <LogOut className="h-4 w-4" />
                    退出登录
                  </button>
                </div>
              )}
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

      <Modal open={pwdOpen} title="修改密码" onClose={() => setPwdOpen(false)}>
        <form onSubmit={submitPwd} className="space-y-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">当前密码</label>
            <Input
              type="password"
              value={pwd.current}
              onChange={(e) => setPwd({ ...pwd, current: e.target.value })}
              placeholder="请输入当前密码"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">新密码</label>
            <Input
              type="password"
              value={pwd.next}
              onChange={(e) => setPwd({ ...pwd, next: e.target.value })}
              placeholder="至少6位"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">确认新密码</label>
            <Input
              type="password"
              value={pwd.confirm}
              onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })}
              placeholder="再次输入新密码"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setPwdOpen(false)}>取消</Button>
            <Button type="submit" disabled={pwdBusy}>
              {pwdBusy ? '提交中...' : '确认修改'}
            </Button>
          </div>
        </form>
      </Modal>
    </header>
  )
}
