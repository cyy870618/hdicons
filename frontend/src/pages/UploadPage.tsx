import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, Trash2, X } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { iconApi } from '../services/api'
import { useAuthStore } from '../stores/authStore'
import { toast } from 'sonner'

export function UploadPage() {
  const [showUpload, setShowUpload] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const { isAuthenticated, user } = useAuthStore()
  const queryClient = useQueryClient()
  
  const { data, isLoading } = useQuery({
    queryKey: ['icons', 'upload'],
    queryFn: () => iconApi.getIcons({ category: 'upload' }),
  })
  
  const icons = (data as any)?.data?.items || []
  
  const uploadMutation = useMutation({
    mutationFn: (files: File[]) => iconApi.uploadIcons(files),
    onSuccess: () => {
      toast.success('上传成功')
      setSelectedFiles([])
      setShowUpload(false)
      queryClient.invalidateQueries({ queryKey: ['icons'] })
    },
    onError: (err: any) => {
      toast.error(err.message || '上传失败')
    }
  })
  
  const deleteMutation = useMutation({
    mutationFn: (filename: string) => iconApi.deleteIcon(filename),
    onSuccess: () => {
      toast.success('删除成功')
      queryClient.invalidateQueries({ queryKey: ['icons'] })
    },
    onError: (err: any) => {
      toast.error(err.message || '删除失败')
    }
  })
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validFiles = files.filter(f => 
      /\.(png|jpg|jpeg|gif|webp|svg|bmp|tiff|ico)$/i.test(f.name)
    )
    setSelectedFiles(prev => [...prev, ...validFiles])
  }
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    const validFiles = files.filter(f => 
      /\.(png|jpg|jpeg|gif|webp|svg|bmp|tiff|ico)$/i.test(f.name)
    )
    setSelectedFiles(prev => [...prev, ...validFiles])
  }, [])
  
  const handleUpload = () => {
    if (!isAuthenticated) {
      toast.error('请先登录')
      return
    }
    if (selectedFiles.length === 0) {
      toast.error('请选择文件')
      return
    }
    uploadMutation.mutate(selectedFiles)
  }
  
  const handleDelete = (filename: string) => {
    if (!isAuthenticated) {
      toast.error('请先登录')
      return
    }
    if (confirm('确定要删除这个图标吗？')) {
      deleteMutation.mutate(filename)
    }
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">用户上传图标</h1>
        <Button onClick={() => setShowUpload(true)}>
          <Upload className="h-4 w-4 mr-2" />
          上传图标
        </Button>
      </div>
      
      {/* 上传弹窗 */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">上传图标</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowUpload(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">点击或拖拽文件到此处</p>
              <p className="text-xs text-muted-foreground">支持 PNG, JPG, SVG, GIF 等格式</p>
              <input
                id="file-input"
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
            
            {selectedFiles.length > 0 && (
              <div className="mt-4 max-h-32 overflow-y-auto">
                <p className="text-sm font-medium mb-2">已选择 {selectedFiles.length} 个文件:</p>
                {selectedFiles.map((f, i) => (
                  <div key={i} className="text-sm text-muted-foreground">{f.name}</div>
                ))}
              </div>
            )}
            
            <div className="mt-4 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowUpload(false)}>取消</Button>
              <Button onClick={handleUpload} disabled={uploadMutation.isPending}>
                {uploadMutation.isPending ? '上传中...' : '上传'}
              </Button>
            </div>
          </Card>
        </div>
      )}
      
      {/* 图标列表 */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : icons.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          暂无上传的图标
        </div>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-10 gap-4">
          {icons.map((icon: any, index: number) => (
            <Card key={index} className="p-3 group relative">
              <div className="aspect-square flex items-center justify-center">
                <img
                  src={icon.thumbnail_url}
                  alt={icon.name}
                  className="max-w-full max-h-full object-contain"
                  loading="lazy"
                />
              </div>
              <p className="mt-2 text-xs text-center truncate">{icon.name}</p>
              {isAuthenticated && (
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDelete(icon.filename)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
