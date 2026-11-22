import { create } from 'zustand'

type DisplayMode = 'grid' | 'list' | 'waterfall'
type Category = string

interface IconState {
  displayMode: DisplayMode
  category: Category
  searchQuery: string
  isLocalMode: boolean
  selectMode: boolean
  selectedKeys: Set<string>
  setDisplayMode: (mode: DisplayMode) => void
  setCategory: (category: Category) => void
  setSearchQuery: (query: string) => void
  toggleLocalMode: () => void
  setSelectMode: (enabled: boolean) => void
  toggleSelectMode: () => void
  toggleKey: (key: string) => void
  selectAll: (keys: string[]) => void
  clearSelected: () => void
}

export const useIconStore = create<IconState>((set) => ({
  displayMode: 'grid',
  category: 'all',
  searchQuery: '',
  isLocalMode: true,
  selectMode: false,
  selectedKeys: new Set(),
  setDisplayMode: (mode) => set({ displayMode: mode }),
  setCategory: (category) => set({ category }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  toggleLocalMode: () => set((state) => ({ isLocalMode: !state.isLocalMode })),
  setSelectMode: (enabled) => set(() => ({ selectMode: enabled, selectedKeys: new Set<string>() })),
  toggleSelectMode: () => set((state) => ({
    selectMode: !state.selectMode,
    selectedKeys: new Set<string>(),
  })),
  toggleKey: (key) => set((state) => {
    const next = new Set(state.selectedKeys)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return { selectedKeys: next }
  }),
  selectAll: (keys) => set({ selectedKeys: new Set(keys) }),
  clearSelected: () => set({ selectedKeys: new Set<string>() }),
}))
