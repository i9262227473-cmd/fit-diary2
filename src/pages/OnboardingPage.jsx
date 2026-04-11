import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import styles from './OnboardingPage.module.css'

const STEPS = [
  {
    id: 'name',
    title: 'Как вас зовут?',
    subtitle: 'Имя будет отображаться в приложении',
    type: 'name',
  },
  {
    id: 'role',
    title: 'Кто вы?',
    subtitle: 'Это поможет настроить приложение под ваши нужды',
    type: 'single',
    options: [
      { value: 'athlete', emoji: '🏋️', label: 'Спортсмен', desc: 'Слежу за питанием и тренировками для себя' },
      { value: 'trainer', emoji: '👨‍🏫', label: 'Тренер', desc: 'Веду клиентов и отслеживаю их прогресс' },
      { value: 'both', emoji: '🏆', label: 'Тренер и спортсмен', desc: 'Тренируюсь сам и веду клиентов' },
    ]
  },
  {
    id: 'level',
    title: 'Ваш уровень подготовки',
    subtitle: 'Это влияет на строгость оценки ИИ',
    type: 'single',
    options: [
      { value: 'beginner', emoji: '🌱', label: 'Новичок', desc: 'Только начинаю заниматься спортом' },
      { value: 'amateur', emoji: '💪', label: 'Любитель', desc: 'Регулярно тренируюсь 1-2 года' },
      { value: 'advanced', emoji: '🔥', label: 'Продвинутый', desc: 'Серьёзно занимаюсь 3+ лет' },
      { value: 'professional', emoji: '🥇', label: 'Профессионал', desc: 'Выступаю на соревнованиях' },
    ]
  },
  {
    id: 'goals',
    title: 'Ваши цели',
    subtitle: 'Можно выбрать несколько',
    type: 'multi',
    options: [
      { value: 'weight_loss', emoji: '⚖️', label: 'Похудение', desc: 'Снизить вес и процент жира' },
      { value: 'muscle_gain', emoji: '💪', label: 'Набор массы', desc: 'Увеличить мышечную массу' },
      { value: 'maintenance', emoji: '🎯', label: 'Поддержание', desc: 'Сохранить текущую форму' },
      { value: 'endurance', emoji: '🏃', label: 'Выносливость', desc: 'Улучшить кардио и выносливость' },
      { value: 'strength', emoji: '🏋️', label: 'Сила', desc: 'Увеличить силовые показатели' },
      { value: 'health', emoji: '❤️', label: 'Здоровье', desc: 'Общее улучшение самочувствия' },
    ]
  },
  {
    id: 'limitations',
    title: 'Ограничения и противопоказания',
    subtitle: 'ИИ учтёт это при рекомендациях',
    type: 'limitations',
  },
  {
    id: 'body',
    title: 'Параметры тела',
    subtitle: 'Для расчёта нормы калорий, КБЖУ и ИМТ',
    type: 'form',
    fields: [
      { id: 'age', label: 'Возраст', placeholder: 'лет', type: 'number', min: 10, max: 100 },
      { id: 'weight', label: 'Вес (кг)', placeholder: 'кг', type: 'number', min: 30, max: 300 },
      { id: 'height', label: 'Рост (см)', placeholder: 'см', type: 'number', min: 100, max: 250 },
      { id: 'gender', label: 'Пол', type: 'select', options: [
        { value: 'male', label: 'Мужской' },
        { value: 'female', label: 'Женский' },
      ]},
      { id: 'activity', label: 'Активность', type: 'select', options: [
        { value: 'sedentary', label: 'Сидячий образ жизни' },
        { value: 'light', label: 'Лёгкая активность (1-3 тр/нед)' },
        { value: 'moderate', label: 'Умеренная (3-5 тр/нед)' },
        { value: 'active', label: 'Высокая (6-7 тр/нед)' },
        { value: 'very_active', label: 'Очень высокая (2 тр/день)' },
      ]},
    ]
  },
  {
    id: 'meds',
    title: 'Принимаемые препараты',
    subtitle: 'AI учтёт это при анализе и рекомендациях',
    type: 'meds',
  },
  {
    id: 'goalDeadline',
    title: 'Цель и срок',
    subtitle: 'AI будет строже оценивать прогресс с учётом срока',
    type: 'goalDeadline',
  },
]

