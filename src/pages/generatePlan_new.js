  const generatePlan = async () => {
    setLoading(true); setError(null)
    try {
      // ─── Параметры по уровню ───────────────────────────────────────────────
      const lvlKey = levelKey === 'professional' ? 'expert' : levelKey
      const levelParams = {
        beginner: { split:'full body',      exPerDay:'4-6',  sets:'2-3', restSec:'60-90',  reps:{ fat_loss:'10-15', muscle_gain:'8-12', strength:'6-10', maintenance:'10-12' } },
        amateur:  { split:'upper/lower',    exPerDay:'5-8',  sets:'3-4', restSec:'60-120', reps:{ fat_loss:'10-15', muscle_gain:'6-12', strength:'4-8',  maintenance:'8-12'  } },
        advanced: { split:'push/pull/legs', exPerDay:'6-10', sets:'3-5', restSec:'90-180', reps:{ fat_loss:'10-15', muscle_gain:'6-12', strength:'4-6',  maintenance:'8-12'  } },
        expert:   { split:'кастомный',      exPerDay:'8-12', sets:'4-6', restSec:'120-240',reps:{ fat_loss:'10-15', muscle_gain:'6-12', strength:'3-6',  maintenance:'8-12'  } },
      }
      const p = levelParams[lvlKey] || levelParams.amateur
      const repsRange = p.reps[goalKey] || '8-12'
      const daysPerWeek = lvlKey === 'beginner' ? 3 : lvlKey === 'amateur' ? 4 : 5
      const duration = lvlKey === 'beginner' ? 45 : 60
      const expYears = lvlKey === 'beginner' ? 0 : lvlKey === 'amateur' ? 1 : lvlKey === 'advanced' ? 3 : 5
      const subjLoad = 'средне'

      // ─── Промт профессионального тренера ──────────────────────────────────
      const prompt = `Ты — профессиональный фитнес-тренер и алгоритм генерации персональных тренировочных программ.
НЕ используй шаблонные программы. Всегда генерируй план через правила и параметры.

ВХОДНЫЕ ДАННЫЕ ПОЛЬЗОВАТЕЛЯ:
- Уровень подготовки: ${lvlKey}
- Цель: ${goalKey}
- Возраст: ${profile?.age || 25}
- Пол: ${profile?.gender || 'male'}
- Вес: ${profile?.weight || 80} кг
- Рост: ${profile?.height || 175} см
- Ограничения/травмы: ${injuries.length > 0 ? injuries.join(', ') : 'нет'}
- Доступ к оборудованию: gym
- Частота тренировок: ${daysPerWeek} в неделю
- Длительность тренировки: ${duration} минут
- Опыт тренировок: ${expYears} лет
- Субъективная нагрузка: ${subjLoad}

ПАРАМЕТРЫ ПО УРОВНЮ (строго соблюдай):
- Тип сплита: ${p.split}
- Упражнений за тренировку: ${p.exPerDay}
- Подходов на упражнение: ${p.sets}
- Повторений (цель ${goalKey}): ${repsRange}
- Отдых между подходами: ${p.restSec} сек

ПРАВИЛА ГЕНЕРАЦИИ (обязательно):
1. НЕ БОЛЕЕ ${lvlKey === 'beginner' ? '6' : lvlKey === 'amateur' ? '8' : '10'} упражнений за тренировку
2. НЕ БОЛЕЕ 20 подходов на мышечную группу в неделю
3. На каждую мышечную группу: 1-2 базовых (compound) + 1-2 изолирующих (isolation)
4. Обязательные дни отдыха (не менее 1-2 в неделю)
5. Исключить упражнения опасные при ограничениях/травмах
6. ВСЕ текстовые поля — ТОЛЬКО на русском языке
7. Названия дней: Понедельник, Вторник, Среда, Четверг, Пятница, Суббота, Воскресенье
8. Мышечные группы: Грудь, Спина, Ноги, Плечи, Трицепс, Бицепс, Кор, Кардио

ПРАВИЛА ПРОГРЕССИИ:
- Выполнил все подходы в норме → +2.5-5% к весу
- RPE < 7 (легко) → увеличить нагрузку
- RPE 7-9 (нормально) → оставить
- RPE > 9 (тяжело) → снизить

ВЕРНИ ТОЛЬКО валидный JSON без markdown, без комментариев:
{
  "plan": {
    "split": "Фулбоди",
    "days": [
      {
        "day_index": 0,
        "name": "Понедельник",
        "muscles": ["Грудь", "Спина"],
        "exercises": [
          {
            "id": "1",
            "name": "Жим штанги лёжа",
            "muscle": "Грудь",
            "type": "compound",
            "sets": 3,
            "reps": { "min": 8, "max": 12 },
            "rest_sec": 90
          }
        ]
      }
    ]
  },
  "progression": {
    "type": "linear",
    "rules": { "success": "increase_weight", "failure": "reduce_or_repeat" },
    "increment_percent": { "min": 2.5, "max": 5 },
    "rpe": { "low": "<7 increase", "optimal": "7-9 keep", "high": ">9 decrease" }
  },
  "adaptation": {
    "too_easy": "increase_volume_or_weight",
    "too_hard": "reduce_volume_or_weight",
    "skipping": "reduce_frequency",
    "pain": "replace_exercise"
  }
}`

      const reply = await aiCall([{ role: 'user', content: prompt }], 2500)
      const clean = reply.replace(/```json|```/g, '').trim()
      const match = clean.match(/\{[\s\S]*\}/)
      if (match) {
        const parsed = JSON.parse(match[0])
        if (parsed.plan?.days) {
          const translated = translatePlan(parsed)
          setPlan(translated)
          localStorage.setItem(PLAN_KEY, JSON.stringify(translated))
          setExpandedDay(0)
        } else {
          setError('AI вернул некорректную структуру. Попробуй ещё раз.')
        }
      } else {
        setError('AI вернул некорректный ответ. Попробуй ещё раз.')
      }
    } catch (e) {
      setError('Ошибка соединения. Проверь интернет и попробуй снова.')
    }
    setLoading(false)
  }
