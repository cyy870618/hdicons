import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Search, RefreshCw, LayoutGrid, LayoutList, Columns, Copy,
  Pencil, FolderInput, Trash2, Plus, Check, X,
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card } from '../components/ui/card'
import { iconApi, categoryApi, type IconItem, type CategoryItem } from '../services/api'
import { useIconStore } from '../stores/iconStore'
import { useAuthStore } from '../stores/authStore'
import { ConfirmModal, MoveModal, PromptModal } from '../components/IconActionModals'
import { toast } from 'sonner'
import { copyToClipboard } from '../lib/utils'

const PAGE_STEP = 120

interface MoveState {
  keys: string[]
  title: string
  currentCategory?: string
}
interface DeleteState {
  keys: string[]
  title: string
  message: string
}

export function HomePage() {
  const queryClient = useQueryClient()
  const {
    category, setCategory, displayMode, setDisplayMode, isLocalMode, toggleLocalMode,
    selectMode, selectedKeys, toggleKey, clearSelected, setSelectMode,
  } = useIconStore()
  const { isAuthenticated } = useAuthStore()

  const [search, setSearch] = useState('')
  const [visibleCount, setVisibleCount] = useState(PAGE_STEP)
  const [busy, setBusy] = useState(false)

  const [renameTarget, setRenameTarget] = useState<IconItem | null>(null)
  const [moveState, setMoveState] = useState<MoveState | null>(null)
  const [deleteState, setDeleteState] = useState<DeleteState | null>(null)
  const [newCategoryOpen, setNewCategoryOpen] = useState(false)
  const [renameCategory, setRenameCategory] = useState<CategoryItem | null>(null)
  const [deleteCategory, setDeleteCategory] = useState<CategoryItem | null>(null)

  const { data: catData, isLoading: catLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.getCategories(),
  })
  const categories: CategoryItem[] = (catData as any)?.data?.items || []
  const allCount: number = (catData as any)?.data?.total || 0

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['icons', category],
    queryFn: () => iconApi.getIcons({ category, page_size: 5000 }),
  })
  const icons: IconItem[] = (data as any)?.data?.items || []

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return icons
    return icons.filter((i) =>
      i.name.toLowerCase().includes(q) || i.filename.toLowerCase().includes(q),
    )
  }, [icons, search])

  useEffect(() => {
    setVisibleCount(PAGE_STEP)
  }, [category, search])

  useEffect(() => {
    if (catLoading || !category || category === 'all') return
    if (!categories.some((c) => c.name === category)) setCategory('all')
  }, [categories, category, catLoading, setCategory])

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['icons'] })
    queryClient.invalidateQueries({ queryKey: ['categories'] })
    queryClient.invalidateQueries({ queryKey: ['icons-total'] })
  }

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
      icons: icons.map((i) => ({ name: i.name, url: i.copy_url })),
    }
    const success = await copyToClipboard(JSON.stringify(json, null, 2))
    if (success) toast.success('JSON已复制')
    else toast.error('复制失败')
  }

  const handleCardClick = (icon: IconItem) => {
    if (selectMode) toggleKey(icon.key)
    else handleCopy(icon.copy_url)
  }

  const handleRenameIcon = async (name: string) => {
    if (!renameTarget) return
    setBusy(true)
    try {
      await iconApi.renameIcon(renameTarget.key, name)
      toast.success('重命名成功')
      setRenameTarget(null)
      refresh()
    } catch (err: any) {
      toast.error(err.message || '重命名失败')
    } finally {
      setBusy(false)
    }
  }

  const handleMove = async (target: string) => {
    if (!moveState) return
    setBusy(true)
    try {
      const res: any = await iconApi.moveIcons(moveState.keys, target)
      toast.success(res.message || '移动成功')
      setMoveState(null)
      clearSelected()
      refresh()
    } catch (err: any) {
      toast.error(err.message || '移动失败')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteState) return
    setBusy(true)
    try {
      const res: any = await iconApi.batchDeleteIcons(deleteState.keys)
      toast.success(res.message || '删除成功')
      setDeleteState(null)
      clearSelected()
      refresh()
    } catch (err: any) {
      toast.error(err.message || '删除失败')
    } finally {
      setBusy(false)
    }
  }

  const handleCreateCategory = async (label: string) => {
    setBusy(true)
    try {
      const res: any = await categoryApi.createCategory(label)
      toast.success('分组创建成功')
      setNewCategoryOpen(false)
      refresh()
      if (res.data?.name) setCategory(res.data.name)
    } catch (err: any) {
      toast.error(err.message || '创建分组失败')
    } finally {
      setBusy(false)
    }
  }

  const handleRenameCategory = async (label: string) => {
    if (!renameCategory) return
    setBusy(true)
    try {
      await categoryApi.updateCategory(renameCategory.name, label)
      toast.success('分组已重命名')
      setRenameCategory(null)
      refresh()
    } catch (err: any) {
      toast.error(err.message || '重命名分组失败')
    } finally {
      setBusy(false)
    }
  }

  const handleDeleteCategory = async () => {
    if (!deleteCategory) return
    setBusy(true)
    try {
      await categoryApi.deleteCategory(deleteCategory.name)
      toast.success('分组已删除')
      setDeleteCategory(null)
      refresh()
    } catch (err: any) {
      toast.error(err.message || '删除分组失败')
    } finally {
      setBusy(false)
    }
  }

  const openBatchMove = () => {
    if (!selectedKeys.size) return
    setMoveState({ keys: [...selectedKeys], title: `移动 ${selectedKeys.size} 个图标` })
  }

  const openBatchDelete = () => {
    if (!selectedKeys.size) return
    setDeleteState({
      keys: [...selectedKeys],
      title: '批量删除',
      message: `确定要删除选中的 ${selectedKeys.size} 个图标吗？\n内置图标将被隐藏，上传图标会被真实删除。`,
    })
  }

  const selectedCount = selectedKeys.size
  const shown = filtered.slice(0, visibleCount)

  return (
    <div className="space-y-6 pb-24">
      <div className="text-center">
        <p className="text-muted-foreground">单击图标可复制地址</p>
      </div>

      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="输入关键词搜索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-14"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {filtered.length}
          </span>
        </div>

        <Button variant="outline" size="sm" onClick={toggleLocalMode}>
          {isLocalMode ? '本地模式' : '云端模式'}
        </Button>

        <Button variant="outline" size="sm" onClick={handleCheckUpdate} disabled={isFetching}>
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
        <Button
          variant={category === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCategory('all')}
        >
          全部
          <span className="ml-1 text-xs opacity-70">{allCount}</span>
        </Button>

        {categories.map((cat) => (
          <div key={cat.name} className="relative group/tab">
            <Button
              variant={category === cat.name ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategory(cat.name)}
            >
              {cat.label}
              <span className="ml-1 text-xs opacity-70">{cat.count}</span>
            </Button>
            {isAuthenticated && !cat.builtin && (
              <div className="absolute -top-2 -right-2 hidden group-hover/tab:flex gap-0.5">
                <button
                  title="重命名分组"
                  className="h-4 w-4 rounded-full border bg-background text-muted-foreground hover:text-primary flex items-center justify-center"
                  onClick={(e) => { e.stopPropagation(); setRenameCategory(cat) }}
                >
                  <Pencil className="h-2.5 w-2.5" />
                </button>
                <button
                  title="删除分组"
                  className="h-4 w-4 rounded-full border bg-background text-muted-foreground hover:text-destructive flex items-center justify-center"
                  onClick={(e) => { e.stopPropagation(); setDeleteCategory(cat) }}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            )}
          </div>
        ))}

        {isAuthenticated && (
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            title="新建分组"
            onClick={() => setNewCategoryOpen(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}

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

      <div className="text-sm text-muted-foreground">
        {search ? `搜索到 ${filtered.length} 个图标` : `共 ${filtered.length} 个图标`}
      </div>

      {/* 图标列表 */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">暂无图标</div>
      ) : (
        <>
          <div className={`grid gap-4 ${
            displayMode === 'grid' ? 'grid-cols-3 md:grid-cols-6 lg:grid-cols-10' :
            displayMode === 'list' ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6'
          }`}>
            {shown.map((icon) => {
              const selected = selectedKeys.has(icon.key)
              return (
                <Card
                  key={icon.key}
                  className={`relative p-3 cursor-pointer transition-shadow group ${
                    selected ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-lg'
                  }`}
                  onClick={() => handleCardClick(icon)}
                >
                  {selectMode && (
                    <div className={`absolute top-2 left-2 h-5 w-5 rounded border flex items-center justify-center ${
                      selected ? 'bg-primary border-primary text-primary-foreground' : 'bg-background/90 border-input'
                    }`}>
                      {selected && <Check className="h-3 w-3" />}
                    </div>
                  )}

                  {isAuthenticated && !selectMode && (
                    <div className="absolute top-1 right-1 z-10 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 bg-background/90"
                        title="重命名"
                        onClick={(e) => { e.stopPropagation(); setRenameTarget(icon) }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 bg-background/90"
                        title="移动到..."
                        onClick={(e) => {
                          e.stopPropagation()
                          setMoveState({ keys: [icon.key], title: '移动图标', currentCategory: icon.category })
                        }}
                      >
                        <FolderInput className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 bg-background/90 text-destructive"
                        title="删除"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteState({
                            keys: [icon.key],
                            title: '删除图标',
                            message: `确定要删除「${icon.name}」吗？\n内置图标将被隐藏，上传图标会被真实删除。`,
                          })
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}

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
              )
            })}
          </div>

          {visibleCount < filtered.length && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => setVisibleCount((n) => n + PAGE_STEP)}>
                加载更多（{filtered.length - visibleCount}）
              </Button>
            </div>
          )}
        </>
      )}

      {/* 批量操作条 */}
      {selectMode && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-2xl">
          <Card className="flex flex-wrap items-center gap-3 px-4 py-3 shadow-lg">
            <span className="text-sm font-medium">已选 {selectedCount} 个图标</span>
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="outline" onClick={openBatchMove} disabled={!selectedCount}>
                移动到...
              </Button>
              <Button size="sm" variant="destructive" onClick={openBatchDelete} disabled={!selectedCount}>
                删除
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectMode(false)}>
                取消
              </Button>
            </div>
          </Card>
        </div>
      )}

      <PromptModal
        open={!!renameTarget}
        title="重命名图标"
        label="显示名称"
        placeholder="请输入新的名称"
        initialValue={renameTarget?.name || ''}
        busy={busy}
        onClose={() => setRenameTarget(null)}
        onConfirm={handleRenameIcon}
      />

      <MoveModal
        open={!!moveState}
        title={moveState?.title || '移动图标'}
        categories={categories}
        currentCategory={moveState?.currentCategory}
        busy={busy}
        onClose={() => setMoveState(null)}
        onConfirm={handleMove}
      />

      <ConfirmModal
        open={!!deleteState}
        title={deleteState?.title || '删除'}
        message={deleteState?.message || ''}
        confirmText="删除"
        busy={busy}
        onClose={() => setDeleteState(null)}
        onConfirm={handleDelete}
      />

      <PromptModal
        open={newCategoryOpen}
        title="新建分组"
        label="分组名称"
        placeholder="例如：AI、Docker、NAS"
        busy={busy}
        onClose={() => setNewCategoryOpen(false)}
        onConfirm={handleCreateCategory}
      />

      <PromptModal
        open={!!renameCategory}
        title="重命名分组"
        label="分组名称"
        initialValue={renameCategory?.label || ''}
        busy={busy}
        onClose={() => setRenameCategory(null)}
        onConfirm={handleRenameCategory}
      />

      <ConfirmModal
        open={!!deleteCategory}
        title="删除分组"
        message={`确定要删除分组「${deleteCategory?.label || ''}」吗？\n该分组下的图标将回到原分类。`}
        confirmText="删除"
        busy={busy}
        onClose={() => setDeleteCategory(null)}
        onConfirm={handleDeleteCategory}
      />
    </div>
  )
}
