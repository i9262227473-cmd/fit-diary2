// ─── ПОЛНАЯ БАЗА УПРАЖНЕНИЙ ───────────────────────────────────────────────
// Поля:
//   id          — уникальный номер
//   name        — название
//   muscle      — основная мышечная группа
//   place       — где выполняется: 'gym' (зал), 'home' (дом), 'both' (везде)
//   equipment   — оборудование/снаряд
//   eff         — эффективность: 'best' (лучшее), 'good' (хорошее), 'base' (базовое), 'alt' (альтернатива)
//   swap        — группа взаимозамены (упражнения с одинаковым swap нагружают ту же зону)
//   type        — 'compound' (базовое многосуставное) | 'isolation' (изолирующее)
//
// Сортировка в UI: сначала по eff (best → good → base → alt), фильтр по place.
// Замена: показываем другие упражнения с тем же swap, подходящие под место тренировки.

import { fuzzyMatchName } from '../utils/fuzzyMatch'

export const EFF_LABEL = { best: 'Лучшее', good: 'Хорошее', base: 'Базовое', alt: 'Альтернатива' }
export const EFF_ORDER = { best: 0, good: 1, base: 2, alt: 3 }
export const PLACE_LABEL = { gym: 'Зал', home: 'Дом', both: 'Везде' }

