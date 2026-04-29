// ═══════════════════════════════════════════
// FITNESS DATA — база продуктов, упражнений, AI-утилиты
// ═══════════════════════════════════════════

const FOOD_DB = [
  { id: 1,  name: 'Куриная грудь',       cal: 165, p: 31.0, f: 3.6,  c: 0.0  },
  { id: 2,  name: 'Яйцо куриное',        cal: 155, p: 13.0, f: 11.0, c: 1.0  },
  { id: 3,  name: 'Гречка варёная',      cal: 110, p: 4.0,  f: 1.1,  c: 22.0 },
  { id: 4,  name: 'Рис варёный',         cal: 130, p: 2.7,  f: 0.3,  c: 28.0 },
  { id: 5,  name: 'Овсянка на воде',     cal: 88,  p: 3.4,  f: 1.7,  c: 15.0 },
  { id: 6,  name: 'Творог 5%',           cal: 121, p: 17.0, f: 5.0,  c: 3.0  },
  { id: 7,  name: 'Молоко 2.5%',         cal: 52,  p: 2.9,  f: 2.5,  c: 4.8  },
  { id: 8,  name: 'Банан',               cal: 89,  p: 1.1,  f: 0.3,  c: 23.0 },
  { id: 9,  name: 'Яблоко',              cal: 52,  p: 0.3,  f: 0.2,  c: 14.0 },
  { id: 10, name: 'Хлеб пшеничный',      cal: 265, p: 9.0,  f: 3.2,  c: 51.0 },
  { id: 11, name: 'Говядина',            cal: 250, p: 26.0, f: 16.0, c: 0.0  },
  { id: 12, name: 'Лосось',              cal: 208, p: 20.0, f: 13.0, c: 0.0  },
  { id: 13, name: 'Картофель варёный',   cal: 82,  p: 2.0,  f: 0.1,  c: 19.0 },
  { id: 14, name: 'Макароны варёные',    cal: 157, p: 5.5,  f: 0.9,  c: 31.0 },
  { id: 15, name: 'Авокадо',             cal: 160, p: 2.0,  f: 15.0, c: 9.0  },
  { id: 16, name: 'Брокколи',            cal: 34,  p: 2.8,  f: 0.4,  c: 7.0  },
  { id: 17, name: 'Греческий йогурт',    cal: 97,  p: 10.0, f: 5.0,  c: 3.6  },
  { id: 18, name: 'Орехи грецкие',       cal: 654, p: 15.0, f: 65.0, c: 14.0 },
  { id: 19, name: 'Тунец',               cal: 116, p: 26.0, f: 1.0,  c: 0.0  },
  { id: 20, name: 'Тёмный шоколад',      cal: 546, p: 5.0,  f: 35.0, c: 60.0 },
  { id: 21, name: 'Протеиновый коктейль',cal: 120, p: 25.0, f: 1.5,  c: 5.0  },
  { id: 22, name: 'Апельсин',            cal: 47,  p: 0.9,  f: 0.2,  c: 12.0 },
  { id: 23, name: 'Кефир 1%',            cal: 40,  p: 3.0,  f: 1.0,  c: 5.0  },
  { id: 24, name: 'Семга слабосолёная',  cal: 202, p: 22.0, f: 12.5, c: 0.0  },
  { id: 25, name: 'Индейка',             cal: 189, p: 29.0, f: 7.0,  c: 0.0  },
  { id: 26, name: 'Омлет',               cal: 140, p: 10.0, f: 10.0, c: 2.0  },
  { id: 27, name: 'Сыр твёрдый',         cal: 380, p: 24.0, f: 31.0, c: 1.3  },
  { id: 28, name: 'Миндаль',             cal: 575, p: 21.0, f: 50.0, c: 22.0 },
];

