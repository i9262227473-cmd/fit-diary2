import React, { useId } from 'react'

function IconDefs({ id, tone = 'accent', contrast = false }) {
  const colors = contrast
    ? ['#ffffff', '#fff3e9', '#e9c9b4']
    : tone === 'neutral'
        ? ['color-mix(in srgb, var(--text-muted) 55%, white)', 'var(--text-muted)', 'color-mix(in srgb, var(--text-muted) 70%, #433a34)']
        : ['var(--accent-bright)', 'var(--accent)', 'var(--accent-strong)']

  return (
    <defs>
      <linearGradient id={`${id}-body`} x1="5" y1="3" x2="20" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor={colors[0]} />
        <stop offset=".5" stopColor={colors[1]} />
        <stop offset="1" stopColor={colors[2]} />
      </linearGradient>
      <linearGradient id={`${id}-shine`} x1="6" y1="4" x2="15" y2="16" gradientUnits="userSpaceOnUse">
        <stop stopColor="#fff" stopOpacity={contrast ? '.78' : '.62'} />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
      <filter id={`${id}-shadow`} x="-40%" y="-40%" width="180%" height="200%">
        <feDropShadow dx="0" dy="1.7" stdDeviation="1.25" floodColor="#2b160a" floodOpacity={contrast ? '.22' : '.38'} />
      </filter>
    </defs>
  )
}

function useIconId(prefix) {
  return `${prefix}-${useId().replace(/:/g, '')}`
}

export function FoodChevronIcon({ direction = 'left', size = 24 }) {
  const id = useIconId('food-chevron')
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <IconDefs id={id} tone="neutral" />
      <g filter={`url(#${id}-shadow)`} transform={direction === 'right' ? 'translate(24 0) scale(-1 1)' : undefined}>
        <path d="m15.2 5.2-6.6 6.8 6.6 6.8" stroke={`url(#${id}-body)`} strokeWidth="3.7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m14.5 6.2-5.6 5.8" stroke={`url(#${id}-shine)`} strokeWidth="1" strokeLinecap="round" />
      </g>
    </svg>
  )
}

export function FoodPencilIcon({ size = 22 }) {
  const id = useIconId('food-pencil')
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <IconDefs id={id} />
      <g filter={`url(#${id}-shadow)`} transform="rotate(-42 12 12)">
        <rect x="9" y="3.2" width="6" height="15.8" rx="2.6" fill={`url(#${id}-body)`} />
        <path d="m9.2 18.1 2.8 3 2.8-3H9.2Z" fill="color-mix(in srgb, var(--accent) 32%, #f3d8c2)" />
        <path d="M10.5 5.2v9.5" stroke={`url(#${id}-shine)`} strokeWidth="1.15" strokeLinecap="round" />
        <rect x="9" y="3.1" width="6" height="3.2" rx="1.6" fill="color-mix(in srgb, var(--accent) 44%, white)" />
      </g>
    </svg>
  )
}

export function FoodPlusIcon({ size = 22 }) {
  const id = useIconId('food-plus')
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <IconDefs id={id} />
      <g filter={`url(#${id}-shadow)`}>
        <rect x="9.5" y="3.3" width="5" height="17.4" rx="2.5" fill={`url(#${id}-body)`} />
        <rect x="3.3" y="9.5" width="17.4" height="5" rx="2.5" fill={`url(#${id}-body)`} />
        <path d="M11 5.3v12.8M5.5 11h12.8" stroke={`url(#${id}-shine)`} strokeWidth=".9" strokeLinecap="round" />
      </g>
    </svg>
  )
}

export function FoodBowlIcon({ size = 24, active = true }) {
  const id = useIconId('food-bowl')
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <IconDefs id={id} tone={active ? 'accent' : 'neutral'} />
      <g filter={`url(#${id}-shadow)`}>
        <path d="M4 11.4h16c-.4 5.2-3.2 8.1-8 8.1s-7.6-2.9-8-8.1Z" fill={`url(#${id}-body)`} />
        <path d="M5.5 10.7C6.1 7.4 8.5 5.3 12 5.3s5.9 2.1 6.5 5.4h-13Z" fill={`url(#${id}-body)`} />
        <path d="M7 10.2c.7-2.1 2.5-3.4 5-3.4" stroke={`url(#${id}-shine)`} strokeWidth="1.25" strokeLinecap="round" />
        <path d="m16.2 8.5 3.1-4.2" stroke={`url(#${id}-body)`} strokeWidth="2.2" strokeLinecap="round" />
      </g>
    </svg>
  )
}

export function FoodCalendarIcon({ size = 23, active = false }) {
  const id = useIconId('food-calendar')
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <IconDefs id={id} tone={active ? 'accent' : 'neutral'} />
      <g filter={`url(#${id}-shadow)`}>
        <rect x="3.4" y="5.1" width="17.2" height="15.1" rx="3.5" fill={`url(#${id}-body)`} />
        <path d="M3.8 9.2h16.4" stroke="color-mix(in srgb, var(--card-solid) 64%, transparent)" strokeWidth="2" />
        <path d="M7.5 3.6v3.3M16.5 3.6v3.3" stroke={`url(#${id}-body)`} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M7.2 12.5h1.5M11.2 12.5h1.5M15.2 12.5h1.5M7.2 16.3h1.5M11.2 16.3h1.5M15.2 16.3h1.5" stroke={`url(#${id}-shine)`} strokeWidth="1.5" strokeLinecap="round" />
      </g>
    </svg>
  )
}

export function FoodAiIcon({ size = 22 }) {
  const id = useIconId('food-ai')
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <IconDefs id={id} contrast />
      <g filter={`url(#${id}-shadow)`} stroke={`url(#${id}-body)`} strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 4.2H5.8c-.9 0-1.6.7-1.6 1.6V8M16 4.2h2.2c.9 0 1.6.7 1.6 1.6V8M8 19.8H5.8c-.9 0-1.6-.7-1.6-1.6V16M16 19.8h2.2c.9 0 1.6-.7 1.6-1.6V16" strokeWidth="2.25" />
        <path d="m12 7.2.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1Z" fill={`url(#${id}-body)`} strokeWidth=".7" />
      </g>
    </svg>
  )
}
