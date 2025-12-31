import { create } from 'zustand'

type DisplayMode = 'grid' | 'list' | 'waterfall'
type Category = 'all' | 'border-radius' | 'circle' | 'svg' | 'upload'

interface IconState {
  displayMode: DisplayMode
  category: Category
  searchQuery: string
  isLocalMode: boolean
  selectedIds: Set<string>
  setDisplayMode: (mode: DisplayMode) => void
  setCategory: (category: Category) => void
  setSearchQuery: (query: string) => void
  toggleLocalMode: () => void
  selectIcon: (id: string) => void
  deselectIcon: (id: string) => void
  selectAll: (ids: string[]) => void
  deselectAll: () => void
}

export const useIconStore = create<IconState>((set) => ({
  displayMode: 'grid',
  category: 'all',
  searchQuery: '',
  isLocalMode: true,
  selectedIds: new Set(),
  setDisplayMode: (mode) => set({ displayMode: mode }),
  setCategory: (category) => set({ category }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  toggleLocalMode: () => set((state) => ({ isLocalMode: !state.isLocalMode })),
  selectIcon: (id) => set((state) => {
    const newSet = new Set(state.selectedIds)
    newSet.add(id)
    return { selectedIds: newSet }
  }),
  deselectIcon: (id) => set((state) => {
    const newSet = new Set(state.selectedIds)
    newSet.delete(id)
    return { selectedIds: newSet }
  }),
  selectAll: (ids) => set({ selectedIds: new Set(ids) }),
  deselectAll: () => set({ selectedIds: new Set() }),
}))
