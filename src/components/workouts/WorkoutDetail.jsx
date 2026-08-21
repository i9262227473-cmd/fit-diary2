import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronLeft, Sparkles } from 'lucide-react'

// ─── WORKOUT DETAIL (просмотр сохранённой тренировки) ────────────────────────
export default function WorkoutDetail({ workout, onClose, aiCall, onSaveAnalysis }) {
  const [aiLoading, setAiLoading] = useState(false)
  const [aiText, setAiText] = useState(workout.aiAnalysis || null)
  const [savedMark, setSavedMark] = useState(false)
  const details = workout.exercisesDetail || []
  const totalSets = details.reduce((a, e) => a + (e.sets?.length || 0), 0)
  const totalVolume = details.reduce((a, e) => a + (e.sets || []).reduce((s, st) => s + (parseFloat(st.weight)||0) * (parseInt(String(st.reps).split('-').pop())||0), 0), 0)
  const M_COLORS = { Грудь:'#e97532', Спина:'#3b82f6', Ноги:'#d89518', Плечи:'#8b5cf6', Трицепс:'#d94d8a', Бицепс:'#e8762c', Кор:'#1789a8', Кардио:'#d5544e' }

  const runAnalysis = async () => {
    if (aiLoading || !aiCall) return
    setAiLoading(true)
    try {
      const exLines = details.map(e => {
        const sets = (e.sets || []).map((s, i) => `подход ${i+1}: ${s.reps} пов × ${s.weight||0}кг`).join('; ')
        const commentPart = e.comment ? ` | комментарий пользователя: «${e.comment}»` : ''
        return `${e.name} (${e.muscle}): ${sets}${commentPart}`
      }).join('\n')
      const prompt = `Ты — поддерживающий и опытный тренер по силовым. Разбери эту ОДНУ завершённую тренировку доброжелательно и конструктивно.

ВАЖНО: это ОДНА тренировка из недельного сплит-плана (название: "${workout.name || 'Тренировка'}"). Остальные мышечные группы тренируются в ДРУГИЕ дни. НЕ ругай за отсутствие других групп и НЕ критикуй структуру плана — она задана заранее. Твоя задача — поддержать и подсказать прогрессию.

Длительность: ${workout.duration || 0} мин
Общий тоннаж: ${Math.round(totalVolume)} кг
Упражнения и подходы (факт):
${exLines}

Дай анализ на русском (без markdown, простым текстом, 3-4 предложения): 1) что сделано хорошо (отметь старание); 2) по каким упражнениям пора немного поднять вес (если повторы на верхней границе); 3) один мотивирующий совет на следующий раз. Тон — позитивный и поддерживающий, без критики.`
      const reply = await aiCall([{ role: 'user', content: prompt }], 600)
      const cleaned = (reply || '').replace(/```/g, '').trim()
      setAiText(cleaned)
      if (onSaveAnalysis) {
        onSaveAnalysis(workout, cleaned)
        setSavedMark(true)
        setTimeout(() => setSavedMark(false), 2000)
      }
    } catch { setAiText('Не удалось получить анализ, попробуйте позже.') }
    finally { setAiLoading(false) }
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, maxWidth: 560, margin: '0 auto', background: 'var(--bg)', color: 'var(--text)', zIndex: 500, overflow: 'auto', padding: '20px 16px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <button onClick={onClose} style={{ width: 38, height: 38, borderRadius: 12, color: 'var(--text-secondary)', background: 'var(--surface2)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={18} />
        </button>
        <div>
          <div style={{ fontSize: 20, fontWeight: 760, color: 'var(--text)' }}>{workout.name || 'Тренировка'}</div>
          <div style={{ marginTop: 2, fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>{workout.entryDate}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 8, marginBottom: 18 }}>
        {[{ l: 'Время', v: (workout.duration||0)+'м' }, { l: 'Упр.', v: details.length }, { l: 'Подходы', v: totalSets }, { l: 'Тоннаж', v: Math.round(totalVolume)+'кг' }].map(s => (
          <div key={s.l} style={{ background: 'var(--card-solid)', borderRadius: 15, padding: '12px 7px', border: '1px solid var(--border)', textAlign: 'center', boxShadow: 'var(--shadow-soft)' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 750, color: 'var(--accent)', marginBottom: 4 }}>{s.v}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.l}</div>
          </div>
        ))}
      </div>

      <button onClick={runAnalysis} disabled={aiLoading} style={{ background: 'var(--card-solid)', border: '1px solid var(--accent)', borderRadius: 15, padding: '13px', fontSize: 14, fontWeight: 750, width: '100%', cursor: 'pointer', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.4, opacity: aiLoading ? 0.6 : 1 }}>
        <Sparkles size={15} />{aiLoading ? 'Анализирую...' : savedMark ? '✓ Сохранено' : (aiText ? 'Обновить AI-анализ' : 'AI-анализ тренировки')}
      </button>
      {aiText && (
        <div style={{ background: 'var(--accent-dim)', border: '1px solid color-mix(in srgb, var(--accent) 24%, var(--border))', borderRadius: 16, padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{aiText}</div>
        </div>
      )}

      {details.length > 0 ? details.map((ex, eI) => (
        <div key={eI} style={{ background: 'var(--card-solid)', borderRadius: 18, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 12, boxShadow: 'var(--shadow-soft)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 15px' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 750, color: 'var(--accent)', minWidth: 24 }}>{eI+1}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', flex: 1 }}>{ex.name}</span>
            <span style={{ padding: '4px 10px', borderRadius: 50, fontSize: 11, color: '#fff', background: M_COLORS[ex.muscle] || 'var(--accent)', fontWeight: 700 }}>{ex.muscle}</span>
          </div>
          <div style={{ padding: '0 15px 11px' }}>
            {(ex.sets || []).map((set, sI) => (
              <div key={sI} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-muted)', minWidth: 44 }}>№{sI+1}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 650, color: 'var(--text)', flex: 1 }}>{set.reps} пов</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>{set.weight || 0} кг</span>
                {set.done && <Check size={14} color="var(--accent)" />}
              </div>
            ))}
            {ex.comment && (
              <div style={{ marginTop: 8, padding: '9px 10px', background: 'var(--surface2)', borderRadius: 10, fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                «{ex.comment}»
              </div>
            )}
          </div>
        </div>
      )) : (
        <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: 13 }}>
          Детали этой тренировки не сохранены (старая запись).
        </div>
      )}
    </div>, document.body
  )
}
