// ════════════════════════════════════════════════════════════════════════
// FitTrack Pro — экраны Прогресс / Питание / Профиль / Завершение / App
// ════════════════════════════════════════════════════════════════════════

const { useState: uS, useReducer: uR, useEffect: uE, useRef: uRf } = React;
const { I, Spark, fmt, BottomNav, HomeScreen, WorkoutScreen, ExerciseScreen, RestScreen, reducer, initialState, PROGRESS_DATA, FOOD_LOG, PROFILE, TODAY_WORKOUT, NEXT_WORKOUT } = window;

// ─── PROGRESS SCREEN ────────────────────────────────────────────────────

const WEIGHT_HISTORY = [93, 92.7, 92.5, 92.3, 92, 91.8, 91.6, 91.3, 91, 90.7, 90.4, 90.2, 90, 90.1, 89.9, 90, 89.8, 90, 89.9, 89.7, 89.8, 89.5, 89.6, 89.4, 90];

function ProgressScreen() {
  const [tab, setTab] = uS('weight');
  const [period, setPeriod] = uS('month');
  const data = WEIGHT_HISTORY;

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{display:'flex',alignItems:'center',padding:'10px 12px'}}>
        <div style={{width:36}}/>
        <div style={{flex:1,fontSize:16,fontWeight:600,textAlign:'center'}}>Прогресс</div>
        <button style={{width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',background:'none',border:'none',cursor:'pointer'}}>
          <I.More c="var(--text)"/>
        </button>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'4px 16px 20px',display:'flex',flexDirection:'column',gap:16}}>
        {/* Tabs */}
        <div style={{display:'flex',background:'var(--surface)',borderRadius:12,padding:4,gap:4}}>
          {[['weight','Вес'],['exercises','Тренировки'],['measurements','Замеры']].map(([k,v])=>(
            <button key={k} onClick={()=>setTab(k)}
              style={{flex:1,padding:'9px',borderRadius:9,border:'none',cursor:'pointer',fontSize:13,fontWeight:600,
                background:tab===k?'var(--accent)':'transparent',color:tab===k?'#000':'var(--text-muted)',transition:'all 0.15s'}}>
              {v}
            </button>
          ))}
        </div>

        {/* Title block */}
        <div>
          <div style={{fontSize:14,fontWeight:600,color:'var(--text-muted)'}}>Вес тела</div>
          <div style={{display:'flex',alignItems:'baseline',gap:10,marginTop:6}}>
            <span style={{fontSize:38,fontWeight:700,color:'var(--text)',letterSpacing:'-0.03em'}}>90</span>
            <span style={{fontSize:18,color:'var(--text-muted)',fontWeight:600}}>кг</span>
            <span style={{fontSize:13,fontWeight:600,color:'var(--accent)',marginLeft:6}}>−3 кг за месяц</span>
          </div>
        </div>

        {/* Period chips */}
        <div style={{display:'flex',gap:6}}>
          {[['week','Неделя'],['month','Месяц'],['3month','3 месяца'],['year','Год']].map(([k,v])=>(
            <button key={k} onClick={()=>setPeriod(k)}
              style={{flex:1,padding:'8px',borderRadius:8,border:'none',cursor:'pointer',fontSize:12,fontWeight:600,
                background:period===k?'var(--surface)':'transparent',color:period===k?'var(--text)':'var(--text-muted)',transition:'all 0.15s'}}>
              {v}
            </button>
          ))}
        </div>

        {/* Big chart */}
        <div style={{background:'var(--surface)',borderRadius:14,padding:'16px 12px 12px'}}>
          <BigChart points={data}/>
          <div style={{display:'flex',justifyContent:'space-between',padding:'8px 6px 0',fontSize:11,color:'var(--text-dim)',fontWeight:500}}>
            <span>24 апр</span><span>1 мая</span><span>8 мая</span><span>16 мая</span><span>22 мая</span>
          </div>
        </div>

        {/* Stats */}
        <div>
          <div style={{fontSize:14,fontWeight:700,color:'var(--text)',marginBottom:10}}>Статистика</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
            {[['−3 кг','Изменение веса','var(--accent)'],['28','Тренировок','var(--text)'],['85%','Выполнено','var(--text)']].map(([v,l,c])=>(
              <div key={l} style={{background:'var(--surface)',borderRadius:12,padding:'14px 10px',textAlign:'center'}}>
                <div style={{fontSize:20,fontWeight:700,color:c,letterSpacing:'-0.02em'}}>{v}</div>
                <div style={{fontSize:11,color:'var(--text-muted)',marginTop:4,fontWeight:500,lineHeight:1.2}}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Trends */}
        <div>
          <div style={{fontSize:14,fontWeight:700,color:'var(--text)',marginBottom:10}}>Тренды</div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {[['Силовых показателей','+12%'],['Объём тренировок','+8%']].map(([l,v])=>(
              <div key={l} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 16px',background:'var(--surface)',borderRadius:12}}>
                <span style={{fontSize:14,color:'var(--text)',fontWeight:500}}>{l}</span>
                <span style={{fontSize:14,color:'var(--accent)',fontWeight:700}}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BigChart({ points }) {
  const w = 360, h = 180, pad = 12;
  const min = Math.min(...points), max = Math.max(...points);
  const range = max-min || 1;
  const stepX = (w - pad*2) / (points.length-1);
  const xy = points.map((p,i) => [pad + i*stepX, h - pad - ((p-min)/range)*(h-pad*2)]);
  const path = xy.map(([x,y],i) => `${i===0?'M':'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const fillPath = path + ` L${w-pad},${h-pad} L${pad},${h-pad} Z`;
  const last = xy[xy.length-1];
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{display:'block'}}>
      <defs>
        <linearGradient id="bg-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35"/>
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0"/>
        </linearGradient>
      </defs>
      {[0.25,0.5,0.75].map(p => (
        <line key={p} x1={pad} x2={w-pad} y1={pad+(h-pad*2)*p} y2={pad+(h-pad*2)*p} stroke="var(--surface2)" strokeWidth="1" strokeDasharray="2 4"/>
      ))}
      <path d={fillPath} fill="url(#bg-grad)"/>
      <path d={path} stroke="var(--accent)" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={last[0]} cy={last[1]} r="5" fill="var(--accent)" stroke="var(--bg)" strokeWidth="2"/>
      <g transform={`translate(${last[0]+8},${last[1]-22})`}>
        <rect x="0" y="0" width="36" height="20" rx="6" fill="var(--accent)"/>
        <text x="18" y="13" textAnchor="middle" fontSize="11" fontWeight="700" fill="#000">90</text>
      </g>
    </svg>
  );
}

// ─── FOOD SCREEN ────────────────────────────────────────────────────────

function FoodScreen({ state }) {
  const [day, setDay] = uS(0); // 0 = today
  const cal = state.caloriesEaten, goal = state.calorieGoal, remain = goal - cal;
  const r = 70, circ = 2*Math.PI*r;
  const pct = cal/goal;

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{display:'flex',alignItems:'center',padding:'10px 12px'}}>
        <div style={{width:36}}/>
        <div style={{flex:1,fontSize:16,fontWeight:600,textAlign:'center'}}>Питание</div>
        <button style={{width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',background:'none',border:'none',cursor:'pointer'}}>
          <I.More c="var(--text)"/>
        </button>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'4px 16px 20px',display:'flex',flexDirection:'column',gap:16}}>
        {/* Day switcher */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:14,padding:'8px 0'}}>
          <button onClick={()=>setDay(day-1)} style={{width:32,height:32,borderRadius:'50%',background:'var(--surface)',border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
            <I.Caret c="var(--text)" dir="left"/>
          </button>
          <span style={{fontSize:15,fontWeight:600,color:'var(--text)'}}>{day===0 ? 'Сегодня' : day===-1 ? 'Вчера' : day===1 ? 'Завтра' : `${Math.abs(day)} ${day<0?'дн назад':'дн вперёд'}`}</span>
          <button onClick={()=>setDay(day+1)} style={{width:32,height:32,borderRadius:'50%',background:'var(--surface)',border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
            <I.Caret c="var(--text)"/>
          </button>
        </div>

        {/* Calorie ring + summary */}
        <div style={{background:'var(--surface)',borderRadius:14,padding:'18px 18px 16px',display:'flex',alignItems:'center',gap:18}}>
          <svg width={170} height={170} viewBox="0 0 170 170">
            <circle cx={85} cy={85} r={r} fill="none" stroke="var(--surface2)" strokeWidth="14"/>
            <circle cx={85} cy={85} r={r} fill="none" stroke="var(--accent)" strokeWidth="14" strokeLinecap="round"
              strokeDasharray={`${circ*pct} ${circ}`}
              style={{transform:'rotate(-90deg)',transformOrigin:'85px 85px',transition:'stroke-dasharray 0.6s ease'}}/>
            <text x="85" y="78" textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--text-muted)">Калории</text>
            <text x="85" y="100" textAnchor="middle" fontSize="26" fontWeight="700" fill="var(--text)" letterSpacing="-1">{cal}</text>
          </svg>
          <div style={{flex:1}}>
            <div style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--surface2)'}}>
              <div>
                <div style={{fontSize:11,color:'var(--text-muted)',fontWeight:500}}>Съедено</div>
                <div style={{fontSize:18,fontWeight:700,color:'var(--text)',marginTop:2}}>{cal}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:11,color:'var(--text-muted)',fontWeight:500}}>Осталось</div>
                <div style={{fontSize:18,fontWeight:700,color:'var(--accent)',marginTop:2}}>{remain}</div>
              </div>
            </div>
            <div style={{padding:'8px 0 0',fontSize:12,color:'var(--text-muted)',fontWeight:500}}>Цель: {goal} ккал</div>
          </div>
        </div>

        {/* Macros */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
          {[
            {label:'Белки',  v:state.protein.v, g:state.protein.g, color:'var(--accent)'},
            {label:'Жиры',   v:state.fats.v,    g:state.fats.g,    color:'var(--orange)'},
            {label:'Углеводы',v:state.carbs.v,  g:state.carbs.g,   color:'var(--blue)'},
          ].map(m=>{
            const pct = Math.min(m.v/m.g,1);
            return (
              <div key={m.label} style={{background:'var(--surface)',borderRadius:12,padding:'14px 12px'}}>
                <div style={{fontSize:12,fontWeight:600,color:'var(--text)'}}>{m.label}</div>
                <div style={{fontSize:13,fontWeight:700,color:m.color,marginTop:6,fontVariantNumeric:'tabular-nums'}}>{m.v} <span style={{color:'var(--text-muted)',fontWeight:500}}>/ {m.g} г</span></div>
                <div style={{height:4,background:'var(--surface2)',borderRadius:2,marginTop:8,overflow:'hidden'}}>
                  <div style={{height:'100%',background:m.color,borderRadius:2,width:`${pct*100}%`,transition:'width 0.5s'}}/>
                </div>
              </div>
            );
          })}
        </div>

        {/* Meals */}
        <div>
          <div style={{fontSize:14,fontWeight:700,color:'var(--text)',marginBottom:10}}>Приёмы пищи</div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {FOOD_LOG.map(m=>(
              <div key={m.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:'var(--surface)',borderRadius:12}}>
                <div style={{width:40,height:40,borderRadius:10,background:'var(--surface2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>{m.emoji}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'baseline',gap:8}}>
                    <span style={{fontSize:14,fontWeight:600,color:'var(--text)'}}>{m.meal}</span>
                    <span style={{fontSize:12,color:'var(--text-muted)'}}>{m.time}</span>
                  </div>
                  <div style={{fontSize:12,color:'var(--text-muted)',marginTop:2,fontWeight:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{m.cal} ккал · {m.items}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add */}
        <button style={{width:'100%',padding:'14px',background:'transparent',color:'var(--accent)',border:'1.5px dashed var(--accent)',borderRadius:12,fontSize:13,fontWeight:700,letterSpacing:'0.04em',cursor:'pointer',textTransform:'uppercase',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
          <I.Plus c="var(--accent)" s={16}/>
          ДОБАВИТЬ ПРИЁМ ПИЩИ
        </button>
      </div>
    </div>
  );
}

// ─── PROFILE SCREEN ─────────────────────────────────────────────────────

function ProfileScreen() {
  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{display:'flex',alignItems:'center',padding:'10px 12px'}}>
        <div style={{width:36}}/>
        <div style={{flex:1,fontSize:16,fontWeight:600,textAlign:'center'}}>План и профиль</div>
        <button style={{width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',background:'none',border:'none',cursor:'pointer'}}>
          <I.More c="var(--text)"/>
        </button>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'4px 16px 20px',display:'flex',flexDirection:'column',gap:18}}>
        {/* Plan */}
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <span style={{fontSize:14,fontWeight:700,color:'var(--text)'}}>Твой план</span>
            <button style={{background:'none',border:'none',color:'var(--accent)',fontSize:13,fontWeight:600,cursor:'pointer'}}>Изменить</button>
          </div>
          <div style={{background:'var(--surface)',borderRadius:14,padding:'16px 18px'}}>
            <div style={{fontSize:18,fontWeight:700,color:'var(--text)',letterSpacing:'-0.02em'}}>{PROFILE.plan.name}</div>
            <div style={{fontSize:13,color:'var(--text-muted)',marginTop:3,fontWeight:500}}>{PROFILE.plan.perWeek} тренировки в неделю</div>
            <div style={{display:'flex',justifyContent:'space-between',marginTop:14}}>
              {PROFILE.plan.days.map((d,i)=>(
                <div key={d} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
                  <span style={{fontSize:11,color:'var(--text-muted)',fontWeight:600}}>{d}</span>
                  <div style={{width:26,height:26,borderRadius:'50%',background:PROFILE.plan.done[i]?'var(--accent)':'var(--surface2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {PROFILE.plan.done[i] ? <I.Check c="#000" s={14}/> : <span style={{fontSize:10,color:'var(--text-dim)'}}>·</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Profile data */}
        <div>
          <div style={{fontSize:14,fontWeight:700,color:'var(--text)',marginBottom:10}}>Профиль</div>
          <div style={{background:'var(--surface)',borderRadius:14,overflow:'hidden'}}>
            {[['Имя',PROFILE.name],['Рост',`${PROFILE.height} см`],['Вес',`${PROFILE.weight} кг`],['Возраст',`${PROFILE.age} лет`],['Опыт тренировок',PROFILE.experience],['Цель',PROFILE.goal]].map(([k,v],i,arr)=>(
              <div key={k} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 16px',borderBottom:i<arr.length-1?'1px solid var(--surface2)':'none'}}>
                <span style={{fontSize:14,color:'var(--text-muted)',fontWeight:500}}>{k}</span>
                <span style={{fontSize:14,color:'var(--text)',fontWeight:600}}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Settings */}
        <div>
          <div style={{fontSize:14,fontWeight:700,color:'var(--text)',marginBottom:10}}>Настройки</div>
          <div style={{background:'var(--surface)',borderRadius:14,overflow:'hidden'}}>
            {['Уведомления','Единицы измерения','Резервная копия','О приложении'].map((l,i,arr)=>(
              <button key={l} style={{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 16px',background:'none',border:'none',borderBottom:i<arr.length-1?'1px solid var(--surface2)':'none',cursor:'pointer'}}>
                <span style={{fontSize:14,color:'var(--text)',fontWeight:500}}>{l}</span>
                <I.Caret c="var(--text-dim)"/>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── COMPLETION SCREEN ──────────────────────────────────────────────────

function CompletionScreen({ goBack, save }) {
  const [mood, setMood] = uS(null);
  const [pain, setPain] = uS(null);
  const [comment, setComment] = uS('');

  const moods = [['🥶','Лёгко'],['🙂','Нормально'],['😅','Тяжело'],['🥵','Очень тяжело']];

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{display:'flex',alignItems:'center',padding:'10px 12px'}}>
        <button onClick={goBack} style={{width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',background:'none',border:'none',cursor:'pointer'}}>
          <I.Back c="var(--text)"/>
        </button>
        <div style={{flex:1,fontSize:16,fontWeight:600,textAlign:'center'}}>Завершение тренировки</div>
        <div style={{width:36}}/>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'8px 18px 20px',display:'flex',flexDirection:'column',gap:18}}>
        {/* Confetti + check */}
        <div style={{position:'relative',padding:'24px 0 8px',display:'flex',flexDirection:'column',alignItems:'center'}}>
          <Confetti/>
          <div style={{width:80,height:80,borderRadius:'50%',background:'var(--accent)',display:'flex',alignItems:'center',justifyContent:'center',animation:'pop 0.5s ease',position:'relative',zIndex:2}}>
            <I.Check c="#000" s={40}/>
          </div>
          <div style={{fontSize:22,fontWeight:700,color:'var(--text)',marginTop:18,letterSpacing:'-0.02em'}}>Тренировка завершена!</div>
        </div>

        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
          {[['55:20','Время'],['6','Упражнений'],['18','Подходов']].map(([v,l])=>(
            <div key={l} style={{background:'var(--surface)',borderRadius:12,padding:'14px 8px',textAlign:'center'}}>
              <div style={{fontSize:18,fontWeight:700,color:'var(--text)',letterSpacing:'-0.02em',fontVariantNumeric:'tabular-nums'}}>{v}</div>
              <div style={{fontSize:11,color:'var(--text-muted)',marginTop:4,fontWeight:500}}>{l}</div>
            </div>
          ))}
        </div>

        {/* Mood */}
        <div>
          <div style={{fontSize:14,fontWeight:600,color:'var(--text)',marginBottom:10}}>Как прошла тренировка?</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:6}}>
            {moods.map(([emoji,label])=>(
              <button key={label} onClick={()=>setMood(label)}
                style={{padding:'12px 4px',borderRadius:12,background:mood===label?'var(--accent-dim)':'var(--surface)',border:`1.5px solid ${mood===label?'var(--accent)':'transparent'}`,cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:4,transition:'all 0.15s'}}>
                <span style={{fontSize:24}}>{emoji}</span>
                <span style={{fontSize:11,color:mood===label?'var(--accent)':'var(--text-muted)',fontWeight:600}}>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Pain */}
        <div>
          <div style={{fontSize:14,fontWeight:600,color:'var(--text)',marginBottom:10}}>Была боль?</div>
          <div style={{display:'flex',gap:8}}>
            {['Да','Нет'].map(v=>(
              <button key={v} onClick={()=>setPain(v)}
                style={{flex:1,padding:'12px',borderRadius:10,background:pain===v?'var(--accent)':'var(--surface)',color:pain===v?'#000':'var(--text)',border:'none',fontSize:14,fontWeight:600,cursor:'pointer',transition:'all 0.15s'}}>
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Comment */}
        <div>
          <div style={{fontSize:14,fontWeight:600,color:'var(--text)',marginBottom:10}}>Комментарий (необязательно)</div>
          <textarea value={comment} onChange={e=>setComment(e.target.value)}
            placeholder="Как всё прошло?"
            style={{width:'100%',padding:'12px 14px',background:'var(--surface)',color:'var(--text)',border:'none',borderRadius:12,fontSize:14,resize:'none',minHeight:80,lineHeight:1.5,boxSizing:'border-box',fontFamily:'inherit'}}/>
        </div>

        <button onClick={save}
          style={{width:'100%',padding:'15px',background:'var(--accent)',color:'#000',border:'none',borderRadius:12,fontSize:14,fontWeight:700,letterSpacing:'0.05em',cursor:'pointer',textTransform:'uppercase'}}>
          СОХРАНИТЬ
        </button>
      </div>
    </div>
  );
}

function Confetti() {
  const dots = Array.from({length:24}).map((_,i)=>({
    x: Math.random()*100,
    y: Math.random()*60,
    c: ['#3DDC5C','#5AC8FA','#FFD60A','#FF9F0A','#FF375F'][i%5],
    r: 2 + Math.random()*2,
  }));
  return (
    <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:1}} viewBox="0 0 100 100" preserveAspectRatio="none">
      {dots.map((d,i)=>(<circle key={i} cx={d.x} cy={d.y} r={d.r} fill={d.c} opacity="0.8"/>))}
    </svg>
  );
}

// ─── DAY ANALYSIS SCREEN ─────────────────────────────────────────────────

function AnalysisScreen({ goBack, state }) {
  const [loading, setLoading] = uS(true);
  const [data, setData] = uS(null);

  uE(()=>{
    const t = setTimeout(()=>{
      const calDeficit = state.calorieGoal - state.caloriesEaten;
      const proteinPct = Math.round((state.protein.v/state.protein.g)*100);
      setData({
        score: 8.4,
        nutrition: {
          status: calDeficit > 200 ? 'warning' : 'ok',
          title: calDeficit > 200 ? `Дефицит ${calDeficit} ккал` : 'Калории в норме',
          text: calDeficit > 200
            ? `До цели не хватает ${calDeficit} ккал. Добавь перекус: горсть орехов или творог с мёдом.`
            : `Ты съел ${state.caloriesEaten} из ${state.calorieGoal} ккал — отличный баланс для набора массы.`,
        },
        macros: {
          status: proteinPct >= 75 ? 'ok' : 'warning',
          title: `Белка ${proteinPct}%`,
          text: proteinPct >= 75
            ? `Достаточно для роста мышц. Углеводы и жиры тоже в пределах нормы.`
            : `Низковато — добавь ещё одну порцию белка (куриная грудка ~150г).`,
        },
        workout: {
          status: 'ok',
          title: 'Грудь + Трицепс',
          text: `Хорошая интенсивность. В жиме лёжа +2.5 кг к прошлой неделе — прогрессия идёт. Восстановление займёт ~48ч.`,
        },
        tips: [
          'Выпей ещё 500 мл воды до сна — обезвоживание тормозит рост мышц',
          'Завтра тренировка ног — добавь 60 г углеводов на завтрак',
          'Ложись спать до 23:00 — пик секреции гормона роста с 23:00 до 02:00',
        ],
      });
      setLoading(false);
    }, 1400);
    return ()=>clearTimeout(t);
  },[]);

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{display:'flex',alignItems:'center',padding:'10px 12px'}}>
        <button onClick={goBack} style={{width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',background:'none',border:'none',cursor:'pointer'}}>
          <I.Back c="var(--text)"/>
        </button>
        <div style={{flex:1,fontSize:16,fontWeight:600,textAlign:'center'}}>Анализ дня</div>
        <div style={{width:36}}/>
      </div>

      {loading ? (
        <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:18,padding:24}}>
          <div style={{width:60,height:60,borderRadius:'50%',border:'3px solid var(--surface)',borderTopColor:'var(--accent)',animation:'spin 0.9s linear infinite'}}/>
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:16,fontWeight:600,color:'var(--text)',letterSpacing:'-0.01em'}}>ИИ анализирует твой день…</div>
            <div style={{fontSize:13,color:'var(--text-muted)',marginTop:6,fontWeight:500}}>Питание · Тренировка · Восстановление</div>
          </div>
        </div>
      ) : (
        <div style={{flex:1,overflowY:'auto',padding:'4px 16px 24px',display:'flex',flexDirection:'column',gap:14}}>
          {/* Score */}
          <div style={{background:'linear-gradient(135deg, rgba(61,220,92,0.15), rgba(61,220,92,0.04))',border:'1px solid rgba(61,220,92,0.3)',borderRadius:14,padding:'18px 20px',display:'flex',alignItems:'center',gap:16}}>
            <div style={{width:64,height:64,borderRadius:'50%',background:'var(--accent)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <span style={{fontSize:24,fontWeight:700,color:'#000',letterSpacing:'-0.03em'}}>{data.score}</span>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:15,fontWeight:700,color:'var(--text)',letterSpacing:'-0.01em'}}>Отличный день!</div>
              <div style={{fontSize:12,color:'var(--text-muted)',marginTop:4,fontWeight:500,lineHeight:1.4}}>Питание и тренировка соответствуют твоей цели — набор массы.</div>
            </div>
          </div>

          {/* Nutrition block */}
          <AnalysisCard icon="🥗" label="Питание" status={data.nutrition.status} title={data.nutrition.title} text={data.nutrition.text}/>
          <AnalysisCard icon="⚡" label="БЖУ" status={data.macros.status} title={data.macros.title} text={data.macros.text}/>
          <AnalysisCard icon="🏋️" label="Тренировка" status={data.workout.status} title={data.workout.title} text={data.workout.text}/>

          {/* Tips */}
          <div>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10,marginTop:6}}>
              <I.Sparkle c="var(--accent)" s={16}/>
              <span style={{fontSize:14,fontWeight:700,color:'var(--text)',letterSpacing:'-0.01em'}}>Рекомендации</span>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {data.tips.map((t,i)=>(
                <div key={i} style={{background:'var(--surface)',borderRadius:12,padding:'12px 14px',display:'flex',alignItems:'flex-start',gap:10}}>
                  <span style={{fontSize:14,fontWeight:700,color:'var(--accent)',minWidth:18,fontVariantNumeric:'tabular-nums'}}>{i+1}.</span>
                  <span style={{fontSize:13,color:'var(--text)',lineHeight:1.5,flex:1}}>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AnalysisCard({ icon, label, status, title, text }) {
  const c = status === 'ok' ? 'var(--accent)' : status === 'warning' ? 'var(--orange)' : 'var(--red)';
  return (
    <div style={{background:'var(--surface)',borderRadius:14,padding:'14px 16px'}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
        <span style={{fontSize:18}}>{icon}</span>
        <span style={{fontSize:12,fontWeight:600,color:'var(--text-muted)',letterSpacing:'0.02em',textTransform:'uppercase'}}>{label}</span>
        <div style={{marginLeft:'auto',width:8,height:8,borderRadius:'50%',background:c}}/>
      </div>
      <div style={{fontSize:15,fontWeight:700,color:'var(--text)',letterSpacing:'-0.01em'}}>{title}</div>
      <div style={{fontSize:13,color:'var(--text-muted)',marginTop:4,lineHeight:1.5}}>{text}</div>
    </div>
  );
}

function WorkoutHub({ state, openWorkout, goTo, openAnalysis }) {
  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{display:'flex',alignItems:'center',padding:'10px 12px'}}>
        <div style={{width:36}}/>
        <div style={{flex:1,fontSize:16,fontWeight:600,textAlign:'center'}}>Тренировки</div>
        <button style={{width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',background:'none',border:'none',cursor:'pointer'}}>
          <I.More c="var(--text)"/>
        </button>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'4px 16px 20px',display:'flex',flexDirection:'column',gap:18}}>
        {/* Today's workout */}
        <div>
          <div style={{fontSize:13,fontWeight:600,color:'var(--text-muted)',marginBottom:10,letterSpacing:'-0.01em'}}>Сегодня</div>
          <div style={{background:'var(--surface)',borderRadius:18,padding:'18px 18px 16px',display:'flex',flexDirection:'column',gap:14,position:'relative',overflow:'hidden'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12,position:'relative',zIndex:2}}>
              <div style={{flex:1}}>
                <div style={{fontSize:20,fontWeight:700,color:'var(--text)',letterSpacing:'-0.02em'}}>{TODAY_WORKOUT.name}</div>
                <div style={{fontSize:13,color:'var(--text-muted)',marginTop:4,fontWeight:500}}>{TODAY_WORKOUT.exerciseCount} упражнений · {TODAY_WORKOUT.minutes} мин</div>
              </div>
              <img src={TODAY_WORKOUT.image} alt="" style={{height:96,width:'auto',objectFit:'contain',marginTop:-12,marginRight:-8,marginBottom:-12,filter:'drop-shadow(0 4px 12px rgba(0,0,0,0.4))'}}/>
            </div>
            <button onClick={openWorkout}
              style={{width:'100%',padding:'14px',background:'var(--accent)',color:'#000',border:'none',borderRadius:12,fontSize:14,fontWeight:700,letterSpacing:'0.04em',cursor:'pointer',textTransform:'uppercase'}}>
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
            {PROGRESS_DATA.map(p => (
              <div key={p.name} style={{background:'var(--surface)',borderRadius:14,padding:'14px 16px',display:'flex',alignItems:'center',gap:14}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:600,color:'var(--text)'}}>{p.name}</div>
                  <div style={{fontSize:13,color:'var(--text-muted)',marginTop:2,fontWeight:500}}>
                    {p.prev} {p.unit} → <span style={{color:'var(--text)'}}>{p.current} {p.unit}</span>
                  </div>
                </div>
                <Spark points={p.points} color="var(--accent)" w={90} h={36}/>
                <div style={{fontSize:13,fontWeight:700,color:'var(--accent)',minWidth:46,textAlign:'right'}}>{p.trend}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendation */}
        <div style={{background:'rgba(61,220,92,0.08)',border:'1px solid rgba(61,220,92,0.25)',borderRadius:14,padding:'12px 14px',display:'flex',alignItems:'flex-start',gap:10}}>
          <I.Sparkle c="var(--accent)" s={18}/>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:600,color:'var(--text)',letterSpacing:'-0.01em'}}>Рекомендация</div>
            <div style={{fontSize:12,color:'var(--text-muted)',marginTop:3,lineHeight:1.4}}>Сегодня увеличь вес в жиме лёжа на <span style={{color:'var(--accent)',fontWeight:600}}>+2.5 кг</span></div>
          </div>
        </div>

        {/* Next workout */}
        <div>
          <div style={{fontSize:13,fontWeight:600,color:'var(--text-muted)',marginBottom:10,letterSpacing:'-0.01em'}}>Следующая тренировка</div>
          <div style={{background:'var(--surface)',borderRadius:14,padding:'14px 18px',display:'flex',alignItems:'center',gap:12,position:'relative',overflow:'hidden'}}>
            <div style={{flex:1}}>
              <div style={{fontSize:16,fontWeight:700,color:'var(--text)',letterSpacing:'-0.01em'}}>{NEXT_WORKOUT.name}</div>
              <div style={{fontSize:13,color:'var(--text-muted)',marginTop:2,fontWeight:500}}>{NEXT_WORKOUT.when} · {NEXT_WORKOUT.minutes} мин</div>
            </div>
            <img src={NEXT_WORKOUT.image} alt="" style={{height:72,width:'auto',objectFit:'contain',marginTop:-8,marginBottom:-12,marginRight:-12}}/>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── APP ────────────────────────────────────────────────────────────────

function App() {
  const [state, dispatch] = uR(reducer, initialState);
  const [tab, setTab] = uS('home');
  const [stack, setStack] = uS([]); // workout flow: [] | ['workout'] | ['workout','exercise'] | ['workout','rest'] | ['workout','complete']

  const top = stack[stack.length-1] || tab;

  // workout timer
  uE(()=>{
    if (top !== 'workout' && top !== 'rest' && top !== 'exercise') return;
    if (!state.workoutRunning) return;
    const id = setInterval(()=>dispatch({type:'TICK_WORKOUT'}),1000);
    return ()=>clearInterval(id);
  },[top, state.workoutRunning]);

  // rest timer
  uE(()=>{
    if (top !== 'rest') return;
    if (!state.restRunning || state.restRemaining<=0) return;
    const id = setInterval(()=>dispatch({type:'TICK_REST'}),1000);
    return ()=>clearInterval(id);
  },[top, state.restRunning, state.restRemaining]);

  const push = (v) => setStack(s => [...s, v]);
  const pop = () => setStack(s => s.slice(0,-1));
  const reset = () => setStack([]);

  let body;
  if (stack.length > 0 && top === 'session') body = <WorkoutScreen state={state} dispatch={dispatch} goBack={pop} openExercise={(id)=>{dispatch({type:'SET_EXERCISE',id});push('exercise');}} openRest={()=>push('rest')}/>;
  else if (top === 'exercise') body = <ExerciseScreen state={state} dispatch={dispatch} goBack={pop}/>;
  else if (top === 'rest') body = <RestScreen state={state} dispatch={dispatch} goBack={pop}/>;
  else if (top === 'complete') body = <CompletionScreen goBack={pop} save={reset}/>;
  else if (top === 'analysis') body = <AnalysisScreen goBack={pop} state={state}/>;
  else if (tab === 'home') body = <HomeScreen goTo={setTab} state={state} openWorkout={()=>push('session')} openAnalysis={()=>push('analysis')}/>;
  else if (tab === 'workout') body = <WorkoutHub state={state} openWorkout={()=>push('session')} goTo={setTab} openAnalysis={()=>push('analysis')}/>;
  else if (tab === 'progress') body = <ProgressScreen/>;
  else if (tab === 'food') body = <FoodScreen state={state}/>;
  else if (tab === 'profile') body = <ProfileScreen/>;

  const showNav = stack.length === 0;

  return (
    <IOSDevice dark={true} width={393} height={852}>
      <div style={{display:'flex',flexDirection:'column',height:'100%',background:'var(--bg)',color:'var(--text)'}}>
        <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column'}}>{body}</div>
        {showNav && <BottomNav active={tab} setActive={(t)=>{setTab(t);setStack([]);}}/>}
      </div>
    </IOSDevice>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
