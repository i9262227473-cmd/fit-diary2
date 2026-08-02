let jsPDFPromise = null

function loadJsPDF() {
  if (window.jspdf?.jsPDF) return Promise.resolve(window.jspdf.jsPDF)
  if (jsPDFPromise) return jsPDFPromise

  jsPDFPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
    script.onload = () => resolve(window.jspdf.jsPDF)
    script.onerror = () => reject(new Error('CDN_LOAD_FAILED'))
    document.head.appendChild(script)
  })

  return jsPDFPromise
}

export function buildReportData(entries, days, goals) {
  const today = new Date()
  const dateKeys = []

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    dateKeys.push(date.toISOString().split('T')[0])
  }

  const byDate = entries.reduce((acc, entry) => {
    acc[entry.date] = entry
    return acc
  }, {})

  const dayRows = dateKeys.map((dateKey) => {
    const entry = byDate[dateKey] || { foods: [], workouts: [] }
    const foodTotals = (entry.foods || []).reduce(
      (acc, food) => ({
        cal: acc.cal + (food.calories || 0),
        p: acc.p + (food.protein || 0),
        fat: acc.fat + (food.fat || 0),
        c: acc.c + (food.carbs || 0),
      }),
      { cal: 0, p: 0, fat: 0, c: 0 },
    )

    return {
      date: dateKey,
      cal: Math.round(foodTotals.cal),
      p: Math.round(foodTotals.p),
      fat: Math.round(foodTotals.fat),
      c: Math.round(foodTotals.c),
      foodsCount: (entry.foods || []).length,
      workouts: (entry.workouts || []).map((workout) => ({
        name: workout.name || 'Тренировка',
        duration: workout.duration || 0,
        exercisesCount: (workout.exercisesDetail || workout.exercises || []).length,
      })),
    }
  })

  const daysWithFood = dayRows.filter((day) => day.foodsCount > 0)
  const average = (key) => (
    daysWithFood.length
      ? Math.round(daysWithFood.reduce((sum, day) => sum + day[key], 0) / daysWithFood.length)
      : 0
  )

  const totalWorkouts = dayRows.reduce((sum, day) => sum + day.workouts.length, 0)
  const totalWorkoutMin = dayRows.reduce(
    (sum, day) => sum + day.workouts.reduce((workoutSum, workout) => workoutSum + workout.duration, 0),
    0,
  )

  return {
    dayRows,
    avgCal: average('cal'),
    avgP: average('p'),
    avgFat: average('fat'),
    avgC: average('c'),
    totalWorkouts,
    totalWorkoutMin,
    daysTracked: daysWithFood.length,
    goals,
  }
}

export async function generateReportPDF(data, periodLabel, userName) {
  const jsPDF = await loadJsPDF()
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const marginX = 40
  let y = 50

  doc.setFontSize(18)
  doc.setFont(undefined, 'bold')
  doc.text('Фитнес Дневник — отчёт', marginX, y)
  y += 22

  doc.setFontSize(11)
  doc.setFont(undefined, 'normal')
  doc.text(`${userName || 'Пользователь'} · ${periodLabel} · сформирован отчёт: ${new Date().toLocaleDateString('ru-RU')}`, marginX, y)
  y += 30

  doc.setDrawColor(220)
  doc.line(marginX, y, pageWidth - marginX, y)
  y += 24

  doc.setFontSize(14)
  doc.setFont(undefined, 'bold')
  doc.text('Питание — средние показатели', marginX, y)
  y += 20

  doc.setFontSize(11)
  doc.setFont(undefined, 'normal')
  doc.text(`Калории: ${data.avgCal} / цель ${data.goals.calories} ккал`, marginX, y)
  y += 16
  doc.text(`Белки: ${data.avgP}г  ·  Жиры: ${data.avgFat}г  ·  Углеводы: ${data.avgC}г`, marginX, y)
  y += 16
  doc.text(`Дней с записями питания: ${data.daysTracked} из ${data.dayRows.length}`, marginX, y)
  y += 26

  doc.setFontSize(14)
  doc.setFont(undefined, 'bold')
  doc.text('Тренировки — сводка', marginX, y)
  y += 20

  doc.setFontSize(11)
  doc.setFont(undefined, 'normal')
  doc.text(`Всего тренировок: ${data.totalWorkouts}  ·  Суммарное время: ${data.totalWorkoutMin} мин`, marginX, y)
  y += 30

  doc.setDrawColor(220)
  doc.line(marginX, y, pageWidth - marginX, y)
  y += 24

  doc.setFontSize(14)
  doc.setFont(undefined, 'bold')
  doc.text('Детализация по дням', marginX, y)
  y += 8

  const rowHeight = 16
  const columns = {
    date: marginX,
    cal: marginX + 90,
    pfc: marginX + 150,
    workout: marginX + 290,
  }

  const checkPageBreak = () => {
    if (y > 780) {
      doc.addPage()
      y = 50
    }
  }

  y += 16
  doc.setFontSize(9)
  doc.setFont(undefined, 'bold')
  doc.setTextColor(120)
  doc.text('Дата', columns.date, y)
  doc.text('Ккал', columns.cal, y)
  doc.text('Б/Ж/У, г', columns.pfc, y)
  doc.text('Тренировки', columns.workout, y)
  y += 10

  doc.setDrawColor(230)
  doc.line(marginX, y, pageWidth - marginX, y)
  y += 12
  doc.setTextColor(30)

  data.dayRows.forEach((day) => {
    checkPageBreak()
    doc.setFontSize(9)
    doc.setFont(undefined, 'normal')

    const formattedDate = new Date(day.date).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
    })

    doc.text(formattedDate, columns.date, y)
    doc.text(day.foodsCount > 0 ? String(day.cal) : '—', columns.cal, y)
    doc.text(day.foodsCount > 0 ? `${day.p}/${day.fat}/${day.c}` : '—', columns.pfc, y)

    const workoutText = day.workouts.length
      ? day.workouts.map((workout) => `${workout.name} (${workout.duration}мин)`).join(', ')
      : '—'
    const workoutLines = doc.splitTextToSize(workoutText, pageWidth - marginX - columns.workout)

    doc.text(workoutLines, columns.workout, y)
    y += rowHeight * Math.max(1, workoutLines.length)
  })

  return doc
}
