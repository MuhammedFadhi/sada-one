import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { UserRole } from '@/types/index'

interface AuthState {
  user:          any | null
  profile:       any | null
  role:          UserRole | null
  loading:       boolean
  initialized:   boolean

  initialize:        () => Promise<void>
  signIn:            (email: string, password: string) => Promise<{ error?: string }>
  signOut:           () => Promise<void>
  sendPasswordReset: (email: string) => Promise<{ error?: string }>
  updatePassword:    (password: string) => Promise<{ error?: string }>
  refreshProfile:    () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user:         null,
  profile:      null,
  role:         null,
  loading:      false,
  initialized:  false,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      set({ user: session.user })
      await get().refreshProfile()
    }
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        set({ user: session.user })
        await get().refreshProfile()
      } else if (event === 'SIGNED_OUT') {
        set({ user: null, profile: null, role: null })
      }
    })
    set({ initialized: true })
  },

  signIn: async (email, password) => {
    set({ loading: true })
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        // Brute-force defense: register the failed attempt server-side.
        // The RPC locks the account for 15 min after 5 consecutive failures.
        try { await supabase.rpc('register_failed_login', { p_email: email }) } catch { /* optional */ }
        set({ loading: false })
        return { error: error.message }
      }

      if (!data.user) {
        set({ loading: false })
        return { error: 'Authentication failed' }
      }

      // Simple direct query — no joins
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()

      if (profileError || !profile) {
        await supabase.auth.signOut()
        set({ loading: false })
        return { error: 'Profile not found. Contact your administrator.' }
      }

      // Brute-force protection: enforce lockout window
      if (profile.locked_until && new Date(profile.locked_until) > new Date()) {
        await supabase.auth.signOut()
        set({ loading: false })
        const mins = Math.ceil((new Date(profile.locked_until).getTime() - Date.now()) / 60000)
        return { error: `Account locked. Try again in ${mins} minute${mins !== 1 ? 's' : ''}.` }
      }

      if (!profile.is_active) {
        await supabase.auth.signOut()
        set({ loading: false })
        return { error: 'Your account has been deactivated. Contact HR.' }
      }

      // Fetch employee separately
      const { data: employee } = await supabase
        .from('employees')
        .select('*, division:divisions!division_id(*)')
        .eq('id', profile.employee_id)
        .single()

      const fullProfile = { ...profile, employee }

      set({
        user:    data.user,
        profile: fullProfile,
        role:    profile.role,
        loading: false,
      })

      // Update last login, non-blocking.
      // NOTE the trailing .then(): a Supabase query builder is lazy — it only
      // issues the HTTP request when awaited or thened. Without this the
      // update was never sent, so `last_login_at` stayed null for everyone and
      // the "Last Login" field always read "Never".
      void supabase.from('user_profiles').update({
        last_login_at:     new Date().toISOString(),
        last_login_device: navigator.userAgent.substring(0, 100),
        failed_attempts:   0,
      }).eq('id', data.user.id).then(({ error }) => {
        if (error) console.warn('last_login_at update failed', error.message)
      })

      return {}

    } catch (err: any) {
      set({ loading: false })
      return { error: err.message ?? 'Sign in failed' }
    }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null, role: null })
  },

  sendPasswordReset: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    return { error: error?.message }
  },

  updatePassword: async (password) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (!error) {
      await supabase.from('user_profiles').update({ must_change_password: false }).eq('id', get().user?.id)
      // Update in-memory profile immediately so route guards stop redirecting
      // to /auth/set-password (this stale flag caused the password-change loop).
      const prof = get().profile
      if (prof) set({ profile: { ...prof, must_change_password: false } })
      await get().refreshProfile()
    }
    return { error: error?.message }
  },

  refreshProfile: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) return

    const { data: employee } = await supabase
      .from('employees')
      .select('*, division:divisions!division_id(*)')
      .eq('id', profile.employee_id)
      .single()

    set({ user, profile: { ...profile, employee }, role: profile.role })
  },
}))
