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
    "import { NavHome, NavWorkout, NavProgress, NavFood, NavUser } from '../components/layout/NavigationIcons'\n",
    "import { createStableId as uid, formatLongTime as fmtTimeLong, getDefaultRestSeconds as getDefaultRestSec } from '../utils/workoutUi'\n",
]
for component_import in imports:
    if component_import not in text:
        if anchor not in text:
            raise SystemExit('Не найдена безопасная точка для добавления импортов компонентов')
        text = text.replace(anchor, anchor + component_import, 1)

voice_pattern = re.compile(r"// ─── VOICE INPUT .*?(?=// ─── SWIPE TO DELETE)", re.DOTALL)
text, voice_count = voice_pattern.subn('', text, count=1)
if voice_count != 1 and 'function VoiceButton(' in text:
    raise SystemExit('Не удалось безопасно удалить встроенный VoiceButton')

number_pattern = re.compile(r"// ─── NUMBER STEPPER .*?(?=// ─── WHEEL PICKER)", re.DOTALL)
text, number_count = number_pattern.subn('', text, count=1)
if number_count != 1 and 'function NumberStepper(' in text:
    raise SystemExit('Не удалось безопасно удалить встроенный NumberStepper')

swipe_pattern = re.compile(r"// ─── SWIPE TO DELETE .*?(?=// ─── WHEEL PICKER)", re.DOTALL)
text, swipe_count = swipe_pattern.subn('', text, count=1)
if swipe_count != 1 and 'function SwipeToDelete(' in text:
    raise SystemExit('Не удалось безопасно удалить встроенный SwipeToDelete')

nav_pattern = re.compile(r"// ─── NAV ICONS .*?(?=// ─── HELPERS)", re.DOTALL)
text, nav_count = nav_pattern.subn('', text, count=1)
if nav_count != 1 and 'function NavHome(' in text:
    raise SystemExit('Не удалось безопасно удалить встроенные навигационные иконки')

uid_pattern = re.compile(
    r"// Стабильный ID.*?function uid\(\) \{.*?\}\n\n",
    re.DOTALL,
)
text, uid_count = uid_pattern.subn('', text, count=1)
if uid_count != 1 and 'function uid()' in text:
    raise SystemExit('Не удалось безопасно удалить встроенный генератор ID')

helpers_pattern = re.compile(
    r"// ─── HELPERS .*?function fmtTimeLong\(s\) \{.*?\n\}\n\n",
    re.DOTALL,
)
text, helpers_count = helpers_pattern.subn('', text, count=1)
if helpers_count != 1 and 'function fmtTimeLong(' in text:
    raise SystemExit('Не удалось безопасно удалить встроенное форматирование времени')

rest_pattern = re.compile(
    r"// ─── ДЕФОЛТНОЕ ВРЕМЯ ОТДЫХА.*?function getDefaultRestSec\(muscle\) \{.*?\n\}\n\n",
    re.DOTALL,
)
text, rest_count = rest_pattern.subn('', text, count=1)
if rest_count != 1 and 'function getDefaultRestSec(' in text:
    raise SystemExit('Не удалось безопасно удалить встроенный расчёт времени отдыха')

if text == original:
    print('Изменения уже применены')
else:
    path.write_text(text, encoding='utf-8')
    print('Общие компоненты, иконки и тренировочные утилиты подключены из отдельных модулей')
