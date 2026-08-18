import { useCallback, useRef, useState } from 'react'

// ─── ПЕРЕТАСКИВАНИЕ ЭЛЕМЕНТОВ СПИСКА С ЖИВОЙ ВИЗУАЛЬНОЙ ОБРАТНОЙ СВЯЗЬЮ ────
// Как переупорядочивание иконок на iPhone: элемент под пальцем приподнимается
// и следует за пальцем, соседи плавно расступаются освобождая место, а сам
// порядок массива фиксируется только в момент отпускания пальца.
//
// items    — текущий массив элементов (React-состояние, порядок меняется
//            только через onReorder)
// getId    — как достать стабильный id элемента (лучше не индекс, а uid,
//            чтобы порядок не путался при живом перетаскивании)
// onReorder(newOrderIds) — вызывается один раз при отпускании пальца с новым
//            порядком id; ничего не вызывается, если порядок не изменился
export default function useDragReorder({ items, getId, onReorder }) {
  const [dragId, setDragId] = useState(null)
  const [, forceRender] = useState(0)

  const dragStateRef = useRef(null) // { dragIndex, hoverIndex, startY, tops, heights, order, pointerId }
  const nodesRef = useRef(new Map())
  const refCallbacksRef = useRef(new Map())

  const setItemRef = useCallback((id) => {
    if (!refCallbacksRef.current.has(id)) {
      refCallbacksRef.current.set(id, (el) => {
        if (el) nodesRef.current.set(id, el)
        else nodesRef.current.delete(id)
      })
    }
    return refCallbacksRef.current.get(id)
  }, [])

  const handlePointerMove = useCallback((event) => {
    const st = dragStateRef.current
    if (!st || event.pointerId !== st.pointerId) return
    if (event.cancelable) event.preventDefault()
    const dy = event.clientY - st.startY
    const draggedCenter = st.tops[st.dragIndex] + dy + st.heights[st.dragIndex] / 2

    let hoverIndex = st.dragIndex
    if (dy > 0) {
      for (let i = st.dragIndex + 1; i < st.order.length; i++) {
        const otherCenter = st.tops[i] + st.heights[i] / 2
        if (draggedCenter > otherCenter) hoverIndex = i
        else break
      }
    } else if (dy < 0) {
      for (let i = st.dragIndex - 1; i >= 0; i--) {
        const otherCenter = st.tops[i] + st.heights[i] / 2
        if (draggedCenter < otherCenter) hoverIndex = i
        else break
      }
    }
    st.deltaY = dy
    st.hoverIndex = hoverIndex
    forceRender(n => n + 1)
  }, [])

  const finish = useCallback((event) => {
    const st = dragStateRef.current
    if (!st || (event && event.pointerId !== st.pointerId)) return
    dragStateRef.current = null
    setDragId(null)
    if (st.hoverIndex !== st.dragIndex) {
      const newOrder = st.order.slice()
      const [moved] = newOrder.splice(st.dragIndex, 1)
      newOrder.splice(st.hoverIndex, 0, moved)
      onReorder(newOrder)
    }
  }, [onReorder])

  const handlePointerDown = useCallback((id) => (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    const order = items.map(getId)
    const dragIndex = order.indexOf(id)
    if (dragIndex === -1) return
    const tops = order.map(itemId => nodesRef.current.get(itemId)?.offsetTop ?? 0)
    const heights = order.map(itemId => nodesRef.current.get(itemId)?.offsetHeight ?? 0)
    dragStateRef.current = { dragIndex, hoverIndex: dragIndex, startY: event.clientY, deltaY: 0, tops, heights, order, pointerId: event.pointerId }
    setDragId(id)
    event.currentTarget.setPointerCapture?.(event.pointerId)
    if (event.cancelable) event.preventDefault()
  }, [items, getId])

  const getHandleProps = useCallback((id) => ({
    onPointerDown: handlePointerDown(id),
    onPointerMove: handlePointerMove,
    onPointerUp: finish,
    onPointerCancel: finish,
    style: { touchAction: 'none' },
  }), [handlePointerDown, handlePointerMove, finish])

  const getItemStyle = useCallback((id) => {
    const st = dragStateRef.current
    if (dragId === id && st) {
      return {
        transform: `translateY(${st.deltaY}px) scale(1.02)`,
        transition: 'none',
        position: 'relative',
        zIndex: 5,
        boxShadow: '0 10px 28px rgba(0,0,0,0.35)',
      }
    }
    if (st) {
      const idx = st.order.indexOf(id)
      const { dragIndex, hoverIndex, heights } = st
      let shift = 0
      if (dragIndex < hoverIndex && idx > dragIndex && idx <= hoverIndex) shift = -heights[dragIndex]
      else if (dragIndex > hoverIndex && idx >= hoverIndex && idx < dragIndex) shift = heights[dragIndex]
      return { transform: `translateY(${shift}px)`, transition: 'transform 0.18s ease', position: 'relative', zIndex: 1 }
    }
    return { transform: 'translateY(0px)', transition: 'transform 0.18s ease', position: 'relative', zIndex: 1 }
  }, [dragId])

  return { dragId, setItemRef, getItemStyle, getHandleProps }
}
