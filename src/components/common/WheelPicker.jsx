import { useEffect, useMemo, useRef, useState } from 'react'

export function buildWeightValues() {
  const values = []
  for (let value = 0; value <= 20; value += 0.5) {
    values.push(Math.round(value * 10) / 10)
  }
  for (let value = 22.5; value <= 300; value += 2.5) {
    values.push(Math.round(value * 10) / 10)
  }
  return values
}

export default function WheelPicker({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  values: valuesProp,
  width = 80,
  itemHeight = 40,
  visibleCount = 5,
}) {
  const containerRef = useRef(null)
  const scrollTimeout = useRef(null)
  const isProgrammatic = useRef(false)
  const [centerIndex, setCenterIndex] = useState(null)

  const values = useMemo(() => {
    if (valuesProp) return valuesProp
    const result = []
    for (let current = min; current <= max + 1e-6; current += step) {
      result.push(Math.round(current * 100) / 100)
    }
    return result
  }, [valuesProp, min, max, step])

  const formatValue = (current) => (
    Number.isInteger(current) ? String(current) : current.toFixed(1)
  )

  const closestIndex = (current) => {
    let bestIndex = 0
    let bestDifference = Infinity

    values.forEach((candidate, index) => {
      const difference = Math.abs(candidate - current)
      if (difference < bestDifference) {
        bestDifference = difference
        bestIndex = index
      }
    })

    return bestIndex
  }

  useEffect(() => {
    const index = closestIndex(Number.parseFloat(value) || min)
    setCenterIndex(index)

    if (containerRef.current) {
      isProgrammatic.current = true
      containerRef.current.scrollTop = index * itemHeight
      window.setTimeout(() => {
        isProgrammatic.current = false
      }, 60)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => () => {
    window.clearTimeout(scrollTimeout.current)
  }, [])

  const handleScroll = () => {
    if (isProgrammatic.current) return

    const element = containerRef.current
    if (!element) return

    const rawIndex = element.scrollTop / itemHeight
    const index = Math.max(0, Math.min(values.length - 1, Math.round(rawIndex)))
    setCenterIndex(index)

    window.clearTimeout(scrollTimeout.current)
    scrollTimeout.current = window.setTimeout(() => {
      element.scrollTo({ top: index * itemHeight, behavior: 'smooth' })
      onChange(formatValue(values[index]))
    }, 100)
  }

  const paddingItems = Math.floor(visibleCount / 2)
  const height = itemHeight * visibleCount

  return (
    <div style={{ position: 'relative', width, height }}>
      <style>{`.wheel-scroll-hide::-webkit-scrollbar{display:none}`}</style>
      <div
        style={{
          position: 'absolute',
          top: itemHeight * paddingItems,
          left: 0,
          right: 0,
          height: itemHeight,
          background: 'rgba(61,153,112,0.12)',
          border: '1px solid rgba(61,153,112,0.4)',
          borderRadius: 10,
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(#0e0e0e, transparent 30%, transparent 70%, #0e0e0e)',
          pointerEvents: 'none',
          zIndex: 2,
          opacity: 0.9,
        }}
      />
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="wheel-scroll-hide"
        style={{
          height: '100%',
          overflowY: 'scroll',
          scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        }}
      >
        <div style={{ height: itemHeight * paddingItems }} />
        {values.map((current, index) => (
          <div
            key={current}
            style={{
              height: itemHeight,
              scrollSnapAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--mono)',
              fontSize: index === centerIndex ? 20 : 15,
              fontWeight: index === centerIndex ? 700 : 500,
              color: index === centerIndex ? '#f5f5f5' : '#4b5563',
              transition: 'font-size 0.15s, color 0.15s',
            }}
          >
            {formatValue(current)}
          </div>
        ))}
        <div style={{ height: itemHeight * paddingItems }} />
      </div>
    </div>
  )
}