const EXERCISE_DB = [
  { id: 1,  name: 'Жим штанги лёжа',         muscle: 'Грудь',    type: 'strength', calPerMin: 8  },
  { id: 2,  name: 'Приседания со штангой',    muscle: 'Ноги',     type: 'strength', calPerMin: 9  },
  { id: 3,  name: 'Становая тяга',            muscle: 'Спина',    type: 'strength', calPerMin: 9  },
  { id: 4,  name: 'Подтягивания',             muscle: 'Спина',    type: 'strength', calPerMin: 7  },
  { id: 5,  name: 'Жим штанги стоя',          muscle: 'Плечи',    type: 'strength', calPerMin: 7  },
  { id: 6,  name: 'Тяга штанги к поясу',      muscle: 'Спина',    type: 'strength', calPerMin: 7  },
  { id: 7,  name: 'Разгибания на трицепс',    muscle: 'Трицепс',  type: 'strength', calPerMin: 5  },
  { id: 8,  name: 'Подъём на бицепс',         muscle: 'Бицепс',   type: 'strength', calPerMin: 5  },
  { id: 9,  name: 'Выпады',                   muscle: 'Ноги',     type: 'strength', calPerMin: 7  },
  { id: 10, name: 'Планка',                   muscle: 'Кор',      type: 'static',   calPerMin: 4  },
  { id: 11, name: 'Бег',                      muscle: 'Кардио',   type: 'cardio',   calPerMin: 11 },
  { id: 12, name: 'Прыжки через скакалку',    muscle: 'Кардио',   type: 'cardio',   calPerMin: 12 },
  { id: 13, name: 'Жим гантелей лёжа',        muscle: 'Грудь',    type: 'strength', calPerMin: 7  },
  { id: 14, name: 'Румынская тяга',           muscle: 'Ноги',     type: 'strength', calPerMin: 7  },
  { id: 15, name: 'Разводка гантелей',        muscle: 'Грудь',    type: 'strength', calPerMin: 6  },
  { id: 16, name: 'Жим ногами',               muscle: 'Ноги',     type: 'strength', calPerMin: 7  },
  { id: 17, name: 'Подъём ног лёжа',          muscle: 'Кор',      type: 'strength', calPerMin: 5  },
  { id: 18, name: 'Скручивания',              muscle: 'Кор',      type: 'strength', calPerMin: 4  },
  { id: 19, name: 'Жим Арнольда',             muscle: 'Плечи',    type: 'strength', calPerMin: 6  },
  { id: 20, name: 'Велосипед',                muscle: 'Кардио',   type: 'cardio',   calPerMin: 9  },
];

// Распознавание блюда по текстовому описанию
function recognizeFood(text) {
  const lower = text.toLowerCase();
  const patterns = [
    { words: ['курин', 'грудь', 'грудка', 'куриц'], id: 1 },
    { words: ['яйц', 'яичниц', 'глазунь'], id: 2 },
    { words: ['гречк'], id: 3 },
    { words: ['рис', 'ризотт'], id: 4 },
    { words: ['овсянк', 'геркулес'], id: 5 },
    { words: ['творог'], id: 6 },
    { words: ['молок'], id: 7 },
    { words: ['банан'], id: 8 },
    { words: ['яблок'], id: 9 },
    { words: ['хлеб', 'тост', 'батон', 'булк'], id: 10 },
    { words: ['говяд', 'стейк'], id: 11 },
    { words: ['лосось', 'форел', 'сёмг'], id: 12 },
    { words: ['картофел', 'картошк', 'пюре'], id: 13 },
    { words: ['макарон', 'паст', 'спагетт'], id: 14 },
    { words: ['авокадо'], id: 15 },
    { words: ['брокколи', 'цветная'], id: 16 },
    { words: ['йогурт'], id: 17 },
    { words: ['орех'], id: 18 },
    { words: ['тунец'], id: 19 },
    { words: ['шоколад'], id: 20 },
    { words: ['протеин', 'коктейл', 'шейк'], id: 21 },
    { words: ['апельсин', 'мандарин'], id: 22 },
    { words: ['кефир'], id: 23 },
    { words: ['семга', 'сёмга', 'слабосол'], id: 24 },
    { words: ['индейк'], id: 25 },
    { words: ['омлет'], id: 26 },
    { words: ['сыр'], id: 27 },
    { words: ['миндаль'], id: 28 },
  ];

  const results = [];
  patterns.forEach(p => {
    if (p.words.some(w => lower.includes(w))) {
      const food = FOOD_DB.find(f => f.id === p.id);
      if (!food) return;
      let grams = 100;
      const gramsMatch = lower.match(/(\d+)\s*(?:г(?:рамм)?|ml|мл)/);
      if (gramsMatch) grams = parseInt(gramsMatch[1]);
      if (p.id === 2) {
        const pcsMatch = lower.match(/(\d+)\s*(?:шт|яиц|яйц)/);
        if (pcsMatch) grams = parseInt(pcsMatch[1]) * 60;
      }
      if (!results.find(r => r.food.id === food.id)) {
        results.push({ food, grams });
      }
    }
  });
  return results;
}

