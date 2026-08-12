import { useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, X } from 'lucide-react'
import { getTechnique } from '../../data/exerciseTechnique'
import { getExerciseMedia } from '../../data/exerciseMedia'
import styles from './TechniqueModal.module.css'

// ─── TECHNIQUE MODAL (окно с техникой упражнения) ─────────────────────﻿
export default function TechniqueModal({ name, muscle, onClose }) {
  const [position, setPosition] = useState('start')
  const tech = getTechnique(name)
  const media = getExerciseMedia(name)
  const M_COLORS = { Грудь:'var(--accent)', Спина:'#3b82f6', Ноги:'#f59e0b', Плечи:'#8b5cf6', Трицепс:'#ec4899', Бицепс:'#f97316', Кор:'#06b6d4', Кардио:'#ef4444' }
  return createPortal(
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.sheet} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div style={{ flex:1 }}>
            <div className={styles.title}>{name}</div>
            {muscle && <span className={styles.muscle} style={{ background:M_COLORS[muscle]||'var(--accent)' }}>{muscle}</span>}
          </div>
          <button className={styles.close} onClick={onClose} aria-label="Закрыть"><X size={18} /></button>
        </div>

        {media && (
          <section className={styles.mediaCard}>
            <img src={media[position]} alt={`${name} — ${position === 'start' ? 'начальное положение' : 'конечное положение'}`} />
            <div className={styles.positionTabs}>
              <button className={position === 'start' ? styles.positionActive : ''} onClick={() => setPosition('start')}>Начало</button>
              <button className={position === 'end' ? styles.positionActive : ''} onClick={() => setPosition('end')}>Завершение</button>
            </div>
            <p>Подсвечены мышцы, которые работают в упражнении</p>
          </section>
        )}

        {tech ? (
          <>
            <div style={{ background:'#1a1a1a', border:'1px solid #2e2e2e', borderRadius:16, padding:16, marginBottom:12 }}>
              <div style={{ fontSize:11, color:'#6b7280', textTransform:'uppercase', letterSpacing:0.5, marginBottom:10 }}>Как выполнять</div>
              <ol style={{ margin:0, paddingLeft:20, color:'#d1d5db', fontSize:14, lineHeight:1.75 }}>
                {tech.steps.map((s, i) => <li key={i} style={{ marginBottom:4 }}>{s}</li>)}
              </ol>
            </div>

            {tech.mistakes?.length > 0 && (
              <div style={{ background:'#1a1a1a', border:'1px solid #2e2e2e', borderRadius:16, padding:16, marginBottom:12 }}>
                <div style={{ fontSize:11, color:'#6b7280', textTransform:'uppercase', letterSpacing:0.5, marginBottom:10 }}>Частые ошибки</div>
                <ul style={{ margin:0, paddingLeft:20, color:'#d1d5db', fontSize:14, lineHeight:1.75 }}>
                  {tech.mistakes.map((m, i) => <li key={i} style={{ marginBottom:4 }}>{m}</li>)}
                </ul>
              </div>
            )}

            {tech.safety && (
              <div style={{ display:'flex', gap:10, alignItems:'flex-start', background:'rgba(251,191,36,0.08)', border:'1px solid rgba(251,191,36,0.25)', borderRadius:14, padding:'14px 16px' }}>
                <AlertTriangle size={18} color="#fbbf24" style={{ flexShrink:0, marginTop:1 }} />
                <div style={{ fontSize:13, lineHeight:1.6, color:'#fbd97a' }}>{tech.safety}</div>
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign:'center', padding:'30px 0', color:'#6b7280', fontSize:14 }}>
            Описание техники для этого упражнения пока готовится.
          </div>
        )}
      </div>
    </div>, document.body
  )
}
