function getCalorieColor(pct) {
  if (pct < 0.6) return '#3d9970'
  if (pct < 0.85) return '#a3e635'
  if (pct < 0.95) return '#fbbf24'
  if (pct < 1.05) return '#fb923c'
  return '#ef4444'
}

export { getCalorieColor }

export default function CircularProgress({
  value,
  max,
  size = 120,
  stroke = 5,
  color,
  dynamicColor = false,
  children,
  onClick,
}) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const ratio = max > 0 ? value / max : 0
  const cappedRatio = Math.min(ratio, 1.2)
  const dash = Math.min(cappedRatio, 1) * circumference
  const finalColor = dynamicColor ? getCalorieColor(ratio) : (color || '#3d9970')

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#2a2a2a" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={finalColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          style={{ transition: 'stroke-dasharray 0.6s ease, stroke 0.4s ease' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children}
      </div>
    </div>
  )
}
