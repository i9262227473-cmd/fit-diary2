// PATCH: заменить RestTimer и WorkoutComplete в DashboardPage.jsx
// БАГ 1: RestTimer — useEffect зависит от [running, remaining], что при каждом тике
//         вызывает clearInterval + новый setInterval → CPU spike
// БАГ 2: WorkoutComplete — Math.random() в JSX на каждом рендере → infinite loop

// ИСПРАВЛЕННЫЙ RestTimer:
/*
function RestTimer({ duration = 90, onClose, exerciseName, setInfo }) {
  const [remaining, setRemaining] = useState(duration)
  const ref = useRef(null)

  useEffect(() => {
    ref.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) { clearInterval(ref.current); return 0 }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(ref.current)
  }, [])  // ← ПУСТОЙ массив зависимостей!
  ...
}
*/

// ИСПРАВЛЕННЫЙ WorkoutComplete:
// Конфетти вынести в useMemo чтобы Math.random() вызывался ОДИН РАЗ при монтировании
/*
function WorkoutComplete({ workout, duration, onSave }) {
  const confettiItems = useMemo(() => 
    Array.from({ length: 20 }).map((_, i) => ({
      left: `${5 + Math.random() * 90}%`,
      top: `${Math.random() * 60}px`,
      color: ['#3d9970','#fbbf24','#38bdf8','#f87171','#a78bfa'][i % 5],
      anim: `${0.8 + Math.random()}s`,
      delay: `${i * 0.05}s`,
    }))
  , [])
  ...
  {confettiItems.map((c, i) => (
    <div key={i} style={{ position:'absolute', left:c.left, top:c.top, width:6, height:6,
      borderRadius:'50%', background:c.color,
      animation:`confetti ${c.anim} ease ${c.delay} both` }} />
  ))}
}
*/
