import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useStore, API_URL } from '../../store'
import WorkoutModal from '../../components/WorkoutModal'
import Paywall from '../../components/Paywall'
import { Plus, Camera, X, Utensils, Dumbbell, Sparkles, Pencil, ChevronLeft, Star } from 'lucide-react'
import { searchFood } from '../../data/foodDatabase'
import styles from './TodayTab.module.css'

const MEALS = ['Завтрак', 'Перекус', 'Обед', 'Полдник', 'Ужин']
const RING_COLORS = [
  { t:0.00, r:212, g:168, b:67  },
  { t:0.18, r:196, g:148, b:90  },
  { t:0.35, r:200, g:120, b:80  },
  { t:0.52, r:196, g:100, b:80  },
  { t:0.65, r:180, g:88,  b:88  },
  { t:0.75, r:140, g:120, b:140 },
  { t:0.85, r:110, g:130, b:170 },
  { t:1.00, r:106, g:138, b:184 },
]

function getRingColor(t) {
  const p = Math.max(0, Math.min(1, t))
  let lo = RING_COLORS[0], hi = RING_COLORS[RING_COLORS.length - 1]
  for (let i = 0; i < RING_COLORS.length - 1; i++) {
    if (p >= RING_COLORS[i].t && p <= RING_COLORS[i+1].t) { lo = RING_COLORS[i]; hi = RING_COLORS[i+1]; break }
  }
  const f = hi.t - lo.t > 0 ? (p - lo.t) / (hi.t - lo.t) : 0
  return `rgb(${Math.round(lo.r+(hi.r-lo.r)*f)},${Math.round(lo.g+(hi.g-lo.g)*f)},${Math.round(lo.b+(hi.b-lo.b)*f)})`
}

function MacroRing({ fill, calories, goalCal }) {
  const canvasRef = useRef(null)
  const animRef   = useRef(null)
  const curFill   = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W=240, H=240, cx=120, cy=120, R=102, SW=9
    const target = Math.min(fill, 1)

    function draw(f) {
      ctx.clearRect(0,0,W,H)
      ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2)
      ctx.strokeStyle='rgba(255,255,255,0.05)'; ctx.lineWidth=SW; ctx.stroke()
      if (f <= 0.01) return
      const s=-Math.PI/2, e=s+Math.PI*2*f
      const N=Math.max(80,Math.round(f*150))
      for (let i=0;i<N;i++) {
        const a0=s+(e-s)*(i/N), a1=s+(e-s)*Math.min((i+1.6)/N,1)
        ctx.beginPath(); ctx.arc(cx,cy,R,a0,a1)
        ctx.strokeStyle=getRingColor(i/(N-1)); ctx.lineWidth=SW; ctx.lineCap='butt'; ctx.stroke()
      }
      ctx.beginPath(); ctx.arc(cx,cy,R,s-0.02,s+0.02)
      ctx.strokeStyle=getRingColor(0); ctx.lineWidth=SW; ctx.lineCap='round'; ctx.stroke()
      ctx.beginPath(); ctx.arc(cx,cy,R,e-0.02,e+0.02)
      ctx.strokeStyle=getRingColor(1); ctx.lineWidth=SW; ctx.lineCap='round'; ctx.stroke()
      const dx=cx+R*Math.cos(e), dy=cy+R*Math.sin(e)
      ctx.beginPath(); ctx.arc(dx,dy,8,0,Math.PI*2)
      ctx.fillStyle='#d4a843'; ctx.shadowColor='#C9A84C'; ctx.shadowBlur=16; ctx.fill()
      ctx.shadowBlur=0
      ctx.beginPath(); ctx.arc(dx,dy,3.5,0,Math.PI*2)
      ctx.fillStyle='#fff8e0'; ctx.fill()
    }

    function step() {
      const d=target-curFill.current
      if (Math.abs(d)<0.002) { curFill.current=target; draw(target); return }
      curFill.current+=d*0.07; draw(curFill.current)
      animRef.current=requestAnimationFrame(step)
    }
    if (animRef.current) cancelAnimationFrame(animRef.current)
    step()
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [fill])

  return (
    <div className={styles.ringWrap}>
      <canvas ref={canvasRef} width={240} height={240} style={{position:'absolute',inset:0}}/>
      <div className={styles.ringCenter}>
        <div className={styles.ringCal}>{Math.round(calories)}</div>
        <div className={styles.ringKcal}>ККАЛ</div>
        <div className={styles.ringGoal}>из {goalCal}</div>
        <div className={styles.ringPct}>{Math.round(fill*100)}%</div>
      </div>
    </div>
  )
}

