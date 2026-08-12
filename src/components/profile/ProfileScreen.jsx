import React, { useState } from 'react'
import { AlertTriangle, Bell, LogOut, Sparkles } from 'lucide-react'
import { clearCachedFoods, getCachedFoods } from '../../data/userFoodCache'
import { getReminderSettings, saveReminderSettings } from '../../hooks/useReminders'

const LEVEL_LABELS = { beginner:'Новичок', amateur:'Любитель', advanced:'Продвинутый', professional:'Профессионал' }
const GOAL_LABELS  = { weight_loss:'Похудение', muscle_gain:'Набор массы', maintenance:'Поддержание', endurance:'Выносливость', strength:'Сила', health:'Здоровье' }
const ACTIVITY_LABELS = { sedentary:'Сидячий', light:'Лёгкая', moderate:'Умеренная', active:'Высокая', very_active:'Очень высокая' }

export default function ProfileScreen({ profile, saveProfile, signOut, aiCall }) {
  const [section, setSection] = useState('plan')
  const [form, setForm] = useState({
    age:profile?.age||'', weight:profile?.weight||'', height:profile?.height||'',
    gender:profile?.gender||'male', activity:profile?.activity||'moderate',
    level:profile?.level||'amateur', goals:profile?.goals||[],
    calorieGoal:profile?.calorieGoal||'', proteinGoal:profile?.proteinGoal||'',
    fatGoal:profile?.fatGoal||'', carbGoal:profile?.carbGoal||'',
    limitationsText: profile?.limitationsText || '',
    aiAnalysis: profile?.aiAnalysis || '',
    workoutPlace: (() => { try { return localStorage.getItem('workout-place-v1') || 'gym' } catch { return 'gym' } })(),
  })
  const [saved, setSaved] = useState(false)
  const [cacheCount, setCacheCount] = useState(() => getCachedFoods().length)
  const [cacheCleared, setCacheCleared] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState(null)
  const [reminders, setReminders] = useState(() => getReminderSettings())
  const notifPermission = typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'

  const updateReminders = (patch) => {
    setReminders(r => {
      const next = { ...r, ...patch }
      saveReminderSettings(next)
      return next
    })
  }
  const updateMealTime = (key, time) => {
    setReminders(r => {
      const next = { ...r, meals: { ...r.meals, [key]: time } }
      saveReminderSettings(next)
      return next
    })
  }
  const enableReminders = async () => {
    if (notifPermission === 'unsupported') return
    if (notifPermission !== 'granted') {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') return
    }
    updateReminders({ enabled: true })
  }

  const toggleGoal = g => setForm(f => ({ ...f, goals: f.goals.includes(g) ? f.goals.filter(x => x!==g) : [...f.goals, g] }))

  const handleClearCache = () => {
    if (confirm('Удалить все сохранённые AI-продукты? Это нельзя отменить.')) {
      clearCachedFoods()
      setCacheCount(0)
      setCacheCleared(true)
      setTimeout(() => setCacheCleared(false), 2000)
    }
  }

  const runAIAnalysis = async () => {
    if (!form.limitationsText.trim()) {
      setAnalyzeError('Сначала опишите ограничения')
      return
    }
    setAnalyzing(true)
    setAnalyzeError(null)
    try {
      const prompt = `Ты — спортивный врач и реабилитолог. Пользователь описал свои ограничения здоровья:

"${form.limitationsText}"

Дай краткий анализ (3-5 предложений) на русском:
1. Какие виды нагрузок ОПАСНЫ при этом состоянии (что исключить)
2. Какие упражнения БЕЗОПАСНЫ и рекомендуются
3. Общие рекомендации по тренировкам

Ответь простым текстом без markdown, без заголовков, в одном абзаце. Конкретно и по делу.`

      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 30000))
      const reply = await Promise.race([
        aiCall([{ role: 'user', content: prompt }], 800),
        timeoutPromise
      ])

      const cleaned = reply.replace(/```/g, '').trim()
      setForm(f => ({ ...f, aiAnalysis: cleaned }))
    } catch (e) {
      setAnalyzeError(e.message === 'TIMEOUT' ? 'AI долго отвечает, попробуй ещё раз' : 'Ошибка анализа, попробуй ещё раз')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleSave = async () => {
    const w = +form.weight, h = +form.height, a = +form.age
    let calorieGoal = +form.calorieGoal
    if (!calorieGoal && w && h && a) {
      const bmr = form.gender==='male' ? 10*w+6.25*h-5*a+5 : 10*w+6.25*h-5*a-161
      const factors = { sedentary:1.2, light:1.375, moderate:1.55, active:1.725, very_active:1.9 }
      calorieGoal = Math.round(bmr * (factors[form.activity]||1.55))
    }
    const proteinGoal = +form.proteinGoal || Math.round(w*1.8)
    const fatGoal = +form.fatGoal || Math.round(calorieGoal*0.25/9)
    const carbGoal = +form.carbGoal || Math.round((calorieGoal-proteinGoal*4-fatGoal*9)/4)
    const bmi = w&&h ? (w/((h/100)**2)).toFixed(1) : profile?.bmi
    await saveProfile({ ...profile, ...form, calorieGoal, proteinGoal, fatGoal, carbGoal, bmi })
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  const inp = { width:'100%', padding:'12px 16px', background:'#222', border:'1px solid #2e2e2e', borderRadius:12, color:'#f5f5f5', fontSize:15, outline:'none', boxSizing:'border-box' }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ fontSize:11, color:'#6b7280', textTransform:'uppercase', letterSpacing:1, marginBottom:2 }}>Аккаунт</div>
          <div style={{ fontSize:20, fontWeight:700 }}>План и профиль</div>
        </div>
        <button onClick={signOut} style={{ width:36, height:36, borderRadius:10, background:'#1a1a1a', border:'1px solid #2e2e2e', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <LogOut size={16} color="#9ca3af" />
        </button>
      </div>
      <div style={{ display:'flex', background:'#1a1a1a', borderRadius:12, padding:4, gap:4, border:'1px solid #2e2e2e' }}>
        {[['plan','План'],['profile','Профиль'],['health','Здоровье'],['settings','Настройки']].map(([k,v]) => (
          <button key={k} onClick={() => setSection(k)} style={{ flex:1, padding:'9px 4px', borderRadius:9, border:'none', cursor:'pointer', fontSize:12, fontWeight:500, background:section===k?'#3d9970':'transparent', color:section===k?'#000':'#6b7280' }}>{v}</button>
        ))}
      </div>

      {section === 'plan' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ background:'#1a1a1a', borderRadius:16, padding:16, border:'1px solid #2e2e2e' }}>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>Цели тренировок</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {Object.entries(GOAL_LABELS).map(([k,v]) => (
                <button key={k} onClick={() => toggleGoal(k)} style={{ padding:'8px 14px', borderRadius:10, border:`1px solid ${form.goals.includes(k)?'#3d9970':'#2e2e2e'}`, background:form.goals.includes(k)?'rgba(61,153,112,0.1)':'#222', color:form.goals.includes(k)?'#3d9970':'#9ca3af', cursor:'pointer', fontSize:13, fontWeight:500 }}>{v}</button>
              ))}
            </div>
          </div>
          <div style={{ background:'#1a1a1a', borderRadius:16, padding:16, border:'1px solid #2e2e2e' }}>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>Уровень подготовки</div>
            <div style={{ display:'flex', gap:8 }}>
              {Object.entries(LEVEL_LABELS).map(([k,v]) => (
                <button key={k} onClick={() => setForm(f => ({...f, level:k}))} style={{ flex:1, padding:'10px 6px', borderRadius:10, border:`1px solid ${form.level===k?'#3d9970':'#2e2e2e'}`, background:form.level===k?'rgba(61,153,112,0.1)':'#222', color:form.level===k?'#3d9970':'#9ca3af', cursor:'pointer', fontSize:11, fontWeight:form.level===k?700:400 }}>{v}</button>
              ))}
            </div>
          </div>
          <div style={{ background:'#1a1a1a', borderRadius:16, padding:16, border:'1px solid #2e2e2e' }}>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:6 }}>Где тренируешься</div>
            <div style={{ fontSize:12, color:'#6b7280', marginBottom:12 }}>От этого зависит, какие упражнения предлагаются</div>
            <div style={{ display:'flex', gap:8 }}>
              {[['gym','Зал'],['home','Дом'],['both','Везде']].map(([k,v]) => (
                <button key={k} onClick={() => { setForm(f => ({...f, workoutPlace:k})); try { localStorage.setItem('workout-place-v1', k) } catch {} }} style={{ flex:1, padding:'12px 6px', borderRadius:10, border:`1px solid ${form.workoutPlace===k?'#3d9970':'#2e2e2e'}`, background:form.workoutPlace===k?'rgba(61,153,112,0.1)':'#222', color:form.workoutPlace===k?'#3d9970':'#9ca3af', cursor:'pointer', fontSize:13, fontWeight:form.workoutPlace===k?700:400 }}>{v}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {section === 'profile' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {[['Рост (см)','height','number','180'],['Вес (кг)','weight','number','90'],['Возраст','age','number','28']].map(([label,key,type,ph]) => (
            <div key={key} style={{ background:'#1a1a1a', borderRadius:14, padding:'14px 16px', border:'1px solid #2e2e2e', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:14, color:'#9ca3af' }}>{label}</span>
              <input style={{ background:'transparent', border:'none', color:'#f5f5f5', fontSize:14, fontWeight:600, textAlign:'right', width:120, outline:'none' }} type={type} placeholder={ph} value={form[key]||''} onChange={e => setForm(f => ({...f,[key]:e.target.value}))} />
            </div>
          ))}
          <div style={{ background:'#1a1a1a', borderRadius:14, padding:'14px 16px', border:'1px solid #2e2e2e', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:14, color:'#9ca3af' }}>Пол</span>
            <select style={{ background:'transparent', border:'none', color:'#f5f5f5', fontSize:14, fontWeight:600, outline:'none' }} value={form.gender} onChange={e => setForm(f => ({...f,gender:e.target.value}))}>
              <option value="male" style={{ background:'#222' }}>Мужской</option>
              <option value="female" style={{ background:'#222' }}>Женский</option>
            </select>
          </div>
          <div style={{ background:'#1a1a1a', borderRadius:14, padding:'14px 16px', border:'1px solid #2e2e2e' }}>
            <div style={{ fontSize:13, color:'#9ca3af', marginBottom:8 }}>Активность</div>
            <select style={{ ...inp, background:'#222', borderRadius:8 }} value={form.activity} onChange={e => setForm(f => ({...f,activity:e.target.value}))}>
              {Object.entries(ACTIVITY_LABELS).map(([v,l]) => <option key={v} value={v} style={{ background:'#222' }}>{l}</option>)}
            </select>
          </div>
          {profile?.bmi && (
            <div style={{ background:'rgba(61,153,112,0.05)', borderRadius:14, padding:'14px 16px', border:'1px solid rgba(61,153,112,0.2)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:14, color:'#9ca3af' }}>ИМТ</span>
              <span style={{ fontSize:14, fontWeight:700, color:'#3d9970' }}>{profile.bmi}</span>
            </div>
          )}
        </div>
      )}

      {section === 'health' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ background:'#1a1a1a', borderRadius:16, padding:16, border:'1px solid #2e2e2e' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <AlertTriangle size={16} color="#fbbf24" />
              <div style={{ fontSize:14, fontWeight:600 }}>Ограничения и травмы</div>
            </div>
            <div style={{ fontSize:12, color:'#6b7280', marginBottom:10, lineHeight:1.5 }}>
              Опиши состояния, травмы и ограничения. AI учтёт их при составлении плана тренировок.
            </div>
            <textarea
              style={{ ...inp, resize:'none', minHeight:90, lineHeight:1.5, fontSize:14 }}
              placeholder="Например: коксартроз правого ТБС 2 степени, грыжа L4-L5, проблемы с коленями"
              value={form.limitationsText}
              onChange={e => setForm(f => ({ ...f, limitationsText: e.target.value }))}
              rows={4}
            />
            <button
              onClick={runAIAnalysis}
              disabled={analyzing || !form.limitationsText.trim()}
              style={{
                marginTop:10, width:'100%', background:'#3d9970', color:'#000', border:'none',
                borderRadius:12, padding:'12px', fontSize:13, fontWeight:700, cursor:'pointer',
                opacity: analyzing || !form.limitationsText.trim() ? 0.5 : 1,
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                textTransform:'uppercase', letterSpacing:0.5
              }}>
              <Sparkles size={14} />
              {analyzing ? 'Анализирую...' : 'Получить AI-анализ'}
            </button>
            {analyzeError && (
              <div style={{ marginTop:8, fontSize:12, color:'#f87171', background:'rgba(248,113,113,0.1)', padding:'8px 12px', borderRadius:8 }}>
                {analyzeError}
              </div>
            )}
          </div>

          {form.aiAnalysis && (
            <div style={{ background:'rgba(61,153,112,0.05)', borderRadius:16, padding:16, border:'1px solid rgba(61,153,112,0.25)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                <Sparkles size={16} color="#3d9970" />
                <div style={{ fontSize:13, fontWeight:600, color:'#3d9970' }}>AI-анализ</div>
              </div>
              <div style={{ fontSize:13, color:'#d1d5db', lineHeight:1.6, whiteSpace:'pre-wrap' }}>
                {form.aiAnalysis}
              </div>
              <div style={{ marginTop:10, fontSize:11, color:'#6b7280', fontStyle:'italic' }}>
                Эти данные будут учтены при генерации AI-плана тренировок
              </div>
            </div>
          )}
        </div>
      )}

      {section === 'settings' && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ background:'#1a1a1a', borderRadius:16, padding:16, border:'1px solid #2e2e2e' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: reminders.enabled ? 14 : 4 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Bell size={16} color="#3d9970" />
                <div style={{ fontSize:14, fontWeight:600 }}>Уведомления</div>
              </div>
              <button
                onClick={() => reminders.enabled ? updateReminders({ enabled: false }) : enableReminders()}
                style={{ width: 46, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer', position: 'relative', background: reminders.enabled ? '#3d9970' : '#2e2e2e', transition: 'background 0.2s' }}>
                <div style={{ position: 'absolute', top: 3, left: reminders.enabled ? 23 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
              </button>
            </div>
            {notifPermission === 'unsupported' && (
              <div style={{ fontSize:12, color:'#6b7280' }}>Браузер не поддерживает уведомления</div>
            )}
            {notifPermission === 'denied' && (
              <div style={{ fontSize:12, color:'#f87171' }}>Уведомления заблокированы в настройках браузера — разрешите их вручную для этого сайта</div>
            )}
            {reminders.enabled && (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <div style={{ fontSize:11, color:'#6b7280', textTransform:'uppercase', letterSpacing:0.5 }}>Время приёмов пищи</div>
                {[['breakfast','Завтрак'],['lunch','Обед'],['dinner','Ужин']].map(([key, label]) => (
                  <div key={key} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:13, color:'#d1d5db' }}>{label}</span>
                    <input type="time" value={reminders.meals?.[key] || '08:00'} onChange={e => updateMealTime(key, e.target.value)}
                      style={{ background:'#222', border:'1px solid #2e2e2e', borderRadius:8, color:'#f5f5f5', fontSize:13, padding:'6px 10px', fontFamily:'var(--mono)' }} />
                  </div>
                ))}
                <div style={{ height:1, background:'#2a2a2a', margin:'4px 0' }} />
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:13, color:'#d1d5db' }}>Напоминать про тренировку</span>
                  <button
                    onClick={() => updateReminders({ workout: { ...reminders.workout, enabled: !reminders.workout?.enabled } })}
                    style={{ width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer', position: 'relative', background: reminders.workout?.enabled ? '#3d9970' : '#2e2e2e' }}>
                    <div style={{ position: 'absolute', top: 2, left: reminders.workout?.enabled ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                  </button>
                </div>
                {reminders.workout?.enabled && (
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:13, color:'#d1d5db' }}>Время тренировки</span>
                    <input type="time" value={reminders.workout?.time || '18:00'} onChange={e => updateReminders({ workout: { ...reminders.workout, time: e.target.value } })}
                      style={{ background:'#222', border:'1px solid #2e2e2e', borderRadius:8, color:'#f5f5f5', fontSize:13, padding:'6px 10px', fontFamily:'var(--mono)' }} />
                  </div>
                )}
                <div style={{ fontSize:11, color:'#6b7280', marginTop:4 }}>Уведомления работают, пока открыта вкладка или приложение свёрнуто</div>
              </div>
            )}
          </div>
          <div style={{ background:'#1a1a1a', borderRadius:16, padding:16, border:'1px solid #2e2e2e' }}>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>Цели КБЖУ</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {[['Калории','calorieGoal','#f5f5f5'],['Белки (г)','proteinGoal','#3d9970'],['Жиры (г)','fatGoal','#fbbf24'],['Углев. (г)','carbGoal','#38bdf8']].map(([label,key,color]) => (
                <div key={key}>
                  <div style={{ fontSize:11, color, marginBottom:5, textTransform:'uppercase', letterSpacing:0.5 }}>{label}</div>
                  <input style={{ ...inp, borderColor:color==='#f5f5f5'?'#2e2e2e':color+'44' }} type="number" value={form[key]} onChange={e => setForm(f => ({...f,[key]:e.target.value}))} />
                </div>
              ))}
            </div>
          </div>
          <div style={{ background:'#1a1a1a', borderRadius:16, padding:16, border:'1px solid #2e2e2e' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <div>
                <div style={{ fontSize:14, fontWeight:600 }}>Кэш AI-продуктов</div>
                <div style={{ fontSize:12, color:'#6b7280', marginTop:2 }}>Сохранённых: {cacheCount}</div>
              </div>
              <button onClick={handleClearCache} disabled={cacheCount === 0}
                style={{ padding:'8px 14px', borderRadius:10, background: cacheCleared ? '#329063' : 'rgba(239,68,68,0.1)', border:`1px solid ${cacheCleared ? '#329063' : 'rgba(239,68,68,0.3)'}`, color: cacheCleared ? '#000' : '#ef4444', cursor:'pointer', fontSize:12, fontWeight:600, opacity: cacheCount === 0 ? 0.4 : 1 }}>
                {cacheCleared ? '✓ Очищено' : 'Очистить'}
              </button>
            </div>
          </div>
        </div>
      )}

      <button onClick={handleSave} style={{ background: saved ? '#329063' : '#3d9970', color:'#000', border:'none', borderRadius:14, padding:'15px', fontSize:15, fontWeight:700, cursor:'pointer', textTransform:'uppercase', letterSpacing:0.5 }}>
        {saved ? '✓ Сохранено!' : 'Сохранить'}
      </button>
    </div>
  )
}

