import { createPortal } from 'react-dom'
import { AlertTriangle, X } from 'lucide-react'
import { getTechnique } from '../../data/exerciseTechnique'
import { getExerciseMedia } from '../../data/exerciseMedia'
import styles from './TechniqueModal.module.css'

// ─── TECHNIQUE MODAL (окно с техникой упражнения) ─────────────────────﻿
export default function TechniqueModal({ name, muscle, onClose }) {
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
            <img src={media.start} alt={`${name} — техника выполнения`} />
            <p>Подсвечены мышцы, которые работают в упражнении</p>
          </section>
        )}

        {tech ? (
          <>
            <div className={styles.techCard}>
              <div className={styles.sectionTitle}>Как выполнять</div>
              <ol>
                {tech.steps.map((s, i) => <li key={i} style={{ marginBottom:4 }}>{s}</li>)}
              </ol>
            </div>

            {tech.mistakes?.length > 0 && (
              <div className={styles.techCard}>
                <div className={styles.sectionTitle}>Частые ошибки</div>
                <ul>
                  {tech.mistakes.map((m, i) => <li key={i} style={{ marginBottom:4 }}>{m}</li>)}
                </ul>
              </div>
            )}

            {tech.safety && (
              <div className={styles.safety}>
                <AlertTriangle size={18} color="#fbbf24" style={{ flexShrink:0, marginTop:1 }} />
                <div>{tech.safety}</div>
              </div>
            )}
          </>
        ) : (
          <div className={styles.empty}>
            Описание техники для этого упражнения пока готовится.
          </div>
        )}
      </div>
    </div>, document.body
  )
}
