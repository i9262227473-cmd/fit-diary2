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
    "import HomeScreen from '../components/home/HomeScreen'\n",
    "import FoodDayDetail from '../components/food/FoodDayDetail'\n",
    "import FoodCalendar from '../components/food/FoodCalendar'\n",
    "import RecipeBuilder from '../components/food/RecipeBuilder'\n",
    "import FoodSearchPanel from '../components/food/FoodSearchPanel'\n",
    "import VoiceButton from '../components/common/VoiceButton'\n",
    "import NumberStepper from '../components/common/NumberStepper'\n",
    "import SwipeToDelete from '../components/common/SwipeToDelete'\n",
    "import WheelPicker, { buildWeightValues } from '../components/common/WheelPicker'\n",
    "import CircularProgress, { getCalorieColor } from '../components/common/CircularProgress'\n",
    "import SetPickerModal from '../components/workouts/SetPickerModal'\n",
    "import WeightTransferModal from '../components/workouts/WeightTransferModal'\n",
    "import BarcodeScanner, { lookupBarcode } from '../components/food/BarcodeScanner'\n",
    "import EditFoodModal from '../components/food/EditFoodModal'\n",
    "import { buildReportData, generateReportPDF } from '../utils/pdfReport'\n",
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
    (r"// ─── SET PICKER MODAL .*?(?=function compressImage)", 'function SetPickerModal(', 'SetPickerModal'),
    (r"// ─── BARCODE SCANNER .*?(?=// ─── PDF REPORT EXPORT)", 'function BarcodeScanner(', 'BarcodeScanner'),
    (r"// ─── PDF REPORT EXPORT .*?(?=// Цвет кружка калорий)", 'function buildReportData(', 'PDF-отчёт'),
    (r"// Цвет кружка калорий .*?(?=// ─── ПОДТВЕРЖДЕНИЕ ПЕРЕНОСА ВЕСОВ)", 'function CircularProgress(', 'CircularProgress'),
    (r"// ─── ПОДТВЕРЖДЕНИЕ ПЕРЕНОСА ВЕСОВ .*?(?=// ─── EDIT FOOD MODAL)", 'function WeightTransferModal(', 'WeightTransferModal'),
    (r"// ─── EDIT FOOD MODAL .*?(?=// ─── HOME SCREEN)", 'function EditFoodModal(', 'EditFoodModal'),
    (r"// ─── HOME SCREEN .*?(?=// ─── FOOD SCREEN)", 'function HomeScreen(', 'HomeScreen'),
    (r"// ─── FOOD DAY DETAIL .*?(?=// ─── FOOD CALENDAR)", 'function FoodDayDetail(', 'FoodDayDetail'),
    (r"// ─── FOOD CALENDAR .*?(?=// ─── RECIPE BUILDER)", 'function FoodCalendar(', 'FoodCalendar'),
    (r"// ─── RECIPE BUILDER .*?(?=function FoodScreen)", 'function RecipeBuilder(', 'RecipeBuilder'),
]
for pattern, remaining_marker, label in patterns:
    text, count = re.compile(pattern, re.DOTALL).subn('', text, count=1)
    if count != 1 and remaining_marker in text:
        raise SystemExit(f'Не удалось безопасно удалить встроенный {label}')

# Передаём календарь в вынесенный HomeScreen, пока сам календарь остаётся в DashboardPage.
if '<HomeScreen CalendarView={CombinedCalendar}' not in text:
    text, home_usage_count = re.subn(
        r'<HomeScreen\s+',
        '<HomeScreen CalendarView={CombinedCalendar} ',
        text,
        count=1,
    )
    if home_usage_count != 1:
        raise SystemExit('Не удалось безопасно обновить использование HomeScreen')

# Выносим только изолированный блок поиска и выбора продукта внутри FoodScreen.
if '<FoodSearchPanel' not in text:
    search_panel = """<FoodSearchPanel
              inp={inp}
              query={query}
              onQueryChange={handleSearch}
              scanLoading={scanLoading}
              onOpenBarcodeScanner={() => setShowBarcodeScanner(true)}
              onPhotoSelected={handleScan}
              results={results}
              selectedFood={selectedFood}
              onSelectFood={food => { setSelectedFood(food); setResults([]) }}
              onChangeSelectedFood={setSelectedFood}
              grams={grams}
              onChangeGrams={setGrams}
              onClearSelection={() => { setSelectedFood(null); setQuery('') }}
              onAddFood={addFoodItem}
            />"""
    text, panel_count = re.subn(
        r"<div style=\{\{ display: 'flex', flexDirection: 'column', gap: 10 \}\}>\s*<div style=\{\{ display: 'flex', gap: 8 \}\}>\s*<input style=\{\{ \.\.\.inp, flex: 1 \}\} placeholder=\"Найти продукт\.\.\.\"[\s\S]*?</div>\s*\)\}\s*(?=\{manualMode && \()",
        search_panel + "\n          )}\n          ",
        text,
        count=1,
    )
    if panel_count != 1:
        raise SystemExit('Не удалось безопасно заменить блок поиска продукта')

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
    print('FoodSearchPanel и ранее вынесенные компоненты подключены из отдельных модулей')
