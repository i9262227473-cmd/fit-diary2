import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Sparkles } from 'lucide-react'
import NumberStepper from '../common/NumberStepper'

// ─── WORKOUT COMPLETE ─────────────────────────────────────────────────────────
export default function WorkoutComplete({ workout, duration, onSave, aiCall }) {
  const [feeling, setFeeling] = useState(null)
  const [comment, setComment] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiText, setAiText] = useState(null)
  const [editMin, setEditMin] = useState(String(Math.max(1, Math.round(duration/60))))
  const totalSets = workout.exercises.reduce((a, e) => a + e.sets.length, 0)
  const totalVolume = workout.exercises.reduce((a, e) => a + e.sets.reduce((s, st) => s + (parseFloat(st.weight)||0) * (parseInt(String(st.reps).split('-').pop())||0), 0), 0)

  const runAnalysis = async () => {
    if (aiLoading || !aiCall) return
    setAiLoading(true)
    try {
      const exLines = workout.exercises.map(e => {
        const sets = e.sets.map((s, i) => `подход ${i+1}: ${s.reps} пов × ${s.weight||0}кг`).join('; ')
        const commentPart = e.comment ? ` | комментарий пользователя: «${e.comment}»` : ''
        return `${e.name} (${e.muscle}): ${sets}${commentPart}`
      }).join('\n')
      const prompt = `Ты — опытный тренер по силовым. Разбери эту ОДНУ завершённую тренировку конкретно и по делу.

ВАЖНО: это ОДНА тренировка из недельного сплит-плана (название: "${workout.name || 'Тренировка'}"). Остальные мышечные группы (например спина и ноги, если их здесь нет) тренируются в ДРУГИЕ дни недели. НЕ ругай за отсутствие других групп — это нормально для сплита. Оценивай ТОЛЬКО те мышцы, что были сегодня.

Длительность: ${Math.round(duration/60)} мин
Общий тоннаж: ${Math.round(totalVolume)} кг
Упражнения и подходы (факт), включая комментарии пользователя, если есть:
${exLines}

Дай анализ на русском (без markdown, простым текстом, 3-5 предложений): 1) оценка проработки именно сегодняшних мышц; 2) по каким упражнениям пора повышать вес (если все повторы закрыты на верхней границе); 3) если пользователь оставил комментарии (например про боль, усталость, лёгкость выполнения) — обязательно учти их в оценке и дай совет с поправкой на это; 4) один совет на следующую такую же тренировку. Конкретно, без воды.`
      const reply = await aiCall([{ role: 'user', content: prompt }], 600)
      const clean = (reply || '').replace(/```/g, '').trim()
      setAiText(clean)
    } catch { setAiText('Не удалось получить анализ, попробуйте позже.') }
    finally { setAiLoading(false) }
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: '#0e0e0e', zIndex: 500, overflow: 'auto', padding: '24px 20px 40px' }}>
      <div style={{ textAlign: 'center', padding: '30px 0 20px' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#3d9970', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Check size={32} color="#000" />
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Тренировка завершена!</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
        {[{ l: 'Упр.', v: workout.exercises.length }, { l: 'Подходы', v: totalSets }, { l: 'Тоннаж', v: Math.round(totalVolume)+'кг' }].map(s => (
          <div key={s.l} style={{ background: '#1a1a1a', borderRadius: 14, padding: 12, border: '1px solid #2e2e2e', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 700, color: '#3d9970', marginBottom: 4 }}>{s.v}</div>
            <div style={{ fontSize: 10, color: '#6b7280' }}>{s.l}</div>
          </div>
        ))}
      </div>
      <div style={{ background: '#1a1a1a', borderRadius: 14, padding: '12px 16px', border: '1px solid #2e2e2e', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Длительность</div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>можно поправить вручную, если тренировка уже прошла</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <NumberStepper value={editMin} onChange={setEditMin} step={1} min={1} max={600} placeholder="30" />
          <span style={{ fontSize: 13, color: '#6b7280' }}>мин</span>
        </div>
      </div>

      <button onClick={runAnalysis} disabled={aiLoading} style={{ background: '#1a1a1a', border: '1px solid #3d9970', borderRadius: 14, padding: '13px', fontSize: 14, fontWeight: 700, width: '100%', cursor: 'pointer', color: '#3d9970', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5, opacity: aiLoading ? 0.6 : 1 }}>
        <Sparkles size={15} />{aiLoading ? 'Анализирую...' : 'AI-анализ тренировки'}
      </button>
      {aiText && (
        <div style={{ background: 'rgba(61,153,112,0.05)', border: '1px solid rgba(61,153,112,0.25)', borderRadius: 16, padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: '#d1d5db', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{aiText}</div>
        </div>
      )}

      <div style={{ background: '#1a1a1a', borderRadius: 20, padding: 20, marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Как прошла тренировка?</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          {[['😊', 'Легко'], ['😐', 'Норм'], ['😤', 'Тяжело'], ['🥵', 'Очень']].map(([emoji, label]) => (
            <button key={label} onClick={() => setFeeling(label)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px', borderRadius: 12, border: `1px solid ${feeling === label ? '#3d9970' : '#2e2e2e'}`, background: feeling === label ? 'rgba(61,153,112,0.1)' : '#222', cursor: 'pointer' }}>
              <span style={{ fontSize: 24 }}>{emoji}</span>
              <span style={{ fontSize: 10, color: feeling === label ? '#3d9970' : '#6b7280' }}>{label}</span>
            </button>
          ))}
        </div>
      </div>
      <button onClick={() => onSave({ feeling, comment, aiAnalysis: aiText || null, durationOverrideMin: Math.max(1, parseInt(editMin) || Math.round(duration/60)) })} style={{ background: '#3d9970', color: '#000', border: 'none', borderRadius: 14, padding: '16px', fontSize: 15, fontWeight: 700, width: '100%', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1 }}>Сохранить</button>
    </div>, document.body
  )
}
