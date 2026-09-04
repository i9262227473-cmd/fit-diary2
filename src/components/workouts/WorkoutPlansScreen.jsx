import React, { useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronUp, Dumbbell, Edit2, FileText, Plus, Play } from 'lucide-react'
import SwipeToDelete from '../common/SwipeToDelete'
import { parseTextToDays } from '../../hooks/useWorkout'

// ─── МОИ ПЛАНЫ (многодневные планы: вставка текста + свои тренировки) ────────
export default function WorkoutPlansScreen({ plans, templates, aiCall, onBack, onSavePlan, onDeletePlan, onStartDay }) {
  const [mode, setMode] = useState('list') // 'list' | 'builder'
  const [expandedId, setExpandedId] = useState(null)

  const [planName, setPlanName] = useState('')
  const [days, setDays] = useState([])
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  // id плана, который сейчас редактируется через «Изменить» — null при создании нового
  const [editingPlanId, setEditingPlanId] = useState(null)

  const startBuilder = (planToEdit = null) => {
    if (planToEdit) {
      setPlanName(planToEdit.name || '')
      setDays((planToEdit.days || []).map(day => ({
        name: day.name,
        exercises: (day.exercises || []).map(ex => ({ ...ex, sets: (ex.sets || []).map(s => ({ ...s })) })),
      })))
      setEditingPlanId(planToEdit.id)
    } else {
      setPlanName(''); setDays([]); setEditingPlanId(null)
    }
    setPasteText(''); setParseError('')
    setPasteOpen(false); setPickerOpen(false)
    setMode('builder')
  }
  const cancelBuilder = () => { setEditingPlanId(null); setMode('list') }

  const handleParse = async () => {
    if (!pasteText.trim() || parsing) return
    setParsing(true); setParseError('')
    try {
      const parsedDays = await parseTextToDays(pasteText, aiCall)
      setDays(d => [...d, ...parsedDays])
      setPasteText(''); setPasteOpen(false)
    } catch {
      setParseError('Не получилось распознать текст как план тренировок. Проверьте текст и попробуйте ещё раз.')
    } finally {
      setParsing(false)
    }
  }

  const addFromTemplate = (tpl) => {
    setDays(d => [...d, { name: tpl.name, exercises: (tpl.exercises || []).map(e => ({ ...e, sets: (e.sets || []).map(s => ({ ...s })) })) }])
    setPickerOpen(false)
  }

  const removeDay = (dayIdx) => setDays(d => d.filter((_, i) => i !== dayIdx))
  const moveDay = (dayIdx, dir) => setDays(d => {
    const target = dayIdx + dir
    if (target < 0 || target >= d.length) return d
    const next = [...d]
    ;[next[dayIdx], next[target]] = [next[target], next[dayIdx]]
    return next
  })
  const renameDay = (dayIdx, name) => setDays(d => d.map((day, i) => i === dayIdx ? { ...day, name } : day))
  const removeExercise = (dayIdx, exIdx) => setDays(d => d.map((day, i) => i === dayIdx ? { ...day, exercises: day.exercises.filter((_, j) => j !== exIdx) } : day))
  const updateExercise = (dayIdx, exIdx, field, value) => setDays(d => d.map((day, i) => {
    if (i !== dayIdx) return day
    return {
      ...day,
      exercises: day.exercises.map((ex, j) => {
        if (j !== exIdx) return ex
        if (field === 'sets') {
          const count = Math.max(1, parseInt(value) || 1)
          return { ...ex, sets: Array.from({ length: count }, (_, k) => ex.sets[k] || { reps: ex.targetReps || '8-12', weight: '0' }) }
        }
        if (field === 'targetReps') return { ...ex, targetReps: value, sets: ex.sets.map(s => ({ ...s, reps: value })) }
        if (field === 'name') return { ...ex, name: value }
        return ex
      }),
    }
  }))

  const canSave = planName.trim().length > 0 && days.some(d => d.exercises.length > 0)
  const save = () => {
    if (!canSave) return
    onSavePlan({ id: editingPlanId || undefined, name: planName.trim(), days: days.filter(d => d.exercises.length) })
    setEditingPlanId(null)
    setMode('list')
  }

  if (mode === 'list') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: 10, background: '#1a1a1a', border: '1px solid #2e2e2e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={18} color="#9ca3af" />
          </button>
          <span style={{ fontSize: 18, fontWeight: 700 }}>Мои планы</span>
        </div>

        <button onClick={() => startBuilder()} style={{ background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 14, padding: '14px', fontSize: 14, fontWeight: 700, width: '100%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          <Plus size={18} /> Новый план
        </button>

        {plans.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: '#6b7280' }}>
            <FileText size={40} color="#2e2e2e" style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: '#9ca3af' }}>Пока нет своих планов</div>
            <div style={{ fontSize: 13, lineHeight: 1.5 }}>Вставьте текст плана или соберите его из своих тренировок — он появится здесь</div>
          </div>
        ) : plans.map(plan => {
          const isOpen = expandedId === plan.id
          const dayList = plan.days || []
          return (
            <div key={plan.id} style={{ background: '#1a1a1a', borderRadius: 18, overflow: 'hidden', border: '1px solid #2e2e2e' }}>
              <SwipeToDelete onDelete={() => onDeletePlan(plan.id)} confirmText="Удалить этот план?" radius={0}>
                <div style={{ display: 'flex', alignItems: 'center', background: '#1a1a1a' }}>
                  <button onClick={() => setExpandedId(isOpen ? null : plan.id)} style={{ flex: 1, minWidth: 0, textAlign: 'left', padding: '14px 16px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: '#f5f5f5' }}>{plan.name}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', fontFamily: 'var(--mono)' }}>{dayList.length} {dayList.length === 1 ? 'день' : 'дней'}</div>
                  </button>
                  <button onClick={() => startBuilder(plan)} aria-label="Изменить план" style={{ width: 36, height: 36, borderRadius: 10, background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 10, flexShrink: 0 }}>
                    <Edit2 size={16} />
                  </button>
                </div>
              </SwipeToDelete>
              {isOpen && (
                <div style={{ borderTop: '1px solid #2a2a2a' }}>
                  {dayList.map((day, dayIdx) => (
                    <div key={dayIdx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: dayIdx < dayList.length - 1 ? '1px solid #222' : 'none' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2, color: '#f5f5f5' }}>{day.name}</div>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>{(day.exercises || []).length} упр.</div>
                      </div>
                      <button onClick={() => onStartDay(plan, dayIdx, 'active')} style={{ background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase', flexShrink: 0 }}>
                        <Play size={12} /> Начать
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={cancelBuilder} style={{ width: 36, height: 36, borderRadius: 10, background: '#1a1a1a', border: '1px solid #2e2e2e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={18} color="#9ca3af" />
        </button>
        <span style={{ fontSize: 18, fontWeight: 700 }}>{editingPlanId ? 'Изменение плана' : 'Новый план'}</span>
      </div>

      <input
        value={planName}
        onChange={e => setPlanName(e.target.value)}
        placeholder="Название плана"
        style={{ background: '#1a1a1a', border: '1px solid #2e2e2e', borderRadius: 12, padding: '13px 14px', fontSize: 14, color: '#f5f5f5' }}
      />

      {days.map((day, dayIdx) => (
        <div key={dayIdx} style={{ background: '#1a1a1a', borderRadius: 16, border: '1px solid #2e2e2e', padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <input
              value={day.name}
              onChange={e => renameDay(dayIdx, e.target.value)}
              placeholder="Название дня"
              style={{ flex: 1, minWidth: 0, background: '#161616', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 10px', fontSize: 13, fontWeight: 600, color: '#f5f5f5' }}
            />
            <button onClick={() => moveDay(dayIdx, -1)} disabled={dayIdx === 0} style={{ width: 26, height: 26, borderRadius: 7, background: '#222', border: '1px solid #2e2e2e', color: '#9ca3af', cursor: 'pointer', opacity: dayIdx === 0 ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ChevronUp size={14} />
            </button>
            <button onClick={() => moveDay(dayIdx, 1)} disabled={dayIdx === days.length - 1} style={{ width: 26, height: 26, borderRadius: 7, background: '#222', border: '1px solid #2e2e2e', color: '#9ca3af', cursor: 'pointer', opacity: dayIdx === days.length - 1 ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ChevronDown size={14} />
            </button>
            <button onClick={() => removeDay(dayIdx)} style={{ width: 26, height: 26, borderRadius: 7, background: '#222', border: '1px solid #2e2e2e', color: '#ef4444', cursor: 'pointer', flexShrink: 0 }}>×</button>
          </div>
          {(day.exercises || []).map((ex, exIdx) => (
            <div key={exIdx} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0', borderTop: exIdx > 0 ? '1px solid #222' : 'none' }}>
              <input
                value={ex.name}
                onChange={e => updateExercise(dayIdx, exIdx, 'name', e.target.value)}
                style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', color: '#f5f5f5', fontSize: 13 }}
              />
              <input
                value={ex.sets?.length || 1}
                onChange={e => updateExercise(dayIdx, exIdx, 'sets', e.target.value)}
                type="number" min="1"
                style={{ width: 34, background: '#161616', border: '1px solid #2a2a2a', borderRadius: 6, padding: '4px', fontSize: 12, color: '#f5f5f5', textAlign: 'center', flexShrink: 0 }}
              />
              <span style={{ fontSize: 11, color: '#6b7280', flexShrink: 0 }}>×</span>
              <input
                value={ex.targetReps || ''}
                onChange={e => updateExercise(dayIdx, exIdx, 'targetReps', e.target.value)}
                style={{ width: 46, background: '#161616', border: '1px solid #2a2a2a', borderRadius: 6, padding: '4px', fontSize: 12, color: '#f5f5f5', textAlign: 'center', flexShrink: 0 }}
              />
              <button onClick={() => removeExercise(dayIdx, exIdx)} style={{ width: 22, height: 22, borderRadius: 6, background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer', flexShrink: 0 }}>×</button>
            </div>
          ))}
          {!day.exercises?.length && <div style={{ fontSize: 12, color: '#6b7280', padding: '6px 0' }}>Нет упражнений</div>}
        </div>
      ))}

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => { setPasteOpen(o => !o); setPickerOpen(false) }} style={{ flex: 1, background: pasteOpen ? 'var(--accent)' : 'transparent', color: pasteOpen ? '#000' : 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 12, padding: '12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textTransform: 'uppercase' }}>
          <FileText size={14} /> Вставить текст
        </button>
        <button onClick={() => { setPickerOpen(o => !o); setPasteOpen(false) }} style={{ flex: 1, background: pickerOpen ? 'var(--accent)' : 'transparent', color: pickerOpen ? '#000' : 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 12, padding: '12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textTransform: 'uppercase' }}>
          <Dumbbell size={14} /> Из моих тренировок
        </button>
      </div>

      {pasteOpen && (
        <div style={{ background: '#161616', border: '1px solid #2a2a2a', borderRadius: 12, padding: 12 }}>
          <textarea
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            placeholder="Вставьте текст плана тренировки..."
            rows={6}
            style={{ width: '100%', background: '#1a1a1a', border: '1px solid #2e2e2e', borderRadius: 8, padding: 10, fontSize: 13, color: '#f5f5f5', resize: 'vertical', marginBottom: 10, fontFamily: 'inherit' }}
          />
          {parseError && <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 8 }}>{parseError}</div>}
          <button onClick={handleParse} disabled={parsing || !pasteText.trim()} style={{ width: '100%', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 10, padding: '11px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: parsing || !pasteText.trim() ? 0.6 : 1 }}>
            {parsing ? 'Распознаю...' : 'Распознать'}
          </button>
        </div>
      )}

      {pickerOpen && (
        <div style={{ background: '#161616', border: '1px solid #2a2a2a', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {templates.length === 0 ? (
            <div style={{ fontSize: 12, color: '#6b7280', textAlign: 'center', padding: '8px 0' }}>Нет сохранённых тренировок</div>
          ) : templates.map(tpl => (
            <button key={tpl.id} onClick={() => addFromTemplate(tpl)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '10px 12px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 9, cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ fontSize: 13, color: '#f5f5f5' }}>{tpl.name}</span>
              <span style={{ fontSize: 11, color: '#6b7280', flexShrink: 0 }}>{(tpl.exercises || []).length} упр.</span>
            </button>
          ))}
        </div>
      )}

      <button onClick={save} disabled={!canSave} style={{ background: canSave ? 'var(--accent)' : '#2a2a2a', color: canSave ? '#000' : '#6b7280', border: 'none', borderRadius: 14, padding: '15px', fontSize: 14, fontWeight: 700, width: '100%', cursor: canSave ? 'pointer' : 'default', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {editingPlanId ? 'Сохранить изменения' : 'Сохранить план'}
      </button>
    </div>
  )
}
