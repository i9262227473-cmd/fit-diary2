import { useRef } from 'react'
import { GripVertical } from 'lucide-react'

export default function ExerciseDragHandle({ index, count, onMove, className = '' }) {
  const startY = useRef(null)

  const begin = event => {
    startY.current = event.touches?.[0]?.clientY ?? event.clientY
  }

  const end = event => {
    if (startY.current == null) return
    const endY = event.changedTouches?.[0]?.clientY ?? event.clientY
    const delta = endY - startY.current
    startY.current = null
    if (Math.abs(delta) < 34) return
    const direction = delta > 0 ? 1 : -1
    if ((direction < 0 && index === 0) || (direction > 0 && index === count - 1)) return
    onMove(index, direction)
  }

  return (
    <button
      type="button"
      className={className}
      aria-label="Перетащить упражнение"
      title="Проведите вверх или вниз"
      onTouchStart={begin}
      onTouchEnd={end}
      onPointerDown={begin}
      onPointerUp={end}
    >
      <GripVertical size={20} />
    </button>
  )
}