function calcNutrition(food, grams) {
  const f = grams / 100;
  return {
    cal: Math.round(food.cal * f),
    p:   Math.round(food.p * f * 10) / 10,
    fat: Math.round(food.f * f * 10) / 10,
    c:   Math.round(food.c * f * 10) / 10,
  };
}

// Планы тренировок от ИИ
const AI_PLANS = {
  mass_beginner: {
    name: 'Набор массы — Базовый',
    exercises: [
      { exerciseId: 2, sets: [{reps:'10',weight:60},{reps:'8',weight:65},{reps:'8',weight:65}] },
      { exerciseId: 1, sets: [{reps:'10',weight:50},{reps:'8',weight:55},{reps:'8',weight:55}] },
      { exerciseId: 3, sets: [{reps:'6',weight:80},{reps:'6',weight:85},{reps:'5',weight:90}] },
      { exerciseId: 8, sets: [{reps:'12',weight:12},{reps:'12',weight:14},{reps:'10',weight:14}] },
      { exerciseId: 10, sets: [{reps:'30с',weight:0},{reps:'30с',weight:0},{reps:'30с',weight:0}] },
    ],
    note: 'Отдых между подходами 90 сек. Прогрессируй на 2.5 кг каждые 1–2 недели.',
  },
  mass_intermediate: {
    name: 'Набор массы — Средний',
    exercises: [
      { exerciseId: 1, sets: [{reps:'8',weight:80},{reps:'6',weight:90},{reps:'4',weight:100},{reps:'4',weight:100}] },
      { exerciseId: 13, sets: [{reps:'10',weight:30},{reps:'10',weight:32},{reps:'8',weight:35}] },
      { exerciseId: 5, sets: [{reps:'8',weight:55},{reps:'8',weight:60},{reps:'6',weight:65}] },
      { exerciseId: 7, sets: [{reps:'12',weight:20},{reps:'12',weight:22},{reps:'10',weight:25}] },
      { exerciseId: 17, sets: [{reps:'15',weight:0},{reps:'15',weight:0},{reps:'15',weight:0}] },
    ],
    note: 'Прогрессивная нагрузка. Отдых 2–3 мин на тяжёлых подходах.',
  },
  fat_beginner: {
    name: 'Жиросжигание — Базовый',
    exercises: [
      { exerciseId: 11, sets: [{reps:'20 мин',weight:0}] },
      { exerciseId: 9,  sets: [{reps:'15',weight:0},{reps:'15',weight:0},{reps:'15',weight:0},{reps:'15',weight:0}] },
      { exerciseId: 10, sets: [{reps:'40с',weight:0},{reps:'40с',weight:0},{reps:'40с',weight:0}] },
      { exerciseId: 18, sets: [{reps:'20',weight:0},{reps:'20',weight:0},{reps:'20',weight:0}] },
      { exerciseId: 12, sets: [{reps:'1 мин',weight:0},{reps:'1 мин',weight:0},{reps:'1 мин',weight:0}] },
    ],
    note: 'Отдых 30–45 сек. Держи пульс 140–160 уд/мин.',
  },
  fat_intermediate: {
    name: 'Жиросжигание — Средний',
    exercises: [
      { exerciseId: 12, sets: [{reps:'2 мин',weight:0},{reps:'2 мин',weight:0},{reps:'2 мин',weight:0}] },
      { exerciseId: 2,  sets: [{reps:'15',weight:50},{reps:'15',weight:55},{reps:'12',weight:60}] },
      { exerciseId: 9,  sets: [{reps:'12',weight:15},{reps:'12',weight:15},{reps:'12',weight:15}] },
      { exerciseId: 4,  sets: [{reps:'8',weight:0},{reps:'7',weight:0},{reps:'6',weight:0}] },
      { exerciseId: 10, sets: [{reps:'1 мин',weight:0},{reps:'1 мин',weight:0},{reps:'1 мин',weight:0}] },
    ],
    note: 'Минимальный отдых 30 сек. Суперсеты при желании.',
  },
  endurance_beginner: {
    name: 'Выносливость',
    exercises: [
      { exerciseId: 11, sets: [{reps:'30 мин',weight:0}] },
      { exerciseId: 20, sets: [{reps:'20 мин',weight:0}] },
      { exerciseId: 10, sets: [{reps:'45с',weight:0},{reps:'45с',weight:0},{reps:'45с',weight:0}] },
      { exerciseId: 17, sets: [{reps:'20',weight:0},{reps:'20',weight:0}] },
    ],
    note: 'Поддерживай постоянный темп. Гидратация критична — пей каждые 15 мин.',
  },
};

