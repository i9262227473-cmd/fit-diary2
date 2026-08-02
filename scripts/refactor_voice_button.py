from pathlib import Path
import re

# Идемпотентный скрипт: повторный запуск не меняет уже обработанный файл.
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
]
for component_import in imports:
    if component_import not in text:
        if anchor not in text:
            raise SystemExit('Не найдена безопасная точка для добавления импортов компонентов')
        text = text.replace(anchor, anchor + component_import, 1)

voice_pattern = re.compile(
    r"// ─── VOICE INPUT .*?(?=// ─── SWIPE TO DELETE)",
    re.DOTALL,
)
text, voice_count = voice_pattern.subn('', text, count=1)
if voice_count != 1 and 'function VoiceButton(' in text:
    raise SystemExit('Не удалось безопасно удалить встроенный VoiceButton')

number_pattern = re.compile(
    r"// ─── NUMBER STEPPER .*?(?=// ─── WHEEL PICKER)",
    re.DOTALL,
)
text, number_count = number_pattern.subn('', text, count=1)
if number_count != 1 and 'function NumberStepper(' in text:
    raise SystemExit('Не удалось безопасно удалить встроенный NumberStepper')

if text == original:
    print('Изменения уже применены')
else:
    path.write_text(text, encoding='utf-8')
    print('VoiceButton и NumberStepper подключены из отдельных компонентов')
