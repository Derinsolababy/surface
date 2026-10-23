import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { api } from '@/lib/api';
import type { LoginCredentials, RegisterPayload, Session, User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  /** True until the persisted session has been read from storage. */
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => {
      const startSession = async (path: string, body: unknown) => {
        set({ error: null });
        try {
          const session = await api.post<Session>(path, body);
          set({ user: session.user, token: session.token, isAuthenticated: true });
        } catch (err) {
          set({ error: (err as Error).message });
          throw err;
        }
      };
      return {
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: true,
        error: null,
        login: (credentials) => startSession('/auth/login', credentials),
        register: (payload) => startSession('/auth/register', payload),
        logout: () => set({ user: null, token: null, isAuthenticated: false }),
        setUser: (user) => set({ user }),
        clearError: () => set({ error: null }),
      };
    },
    {
      name: 'stellarpos.session',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ user, token, isAuthenticated }) => ({ user, token, isAuthenticated }),
    },
  ),
);

// localStorage is synchronous, so hydration usually finishes inside create()
// above, before useAuthStore exists. Check after creation instead of using
// onRehydrateStorage, which would run too early to update the store.
const finishLoading = () => useAuthStore.setState({ isLoading: false });
if (useAuthStore.persist.hasHydrated()) finishLoading();
else useAuthStore.persist.onFinishHydration(finishLoading);