function generateWorkoutPlan(goal, level) {
  const key = `${goal}_${level}`;
  return AI_PLANS[key] || AI_PLANS[`${goal}_beginner`] || AI_PLANS.endurance_beginner;
}

function getMacroAnalysis(totals, calorieGoal) {
  const { cal, p, fat, c } = totals;
  const totalMacros = p + fat + c;
  if (cal < 300) return '— Мало данных. Добавь продукты за день, чтобы получить анализ.';

  const pPct = totalMacros > 0 ? Math.round(p / totalMacros * 100) : 0;
  const fPct = totalMacros > 0 ? Math.round(fat / totalMacros * 100) : 0;
  const cPct = totalMacros > 0 ? Math.round(c / totalMacros * 100) : 0;
  const diff = cal - calorieGoal;

  const lines = [];

  if (pPct < 20)
    lines.push(`⚠️ Белки занижены (${pPct}%). Цель — 25–35%. Добавь курицу, творог или тунец.`);
  else if (pPct > 42)
    lines.push(`ℹ️ Белков много (${pPct}%). При длительном превышении следи за нагрузкой на почки.`);
  else
    lines.push(`✅ Белки в норме (${pPct}%) — отлично для восстановления и роста мышц.`);

  if (fPct < 15)
    lines.push(`⚠️ Мало жиров (${fPct}%). Они важны для гормонов. Попробуй авокадо, орехи или оливковое масло.`);
  else if (fPct > 45)
    lines.push(`⚠️ Многовато жиров (${fPct}%). Предпочитай ненасыщенные источники.`);
  else
    lines.push(`✅ Жиры в порядке (${fPct}%) — хорошо для гормонального баланса.`);

  if (cPct > 65)
    lines.push(`ℹ️ Углеводов много (${cPct}%). Для похудения снизь до 40–50%; для массы — нормально.`);
  else
    lines.push(`✅ Углеводы (${cPct}%) дают хорошую энергию для тренировок.`);

  if (Math.abs(diff) < 80)
    lines.push(`🎯 Калории прямо в цели (${cal} / ${calorieGoal} ккал). Отличный контроль!`);
  else if (diff > 0)
    lines.push(`📈 Профицит +${diff} ккал. ${diff > 500 ? 'Многовато — снизь порции.' : 'Умеренно, подходит для набора.'}`);
  else
    lines.push(`📉 Дефицит ${Math.abs(diff)} ккал. ${Math.abs(diff) > 700 ? 'Слишком мало — риск потери мышц.' : 'Хорошо для жиросжигания.'}`);

  return lines.join('\n');
}

