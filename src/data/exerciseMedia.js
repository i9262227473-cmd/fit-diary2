const EXERCISE_MEDIA = {
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

  'Подтягивания': 'pull-up',
  'Тяга верхнего блока': 'lat-pulldown',
  'Тяга верхнего блока узким хватом': 'close-grip-lat-pulldown',
  'Подтягивания с резинкой': 'assisted-pull-up',
  'Тяга штанги в наклоне': 'bent-over-barbell-row',
  'Тяга горизонтального блока': 'seated-cable-row',
  'Тяга гантели одной рукой': 'one-arm-dumbbell-row',
  'Тяга Т-грифа': 't-bar-row',
  'Тяга гантелей в наклоне': 'bent-over-dumbbell-row',
  'Тяга резинки к поясу': 'resistance-band-row',
  'Гиперэкстензия': 'hyperextension',
  'Тяга гантели в планке': 'renegade-row',
}

export function getExerciseMedia(name) {
  const folder = EXERCISE_MEDIA[name]
  if (!folder) return null

  return {
    start: `/assets/exercises/${folder}/start.webp`,
    end: `/assets/exercises/${folder}/end.webp`,
  }
}