const calcBMI = (weight, height) => {
  if (!weight || !height) return null
  const bmi = +weight / ((+height / 100) ** 2)
  return bmi.toFixed(1)
}

const getBMILabel = (bmi) => {
  if (!bmi) return null
  if (bmi < 18.5) return { label: 'Недостаточный вес', color: '#3b82f6' }
  if (bmi < 25) return { label: 'Норма', color: '#16a34a' }
  if (bmi < 30) return { label: 'Избыточный вес', color: '#d97706' }
  return { label: 'Ожирение', color: '#dc2626' }
}

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({
    name: '',
    role: null,
    level: null,
    goals: [],
    hasLimitations: null,
    limitationsText: '',
    hasMeds: null,
    medsText: '',
    goalText: '',
    goalDeadline: '',
    age: '',
    weight: '',
    height: '',
    gender: 'male',
    activity: 'moderate',
  })
  const [loading, setLoading] = useState(false)
  const { saveProfile } = useStore()
  const navigate = useNavigate()

  const currentStep = STEPS[step]
  const isLast = step === STEPS.length - 1

  const toggleMulti = (field, value) => {
    const arr = answers[field] || []
    if (arr.includes(value)) {
      setAnswers(a => ({ ...a, [field]: arr.filter(v => v !== value) }))
    } else {
      setAnswers(a => ({ ...a, [field]: [...arr, value] }))
    }
  }

  const canNext = () => {
    const s = currentStep
    if (s.type === 'name') return answers.name.trim().length >= 2
    if (s.type === 'single') return !!answers[s.id]
    if (s.type === 'multi') return (answers[s.id] || []).length > 0
    if (s.type === 'limitations') {
      if (answers.hasLimitations === false) return true
      if (answers.hasLimitations === true) return answers.limitationsText.trim().length > 3
      return false
    }
    if (s.type === 'meds') {
      if (answers.hasMeds === false) return true
      if (answers.hasMeds === true) return answers.medsText.trim().length > 2
      return false
    }
    if (s.type === 'goalDeadline') return true // необязательный
    if (s.type === 'form') return answers.age && answers.weight && answers.height
    return true
  }

  const handleNext = async () => {
    if (!canNext()) return
    if (!isLast) {
      setStep(s => s + 1)
      return
    }

    setLoading(true)
    try {
      const w = +answers.weight, h = +answers.height, a = +answers.age
      const bmr = answers.gender === 'male'
        ? 10 * w + 6.25 * h - 5 * a + 5
        : 10 * w + 6.25 * h - 5 * a - 161
      const activityFactors = {
        sedentary: 1.2, light: 1.375, moderate: 1.55,
        active: 1.725, very_active: 1.9
      }
      const tdee = Math.round(bmr * (activityFactors[answers.activity] || 1.55))
      const proteinGoal = Math.round(w * (answers.level === 'professional' ? 2.2 : 1.8))
      const fatGoal = Math.round(tdee * 0.25 / 9)
      const carbGoal = Math.round((tdee - proteinGoal * 4 - fatGoal * 9) / 4)
      const bmi = calcBMI(w, h)

      await saveProfile({
        ...answers,
        calorieGoal: tdee,
        proteinGoal,
        fatGoal,
        carbGoal,
        bmi,
        completedAt: new Date().toISOString(),
      })
      navigate('/dashboard')
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const bmi = calcBMI(answers.weight, answers.height)
  const bmiInfo = getBMILabel(bmi)

  return (
    <div className={styles.page}>
      {/* Прогресс */}
      <div className={styles.progress}>
        {STEPS.map((_, i) => (
          <div key={i} className={`${styles.dot} ${i <= step ? styles.dotActive : ''}`} />
        ))}
      </div>

      <div className={styles.content}>
        <div className={styles.stepHeader}>
          <h2 className={styles.title}>{currentStep.title}</h2>
          <p className={styles.subtitle}>{currentStep.subtitle}</p>
        </div>

        {/* Name */}
        {currentStep.type === 'name' && (
          <div className={styles.formFields}>
            <div className="field">
              <div className="field-label">Ваше имя</div>
              <input className="field-input" type="text" placeholder="Например: Алексей"
                value={answers.name} autoFocus
                onChange={e => setAnswers(a => ({ ...a, name: e.target.value }))} />
            </div>
          </div>
        )}

        {/* Single choice */}
        {currentStep.type === 'single' && (
          <div className={styles.options}>
            {currentStep.options.map(opt => (
              <button
                key={opt.value}
                className={`${styles.option} ${answers[currentStep.id] === opt.value ? styles.optionActive : ''}`}
                onClick={() => setAnswers(a => ({ ...a, [currentStep.id]: opt.value }))}
              >
                <span className={styles.optionEmoji}>{opt.emoji}</span>
                <div className={styles.optionText}>
                  <div className={styles.optionLabel}>{opt.label}</div>
                  <div className={styles.optionDesc}>{opt.desc}</div>
                </div>
                <span className={styles.optionCheck}>{answers[currentStep.id] === opt.value ? '✓' : ''}</span>
              </button>
            ))}
          </div>
        )}

        {/* Multi choice */}
        {currentStep.type === 'multi' && (
          <div className={styles.options}>
            {currentStep.options.map(opt => {
              const selected = (answers[currentStep.id] || []).includes(opt.value)
              return (
                <button
                  key={opt.value}
                  className={`${styles.option} ${selected ? styles.optionActive : ''}`}
                  onClick={() => toggleMulti(currentStep.id, opt.value)}
                >
                  <span className={styles.optionEmoji}>{opt.emoji}</span>
                  <div className={styles.optionText}>
                    <div className={styles.optionLabel}>{opt.label}</div>
                    <div className={styles.optionDesc}>{opt.desc}</div>
                  </div>
                  <span className={styles.optionCheck}>{selected ? '✓' : ''}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Limitations */}
        {currentStep.type === 'limitations' && (
          <div className={styles.options}>
            <button
              className={`${styles.option} ${answers.hasLimitations === false ? styles.optionActive : ''}`}
              onClick={() => setAnswers(a => ({ ...a, hasLimitations: false, limitationsText: '' }))}
            >
              <span className={styles.optionEmoji}>✅</span>
              <div className={styles.optionText}>
                <div className={styles.optionLabel}>Нет ограничений</div>
                <div className={styles.optionDesc}>Всё в порядке со здоровьем</div>
              </div>
              <span className={styles.optionCheck}>{answers.hasLimitations === false ? '✓' : ''}</span>
            </button>

            <button
              className={`${styles.option} ${answers.hasLimitations === true ? styles.optionActive : ''}`}
              onClick={() => setAnswers(a => ({ ...a, hasLimitations: true }))}
            >
              <span className={styles.optionEmoji}>⚕️</span>
              <div className={styles.optionText}>
                <div className={styles.optionLabel}>Есть ограничения</div>
                <div className={styles.optionDesc}>Укажу диагноз или противопоказания</div>
              </div>
              <span className={styles.optionCheck}>{answers.hasLimitations === true ? '✓' : ''}</span>
            </button>

            {answers.hasLimitations === true && (
              <div className={`${styles.textAreaWrap} fade-in`}>
                <div className="field-label">Опишите ваши ограничения</div>
                <textarea
                  className={styles.textArea}
                  placeholder="Например: кoxартроз тазобедренного сустава, искусственный клапан аорты, гипертония..."
                  value={answers.limitationsText}
                  onChange={e => setAnswers(a => ({ ...a, limitationsText: e.target.value }))}
                  rows={4}
                />
                <div className={styles.textAreaHint}>
                  ИИ учтёт это при составлении плана тренировок и оценке нагрузки
                </div>
              </div>
            )}
          </div>
        )}

        {/* Meds */}
        {currentStep.type === 'meds' && (
          <div className={styles.options}>
            <button
              className={`${styles.option} ${answers.hasMeds === false ? styles.optionActive : ''}`}
              onClick={() => setAnswers(a => ({ ...a, hasMeds: false, medsText: '' }))}
            >
              <span className={styles.optionEmoji}>✅</span>
              <div className={styles.optionText}>
                <div className={styles.optionLabel}>Не принимаю препараты</div>
                <div className={styles.optionDesc}>Ничего не принимаю постоянно</div>
              </div>
              <span className={styles.optionCheck}>{answers.hasMeds === false ? '✓' : ''}</span>
            </button>
            <button
              className={`${styles.option} ${answers.hasMeds === true ? styles.optionActive : ''}`}
              onClick={() => setAnswers(a => ({ ...a, hasMeds: true }))}
            >
              <span className={styles.optionEmoji}>💊</span>
              <div className={styles.optionText}>
                <div className={styles.optionLabel}>Есть постоянные препараты</div>
                <div className={styles.optionDesc}>Укажу названия</div>
              </div>
              <span className={styles.optionCheck}>{answers.hasMeds === true ? '✓' : ''}</span>
            </button>
            {answers.hasMeds === true && (
              <div className={`${styles.textAreaWrap} fade-in`}>
                <div className="field-label">Препараты</div>
                <textarea className={styles.textArea}
                  placeholder="Например: Маркумар, Престанс, Оземпик..."
                  value={answers.medsText} rows={3}
                  onChange={e => setAnswers(a => ({ ...a, medsText: e.target.value }))} />
                <div className={styles.textAreaHint}>AI учтёт это при анализе и рекомендациях</div>
              </div>
            )}
          </div>
        )}

        {/* Goal deadline */}
        {currentStep.type === 'goalDeadline' && (
          <div className={styles.formFields}>
            <div className="field">
              <div className="field-label">Конкретная цель</div>
              <input className="field-input" type="text"
                placeholder="Например: похудеть на 8 кг, набрать 5 кг мышц..."
                value={answers.goalText}
                onChange={e => setAnswers(a => ({ ...a, goalText: e.target.value }))} />
            </div>
            <div className="field">
              <div className="field-label">Срок (необязательно)</div>
              <input className="field-input" type="date"
                value={answers.goalDeadline}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => setAnswers(a => ({ ...a, goalDeadline: e.target.value }))} />
            </div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,.3)', marginTop:4 }}>
              AI будет учитывать срок при оценке вашего прогресса. Можно пропустить.
            </div>
          </div>
        )}

        {/* Form */}
        {currentStep.type === 'form' && (
          <div className={styles.formFields}>
            {currentStep.fields.map(field => (
              <div key={field.id} className="field">
                <div className="field-label">{field.label}</div>
                {field.type === 'select' ? (
                  <select
                    className="field-input"
                    value={answers[field.id]}
                    onChange={e => setAnswers(a => ({ ...a, [field.id]: e.target.value }))}
                  >
                    {field.options.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="field-input"
                    type={field.type}
                    placeholder={field.placeholder}
                    value={answers[field.id]}
                    min={field.min}
                    max={field.max}
                    onChange={e => setAnswers(a => ({ ...a, [field.id]: e.target.value }))}
                  />
                )}
              </div>
            ))}

            {/* ИМТ */}
            {bmi && bmiInfo && (
              <div className={styles.bmiCard}>
                <div className={styles.bmiLabel}>Индекс массы тела (ИМТ)</div>
                <div className={styles.bmiValue} style={{ color: bmiInfo.color }}>{bmi}</div>
                <div className={styles.bmiStatus} style={{ color: bmiInfo.color }}>{bmiInfo.label}</div>
                <div className={styles.bmiScale}>
                  <div className={styles.bmiBar}>
                    <div className={styles.bmiPointer} style={{
                      left: `${Math.min(Math.max((bmi - 15) / 25 * 100, 0), 100)}%`
                    }} />
                  </div>
                  <div className={styles.bmiTicks}>
                    <span>15</span><span>18.5</span><span>25</span><span>30</span><span>40</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Кнопки */}
      <div className={styles.footer}>
        {step > 0 && (
          <button className="btn-secondary" onClick={() => setStep(s => s - 1)}>
            ← Назад
          </button>
        )}
        <button
          className="btn-primary"
          onClick={handleNext}
          disabled={!canNext() || loading}
          style={{ flex: 1 }}
        >
          {loading ? '⏳ Сохранение...' : isLast ? '🚀 Начать!' : 'Далее →'}
        </button>
      </div>
    </div>
  )
}
