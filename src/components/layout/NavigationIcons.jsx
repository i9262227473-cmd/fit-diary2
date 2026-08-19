function IconDefs({ id, active }) {
  return (
    <defs>
      <linearGradient id={`${id}-body`} x1="5" y1="3" x2="19" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor={active ? 'var(--accent-bright)' : 'var(--text-secondary)'} />
        <stop offset=".48" stopColor={active ? 'var(--accent)' : 'var(--text-muted)'} />
        <stop offset="1" stopColor={active ? 'var(--accent-strong)' : 'color-mix(in srgb, var(--text-muted) 56%, #101722)'} />
      </linearGradient>
      <linearGradient id={`${id}-shine`} x1="7" y1="5" x2="14" y2="14" gradientUnits="userSpaceOnUse">
        <stop stopColor="white" stopOpacity={active ? '.62' : '.34'} />
        <stop offset="1" stopColor="white" stopOpacity="0" />
      </linearGradient>
      <filter id={`${id}-shadow`} x="-30%" y="-30%" width="160%" height="180%">
        <feDropShadow dx="0" dy="1.8" stdDeviation="1.35" floodColor="#000" floodOpacity=".4" />
      </filter>
    </defs>
  )
}

export function NavHome({ active = false, size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <IconDefs id="nav-home" active={active} />
      <g filter="url(#nav-home-shadow)">
        <path d="M3.4 10.4 12 3.8l8.6 6.6v9.1c0 .8-.6 1.4-1.4 1.4H4.8c-.8 0-1.4-.6-1.4-1.4v-9.1Z" fill="url(#nav-home-body)" />
        <path d="M8.8 20.9v-6.2c0-.7.5-1.2 1.2-1.2h4c.7 0 1.2.5 1.2 1.2v6.2" fill="color-mix(in srgb, var(--bg) 80%, transparent)" />
        <path d="M4.6 10.2 12 4.6l7.4 5.6" stroke="url(#nav-home-shine)" strokeWidth="1.35" strokeLinecap="round" />
      </g>
    </svg>
  )
}

export function NavWorkout({ active = false, size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <IconDefs id="nav-workout" active={active} />
      <g filter="url(#nav-workout-shadow)" transform="rotate(-7 12 12)">
        <rect x="2" y="9.5" width="3.8" height="5" rx="1.7" fill="url(#nav-workout-body)" />
        <rect x="5.1" y="7.1" width="3.5" height="9.8" rx="1.55" fill="url(#nav-workout-body)" />
        <rect x="7.8" y="10.3" width="8.4" height="3.4" rx="1.7" fill="url(#nav-workout-body)" />
        <rect x="15.4" y="7.1" width="3.5" height="9.8" rx="1.55" fill="url(#nav-workout-body)" />
        <rect x="18.2" y="9.5" width="3.8" height="5" rx="1.7" fill="url(#nav-workout-body)" />
        <path d="M3.1 10.4h1M6.2 8.2h.8M16.4 8.2h.8M19.3 10.4h1" stroke="url(#nav-workout-shine)" strokeWidth=".9" strokeLinecap="round" />
      </g>
    </svg>
  )
}

export function NavProgress({ active = false, size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <IconDefs id="nav-progress" active={active} />
      <g filter="url(#nav-progress-shadow)">
        <path d="M3.2 18.7 8.5 13l4.2 2.8 7.7-8.3" stroke="url(#nav-progress-body)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16.7 7.4h3.8v3.8" stroke="url(#nav-progress-body)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m4.1 17.8 4.5-4.5" stroke="url(#nav-progress-shine)" strokeWidth="1" strokeLinecap="round" />
      </g>
    </svg>
  )
}

export function NavFood({ active = false, size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <IconDefs id="nav-food" active={active} />
      <g filter="url(#nav-food-shadow)">
        <path d="M3 11.3h18c-.3 5.5-3.6 8.7-9 8.7s-8.7-3.2-9-8.7Z" fill="url(#nav-food-body)" />
        <path d="M4.5 10.5C5.1 6.7 8 4.3 12 4.3s6.9 2.4 7.5 6.2h-15Z" fill="url(#nav-food-body)" />
        <path d="M6.2 10.1c.7-2.8 3-4.3 5.8-4.3" stroke="url(#nav-food-shine)" strokeWidth="1.25" strokeLinecap="round" />
        <path d="M12 2.5v2M7.7 4.1l1.1 1.7M16.3 4.1l-1.1 1.7" stroke={active ? 'var(--accent-bright)' : 'var(--text-secondary)'} strokeWidth="1.35" strokeLinecap="round" />
      </g>
    </svg>
  )
}

export function NavUser({ active = false, size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <IconDefs id="nav-user" active={active} />
      <g filter="url(#nav-user-shadow)">
        <circle cx="12" cy="7.6" r="4.1" fill="url(#nav-user-body)" />
        <path d="M4 20.7c.3-5 3.4-7.7 8-7.7s7.7 2.7 8 7.7H4Z" fill="url(#nav-user-body)" />
        <path d="M10.2 4.8c.8-.5 1.7-.7 2.7-.5M6 19.2c.7-2.7 2.8-4.2 5.5-4.5" stroke="url(#nav-user-shine)" strokeWidth="1.1" strokeLinecap="round" />
      </g>
    </svg>
  )
}
