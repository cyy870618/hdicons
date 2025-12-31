import { Routes, Route } from 'react-router-dom'
import { MainLayout } from './components/layout/MainLayout'
import { HomePage } from './pages/HomePage'
import { UploadPage } from './pages/UploadPage'
import { LoginPage } from './pages/LoginPage'
import { AdminPage } from './pages/AdminPage'
import { ProtectedRoute } from './components/common/ProtectedRoute'
import { useThemeStore } from './stores/themeStore'
import { useEffect } from 'react'

export default function App() {
  const { theme } = useThemeStore()
  
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])
  
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminPage />
            </ProtectedRoute>
          } 
        />
      </Route>
    </Routes>
  )
}
