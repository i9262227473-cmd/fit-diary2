import React, { useState } from 'react'
import { CalendarDays, Download, Dumbbell, Flame } from 'lucide-react'
import FeatureIcon from '../common/FeatureIcon'
import { buildReportData, generateReportPDF } from '../../utils/pdfReport'

function ProgressScreen({ state }) {
  const [reportPeriod, setReportPeriod] = useState(7)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState(null)
  const goals = { calories: state.profile?.calorieGoal || 2200, protein: state.profile?.proteinGoal || 150, fat: state.profile?.fatGoal || 70, carbs: state.profile?.carbGoal || 250 }
  const handleExportPDF = async () => {
    setReportLoading(true); setReportError(null)
    try {
      const data = buildReportData(state.entries, reportPeriod, goals)
      const periodLabel = reportPeriod === 7 ? 'последняя неделя' : 'последний месяц'
      const userName = state.profile?.name || 'Пользователь'
      const doc = await generateReportPDF(data, periodLabel, userName)
      const fileName = `fitdiary-report-${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fileName)
    } catch (e) {
      console.error('PDF export error:', e)
      setReportError('Не удалось сформировать PDF. Проверьте соединение с интернетом и попробуйте ещё раз.')
    } finally {
      setReportLoading(false)
    }
  }
  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
  const weekData = weekDays.map((day, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const e = state.entries.find(en => en.date === d.toISOString().split('T')[0]) || { foods: [] }
    return { day, cal: e.foods.reduce((a, f) => a + (f.calories||0), 0) }
  })
  weekData.push({ day: 'Сг', cal: (state.entries.find(e => e.date === new Date().toISOString().split('T')[0])?.foods || []).reduce((a, f) => a + (f.calories||0), 0), isToday: true })
  const maxCal = Math.max(...weekData.map(d => d.cal), 2200, 1)
  const totalWorkouts = state.entries.reduce((a, e) => a + (e.workouts?.length || 0), 0)

  const metricCards = [
    { Icon: Dumbbell, label: 'Тренировок', value: totalWorkouts },
    { Icon: Flame, label: 'Калорий сж.', value: state.entries.reduce((a, e) => a + (e.workouts||[]).reduce((b, w) => b + (w.caloriesBurned||0), 0), 0) },
    { Icon: CalendarDays, label: 'Дней подряд', value: 0 },
  ]

  const cardStyle = { background: 'var(--card)', borderRadius: 20, padding: 16, border: '1px solid var(--border)', boxShadow: 'var(--shadow-soft)' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Статистика</div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>Прогресс</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {metricCards.map(({ Icon, label, value }) => (
          <div key={label} style={{ ...cardStyle, padding: '12px 8px', textAlign: 'center' }}>
            <div style={{ marginBottom: 7 }}><FeatureIcon Icon={Icon} size={19} /></div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700, color: 'var(--accent)', marginBottom: 2 }}>{value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
          </div>
        ))}
      </div>
      <div style={cardStyle}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Калории за неделю</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 120 }}>
          {weekData.map((d, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'flex-end' }}>
                <div style={{ width: '100%', borderRadius: '6px 6px 0 0', height: `${Math.max((d.cal/maxCal)*100, 2)}%`, background: d.isToday ? 'var(--accent)' : 'var(--accent-dim)' }} />
              </div>
              <div style={{ fontSize: 11, color: d.isToday ? 'var(--accent)' : 'var(--text-muted)', fontWeight: d.isToday ? 700 : 400 }}>{d.day}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Экспорт отчёта в PDF */}
      <div style={cardStyle}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Экспорт отчёта</div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>Скачайте PDF-отчёт по питанию и тренировкам за выбранный период</p>
        <div style={{ display: 'flex', background: 'var(--surface2)', borderRadius: 12, padding: 4, gap: 4, marginBottom: 14, border: '1px solid var(--border)' }}>
          {[[7, 'Неделя'], [30, 'Месяц']].map(([days, label]) => (
            <button key={days} onClick={() => setReportPeriod(days)} style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: reportPeriod === days ? 'var(--accent)' : 'transparent', color: reportPeriod === days ? 'var(--accent-contrast)' : 'var(--text-muted)' }}>{label}</button>
          ))}
        </div>
        {reportError && <div style={{ fontSize: 13, color: '#f87171', background: 'rgba(248,113,113,0.1)', padding: '10px 14px', borderRadius: 10, marginBottom: 12 }}>{reportError}</div>}
        <button onClick={handleExportPDF} disabled={reportLoading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'linear-gradient(135deg, var(--accent-bright), var(--accent))', color: 'var(--accent-contrast)', border: 'none', borderRadius: 12, padding: '13px', fontSize: 14, fontWeight: 700, width: '100%', cursor: 'pointer', opacity: reportLoading ? 0.6 : 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          <Download size={18} strokeWidth={2.2} />{reportLoading ? 'Формирую...' : 'Скачать PDF'}
        </button>
      </div>
    </div>
  )
}

export default ProgressScreen
