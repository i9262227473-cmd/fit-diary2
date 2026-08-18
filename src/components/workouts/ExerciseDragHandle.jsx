import { GripVertical } from 'lucide-react'

// Ручка «перетащить» упражнение. Сама логика перетаскивания (живое
// перемещение с раздвиганием соседей, как переупорядочивание иконок на
// iPhone) — в хуке useDragReorder; сюда приходят уже готовые обработчики.
export default function ExerciseDragHandle({ dragHandleProps, className = '' }) {
  return (
    <button
      type="button"
      className={className}
      aria-label="Перетащить упражнение"
      title="Зажмите и потяните, чтобы изменить порядок"
      {...dragHandleProps}
    >
      <GripVertical size={20} />
    </button>
  )
}
