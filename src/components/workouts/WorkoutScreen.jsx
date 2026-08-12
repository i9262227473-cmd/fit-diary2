import React from 'react'
import { CalendarDays, Check, ChevronLeft, ChevronRight, Dumbbell, Edit2, Play, Plus, Sparkles } from 'lucide-react'
import { EFF_LABEL, EXERCISE_DB as FULL_EXERCISE_DB, findAlternatives } from '../../data/exerciseDatabase'
import { getExerciseMedia } from '../../data/exerciseMedia'
import useWorkout from '../../hooks/useWorkout'
import { formatLongTime as fmtTimeLong, getDefaultRestSeconds as getDefaultRestSec } from '../../utils/workoutUi'
import SwipeToDelete from '../common/SwipeToDelete'
import RestTimer from './RestTimer'
import SetPickerModal from './SetPickerModal'
import TechniqueModal from './TechniqueModal'
import WeightTransferModal from './WeightTransferModal'
import WorkoutCalendar from './WorkoutCalendar'
import WorkoutComplete from './WorkoutComplete'
import WorkoutDetail from './WorkoutDetail'
import styles from './WorkoutScreen.module.css'

export default function WorkoutScreen({ state, dispatch, aiCall, PlanScreen }) {
  const {
    view, setView, wk, setWk, exSearch, setExSearch, running, setRunning, timer, resetTimer,
    showRestTimer, setShowRestTimer, restInfo, showComplete, swapFor, setSwapFor,
    planDayIdx, setPlanDayIdx, planSaved, viewWorkout, setViewWorkout, techFor, setTechFor,
    histMode, setHistMode, templates, tplSaved, pickerFor, setPickerFor, pendingLoad, setPendingLoad,
    allWorkouts, workoutsByDate, workoutPlace, filteredEx, addEx, updateRest, updateSet, removeSet,
    moveExercise, updateComment, addSet, removeEx, replaceEx, applyProgression, saveToPlan,
    saveAsTemplate, deleteTemplate, startFromTemplate, toggleSet, completeWorkout, saveWorkout,
    removeWorkout, saveWorkoutAnalysis, startFromPlan, resolveWeightTransfer,
  } = useWorkout({ state, dispatch })

  const M_COLORS = { Грудь:'var(--accent)', Спина:'#3b82f6', Ноги:'#f59e0b', Плечи:'#8b5cf6', Трицепс:'#ec4899', Бицепс:'#f97316', Кор:'#06b6d4', Кардио:'#ef4444' }

  if (view === 'list') {
    return (
      <div className={styles.historyScreen}>
        {showRestTimer && <RestTimer duration={restInfo.duration} exerciseName={restInfo.exercise} setInfo={restInfo.setInfo} onClose={() => setShowRestTimer(false)} />}
        {viewWorkout && <WorkoutDetail workout={viewWorkout} onClose={() => setViewWorkout(null)} aiCall={aiCall} onSaveAnalysis={saveWorkoutAnalysis} />}
        <div className={styles.historyHeading}>
          <span>Тренировки</span>
          <h1>История</h1>
        </div>
        <div className={styles.historyActions}>
          <button onClick={() => setView('templates')}>
            <span><Dumbbell size={20} /></span>
            <strong>Мои тренировки</strong>
            <small>Шаблоны и программы</small>
          </button>
          <button onClick={() => setView('plan')}>
            <span><Sparkles size={20} /></span>
            <strong>AI-план</strong>
            <small>Персональная программа</small>
          </button>
          <button className={styles.newWorkout} onClick={() => { setPlanDayIdx(null); setWk({ name: '', exercises: [] }); setView('builder') }}>
            <span><Plus size={21} /></span>
            <strong>Новая</strong>
            <small>Создать тренировку</small>
          </button>
        </div>
        <div className={styles.historyToggle}>
          {[['list', 'Список'], ['calendar', 'Календарь']].map(([k, v]) => (
            <button key={k} className={histMode === k ? styles.toggleActive : ''} onClick={() => setHistMode(k)}>{k === 'calendar' && <CalendarDays size={15} />}{v}</button>
          ))}
        </div>
        {histMode === 'calendar' && <WorkoutCalendar workoutsByDate={workoutsByDate} onPickWorkout={setViewWorkout} onDeleteWorkout={removeWorkout} />}
        {histMode === 'list' && (allWorkouts.length === 0 ? (
          <div className={styles.emptyHistory}>
            <span><Dumbbell size={25} /></span>
            <strong>Тренировок пока нет</strong>
            <small>Создайте первую тренировку или выберите AI-план</small>
          </div>
        ) : <div className={styles.workoutHistory}>{allWorkouts.map(w => {
          const firstExercise = w.exercisesDetail?.[0]?.name || w.exercises?.[0]
          const media = getExerciseMedia(firstExercise)
          return (
            <SwipeToDelete key={w.id} onDelete={() => removeWorkout(w.id, w.entryDate)} confirmText="Удалить эту тренировку?">
              <button className={styles.historyCard} onClick={() => setViewWorkout(w)}>
                {media ? <img src={media.start} alt="" /> : <span className={styles.historyFallback}><Dumbbell size={24} /></span>}
                <span className={styles.historyCopy}>
                  <strong>{w.name || w.type || 'Тренировка'}</strong>
                  <small>{w.exercises?.length || w.exercisesDetail?.length || 0} упражнений · {w.duration || 0} мин</small>
                  <small>{w.entryDate}</small>
                </span>
                <ChevronRight size={18} />
              </button>
            </SwipeToDelete>
          )
        })}</div>)}
      </div>
    )
  }

  if (view === 'builder') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {showRestTimer && <RestTimer duration={restInfo.duration} exerciseName={restInfo.exercise} setInfo={restInfo.setInfo} onClose={() => setShowRestTimer(false)} />}
        {techFor && <TechniqueModal name={techFor.name} muscle={techFor.muscle} onClose={() => setTechFor(null)} />}
        {pickerFor && wk.exercises[pickerFor.eI] && (
          <SetPickerModal
            title={`${wk.exercises[pickerFor.eI].name} · подход ${pickerFor.sI+1}`}
            reps={wk.exercises[pickerFor.eI].sets[pickerFor.sI]?.reps}
            weight={wk.exercises[pickerFor.eI].sets[pickerFor.sI]?.weight}
            onClose={() => setPickerFor(null)}
            onSave={(r, w) => { updateSet(pickerFor.eI, pickerFor.sI, 'reps', r); updateSet(pickerFor.eI, pickerFor.sI, 'weight', w); setPickerFor(null) }}
          />
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setView('list')} style={{ width: 36, height: 36, borderRadius: 10, background: '#1a1a1a', border: '1px solid #2e2e2e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={18} color="#9ca3af" />
          </button>
          <span style={{ fontSize: 18, fontWeight: 700 }}>Конструктор</span>
        </div>
        <input style={{ width: '100%', padding: '13px 16px', background: '#1a1a1a', border: '1px solid #2e2e2e', borderRadius: 14, color: '#f5f5f5', fontSize: 15, fontWeight: 600, outline: 'none', boxSizing: 'border-box' }}
          placeholder="Название тренировки" value={wk.name} onChange={e => setWk(w => ({...w, name: e.target.value}))} />
        <div style={{ background: '#1a1a1a', borderRadius: 16, padding: 14, border: '1px solid #2e2e2e' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>База упражнений</div>
          <input style={{ width: '100%', padding: '11px 14px', background: '#222', border: '1px solid #2e2e2e', borderRadius: 10, color: '#f5f5f5', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 10 }} placeholder="Поиск..." value={exSearch} onChange={e => setExSearch(e.target.value)} />
          <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {filteredEx.map(ex => {
              const alreadyAdded = wk.exercises.some(e => e.exerciseId === ex.id)
              return (
              <button key={ex.id} onClick={() => addEx(ex)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: alreadyAdded ? 'var(--accent-dim)' : '#222', border: alreadyAdded ? '1px solid var(--accent)' : '1px solid #2a2a2a', borderRadius: 10, cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ padding: '2px 8px', borderRadius: 50, fontSize: 11, color: '#000', background: M_COLORS[ex.muscle] || 'var(--accent)', flexShrink: 0, fontWeight: 600 }}>{ex.muscle}</span>
                <span style={{ fontSize: 13, color: alreadyAdded ? '#6fcaa0' : '#f5f5f5', flex: 1, fontWeight: alreadyAdded ? 600 : 400 }}>{ex.name}</span>
                <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6, flexShrink: 0, fontWeight: 600, ...(ex.eff==='best' ? {background:'var(--accent-dim)', color:'#6fcaa0'} : ex.eff==='good' ? {background:'#2a2a2a', color:'#d1d5db'} : {background:'#262626', color:'#6b7280'}) }}>{EFF_LABEL[ex.eff]}</span>
                {alreadyAdded ? <Check size={16} color="var(--accent)" /> : <Plus size={16} color="var(--accent)" />}
              </button>
              )
            })}
          </div>
        </div>
        {wk.exercises.map((ex, eI) => (
          <div key={ex.uid || eI} style={{ background: '#1a1a1a', borderRadius: 16, padding: 16, border: '1px solid #2e2e2e' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                <button onClick={() => moveExercise(eI, -1)} disabled={eI === 0} style={{ width: 22, height: 18, borderRadius: 5, background: '#222', border: 'none', color: eI === 0 ? '#3a3a3a' : '#9ca3af', cursor: eI === 0 ? 'default' : 'pointer', fontSize: 11, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>▲</button>
                <button onClick={() => moveExercise(eI, 1)} disabled={eI === wk.exercises.length - 1} style={{ width: 22, height: 18, borderRadius: 5, background: '#222', border: 'none', color: eI === wk.exercises.length - 1 ? '#3a3a3a' : '#9ca3af', cursor: eI === wk.exercises.length - 1 ? 'default' : 'pointer', fontSize: 11, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>▼</button>
              </div>
              <span style={{ padding: '3px 10px', borderRadius: 50, fontSize: 11, color: '#000', background: M_COLORS[ex.muscle] || 'var(--accent)', fontWeight: 600 }}>{ex.muscle}</span>
              <button onClick={() => setTechFor({ name: ex.name, muscle: ex.muscle })} style={{ fontSize: 15, fontWeight: 600, flex: 1, background: 'transparent', border: 'none', color: '#f5f5f5', textAlign: 'left', cursor: 'pointer', padding: 0 }}>
                {ex.name}
              </button>
              <button onClick={() => setSwapFor(eI)} style={{ padding: '5px 10px', borderRadius: 8, background: '#222', border: '1px solid #2e2e2e', color: '#9ca3af', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Заменить</button>
              <button onClick={() => removeEx(eI)} style={{ width: 28, height: 28, borderRadius: 8, background: '#222', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: '#6b7280' }}>Отдых между подходами:</span>
              <button onClick={() => updateRest(eI, -15)} style={{ width: 26, height: 26, borderRadius: 7, background: '#222', border: '1px solid #2e2e2e', color: '#9ca3af', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>−</button>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700, color: 'var(--accent)', minWidth: 44, textAlign: 'center' }}>{fmtTimeLong(ex.restSec || getDefaultRestSec(ex.muscle))}</span>
              <button onClick={() => updateRest(eI, 15)} style={{ width: 26, height: 26, borderRadius: 7, background: '#222', border: '1px solid #2e2e2e', color: '#9ca3af', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>+</button>
            </div>
            {swapFor === eI && (
              <div style={{ background: '#161616', border: '1px solid #2e2e2e', borderRadius: 12, padding: 12, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af' }}>Заменить на:</span>
                  <button onClick={() => setSwapFor(null)} style={{ width: 24, height: 24, borderRadius: 6, background: '#222', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 14 }}>×</button>
                </div>
                {(() => {
                  const dbEx = FULL_EXERCISE_DB.find(e => e.id === ex.exerciseId) || FULL_EXERCISE_DB.find(e => e.name.toLowerCase() === (ex.name||'').toLowerCase())
                  const alts = dbEx ? findAlternatives(dbEx, workoutPlace) : []
                  if (alts.length === 0) return <div style={{ fontSize: 12, color: '#6b7280', padding: '6px 0' }}>Нет подходящих альтернатив для вашего места тренировок</div>
                  return <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {alts.map(alt => (
                      <button key={alt.id} onClick={() => { replaceEx(eI, alt); setSwapFor(null) }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', background: '#222', border: '1px solid #2a2a2a', borderRadius: 9, cursor: 'pointer', textAlign: 'left' }}>
                        <span style={{ fontSize: 13, color: '#f5f5f5', flex: 1 }}>{alt.name}</span>
                        <span style={{ fontSize: 10, color: '#6b7280' }}>{alt.equipment}</span>
                        <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6, fontWeight: 600, ...(alt.eff==='best' ? {background:'var(--accent-dim)', color:'#6fcaa0'} : alt.eff==='good' ? {background:'#2a2a2a', color:'#d1d5db'} : {background:'#262626', color:'#6b7280'}) }}>{EFF_LABEL[alt.eff]}</span>
                      </button>
                    ))}
                  </div>
                })()}
              </div>
            )}
            {ex.suggestedWeight && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--accent-dim)', border: '1px solid var(--accent-dim)', borderRadius: 10, padding: '10px 12px', marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: '#6fcaa0', flex: 1 }}>Вы закрыли все повторы — пора поднять вес до <b>{ex.suggestedWeight} кг</b></span>
                <button onClick={() => applyProgression(eI)} style={{ padding: '6px 12px', borderRadius: 8, background: 'var(--accent)', border: 'none', color: '#000', cursor: 'pointer', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>Поднять</button>
              </div>
            )}
            <div style={{ display: 'flex', gap: 6, marginBottom: 6, padding: '0 2px' }}>
              <div style={{ width: 28, fontSize: 11, color: '#6b7280', textAlign: 'center' }}>№</div>
              <div style={{ flex: 1, fontSize: 11, color: '#6b7280', textAlign: 'center' }}>Повторы</div>
              <div style={{ flex: 1, fontSize: 11, color: '#6b7280', textAlign: 'center' }}>Вес (кг)</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 6 }}>
              {ex.sets.map((set, sI) => (
                <SwipeToDelete key={set.id || sI} onDelete={() => removeSet(eI, sI)} disabled={ex.sets.length <= 1} radius={8}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', background: '#1a1a1a' }}>
                    <div style={{ width: 28, fontSize: 13, color: '#6b7280', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{sI+1}</div>
                    <button onClick={() => setPickerFor({ eI, sI })} style={{ flex: 1, padding: '9px 4px', background: '#222', border: '1px solid #2e2e2e', borderRadius: 8, color: '#f5f5f5', fontSize: 14, fontFamily: 'var(--mono)', fontWeight: 700, outline: 'none', textAlign: 'center', cursor: 'pointer' }}>{set.reps || '10'}</button>
                    <button onClick={() => setPickerFor({ eI, sI })} style={{ flex: 1, padding: '9px 4px', background: '#222', border: '1px solid #2e2e2e', borderRadius: 8, color: '#f5f5f5', fontSize: 14, fontFamily: 'var(--mono)', fontWeight: 700, outline: 'none', textAlign: 'center', cursor: 'pointer' }}>{set.weight || '0'}</button>
                  </div>
                </SwipeToDelete>
              ))}
            </div>
            <button onClick={() => addSet(eI)} style={{ padding: '8px', background: 'transparent', border: '1px dashed #2e2e2e', borderRadius: 8, color: '#6b7280', cursor: 'pointer', fontSize: 13, width: '100%', marginBottom: 10 }}>+ Добавить подход</button>
            <input
              type="text"
              value={ex.comment || ''}
              onChange={e => updateComment(eI, e.target.value)}
              placeholder="Комментарий к упражнению (необязательно)"
              style={{ width: '100%', padding: '9px 12px', background: '#161616', border: '1px solid #2a2a2a', borderRadius: 10, color: '#d1d5db', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        ))}
        {wk.exercises.length > 0 && (
          <button onClick={() => { resetTimer(); setRunning(true); setView('active') }} style={{ background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 14, padding: '15px', fontSize: 14, fontWeight: 700, width: '100%', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Начать тренировку
          </button>
        )}
        {wk.exercises.length > 0 && (
          <button onClick={saveAsTemplate} style={{ background: tplSaved ? 'var(--accent)' : 'transparent', color: tplSaved ? '#000' : 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 14, padding: '13px', fontSize: 13, fontWeight: 700, width: '100%', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {tplSaved ? '✓ Сохранено в мои тренировки' : 'Сохранить как шаблон'}
          </button>
        )}
        {wk.exercises.length > 0 && planDayIdx !== null && (
          <button onClick={saveToPlan} style={{ background: planSaved ? 'var(--accent)' : 'transparent', color: planSaved ? '#000' : 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 14, padding: '13px', fontSize: 13, fontWeight: 700, width: '100%', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {planSaved ? '✓ Сохранено в план' : 'Сохранить в план'}
          </button>
        )}
      </div>
    )
  }

  if (view === 'active') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 90 }}>
        {showRestTimer && <RestTimer duration={restInfo.duration} exerciseName={restInfo.exercise} setInfo={restInfo.setInfo} onClose={() => setShowRestTimer(false)} />}
        {techFor && <TechniqueModal name={techFor.name} muscle={techFor.muscle} onClose={() => setTechFor(null)} />}
        {pickerFor && wk.exercises[pickerFor.eI] && (
          <SetPickerModal
            title={`${wk.exercises[pickerFor.eI].name} · подход ${pickerFor.sI+1}`}
            reps={wk.exercises[pickerFor.eI].sets[pickerFor.sI]?.reps}
            weight={wk.exercises[pickerFor.eI].sets[pickerFor.sI]?.weight}
            onClose={() => setPickerFor(null)}
            onSave={(r, w) => { updateSet(pickerFor.eI, pickerFor.sI, 'reps', r); updateSet(pickerFor.eI, pickerFor.sI, 'weight', w); setPickerFor(null) }}
          />
        )}
        {showComplete && <WorkoutComplete workout={wk} duration={timer} onSave={saveWorkout} aiCall={aiCall} />}
        <div style={{ background: '#1a1a1a', borderRadius: 20, padding: '20px 24px', border: '1px solid #2e2e2e', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 40, fontWeight: 700, color: 'var(--accent)' }}>{fmtTimeLong(timer)}</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>Общее время</div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, textAlign: 'right' }}>{wk.name || 'Тренировка'}</div>
        </div>
        {wk.exercises.map((ex, eI) => (
          <div key={ex.uid || eI} style={{ background: '#1a1a1a', borderRadius: 18, overflow: 'hidden', border: '1px solid #2e2e2e' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                <button onClick={() => moveExercise(eI, -1)} disabled={eI === 0} style={{ width: 20, height: 16, borderRadius: 5, background: '#222', border: 'none', color: eI === 0 ? '#3a3a3a' : '#9ca3af', cursor: eI === 0 ? 'default' : 'pointer', fontSize: 10, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>▲</button>
                <button onClick={() => moveExercise(eI, 1)} disabled={eI === wk.exercises.length - 1} style={{ width: 20, height: 16, borderRadius: 5, background: '#222', border: 'none', color: eI === wk.exercises.length - 1 ? '#3a3a3a' : '#9ca3af', cursor: eI === wk.exercises.length - 1 ? 'default' : 'pointer', fontSize: 10, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>▼</button>
              </div>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, color: 'var(--accent)', minWidth: 28 }}>{eI+1}</span>
              <div style={{ flex: 1 }}>
                <button onClick={() => setTechFor({ name: ex.name, muscle: ex.muscle })} style={{ fontSize: 15, fontWeight: 600, background: 'transparent', border: 'none', color: '#f5f5f5', textAlign: 'left', cursor: 'pointer', padding: 0 }}>{ex.name}</button>
              </div>
              <button onClick={() => setSwapFor(swapFor === eI ? null : eI)} style={{ padding: '5px 9px', borderRadius: 8, background: '#222', border: '1px solid #2e2e2e', color: '#9ca3af', cursor: 'pointer', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>Заменить</button>
              <span style={{ padding: '3px 10px', borderRadius: 50, fontSize: 11, color: '#000', background: M_COLORS[ex.muscle] || 'var(--accent)', fontWeight: 600 }}>{ex.muscle}</span>
            </div>
            {swapFor === eI && (
              <div style={{ margin: '0 16px 14px', background: '#161616', border: '1px solid #2e2e2e', borderRadius: 12, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af' }}>Заменить на:</span>
                  <button onClick={() => setSwapFor(null)} style={{ width: 24, height: 24, borderRadius: 6, background: '#222', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 14 }}>×</button>
                </div>
                {(() => {
                  const dbEx = FULL_EXERCISE_DB.find(e => e.id === ex.exerciseId) || FULL_EXERCISE_DB.find(e => e.name.toLowerCase() === (ex.name||'').toLowerCase())
                  const alts = dbEx ? findAlternatives(dbEx, workoutPlace) : []
                  if (alts.length === 0) return <div style={{ fontSize: 12, color: '#6b7280', padding: '6px 0' }}>Нет подходящих альтернатив для вашего места тренировок</div>
                  return <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {alts.map(alt => (
                      <button key={alt.id} onClick={() => { replaceEx(eI, alt); setSwapFor(null) }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', background: '#222', border: '1px solid #2a2a2a', borderRadius: 9, cursor: 'pointer', textAlign: 'left' }}>
                        <span style={{ fontSize: 13, color: '#f5f5f5', flex: 1 }}>{alt.name}</span>
                        <span style={{ fontSize: 10, color: '#6b7280' }}>{alt.equipment}</span>
                        <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6, fontWeight: 600, ...(alt.eff==='best' ? {background:'var(--accent-dim)', color:'#6fcaa0'} : alt.eff==='good' ? {background:'#2a2a2a', color:'#d1d5db'} : {background:'#262626', color:'#6b7280'}) }}>{EFF_LABEL[alt.eff]}</span>
                      </button>
                    ))}
                  </div>
                })()}
              </div>
            )}
            <div style={{ padding: '8px 0' }}>
              <div style={{ display: 'flex', gap: 8, padding: '4px 16px 8px', alignItems: 'center' }}>
                <span style={{ width: 44, fontSize: 10, color: '#6b7280', textTransform: 'uppercase' }}>Подход</span>
                <span style={{ flex: 1, fontSize: 10, color: '#6b7280', textAlign: 'center' }}>Повторы (факт)</span>
                <span style={{ flex: 1, fontSize: 10, color: '#6b7280', textAlign: 'center' }}>Вес, кг</span>
                <span style={{ width: 40 }}></span>
              </div>
              <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {ex.sets.map((set, sI) => (
                  <SwipeToDelete key={set.id || sI} onDelete={() => removeSet(eI, sI)} disabled={ex.sets.length <= 1} radius={8}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 0', background: set.done ? 'var(--accent-dim)' : '#1a1a1a' }}>
                      <span style={{ width: 44, fontFamily: 'var(--mono)', fontSize: 13, color: '#6b7280' }}>№{sI+1}</span>
                      <button onClick={() => setPickerFor({ eI, sI })} style={{ flex: 1, padding: '9px 4px', background: '#222', border: '1px solid #2e2e2e', borderRadius: 8, color: '#f5f5f5', fontSize: 15, fontWeight: 700, fontFamily: 'var(--mono)', outline: 'none', textAlign: 'center', boxSizing: 'border-box', cursor: 'pointer' }}>{set.reps || ex.targetReps || '—'}</button>
                      <button onClick={() => setPickerFor({ eI, sI })} style={{ flex: 1, padding: '9px 4px', background: '#222', border: '1px solid #2e2e2e', borderRadius: 8, color: '#f5f5f5', fontSize: 15, fontWeight: 700, fontFamily: 'var(--mono)', outline: 'none', textAlign: 'center', boxSizing: 'border-box', cursor: 'pointer' }}>{set.weight || '0'}</button>
                      <button onClick={() => toggleSet(eI, sI)} style={{ width: 32, height: 32, borderRadius: '50%', border: `2px solid ${set.done ? 'var(--accent)' : '#2e2e2e'}`, background: set.done ? 'var(--accent)' : 'transparent', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {set.done && <Check size={16} color="#000" />}
                      </button>
                    </div>
                  </SwipeToDelete>
                ))}
              </div>
              <button onClick={() => addSet(eI)} style={{ margin: '4px 16px 8px', padding: '9px', background: 'transparent', border: '1px dashed #2e2e2e', borderRadius: 8, color: '#6b7280', cursor: 'pointer', fontSize: 13, width: 'calc(100% - 32px)' }}>+ Добавить подход</button>
              <div style={{ margin: '0 16px 12px' }}>
                <input
                  type="text"
                  value={ex.comment || ''}
                  onChange={e => updateComment(eI, e.target.value)}
                  placeholder="Комментарий к упражнению (необязательно)"
                  style={{ width: '100%', padding: '9px 12px', background: '#161616', border: '1px solid #2a2a2a', borderRadius: 10, color: '#d1d5db', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>
        ))}
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '12px 16px calc(12px + env(safe-area-inset-bottom, 0px))', background: '#111', borderTop: '1px solid #1e1e1e', display: 'flex', gap: 10, zIndex: 400 }}>
          <button onClick={() => setRunning(r => !r)} style={{ flex: 1, padding: '14px', background: '#222', border: '1px solid #2e2e2e', borderRadius: 12, color: '#f5f5f5', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
            {running ? 'Пауза' : 'Старт'}
          </button>
          <button onClick={completeWorkout} style={{ flex: 2, padding: '14px', background: 'var(--accent)', border: 'none', borderRadius: 12, color: '#000', cursor: 'pointer', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Завершить</button>
        </div>
      </div>
    )
  }

  if (view === 'templates') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {pendingLoad && <WeightTransferModal onConfirm={() => resolveWeightTransfer(true)} onDecline={() => resolveWeightTransfer(false)} onClose={() => setPendingLoad(null)} />}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setView('list')} style={{ width: 36, height: 36, borderRadius: 10, background: '#1a1a1a', border: '1px solid #2e2e2e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={18} color="#9ca3af" />
          </button>
          <span style={{ fontSize: 18, fontWeight: 700 }}>Мои тренировки</span>
        </div>

        <button onClick={() => { setPlanDayIdx(null); setWk({ name: '', exercises: [] }); setView('builder') }} style={{ background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 14, padding: '14px', fontSize: 14, fontWeight: 700, width: '100%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          <Plus size={18} /> Собрать новую
        </button>

        {templates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: '#6b7280' }}>
            <Dumbbell size={40} color="#2e2e2e" style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: '#9ca3af' }}>Пока нет сохранённых тренировок</div>
            <div style={{ fontSize: 13, lineHeight: 1.5 }}>Собери тренировку в конструкторе и нажми «Сохранить как шаблон» — она появится здесь для быстрого запуска</div>
          </div>
        ) : templates.map(tpl => {
          const muscles = [...new Set((tpl.exercises || []).map(e => e.muscle).filter(Boolean))]
          return (
            <div key={tpl.id} style={{ background: '#1a1a1a', borderRadius: 18, overflow: 'hidden', border: '1px solid #2e2e2e' }}>
              <SwipeToDelete onDelete={() => deleteTemplate(tpl.id)} confirmText="Удалить эту тренировку?" radius={0}>
                <div style={{ padding: '14px 16px', background: '#1a1a1a' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{tpl.name}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', fontFamily: 'var(--mono)' }}>{(tpl.exercises || []).length} упр.{muscles.length ? ' · ' + muscles.join(', ') : ''}</div>
                </div>
              </SwipeToDelete>
              <div style={{ padding: '12px 16px', borderTop: '1px solid #2a2a2a', background: '#161616', display: 'flex', gap: 8 }}>
                <button onClick={() => startFromTemplate(tpl, 'builder')} style={{ flex: 1, background: 'transparent', color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 12, padding: '12px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  <Edit2 size={14} /> Изменить
                </button>
                <button onClick={() => startFromTemplate(tpl, 'active')} style={{ flex: 1.4, background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 12, padding: '12px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  <Play size={14} /> Начать
                </button>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (view === 'plan') {
    return (
      <>
        {pendingLoad && <WeightTransferModal onConfirm={() => resolveWeightTransfer(true)} onDecline={() => resolveWeightTransfer(false)} onClose={() => setPendingLoad(null)} />}
        <PlanScreen onBack={() => setView('list')} aiCall={aiCall} profile={state.profile} onStartWorkout={startFromPlan} />
      </>
    )
  }

  return (
    <div style={{ padding: 20, textAlign: 'center' }}>
      <button onClick={() => setView('list')} style={{ background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 12, padding: '12px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
        ← К списку тренировок
      </button>
    </div>
  )
}