export const EXERCISE_DB = [
  // ═══════════ ГРУДЬ ═══════════
  { id:1,  name:'Жим штанги лёжа',                 muscle:'Грудь', place:'gym',  equipment:'Штанга',      eff:'best', swap:'chest_press',   type:'compound' },
  { id:2,  name:'Жим гантелей лёжа',               muscle:'Грудь', place:'both', equipment:'Гантели',     eff:'best', swap:'chest_press',   type:'compound' },
  { id:3,  name:'Жим штанги на наклонной',         muscle:'Грудь', place:'gym',  equipment:'Штанга',      eff:'good', swap:'chest_press',   type:'compound' },
  { id:4,  name:'Жим гантелей на наклонной',       muscle:'Грудь', place:'both', equipment:'Гантели',     eff:'good', swap:'chest_press',   type:'compound' },
  { id:5,  name:'Жим в тренажёре Хаммер',          muscle:'Грудь', place:'gym',  equipment:'Тренажёр',    eff:'good', swap:'chest_press',   type:'compound' },
  { id:6,  name:'Отжимания на брусьях',            muscle:'Грудь', place:'gym',  equipment:'Брусья',      eff:'good', swap:'chest_press',   type:'compound' },
  { id:7,  name:'Отжимания от пола',               muscle:'Грудь', place:'home', equipment:'Своё тело',   eff:'base', swap:'chest_press',   type:'compound' },
  { id:8,  name:'Отжимания с широкой постановкой', muscle:'Грудь', place:'home', equipment:'Своё тело',   eff:'base', swap:'chest_press',   type:'compound' },
  { id:9,  name:'Разводка гантелей лёжа',          muscle:'Грудь', place:'both', equipment:'Гантели',     eff:'good', swap:'chest_fly',     type:'isolation' },
  { id:10, name:'Кроссовер в блоке',               muscle:'Грудь', place:'gym',  equipment:'Блок',        eff:'best', swap:'chest_fly',     type:'isolation' },
  { id:11, name:'Сведение в тренажёре (бабочка)',  muscle:'Грудь', place:'gym',  equipment:'Тренажёр',    eff:'good', swap:'chest_fly',     type:'isolation' },
  { id:12, name:'Разводка с резинкой',             muscle:'Грудь', place:'home', equipment:'Резинка',     eff:'alt',  swap:'chest_fly',     type:'isolation' },
  { id:13, name:'Пуловер с гантелью',              muscle:'Грудь', place:'both', equipment:'Гантели',     eff:'alt',  swap:'chest_fly',     type:'isolation' },

  // ═══════════ СПИНА ═══════════
  { id:20, name:'Подтягивания',                    muscle:'Спина', place:'both', equipment:'Турник',      eff:'best', swap:'back_vert',     type:'compound' },
  { id:21, name:'Тяга верхнего блока',             muscle:'Спина', place:'gym',  equipment:'Блок',        eff:'best', swap:'back_vert',     type:'compound' },
  { id:22, name:'Тяга верхнего блока узким хватом',muscle:'Спина', place:'gym',  equipment:'Блок',        eff:'good', swap:'back_vert',     type:'compound' },
  { id:23, name:'Подтягивания с резинкой',         muscle:'Спина', place:'home', equipment:'Резинка',     eff:'base', swap:'back_vert',     type:'compound' },
  { id:24, name:'Тяга штанги в наклоне',           muscle:'Спина', place:'gym',  equipment:'Штанга',      eff:'best', swap:'back_horiz',    type:'compound' },
  { id:25, name:'Тяга горизонтального блока',      muscle:'Спина', place:'gym',  equipment:'Блок',        eff:'best', swap:'back_horiz',    type:'compound' },
  { id:26, name:'Тяга гантели одной рукой',        muscle:'Спина', place:'both', equipment:'Гантели',     eff:'good', swap:'back_horiz',    type:'compound' },
  { id:27, name:'Тяга Т-грифа',                    muscle:'Спина', place:'gym',  equipment:'Штанга',      eff:'good', swap:'back_horiz',    type:'compound' },
  { id:28, name:'Тяга гантелей в наклоне',         muscle:'Спина', place:'both', equipment:'Гантели',     eff:'good', swap:'back_horiz',    type:'compound' },
  { id:29, name:'Тяга резинки к поясу',            muscle:'Спина', place:'home', equipment:'Резинка',     eff:'alt',  swap:'back_horiz',    type:'compound' },
  { id:30, name:'Гиперэкстензия',                  muscle:'Спина', place:'both', equipment:'Своё тело',   eff:'good', swap:'lower_back',    type:'isolation' },
  { id:31, name:'Тяга гантели в планке',           muscle:'Спина', place:'home', equipment:'Гантели',     eff:'alt',  swap:'back_horiz',    type:'compound' },

  // ═══════════ НОГИ (КВАДРИЦЕПС) ═══════════
  { id:40, name:'Приседания со штангой',           muscle:'Ноги',  place:'gym',  equipment:'Штанга',      eff:'best', swap:'quad',          type:'compound' },
  { id:41, name:'Фронтальные приседания',          muscle:'Ноги',  place:'gym',  equipment:'Штанга',      eff:'good', swap:'quad',          type:'compound' },
  { id:42, name:'Жим ногами в тренажёре',          muscle:'Ноги',  place:'gym',  equipment:'Тренажёр',    eff:'best', swap:'quad',          type:'compound' },
  { id:43, name:'Гакк-приседания',                 muscle:'Ноги',  place:'gym',  equipment:'Тренажёр',    eff:'good', swap:'quad',          type:'compound' },
  { id:44, name:'Приседания с гантелями',          muscle:'Ноги',  place:'both', equipment:'Гантели',     eff:'good', swap:'quad',          type:'compound' },
  { id:45, name:'Приседания с собственным весом',  muscle:'Ноги',  place:'home', equipment:'Своё тело',   eff:'base', swap:'quad',          type:'compound' },
  { id:46, name:'Выпады с гантелями',              muscle:'Ноги',  place:'both', equipment:'Гантели',     eff:'good', swap:'quad',          type:'compound' },
  { id:47, name:'Болгарские выпады',               muscle:'Ноги',  place:'both', equipment:'Гантели',     eff:'best', swap:'quad',          type:'compound' },
  { id:48, name:'Разгибание ног в тренажёре',      muscle:'Ноги',  place:'gym',  equipment:'Тренажёр',    eff:'good', swap:'quad_iso',      type:'isolation' },
  // ═══════════ НОГИ (БИЦЕПС БЕДРА / ЯГОДИЦЫ) ═══════════
  { id:50, name:'Румынская тяга',                  muscle:'Ноги',  place:'gym',  equipment:'Штанга',      eff:'best', swap:'hamstring',     type:'compound' },
  { id:51, name:'Становая тяга',                   muscle:'Ноги',  place:'gym',  equipment:'Штанга',      eff:'best', swap:'hamstring',     type:'compound' },
  { id:52, name:'Румынская тяга с гантелями',      muscle:'Ноги',  place:'both', equipment:'Гантели',     eff:'good', swap:'hamstring',     type:'compound' },
  { id:53, name:'Сгибание ног в тренажёре',        muscle:'Ноги',  place:'gym',  equipment:'Тренажёр',    eff:'good', swap:'hamstring',     type:'isolation' },
  { id:54, name:'Ягодичный мост со штангой',       muscle:'Ноги',  place:'gym',  equipment:'Штанга',      eff:'best', swap:'glutes',        type:'compound' },
  { id:55, name:'Ягодичный мост',                  muscle:'Ноги',  place:'home', equipment:'Своё тело',   eff:'base', swap:'glutes',        type:'compound' },
  { id:56, name:'Отведение ноги в блоке',          muscle:'Ноги',  place:'gym',  equipment:'Блок',        eff:'good', swap:'glutes',        type:'isolation' },
  { id:57, name:'Ягодичный мост с резинкой',       muscle:'Ноги',  place:'home', equipment:'Резинка',     eff:'alt',  swap:'glutes',        type:'isolation' },
  // ═══════════ НОГИ (ИКРЫ) ═══════════
  { id:60, name:'Подъём на икры стоя',             muscle:'Ноги',  place:'gym',  equipment:'Тренажёр',    eff:'best', swap:'calves',        type:'isolation' },
  { id:61, name:'Подъём на икры сидя',             muscle:'Ноги',  place:'gym',  equipment:'Тренажёр',    eff:'good', swap:'calves',        type:'isolation' },
  { id:62, name:'Подъём на икры с гантелями',      muscle:'Ноги',  place:'both', equipment:'Гантели',     eff:'good', swap:'calves',        type:'isolation' },
  { id:63, name:'Подъём на икры стоя на полу',     muscle:'Ноги',  place:'home', equipment:'Своё тело',   eff:'base', swap:'calves',        type:'isolation' },

  // ═══════════ ПЛЕЧИ ═══════════
  { id:70, name:'Жим штанги стоя',                 muscle:'Плечи', place:'gym',  equipment:'Штанга',      eff:'best', swap:'shoulder_press',type:'compound' },
  { id:71, name:'Жим гантелей сидя',               muscle:'Плечи', place:'both', equipment:'Гантели',     eff:'best', swap:'shoulder_press',type:'compound' },
  { id:72, name:'Жим штанги сидя',                 muscle:'Плечи', place:'gym',  equipment:'Штанга',      eff:'good', swap:'shoulder_press',type:'compound' },
  { id:73, name:'Жим в тренажёре на плечи',        muscle:'Плечи', place:'gym',  equipment:'Тренажёр',    eff:'good', swap:'shoulder_press',type:'compound' },
  { id:74, name:'Жим гантелей стоя',               muscle:'Плечи', place:'both', equipment:'Гантели',     eff:'good', swap:'shoulder_press',type:'compound' },
  { id:75, name:'Махи гантелями в стороны',        muscle:'Плечи', place:'both', equipment:'Гантели',     eff:'best', swap:'side_delt',     type:'isolation' },
  { id:76, name:'Махи в стороны в блоке',          muscle:'Плечи', place:'gym',  equipment:'Блок',        eff:'good', swap:'side_delt',     type:'isolation' },
  { id:77, name:'Махи с резинкой в стороны',       muscle:'Плечи', place:'home', equipment:'Резинка',     eff:'alt',  swap:'side_delt',     type:'isolation' },
  { id:78, name:'Тяга к подбородку',               muscle:'Плечи', place:'both', equipment:'Штанга',      eff:'good', swap:'side_delt',     type:'compound' },
  { id:79, name:'Махи в наклоне (задняя дельта)',  muscle:'Плечи', place:'both', equipment:'Гантели',     eff:'good', swap:'rear_delt',     type:'isolation' },
  { id:80, name:'Обратная бабочка в тренажёре',    muscle:'Плечи', place:'gym',  equipment:'Тренажёр',    eff:'good', swap:'rear_delt',     type:'isolation' },
  { id:81, name:'Махи в наклоне с резинкой',       muscle:'Плечи', place:'home', equipment:'Резинка',     eff:'alt',  swap:'rear_delt',     type:'isolation' },

  // ═══════════ ТРИЦЕПС ═══════════
  { id:90, name:'Жим узким хватом',                muscle:'Трицепс',place:'gym', equipment:'Штанга',      eff:'best', swap:'triceps',       type:'compound' },
  { id:91, name:'Брусья (акцент на трицепс)',      muscle:'Трицепс',place:'gym', equipment:'Брусья',      eff:'best', swap:'triceps',       type:'compound' },
  { id:92, name:'Разгибание на блоке',             muscle:'Трицепс',place:'gym', equipment:'Блок',        eff:'best', swap:'triceps_iso',   type:'isolation' },
  { id:93, name:'Французский жим лёжа',            muscle:'Трицепс',place:'gym', equipment:'Штанга',      eff:'good', swap:'triceps_iso',   type:'isolation' },
  { id:94, name:'Французский жим с гантелью',      muscle:'Трицепс',place:'both',equipment:'Гантели',     eff:'good', swap:'triceps_iso',   type:'isolation' },
  { id:95, name:'Разгибание гантели из-за головы', muscle:'Трицепс',place:'both',equipment:'Гантели',     eff:'good', swap:'triceps_iso',   type:'isolation' },
  { id:96, name:'Обратные отжимания от скамьи',    muscle:'Трицепс',place:'home',equipment:'Своё тело',   eff:'base', swap:'triceps',       type:'compound' },
  { id:97, name:'Разгибание с резинкой',           muscle:'Трицепс',place:'home',equipment:'Резинка',     eff:'alt',  swap:'triceps_iso',   type:'isolation' },

  // ═══════════ БИЦЕПС ═══════════
  { id:100,name:'Подъём штанги на бицепс',         muscle:'Бицепс', place:'both',equipment:'Штанга',      eff:'best', swap:'biceps',        type:'isolation' },
  { id:101,name:'Подъём гантелей на бицепс',       muscle:'Бицепс', place:'both',equipment:'Гантели',     eff:'best', swap:'biceps',        type:'isolation' },
  { id:102,name:'Молотки с гантелями',             muscle:'Бицепс', place:'both',equipment:'Гантели',     eff:'good', swap:'biceps',        type:'isolation' },
  { id:103,name:'Сгибание на блоке',               muscle:'Бицепс', place:'gym', equipment:'Блок',        eff:'good', swap:'biceps',        type:'isolation' },
  { id:104,name:'Сгибание на скамье Скотта',       muscle:'Бицепс', place:'gym', equipment:'Тренажёр',    eff:'good', swap:'biceps',        type:'isolation' },
  { id:105,name:'Концентрированный подъём',        muscle:'Бицепс', place:'both',equipment:'Гантели',     eff:'good', swap:'biceps',        type:'isolation' },
  { id:106,name:'Сгибание с резинкой',             muscle:'Бицепс', place:'home',equipment:'Резинка',     eff:'alt',  swap:'biceps',        type:'isolation' },

  // ═══════════ КОР / ПРЕСС ═══════════
  { id:110,name:'Скручивания',                     muscle:'Кор',   place:'both', equipment:'Своё тело',   eff:'good', swap:'abs',           type:'isolation' },
  { id:111,name:'Подъём ног лёжа',                 muscle:'Кор',   place:'both', equipment:'Своё тело',   eff:'best', swap:'abs',           type:'isolation' },
  { id:112,name:'Подъём ног в висе',               muscle:'Кор',   place:'gym',  equipment:'Турник',      eff:'best', swap:'abs',           type:'isolation' },
  { id:113,name:'Скручивания на блоке',            muscle:'Кор',   place:'gym',  equipment:'Блок',        eff:'good', swap:'abs',           type:'isolation' },
  { id:114,name:'Планка',                          muscle:'Кор',   place:'both', equipment:'Своё тело',   eff:'good', swap:'core_static',   type:'isolation' },
  { id:115,name:'Боковая планка',                  muscle:'Кор',   place:'both', equipment:'Своё тело',   eff:'good', swap:'core_static',   type:'isolation' },
  { id:116,name:'Велосипед',                       muscle:'Кор',   place:'home', equipment:'Своё тело',   eff:'good', swap:'abs',           type:'isolation' },
  { id:117,name:'Русские скручивания',             muscle:'Кор',   place:'home', equipment:'Своё тело',   eff:'base', swap:'abs',           type:'isolation' },
  { id:118,name:'Колесо для пресса',               muscle:'Кор',   place:'both', equipment:'Колесо',      eff:'best', swap:'core_static',   type:'compound' },

  // ═══════════ КАРДИО ═══════════
  { id:120,name:'Беговая дорожка',                 muscle:'Кардио',place:'gym',  equipment:'Тренажёр',    eff:'best', swap:'cardio',        type:'compound' },
  { id:121,name:'Эллипс',                          muscle:'Кардио',place:'gym',  equipment:'Тренажёр',    eff:'good', swap:'cardio',        type:'compound' },
  { id:122,name:'Велотренажёр',                    muscle:'Кардио',place:'gym',  equipment:'Тренажёр',    eff:'good', swap:'cardio',        type:'compound' },
  { id:123,name:'Гребной тренажёр',                muscle:'Кардио',place:'gym',  equipment:'Тренажёр',    eff:'best', swap:'cardio',        type:'compound' },
  { id:124,name:'Скакалка',                        muscle:'Кардио',place:'both', equipment:'Скакалка',    eff:'good', swap:'cardio',        type:'compound' },
  { id:125,name:'Бёрпи',                           muscle:'Кардио',place:'home', equipment:'Своё тело',   eff:'best', swap:'cardio',        type:'compound' },
  { id:126,name:'Бег на месте / высокие колени',   muscle:'Кардио',place:'home', equipment:'Своё тело',   eff:'base', swap:'cardio',        type:'compound' },
  { id:127,name:'Джампинг-джек',                   muscle:'Кардио',place:'home', equipment:'Своё тело',   eff:'base', swap:'cardio',        type:'compound' },

  // ═══════════════════════════════════════════════════════════════════════
  // ДОПОЛНЕНИЕ: упражнения под всё остальное оборудование, которое бывает
  // в зале (тренажёр Смита, гиря, EZ-гриф, трэп-гриф, TRX, лэндмайн, сани,
  // канаты, приводящий/отводящий тренажёры, машина для ягодичного моста и т.д.)
  // ═══════════════════════════════════════════════════════════════════════

  // ═══════════ ГРУДЬ (доп.) ═══════════
  { id:200,name:'Жим штанги в Смите лёжа',         muscle:'Грудь', place:'gym',  equipment:'Тренажёр Смита', eff:'good', swap:'chest_press', type:'compound' },
  { id:201,name:'Жим штанги на скамье с отриц. наклоном', muscle:'Грудь', place:'gym',  equipment:'Штанга',   eff:'good', swap:'chest_press', type:'compound' },
  { id:202,name:'Жим гантелей на скамье с отриц. наклоном', muscle:'Грудь', place:'gym', equipment:'Гантели', eff:'good', swap:'chest_press', type:'compound' },
  { id:203,name:'Разводка гантелей на наклонной скамье', muscle:'Грудь', place:'gym',  equipment:'Гантели',   eff:'good', swap:'chest_fly',  type:'isolation' },
  { id:204,name:'Жим гантелей на фитболе',         muscle:'Грудь', place:'gym',  equipment:'Фитбол',      eff:'alt',  swap:'chest_press', type:'compound' },
  { id:205,name:'Отжимания в петлях TRX',          muscle:'Грудь', place:'gym',  equipment:'Петли TRX',   eff:'good', swap:'chest_press', type:'compound' },
  { id:206,name:'Жим Свенда (сведение с блином)',  muscle:'Грудь', place:'both', equipment:'Блин',        eff:'alt',  swap:'chest_fly',  type:'isolation' },
  { id:207,name:'Пуловер в тренажёре',             muscle:'Грудь', place:'gym',  equipment:'Тренажёр',    eff:'good', swap:'chest_fly',  type:'isolation' },

  // ═══════════ СПИНА (доп.) ═══════════
  { id:208,name:'Тяга штанги в Смите в наклоне',   muscle:'Спина', place:'gym',  equipment:'Тренажёр Смита', eff:'good', swap:'back_horiz', type:'compound' },
  { id:209,name:'Шраги со штангой',                muscle:'Спина', place:'gym',  equipment:'Штанга',      eff:'best', swap:'traps',      type:'isolation' },
  { id:210,name:'Шраги с гантелями',               muscle:'Спина', place:'both', equipment:'Гантели',     eff:'good', swap:'traps',      type:'isolation' },
  { id:211,name:'Шраги в тренажёре',               muscle:'Спина', place:'gym',  equipment:'Тренажёр',    eff:'good', swap:'traps',      type:'isolation' },
  { id:212,name:'Тяга гантели в упоре грудью на скамье', muscle:'Спина', place:'gym', equipment:'Гантели', eff:'good', swap:'back_horiz', type:'compound' },
  { id:213,name:'Гиперэкстензия с отягощением',    muscle:'Спина', place:'gym',  equipment:'Гантели',     eff:'good', swap:'lower_back', type:'isolation' },
  { id:214,name:'Обратная гиперэкстензия в тренажёре', muscle:'Спина', place:'gym', equipment:'Тренажёр', eff:'good', swap:'lower_back', type:'isolation' },
  { id:215,name:'Подтягивания узким обратным хватом', muscle:'Спина', place:'gym', equipment:'Турник',    eff:'good', swap:'back_vert',  type:'compound' },
  { id:216,name:'Тяга в петлях TRX',               muscle:'Спина', place:'gym',  equipment:'Петли TRX',   eff:'good', swap:'back_horiz', type:'compound' },
  { id:217,name:'Тяга гири в наклоне',             muscle:'Спина', place:'both', equipment:'Гиря',        eff:'good', swap:'back_horiz', type:'compound' },
  { id:218,name:'Тяга лэндмайна одной рукой',      muscle:'Спина', place:'gym',  equipment:'Лэндмайн',    eff:'good', swap:'back_horiz', type:'compound' },

  // ═══════════ НОГИ (доп.) ═══════════
  { id:219,name:'Присед в Смите',                  muscle:'Ноги',  place:'gym',  equipment:'Тренажёр Смита', eff:'good', swap:'quad',     type:'compound' },
  { id:220,name:'Присед с гирей (кубковый)',       muscle:'Ноги',  place:'both', equipment:'Гиря',        eff:'good', swap:'quad',       type:'compound' },
  { id:221,name:'Пистолетик (присед на одной ноге)', muscle:'Ноги', place:'home', equipment:'Своё тело',  eff:'best', swap:'quad',       type:'compound' },
  { id:222,name:'Жим одной ногой в тренажёре',     muscle:'Ноги',  place:'gym',  equipment:'Тренажёр',    eff:'good', swap:'quad',       type:'compound' },
  { id:223,name:'Степ-ап с гантелями',             muscle:'Ноги',  place:'both', equipment:'Степ-платформа', eff:'good', swap:'quad',    type:'compound' },
  { id:224,name:'Сисси-приседания',                muscle:'Ноги',  place:'gym',  equipment:'Своё тело',   eff:'alt',  swap:'quad_iso',   type:'isolation' },
  { id:225,name:'Выпады со штангой',               muscle:'Ноги',  place:'gym',  equipment:'Штанга',      eff:'good', swap:'quad',       type:'compound' },
  { id:226,name:'Ходьба выпадами с гантелями',     muscle:'Ноги',  place:'both', equipment:'Гантели',     eff:'good', swap:'quad',       type:'compound' },
  { id:227,name:'Становая тяга с трэп-грифом',     muscle:'Ноги',  place:'gym',  equipment:'Трэп-гриф',   eff:'best', swap:'hamstring',  type:'compound' },
  { id:228,name:'Доброе утро',                     muscle:'Ноги',  place:'gym',  equipment:'Штанга',      eff:'good', swap:'hamstring',  type:'compound' },
  { id:229,name:'Мёртвая тяга на одной ноге с гантелью', muscle:'Ноги', place:'both', equipment:'Гантели', eff:'good', swap:'hamstring', type:'compound' },
  { id:230,name:'Сгибание ног сидя в тренажёре',   muscle:'Ноги',  place:'gym',  equipment:'Тренажёр',    eff:'good', swap:'hamstring',  type:'isolation' },
  { id:231,name:'Взмахи гирей (свинг)',            muscle:'Ноги',  place:'both', equipment:'Гиря',        eff:'best', swap:'glutes',     type:'compound' },
  { id:232,name:'Тяга бёдрами в тренажёре',        muscle:'Ноги',  place:'gym',  equipment:'Тренажёр',    eff:'best', swap:'glutes',     type:'isolation' },
  { id:233,name:'Ягодичный мост в Смите',          muscle:'Ноги',  place:'gym',  equipment:'Тренажёр Смита', eff:'good', swap:'glutes',   type:'compound' },
  { id:234,name:'Сведение ног в тренажёре',        muscle:'Ноги',  place:'gym',  equipment:'Тренажёр',    eff:'good', swap:'adductor',   type:'isolation' },
  { id:235,name:'Разведение ног в тренажёре',      muscle:'Ноги',  place:'gym',  equipment:'Тренажёр',    eff:'good', swap:'abductor',   type:'isolation' },
  { id:236,name:'Ослиные подъёмы на икры',         muscle:'Ноги',  place:'gym',  equipment:'Тренажёр',    eff:'good', swap:'calves',     type:'isolation' },
  { id:237,name:'Подъём на икры со штангой стоя',  muscle:'Ноги',  place:'gym',  equipment:'Штанга',      eff:'good', swap:'calves',     type:'isolation' },

  // ═══════════ ПЛЕЧИ (доп.) ═══════════
  { id:238,name:'Жим Арнольда',                    muscle:'Плечи', place:'both', equipment:'Гантели',     eff:'best', swap:'shoulder_press', type:'compound' },
  { id:239,name:'Жим в Смите сидя',                muscle:'Плечи', place:'gym',  equipment:'Тренажёр Смита', eff:'good', swap:'shoulder_press', type:'compound' },
  { id:240,name:'Жим гири',                        muscle:'Плечи', place:'both', equipment:'Гиря',        eff:'good', swap:'shoulder_press', type:'compound' },
  { id:241,name:'Жим штанги в лэндмайне',          muscle:'Плечи', place:'gym',  equipment:'Лэндмайн',    eff:'good', swap:'shoulder_press', type:'compound' },
  { id:242,name:'Махи гантелями лёжа на боку',     muscle:'Плечи', place:'gym',  equipment:'Гантели',     eff:'good', swap:'side_delt',  type:'isolation' },

  // ═══════════ ТРИЦЕПС (доп.) ═══════════
  { id:243,name:'Разгибание руки с гантелью в наклоне (кикбэк)', muscle:'Трицепс', place:'both', equipment:'Гантели', eff:'good', swap:'triceps_iso', type:'isolation' },
  { id:244,name:'Жим гантелей узким хватом',       muscle:'Трицепс',place:'both',equipment:'Гантели',     eff:'good', swap:'triceps',    type:'compound' },
  { id:245,name:'Алмазные отжимания',              muscle:'Трицепс',place:'home',equipment:'Своё тело',   eff:'good', swap:'triceps',    type:'compound' },
  { id:246,name:'Отжимания в тренажёре (трицепс)', muscle:'Трицепс',place:'gym', equipment:'Тренажёр',    eff:'good', swap:'triceps',    type:'compound' },

  // ═══════════ БИЦЕПС (доп.) ═══════════
  { id:247,name:'Подъём EZ-штанги на бицепс',      muscle:'Бицепс', place:'gym', equipment:'EZ-штанга',   eff:'best', swap:'biceps',     type:'isolation' },
  { id:248,name:'Подъём гантелей на наклонной скамье', muscle:'Бицепс', place:'gym', equipment:'Гантели', eff:'good', swap:'biceps',     type:'isolation' },
  { id:249,name:'Паучий подъём (спайдер-керл)',    muscle:'Бицепс', place:'gym', equipment:'Штанга',      eff:'good', swap:'biceps',     type:'isolation' },
  { id:250,name:'Подъём штанги обратным хватом',   muscle:'Бицепс', place:'gym', equipment:'Штанга',      eff:'good', swap:'biceps',     type:'isolation' },
  { id:251,name:'Сгибание рук с гирей',            muscle:'Бицепс', place:'both',equipment:'Гиря',        eff:'alt',  swap:'biceps',     type:'isolation' },

  // ═══════════ КОР / ПРЕСС (доп.) ═══════════
  { id:252,name:'Подъём коленей в тренажёре (римский стул)', muscle:'Кор', place:'gym', equipment:'Тренажёр', eff:'good', swap:'abs',    type:'isolation' },
  { id:253,name:'Скручивания в тренажёре',         muscle:'Кор',   place:'gym',  equipment:'Тренажёр',    eff:'good', swap:'abs',        type:'isolation' },
  { id:254,name:'Дровосек в блоке',                muscle:'Кор',   place:'gym',  equipment:'Блок',        eff:'good', swap:'obliques',   type:'isolation' },
  { id:255,name:'Наклоны в сторону с гантелью',    muscle:'Кор',   place:'both', equipment:'Гантели',     eff:'good', swap:'obliques',   type:'isolation' },
  { id:256,name:'Ротация в лэндмайне',             muscle:'Кор',   place:'gym',  equipment:'Лэндмайн',    eff:'good', swap:'obliques',   type:'isolation' },
  { id:257,name:'Подъём ног на наклонной скамье',  muscle:'Кор',   place:'gym',  equipment:'Скамья',      eff:'good', swap:'abs',        type:'isolation' },
  { id:258,name:'Турецкий подъём с гирей',         muscle:'Кор',   place:'gym',  equipment:'Гиря',        eff:'best', swap:'core_static', type:'compound' },
  { id:259,name:'Скручивания в петлях TRX',        muscle:'Кор',   place:'gym',  equipment:'Петли TRX',   eff:'good', swap:'core_static', type:'isolation' },
  { id:260,name:'Бросок медбола в стену',          muscle:'Кор',   place:'gym',  equipment:'Медбол',      eff:'good', swap:'abs',        type:'compound' },

  // ═══════════ КАРДИО (доп.) ═══════════
  { id:261,name:'Скалолаз (маунтин клаймберс)',    muscle:'Кардио',place:'home', equipment:'Своё тело',   eff:'best', swap:'cardio',     type:'compound' },
  { id:262,name:'Приседания с выпрыгиванием',      muscle:'Кардио',place:'home', equipment:'Своё тело',   eff:'good', swap:'cardio',     type:'compound' },
  { id:263,name:'Прыжки на тумбу (бокс-джампы)',   muscle:'Кардио',place:'gym',  equipment:'Тумба',       eff:'good', swap:'cardio',     type:'compound' },
  { id:264,name:'Толкание/тяга саней',             muscle:'Кардио',place:'gym',  equipment:'Сани',        eff:'best', swap:'cardio',     type:'compound' },
  { id:265,name:'Боевые канаты',                   muscle:'Кардио',place:'gym',  equipment:'Канаты',      eff:'good', swap:'cardio',     type:'compound' },
  { id:266,name:'Прогулка фермера',                muscle:'Кардио',place:'both', equipment:'Гантели',     eff:'good', swap:'cardio',     type:'compound' },
  { id:267,name:'Аэробайк (Assault Bike)',         muscle:'Кардио',place:'gym',  equipment:'Тренажёр',    eff:'best', swap:'cardio',     type:'compound' },
  { id:268,name:'Степпер (лестница-тренажёр)',     muscle:'Кардио',place:'gym',  equipment:'Тренажёр',    eff:'good', swap:'cardio',     type:'compound' },
  { id:269,name:'Лыжный тренажёр (SkiErg)',        muscle:'Кардио',place:'gym',  equipment:'Тренажёр',    eff:'good', swap:'cardio',     type:'compound' },
  { id:270,name:'Рывок гири',                      muscle:'Кардио',place:'gym',  equipment:'Гиря',        eff:'best', swap:'cardio',     type:'compound' },
]

