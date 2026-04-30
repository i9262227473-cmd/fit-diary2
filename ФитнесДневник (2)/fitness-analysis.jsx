// ═══════════════════════════════════════════
// MACROS ANALYSIS VIEW
// ═══════════════════════════════════════════

function DonutChart({ segments, size=160, strokeWidth=18, label, sublabel }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const cx = size / 2, cy = size / 2;

  let offset = 0;
  const arcs = segments.map(seg => {
    const len = (seg.pct / 100) * circ;
    const arc = { ...seg, len, offset, circ };
    offset += len;
    return arc;
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{transform:'rotate(-90deg)'}}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--surface2)" strokeWidth={strokeWidth} />
      {arcs.map((arc, i) => arc.len > 0 && (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none"
          stroke={arc.color} strokeWidth={strokeWidth}
          strokeDasharray={`${arc.len} ${arc.circ - arc.len}`}
          strokeDashoffset={-arc.offset}
          strokeLinecap="round"
          style={{transition:'stroke-dasharray 0.6s ease'}}
        />
      ))}
      <text x={cx} y={cy - 8} textAnchor="middle"
        style={{fill:'var(--text)',fontSize:22,fontWeight:700,fontFamily:'var(--mono)',transform:'rotate(90deg)',transformOrigin:`${cx}px ${cy}px`}}>
        {label}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle"
        style={{fill:'var(--text-muted)',fontSize:12,fontFamily:'var(--font)',transform:'rotate(90deg)',transformOrigin:`${cx}px ${cy}px`}}>
        {sublabel}
      </text>
    </svg>
  );
}

function BarChart({ data, goal }) {
  const max = Math.max(...data.map(d => d.cal), goal, 1);
  return (
    <div style={bcStyles.wrap}>
      {data.map((d, i) => (
        <div key={i} style={bcStyles.col}>
          <div style={bcStyles.barWrap}>
            {/* goal line */}
            <div style={{...bcStyles.goalLine, bottom: `${(goal/max)*100}%`}} />
            <div style={{
              ...bcStyles.bar,
              height: `${(d.cal/max)*100}%`,
              background: d.isToday
                ? 'var(--accent)'
                : `oklch(0.62 0.18 145 / 0.4)`,
            }} />
          </div>
          <div style={{...bcStyles.dayLabel, ...(d.isToday?{color:'var(--accent)'}:{})}}>{d.day}</div>
          <div style={bcStyles.calLabel}>{d.cal}</div>
        </div>
      ))}
    </div>
  );
}

const bcStyles = {
  wrap: { display:'flex', gap:8, alignItems:'flex-end', height:180, padding:'0 4px' },
  col: { flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 },
  barWrap: { flex:1, width:'100%', position:'relative', display:'flex', alignItems:'flex-end' },
  bar: { width:'100%', borderRadius:'6px 6px 0 0', transition:'height 0.6s ease', minHeight:4 },
  goalLine: {
    position:'absolute', left:'-4px', right:'-4px', height:1,
    background:'oklch(0.72 0.15 75 / 0.6)', borderTop:'1px dashed oklch(0.72 0.15 75 / 0.6)',
  },
  dayLabel: { fontSize:12, color:'var(--text-muted)', fontWeight:500 },
  calLabel: { fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)' },
};

