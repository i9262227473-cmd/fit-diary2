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

voice_import = "import VoiceButton from '../components/common/VoiceButton'\n"
anchor = "import { getTechnique } from '../data/exerciseTechnique'\n"
if voice_import not in text:
    if anchor not in text:
        raise SystemExit('Не найдена точка для добавления импорта VoiceButton')
    text = text.replace(anchor, anchor + voice_import, 1)

pattern = re.compile(
    r"// ─── VOICE INPUT .*?(?=// ─── SWIPE TO DELETE)",
    re.DOTALL,
)
text, count = pattern.subn('', text, count=1)
if count != 1 and 'function VoiceButton(' in text:
    raise SystemExit('Не удалось безопасно удалить встроенный VoiceButton')

if text == original:
    print('Изменения уже применены')
else:
    path.write_text(text, encoding='utf-8')
    print('VoiceButton подключён из отдельного компонента')
