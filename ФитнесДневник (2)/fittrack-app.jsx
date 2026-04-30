// ════════════════════════════════════════════════════════════════════════
// FitTrack Pro — мобильное фитнес-приложение
// ════════════════════════════════════════════════════════════════════════

const { useState, useReducer, useEffect, useRef, Fragment } = React;

// ─── DATA ───────────────────────────────────────────────────────────────

const TODAY_WORKOUT = {
  id: 1, name: 'Грудь + Трицепс', exerciseCount: 6, minutes: 55,
  image: 'img/workout-chest.png',
  exercises: [
    { id: 1, name: 'Жим лёжа', muscle: 'Грудь', tag: 'Базовое', sets: 4, reps: '8-10', weight: 80,
      tech: ['Лопатки сведены', 'Стопы на полу', 'Опускай штангу к нижней части груди', 'Выжимай вверх до полного выпрямления рук'],
      history: [{ date:'22 мая', sets:'4×10', weight:80, trend:'up' },{ date:'19 мая', sets:'4×9', weight:77.5, trend:'up' },{ date:'15 мая', sets:'4×8', weight:75, trend:'up' }],
      image: 'img/exercise-bench.png' },
    { id: 2, name: 'Разводка гантелей', muscle: 'Грудь', tag: 'Изолир.', sets: 3, reps: '10-12', weight: 12,
      tech: ['Лёгкое сгибание в локтях', 'Контролируй движение', 'Не опускай ниже плеч'],
      history: [{ date:'22 мая', sets:'3×12', weight:12, trend:'up' },{ date:'19 мая', sets:'3×10', weight:10, trend:'up' }] },
    { id: 3, name: 'Жим гантелей под углом', muscle: 'Грудь', tag: 'Базовое', sets: 3, reps: '10', weight: 22,
      tech: ['Угол скамьи 30-45°', 'Гантели в линии с грудью'], history: [] },
    { id: 4, name: 'Французский жим', muscle: 'Трицепс', tag: 'Изолир.', sets: 3, reps: '10-12', weight: 25,
      tech: ['Локти неподвижны', 'Опускай штангу ко лбу'], history: [] },
    { id: 5, name: 'Разгибания на блоке', muscle: 'Трицепс', tag: 'Изолир.', sets: 3, reps: '12', weight: 30,
      tech: ['Локти прижаты к корпусу', 'Полное разгибание'], history: [] },
    { id: 6, name: 'Отжимания на брусьях', muscle: 'Трицепс', tag: 'Базовое', sets: 3, reps: '10', weight: 0,
      tech: ['Корпус строго вертикально', 'Опускайся до угла 90°'], history: [] },
  ],
};

const NEXT_WORKOUT = { name: 'Ноги', when: 'Завтра', minutes: 60, image: 'img/workout-legs.png' };

const PROGRESS_DATA = [
  { name: 'Жим лёжа',  unit: 'кг', current: 85, prev: 80, trend: '+5 кг',
    points: [78,79,79,80,80.5,81,82,82,83,83,84,85] },
  { name: 'Вес тела', unit: 'кг', current: 90, prev: 93, trend: '−3 кг',
    points: [93,92.8,92.5,92.2,91.8,91.6,91.2,91,90.7,90.5,90.2,90] },
];

const FOOD_LOG = [
  { id: 1, meal: 'Завтрак',  time: '08:30', cal: 450, items: 'Овсянка, банан, яйца',  emoji: '🥣' },
  { id: 2, meal: 'Обед',     time: '13:00', cal: 650, items: 'Курица, рис, овощи',     emoji: '🍱' },
  { id: 3, meal: 'Ужин',     time: '19:00', cal: 550, items: 'Лосось, киноа, салат',   emoji: '🥗' },
  { id: 4, meal: 'Перекус',  time: '16:00', cal: 100, items: 'Греческий йогурт',       emoji: '🥤' },
];

