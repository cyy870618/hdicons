import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'admin' | 'user'
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore()
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/" replace />
  }
  
  return <>{children}</>
}
