import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Input } from './ui/input'
import type { CategoryItem } from '../services/api'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}

export function Modal({ open, title, onClose, children }: ModalProps) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <Card className="w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        {children}
      </Card>
    </div>
  )
}

interface PromptModalProps {
  open: boolean
  title: string
  label: string
  placeholder?: string
  initialValue?: string
  confirmText?: string
  busy?: boolean
  onClose: () => void
  onConfirm: (value: string) => void
}

export function PromptModal({
  open, title, label, placeholder, initialValue = '', confirmText = '确定', busy, onClose, onConfirm,
}: PromptModalProps) {
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    if (open) setValue(initialValue)
  }, [open, initialValue])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const next = value.trim()
    if (!next) return
    onConfirm(next)
  }

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">{label}</label>
          <Input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>取消</Button>
          <Button type="submit" disabled={busy || !value.trim()}>
            {busy ? '处理中...' : confirmText}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

interface MoveModalProps {
  open: boolean
  title: string
  categories: CategoryItem[]
  currentCategory?: string
  busy?: boolean
  onClose: () => void
  onConfirm: (category: string) => void
}

export function MoveModal({
  open, title, categories, currentCategory, busy, onClose, onConfirm,
}: MoveModalProps) {
  const options = categories.filter((c) => c.name !== currentCategory)
  const [target, setTarget] = useState(options[0]?.name || '')

  useEffect(() => {
    if (open) setTarget(options[0]?.name || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentCategory])

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">目标分组</label>
          <select
            className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          >
            {options.map((c) => (
              <option key={c.name} value={c.name}>{c.label}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={() => target && onConfirm(target)} disabled={busy || !target}>
            {busy ? '移动中...' : '移动到'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

interface ConfirmModalProps {
  open: boolean
  title: string
  message: string
  confirmText?: string
  busy?: boolean
  onClose: () => void
  onConfirm: () => void
}

export function ConfirmModal({
  open, title, message, confirmText = '确定', busy, onClose, onConfirm,
}: ConfirmModalProps) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground whitespace-pre-line">{message}</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={busy}>
            {busy ? '处理中...' : confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
