import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// в”Ђв”Ђ РђРґСЂРµСЃ СЃРѕР±СЃС‚РІРµРЅРЅРѕРіРѕ Р±СЌРєРµРЅРґР° (Timeweb, HTTPS С‡РµСЂРµР· nginx) в”Ђв”Ђ
const API_URL = import.meta.env.VITE_API_URL || 'https://api.sudbase.ru'

const jsonHeaders = (token) => {
  const h = { 'Content-Type': 'application/json' }
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

// в”Ђв”Ђ РћР±РЅРѕРІР»РµРЅРёРµ access-С‚РѕРєРµРЅР° РїРѕ refresh в”Ђв”Ђ
const refreshSessionToken = async (refreshToken) => {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ refresh_token: refreshToken })
    })
    if (!res.ok) return null
    const data = await res.json()
    if (data.error) return null
    return data
  } catch (e) {
    console.warn('Token refresh error:', e)
    return null
  }
}

const loadProfile = async (token) => {
  try {
    const res = await fetch(`${API_URL}/profile`, { headers: jsonHeaders(token) })
    if (!res.ok) return null
    return await res.json()
  } catch (e) {
    console.warn('Profile load error:', e)
    return null
  }
}

const loadEntries = async (token) => {
  try {
    const res = await fetch(`${API_URL}/entries`, { headers: jsonHeaders(token) })
    if (!res.ok) return null
    const data = await res.json()
    if (!Array.isArray(data)) return null
    return data.map(row => ({
      date: row.date,
      foods: row.foods || [],
      workouts: row.workouts || [],
    }))
  } catch (e) {
    console.warn('Entries load error:', e)
    return null
  }
}

const syncEntry = async (token, entry) => {
  try {
    await fetch(`${API_URL}/entries`, {
      method: 'POST',
      headers: jsonHeaders(token),
      body: JSON.stringify({
        date: entry.date,
        foods: entry.foods || [],
        workouts: entry.workouts || [],
      })
    })
  } catch (e) {
    console.warn('Entry sync error:', e)
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

      // в”Ђв”Ђ РџРѕР»СѓС‡РёС‚СЊ Р°РєС‚СѓР°Р»СЊРЅС‹Р№ С‚РѕРєРµРЅ (Р°РІС‚Рѕ-РѕР±РЅРѕРІР»РµРЅРёРµ) в”Ђв”Ђ
      getValidToken: async () => {
        const { session } = get()
        if (!session) return null
        const expiresAt = session.expires_at ? session.expires_at * 1000 : 0
        const now = Date.now()
        if (expiresAt && now < expiresAt - 120000) return session.access_token
        if (session.refresh_token) {
          const newSession = await refreshSessionToken(session.refresh_token)
          if (newSession && newSession.access_token) {
            set({ session: newSession, user: newSession.user })
            return newSession.access_token
          }
        }
        return session.access_token
      },

      // в”Ђв”Ђ Auth в”Ђв”Ђ
      signUp: async (email, password, name) => {
        const res = await fetch(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: jsonHeaders(),
          body: JSON.stringify({ email, password, name })
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error.message || 'РћС€РёР±РєР° СЂРµРіРёСЃС‚СЂР°С†РёРё')
        return data
      },

      signIn: async (email, password) => {
        set({ isLoggingIn: true })
        try {
          const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: jsonHeaders(),
            body: JSON.stringify({ email, password })
          })
          const data = await res.json()
          if (data.error) throw new Error(data.error.message || 'РќРµРІРµСЂРЅС‹Р№ email РёР»Рё РїР°СЂРѕР»СЊ')

          set({ user: data.user, session: data })

          // Р—Р°РіСЂСѓР¶Р°РµРј РїСЂРѕС„РёР»СЊ
          const profileRaw = await loadProfile(data.access_token)
          if (profileRaw) {
            set({
              profile: {
                name: profileRaw.name || data.user.user_metadata?.name,
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
              }
            })
          }

          // Р—Р°РіСЂСѓР¶Р°РµРј РґРЅРµРІРЅРёРє СЃ СЃРµСЂРІРµСЂР°
          const remoteEntries = await loadEntries(data.access_token)
          if (remoteEntries && remoteEntries.length > 0) {
            set({ entries: remoteEntries })
          }

          return data
        } finally {
          set({ isLoggingIn: false })
        }
      },

      signOut: () => {
        set({ user: null, session: null, profile: null, entries: [], weights: [] })
      },

      // в”Ђв”Ђ Profile в”Ђв”Ђ
      saveProfile: async (profileData) => {
        const { session, getValidToken } = get()
        set({ profile: profileData })
        if (!session) return
        try {
          const token = await getValidToken()
          await fetch(`${API_URL}/profile`, {
            method: 'PUT',
            headers: jsonHeaders(token),
            body: JSON.stringify({
              name: profileData.name,
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
            })
          })
        } catch (e) {
          console.warn('Profile save error:', e)
        }
      },

      resetProfile: () => set({ profile: null }),

      // в”Ђв”Ђ AI в”Ђв”Ђ
      aiCall: async (messages, maxTokens = 600) => {
        const res = await fetch(`${API_URL}/ai`, {
          method: 'POST',
          headers: jsonHeaders(),
          body: JSON.stringify({ messages, max_tokens: maxTokens })
        })
        const data = await res.json()
        return data.choices?.[0]?.message?.content || ''
      },

      // в”Ђв”Ђ Diary в”Ђв”Ђ
      getEntry: (date) => {
        const { entries } = get()
        return entries.find(e => e.date === date) || { date, foods: [], workouts: [] }
      },

      saveEntry: async (entry) => {
        set(state => {
          const entries = state.entries.filter(e => e.date !== entry.date)
          return { entries: [entry, ...entries].sort((a, b) => b.date.localeCompare(a.date)) }
        })
        const { session, getValidToken } = get()
        if (session) {
          const token = await getValidToken()
          await syncEntry(token, entry)
        }
      },

      // в”Ђв”Ђ Weights в”Ђв”Ђ
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

export { API_URL }



