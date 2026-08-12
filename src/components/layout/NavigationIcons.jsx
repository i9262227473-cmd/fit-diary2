export function NavHome({ color, size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 9.5L12 3l9 6.5V21a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke={color} strokeWidth="2" fill={color === 'var(--accent)' ? 'var(--accent-dim)' : 'none'} />
      <path d="M9 22v-7h6v7" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function NavWorkout({ color, size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="1" y="10" width="4" height="4" rx="2" fill={color} opacity="0.7" />
      <rect x="5" y="8" width="3" height="8" rx="1.5" fill={color} />
      <line x1="8" y1="12" x2="16" y2="12" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <rect x="16" y="8" width="3" height="8" rx="1.5" fill={color} />
      <rect x="19" y="10" width="4" height="4" rx="2" fill={color} opacity="0.7" />
    </svg>
  )
}

export function NavProgress({ color, size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <polyline points="3,17 8,12 13,14 20,7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="17,7 20,7 20,10" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function NavFood({ color, size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 11h18M3 11a9 9 0 0118 0M3 11v2a9 9 0 0018 0v-2M12 3v2M8 6l1 2M16 6l-1 2" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function NavUser({ color, size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="4" stroke={color} strokeWidth="2" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
