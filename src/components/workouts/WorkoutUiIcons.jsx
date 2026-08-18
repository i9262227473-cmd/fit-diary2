import React, { useId } from 'react'

function useIconId(prefix) {
  return `${prefix}-${useId().replace(/:/g, '')}`
}

function IconDefs({ id, tone = 'blue', light = false }) {
  const colors = light
    ? ['#ffffff', '#f7fbff', '#d8e7f8']
    : tone === 'purple'
      ? ['#d7a2ff', '#8e4df3', '#5222b7']
      : tone === 'neutral'
        ? ['color-mix(in srgb, var(--text-muted) 42%, white)', 'var(--text-muted)', 'color-mix(in srgb, var(--text-muted) 70%, #29303b)']
        : ['var(--accent-bright)', 'var(--accent)', 'var(--accent-strong)']

  return (
    <defs>
      <linearGradient id={`${id}-body`} x1="4" y1="3" x2="21" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor={colors[0]} />
        <stop offset=".48" stopColor={colors[1]} />
        <stop offset="1" stopColor={colors[2]} />
      </linearGradient>
      <linearGradient id={`${id}-shine`} x1="6" y1="4" x2="15" y2="16" gradientUnits="userSpaceOnUse">
        <stop stopColor="#fff" stopOpacity={light ? '.9' : '.7'} />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
      <filter id={`${id}-shadow`} x="-45%" y="-45%" width="190%" height="210%">
        <feDropShadow dx="0" dy="1.8" stdDeviation="1.25" floodColor="#061225" floodOpacity={light ? '.2' : '.42'} />
      </filter>
    </defs>
  )
}

export function WorkoutDumbbellIcon({ size = 28, tone = 'blue' }) {
  const id = useIconId('workout-dumbbell')
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <IconDefs id={id} tone={tone} />
      <g filter={`url(#${id}-shadow)`} transform="rotate(-7 12 12)">
        <rect x="2" y="9.3" width="3.8" height="5.4" rx="1.7" fill={`url(#${id}-body)`} />
        <rect x="5.2" y="6.9" width="3.7" height="10.2" rx="1.6" fill={`url(#${id}-body)`} />
        <rect x="8" y="10.2" width="8" height="3.6" rx="1.8" fill={`url(#${id}-body)`} />
        <rect x="15.1" y="6.9" width="3.7" height="10.2" rx="1.6" fill={`url(#${id}-body)`} />
        <rect x="18.2" y="9.3" width="3.8" height="5.4" rx="1.7" fill={`url(#${id}-body)`} />
        <path d="M3 10.2h1.3M6.3 8.1h1M16.2 8.1h1M19.4 10.2h1.3" stroke={`url(#${id}-shine)`} strokeWidth=".9" strokeLinecap="round" />
      </g>
    </svg>
  )
}

export function WorkoutBrainIcon({ size = 29 }) {
  const id = useIconId('workout-brain')
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <IconDefs id={id} tone="blue" />
      <g filter={`url(#${id}-shadow)`}>
        <path d="M9.6 4.2A3.3 3.3 0 0 0 6.5 7a3.2 3.2 0 0 0-1.8 5.7 3.5 3.5 0 0 0 4.9 4.8V4.2Zm4.8 0A3.3 3.3 0 0 1 17.5 7a3.2 3.2 0 0 1 1.8 5.7 3.5 3.5 0 0 1-4.9 4.8V4.2Z" fill={`url(#${id}-body)`} />
        <path d="M9.6 7.1c-1.6-.1-2.5.8-2.7 2.1m2.7 2.1c-1.4-.4-2.6.2-3.1 1.3m7.9-5.5c1.6-.1 2.5.8 2.7 2.1m-2.7 2.1c1.4-.4 2.6.2 3.1 1.3M12 5.1v11.8" stroke={`url(#${id}-shine)`} strokeWidth="1.05" strokeLinecap="round" />
        <path d="m19.1 3 .7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6-1.6-.7 1.6-.7.7-1.6Z" fill="var(--accent-bright)" />
      </g>
    </svg>
  )
}

