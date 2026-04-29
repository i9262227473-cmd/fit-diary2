// ═══════════════════════════════════════════
// FOOD LOG VIEW
// ═══════════════════════════════════════════

function FoodLogView({ state, dispatch }) {
  const [tab, setTab] = React.useState('search'); // search | manual | ai | barcode
  const [query, setQuery] = React.useState('');
  const [selectedFood, setSelectedFood] = React.useState(null);
  const [grams, setGrams] = React.useState('100');
  const [meal, setMeal] = React.useState('breakfast');
  const [aiText, setAiText] = React.useState('');
  const [aiResults, setAiResults] = React.useState(null);
  const [aiLoading, setAiLoading] = React.useState(false);
  const [manual, setManual] = React.useState({ name:'', cal:'', p:'', f:'', c:'', grams:'100' });
  const [toast, setToast] = React.useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const meals = { breakfast:'Завтрак', lunch:'Обед', dinner:'Ужин', snack:'Перекус' };
  const mealColors = { breakfast:'var(--amber)', lunch:'var(--accent)', dinner:'var(--teal)', snack:'var(--red)' };

  const filtered = query.length > 1
    ? FOOD_DB.filter(f => f.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : FOOD_DB.slice(0, 8);

  const addFromSearch = () => {
    if (!selectedFood) return;
    const g = parseFloat(grams) || 100;
    const n = calcNutrition(selectedFood, g);
    dispatch({ type:'ADD_FOOD', item: {
      id: Date.now(), name: selectedFood.name, grams: g, meal,
      cal: n.cal, p: n.p, f: n.fat, c: n.c,
      time: new Date().toLocaleTimeString('ru', {hour:'2-digit', minute:'2-digit'}),
    }});
    setSelectedFood(null); setQuery(''); setGrams('100');
    showToast(`${selectedFood.name} добавлено`);
  };

  const addManual = () => {
    if (!manual.name || !manual.cal) return;
    const g = parseFloat(manual.grams) || 100;
    dispatch({ type:'ADD_FOOD', item: {
      id: Date.now(), name: manual.name, grams: g, meal,
      cal: Math.round(parseFloat(manual.cal) * g / 100),
      p: Math.round(parseFloat(manual.p||0) * g / 100 * 10)/10,
      f: Math.round(parseFloat(manual.f||0) * g / 100 * 10)/10,
      c: Math.round(parseFloat(manual.c||0) * g / 100 * 10)/10,
      time: new Date().toLocaleTimeString('ru', {hour:'2-digit', minute:'2-digit'}),
    }});
    setManual({ name:'', cal:'', p:'', f:'', c:'', grams:'100' });
    showToast(`${manual.name} добавлено`);
  };

  const runAI = () => {
    if (!aiText.trim()) return;
    setAiLoading(true); setAiResults(null);
    setTimeout(() => {
      const results = recognizeFood(aiText);
      setAiResults(results.length > 0 ? results : []);
      setAiLoading(false);
    }, 1600);
  };

  const addAIResult = (item) => {
    const n = calcNutrition(item.food, item.grams);
    dispatch({ type:'ADD_FOOD', item: {
      id: Date.now(), name: item.food.name, grams: item.grams, meal,
      cal: n.cal, p: n.p, f: n.fat, c: n.c,
      time: new Date().toLocaleTimeString('ru', {hour:'2-digit', minute:'2-digit'}),
    }});
    showToast(`${item.food.name} добавлено`);
  };

  // Totals
  const totals = state.foodLog.reduce((a,f)=>({ cal:a.cal+f.cal, p:a.p+f.p, f:a.f+f.f, c:a.c+f.c }),{cal:0,p:0,f:0,c:0});
  const grouped = Object.fromEntries(Object.keys(meals).map(m => [m, state.foodLog.filter(f=>f.meal===m)]));

  const s = foodStyles;

  return (
    <div style={s.page}>
      {toast && <div style={s.toast}>{toast}</div>}

      {/* Totals bar */}
      <div style={s.totalsBar}>
        <div style={s.totalItem}>
          <span style={s.totalNum}>{totals.cal}</span>
          <span style={s.totalLabel}>ккал</span>
        </div>
        <div style={s.totalDivider} />
        <div style={s.totalItem}>
          <span style={{...s.totalNum, color:'var(--accent)'}}>{totals.p.toFixed(1)}</span>
          <span style={s.totalLabel}>Б</span>
        </div>
        <div style={s.totalItem}>
          <span style={{...s.totalNum, color:'var(--teal)'}}>{totals.f.toFixed(1)}</span>
          <span style={s.totalLabel}>Ж</span>
        </div>
        <div style={s.totalItem}>
          <span style={{...s.totalNum, color:'var(--amber)'}}>{totals.c.toFixed(1)}</span>
          <span style={s.totalLabel}>У</span>
        </div>
        <div style={{flex:1}} />
        <div style={s.mealSelect}>
          {Object.entries(meals).map(([k,v]) => (
            <button key={k} onClick={()=>setMeal(k)}
              style={{...s.mealBtn, ...(meal===k ? {background:'var(--accent)',color:'#000'} : {})}}>
              {v}
            </button>
          ))}
        </div>
      </div>

      <div style={s.layout}>
        {/* Left: Add food panel */}
        <div style={s.addPanel}>
          <div style={s.tabs}>
            {[['search','Поиск'],['manual','Вручную'],['ai','ИИ'],['barcode','Штрихкод']].map(([k,v])=>(
              <button key={k} onClick={()=>setTab(k)}
                style={{...s.tab, ...(tab===k ? s.tabActive : {})}}>
                {k==='ai' && <span style={{color:'var(--accent)',marginRight:4}}>✦</span>}
                {v}
              </button>
            ))}
          </div>

          {/* SEARCH TAB */}
          {tab === 'search' && (
            <div style={s.tabContent}>
              <input
                style={s.input}
                placeholder="Найти продукт..."
                value={query}
                onChange={e=>setQuery(e.target.value)}
                autoFocus
              />
              <div style={s.foodList}>
                {filtered.map(food => (
                  <button key={food.id} onClick={()=>setSelectedFood(food)}
                    style={{...s.foodRow, ...(selectedFood?.id===food.id ? s.foodRowActive : {})}}>
                    <span style={s.foodName}>{food.name}</span>
                    <span style={s.foodMeta}>{food.cal} ккал · Б{food.p} Ж{food.f} У{food.c}</span>
                  </button>
                ))}
              </div>
              {selectedFood && (
                <div style={s.gramsRow}>
                  <span style={s.selectedName}>{selectedFood.name}</span>
                  <div style={s.gramsInputWrap}>
                    <input style={s.gramsInput} type="number" value={grams}
                      onChange={e=>setGrams(e.target.value)} min="1" max="2000" />
                    <span style={s.gramsUnit}>г</span>
                  </div>
                  <div style={s.previewMacros}>
                    {(() => {
                      const n = calcNutrition(selectedFood, parseFloat(grams)||100);
                      return `${n.cal} ккал · Б${n.p} Ж${n.fat} У${n.c}`;
                    })()}
                  </div>
                  <button style={s.addBtn} onClick={addFromSearch}>Добавить</button>
                </div>
              )}
            </div>
          )}

          {/* MANUAL TAB */}
          {tab === 'manual' && (
            <div style={s.tabContent}>
              <div style={s.manualGrid}>
                <div style={{gridColumn:'1/-1'}}>
                  <label style={s.label}>Название</label>
                  <input style={s.input} placeholder="Название блюда"
                    value={manual.name} onChange={e=>setManual({...manual,name:e.target.value})} />
                </div>
                <div>
                  <label style={s.label}>Порция (г)</label>
                  <input style={s.input} type="number" placeholder="100"
                    value={manual.grams} onChange={e=>setManual({...manual,grams:e.target.value})} />
                </div>
                <div>
                  <label style={s.label}>Ккал / 100г</label>
                  <input style={s.input} type="number" placeholder="200"
                    value={manual.cal} onChange={e=>setManual({...manual,cal:e.target.value})} />
                </div>
                <div>
                  <label style={s.label}>Белки / 100г</label>
                  <input style={{...s.input,borderColor:'var(--accent)'}} type="number" placeholder="0"
                    value={manual.p} onChange={e=>setManual({...manual,p:e.target.value})} />
                </div>
                <div>
                  <label style={s.label}>Жиры / 100г</label>
                  <input style={{...s.input,borderColor:'var(--teal)'}} type="number" placeholder="0"
                    value={manual.f} onChange={e=>setManual({...manual,f:e.target.value})} />
                </div>
                <div>
                  <label style={s.label}>Углеводы / 100г</label>
                  <input style={{...s.input,borderColor:'var(--amber)'}} type="number" placeholder="0"
                    value={manual.c} onChange={e=>setManual({...manual,c:e.target.value})} />
                </div>
              </div>
              <button style={{...s.addBtn, marginTop:16, width:'100%'}} onClick={addManual}
                disabled={!manual.name || !manual.cal}>
                Добавить продукт
              </button>
            </div>
          )}

          {/* AI TAB */}
          {tab === 'ai' && (
            <div style={s.tabContent}>
              <div style={s.aiHeader}>
                <span style={s.aiIcon}>✦</span>
                <span style={s.aiTitle}>ИИ-распознавание блюда</span>
              </div>
              <p style={s.aiHint}>Опиши что съел, ИИ определит состав</p>
              <textarea
                style={s.textarea}
                placeholder="Например: «съел 200г куриной грудки с гречкой 150г и стакан кефира»"
                value={aiText}
                onChange={e=>setAiText(e.target.value)}
                rows={3}
              />
              <button style={{...s.addBtn, width:'100%', marginTop:12}} onClick={runAI} disabled={aiLoading||!aiText.trim()}>
                {aiLoading ? <span style={s.spinner}>Анализирую...</span> : '✦ Распознать'}
              </button>
              {aiLoading && (
                <div style={s.aiLoading}>
                  <div style={s.loadingDots}><span /><span /><span /></div>
                  <span style={s.loadingText}>Анализирую состав блюда...</span>
                </div>
              )}
              {aiResults !== null && !aiLoading && (
                <div style={s.aiResults}>
                  {aiResults.length === 0 ? (
                    <p style={{color:'var(--text-muted)',fontSize:13}}>Не удалось распознать. Попробуй уточнить описание.</p>
                  ) : (
                    <>
                      <p style={s.aiResultsTitle}>Распознано {aiResults.length} продукт(а):</p>
                      {aiResults.map((item, i) => {
                        const n = calcNutrition(item.food, item.grams);
                        return (
                          <div key={i} style={s.aiResultRow}>
                            <div style={{flex:1}}>
                              <div style={s.foodName}>{item.food.name}</div>
                              <div style={s.foodMeta}>{item.grams}г · {n.cal} ккал · Б{n.p} Ж{n.fat} У{n.c}</div>
                            </div>
                            <button style={s.addSmallBtn} onClick={()=>addAIResult(item)}>+</button>
                          </div>
                        );
                      })}
                      <button style={{...s.addBtn, width:'100%', marginTop:8}}
                        onClick={()=>{ aiResults.forEach(addAIResult); setAiText(''); setAiResults(null); }}>
                        Добавить всё
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* BARCODE TAB */}
          {tab === 'barcode' && (
            <div style={{...s.tabContent, alignItems:'center', justifyContent:'center', minHeight:220, display:'flex', flexDirection:'column', gap:16}}>
              <div style={s.barcodeIcon}>
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                  {[4,10,14,20,26,30,36,42,48,54].map((x,i)=>(
                    <rect key={i} x={x} y={8} width={i%3===1?4:2} height={36} fill="var(--text-muted)" rx="1"/>
                  ))}
                  <rect x={4} y={52} width={16} height={2} rx={1} fill="var(--text-muted)" />
                  <rect x={44} y={52} width={16} height={2} rx={1} fill="var(--text-muted)" />
                  <rect x={4} y={4} width={2} height={8} rx={1} fill="var(--accent)" />
                  <rect x={4} y={4} width={8} height={2} rx={1} fill="var(--accent)" />
                  <rect x={54} y={4} width={2} height={8} rx={1} fill="var(--accent)" />
                  <rect x={52} y={4} width={8} height={2} rx={1} fill="var(--accent)" />
                </svg>
              </div>
              <p style={{color:'var(--text-muted)',fontSize:14,textAlign:'center',margin:0}}>
                Сканирование штрихкода<br/>будет доступно в следующей версии
              </p>
              <button style={{...s.addBtn, opacity:0.5}} disabled>Открыть камеру</button>
            </div>
          )}
        </div>

        {/* Right: Food log */}
        <div style={s.logPanel}>
          <div style={s.logTitle}>Дневник питания — сегодня</div>
          {state.foodLog.length === 0 && (
            <div style={s.empty}>Ничего не добавлено. Начни с поиска продукта.</div>
          )}
          {Object.entries(meals).map(([mealKey, mealName]) => {
            const items = grouped[mealKey] || [];
            if (items.length === 0) return null;
            const mealCal = items.reduce((a,f)=>a+f.cal,0);
            return (
              <div key={mealKey} style={s.mealGroup}>
                <div style={s.mealGroupHeader}>
                  <span style={{...s.mealDot, background: mealColors[mealKey]}} />
                  <span style={s.mealGroupName}>{mealName}</span>
                  <span style={s.mealGroupCal}>{mealCal} ккал</span>
                </div>
                {items.map(item => (
                  <div key={item.id} style={s.logItem}>
                    <div style={{flex:1}}>
                      <div style={s.logItemName}>{item.name}</div>
                      <div style={s.logItemMeta}>
                        {item.grams}г · <span style={{color:'var(--accent)'}}>Б{item.p}</span> · <span style={{color:'var(--teal)'}}>Ж{item.f}</span> · <span style={{color:'var(--amber)'}}>У{item.c}</span>
                        <span style={{marginLeft:8,color:'var(--text-muted)',fontSize:11}}>{item.time}</span>
                      </div>
                    </div>
                    <span style={s.logItemCal}>{item.cal}</span>
                    <button style={s.deleteBtn} onClick={()=>dispatch({type:'REMOVE_FOOD',id:item.id})}>×</button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const foodStyles = {
  page: { display:'flex', flexDirection:'column', gap:20, height:'100%' },
  totalsBar: {
    display:'flex', alignItems:'center', gap:16,
    background:'var(--surface)', border:'1px solid var(--border)',
    borderRadius:14, padding:'14px 20px', flexShrink:0,
  },
  totalItem: { display:'flex', flexDirection:'column', alignItems:'center', gap:2 },
  totalNum: { fontFamily:'var(--mono)', fontSize:22, fontWeight:500, color:'var(--text)', lineHeight:1 },
  totalLabel: { fontSize:11, color:'var(--text-muted)', letterSpacing:'0.05em', textTransform:'uppercase' },
  totalDivider: { width:1, height:32, background:'var(--border)', margin:'0 4px' },
  mealSelect: { display:'flex', gap:4 },
  mealBtn: {
    padding:'6px 12px', borderRadius:8, border:'1px solid var(--border)',
    background:'transparent', color:'var(--text-muted)', cursor:'pointer', fontSize:13,
    transition:'all 0.15s',
  },
  layout: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, flex:1, minHeight:0 },
  addPanel: {
    background:'var(--surface)', border:'1px solid var(--border)',
    borderRadius:14, display:'flex', flexDirection:'column', overflow:'hidden',
  },
  tabs: { display:'flex', borderBottom:'1px solid var(--border)' },
  tab: {
    flex:1, padding:'12px 8px', background:'transparent', border:'none',
    color:'var(--text-muted)', cursor:'pointer', fontSize:13, transition:'all 0.15s',
  },
  tabActive: { color:'var(--text)', borderBottom:'2px solid var(--accent)', marginBottom:-1 },
  tabContent: { padding:16, display:'flex', flexDirection:'column', gap:12, overflowY:'auto', flex:1 },
  input: {
    width:'100%', padding:'10px 14px', background:'var(--surface2)',
    border:'1px solid var(--border)', borderRadius:10, color:'var(--text)',
    fontSize:14, outline:'none', boxSizing:'border-box',
    fontFamily:'var(--font)',
  },
  label: { display:'block', fontSize:12, color:'var(--text-muted)', marginBottom:5, letterSpacing:'0.03em' },
  foodList: { display:'flex', flexDirection:'column', gap:4, maxHeight:240, overflowY:'auto' },
  foodRow: {
    display:'flex', flexDirection:'column', gap:2, padding:'10px 12px',
    background:'transparent', border:'1px solid transparent', borderRadius:10,
    cursor:'pointer', textAlign:'left', transition:'all 0.12s',
  },
  foodRowActive: { background:'var(--surface2)', border:'1px solid var(--accent)' },
  foodName: { color:'var(--text)', fontSize:14 },
  foodMeta: { color:'var(--text-muted)', fontSize:12, fontFamily:'var(--mono)' },
  gramsRow: {
    display:'flex', flexDirection:'column', gap:8,
    background:'var(--surface2)', borderRadius:12, padding:14,
    border:'1px solid var(--accent)',
  },
  selectedName: { color:'var(--accent)', fontSize:14, fontWeight:500 },
  gramsInputWrap: { display:'flex', alignItems:'center', gap:8 },
  gramsInput: {
    width:80, padding:'8px 12px', background:'var(--bg)',
    border:'1px solid var(--border)', borderRadius:8, color:'var(--text)',
    fontSize:15, fontFamily:'var(--mono)', outline:'none',
  },
  gramsUnit: { color:'var(--text-muted)', fontSize:13 },
  previewMacros: { color:'var(--text-muted)', fontSize:13, fontFamily:'var(--mono)' },
  addBtn: {
    padding:'10px 20px', background:'var(--accent)', color:'#000',
    border:'none', borderRadius:10, cursor:'pointer', fontSize:14, fontWeight:600,
    transition:'opacity 0.15s',
  },
  manualGrid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 },
  aiHeader: { display:'flex', alignItems:'center', gap:8 },
  aiIcon: { fontSize:20, color:'var(--accent)' },
  aiTitle: { fontSize:15, fontWeight:600, color:'var(--text)' },
  aiHint: { color:'var(--text-muted)', fontSize:13, margin:0 },
  textarea: {
    width:'100%', padding:'12px 14px', background:'var(--surface2)',
    border:'1px solid var(--border)', borderRadius:10, color:'var(--text)',
    fontSize:14, outline:'none', resize:'vertical', fontFamily:'var(--font)',
    boxSizing:'border-box',
  },
  spinner: { opacity:0.7 },
  aiLoading: { display:'flex', flexDirection:'column', alignItems:'center', gap:10, padding:'20px 0' },
  loadingDots: { display:'flex', gap:6 },
  loadingText: { color:'var(--text-muted)', fontSize:13 },
  aiResults: { display:'flex', flexDirection:'column', gap:8 },
  aiResultsTitle: { color:'var(--text-muted)', fontSize:12, margin:0 },
  aiResultRow: {
    display:'flex', alignItems:'center', gap:12, padding:'10px 12px',
    background:'var(--surface2)', borderRadius:10, border:'1px solid var(--border)',
  },
  addSmallBtn: {
    width:28, height:28, borderRadius:8, background:'var(--accent)',
    color:'#000', border:'none', cursor:'pointer', fontSize:16, fontWeight:700,
    display:'flex', alignItems:'center', justifyContent:'center',
    flexShrink:0,
  },
  barcodeIcon: { opacity:0.5 },
  logPanel: {
    background:'var(--surface)', border:'1px solid var(--border)',
    borderRadius:14, padding:20, overflowY:'auto', display:'flex', flexDirection:'column', gap:16,
  },
  logTitle: { fontSize:15, fontWeight:600, color:'var(--text)' },
  empty: { color:'var(--text-muted)', fontSize:14, padding:'20px 0', textAlign:'center' },
  mealGroup: { display:'flex', flexDirection:'column', gap:6 },
  mealGroupHeader: { display:'flex', alignItems:'center', gap:8, marginBottom:4 },
  mealDot: { width:8, height:8, borderRadius:'50%', flexShrink:0 },
  mealGroupName: { fontSize:13, fontWeight:600, color:'var(--text)', flex:1 },
  mealGroupCal: { fontSize:12, color:'var(--text-muted)', fontFamily:'var(--mono)' },
  logItem: {
    display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
    background:'var(--surface2)', borderRadius:10,
  },
  logItemName: { fontSize:14, color:'var(--text)' },
  logItemMeta: { fontSize:12, color:'var(--text-muted)', fontFamily:'var(--mono)', marginTop:2 },
  logItemCal: { fontFamily:'var(--mono)', fontSize:15, color:'var(--text)', fontWeight:500 },
  deleteBtn: {
    width:24, height:24, borderRadius:6, background:'transparent',
    border:'1px solid var(--border)', color:'var(--text-muted)',
    cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center',
    flexShrink:0,
  },
  toast: {
    position:'fixed', bottom:32, left:'50%', transform:'translateX(-50%)',
    background:'var(--accent)', color:'#000', padding:'10px 24px',
    borderRadius:50, fontSize:14, fontWeight:600, zIndex:9999,
    boxShadow:'0 4px 20px rgba(0,0,0,0.4)',
  },
};

// Loading dots CSS
const dotsStyle = document.createElement('style');
dotsStyle.textContent = `
  .ld span { display:inline-block; width:6px; height:6px; border-radius:50%; background:var(--accent); animation:ldPulse 1.2s ease-in-out infinite; }
  .ld span:nth-child(2){animation-delay:0.2s}
  .ld span:nth-child(3){animation-delay:0.4s}
  @keyframes ldPulse { 0%,80%,100%{opacity:0.2;transform:scale(0.8)} 40%{opacity:1;transform:scale(1)} }
`;
document.head.appendChild(dotsStyle);

Object.assign(window, { FoodLogView });
