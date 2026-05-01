// Генерация AI-плана тренировок с детальным промтом и валидацией
import { normReps } from '../pages/planUtils'

const LEVEL_RU = { beginner: 'новичок', amateur: 'любитель', advanced: 'продвинутый', professional: 'профессионал' }
const GOAL_RU  = { weight_loss: 'fat_loss', muscle_gain: 'muscle_gain', maintenance: 'maintenance', endurance: 'maintenance', strength: 'strength', health: 'maintenance' }

const EN_TO_RU = {
  'Monday':'Понедельник','Tuesday':'Вторник','Wednesday':'Среда','Thursday':'Четверг',
  'Friday':'Пятница','Saturday':'Суббота','Sunday':'Воскресенье',
  'Rest':'Отдых','Rest Day':'День отдыха','Recovery':'Восстановление',
  'chest':'Грудь','back':'Спина','legs':'Ноги','shoulders':'Плечи',
  'triceps':'Трицепс','biceps':'Бицепс','core':'Кор','abs':'Пресс','cardio':'Кардио',
  'glutes':'Ягодицы','hamstrings':'Бицепс бедра','quadriceps':'Квадрицепс','calves':'Икры','arms':'Руки',
  'full body':'Всё тело','full_body':'Фулбоди','upper_lower':'Верх/Низ','push_pull_legs':'Жим/Тяга/Ноги',
}

function translateStr(str) {
  if (!str || typeof str !== 'string') return str
  const exact = Object.keys(EN_TO_RU).find(k => k.toLowerCase() === str.toLowerCase())
  if (exact) return EN_TO_RU[exact]
  let result = str
  Object.entries(EN_TO_RU).forEach(([en, ru]) => { result = result.replace(new RegExp(`\\b${en}\\b`, 'gi'), ru) })
  return result
}

export function translatePlan(parsed) {
  if (!parsed?.plan?.days) return parsed
  return {
    ...parsed,
    plan: {
      ...parsed.plan,
      split: translateStr(parsed.plan.split),
      days: parsed.plan.days.map(day => ({
        ...day,
        name: translateStr(day.name),
        muscles: (day.muscles||[]).map(translateStr),
        exercises: (day.exercises||[]).map(ex => ({
          ...ex,
          name: translateStr(ex.name),
          muscle: translateStr(ex.muscle),
          reps: normReps(ex.reps),
        }))
      }))
    }
  }
}

// Валидация плана — проверяем минимумы
export function validatePlan(plan) {
  if (!plan?.plan?.days || !Array.isArray(plan.plan.days)) {
    return { ok: false, reason: 'Структура плана повреждена' }
  }

  const trainingDays = plan.plan.days.filter(d => d.exercises && d.exercises.length > 0)
  if (trainingDays.length === 0) {
    return { ok: false, reason: 'В плане нет тренировочных дней' }
  }

  // Проверяем что в КАЖДОМ тренировочном дне минимум 4 упражнения
  for (const day of trainingDays) {
    if (day.exercises.length < 4) {
      return { ok: false, reason: `В дне "${day.name}" только ${day.exercises.length} упражнение(й), минимум 4` }
    }
  }

  return { ok: true }
}

