import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Edit } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { userApi } from '../services/api'
import { toast } from 'sonner'

export function AdminPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [newUser, setNewUser] = useState({ username: '', password: '', role_id: 2 })
  const queryClient = useQueryClient()
  
  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => userApi.getUsers(),
  })
  
  const users = (data as any)?.data?.items || []
  
  const createMutation = useMutation({
    mutationFn: () => userApi.createUser(newUser),
    onSuccess: () => {
      toast.success('用户创建成功')
      setShowCreate(false)
      setNewUser({ username: '', password: '', role_id: 2 })
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (err: any) => {
      toast.error(err.message || '创建失败')
    }
  })
  
  const deleteMutation = useMutation({
    mutationFn: (id: number) => userApi.deleteUser(id),
    onSuccess: () => {
      toast.success('用户删除成功')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (err: any) => {
      toast.error(err.message || '删除失败')
    }
  })
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">用户管理</h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          新建用户
        </Button>
      </div>
      
      {/* 创建用户弹窗 */}
      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>新建用户</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">用户名</label>
              <Input
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                placeholder="请输入用户名"
              />
            </div>
            <div>
              <label className="text-sm font-medium">密码</label>
              <Input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="请输入密码"
              />
            </div>
            <div>
              <label className="text-sm font-medium">角色</label>
              <select
                className="w-full mt-1 p-2 border rounded-md"
                value={newUser.role_id}
                onChange={(e) => setNewUser({ ...newUser, role_id: Number(e.target.value) })}
              >
                <option value={2}>普通用户</option>
                <option value={1}>管理员</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                {createMutation.isPending ? '创建中...' : '创建'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* 用户列表 */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium">用户名</th>
                <th className="px-4 py-3 text-left text-sm font-medium">角色</th>
                <th className="px-4 py-3 text-left text-sm font-medium">创建时间</th>
                <th className="px-4 py-3 text-left text-sm font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((user: any) => (
                <tr key={user.id}>
                  <td className="px-4 py-3 text-sm">{user.id}</td>
                  <td className="px-4 py-3 text-sm">{user.username}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${
                      user.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-muted'
                    }`}>
                      {user.role === 'admin' ? '管理员' : '普通用户'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {user.created_at?.split('T')[0]}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => {
                        if (confirm('确定要删除此用户吗？')) {
                          deleteMutation.mutate(user.id)
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
