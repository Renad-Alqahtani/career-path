import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'

export type UserRole = 'student' | 'advisor' | 'mentor' | 'admin'

export interface Profile {
  id: string
  user_id: string
  name: string
  email?: string
  role: UserRole
  avatar_url: string | null
  bio: string
  major: string | null
  year: number | null
  phone: string | null
  location: string | null
  linkedin_url: string | null
  website_url: string | null
  language: string
  theme: string
  privacy_profile_public: boolean
  privacy_show_email: boolean
  accessibility_font_size: string
  accessibility_reduce_motion: boolean
  accessibility_high_contrast: boolean
  created_at: string
  updated_at: string
}

type RegisterResult = 'created' | 'existing' | 'resent'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string, expectedRole?: UserRole) => Promise<Profile | null>
  register: (email: string, password: string, name: string, role: UserRole) => Promise<RegisterResult>
  logout: () => Promise<void>
  refreshProfile: () => Promise<Profile | undefined>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
  updateEmail: (newEmail: string) => Promise<void>
  updatePassword: (newPassword: string) => Promise<void>
  resetPasswordForEmail: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const getProfilesTable = () => (supabase as any).from('profiles')

  const normalizeProfile = (data: any, currentUser?: User): Profile => ({
    id: data?.id ?? '',
    user_id: data?.user_id ?? currentUser?.id ?? '',
    name: data?.name ?? '',
    email: data?.email ?? currentUser?.email ?? '',
    role: (data?.role ?? 'student') as UserRole,
    avatar_url: data?.avatar_url ?? null,
    bio: data?.bio ?? '',
    major: data?.major ?? null,
    year: data?.year ?? null,
    phone: data?.phone ?? null,
    location: data?.location ?? null,
    linkedin_url: data?.linkedin_url ?? null,
    website_url: data?.website_url ?? null,
    language: data?.language ?? 'en',
    theme: data?.theme ?? 'light',
    privacy_profile_public: data?.privacy_profile_public ?? true,
    privacy_show_email: data?.privacy_show_email ?? false,
    accessibility_font_size: data?.accessibility_font_size ?? 'medium',
    accessibility_reduce_motion: data?.accessibility_reduce_motion ?? false,
    accessibility_high_contrast: data?.accessibility_high_contrast ?? false,
    created_at: data?.created_at ?? '',
    updated_at: data?.updated_at ?? '',
  })

  const fetchProfile = async (currentUser: User) => {
    const { data, error } = await getProfilesTable()
      .select('*')
      .eq('user_id', currentUser.id)
      .maybeSingle()

    if (error) throw error

    if (data) {
      const normalized = normalizeProfile(data, currentUser)
      setProfile(normalized)
      return normalized
    }

    const metadataRole = (currentUser.user_metadata?.role as UserRole) || 'student'
    const safeRole: UserRole = metadataRole === 'admin' ? 'student' : metadataRole

    const payload = {
      user_id: currentUser.id,
      name: (currentUser.user_metadata?.name as string) || currentUser.email?.split('@')[0] || 'User',
      email: currentUser.email ?? '',
      role: safeRole,
      bio: '',
      avatar_url: null,
      major: null,
      year: null,
      phone: null,
      location: null,
      linkedin_url: null,
      website_url: null,
      language: 'en',
      theme: 'light',
      privacy_profile_public: true,
      privacy_show_email: false,
      accessibility_font_size: 'medium',
      accessibility_reduce_motion: false,
      accessibility_high_contrast: false,
    }

    const { data: newProfile, error: upsertError } = await getProfilesTable()
      .upsert(payload, { onConflict: 'user_id' })
      .select('*')
      .single()

    if (upsertError) throw upsertError

    const normalized = normalizeProfile(newProfile, currentUser)
    setProfile(normalized)
    return normalized
  }

  const loadProfileSafely = async (currentUser: User) => {
    try {
      await fetchProfile(currentUser)
    } catch {
      setProfile(null)
    }
  }

  const refreshProfile = async () => {
    if (!user) return

    try {
      return await fetchProfile(user)
    } catch {
      setProfile(null)
      return
    }
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return

    const { data, error } = await getProfilesTable()
      .update(updates)
      .eq('user_id', user.id)
      .select('*')
      .single()

    if (error) throw error
    setProfile(normalizeProfile(data, user))
  }

  const updateEmail = async (newEmail: string) => {
    const { error } = await supabase.auth.updateUser({ email: newEmail })
    if (error) throw error

    if (user) {
      await getProfilesTable().update({ email: newEmail }).eq('user_id', user.id)
      await refreshProfile()
    }
  }

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  }

  const resetPasswordForEmail = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) throw error
  }

  useEffect(() => {
    let mounted = true

    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        const currentSession = data.session

        if (!mounted) return

        setSession(currentSession)
        setUser(currentSession?.user ?? null)

        if (currentSession?.user) {
          await loadProfileSafely(currentSession.user)
        } else {
          setProfile(null)
        }
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    void init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return

      setSession(nextSession)
      setUser(nextSession?.user ?? null)

      if (nextSession?.user) {
        loadProfileSafely(nextSession.user).catch(() => {})
      } else {
        setProfile(null)
      }

      setIsLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string, expectedRole?: UserRole) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      const msg = error.message.toLowerCase()

      if (msg.includes('invalid login credentials')) {
        throw new Error('Incorrect email or password')
      }

      if (msg.includes('email not confirmed')) {
        throw new Error('Please verify your email before logging in')
      }

      throw new Error(error.message || 'Unable to log in right now')
    }

    const currentUser = data.user

    if (!currentUser) {
      throw new Error('Unable to complete login')
    }

    if (!currentUser.email_confirmed_at) {
      await supabase.auth.signOut()
      throw new Error('Please verify your email before logging in')
    }

    const currentProfile = await fetchProfile(currentUser)

    if (currentProfile?.role === 'admin') {
      await supabase.auth.signOut()
      throw new Error('Admin accounts are managed only through Supabase')
    }

    if (expectedRole === 'admin') {
      await supabase.auth.signOut()
      throw new Error('Admin login is not available on the website')
    }

    if (expectedRole && currentProfile?.role !== expectedRole) {
      await supabase.auth.signOut()
      throw new Error(`This account is not allowed to enter the ${expectedRole} portal`)
    }

    return currentProfile
  }

  const register = async (
    email: string,
    password: string,
    name: string,
    role: UserRole
  ): Promise<RegisterResult> => {
    if (role === 'admin') {
      throw new Error('Admin accounts cannot be created from the website')
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role,
        },
      },
    })

    if (error) {
      const msg = error.message.toLowerCase()

      if (msg.includes('user already registered')) return 'existing'
      if (msg.includes('already registered')) return 'existing'

      if (msg.includes('password')) {
        throw new Error('Password does not meet security requirements')
      }

      if (msg.includes('email')) {
        throw new Error('Please enter a valid email address')
      }

      throw new Error(error.message || 'Unable to create account right now')
    }

    const identitiesCount = data.user?.identities?.length ?? 0

    if (identitiesCount === 0) {
      if (data.session) await supabase.auth.signOut()
      return 'existing'
    }

    const userId = data.user?.id

    if (userId) {
      const payload = {
        user_id: userId,
        name,
        email,
        role,
        bio: '',
        avatar_url: null,
        major: null,
        year: null,
        phone: null,
        location: null,
        linkedin_url: null,
        website_url: null,
        language: 'en',
        theme: 'light',
        privacy_profile_public: true,
        privacy_show_email: false,
        accessibility_font_size: 'medium',
        accessibility_reduce_motion: false,
        accessibility_high_contrast: false,
      }

      await getProfilesTable().upsert(payload, {
        onConflict: 'user_id',
      })
    }

    if (data.session) {
      await supabase.auth.signOut()
    }

    return 'created'
  }

  const logout = async () => {
    try {
      await supabase.auth.signOut()
    } finally {
      setUser(null)
      setSession(null)
      setProfile(null)
      window.location.href = '/auth'
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        isAuthenticated: !!session,
        login,
        register,
        logout,
        refreshProfile,
        updateProfile,
        updateEmail,
        updatePassword,
        resetPasswordForEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}