// Распознавание тренировки по текстовому описанию
function recognizeWorkout(text) {
  const lower = text.toLowerCase();
  const patterns = [
    { words:['жим','грудь','грудн','бенч'], ids:[1,13] },
    { words:['присед','ноги','квадр'], ids:[2,16] },
    { words:['тяга','станов','становая'], ids:[3] },
    { words:['подтягив','турник'], ids:[4] },
    { words:['жим плеч','дельт','плеч','армейск'], ids:[5,19] },
    { words:['тяга к пояс','тяга штанг'], ids:[6] },
    { words:['трицепс','разгибан'], ids:[7] },
    { words:['бицепс','подъём','сгибан'], ids:[8] },
    { words:['выпад'], ids:[9] },
    { words:['планк'], ids:[10] },
    { words:['бег','пробеж','кардио'], ids:[11] },
    { words:['скакалк'], ids:[12] },
    { words:['румынск','мертвая тяга'], ids:[14] },
    { words:['разводк'], ids:[15] },
    { words:['пресс','скручиван','живот'], ids:[17,18] },
    { words:['велосипед','велик'], ids:[20] },
  ];

  const found = [];
  patterns.forEach(p => {
    if (p.words.some(w => lower.includes(w))) {
      p.ids.forEach(id => {
        if (!found.find(f => f.exerciseId === id)) {
          const ex = EXERCISE_DB.find(e => e.id === id);
          if (!ex) return;
          // Попробуем вытащить сеты/повторы/вес из текста
          let sets = 3, reps = '10', weight = 0;
          const setsMatch = lower.match(/(\d+)\s*(?:подход|сет)/);
          if (setsMatch) sets = Math.min(parseInt(setsMatch[1]), 6);
          const repsMatch = lower.match(/(\d+)\s*(?:повтор|раз[^а])/);
          if (repsMatch) reps = repsMatch[1];
          const weightMatch = lower.match(/(\d+)\s*(?:кг|килограмм)/);
          if (weightMatch) weight = parseInt(weightMatch[1]);
          found.push({
            exerciseId: id, name: ex.name, muscle: ex.muscle,
            sets: Array.from({length: sets}, () => ({ reps, weight: String(weight), done: false })),
          });
        }
      });
    }
  });
  return found;
}

