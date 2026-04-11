import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const SB_URL = 'https://ijzfzvxhkpxogpqrsnzf.supabase.co'
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqemZ6dnhoa3B4b2dwcXJzbnpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyODEyOTQsImV4cCI6MjA5MDg1NzI5NH0.2wDtmzVDDfvY9iD08Q_SmeqwFsC4yuDCN2ZAGklSolg'
const API_URL = 'https://fit-ai-tracker-production.up.railway.app'

const sbHeaders = (token) => ({
  'Content-Type': 'application/json',
  'apikey': SB_KEY,
  'Authorization': `Bearer ${token || SB_KEY}`
})

const loadProfile = async (userId, token) => {
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/user_profiles?user_id=eq.${userId}&select=*`,
      { headers: sbHeaders(token) }
    )
    const data = await res.json()
    return data && data.length > 0 ? data[0] : null
  } catch (e) {
    console.warn('Profile load error:', e)
    return null
  }
}

export const useStore = create(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      profile: null,
      isLoggingIn: false,
      entries: [],
      weights: [],
      activeTab: 'today',
      selectedDate: new Date().toISOString().split('T')[0],

      // ── Auth ──
      signUp: async (email, password, name) => {
        const res = await fetch(`${SB_URL}/auth/v1/signup`, {
          method: 'POST',
          headers: sbHeaders(),
          body: JSON.stringify({ email, password, data: { name } })
        })
        const data = await res.json()
        if (data.error || data.msg?.includes('already')) throw new Error(data.error?.message || data.msg || 'Ошибка регистрации')
        return data
      },

      signIn: async (email, password) => {
        set({ isLoggingIn: true })
        try {
          const res = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: sbHeaders(),
            body: JSON.stringify({ email, password })
          })
          const data = await res.json()
          if (data.error) throw new Error(data.error.message || 'Неверный email или пароль')

          set({ user: data.user, session: data })

          // Загружаем профиль из Supabase ДО снятия флага
          const profileRaw = await loadProfile(data.user.id, data.access_token)
          if (profileRaw) {
            set({ profile: {
              role: profileRaw.role,
              level: profileRaw.level,
              goals: profileRaw.goals,
              hasLimitations: profileRaw.has_limitations,
              limitationsText: profileRaw.limitations_text,
              age: profileRaw.age,
              weight: profileRaw.weight,
              height: profileRaw.height,
              gender: profileRaw.gender,
              activity: profileRaw.activity,
              calorieGoal: profileRaw.calorie_goal,
              proteinGoal: profileRaw.protein_goal,
              fatGoal: profileRaw.fat_goal,
              carbGoal: profileRaw.carb_goal,
              bmi: profileRaw.bmi,
              completedAt: profileRaw.completed_at,
            }})
          }

          return data
        } finally {
          set({ isLoggingIn: false })
        }
      },

      signOut: () => {
        set({ user: null, session: null, profile: null, entries: [], weights: [] })
      },

      // ── Profile ──
      saveProfile: async (profileData) => {
        const { session } = get()
        set({ profile: profileData })

        if (!session) return

        try {
          await fetch(`${SB_URL}/rest/v1/user_profiles`, {
            method: 'POST',
            headers: {
              ...sbHeaders(session.access_token),
              'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify({
              user_id: session.user.id,
              role: profileData.role,
              level: profileData.level,
              goals: profileData.goals,
              has_limitations: profileData.hasLimitations,
              limitations_text: profileData.limitationsText,
              age: profileData.age ? +profileData.age : null,
              weight: profileData.weight ? +profileData.weight : null,
              height: profileData.height ? +profileData.height : null,
              gender: profileData.gender,
              activity: profileData.activity,
              calorie_goal: profileData.calorieGoal,
              protein_goal: profileData.proteinGoal,
              fat_goal: profileData.fatGoal,
              carb_goal: profileData.carbGoal,
              bmi: profileData.bmi ? +profileData.bmi : null,
              completed_at: profileData.completedAt,
              updated_at: new Date().toISOString()
            })
          })
        } catch (e) {
          console.warn('Profile save error:', e)
        }
      },

      // Обновить профиль (для повторного редактирования)
      resetProfile: () => set({ profile: null }),

      // ── AI ──
      aiCall: async (messages, maxTokens = 600) => {
        const res = await fetch(`${API_URL}/ai`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages, max_tokens: maxTokens })
        })
        const data = await res.json()
        return data.choices?.[0]?.message?.content || ''
      },

      // ── Diary ──
      getEntry: (date) => {
        const { entries } = get()
        return entries.find(e => e.date === date) || {
          date, foods: [], workouts: [],
          totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0
        }
      },

      saveEntry: (entry) => {
        set(state => {
          const entries = state.entries.filter(e => e.date !== entry.date)
          return { entries: [entry, ...entries].sort((a, b) => b.date.localeCompare(a.date)) }
        })
      },

      // ── Weights ──
      addWeight: (date, kg) => {
        set(state => {
          const weights = state.weights.filter(w => w.date !== date)
          return { weights: [{ date, kg }, ...weights].sort((a, b) => b.date.localeCompare(a.date)) }
        })
      },
    }),
    {
      name: 'fit-diary-v1',
      partialize: (state) => ({
        user: state.user,
        session: state.session,
        profile: state.profile,
        entries: state.entries,
        weights: state.weights,
      })
    }
  )
)

export { SB_URL, SB_KEY, API_URL }