export function buildPrompt(profile, levelKey, goalKey, injuries) {
  const lvlKey = levelKey === 'professional' ? 'expert' : levelKey
  const levelParams = {
    beginner: { split:'full body',      exMin:4, exMax:6,  sets:'2-3', restSec:'60-90',   reps:{ fat_loss:'10-15', muscle_gain:'8-12', strength:'6-10', maintenance:'10-12' } },
    amateur:  { split:'upper/lower',    exMin:5, exMax:8,  sets:'3-4', restSec:'60-120',  reps:{ fat_loss:'10-15', muscle_gain:'6-12', strength:'4-8',  maintenance:'8-12'  } },
    advanced: { split:'push/pull/legs', exMin:6, exMax:10, sets:'3-5', restSec:'90-180',  reps:{ fat_loss:'10-15', muscle_gain:'6-12', strength:'4-6',  maintenance:'8-12'  } },
    expert:   { split:'кастомный',      exMin:7, exMax:12, sets:'4-6', restSec:'120-240', reps:{ fat_loss:'10-15', muscle_gain:'6-12', strength:'3-6',  maintenance:'8-12'  } },
  }
  const p = levelParams[lvlKey] || levelParams.amateur
  const repsRange = p.reps[goalKey] || '8-12'
  const daysPerWeek = lvlKey === 'beginner' ? 3 : lvlKey === 'amateur' ? 4 : 5
  const duration = lvlKey === 'beginner' ? 45 : 60
  const expYears = lvlKey === 'beginner' ? 0 : lvlKey === 'amateur' ? 1 : lvlKey === 'advanced' ? 3 : 5

  return { params: p, prompt: `Ты — профессиональный фитнес-тренер с 10-летним опытом. Составь персональный недельный план тренировок строго по правилам.

ВХОДНЫЕ ДАННЫЕ:
- Уровень: ${lvlKey} (опыт ${expYears} лет)
- Цель: ${goalKey}
- Возраст: ${profile?.age || 25}, пол: ${profile?.gender || 'male'}
- Вес: ${profile?.weight || 80} кг, рост: ${profile?.height || 175} см
- Ограничения/травмы: ${injuries.length > 0 ? injuries.join(', ') : 'нет'}
- Оборудование: тренажёрный зал
- Частота: ${daysPerWeek} тренировок в неделю
- Длительность тренировки: ${duration} минут

ПАРАМЕТРЫ ПОДГОТОВКИ (соблюдай ТОЧНО):
- Тип сплита: ${p.split}
- Упражнений за тренировку: МИНИМУМ ${p.exMin}, максимум ${p.exMax}
- Подходов на упражнение: ${p.sets}
- Повторений (под цель ${goalKey}): ${repsRange}
- Отдых между подходами: ${p.restSec} сек

ОБЯЗАТЕЛЬНЫЕ ПРАВИЛА (нарушение = брак):
1. В КАЖДОМ тренировочном дне МИНИМУМ ${p.exMin} упражнений (это критично!).
2. Не более 20 рабочих подходов на одну мышечную группу за неделю.
3. На каждую целевую мышечную группу дня: 1-2 базовых (compound) + 1-2 изолирующих (isolation).
4. Логика сплита:
   - full body: каждая тренировка прорабатывает ВСЁ ТЕЛО (грудь+спина+ноги+руки+кор) с разной интенсивностью
   - upper/lower: чередовать верх (грудь+спина+плечи+руки) и низ (ноги+ягодицы+кор)
   - push/pull/legs: жим (грудь+плечи+трицепс) → тяга (спина+бицепс) → ноги
5. Между тренировочными днями вставлять дни отдыха (exercises: []).
6. Если есть травмы — исключить упражнения нагружающие травмированную область, заменить на безопасные альтернативы.
7. ВСЕ названия — на русском (Понедельник..Воскресенье; Грудь, Спина, Ноги, Плечи, Трицепс, Бицепс, Кор, Кардио).
8. Названия упражнений — реальные русские: "Жим штанги лёжа", "Приседания со штангой", "Тяга верхнего блока" и т.д.

СТРУКТУРА УПРАЖНЕНИЯ:
- Базовые (compound) идут ПЕРВЫМИ в дне, затем изолирующие
- На большие группы (грудь, спина, ноги): 4-5 упражнений
- На малые (бицепс, трицепс, плечи отдельно): 2-3 упражнения

ВЕРНИ ТОЛЬКО валидный JSON без markdown:
{
  "plan": {
    "split": "Фулбоди",
    "days": [
      {
        "day_index": 0,
        "name": "Понедельник",
        "muscles": ["Грудь", "Спина"],
        "exercises": [
          {"name":"Жим штанги лёжа","muscle":"Грудь","type":"compound","sets":3,"reps":{"min":8,"max":12},"rest_sec":90},
          {"name":"Тяга штанги в наклоне","muscle":"Спина","type":"compound","sets":3,"reps":{"min":8,"max":12},"rest_sec":90},
          {"name":"Жим гантелей на наклонной","muscle":"Грудь","type":"compound","sets":3,"reps":{"min":10,"max":12},"rest_sec":90},
          {"name":"Тяга верхнего блока","muscle":"Спина","type":"compound","sets":3,"reps":{"min":10,"max":12},"rest_sec":90},
          {"name":"Разводка гантелей лёжа","muscle":"Грудь","type":"isolation","sets":3,"reps":{"min":12,"max":15},"rest_sec":60}
        ]
      },
      {"day_index":1,"name":"Вторник","muscles":[],"exercises":[]}
    ]
  },
  "progression": {
    "type": "linear",
    "increment_percent": {"min": 2.5, "max": 5},
    "rules": {"success":"increase_weight","failure":"reduce_or_repeat"}
  }
}

КРИТИЧНО: каждый тренировочный день — МИНИМУМ ${p.exMin} упражнений. Если ты дашь меньше — план будет отвергнут.` }
}