function compressImage(file, maxSize=1024, quality=0.85) {
  return new Promise((res,rej) => {
    const r=new FileReader()
    r.onload=e=>{
      const img=new Image()
      img.onload=()=>{
        const canvas=document.createElement('canvas')
        let w=img.width,h=img.height
        if(w>maxSize||h>maxSize){if(w>h){h=Math.round(h*maxSize/w);w=maxSize}else{w=Math.round(w*maxSize/h);h=maxSize}}
        canvas.width=w;canvas.height=h
        canvas.getContext('2d').drawImage(img,0,0,w,h)
        res(canvas.toDataURL('image/jpeg',quality).split(',')[1])
      }
      img.onerror=rej; img.src=e.target.result
    }
    r.onerror=rej; r.readAsDataURL(file)
  })
}

// AI модал — через Portal чтобы выйти за max-width body
function AiModal({ data, onClose }) {
  if (!data) return null
  const score=data.score||0
  const sc=score>=8?'#10d9a4':score>=6?'#C9A84C':'#ff6b6b'
  const F={fontFamily:'Montserrat,sans-serif'}
  return createPortal(
    <div onClick={onClose} style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(0,0,0,0.88)',zIndex:9999,display:'flex',alignItems:'flex-end',backdropFilter:'blur(10px)',WebkitBackdropFilter:'blur(10px)'}}>
      <div onClick={e=>e.stopPropagation()} style={{...F,background:'#111118',borderRadius:'28px 28px 0 0',border:'1px solid rgba(255,255,255,.1)',width:'100%',maxWidth:560,margin:'0 auto',maxHeight:'88vh',overflowY:'auto',padding:'24px 20px 40px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
          <div style={{fontSize:17,fontWeight:800,color:'#fff',display:'flex',alignItems:'center',gap:8}}><Sparkles size={16} color="#C9A84C"/>Анализ дня</div>
          <button onClick={onClose} style={{background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.1)',borderRadius:10,width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'rgba(255,255,255,.6)'}}><X size={16}/></button>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',borderRadius:18,padding:'16px 20px',marginBottom:14}}>
          <div style={{fontSize:52,fontWeight:900,letterSpacing:-2,lineHeight:1,color:sc}}>{score}</div>
          <div style={{fontSize:20,color:'rgba(255,255,255,.3)',fontWeight:600}}>/10</div>
          <div style={{flex:1,fontSize:13,color:'rgba(255,255,255,.65)',lineHeight:1.5,marginLeft:6}}>{data.scoreComment}</div>
        </div>
        {data.nutrition&&<div style={{background:'rgba(201,168,76,.07)',border:'1px solid rgba(201,168,76,.25)',borderRadius:16,padding:'14px 16px',marginBottom:10}}>
          <div style={{display:'flex',alignItems:'center',gap:7,fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:1.2,color:'#C9A84C',marginBottom:10}}>
            <Utensils size={13} color="#C9A84C"/>Диетолог
          </div>
          <div style={{fontSize:13,lineHeight:1.75,color:'rgba(255,255,255,.85)',whiteSpace:'pre-wrap'}}>{data.nutrition}</div>
        </div>}
        {data.workout&&<div style={{background:'rgba(122,160,204,.07)',border:'1px solid rgba(122,160,204,.25)',borderRadius:16,padding:'14px 16px',marginBottom:10}}>
          <div style={{display:'flex',alignItems:'center',gap:7,fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:1.2,color:'#7aa0cc',marginBottom:10}}>
            <Dumbbell size={13} color="#7aa0cc"/>Тренер
          </div>
          <div style={{fontSize:13,lineHeight:1.75,color:'rgba(255,255,255,.85)',whiteSpace:'pre-wrap'}}>{data.workout}</div>
        </div>}
        {data.recommendations&&<div style={{background:'rgba(255,159,67,.07)',border:'1px solid rgba(255,159,67,.25)',borderRadius:16,padding:'14px 16px',marginBottom:16}}>
          <div style={{display:'flex',alignItems:'center',gap:7,fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:1.2,color:'#ff9f43',marginBottom:10}}>
            <Star size={13} color="#ff9f43"/>План на завтра
          </div>
          <div style={{fontSize:13,lineHeight:1.85,color:'rgba(255,255,255,.85)',whiteSpace:'pre-wrap'}}>{data.recommendations}</div>
        </div>}
        <div style={{fontSize:11,color:'rgba(255,255,255,.2)',textAlign:'center'}}>Строгий анализ на основе ваших данных</div>
      </div>
    </div>
  , document.body)
}

// Полноэкранная панель через Portal
function FullScreenPanel({ children }) {
  return createPortal(
    <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'#0a0a0f',zIndex:200,display:'flex',flexDirection:'column',fontFamily:'Montserrat,sans-serif'}}>
      {children}
    </div>
  , document.body)
}

