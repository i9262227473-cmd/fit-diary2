import React, { useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'

/**
 * Mobile swipe-to-delete container.
 * Keeps deletion interaction isolated from feature screens.
 */
export default function SwipeToDelete({
  onDelete,
  children,
  disabled = false,
  confirmText,
  radius = 18,
}) {
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const start = useRef({ x: 0, y: 0 })
  const axis = useRef(null)

  const MAX = 88
  const THRESHOLD = 60

  const handleStart = (event) => {
    if (disabled) return
    const touch = event.touches[0]
    start.current = { x: touch.clientX, y: touch.clientY }
    axis.current = null
    setDragging(true)
  }

  const handleMove = (event) => {
    if (disabled || !dragging) return

    const touch = event.touches[0]
    const deltaX = touch.clientX - start.current.x
    const deltaY = touch.clientY - start.current.y

    if (axis.current === null && (Math.abs(deltaX) > 6 || Math.abs(deltaY) > 6)) {
      axis.current = Math.abs(deltaX) > Math.abs(deltaY) ? 'x' : 'y'
    }

    if (axis.current === 'x') {
      event.stopPropagation()
      if (event.cancelable) event.preventDefault()
      setDx(Math.max(-MAX, Math.min(0, deltaX)))
    }
  }

  const reset = () => {
    setDx(0)
    axis.current = null
  }

  const handleEnd = (event) => {
    if (disabled) return
    setDragging(false)
    if (axis.current === 'x') event.stopPropagation()

    if (-dx < THRESHOLD) {
      reset()
      return
    }

    const confirmed = !confirmText || window.confirm(confirmText)
    if (!confirmed) {
      reset()
      return
    }

    setDx(-500)
    window.setTimeout(onDelete, 180)
    axis.current = null
  }

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: radius }}>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: '#ef4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '0 22px',
        }}
      >
        <Trash2 size={20} color="#fff" />
      </div>

      <div
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
        onTouchCancel={reset}
        style={{
          transform: `translateX(${dx}px)`,
          transition: dragging ? 'none' : 'transform 0.25s ease',
          position: 'relative',
        }}
      >
        {children}
      </div>
    </div>
  )
}
