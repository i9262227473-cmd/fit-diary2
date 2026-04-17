import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const SB_URL = 'https://ijzfzvxhkpxogpqrsnzf.supabase.co'
const SB_KEY = 'sb_publishable_WgFkV_af8M02ndmJ6Lvq_Q_1aHY0xt2'
const API_URL = 'https://fit-ai-tracker-production.up.railway.app'

const OWNER_EMAIL = '9262227473@mail.ru'
const TRIAL_DAYS = 3
const DAILY_AI_LIMIT = 10

const sbHeaders = (token) => ({
  'Content-Type': 'application/json',
  'apikey': SB_KEY,
  'Authorization': `Bearer ${token || SB_KEY}`
})

// AI request counter per day (localStorage)
function getAiCounter() {
  const key = 'ai-cnt-' + new Date().toISOString().split('T')[0]
  return { key, count: +(localStorage.getItem(key) || 0) }
}
function incrementAiCounter() {
  const { key, count } = getAiCounter()
  localStorage.setItem(key, String(count + 1))
}

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
      paywallOpen: false,

      // ── Subscription ──
      isOwner: () => get().user?.email === OWNER_EMAIL,

      getSubscriptionStatus: () => {
        const { user, profile } = get()
        if (!user) return { type: 'none' }
        if (user.email === OWNER_EMAIL) return { type: 'owner' }
        if (profile?.isSubscribed) return { type: 'subscribed', end: profile.subscriptionEnd }

        // Trial: use trial_started_at from profile, or user.created_at
        const trialStart = profile?.trialStartedAt || user.created_at
        if (trialStart) {
          const start = new Date(trialStart)
          const end = new Date(start.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
          const now = new Date()
          if (now <= end) {
            const msLeft = end - now
            const daysLeft = Math.max(1, Math.ceil(msLeft / (24 * 60 * 60 * 1000)))
            return { type: 'trial', daysLeft, end }
          }
        }
        return { type: 'expired' }
      },

      getAiRequestsLeft: () => {
        const { user } = get()
        if (!user || user.email === OWNER_EMAIL) return Infinity
        const status = get().getSubscriptionStatus()
        if (status.type === 'subscribed') return Infinity
        if (status.type !== 'trial') return 0
        const { count } = getAiCounter()
        return Math.max(0, DAILY_AI_LIMIT - count)
      },

      setPaywallOpen: (v) => set({ paywallOpen: v }),

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
              isSubscribed: profileRaw.is_subscribed || false,
              subscriptionEnd: profileRaw.subscription_end || null,
              trialStartedAt: profileRaw.trial_started_at || null,
            }})
          }

          return data
        } finally {
          set({ isLoggingIn: false })
        }
      },

      signOut: () => {
        set({ user: null, session: null, profile: null, entries: [], weights: [], paywallOpen: false })
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

      resetProfile: () => set({ profile: null }),

      // ── AI ──
      aiCall: async (messages, maxTokens = 600) => {
        const { user } = get()
        const email = user?.email

        // Check limits for non-owners
        if (email !== OWNER_EMAIL) {
          const status = get().getSubscriptionStatus()

          if (status.type === 'expired') {
            const err = new Error('Пробный период истёк')
            err.code = 'PAYWALL'
            throw err
          }

          if (status.type === 'trial') {
            const { count } = getAiCounter()
            if (count >= DAILY_AI_LIMIT) {
              const err = new Error(`Лимит ${DAILY_AI_LIMIT} AI запросов на сегодня исчерпан`)
              err.code = 'PAYWALL_LIMIT'
              throw err
            }
            incrementAiCounter()
          }
        }

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

export { SB_URL, SB_KEY, API_URL, OWNER_EMAIL, TRIAL_DAYS, DAILY_AI_LIMIT }
