import React, { useRef, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'

/**
 * iOS-style swipe actions: swipe left to reveal Edit + Delete buttons.
 * Tap on revealed area closes it. Tap on content while closed behaves as normal (passes through).
 * Uses Pointer Events only (single source of truth — no Touch+Pointer double firing).
 */
export default function SwipeActions({
  onEdit,
  onDelete,
  children,
  disabled = false,
  confirmText,
  radius = 18,
  editLabel = 'Изменить',
  deleteLabel = 'Удалить',
}) {
  const EDIT_W = onEdit ? 76 : 0
  const DELETE_W = 76
  const MAX = EDIT_W + DELETE_W
  const OPEN_THRESHOLD = MAX * 0.4

  const [dx, setDx] = useState(0)
  const [open, setOpen] = useState(false)
  const dragging = useRef(false)
  const start = useRef({ x: 0, y: 0, dx: 0 })
  const axis = useRef(null)
  const pointerId = useRef(null)

  const clamp = (val) => Math.max(-MAX, Math.min(0, val))

  const handlePointerDown = (event) => {
    if (disabled) return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    pointerId.current = event.pointerId
    start.current = { x: event.clientX, y: event.clientY, dx }
    axis.current = null
    dragging.current = true
  }

  const handlePointerMove = (event) => {
    if (disabled || !dragging.current || event.pointerId !== pointerId.current) return
    const deltaX = event.clientX - start.current.x
    const deltaY = event.clientY - start.current.y

    if (axis.current === null && (Math.abs(deltaX) > 6 || Math.abs(deltaY) > 6)) {
      axis.current = Math.abs(deltaX) > Math.abs(deltaY) ? 'x' : 'y'
      if (axis.current === 'x') event.currentTarget.setPointerCapture(pointerId.current)
    }

    if (axis.current === 'x') {
      event.stopPropagation()
      if (event.cancelable) event.preventDefault()
      setDx(clamp(start.current.dx + deltaX))
    }
  }

  const finish = (event) => {
    if (disabled) return
    dragging.current = false
    if (axis.current === 'x') {
      event.stopPropagation()
      setOpen(-dx >= OPEN_THRESHOLD)
      setDx(-dx >= OPEN_THRESHOLD ? -MAX : 0)
    }
    axis.current = null
    pointerId.current = null
  }

  const closeMenu = () => { setOpen(false); setDx(0) }

  const handleContentClick = (event) => {
    if (open) {
      event.preventDefault()
      event.stopPropagation()
      closeMenu()
    }
  }

  const handleDelete = () => {
    const confirmed = !confirmText || window.confirm(confirmText)
    if (!confirmed) return
    setDx(-500)
    window.setTimeout(onDelete, 180)
  }

  const handleEdit = () => {
    closeMenu()
    onEdit()
  }

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: radius }}>
      <div
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end' }}
      >
        {onEdit && (
          <button
            type="button"
            onClick={handleEdit}
            style={{ width: EDIT_W, border: 'none', background: '#3b82f6', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer' }}
          >
            <Pencil size={18} />
            <span style={{ fontSize: 11 }}>{editLabel}</span>
          </button>
        )}
        <button
          type="button"
          onClick={handleDelete}
          style={{ width: DELETE_W, border: 'none', background: '#ef4444', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer' }}
        >
          <Trash2 size={18} />
          <span style={{ fontSize: 11 }}>{deleteLabel}</span>
        </button>
      </div>

      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
        onClickCapture={handleContentClick}
        style={{
          transform: `translateX(${dx}px)`,
          transition: dragging.current ? 'none' : 'transform 0.25s ease',
          position: 'relative',
          background: 'var(--bg, #fff)',
          touchAction: 'pan-y',
        }}
      >
        {children}
      </div>
    </div>
  )
}
