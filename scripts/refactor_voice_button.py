from pathlib import Path
import re

# Идемпотентный скрипт: повторный запуск не меняет уже обработанный файл.
# Этот файл также служит безопасным триггером контрольной сборки тестовой ветки.
path = Path('src/pages/DashboardPage.jsx')
text = path.read_text(encoding='utf-8')
original = text

text = text.replace(
    "import { LogOut, Camera, Bell, ChevronRight, Plus, Check, X, ChevronLeft, Play, Pause, Flame, Droplets, Dumbbell, Edit2, Trash2, AlertTriangle, Sparkles, Calendar, Mic, ScanLine } from 'lucide-react'",
    "import { LogOut, Camera, Bell, ChevronRight, Plus, Check, X, ChevronLeft, Play, Pause, Flame, Droplets, Dumbbell, Edit2, Trash2, AlertTriangle, Sparkles, Calendar, ScanLine } from 'lucide-react'",
)

anchor = "import { getTechnique } from '../data/exerciseTechnique'\n"
imports = [
    "import VoiceButton from '../components/common/VoiceButton'\n",
    "import NumberStepper from '../components/common/NumberStepper'\n",
    "import SwipeToDelete from '../components/common/SwipeToDelete'\n",
    "import WheelPicker, { buildWeightValues } from '../components/common/WheelPicker'\n",
    "import { NavHome, NavWorkout, NavProgress, NavFood, NavUser } from '../components/layout/NavigationIcons'\n",
    "import { createStableId as uid, formatLongTime as fmtTimeLong, getDefaultRestSeconds as getDefaultRestSec } from '../utils/workoutUi'\n",
]
for component_import in imports:
    if component_import not in text:
        if anchor not in text:
            raise SystemExit('Не найдена безопасная точка для добавления импортов компонентов')
        text = text.replace(anchor, anchor + component_import, 1)

patterns = [
    (r"// ─── VOICE INPUT .*?(?=// ─── SWIPE TO DELETE)", 'function VoiceButton(', 'VoiceButton'),
    (r"// ─── NUMBER STEPPER .*?(?=// ─── WHEEL PICKER)", 'function NumberStepper(', 'NumberStepper'),
    (r"// ─── SWIPE TO DELETE .*?(?=// ─── WHEEL PICKER)", 'function SwipeToDelete(', 'SwipeToDelete'),
    (r"// ─── NAV ICONS .*?(?=// ─── HELPERS)", 'function NavHome(', 'навигационные иконки'),
    (r"// ─── WHEEL PICKER .*?(?=// ─── SET PICKER MODAL)", 'function WheelPicker(', 'WheelPicker'),
]
for pattern, remaining_marker, label in patterns:
    text, count = re.compile(pattern, re.DOTALL).subn('', text, count=1)
    if count != 1 and remaining_marker in text:
        raise SystemExit(f'Не удалось безопасно удалить встроенный {label}')

uid_pattern = re.compile(r"// Стабильный ID.*?function uid\(\) \{.*?\}\n\n", re.DOTALL)
text, uid_count = uid_pattern.subn('', text, count=1)
if uid_count != 1 and 'function uid()' in text:
    raise SystemExit('Не удалось безопасно удалить встроенный генератор ID')

helpers_pattern = re.compile(r"// ─── HELPERS .*?function fmtTimeLong\(s\) \{.*?\n\}\n\n", re.DOTALL)
text, helpers_count = helpers_pattern.subn('', text, count=1)
if helpers_count != 1 and 'function fmtTimeLong(' in text:
    raise SystemExit('Не удалось безопасно удалить встроенное форматирование времени')

rest_pattern = re.compile(r"// ─── ДЕФОЛТНОЕ ВРЕМЯ ОТДЫХА.*?function getDefaultRestSec\(muscle\) \{.*?\n\}\n\n", re.DOTALL)
text, rest_count = rest_pattern.subn('', text, count=1)
if rest_count != 1 and 'function getDefaultRestSec(' in text:
    raise SystemExit('Не удалось безопасно удалить встроенный расчёт времени отдыха')

if text == original:
    print('Изменения уже применены')
else:
    path.write_text(text, encoding='utf-8')
    print('Общие компоненты, WheelPicker, иконки и тренировочные утилиты подключены из отдельных модулей')
