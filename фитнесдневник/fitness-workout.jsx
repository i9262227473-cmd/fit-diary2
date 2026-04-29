// ═══════════════════════════════════════════
// WORKOUT VIEW
// ═══════════════════════════════════════════

function WorkoutView({ state, dispatch }) {
  const [view, setView] = React.useState('list'); // list | builder | active | ai
  const [builderWorkout, setBuilderWorkout] = React.useState({ name:'', exercises:[] });
  const [exSearch, setExSearch] = React.useState('');
  const [timer, setTimer] = React.useState(0);
  const [timerRunning, setTimerRunning] = React.useState(false);
  const [aiGoal, setAiGoal] = React.useState('mass');
  const [aiLevel, setAiLevel] = React.useState('beginner');
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiPlan, setAiPlan] = React.useState(null);
  const timerRef = React.useRef(null);

  React.useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [timerRunning]);

  const fmtTime = (s) => {
    const m = Math.floor(s / 60), sec = s % 60;
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  };

  const filteredEx = EXERCISE_DB.filter(e =>
    e.name.toLowerCase().includes(exSearch.toLowerCase()) ||
    e.muscle.toLowerCase().includes(exSearch.toLowerCase())
  );

  const addExercise = (ex) => {
    setBuilderWorkout(w => ({
      ...w,
      exercises: [...w.exercises, {
        exerciseId: ex.id, name: ex.name, muscle: ex.muscle,
        sets: [{ reps:'10', weight:'60', done:false }],
      }]
    }));
    setExSearch('');
  };

  const updateSet = (exIdx, setIdx, field, val) => {
    setBuilderWorkout(w => {
      const exs = [...w.exercises];
      exs[exIdx] = { ...exs[exIdx], sets: exs[exIdx].sets.map((s,i) => i===setIdx ? {...s,[field]:val} : s) };
      return { ...w, exercises: exs };
    });
  };

  const addSet = (exIdx) => {
    setBuilderWorkout(w => {
      const exs = [...w.exercises];
      const prevSet = exs[exIdx].sets[exs[exIdx].sets.length-1];
      exs[exIdx] = { ...exs[exIdx], sets: [...exs[exIdx].sets, {...prevSet, done:false}] };
      return { ...w, exercises: exs };
    });
  };

  const removeExercise = (exIdx) => {
    setBuilderWorkout(w => ({ ...w, exercises: w.exercises.filter((_,i)=>i!==exIdx) }));
  };

  const startWorkout = () => {
    if (!builderWorkout.exercises.length) return;
    setTimer(0); setTimerRunning(true); setView('active');
  };

  const toggleSet = (exIdx, setIdx) => {
    setBuilderWorkout(w => {
      const exs = [...w.exercises];
      exs[exIdx] = { ...exs[exIdx], sets: exs[exIdx].sets.map((s,i) => i===setIdx ? {...s,done:!s.done} : s) };
      return { ...w, exercises: exs };
    });
  };

  const completeWorkout = () => {
    setTimerRunning(false);
    const calBurned = Math.round(timer / 60 * 7.5);
    dispatch({ type:'ADD_WORKOUT', workout: {
      id: Date.now(),
      name: builderWorkout.name || 'Тренировка',
      exercises: builderWorkout.exercises,
      duration: timer,
      caloriesBurned: calBurned,
      date: new Date().toLocaleDateString('ru', {day:'numeric',month:'short'}),
    }});
    setBuilderWorkout({ name:'', exercises:[] });
    setView('list');
  };

  const generateAIPlan = () => {
    setAiLoading(true); setAiPlan(null);
    setTimeout(() => {
      const plan = generateWorkoutPlan(aiGoal, aiLevel);
      setAiPlan(plan); setAiLoading(false);
    }, 2000);
  };

  const loadAIPlan = () => {
    if (!aiPlan) return;
    const exercises = aiPlan.exercises.map(e => ({
      exerciseId: e.exerciseId,
      name: EXERCISE_DB.find(ex=>ex.id===e.exerciseId)?.name || '',
      muscle: EXERCISE_DB.find(ex=>ex.id===e.exerciseId)?.muscle || '',
      sets: e.sets,
    }));
    setBuilderWorkout({ name: aiPlan.name, exercises });
    setView('builder');
  };

  const s = wkStyles;

  // LIST VIEW
  if (view === 'list') return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <div style={s.pageTitle}>Тренировки</div>
          <div style={s.pageSubtitle}>История и планирование</div>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button style={s.btnSecondary} onClick={()=>{ setAiPlan(null); setView('ai'); }}>
            <span style={{color:'var(--accent)'}}>✦</span> Сгенерировать с ИИ
          </button>
          <button style={s.btnPrimary} onClick={()=>setView('builder')}>
            + Новая тренировка
          </button>
        </div>
      </div>

      {state.workouts.length === 0 ? (
        <div style={s.emptyState}>
          <div style={s.emptyIcon}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect x="8" y="20" width="32" height="8" rx="4" fill="var(--border)"/>
              <rect x="4" y="16" width="8" height="16" rx="4" fill="var(--accent-dim)"/>
              <rect x="36" y="16" width="8" height="16" rx="4" fill="var(--accent-dim)"/>
              <rect x="2" y="18" width="6" height="12" rx="3" fill="var(--border)"/>
              <rect x="40" y="18" width="6" height="12" rx="3" fill="var(--border)"/>
            </svg>
          </div>
          <p style={s.emptyText}>Тренировок пока нет.<br/>Создай первую или попроси ИИ составить план.</p>
        </div>
      ) : (
        <div style={s.workoutList}>
          {state.workouts.map(w => (
            <div key={w.id} style={s.workoutCard}>
              <div style={s.workoutCardLeft}>
                <div style={s.workoutName}>{w.name}</div>
                <div style={s.workoutMeta}>
                  {w.exercises.length} упражнений · {fmtTime(w.duration)} · {w.date}
                </div>
                <div style={s.workoutExList}>
                  {w.exercises.slice(0,4).map((e,i) => (
                    <span key={i} style={s.exTag}>{e.name}</span>
                  ))}
                  {w.exercises.length > 4 && <span style={s.exTag}>+{w.exercises.length-4}</span>}
                </div>
              </div>
              <div style={s.workoutCardRight}>
                <div style={s.calBurned}>{w.caloriesBurned}</div>
                <div style={s.calBurnedLabel}>ккал сожжено</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // AI GENERATOR VIEW
  if (view === 'ai') return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={()=>setView('list')}>← Назад</button>
        <div style={s.pageTitle}>ИИ-конструктор тренировки</div>
      </div>
      <div style={s.aiCard}>
        <div style={s.aiGlow} />
        <div style={s.aiCardInner}>
          <div style={s.aiLabel}>
            <span style={{color:'var(--accent)',fontSize:18}}>✦</span>
            <span>Настрой параметры — ИИ составит план</span>
          </div>
          <div style={s.aiOptions}>
            <div style={s.optGroup}>
              <label style={s.optLabel}>Цель</label>
              <div style={s.optBtns}>
                {[['mass','Набор массы'],['fat','Жиросжигание'],['endurance','Выносливость']].map(([k,v])=>(
                  <button key={k} style={{...s.optBtn,...(aiGoal===k?s.optBtnActive:{})}} onClick={()=>setAiGoal(k)}>{v}</button>
                ))}
              </div>
            </div>
            <div style={s.optGroup}>
              <label style={s.optLabel}>Уровень</label>
              <div style={s.optBtns}>
                {[['beginner','Начинающий'],['intermediate','Средний']].map(([k,v])=>(
                  <button key={k} style={{...s.optBtn,...(aiLevel===k?s.optBtnActive:{})}} onClick={()=>setAiLevel(k)}>{v}</button>
                ))}
              </div>
            </div>
          </div>
          <button style={{...s.btnPrimary, width:'100%', justifyContent:'center'}}
            onClick={generateAIPlan} disabled={aiLoading}>
            {aiLoading ? '⏳ Генерирую план...' : '✦ Сгенерировать тренировку'}
          </button>

          {aiLoading && (
            <div style={s.aiGenLoading}>
              <div style={s.pulseRing} />
              <span style={{color:'var(--text-muted)',fontSize:13}}>Подбираю упражнения под твой уровень...</span>
            </div>
          )}

          {aiPlan && !aiLoading && (
            <div style={s.aiResult}>
              <div style={s.aiResultHeader}>
                <span style={{color:'var(--accent)',fontSize:16}}>✦</span>
                <span style={s.aiResultName}>{aiPlan.name}</span>
              </div>
              <div style={s.aiExList}>
                {aiPlan.exercises.map((e, i) => {
                  const ex = EXERCISE_DB.find(x=>x.id===e.exerciseId);
                  return (
                    <div key={i} style={s.aiExRow}>
                      <span style={s.aiExNum}>{i+1}</span>
                      <div style={{flex:1}}>
                        <div style={s.aiExName}>{ex?.name}</div>
                        <div style={s.aiExMeta}>{ex?.muscle} · {e.sets.length} подх. × {e.sets[0].reps} {e.sets[0].weight>0 ? `@ ${e.sets[0].weight}кг`:''}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {aiPlan.note && <div style={s.aiNote}>💡 {aiPlan.note}</div>}
              <button style={{...s.btnPrimary, width:'100%', justifyContent:'center', marginTop:4}}
                onClick={loadAIPlan}>
                Загрузить в конструктор →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // BUILDER VIEW
  if (view === 'builder') return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={()=>setView('list')}>← Назад</button>
        <input style={{...s.input, fontSize:16, fontWeight:600, flex:1, maxWidth:320}}
          placeholder="Название тренировки"
          value={builderWorkout.name}
          onChange={e=>setBuilderWorkout(w=>({...w,name:e.target.value}))} />
        <button style={s.btnPrimary} onClick={startWorkout}
          disabled={builderWorkout.exercises.length===0}>
          Начать тренировку
        </button>
      </div>

      <div style={s.builderLayout}>
        {/* Exercise picker */}
        <div style={s.exPicker}>
          <div style={s.pickerTitle}>База упражнений</div>
          <input style={s.input} placeholder="Найти упражнение..."
            value={exSearch} onChange={e=>setExSearch(e.target.value)} />
          <div style={s.exPickerList}>
            {filteredEx.map(ex => (
              <button key={ex.id} style={s.exPickerRow} onClick={()=>addExercise(ex)}>
                <span style={{...s.muscleTag, background: muscleColor(ex.muscle)}}>{ex.muscle}</span>
                <span style={{color:'var(--text)',fontSize:14}}>{ex.name}</span>
                <span style={{marginLeft:'auto',color:'var(--accent)',fontSize:18,lineHeight:1}}>+</span>
              </button>
            ))}
          </div>
        </div>

        {/* Workout builder */}
        <div style={s.builderMain}>
          {builderWorkout.exercises.length === 0 && (
            <div style={s.builderEmpty}>Добавь упражнения из списка слева</div>
          )}
          {builderWorkout.exercises.map((ex, exIdx) => (
            <div key={exIdx} style={s.exCard}>
              <div style={s.exCardHeader}>
                <span style={{...s.muscleTag, background: muscleColor(ex.muscle)}}>{ex.muscle}</span>
                <span style={s.exCardName}>{ex.name}</span>
                <button style={s.removeBtn} onClick={()=>removeExercise(exIdx)}>×</button>
              </div>
              <div style={s.setsTable}>
                <div style={s.setsHeader}>
                  <span style={s.setCol}>Подход</span>
                  <span style={s.setCol}>Повторы</span>
                  <span style={s.setCol}>Вес (кг)</span>
                </div>
                {ex.sets.map((set, setIdx) => (
                  <div key={setIdx} style={s.setRow}>
                    <span style={{...s.setCol,...s.setNum}}>{setIdx+1}</span>
                    <input style={s.setInput} value={set.reps}
                      onChange={e=>updateSet(exIdx,setIdx,'reps',e.target.value)} placeholder="10" />
                    <input style={s.setInput} value={set.weight}
                      onChange={e=>updateSet(exIdx,setIdx,'weight',e.target.value)} placeholder="0" />
                  </div>
                ))}
              </div>
              <button style={s.addSetBtn} onClick={()=>addSet(exIdx)}>+ Добавить подход</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ACTIVE WORKOUT VIEW
  if (view === 'active') return (
    <div style={s.page}>
      <div style={s.activeHeader}>
        <div style={s.timerDisplay}>{fmtTime(timer)}</div>
        <div style={s.activeTitle}>{builderWorkout.name || 'Тренировка'}</div>
        <div style={{display:'flex',gap:10}}>
          <button style={s.pauseBtn} onClick={()=>setTimerRunning(r=>!r)}>
            {timerRunning ? '⏸ Пауза' : '▶ Продолжить'}
          </button>
          <button style={{...s.btnPrimary,background:'var(--accent)'}} onClick={completeWorkout}>
            Завершить ✓
          </button>
        </div>
      </div>

      <div style={s.activeExList}>
        {builderWorkout.exercises.map((ex, exIdx) => (
          <div key={exIdx} style={s.activeExCard}>
            <div style={s.activeExName}>{ex.name}</div>
            <div style={s.activeSets}>
              {ex.sets.map((set, setIdx) => (
                <button key={setIdx}
                  style={{...s.activeSetBtn,...(set.done?s.activeSetDone:{})}}
                  onClick={()=>toggleSet(exIdx,setIdx)}>
                  <span style={s.setNum2}>{setIdx+1}</span>
                  <span style={s.setInfo}>{set.reps} × {set.weight>0?`${set.weight}кг`:'—'}</span>
                  {set.done && <span style={s.checkMark}>✓</span>}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function muscleColor(muscle) {
  const map = {
    'Грудь':'oklch(0.35 0.08 145)','Ноги':'oklch(0.35 0.08 185)',
    'Спина':'oklch(0.35 0.08 260)','Плечи':'oklch(0.35 0.08 75)',
    'Трицепс':'oklch(0.35 0.08 320)','Бицепс':'oklch(0.35 0.08 30)',
    'Кор':'oklch(0.35 0.08 200)','Кардио':'oklch(0.35 0.08 0)',
  };
  return map[muscle] || 'var(--surface2)';
}

const wkStyles = {
  page: { display:'flex', flexDirection:'column', gap:20 },
  header: { display:'flex', alignItems:'center', gap:14 },
  pageTitle: { fontSize:22, fontWeight:700, color:'var(--text)' },
  pageSubtitle: { fontSize:14, color:'var(--text-muted)', marginTop:2 },
  btnPrimary: {
    display:'flex', alignItems:'center', gap:6,
    padding:'10px 20px', background:'var(--accent)', color:'#000',
    border:'none', borderRadius:10, cursor:'pointer', fontSize:14, fontWeight:600,
    whiteSpace:'nowrap', transition:'opacity 0.15s',
  },
  btnSecondary: {
    display:'flex', alignItems:'center', gap:6,
    padding:'10px 20px', background:'var(--surface2)', color:'var(--text)',
    border:'1px solid var(--border)', borderRadius:10, cursor:'pointer', fontSize:14,
    whiteSpace:'nowrap',
  },
  backBtn: {
    padding:'8px 16px', background:'transparent', border:'1px solid var(--border)',
    borderRadius:8, color:'var(--text-muted)', cursor:'pointer', fontSize:14,
  },
  emptyState: {
    display:'flex', flexDirection:'column', alignItems:'center', gap:16,
    padding:'60px 0', color:'var(--text-muted)',
  },
  emptyIcon: { opacity:0.5 },
  emptyText: { fontSize:15, textAlign:'center', lineHeight:1.6, margin:0 },
  workoutList: { display:'flex', flexDirection:'column', gap:12 },
  workoutCard: {
    display:'flex', alignItems:'stretch',
    background:'var(--surface)', border:'1px solid var(--border)',
    borderRadius:14, padding:20, gap:20,
  },
  workoutCardLeft: { flex:1, display:'flex', flexDirection:'column', gap:8 },
  workoutName: { fontSize:16, fontWeight:600, color:'var(--text)' },
  workoutMeta: { fontSize:13, color:'var(--text-muted)', fontFamily:'var(--mono)' },
  workoutExList: { display:'flex', flexWrap:'wrap', gap:6 },
  exTag: {
    padding:'3px 10px', background:'var(--surface2)', border:'1px solid var(--border)',
    borderRadius:50, fontSize:12, color:'var(--text-muted)',
  },
  workoutCardRight: {
    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
    borderLeft:'1px solid var(--border)', paddingLeft:20, minWidth:80,
  },
  calBurned: { fontSize:28, fontWeight:700, color:'var(--accent)', fontFamily:'var(--mono)' },
  calBurnedLabel: { fontSize:12, color:'var(--text-muted)', marginTop:4 },
  // AI styles
  aiCard: {
    position:'relative', background:'var(--surface)', border:'1px solid var(--border)',
    borderRadius:16, overflow:'hidden', padding:28,
  },
  aiGlow: {
    position:'absolute', top:-60, left:'50%', transform:'translateX(-50%)',
    width:400, height:200, borderRadius:'50%',
    background:'radial-gradient(ellipse, oklch(0.62 0.18 145 / 0.12), transparent 70%)',
    pointerEvents:'none',
  },
  aiCardInner: { display:'flex', flexDirection:'column', gap:20, position:'relative' },
  aiLabel: { display:'flex', alignItems:'center', gap:10, fontSize:16, fontWeight:600, color:'var(--text)' },
  aiOptions: { display:'flex', gap:24, flexWrap:'wrap' },
  optGroup: { display:'flex', flexDirection:'column', gap:8 },
  optLabel: { fontSize:12, color:'var(--text-muted)', letterSpacing:'0.05em', textTransform:'uppercase' },
  optBtns: { display:'flex', gap:8 },
  optBtn: {
    padding:'8px 16px', background:'var(--surface2)', border:'1px solid var(--border)',
    borderRadius:8, color:'var(--text-muted)', cursor:'pointer', fontSize:13, transition:'all 0.15s',
  },
  optBtnActive: { background:'var(--accent-dim)', border:'1px solid var(--accent)', color:'var(--accent-bright)' },
  aiGenLoading: { display:'flex', alignItems:'center', gap:12, padding:'12px 0' },
  pulseRing: {
    width:16, height:16, borderRadius:'50%',
    border:'2px solid var(--accent)', animation:'pulse 1s ease-in-out infinite',
  },
  aiResult: {
    background:'var(--surface2)', border:'1px solid var(--accent)',
    borderRadius:14, padding:20, display:'flex', flexDirection:'column', gap:12,
  },
  aiResultHeader: { display:'flex', alignItems:'center', gap:10 },
  aiResultName: { fontSize:15, fontWeight:600, color:'var(--text)' },
  aiExList: { display:'flex', flexDirection:'column', gap:8 },
  aiExRow: { display:'flex', alignItems:'center', gap:12 },
  aiExNum: {
    width:24, height:24, borderRadius:'50%', background:'var(--accent-dim)',
    color:'var(--accent)', fontSize:12, fontWeight:600,
    display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
  },
  aiExName: { fontSize:14, color:'var(--text)' },
  aiExMeta: { fontSize:12, color:'var(--text-muted)', fontFamily:'var(--mono)', marginTop:2 },
  aiNote: {
    padding:'10px 14px', background:'oklch(0.72 0.15 75 / 0.1)',
    border:'1px solid oklch(0.72 0.15 75 / 0.3)', borderRadius:10,
    fontSize:13, color:'var(--text-muted)', lineHeight:1.5,
  },
  // Builder styles
  input: {
    padding:'10px 14px', background:'var(--surface)', border:'1px solid var(--border)',
    borderRadius:10, color:'var(--text)', fontSize:14, outline:'none',
    fontFamily:'var(--font)',
  },
  builderLayout: { display:'grid', gridTemplateColumns:'280px 1fr', gap:16, flex:1 },
  exPicker: {
    background:'var(--surface)', border:'1px solid var(--border)',
    borderRadius:14, padding:16, display:'flex', flexDirection:'column', gap:12,
    height:'fit-content', maxHeight:'70vh', overflow:'hidden',
  },
  pickerTitle: { fontSize:14, fontWeight:600, color:'var(--text)' },
  exPickerList: { display:'flex', flexDirection:'column', gap:4, overflowY:'auto', flex:1 },
  exPickerRow: {
    display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
    background:'transparent', border:'1px solid transparent', borderRadius:10,
    cursor:'pointer', textAlign:'left', transition:'all 0.12s',
  },
  muscleTag: { padding:'2px 8px', borderRadius:50, fontSize:11, color:'var(--text-muted)', flexShrink:0 },
  builderMain: { display:'flex', flexDirection:'column', gap:12 },
  builderEmpty: { color:'var(--text-muted)', fontSize:14, padding:'40px 0', textAlign:'center' },
  exCard: {
    background:'var(--surface)', border:'1px solid var(--border)',
    borderRadius:14, padding:16, display:'flex', flexDirection:'column', gap:12,
  },
  exCardHeader: { display:'flex', alignItems:'center', gap:10 },
  exCardName: { fontSize:15, fontWeight:600, color:'var(--text)', flex:1 },
  removeBtn: {
    width:28, height:28, borderRadius:8, background:'transparent',
    border:'1px solid var(--border)', color:'var(--text-muted)',
    cursor:'pointer', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center',
  },
  setsTable: { display:'flex', flexDirection:'column', gap:6 },
  setsHeader: { display:'grid', gridTemplateColumns:'60px 1fr 1fr', gap:8, marginBottom:4 },
  setRow: { display:'grid', gridTemplateColumns:'60px 1fr 1fr', gap:8, alignItems:'center' },
  setCol: { fontSize:12, color:'var(--text-muted)', textAlign:'center' },
  setNum: { fontFamily:'var(--mono)', fontSize:14, color:'var(--text-muted)', textAlign:'center' },
  setInput: {
    padding:'8px 12px', background:'var(--surface2)', border:'1px solid var(--border)',
    borderRadius:8, color:'var(--text)', fontSize:14, fontFamily:'var(--mono)',
    outline:'none', textAlign:'center',
  },
  addSetBtn: {
    alignSelf:'flex-start', padding:'6px 14px', background:'transparent',
    border:'1px dashed var(--border)', borderRadius:8, color:'var(--text-muted)',
    cursor:'pointer', fontSize:13,
  },
  // Active workout
  activeHeader: {
    display:'flex', alignItems:'center', gap:20, padding:'20px 24px',
    background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14,
  },
  timerDisplay: { fontFamily:'var(--mono)', fontSize:36, fontWeight:500, color:'var(--accent)', minWidth:100 },
  activeTitle: { fontSize:16, fontWeight:600, color:'var(--text)', flex:1 },
  pauseBtn: {
    padding:'10px 20px', background:'var(--surface2)', color:'var(--text)',
    border:'1px solid var(--border)', borderRadius:10, cursor:'pointer', fontSize:14,
  },
  activeExList: { display:'flex', flexDirection:'column', gap:12 },
  activeExCard: {
    background:'var(--surface)', border:'1px solid var(--border)',
    borderRadius:14, padding:20,
  },
  activeExName: { fontSize:16, fontWeight:600, color:'var(--text)', marginBottom:12 },
  activeSets: { display:'flex', flexWrap:'wrap', gap:8 },
  activeSetBtn: {
    display:'flex', alignItems:'center', gap:10, padding:'12px 16px',
    background:'var(--surface2)', border:'2px solid var(--border)',
    borderRadius:12, cursor:'pointer', transition:'all 0.15s', minWidth:120,
  },
  activeSetDone: { background:'oklch(0.35 0.10 145)', border:'2px solid var(--accent)' },
  setNum2: { fontFamily:'var(--mono)', fontSize:13, color:'var(--text-muted)', minWidth:16 },
  setInfo: { fontSize:14, color:'var(--text)', flex:1 },
  checkMark: { color:'var(--accent)', fontSize:16 },
};

const wkAnimStyle = document.createElement('style');
wkAnimStyle.textContent = `@keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.3);opacity:0.6}}`;
document.head.appendChild(wkAnimStyle);

Object.assign(window, { WorkoutView });