// Уникальные мышечные группы (для фильтра в UI)
export const MUSCLE_GROUPS = ['Грудь', 'Спина', 'Ноги', 'Плечи', 'Трицепс', 'Бицепс', 'Кор', 'Кардио']

// Уникальные виды оборудования, встречающиеся в базе (для будущего фильтра
// «что есть в моём зале» — просто список того, что реально используется).
export const EQUIPMENT_LIST = [...new Set(EXERCISE_DB.map(e => e.equipment))].sort()

// Найти упражнение в базе по названию: сначала точное совпадение (без учёта
// регистра), затем нечёткое — по значимым корням слов. Нужно потому что
// названия упражнений в AI-плане генерируются свободным текстом и не всегда
// совпадают со справочником дословно (например, «Жим гантелей лёжа на скамье
// с наклоном» вместо канонического «Жим гантелей на наклонной») — без этого
// поиск альтернатив («Заменить») не находил упражнение в базе и показывал
// «нет подходящих альтернатив» почти для всех упражнений из AI-плана.
export function findExerciseByName(name) {
  if (!name) return null
  const key = String(name).trim().toLowerCase()
  const exact = EXERCISE_DB.find(e => e.name.toLowerCase() === key)
  if (exact) return exact
  const matchedName = fuzzyMatchName(name, EXERCISE_DB.map(e => e.name))
  return matchedName ? EXERCISE_DB.find(e => e.name === matchedName) : null
}

// Найти альтернативы упражнению (та же swap-группа, подходящие под место), отсортированные по эффективности
export function findAlternatives(exercise, place) {
  return EXERCISE_DB
    .filter(e => e.swap === exercise.swap && e.id !== exercise.id)
    .filter(e => place === 'both' || e.place === 'both' || e.place === place)
    .sort((a, b) => EFF_ORDER[a.eff] - EFF_ORDER[b.eff])
}

// Отфильтровать и отсортировать упражнения под место тренировки
export function getExercisesFor(place, muscle = null) {
  return EXERCISE_DB
    .filter(e => place === 'both' || e.place === 'both' || e.place === place)
    .filter(e => !muscle || e.muscle === muscle)
    .sort((a, b) => {
      if (a.muscle !== b.muscle) return MUSCLE_GROUPS.indexOf(a.muscle) - MUSCLE_GROUPS.indexOf(b.muscle)
      return EFF_ORDER[a.eff] - EFF_ORDER[b.eff]
    })
}
