import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, RefreshCw, LayoutGrid, LayoutList, Columns, Copy, Download } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card } from '../components/ui/card'
import { iconApi } from '../services/api'
import { useIconStore } from '../stores/iconStore'
import { useAuthStore } from '../stores/authStore'
import { toast } from 'sonner'
import { copyToClipboard, downloadJson } from '../lib/utils'

export function HomePage() {
  const [search, setSearch] = useState('')
  const { category, setCategory, displayMode, setDisplayMode, isLocalMode, toggleLocalMode } = useIconStore()
  const { isAuthenticated } = useAuthStore()
  
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['icons', category, search],
    queryFn: () => iconApi.getIcons({ category, search }),
  })
  
  const icons = (data as any)?.data?.items || []
  const total = (data as any)?.data?.total || 0
  
  const categories = [
    { key: 'all', label: '所有' },
    { key: 'border-radius', label: '圆角' },
    { key: 'circle', label: '圆形' },
    { key: 'svg', label: '矢量' },
  ]
  
  const handleCheckUpdate = async () => {
    toast.loading('正在检查更新...')
    try {
      const res: any = await iconApi.checkUpdate()
      toast.dismiss()
      toast.success(res.data?.message || '检查完成')
      refetch()
    } catch (err: any) {
      toast.dismiss()
      toast.error(err.message || '检查更新失败')
    }
  }
  
  const handleCopy = async (url: string) => {
    if (!isAuthenticated) {
      toast.error('请先登录')
      return
    }
    const success = await copyToClipboard(url)
    if (success) toast.success('复制成功')
    else toast.error('复制失败')
  }
  
  const handleCopyJson = async () => {
    if (!isAuthenticated) {
      toast.error('请先登录')
      return
    }
    const json = {
      name: 'HD-Icons',
      description: 'By 小迪',
      icons: icons.map((i: any) => ({ name: i.name, url: i.copy_url }))
    }
    const success = await copyToClipboard(JSON.stringify(json, null, 2))
    if (success) toast.success('JSON已复制')
    else toast.error('复制失败')
  }
  
  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="text-center">
        <p className="text-muted-foreground">单击图标可复制地址</p>
      </div>
      
      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px] max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="输入关键词搜索..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        
        <Button variant="outline" size="sm" onClick={toggleLocalMode}>
          {isLocalMode ? '本地模式' : '云端模式'}
        </Button>
        
        <Button variant="outline" size="sm" onClick={handleCheckUpdate}>
          <RefreshCw className="h-4 w-4 mr-2" />
          <span className="hidden md:inline">检查更新</span>
        </Button>
        
        <Button variant="outline" size="sm" onClick={handleCopyJson}>
          <Copy className="h-4 w-4 mr-2" />
          <span className="hidden md:inline">复制JSON</span>
        </Button>
      </div>
      
      {/* 分类标签 */}
      <div className="flex flex-wrap items-center gap-2">
        {categories.map((cat) => (
          <Button
            key={cat.key}
            variant={category === cat.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCategory(cat.key as any)}
          >
            {cat.label}
          </Button>
        ))}
        
        <div className="ml-auto flex gap-1">
          <Button variant={displayMode === 'grid' ? 'default' : 'ghost'} size="icon" onClick={() => setDisplayMode('grid')}>
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button variant={displayMode === 'list' ? 'default' : 'ghost'} size="icon" onClick={() => setDisplayMode('list')}>
            <LayoutList className="h-4 w-4" />
          </Button>
          <Button variant={displayMode === 'waterfall' ? 'default' : 'ghost'} size="icon" onClick={() => setDisplayMode('waterfall')}>
            <Columns className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* 统计 */}
      <div className="text-sm text-muted-foreground">
        共 {total} 个图标
      </div>
      
      {/* 图标列表 */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className={`grid gap-4 ${
          displayMode === 'grid' ? 'grid-cols-3 md:grid-cols-6 lg:grid-cols-10' :
          displayMode === 'list' ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6'
        }`}>
          {icons.map((icon: any, index: number) => (
            <Card
              key={index}
              className="p-3 cursor-pointer hover:shadow-lg transition-shadow group"
              onClick={() => handleCopy(icon.copy_url)}
            >
              <div className="aspect-square flex items-center justify-center">
                <img
                  src={icon.thumbnail_url}
                  alt={icon.name}
                  className="max-w-full max-h-full object-contain"
                  loading="lazy"
                />
              </div>
              <p className="mt-2 text-xs text-center truncate font-medium">{icon.name}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