function AnalysisView({ state }) {
  const [aiAnalysis, setAiAnalysis] = React.useState(null);
  const [aiLoading, setAiLoading] = React.useState(false);
  const [selectedDay, setSelectedDay] = React.useState('today');

  const todayTotals = state.foodLog.reduce(
    (a, f) => ({ cal: a.cal+f.cal, p: a.p+f.p, fat: a.fat+f.f, c: a.c+f.c }),
    { cal:0, p:0, fat:0, c:0 }
  );

  const weekData = [
    ...WEEKLY_HISTORY,
    { day:'Сг', cal: todayTotals.cal, p: todayTotals.p, fat: todayTotals.fat, c: todayTotals.c, isToday:true },
  ];

  const displayTotals = selectedDay === 'today'
    ? todayTotals
    : (() => {
        const idx = ['Пн','Вт','Ср','Чт','Пт','Сб'].indexOf(selectedDay);
        const d = WEEKLY_HISTORY[idx];
        return d ? { cal:d.cal, p:d.p, fat:d.fat, c:d.c } : todayTotals;
      })();

  const totalMacros = displayTotals.p + displayTotals.fat + displayTotals.c;
  const pPct = totalMacros > 0 ? Math.round(displayTotals.p / totalMacros * 100) : 33;
  const fPct = totalMacros > 0 ? Math.round(displayTotals.fat / totalMacros * 100) : 33;
  const cPct = totalMacros > 0 ? 100 - pPct - fPct : 34;

  const donutSegs = [
    { pct: pPct, color:'var(--accent)', label:'Б' },
    { pct: fPct, color:'var(--teal)',   label:'Ж' },
    { pct: cPct, color:'var(--amber)',  label:'У' },
  ];

  const calPct = Math.min(Math.round(displayTotals.cal / state.calorieGoal * 100), 100);
  const calSegs = [
    { pct: calPct, color:'var(--accent)' },
    { pct: 100 - calPct, color:'transparent' },
  ];

  const runAI = () => {
    setAiLoading(true); setAiAnalysis(null);
    setTimeout(() => {
      const result = getMacroAnalysis(todayTotals, state.calorieGoal);
      setAiAnalysis(result); setAiLoading(false);
    }, 1800);
  };

  const s = anStyles;

  return (
    <div style={s.page}>
      <div style={s.pageTitle}>Анализ питания</div>

      {/* Day selector */}
      <div style={s.dayBar}>
        {['Пн','Вт','Ср','Чт','Пт','Сб'].map(d => (
          <button key={d} style={{...s.dayBtn,...(selectedDay===d?s.dayBtnActive:{})}}
            onClick={()=>setSelectedDay(d)}>{d}</button>
        ))}
        <button style={{...s.dayBtn,...(selectedDay==='today'?s.dayBtnActive:{})}}
          onClick={()=>setSelectedDay('today')}>Сегодня</button>
      </div>

      <div style={s.grid}>
        {/* Calorie ring */}
        <div style={s.card}>
          <div style={s.cardTitle}>Калории</div>
          <div style={s.chartCenter}>
            <DonutChart
              segments={calSegs} size={170} strokeWidth={16}
              label={displayTotals.cal}
              sublabel={`/ ${state.calorieGoal} ккал`}
            />
          </div>
          <div style={s.calProgressBar}>
            <div style={{...s.calBarFill, width:`${calPct}%`}} />
          </div>
          <div style={s.calStats}>
            <div style={s.calStat}>
              <span style={{color:'var(--accent)',fontFamily:'var(--mono)',fontWeight:600}}>{displayTotals.cal}</span>
              <span style={s.statLabel}>съедено</span>
            </div>
            <div style={s.calStat}>
              <span style={{color:'var(--text-muted)',fontFamily:'var(--mono)'}}>{Math.max(0,state.calorieGoal-displayTotals.cal)}</span>
              <span style={s.statLabel}>осталось</span>
            </div>
          </div>
        </div>

        {/* Macros donut */}
        <div style={s.card}>
          <div style={s.cardTitle}>БЖУ</div>
          <div style={s.donutRow}>
            <DonutChart
              segments={donutSegs} size={160} strokeWidth={18}
              label={`${pPct}%`} sublabel="белки"
            />
            <div style={s.macroLegend}>
              {[
                { label:'Белки',  val: displayTotals.p,   pct: pPct, color:'var(--accent)' },
                { label:'Жиры',   val: displayTotals.fat, pct: fPct, color:'var(--teal)'  },
                { label:'Углев.', val: displayTotals.c,   pct: cPct, color:'var(--amber)' },
              ].map(m => (
                <div key={m.label} style={s.legendRow}>
                  <div style={{...s.legendDot, background:m.color}} />
                  <div style={{flex:1}}>
                    <div style={s.legendLabel}>{m.label}</div>
                    <div style={s.legendBar}>
                      <div style={{...s.legendBarFill, width:`${m.pct}%`, background:m.color}} />
                    </div>
                  </div>
                  <span style={{...s.legendVal, color:m.color}}>{m.val.toFixed(1)}г</span>
                  <span style={s.legendPct}>{m.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Weekly chart */}
        <div style={{...s.card, gridColumn:'1/-1'}}>
          <div style={s.cardTitleRow}>
            <div style={s.cardTitle}>Калории за неделю</div>
            <span style={s.goalBadge}>Цель: {state.calorieGoal} ккал</span>
          </div>
          <BarChart data={weekData} goal={state.calorieGoal} />
        </div>

        {/* AI Analysis */}
        <div style={{...s.card, gridColumn:'1/-1'}}>
          <div style={s.cardTitleRow}>
            <div style={s.cardTitle}>
              <span style={{color:'var(--accent)',marginRight:6}}>✦</span>
              ИИ-анализ рациона
            </div>
            <button style={s.analyzeBtn} onClick={runAI} disabled={aiLoading}>
              {aiLoading ? 'Анализирую...' : 'Анализировать'}
            </button>
          </div>
          {!aiAnalysis && !aiLoading && (
            <p style={s.aiPrompt}>Нажми кнопку, чтобы получить персональный анализ питания за сегодня.</p>
          )}
          {aiLoading && (
            <div style={s.aiLoadingRow}>
              <div style={s.scanLine} />
              <span style={{color:'var(--text-muted)',fontSize:13}}>Анализирую твой рацион...</span>
            </div>
          )}
          {aiAnalysis && (
            <div style={s.aiOutput}>
              {aiAnalysis.split('\n').map((line, i) => (
                <div key={i} style={s.aiLine}>{line}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const anStyles = {
  page: { display:'flex', flexDirection:'column', gap:20 },
  pageTitle: { fontSize:22, fontWeight:700, color:'var(--text)' },
  dayBar: { display:'flex', gap:6 },
  dayBtn: {
    padding:'7px 14px', borderRadius:8, border:'1px solid var(--border)',
    background:'transparent', color:'var(--text-muted)', cursor:'pointer', fontSize:13, transition:'all 0.15s',
  },
  dayBtnActive: { background:'var(--accent-dim)', border:'1px solid var(--accent)', color:'var(--accent-bright)' },
  grid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 },
  card: {
    background:'var(--surface)', border:'1px solid var(--border)',
    borderRadius:16, padding:24, display:'flex', flexDirection:'column', gap:16,
  },
  cardTitle: { fontSize:15, fontWeight:600, color:'var(--text)', display:'flex', alignItems:'center' },
  cardTitleRow: { display:'flex', alignItems:'center', justifyContent:'space-between' },
  chartCenter: { display:'flex', justifyContent:'center' },
  calProgressBar: {
    height:6, background:'var(--surface2)', borderRadius:50, overflow:'hidden',
  },
  calBarFill: { height:'100%', background:'var(--accent)', borderRadius:50, transition:'width 0.6s ease' },
  calStats: { display:'flex', justifyContent:'space-around' },
  calStat: { display:'flex', flexDirection:'column', alignItems:'center', gap:2 },
  statLabel: { fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em' },
  donutRow: { display:'flex', alignItems:'center', gap:20 },
  macroLegend: { flex:1, display:'flex', flexDirection:'column', gap:14 },
  legendRow: { display:'flex', alignItems:'center', gap:10 },
  legendDot: { width:8, height:8, borderRadius:'50%', flexShrink:0 },
  legendLabel: { fontSize:12, color:'var(--text-muted)', marginBottom:4 },
  legendBar: { height:4, background:'var(--surface2)', borderRadius:50, overflow:'hidden' },
  legendBarFill: { height:'100%', borderRadius:50, transition:'width 0.6s ease' },
  legendVal: { fontFamily:'var(--mono)', fontSize:13, minWidth:42, textAlign:'right' },
  legendPct: { fontFamily:'var(--mono)', fontSize:12, color:'var(--text-muted)', minWidth:30, textAlign:'right' },
  goalBadge: {
    padding:'4px 12px', background:'oklch(0.72 0.15 75 / 0.12)',
    border:'1px solid oklch(0.72 0.15 75 / 0.3)', borderRadius:50,
    fontSize:12, color:'oklch(0.72 0.15 75)',
  },
  analyzeBtn: {
    padding:'8px 18px', background:'var(--accent)', color:'#000',
    border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600,
  },
  aiPrompt: { color:'var(--text-muted)', fontSize:14, margin:0, lineHeight:1.6 },
  aiLoadingRow: { display:'flex', alignItems:'center', gap:12, padding:'8px 0' },
  scanLine: {
    width:200, height:2, background:'linear-gradient(90deg,transparent,var(--accent),transparent)',
    animation:'scan 1.5s ease-in-out infinite',
  },
  aiOutput: { display:'flex', flexDirection:'column', gap:10 },
  aiLine: {
    padding:'12px 16px', background:'var(--surface2)', borderRadius:10,
    fontSize:14, color:'var(--text)', lineHeight:1.6,
    borderLeft:'3px solid var(--accent-dim)',
  },
};

const anAnimStyle = document.createElement('style');
anAnimStyle.textContent = `@keyframes scan{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}`;
document.head.appendChild(anAnimStyle);

Object.assign(window, { AnalysisView });
