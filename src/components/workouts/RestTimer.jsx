import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// ─── REST TIMER ──────────────────────────────────────────────────────────────
export default function RestTimer({ duration = 90, onClose, exerciseName, setInfo }) {
  const endTsRef = useRef(Date.now() + duration * 1000)
  const [remaining, setRemaining] = useState(duration)
  const [minimized, setMinimized] = useState(false)
  const onCloseRef = useRef(onClose)
  const closedRef = useRef(false)
  const soundedRef = useRef(false)
  const touchStartY = useRef(null)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const beep = (freq, delay) => setTimeout(() => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain()
        osc.type = 'sine'; osc.frequency.value = freq
        gain.gain.setValueAtTime(0.001, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 0.01)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
        osc.connect(gain); gain.connect(ctx.destination)
        osc.start(); osc.stop(ctx.currentTime + 0.45)
      }, delay)
      beep(880, 0)
      beep(1046, 180)
    } catch {}
    try { navigator.vibrate && navigator.vibrate([200, 100, 200]) } catch {}
  }

  useEffect(() => {
    const tick = () => {
      const left = Math.max(0, Math.ceil((endTsRef.current - Date.now()) / 1000))
      setRemaining(left)
      if (left <= 0 && !closedRef.current) {
        closedRef.current = true
        if (!soundedRef.current) { soundedRef.current = true; playBeep() }
        onCloseRef.current && onCloseRef.current()
      }
    }
    tick()
    const id = setInterval(tick, 250)
    const onVis = () => { if (document.visibilityState === 'visible') tick() }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', tick)
    }
  }, [])

  const onTouchStart = e => { touchStartY.current = e.touches[0].clientY }
  const onTouchMove = e => {
    if (touchStartY.current == null || minimized) return
    const dy = e.touches[0].clientY - touchStartY.current
    if (dy < -60) { setMinimized(true); touchStartY.current = null }
  }
  const onTouchEnd = () => { touchStartY.current = null }

  const pct = remaining / duration
  const r = 80, circ = 2 * Math.PI * r
  const dash = pct * circ

  if (minimized) {
    const rMini = 15, circMini = 2 * Math.PI * rMini
    return createPortal(
      <div onClick={() => setMinimized(false)} style={{ position: 'fixed', top: 'calc(10px + env(safe-area-inset-top, 0px))', left: 12, right: 12, zIndex: 500, background: '#1a1a1a', border: '1px solid var(--accent-dim)', borderRadius: 14, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
        <div style={{ width: 36, height: 36, flexShrink: 0 }}>
          <svg width={36} height={36} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={18} cy={18} r={rMini} fill="none" stroke="#2a2a2a" strokeWidth={3} />
            <circle cx={18} cy={18} r={rMini} fill="none" stroke="var(--accent)" strokeWidth={3} strokeLinecap="round" strokeDasharray={`${pct*circMini} ${circMini}`} />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 700 }}>{String(Math.floor(remaining/60)).padStart(2,'0')}:{String(remaining%60).padStart(2,'0')}</div>
          {exerciseName && <div style={{ fontSize: 11, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exerciseName}</div>}
        </div>
        <button onClick={(e) => { e.stopPropagation(); closedRef.current = true; onClose() }} style={{ padding: '6px 10px', borderRadius: 8, background: '#222', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>Пропустить</button>
      </div>, document.body
    )
  }

  return createPortal(
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} style={{ position: 'fixed', inset: 0, background: '#0e0e0e', zIndex: 500, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
      <div style={{ position: 'absolute', top: 'calc(14px + env(safe-area-inset-top,0px))', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: '#333' }} />
        <div style={{ fontSize: 11, color: '#4b5563' }}>Смахните вверх, чтобы свернуть</div>
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, color: '#9ca3af' }}>Таймер отдыха</div>
      <div style={{ position: 'relative', width: 200, height: 200 }}>
        <svg width={200} height={200} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={100} cy={100} r={r} fill="none" stroke="#2a2a2a" strokeWidth={5} />
          <circle cx={100} cy={100} r={r} fill="none" stroke="var(--accent)" strokeWidth={5} strokeLinecap="round"
            strokeDasharray={`${dash} ${circ - dash}`} style={{ transition: 'stroke-dasharray 0.5s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 48, fontWeight: 700, color: remaining > 0 ? '#f5f5f5' : 'var(--accent)' }}>
            {String(Math.floor(remaining/60)).padStart(2,'0')}:{String(remaining%60).padStart(2,'0')}
          </div>
        </div>
      </div>
      {exerciseName && <div style={{ textAlign: 'center' }}><div style={{ fontSize: 16, fontWeight: 600 }}>{exerciseName}</div>{setInfo && <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{setInfo}</div>}</div>}
      <button onClick={() => { closedRef.current = true; onClose() }} style={{ background: '#222', color: '#f5f5f5', border: '1px solid #2e2e2e', borderRadius: 14, padding: '14px 28px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Пропустить</button>
    </div>, document.body
  )
}