export function WorkoutPlusIcon({ size = 28, light = false }) {
  const id = useIconId('workout-plus')
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <IconDefs id={id} light={light} />
      <g filter={`url(#${id}-shadow)`}>
        <rect x="9.4" y="3" width="5.2" height="18" rx="2.6" fill={`url(#${id}-body)`} />
        <rect x="3" y="9.4" width="18" height="5.2" rx="2.6" fill={`url(#${id}-body)`} />
        <path d="M11 5.1v13.1M5.2 11h13" stroke={`url(#${id}-shine)`} strokeWidth="1" strokeLinecap="round" />
      </g>
    </svg>
  )
}

export function WorkoutListIcon({ size = 23, active = false }) {
  const id = useIconId('workout-list')
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <IconDefs id={id} tone={active ? 'blue' : 'neutral'} />
      <g filter={`url(#${id}-shadow)`}>
        {[6, 12, 18].map(y => <circle key={y} cx="4.2" cy={y} r="1.65" fill={`url(#${id}-body)`} />)}
        {[6, 12, 18].map(y => <rect key={y} x="8" y={y - 1.7} width="13" height="3.4" rx="1.7" fill={`url(#${id}-body)`} />)}
        <path d="M9.3 5.2h8.5M9.3 11.2h8.5M9.3 17.2h8.5" stroke={`url(#${id}-shine)`} strokeWidth=".8" strokeLinecap="round" />
      </g>
    </svg>
  )
}

export function WorkoutCalendarIcon({ size = 23, active = false }) {
  const id = useIconId('workout-calendar')
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <IconDefs id={id} tone={active ? 'blue' : 'neutral'} />
      <g filter={`url(#${id}-shadow)`}>
        <rect x="3.3" y="5.1" width="17.4" height="15.2" rx="3.5" fill={`url(#${id}-body)`} />
        <path d="M3.7 9.1h16.6" stroke="color-mix(in srgb, var(--card-solid) 70%, transparent)" strokeWidth="2" />
        <path d="M7.5 3.5v3.4M16.5 3.5v3.4" stroke={`url(#${id}-body)`} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M7.1 12.5h1.6M11.2 12.5h1.6M15.3 12.5h1.6M7.1 16.3h1.6M11.2 16.3h1.6M15.3 16.3h1.6" stroke={`url(#${id}-shine)`} strokeWidth="1.45" strokeLinecap="round" />
      </g>
    </svg>
  )
}

export function WorkoutChevronIcon({ size = 22 }) {
  const id = useIconId('workout-chevron')
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <IconDefs id={id} tone="neutral" />
      <g filter={`url(#${id}-shadow)`}>
        <path d="m9 5.2 6.6 6.8L9 18.8" stroke={`url(#${id}-body)`} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m9.8 6.3 5.5 5.7" stroke={`url(#${id}-shine)`} strokeWidth=".9" strokeLinecap="round" />
      </g>
    </svg>
  )
}

export function WorkoutPlayIcon({ size = 25, light = false }) {
  const id = useIconId('workout-play')
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <IconDefs id={id} light={light} />
      <g filter={`url(#${id}-shadow)`}>
        <circle cx="12" cy="12" r="9.2" fill={`url(#${id}-body)`} />
        <path d="m10 7.9 6.2 4.1-6.2 4.1V7.9Z" fill={light ? 'var(--accent)' : '#fff'} />
        <path d="M7.1 7.5A7 7 0 0 1 12 5.3" stroke={`url(#${id}-shine)`} strokeWidth="1.1" strokeLinecap="round" />
      </g>
    </svg>
  )
}

export function WorkoutRepeatIcon({ size = 23 }) {
  const id = useIconId('workout-repeat')
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <IconDefs id={id} />
      <g filter={`url(#${id}-shadow)`}>
        <path d="M18.6 7.4A8 8 0 0 0 5 6.8L3.4 8.5" stroke={`url(#${id}-body)`} strokeWidth="2.7" strokeLinecap="round" />
        <path d="M3.5 4.8v3.8h3.8M5.4 16.6A8 8 0 0 0 19 17.2l1.6-1.7" stroke={`url(#${id}-body)`} strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20.5 19.2v-3.8h-3.8" stroke={`url(#${id}-body)`} strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6.3 5.8A7.3 7.3 0 0 1 14 4.7M17.7 18.2A7.3 7.3 0 0 1 10 19.3" stroke={`url(#${id}-shine)`} strokeWidth=".8" strokeLinecap="round" />
      </g>
    </svg>
  )
}
