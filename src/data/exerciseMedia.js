const CHEST_MEDIA = {
  'Жим штанги лёжа': 'bench-press',
  'Жим гантелей лёжа': 'dumbbell-bench-press',
  'Жим штанги на наклонной': 'incline-barbell-press',
  'Жим гантелей на наклонной': 'incline-dumbbell-press',
  'Жим в тренажёре Хаммер': 'hammer-chest-press',
  'Отжимания на брусьях': 'chest-dips',
  'Отжимания от пола': 'push-up',
  'Отжимания с широкой постановкой': 'wide-push-up',
  'Разводка гантелей лёжа': 'dumbbell-fly',
  'Кроссовер в блоке': 'cable-crossover',
  'Сведение в тренажёре (бабочка)': 'pec-deck',
  'Разводка с резинкой': 'resistance-band-fly',
  'Пуловер с гантелью': 'dumbbell-pullover',
}

export function getExerciseMedia(name) {
  const folder = CHEST_MEDIA[name]
  if (!folder) return null

  return {
    start: `/assets/exercises/${folder}/start.webp`,
    end: `/assets/exercises/${folder}/end.webp`,
  }
}