// Комплексный анализ дня
function getDayAnalysis(foodTotals, workouts, calorieGoal) {
  const { cal, p, fat, c } = foodTotals;
  const hasFood = cal > 200;
  const hasWorkout = workouts && workouts.length > 0;
  const todayWorkout = hasWorkout ? workouts[0] : null;
  const totalMacros = p + fat + c;
  const pPct = totalMacros > 0 ? Math.round(p / totalMacros * 100) : 0;
  const fPct = totalMacros > 0 ? Math.round(fat / totalMacros * 100) : 0;
  const cPct = totalMacros > 0 ? Math.round(c / totalMacros * 100) : 0;
  const calDiff = cal - calorieGoal;

  const blocks = [];

  // Блок питания
  const foodLines = [];
  if (!hasFood) {
    foodLines.push('📋 Данных за сегодня мало — добавь приёмы пищи для полного анализа.');
  } else {
    if (Math.abs(calDiff) < 100) foodLines.push(`🎯 Калории точно в цели: ${cal} / ${calorieGoal} ккал. Отличный контроль!`);
    else if (calDiff > 0) foodLines.push(`📈 Профицит +${calDiff} ккал. ${calDiff > 600 ? 'Многовато — можно снизить порции ужина.' : 'Умеренный — хорошо для набора массы.'}`);
    else foodLines.push(`📉 Дефицит ${Math.abs(calDiff)} ккал. ${Math.abs(calDiff) > 600 ? 'Слишком агрессивно — риск потери мышц. Добавь перекус.' : 'Мягкий дефицит — хорошо для жиросжигания.'}`);

    if (pPct < 20) foodLines.push(`⚠️ Белков маловато (${pPct}%). При тренировках норма — 25–35%. Добавь творог или мясо в следующий приём.`);
    else foodLines.push(`✅ Белки ${pPct}% — хорошо для восстановления мышц.`);

    if (cPct > 60) foodLines.push(`ℹ️ Углеводов много (${cPct}%). Если цель — похудение, замени часть на белок или овощи.`);
    else if (cPct < 30) foodLines.push(`ℹ️ Мало углеводов (${cPct}%). Энергии на тренировку может не хватить.`);
    else foodLines.push(`✅ Углеводы (${cPct}%) — сбалансировано.`);
  }
  blocks.push({ emoji:'🥗', title:'Питание', lines: foodLines });

  // Блок тренировки
  const wkLines = [];
  if (!hasWorkout) {
    wkLines.push('🛌 Сегодня без тренировки — день отдыха. Мышцы растут во время восстановления!');
    wkLines.push('💡 Рекомендация: лёгкая прогулка 20–30 мин ускорит восстановление и сожжёт немного калорий.');
  } else {
    const w = todayWorkout;
    wkLines.push(`💪 Тренировка «${w.name}» выполнена! ${w.exercises.length} упражнений, ${Math.floor(w.duration/60)} мин, ${w.caloriesBurned} ккал сожжено.`);
    if (w.duration < 1800) wkLines.push('⚠️ Тренировка короткая (< 30 мин). Попробуй добавить 1–2 упражнения в следующий раз.');
    else if (w.duration > 5400) wkLines.push('ℹ️ Долгая тренировка (> 90 мин). Следи за уровнем кортизола — делай перерывы и пей воду.');
    else wkLines.push('✅ Оптимальная продолжительность тренировки.');

    const muscles = [...new Set(w.exercises.map(e => e.muscle).filter(Boolean))];
    if (muscles.length > 0) wkLines.push(`🎯 Проработано: ${muscles.join(', ')}.`);
  }
  blocks.push({ emoji:'🏋️', title:'Тренировка', lines: wkLines });

  // Блок рекомендаций
  const recLines = [];
  if (hasFood && hasWorkout) {
    if (pPct < 20) recLines.push('🥩 Увеличь белок: после тренировки мышцам нужно минимум 1.6–2.2 г на кг веса тела.');
    if (calDiff < -400) recLines.push('🍌 Слишком большой дефицит при тренировке — добавь банан или протеиновый коктейль.');
  }
  if (foodTotals && foodTotals.cal > 0) {
    const waterPct = (foodTotals.water || 3) / 8;
    recLines.push('💧 Выпей достаточно воды — 30–40 мл на кг веса. Гидратация ускоряет метаболизм.');
  }
  recLines.push('😴 Полноценный сон 7–9 часов — главный фактор восстановления и жиросжигания.');
  if (!hasWorkout) recLines.push('📅 Завтра можно провести силовую тренировку на ноги или верх тела.');
  else recLines.push('📅 Завтра — день отдыха или лёгкое кардио для восстановления.');
  blocks.push({ emoji:'💡', title:'Рекомендации', lines: recLines });

  return blocks;
}

const WEEKLY_HISTORY = [
  { day: 'Пн', cal: 2340, p: 148, fat: 72, c: 258 },
  { day: 'Вт', cal: 1980, p: 130, fat: 61, c: 220 },
  { day: 'Ср', cal: 2510, p: 165, fat: 78, c: 275 },
  { day: 'Чт', cal: 2150, p: 140, fat: 68, c: 242 },
  { day: 'Пт', cal: 2780, p: 170, fat: 85, c: 310 },
  { day: 'Сб', cal: 1850, p: 120, fat: 55, c: 210 },
];

Object.assign(window, {
  FOOD_DB, EXERCISE_DB, recognizeFood, calcNutrition,
  generateWorkoutPlan, getMacroAnalysis, getDayAnalysis, recognizeWorkout,
  WEEKLY_HISTORY, AI_PLANS,
});
