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
  const M_COLORS = { Грудь:'#329063', Спина:'#3b82f6', Ноги:'#f59e0b', Плечи:'#8b5cf6', Трицепс:'#ec4899', Бицепс:'#f97316', Кор:'#06b6d4', Кардио:'#ef4444' }

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
      // Сохраняем анализ в саму запись тренировки, чтобы не генерировать заново при следующем открытии
      if (onSaveAnalysis) {
        onSaveAnalysis(workout, cleaned)
        setSavedMark(true)
        setTimeout(() => setSavedMark(false), 2000)
      }
    } catch { setAiText('Не удалось получить анализ, попробуйте позже.') }
    finally { setAiLoading(false) }
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: '#0e0e0e', zIndex: 500, overflow: 'auto', padding: '20px 16px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, background: '#1a1a1a', border: '1px solid #2e2e2e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={18} color="#9ca3af" />
        </button>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{workout.name || 'Тренировка'}</div>
          <div style={{ fontSize: 12, color: '#6b7280', fontFamily: 'var(--mono)' }}>{workout.entryDate}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 18 }}>
        {[{ l: 'Время', v: (workout.duration||0)+'м' }, { l: 'Упр.', v: details.length }, { l: 'Подходы', v: totalSets }, { l: 'Тоннаж', v: Math.round(totalVolume)+'кг' }].map(s => (
          <div key={s.l} style={{ background: '#1a1a1a', borderRadius: 14, padding: 12, border: '1px solid #2e2e2e', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 700, color: '#3d9970', marginBottom: 4 }}>{s.v}</div>
            <div style={{ fontSize: 10, color: '#6b7280' }}>{s.l}</div>
          </div>
        ))}
      </div>

      <button onClick={runAnalysis} disabled={aiLoading} style={{ background: '#1a1a1a', border: '1px solid #3d9970', borderRadius: 14, padding: '13px', fontSize: 14, fontWeight: 700, width: '100%', cursor: 'pointer', color: '#3d9970', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5, opacity: aiLoading ? 0.6 : 1 }}>
        <Sparkles size={15} />{aiLoading ? 'Анализирую...' : savedMark ? '✓ Сохранено' : (aiText ? 'Обновить AI-анализ' : 'AI-анализ тренировки')}
      </button>
      {aiText && (
        <div style={{ background: 'rgba(61,153,112,0.05)', border: '1px solid rgba(61,153,112,0.25)', borderRadius: 16, padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: '#d1d5db', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{aiText}</div>
        </div>
      )}

      {details.length > 0 ? details.map((ex, eI) => (
        <div key={eI} style={{ background: '#1a1a1a', borderRadius: 16, overflow: 'hidden', border: '1px solid #2e2e2e', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 700, color: '#3d9970', minWidth: 24 }}>{eI+1}</span>
            <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{ex.name}</span>
            <span style={{ padding: '3px 10px', borderRadius: 50, fontSize: 11, color: '#000', background: M_COLORS[ex.muscle] || '#3d9970', fontWeight: 600 }}>{ex.muscle}</span>
          </div>
          <div style={{ padding: '0 16px 10px' }}>
            {(ex.sets || []).map((set, sI) => (
              <div key={sI} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0', borderTop: '1px solid #222' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: '#6b7280', minWidth: 44 }}>№{sI+1}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600, flex: 1 }}>{set.reps} пов</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600, color: '#3d9970' }}>{set.weight || 0} кг</span>
                {set.done && <Check size={14} color="#3d9970" />}
              </div>
            ))}
            {ex.comment && (
              <div style={{ marginTop: 8, padding: '8px 10px', background: '#161616', borderRadius: 8, fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>
                «{ex.comment}»
              </div>
            )}
          </div>
        </div>
      )) : (
        <div style={{ textAlign: 'center', padding: '30px 0', color: '#6b7280', fontSize: 13 }}>
          Детали этой тренировки не сохранены (старая запись).
        </div>
      )}
    </div>, document.body
  )
}