const PROFILE = {
  name: 'Алексей', height: 180, weight: 90, age: 28, experience: '3 года', goal: 'Набор массы',
  plan: { name: 'Набор массы', perWeek: 4, days: ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'], done: [true,true,false,true,false,false,false] },
};

// ─── STATE ───────────────────────────────────────────────────────────────

const initialState = {
  workout: TODAY_WORKOUT,
  workoutTimer: 2535, // 42:15
  workoutRunning: false,
  currentExerciseId: 1,
  setsLog: {
    1: [{ done:true, reps:10, weight:80 },{ done:false, reps:9, weight:0 },{ done:false, reps:0, weight:0 },{ done:false, reps:0, weight:0 }],
    2: [{ done:false, reps:0, weight:12 }],
  },
  restTime: 90,
  restRemaining: 45,
  restRunning: true,
  // food
  calorieGoal: 2200,
  caloriesEaten: 1750,
  protein: { v: 120, g: 150 },
  fats: { v: 60, g: 70 },
  carbs: { v: 180, g: 250 },
};

function reducer(s, a) {
  switch (a.type) {
    case 'TICK_WORKOUT': return s.workoutRunning ? {...s, workoutTimer: s.workoutTimer + 1} : s;
    case 'TICK_REST': return s.restRunning && s.restRemaining>0 ? {...s, restRemaining: s.restRemaining - 1} : s;
    case 'TOGGLE_REST': return {...s, restRunning: !s.restRunning};
    case 'SKIP_REST': return {...s, restRemaining: 0, restRunning: false};
    case 'SET_EXERCISE': return {...s, currentExerciseId: a.id};
    case 'SET_WEIGHT': {
      const sl = {...s.setsLog};
      sl[a.exId] = (sl[a.exId]||[]).map(set=>({...set, weight: a.w}));
      return {...s, setsLog: sl};
    }
    case 'TOGGLE_SET': {
      const sl = {...s.setsLog};
      sl[a.exId] = sl[a.exId].map((set,i)=> i===a.i ? {...set, done: !set.done} : set);
      return {...s, setsLog: sl};
    }
    case 'UPDATE_SET': {
      const sl = {...s.setsLog};
      sl[a.exId] = sl[a.exId].map((set,i)=> i===a.i ? {...set, [a.field]:a.val} : set);
      return {...s, setsLog: sl};
    }
    default: return s;
  }
}

const fmt = (s)=>{ const m=Math.floor(s/60), x=s%60; return `${String(m).padStart(2,'0')}:${String(x).padStart(2,'0')}`; };

// ─── ICONS ──────────────────────────────────────────────────────────────

const I = {
  Home: ({c,s=22}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M3 10.5L12 3l9 7.5V21H3V10.5z" stroke={c} strokeWidth="2" strokeLinejoin="round"/><path d="M9 21v-7h6v7" stroke={c} strokeWidth="2"/></svg>,
  Dumb: ({c,s=22}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="2" y="9" width="3" height="6" rx="1" fill={c}/><rect x="5" y="7" width="3" height="10" rx="1" fill={c}/><rect x="8" y="11" width="8" height="2" fill={c}/><rect x="16" y="7" width="3" height="10" rx="1" fill={c}/><rect x="19" y="9" width="3" height="6" rx="1" fill={c}/></svg>,
  Chart: ({c,s=22}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M3 17l5-5 4 4 8-8" stroke={c} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/><path d="M14 8h6v6" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Apple: ({c,s=22}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 7c0-2 1.5-4 4-4 0 2.5-2 4-4 4z" fill={c}/><path d="M19 14c0-3-2.5-5-5-5-1 0-1.5 0.5-2 0.5S11 9 10 9c-2.5 0-5 2-5 5 0 4 3 8 5.5 8 1 0 1.5-0.5 2-0.5s1 0.5 2 0.5C17 22 19 18 19 14z" stroke={c} strokeWidth="2" fill="none"/></svg>,
  User: ({c,s=22}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke={c} strokeWidth="2"/><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7" stroke={c} strokeWidth="2" strokeLinecap="round"/></svg>,
  Bell: ({c,s=22}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M6 8a6 6 0 1112 0c0 7 3 8 3 8H3s3-1 3-8z" stroke={c} strokeWidth="2" strokeLinejoin="round"/><path d="M10 20a2 2 0 004 0" stroke={c} strokeWidth="2" strokeLinecap="round"/></svg>,
  Back: ({c,s=22}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  More: ({c,s=22}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="5" cy="12" r="1.5" fill={c}/><circle cx="12" cy="12" r="1.5" fill={c}/><circle cx="19" cy="12" r="1.5" fill={c}/></svg>,
  Check: ({c,s=14}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke={c} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  TrendUp: ({c,s=14}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M3 17l6-6 4 4 8-8" stroke={c} strokeWidth="2" strokeLinecap="round"/><path d="M14 7h7v7" stroke={c} strokeWidth="2" strokeLinecap="round"/></svg>,
  Plus: ({c,s=18}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke={c} strokeWidth="2.5" strokeLinecap="round"/></svg>,
  X: ({c,s=18}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke={c} strokeWidth="2" strokeLinecap="round"/></svg>,
  Caret: ({c,s=14,dir='right'}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{transform: dir==='left'?'rotate(180deg)':dir==='down'?'rotate(90deg)':'none'}}><path d="M9 6l6 6-6 6" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Play: ({c,s=18}) => <svg width={s} height={s} viewBox="0 0 24 24" fill={c}><path d="M7 5l12 7-12 7V5z"/></svg>,
  Sparkle: ({c,s=18}) => <svg width={s} height={s} viewBox="0 0 24 24" fill={c}><path d="M12 2l1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2z"/></svg>,
};

// ─── BOTTOM NAV ─────────────────────────────────────────────────────────

function BottomNav({ active, setActive }) {
  const tabs = [
    { id:'home',     label:'Главная',     Icon:I.Home },
    { id:'workout',  label:'Тренировки',  Icon:I.Dumb },
    { id:'progress', label:'Прогресс',    Icon:I.Chart },
    { id:'food',     label:'Питание',     Icon:I.Apple },
    { id:'profile',  label:'Профиль',     Icon:I.User },
  ];
  return (
    <div style={{display:'flex',background:'var(--bg)',borderTop:'1px solid #2A2A2D',padding:'10px 6px 4px'}}>
      {tabs.map(({id,label,Icon}) => {
        const a = active === id;
        return (
          <button key={id} onClick={()=>setActive(id)}
            style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4,background:'none',border:'none',cursor:'pointer',padding:'4px 0'}}>
            <Icon c={a?'var(--accent)':'var(--text-dim)'} s={22}/>
            <span style={{fontSize:10,color:a?'var(--accent)':'var(--text-dim)',fontWeight:a?600:500,letterSpacing:'-0.01em'}}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── MINI SPARKLINE ─────────────────────────────────────────────────────

function Spark({ points, color='var(--accent)', w=110, h=38 }) {
  if (!points || points.length<2) return null;
  const min = Math.min(...points), max = Math.max(...points);
  const range = max-min || 1;
  const stepX = w / (points.length-1);
  const path = points.map((p,i) => `${i===0?'M':'L'}${(i*stepX).toFixed(1)},${(h - ((p-min)/range)*(h-6) - 3).toFixed(1)}`).join(' ');
  const fillPath = path + ` L${w},${h} L0,${h} Z`;
  const lastY = h - ((points[points.length-1]-min)/range)*(h-6) - 3;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{display:'block'}}>
      <defs>
        <linearGradient id={`sg-${color.replace(/[^a-z]/gi,'')}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#sg-${color.replace(/[^a-z]/gi,'')})`}/>
      <path d={path} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={w} cy={lastY} r="3" fill={color}/>
    </svg>
  );
}

// ─── HOME SCREEN ────────────────────────────────────────────────────────

function HomeScreen({ goTo, openWorkout, openAnalysis, state }) {
  return (
    <div style={{padding:'8px 16px 24px',display:'flex',flexDirection:'column',gap:20,overflowY:'auto',height:'100%'}}>
      {/* Greeting */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'4px 0'}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:18,fontWeight:700,color:'var(--text)'}}>Привет, {PROFILE.name}</span>
          <span style={{fontSize:18}}>👋</span>
        </div>
        <button style={{position:'relative',width:38,height:38,borderRadius:'50%',background:'var(--surface)',border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
          <I.Bell c="var(--text)" s={20}/>
          <span style={{position:'absolute',top:8,right:9,width:8,height:8,borderRadius:'50%',background:'var(--red)',border:'2px solid var(--surface)'}}/>
        </button>
      </div>

      {/* Today's workout card */}
      <div>
        <div style={{fontSize:13,fontWeight:600,color:'var(--text-muted)',marginBottom:10,letterSpacing:'-0.01em'}}>Сегодня</div>
        <div style={{background:'var(--surface)',borderRadius:18,overflow:'hidden'}}>
          <div style={{display:'flex',alignItems:'center',padding:'14px 16px',gap:14}}>
            <div style={{flex:1}}>
              <div style={{fontSize:16,fontWeight:700,color:'var(--text)',letterSpacing:'-0.02em'}}>{TODAY_WORKOUT.name}</div>
              <div style={{fontSize:12,color:'var(--text-muted)',marginTop:3,fontWeight:500}}>{TODAY_WORKOUT.exercises.length} упражнений · 55 мин</div>
            </div>
            <div style={{width:78,height:78,borderRadius:14,background:'var(--surface2)',overflow:'hidden',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <img src="img/workout-chest.png" alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} onError={(e)=>{e.target.style.display='none'}}/>
            </div>
          </div>
          <button onClick={openWorkout}
            style={{width:'calc(100% - 24px)',margin:'0 12px 12px',padding:'14px',background:'var(--accent)',color:'#000',border:'none',borderRadius:12,fontSize:13,fontWeight:700,letterSpacing:'0.05em',cursor:'pointer',textTransform:'uppercase'}}>
            НАЧАТЬ ТРЕНИРОВКУ
          </button>
        </div>
      </div>

      {/* Progress */}
      <div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
          <span style={{fontSize:13,fontWeight:600,color:'var(--text-muted)',letterSpacing:'-0.01em'}}>Прогресс</span>
          <button onClick={()=>goTo('progress')} style={{background:'none',border:'none',color:'var(--text-muted)',fontSize:12,cursor:'pointer'}}>Смотреть все</button>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          <div style={{background:'var(--surface)',borderRadius:14,padding:'14px 16px',display:'flex',alignItems:'center',gap:14}}>
            <div style={{flex:1}}>
              <div style={{fontSize:13,color:'var(--text-muted)',fontWeight:500}}>Жим лёжа</div>
              <div style={{fontSize:16,fontWeight:700,color:'var(--text)',marginTop:3,letterSpacing:'-0.02em'}}>80 кг → 85 кг</div>
            </div>
            <Spark points={[78,79,79,81,80,82,83,85]} color="var(--accent)" w={90} h={36}/>
            <div style={{fontSize:13,fontWeight:700,color:'var(--accent)',fontVariantNumeric:'tabular-nums'}}>+5 кг</div>
          </div>
          <div style={{background:'var(--surface)',borderRadius:14,padding:'14px 16px',display:'flex',alignItems:'center',gap:14}}>
            <div style={{flex:1}}>
              <div style={{fontSize:13,color:'var(--text-muted)',fontWeight:500}}>Вес тела</div>
              <div style={{fontSize:16,fontWeight:700,color:'var(--text)',marginTop:3,letterSpacing:'-0.02em'}}>93 кг → 90 кг</div>
            </div>
            <Spark points={[93,93,92.5,92,91.5,91,90.5,90]} color="var(--accent)" w={90} h={36}/>
            <div style={{fontSize:13,fontWeight:700,color:'var(--accent)',fontVariantNumeric:'tabular-nums'}}>−3 кг</div>
          </div>
        </div>
      </div>

      {/* Recommendation */}
      <div style={{background:'var(--surface)',borderRadius:14,padding:'14px 16px',display:'flex',alignItems:'flex-start',gap:12,position:'relative'}}>
        <div style={{width:32,height:32,borderRadius:'50%',background:'var(--accent-dim)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <I.Sparkle c="var(--accent)" s={16}/>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:700,color:'var(--text)',letterSpacing:'-0.01em'}}>Рекомендация</div>
          <div style={{fontSize:13,color:'var(--text-muted)',marginTop:3,lineHeight:1.45,fontWeight:500}}>Сегодня увеличь вес в жиме лёжа на +2.5 кг</div>
        </div>
        <button style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-dim)',padding:0,position:'absolute',top:12,right:12}}>
          <I.X c="var(--text-dim)" s={16}/>
        </button>
      </div>

      {/* Next workout */}
      <div>
        <div style={{fontSize:13,fontWeight:600,color:'var(--text-muted)',marginBottom:10,letterSpacing:'-0.01em'}}>Следующая тренировка</div>
        <div style={{background:'var(--surface)',borderRadius:14,padding:'14px 16px',display:'flex',alignItems:'center',gap:14}}>
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:700,color:'var(--text)',letterSpacing:'-0.02em'}}>Ноги</div>
            <div style={{fontSize:12,color:'var(--text-muted)',marginTop:3,fontWeight:500}}>Завтра · 60 мин</div>
          </div>
          <div style={{width:64,height:64,borderRadius:12,background:'var(--surface2)',overflow:'hidden',flexShrink:0}}>
            <img src="img/workout-legs.png" alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} onError={(e)=>{e.target.style.display='none'}}/>
          </div>
        </div>
      </div>

      {/* AI Day analysis button */}
      <button onClick={openAnalysis}
        style={{width:'100%',padding:'14px 18px',background:'var(--surface)',color:'var(--accent)',border:'1px solid var(--accent-dim)',borderRadius:14,fontSize:14,fontWeight:600,letterSpacing:'-0.01em',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:10}}>
        <I.Sparkle c="var(--accent)" s={18}/>
        Анализ дня с ИИ
      </button>
    </div>
  );
}

// ─── WORKOUT SCREEN (active session) ────────────────────────────────────

function WorkoutScreen({ state, dispatch, goBack, openExercise, openRest }) {
  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{display:'flex',alignItems:'center',padding:'10px 12px',gap:6}}>
        <button onClick={goBack} style={{width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',background:'none',border:'none',cursor:'pointer'}}>
          <I.Back c="var(--text)"/>
        </button>
        <div style={{flex:1,fontSize:16,fontWeight:600,textAlign:'center',color:'var(--text)'}}>Тренировка</div>
        <button style={{width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',background:'none',border:'none',cursor:'pointer'}}>
          <I.More c="var(--text)"/>
        </button>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'4px 16px 20px',display:'flex',flexDirection:'column',gap:16}}>
        {/* Timer block */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'2px 4px'}}>
          <div>
            <div style={{fontSize:36,fontWeight:700,color:'var(--text)',letterSpacing:'-0.03em',fontVariantNumeric:'tabular-nums'}}>{fmt(state.workoutTimer)}</div>
            <div style={{fontSize:12,color:'var(--text-muted)',marginTop:-2,fontWeight:500}}>Общее время</div>
          </div>
          <button style={{padding:'10px 18px',background:'var(--accent)',color:'#000',border:'none',borderRadius:10,fontSize:13,fontWeight:700,letterSpacing:'0.04em',cursor:'pointer',textTransform:'uppercase'}}>
            ЗАВЕРШИТЬ
          </button>
        </div>

        {/* Workout name */}
        <div>
          <div style={{fontSize:18,fontWeight:700,color:'var(--text)',letterSpacing:'-0.02em'}}>{state.workout.name}</div>
          <div style={{fontSize:13,color:'var(--text-muted)',marginTop:2,fontWeight:500}}>{state.workout.exercises.length} упражнений</div>
        </div>

        {/* Exercise cards */}
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {state.workout.exercises.slice(0,2).map((ex,exIdx) => {
            const sets = state.setsLog[ex.id] || Array(ex.sets).fill({done:false,reps:'',weight:ex.weight});
            const isFirst = exIdx === 0;
            return (
              <div key={ex.id} style={{background:'var(--surface)',borderRadius:14,overflow:'hidden'}}>
                <button onClick={()=>openExercise(ex.id)} style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:'none',border:'none',cursor:'pointer',textAlign:'left'}}>
                  <div style={{width:36,height:36,borderRadius:10,background:'var(--accent-dim)',color:'var(--accent)',fontSize:14,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}>{exIdx+1}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:15,fontWeight:600,color:'var(--text)',letterSpacing:'-0.01em'}}>{ex.name}</div>
                    <div style={{fontSize:12,color:'var(--text-muted)',marginTop:2,fontWeight:500}}>{ex.sets} подходов · {ex.reps} повторений</div>
                  </div>
                  <I.Caret c="var(--text-dim)"/>
                </button>

                {isFirst && (
                  <div style={{padding:'0 14px 14px',display:'flex',flexDirection:'column',gap:10}}>
                    {/* Weight stepper */}
                    <div style={{display:'flex',alignItems:'center',gap:6,padding:'8px 4px'}}>
                      <button onClick={()=>dispatch({type:'SET_WEIGHT',exId:ex.id,w:Math.max(0,(sets[0].weight||ex.weight)-2.5)})} style={{width:32,height:32,borderRadius:8,background:'var(--surface2)',border:'none',color:'var(--text)',cursor:'pointer',fontSize:18,fontWeight:600}}>−</button>
                      <div style={{flex:1,padding:'8px 12px',background:'var(--surface2)',borderRadius:8,fontSize:13,fontWeight:600,color:'var(--text)',display:'flex',alignItems:'center',gap:6}}>
                        <span style={{color:'var(--text-muted)',fontSize:12}}>Вес:</span>
                        <span>{sets[0].weight || ex.weight} кг</span>
                      </div>
                      <button onClick={()=>dispatch({type:'SET_WEIGHT',exId:ex.id,w:(sets[0].weight||ex.weight)+2.5})}
                        style={{padding:'8px 14px',borderRadius:8,background:'var(--accent-dim)',border:'none',color:'var(--accent)',cursor:'pointer',fontSize:13,fontWeight:700}}>+2.5</button>
                      <button onClick={()=>dispatch({type:'SET_WEIGHT',exId:ex.id,w:(sets[0].weight||ex.weight)+5})}
                        style={{padding:'8px 14px',borderRadius:8,background:'var(--accent-dim)',border:'none',color:'var(--accent)',cursor:'pointer',fontSize:13,fontWeight:700}}>+5</button>
                    </div>

                    {/* Sets list */}
                    {sets.map((set,i) => (
                      <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 12px',background:'var(--surface2)',borderRadius:10}}>
                        <span style={{fontSize:13,color:'var(--text-muted)',fontWeight:500}}>{i+1} подход</span>
                        <div style={{display:'flex',alignItems:'center',gap:14}}>
                          <span style={{fontSize:14,color:'var(--text)',fontWeight:600,fontVariantNumeric:'tabular-nums'}}>
                            {set.done && set.reps>0 ? `${set.reps} повт.` : (i===1 ? '9 повт.' : '—')}
                          </span>
                          <button onClick={()=>dispatch({type:'TOGGLE_SET',exId:ex.id,i})}
                            style={{width:22,height:22,borderRadius:6,border:'none',background:set.done?'var(--accent)':'var(--surface)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
                            {set.done && <I.Check c="#000" s={14}/>}
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Rest + start timer */}
                    <div style={{display:'flex',gap:8,marginTop:2}}>
                      <div style={{flex:1,padding:'10px 14px',background:'var(--surface2)',borderRadius:10,fontSize:13,color:'var(--text-muted)',fontWeight:500}}>Отдых: {state.restTime} сек</div>
                      <button onClick={openRest} style={{padding:'10px 16px',background:'var(--accent)',color:'#000',border:'none',borderRadius:10,fontSize:12,fontWeight:700,letterSpacing:'0.04em',cursor:'pointer',textTransform:'uppercase'}}>НАЧАТЬ ТАЙМЕР</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Remaining exercises (collapsed) */}
          {state.workout.exercises.slice(2).map((ex,idx) => (
            <button key={ex.id} onClick={()=>openExercise(ex.id)}
              style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:'var(--surface)',borderRadius:14,border:'none',cursor:'pointer',textAlign:'left'}}>
              <div style={{width:36,height:36,borderRadius:10,background:'var(--surface2)',color:'var(--text-muted)',fontSize:14,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}>{idx+3}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:15,fontWeight:600,color:'var(--text)'}}>{ex.name}</div>
                <div style={{fontSize:12,color:'var(--text-muted)',marginTop:2,fontWeight:500}}>{ex.sets} подходов · {ex.reps} повторений</div>
              </div>
              <I.Caret c="var(--text-dim)"/>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── EXERCISE DETAIL ─────────────────────────────────────────────────────

function ExerciseScreen({ state, dispatch, goBack }) {
  const ex = state.workout.exercises.find(e=>e.id===state.currentExerciseId) || state.workout.exercises[0];
  const [tag, setTag] = useState(ex.tag || 'Базовое');

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{display:'flex',alignItems:'center',padding:'10px 12px'}}>
        <button onClick={goBack} style={{width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',background:'none',border:'none',cursor:'pointer'}}>
          <I.Back c="var(--text)"/>
        </button>
        <div style={{flex:1,fontSize:16,fontWeight:600,textAlign:'center'}}>Упражнение</div>
        <button style={{width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',background:'none',border:'none',cursor:'pointer'}}>
          <I.More c="var(--text)"/>
        </button>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'8px 16px 24px',display:'flex',flexDirection:'column',gap:16}}>
        {/* Image */}
        <div style={{background:'var(--surface)',borderRadius:14,overflow:'hidden',aspectRatio:'16/11',display:'flex',alignItems:'center',justifyContent:'center'}}>
          {ex.image ? (
            <img src={ex.image} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
          ) : (
            <ExercisePlaceholder name={ex.name}/>
          )}
        </div>

        <div>
          <div style={{fontSize:24,fontWeight:700,color:'var(--text)',letterSpacing:'-0.02em'}}>{ex.name}</div>
          <div style={{display:'flex',gap:6,marginTop:10}}>
            <span style={{padding:'5px 12px',borderRadius:20,fontSize:12,fontWeight:600,background:'var(--accent-dim)',color:'var(--accent)'}}>{ex.muscle}</span>
            <span style={{padding:'5px 12px',borderRadius:20,fontSize:12,fontWeight:600,background:'var(--surface)',color:'var(--text-muted)'}}>{ex.tag}</span>
          </div>
        </div>

        {/* Technique */}
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <span style={{fontSize:16,fontWeight:700,color:'var(--text)',letterSpacing:'-0.01em'}}>Техника</span>
            <button style={{background:'none',border:'none',color:'var(--accent)',fontSize:13,fontWeight:500,cursor:'pointer'}}>Смотри видео</button>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {ex.tech.map((t,i)=>(
              <div key={i} style={{display:'flex',alignItems:'flex-start',gap:10}}>
                <div style={{width:5,height:5,borderRadius:'50%',background:'var(--accent)',marginTop:7,flexShrink:0}}/>
                <span style={{fontSize:14,color:'var(--text)',lineHeight:1.5}}>{t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* History */}
        {ex.history && ex.history.length>0 && (
          <div>
            <div style={{fontSize:16,fontWeight:700,color:'var(--text)',marginBottom:10,letterSpacing:'-0.01em'}}>История</div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {ex.history.map((h,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 14px',background:'var(--surface)',borderRadius:12}}>
                  <span style={{fontSize:13,color:'var(--text-muted)',fontWeight:500,minWidth:60}}>{h.date}</span>
                  <span style={{fontSize:14,color:'var(--text)',fontWeight:600,fontVariantNumeric:'tabular-nums'}}>{h.sets}</span>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <span style={{fontSize:14,color:'var(--text)',fontWeight:600,fontVariantNumeric:'tabular-nums'}}>{h.weight} кг</span>
                    <I.TrendUp c="var(--accent)" s={14}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ExercisePlaceholder({ name }) {
  return (
    <div style={{width:'100%',height:'100%',background:'linear-gradient(135deg,#2a2a2d,#1f1f22)',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:8,color:'var(--text-dim)'}}>
      <I.Dumb c="var(--text-dim)" s={48}/>
      <span style={{fontSize:13,fontWeight:500}}>{name}</span>
    </div>
  );
}

// ─── REST TIMER ─────────────────────────────────────────────────────────

function RestScreen({ state, dispatch, goBack }) {
  const total = state.restTime;
  const remain = state.restRemaining;
  const elapsed = total - remain;
  const pct = elapsed/total;
  const r = 130;
  const circ = 2*Math.PI*r;

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{display:'flex',alignItems:'center',padding:'10px 12px'}}>
        <button onClick={goBack} style={{width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',background:'none',border:'none',cursor:'pointer'}}>
          <I.Back c="var(--text)"/>
        </button>
        <div style={{flex:1,fontSize:16,fontWeight:600,textAlign:'center'}}>Таймер отдыха</div>
        <div style={{width:36}}/>
      </div>

      <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:32,padding:24}}>
        <div style={{position:'relative',width:300,height:300,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <svg width={300} height={300} style={{position:'absolute',inset:0,transform:'rotate(-90deg)'}}>
            <circle cx={150} cy={150} r={r} fill="none" stroke="var(--surface)" strokeWidth="14"/>
            <circle cx={150} cy={150} r={r} fill="none" stroke="var(--accent)" strokeWidth="14" strokeLinecap="round"
              strokeDasharray={`${circ*pct} ${circ}`} style={{transition:'stroke-dasharray 1s linear'}}/>
          </svg>
          <div style={{textAlign:'center',zIndex:2}}>
            <div style={{fontSize:64,fontWeight:700,color:'var(--text)',letterSpacing:'-0.04em',fontVariantNumeric:'tabular-nums',lineHeight:1}}>{fmt(remain)}</div>
            <div style={{fontSize:14,color:'var(--text-muted)',marginTop:6,fontWeight:500}}>из {fmt(total)}</div>
          </div>
        </div>

        <div style={{textAlign:'center'}}>
          <div style={{fontSize:18,fontWeight:700,color:'var(--text)',letterSpacing:'-0.01em'}}>Жим лёжа</div>
          <div style={{fontSize:13,color:'var(--text-muted)',marginTop:4,fontWeight:500}}>3 подхода из 4</div>
        </div>

        <button onClick={()=>dispatch({type:'SKIP_REST'})}
          style={{padding:'14px 32px',background:'var(--surface)',color:'var(--text)',border:'none',borderRadius:12,fontSize:14,fontWeight:700,letterSpacing:'0.04em',cursor:'pointer',textTransform:'uppercase'}}>
          ПРОПУСТИТЬ ОТДЫХ
        </button>
      </div>
    </div>
  );
}

// Export to window for next file
Object.assign(window, { HomeScreen, WorkoutScreen, ExerciseScreen, RestScreen, BottomNav, Spark, fmt, I, reducer, initialState, PROGRESS_DATA, FOOD_LOG, PROFILE, TODAY_WORKOUT, NEXT_WORKOUT });
