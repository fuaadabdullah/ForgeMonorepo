import type React from 'react'
import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { getAuthHeaders, getBaseUrl } from '../lib/controlCenter/api'
import {
  DEV_LOGIN_EMAIL,
  DEV_LOGIN_ENABLED,
  DEV_LOGIN_FULL_NAME,
  DEV_LOGIN_PASSWORD,
  DEV_LOGIN_USERNAME,
} from './devLoginConfig'

type User = {
  id: number
  email: string
  username: string
  full_name?: string
  is_active: boolean
}

type AuthContextValue = {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

type AuthProviderProps = {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const persistSession = useCallback((mode: 'api' | 'dev', accessToken: string, profile: User) => {
    setToken(accessToken)
    setUser(profile)
    localStorage.setItem('auth_token', accessToken)
    localStorage.setItem('auth_user', JSON.stringify(profile))
    localStorage.setItem('auth_mode', mode)
  }, [])

  const establishSession = useCallback(
    async (accessToken: string) => {
      const meResponse = await fetch(`${getBaseUrl()}/auth/me`, {
        headers: {
          ...getAuthHeaders(),
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!meResponse.ok) {
        throw new Error('Failed to load profile')
      }

      const profile = (await meResponse.json()) as User
      persistSession('api', accessToken, profile)
    },
    [persistSession]
  )

  useEffect(() => {
    const bootstrapAuth = async () => {
      const storedToken = localStorage.getItem('auth_token')
      const storedUser = localStorage.getItem('auth_user')
      const storedMode = localStorage.getItem('auth_mode')

      if (!storedToken) {
        setIsLoading(false)
        return
      }

      try {
        if (storedMode === 'dev' && storedUser) {
          setUser(JSON.parse(storedUser) as User)
          setToken(storedToken)
          localStorage.setItem('auth_mode', 'dev')
          return
        }

        if (storedUser) {
          setUser(JSON.parse(storedUser) as User)
          setToken(storedToken)
        } else {
          await establishSession(storedToken)
        }
      } catch {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
        localStorage.removeItem('auth_mode')
        setUser(null)
        setToken(null)
      } finally {
        setIsLoading(false)
      }
    }

    bootstrapAuth().catch((error) => {
      console.error('Failed to bootstrap auth session:', error)
    })
  }, [establishSession])

  const login = useCallback(
    async (username: string, password: string) => {
      if (
        DEV_LOGIN_ENABLED &&
        username.trim().toLowerCase() === DEV_LOGIN_USERNAME.trim().toLowerCase() &&
        password === DEV_LOGIN_PASSWORD
      ) {
        const devUser: User = {
          id: -1,
          email: DEV_LOGIN_EMAIL,
          username: DEV_LOGIN_USERNAME,
          full_name: DEV_LOGIN_FULL_NAME,
          is_active: true,
        }
        persistSession('dev', 'dev-token', devUser)
        return
      }

      const response = await fetch(`${getBaseUrl()}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username,
          password,
        }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.detail ?? 'Login failed')
      }

      const { access_token: accessToken } = await response.json()
      await establishSession(accessToken)
    },
    [establishSession, persistSession]
  )

  const logout = useCallback(() => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    localStorage.removeItem('auth_mode')
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: Boolean(user && token),
      login,
      logout,
    }),
    [user, token, isLoading, login, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
