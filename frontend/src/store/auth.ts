import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  token: string | null
  role: string | null
  userId: string | null
  fullName: string | null
  setAuth: (token: string, role: string, userId: string, fullName?: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      role: null,
      userId: null,
      fullName: null,
      setAuth: (token, role, userId, fullName) => set({ token, role, userId, fullName }),
      logout: () => set({ token: null, role: null, userId: null, fullName: null }),
    }),
    { name: 'rms-auth' }
  )
)