export default function TodayTab({ selectedDate }) {
  const { profile, getEntry, saveEntry, aiCall, setPaywallOpen } = useStore()
  const [showFoodPanel, setShowFoodPanel] = useState(false)
  const [showWorkoutPanel, setShowWorkoutPanel] = useState(false)
  const [workoutMode, setWorkoutMode] = useState(null)
  const [showWorkoutModal, setShowWorkoutModal] = useState(false)
  const [activeMeal, setActiveMeal] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiData, setAiData] = useState(null)
  const [paywallReason, setPaywallReason] = useState(null)
  const [foodModal, setFoodModal] = useState(false)
  const [editingFood, setEditingFood] = useState(null)
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedFood, setSelectedFood] = useState(null)
  const [weight, setWeight] = useState('100')
  const [scanLoading, setScanLoading] = useState(false)
  const [manualMode, setManualMode] = useState(false)
  const [manualData, setManualData] = useState({name:'',calories:'',protein:'',fat:'',carbs:''})

  const date = selectedDate || new Date().toISOString().split('T')[0]
  const entry = getEntry(date)
  const goals = { calories:profile?.calorieGoal||2000, protein:profile?.proteinGoal||140, fat:profile?.fatGoal||70, carbs:profile?.carbGoal||200 }
  const totals = entry.foods.reduce((a,f)=>({calories:a.calories+(f.calories||0),protein:a.protein+(f.protein||0),fat:a.fat+(f.fat||0),carbs:a.carbs+(f.carbs||0)}),{calories:0,protein:0,fat:0,carbs:0})
  const ringFill = Math.min(totals.calories/goals.calories, 1)

  const MET = {'Эллипс / Кардио':6,'Велотренажёр':7,'Плавание':8,'Йога / Растяжка':3,default:5}
  const workoutCals = (entry.workouts||[]).reduce((s,w)=>s+(MET[w.type]||MET.default)*(profile?.weight||80)*(w.duration/60),0)
  const getBMR = ()=>{ const p=profile||{},w=p.weight||80,h=p.height||175,a=p.age||30,g=p.gender==='female'?-161:5; return 10*w+6.25*h-5*a+g }

  const handleSearch = q => { setQuery(q); setSelectedFood(null); setSearchResults(searchFood(q)) }
  const selectFood   = f => { setSelectedFood(f); setQuery(f.name); setSearchResults([]) }
  const calcFood     = (item,w) => ({ name:item.name, weight:+w, calories:item.cal100*+w/100, protein:item.prot100*+w/100, fat:item.fat100*+w/100, carbs:item.carbs100*+w/100 })

  const openAddFood = () => {
    setEditingFood(null); setQuery(''); setSelectedFood(null); setWeight('100')
    setManualMode(false); setManualData({name:'',calories:'',protein:'',fat:'',carbs:''}); setFoodModal(true)
  }
  const openEditFood = food => {
    setEditingFood(food); setManualMode(true); setWeight(String(food.weight||100))
    const p=food.weight>0?100/food.weight:1
    setManualData({name:food.name,calories:String(Math.round(food.calories*p)),protein:String(Math.round(food.protein*p)),fat:String(Math.round(food.fat*p)),carbs:String(Math.round(food.carbs*p))})
    setFoodModal(true)
  }

  const saveFood = () => {
    if (!activeMeal) return
    let food
    if (manualMode) {
      food={name:manualData.name||'Продукт',weight:+weight,calories:+manualData.calories*+weight/100,protein:+manualData.protein*+weight/100,fat:+manualData.fat*+weight/100,carbs:+manualData.carbs*+weight/100}
    } else if (selectedFood) { food=calcFood(selectedFood,weight) } else return
    if (editingFood) {
      saveEntry({...entry,foods:entry.foods.map(f=>f.id===editingFood.id?{...food,meal:f.meal,id:f.id}:f)})
    } else {
      saveEntry({...entry,foods:[...entry.foods,{...food,meal:activeMeal,id:Date.now()}]})
    }
    setFoodModal(false); setEditingFood(null); setQuery(''); setSelectedFood(null); setWeight('100')
    setManualData({name:'',calories:'',protein:'',fat:'',carbs:''})
  }

  const removeFood    = id => saveEntry({...entry,foods:entry.foods.filter(f=>f.id!==id)})
  const addWorkout    = w  => { saveEntry({...entry,workouts:[...(entry.workouts||[]),{...w,id:Date.now()}]}); setShowWorkoutModal(false); setWorkoutMode(null) }
  const removeWorkout = id => saveEntry({...entry,workouts:(entry.workouts||[]).filter(w=>w.id!==id)})

  const handleScan = async file => {
    setScanLoading(true)
    try {
      const b64=await compressImage(file)
      const res=await fetch(`${API_URL}/ai-vision`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({b64})})
      const d=await res.json()
      if(d.name){setSelectedFood({name:d.name,cal100:d.calories,prot100:d.protein,fat100:d.fat,carbs100:d.carbs});setQuery(d.name);setManualMode(false)}
    } catch{alert('Не удалось прочитать этикетку')} finally{setScanLoading(false)}
  }

  const handleAiAnalysis = async () => {
    if (aiLoading) return
    setAiData(null)
    setAiLoading(true)
    try {
      const p=profile||{}, bmr=Math.round(getBMR())
      const deficit=Math.round(totals.calories+workoutCals-bmr)
      const foodList=entry.foods.map(f=>`${f.meal}: ${f.name} — ${Math.round(f.calories)} ккал (Б:${Math.round(f.protein)}г Ж:${Math.round(f.fat)}г У:${Math.round(f.carbs)}г)`).join('\n')||'Ничего не съедено'
      const workList=(entry.workouts||[]).map(w=>`${w.type}: ${w.duration} мин, ~${Math.round(w.duration/60*(MET[w.type]||5)*(p.weight||80))} ккал${w.exercises?.length?' | '+w.exercises.join(', '):''}`).join('\n')||'Тренировок нет'
      const level={beginner:'новичок',amateur:'любитель',advanced:'продвинутый',professional:'профессионал'}[p.level]||'любитель'
      const prompt=`Верни ТОЛЬКО валидный JSON-объект без markdown-разметки, без текста до и после. Никаких пояснений — только JSON.

{
  "score": <целое число от 1 до 10>,
  "scoreComment": "<одна итоговая фраза — строгая общая оценка дня>",
  "nutrition": "<ПИШИ ОТ ЛИЦА СТРОГОГО ДИЕТОЛОГА с 20-летним опытом. Разбери каждый продукт из списка по имени. Если продукт полезный — похвали коротко. Если продукт вредный, лишний, или нарушает цели — НАЗОВИ ЕГО ПРЯМО и объясни что именно в нём плохо. Чётко скажи что исключить и чем заменить. Затем оцени КБЖУ: факт Б${Math.round(totals.protein)}г Ж${Math.round(totals.fat)}г У${Math.round(totals.carbs)}г против нормы Б${goals.protein}г Ж${goals.fat}г У${goals.carbs}г. Баланс калорий: ${deficit>0?'профицит +':'дефицит -'}${Math.abs(deficit)} ккал — оцени это.>",
  "workout": "<ПИШИ ОТ ЛИЦА СТРОГОГО ТРЕНЕРА-ПРОФЕССИОНАЛА. Если тренировок не было — скажи жёстко и прямо: это НЕДОПУСТИМО для уровня ${level} и срывает прогресс. Если тренировка была — оцени честно: разбери тип, длительность, сожжённые калории. Если нагрузка хорошая — похвали конкретно и по делу. Если слабая или недостаточная — укажи что именно нужно усилить и почему это критично.>",
  "recommendations": "<3 конкретных пункта на завтра от диетолога и тренера. Формат: '1. ...\n2. ...\n3. ...' — без вводных слов, только действия.>"
}

Данные спортсмена:
Уровень: ${level} | Пол: ${p.gender==='female'?'женщина':'мужчина'} | Вес: ${p.weight||80}кг
Норма: ${goals.calories}ккал | Б:${goals.protein}г Ж:${goals.fat}г У:${goals.carbs}г
Съедено за день:\n${foodList}\nТренировки:\n${workList}`
      const reply=await aiCall([{role:'user',content:prompt}],800)
      const clean=reply.replace(/```json|```/g,'').trim()
      const match=clean.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('AI не вернул JSON. Ответ: '+clean.slice(0,100))
      const parsed=JSON.parse(match[0])
      // Валидируем поля
      setAiData({
        score: typeof parsed.score==='number' ? parsed.score : 0,
        scoreComment: parsed.scoreComment||'Анализ выполнен',
        nutrition: parsed.nutrition||'Нет данных по питанию',
        workout: parsed.workout||'Тренировок не было',
        recommendations: parsed.recommendations||'Нет рекомендаций',
      })
    } catch(e) {
      if (e.code === 'PAYWALL' || e.code === 'PAYWALL_LIMIT') {
        setPaywallReason(e.code)
        setPaywallOpen(true)
      } else {
        console.error('AI analysis error:', e)
        setAiData({
          score: 0,
          scoreComment: 'Не удалось распознать ответ AI',
          nutrition: 'Попробуйте снова — иногда AI отвечает не в том формате.',
          workout: '',
          recommendations: 'Нажмите кнопку ещё раз.',
        })
      }
    } finally { setAiLoading(false) }
  }

  const preview = selectedFood && !manualMode ? calcFood(selectedFood,weight) : null
  const foodCount = entry.foods.length
  const workoutCount = (entry.workouts||[]).length
  const plan = (()=>{ try{return JSON.parse(localStorage.getItem('workout-plan-v1')||'null')}catch{return null}})()
  const DAYS_RU = {mon:'Понедельник',tue:'Вторник',wed:'Среда',thu:'Четверг',fri:'Пятница',sat:'Суббота',sun:'Воскресенье'}

  // Стиль шапки панелей
  const fsHdr = {display:'flex',alignItems:'center',justifyContent:'space-between',padding:'52px 18px 14px',background:'linear-gradient(180deg,rgba(10,10,15,1) 0%,rgba(10,10,15,.95) 100%)',borderBottom:'1px solid rgba(255,255,255,.07)',flexShrink:0}
  const fsBack = {background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.1)',borderRadius:'50%',width:38,height:38,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'rgba(255,255,255,.7)'}
  const fsTitleS = {fontSize:17,fontWeight:700,display:'flex',alignItems:'center',gap:8}
  const fsAddS = {background:'linear-gradient(135deg,#C9A84C,#E8C878)',border:'none',borderRadius:10,width:38,height:38,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}
  const fsContent = {flex:1,overflowY:'auto',padding:'16px 18px'}

  return (
    <div className={styles.page}>

      <div className={styles.ringSection}>
        <MacroRing fill={ringFill} calories={totals.calories} goalCal={goals.calories}/>
      </div>

      <div className={styles.legend}>
        <div className={styles.legendItem}><span className={styles.legendDot} style={{background:'#d4a843'}}/><span style={{color:'#e8c06a',fontWeight:800}}>{Math.round(totals.protein)}</span><span className={styles.legendSub}>/{goals.protein}г Б</span></div>
        <div className={styles.legendItem}><span className={styles.legendDot} style={{background:'#c96a44'}}/><span style={{color:'#e07a54',fontWeight:800}}>{Math.round(totals.fat)}</span><span className={styles.legendSub}>/{goals.fat}г Ж</span></div>
        <div className={styles.legendItem}><span className={styles.legendDot} style={{background:'#6a8ab8'}}/><span style={{color:'#7aa0cc',fontWeight:800}}>{Math.round(totals.carbs)}</span><span className={styles.legendSub}>/{goals.carbs}г У</span></div>
      </div>

      <div className={styles.quickBtns}>
        <button className={styles.quickBtn} onClick={()=>{setShowFoodPanel(true);setActiveMeal(null)}}>
          <div className={styles.quickIcon} style={{background:'rgba(201,168,76,.12)',border:'1px solid rgba(201,168,76,.3)'}}><Utensils size={24} color="#C9A84C" strokeWidth={1.5}/></div>
          <div className={styles.quickLabel}>Питание</div>
          {foodCount>0&&<div className={styles.quickBadge}>{foodCount}</div>}
        </button>
        <button className={styles.quickBtn} onClick={()=>{setShowWorkoutPanel(true);setWorkoutMode(null)}}>
          <div className={styles.quickIcon} style={{background:'rgba(122,160,204,.12)',border:'1px solid rgba(122,160,204,.3)'}}><Dumbbell size={24} color="#7aa0cc" strokeWidth={1.5}/></div>
          <div className={styles.quickLabel}>Тренировки</div>
          {workoutCount>0&&<div className={styles.quickBadge} style={{background:'#7aa0cc',color:'#001a3a'}}>{workoutCount}</div>}
        </button>
      </div>

      <button className={styles.aiBtn} onClick={handleAiAnalysis} disabled={aiLoading}>
        <Sparkles size={17} color={aiLoading?'rgba(0,0,0,.4)':'#000'}/>
        {aiLoading?'Анализирую...':'AI Анализ дня'}
      </button>

      {aiData&&<AiModal data={aiData} onClose={()=>setAiData(null)}/>}

      {/* ПИТАНИЕ */}
      {showFoodPanel&&<FullScreenPanel>
        <div style={fsHdr}>
          <button style={fsBack} onClick={()=>activeMeal?setActiveMeal(null):setShowFoodPanel(false)}>
            {activeMeal?<ChevronLeft size={20}/>:<X size={18}/>}
          </button>
          <div style={fsTitleS}><Utensils size={16} color="#C9A84C"/>{activeMeal||'Питание'}</div>
          {activeMeal?<button style={fsAddS} onClick={openAddFood}><Plus size={16} color="#000"/></button>:<div style={{width:38}}/>}
        </div>
        <div style={fsContent}>
          {!activeMeal&&<>
            <div className={styles.mealPickerTitle}>Выберите приём пищи</div>
            <div className={styles.mealPickerGrid}>
              {MEALS.map(meal=>{
                const cnt=entry.foods.filter(f=>f.meal===meal).length
                const cal=entry.foods.filter(f=>f.meal===meal).reduce((s,f)=>s+(f.calories||0),0)
                return <button key={meal} className={styles.mealPickerCard} onClick={()=>setActiveMeal(meal)}>
                  <div className={styles.mealPickerName}>{meal}</div>
                  {cnt>0?<div className={styles.mealPickerStat}>{cnt} продукта · {Math.round(cal)} ккал</div>:<div className={styles.mealPickerEmpty}>Пусто</div>}
                  {cnt>0&&<div className={styles.mealPickerDot}/>}
                </button>
              })}
            </div>
          </>}
          {activeMeal&&<>
            {entry.foods.filter(f=>f.meal===activeMeal).length===0&&<div className={styles.fsEmpty}>В {activeMeal.toLowerCase()} пока ничего нет.<br/>Нажмите + чтобы добавить</div>}
            {entry.foods.filter(f=>f.meal===activeMeal).map(food=>(
              <div key={food.id} className={styles.foodItem}>
                <div className={styles.foodInfo}>
                  <div className={styles.foodName}>{food.name}</div>
                  <div className={styles.foodMeta}>{food.weight}г · {Math.round(food.calories)} ккал · Б:{Math.round(food.protein)} Ж:{Math.round(food.fat)} У:{Math.round(food.carbs)}</div>
                </div>
                <button className={styles.editBtn} onClick={()=>openEditFood(food)}><Pencil size={12}/></button>
                <button className={styles.removeBtn} onClick={()=>removeFood(food.id)}><X size={12}/></button>
              </div>
            ))}
          </>}
        </div>
      </FullScreenPanel>}

      {/* ТРЕНИРОВКИ */}
      {showWorkoutPanel&&<FullScreenPanel>
        <div style={fsHdr}>
          <button style={fsBack} onClick={()=>workoutMode?setWorkoutMode(null):setShowWorkoutPanel(false)}>
            {workoutMode?<ChevronLeft size={20}/>:<X size={18}/>}
          </button>
          <div style={fsTitleS}><Dumbbell size={16} color="#7aa0cc"/>Тренировки</div>
          <div style={{width:38}}/>
        </div>
        <div style={fsContent}>
          {!workoutMode&&<>
            {workoutCount>0&&<div style={{marginBottom:20}}>
              {(entry.workouts||[]).map(w=>(
                <div key={w.id} className={styles.workoutItem}>
                  <div className={styles.workoutIcon}><Dumbbell size={18} color="#7aa0cc" strokeWidth={1.5}/></div>
                  <div className={styles.workoutInfo}>
                    <div className={styles.workoutName}>{w.type}</div>
                    <div className={styles.workoutMeta}>{w.duration} мин{w.pulse?` · пульс ${w.pulse}`:''}</div>
                    {w.exercises?.length>0&&<div className={styles.exTags}>{w.exercises.slice(0,4).map((ex,i)=><span key={i} className={styles.exTag}>{ex}</span>)}</div>}
                  </div>
                  <button className={styles.removeBtn} onClick={()=>removeWorkout(w.id)}><X size={12}/></button>
                </div>
              ))}
            </div>}
            <div className={styles.workoutModeTitle}>Добавить тренировку</div>
            <div className={styles.workoutModeGrid}>
              <button className={styles.workoutModeCard} onClick={()=>{setWorkoutMode('own');setShowWorkoutModal(true)}}>
                <div className={styles.workoutModeIcon} style={{background:'rgba(122,160,204,.12)',border:'1px solid rgba(122,160,204,.3)'}}><Dumbbell size={28} color="#7aa0cc" strokeWidth={1.5}/></div>
                <div className={styles.workoutModeLabel}>Своя тренировка</div>
                <div className={styles.workoutModeDesc}>Выберите упражнения вручную</div>
              </button>
              <button className={styles.workoutModeCard} onClick={()=>setWorkoutMode('plan')} style={{opacity:plan?1:0.4}}>
                <div className={styles.workoutModeIcon} style={{background:'rgba(201,168,76,.12)',border:'1px solid rgba(201,168,76,.3)'}}><Sparkles size={28} color="#C9A84C" strokeWidth={1.5}/></div>
                <div className={styles.workoutModeLabel}>По плану</div>
                <div className={styles.workoutModeDesc}>{plan?'Из вашего AI-плана':'Сначала создайте план'}</div>
              </button>
            </div>
          </>}
          {workoutMode==='plan'&&plan&&<>
            <div className={styles.workoutModeTitle}>Выберите день</div>
            {Object.entries(DAYS_RU).map(([key,label])=>{
              const d=plan[key]; if(!d||d.type==='rest') return null
              return <button key={key} className={styles.planDayRow} onClick={()=>addWorkout({type:d.name,duration:d.duration||60,pulse:null,notes:d.notes||'',exercises:(d.exercises||[]).map(ex=>ex.name)})}>
                <div><div className={styles.planDayName}>{label}</div><div className={styles.planDayTitle}>{d.name}</div></div>
                <div className={styles.planDayMeta}>{d.duration} мин · {(d.exercises||[]).length} упр.</div>
              </button>
            })}
          </>}
        </div>
      </FullScreenPanel>}

      {/* ДОБАВИТЬ / РЕДАКТИРОВАТЬ ЕДУ */}
      {foodModal&&createPortal(
        <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(0,0,0,.8)',zIndex:300,display:'flex',alignItems:'flex-end',backdropFilter:'blur(6px)'}}>
          <div style={{background:'#111118',borderRadius:'28px 28px 0 0',padding:'20px 16px 40px',width:'100%',maxWidth:560,margin:'0 auto',maxHeight:'90vh',overflowY:'auto',border:'1px solid rgba(255,255,255,.1)',fontFamily:'Montserrat,sans-serif'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <span style={{fontSize:16,fontWeight:700}}>{editingFood?'Редактировать':`Добавить — ${activeMeal}`}</span>
              <button onClick={()=>{setFoodModal(false);setEditingFood(null)}} style={{background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.1)',borderRadius:10,width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'rgba(255,255,255,.6)'}}><X size={16}/></button>
            </div>
            {!editingFood&&<div className={styles.modeTabs}>
              <button className={`${styles.modeTab} ${!manualMode?styles.modeActive:''}`} onClick={()=>setManualMode(false)}>Поиск</button>
              <button className={`${styles.modeTab} ${manualMode?styles.modeActive:''}`} onClick={()=>setManualMode(true)}>Вручную</button>
            </div>}
            {!manualMode&&!editingFood?<>
              <div className={styles.searchRow}>
                <input className={styles.searchInput} placeholder="Название продукта..." value={query} onChange={e=>handleSearch(e.target.value)} autoFocus/>
                <label className={styles.camBtn}>
                  {scanLoading?'⏳':<Camera size={20} color="#fff"/>}
                  <input type="file" accept="image/*" capture="environment" style={{display:'none'}} onChange={e=>e.target.files[0]&&handleScan(e.target.files[0])}/>
                </label>
              </div>
              {searchResults.length>0&&!selectedFood&&<div className={styles.results}>
                {searchResults.map((item,i)=><button key={i} className={styles.resultItem} onClick={()=>selectFood(item)}>
                  <span className={styles.resultName}>{item.name}</span>
                  <span className={styles.resultCal}>{item.cal100} ккал/100г</span>
                </button>)}
              </div>}
              {selectedFood&&<div className="field"><div className="field-label">Вес порции (г)</div><input className="field-input" type="number" value={weight} onChange={e=>setWeight(e.target.value)}/></div>}
              {preview&&<div className={styles.preview}>
                <div className={styles.previewName}>{preview.name} — {weight}г</div>
                <div className={styles.previewMacros}><span>{Math.round(preview.calories)} ккал</span><span>Б:{Math.round(preview.protein)}г</span><span>Ж:{Math.round(preview.fat)}г</span><span>У:{Math.round(preview.carbs)}г</span></div>
              </div>}
            </>:<div>
              <div className="field"><div className="field-label">Название</div><input className="field-input" value={manualData.name} onChange={e=>setManualData(d=>({...d,name:e.target.value}))}/></div>
              <div className="field"><div className="field-label">Вес порции (г)</div><input className="field-input" type="number" value={weight} onChange={e=>setWeight(e.target.value)}/></div>
              <div className={styles.macroInputs}>
                {[['calories','Ккал/100г'],['protein','Белок/100г'],['fat','Жиры/100г'],['carbs','Углеводы/100г']].map(([k,l])=>(
                  <div key={k} className="field"><div className="field-label">{l}</div><input className="field-input" type="number" value={manualData[k]} onChange={e=>setManualData(d=>({...d,[k]:e.target.value}))}/></div>
                ))}
              </div>
            </div>}
            <button className="btn-primary" style={{marginTop:14}} onClick={saveFood} disabled={!editingFood&&(manualMode?!manualData.name:!selectedFood)}>
              {editingFood?'Сохранить изменения':`Добавить в ${activeMeal}`}
            </button>
          </div>
        </div>
      , document.body)}

      {showWorkoutModal&&<WorkoutModal onAdd={addWorkout} onClose={()=>{setShowWorkoutModal(false);setWorkoutMode(null)}}/>}
    </div>
  )
}
