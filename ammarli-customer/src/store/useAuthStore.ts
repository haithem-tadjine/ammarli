// ─── Ammarli Auth Store ────────────────────────────────────────────────────────
// Manages: userRole, userProfile, login flow, logout
// NO customer orders or driver data here — use useCustomerStore / useDriverStore

import { create } from 'zustand';
import { STORAGE_KEYS, storage } from '../utils/storage';
import { api } from '../services/api';

export type UserRole = 'CLIENT' | 'DRIVER' | 'ADMIN';

export interface UserProfile {
  id?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  // Computed convenience getter — used by screens that display a greeting
  name?: string;
  phone: string;
  driverType?: 'BOTTLED' | 'TANKER';
  pushToken?: string;
}

interface AuthState {
  userRole: UserRole | null;
  userProfile: UserProfile | null;
  isHydrated: boolean;
  token: string | null;

  // ── Actions ──────────────────────────────────────────────────────────────────
  login: (phone: string, password: string, role: string) => Promise<void>;
  register: (payload: any) => Promise<void>;
  setUserRole: (role: UserRole) => void;
  updateUserProfile: (profileUpdates: Partial<UserProfile>) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<UserRole | null>;
}

/** Normalise a user object from the backend into a consistent UserProfile shape */
function normaliseProfile(user: any): UserProfile {
  const firstName = user.firstName ?? user.first_name ?? '';
  const lastName  = user.lastName  ?? user.last_name  ?? '';
  return {
    id:         user.id,
    firstName,
    lastName,
    name:       [firstName, lastName].filter(Boolean).join(' ') || user.name || user.phone,
    phone:      user.phone ?? '',
    driverType: user.driverType,
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  userRole: null,
  userProfile: null,
  isHydrated: false,
  token: null,

  setUserRole: (role) => set({ userRole: role }),

  login: async (phone, password, role) => {
    const { data } = await api.post('/auth/phone/login', { phone, password, role });
    const { accessToken, user } = data;
    const profile = normaliseProfile(user);

    await storage.set('AUTH_TOKEN', accessToken);
    await storage.set(STORAGE_KEYS.USER_ROLE, user.role);
    await storage.set(STORAGE_KEYS.USER_PROFILE, profile);

    set({ token: accessToken, userRole: user.role, userProfile: profile });
  },

  register: async (payload) => {
    await api.post('/auth/phone/register', payload);
    // الدخول التلقائي وحفظ البيانات في الهاتف بعد نجاح التسجيل
    await get().login(payload.phone, payload.password, payload.role);
  },

  updateUserProfile: async (profileUpdates) => {
    const currentProfile = get().userProfile || { phone: '' };
    try {
      if (currentProfile.id) {
        await api.patch(`/users/${currentProfile.id}`, profileUpdates);
      }
    } catch (e) {
      console.warn('Failed to update profile on backend:', e);
    }
    const newProfile: UserProfile = { ...currentProfile, ...profileUpdates };
    // Keep computed `name` in sync
    if (profileUpdates.firstName !== undefined || profileUpdates.lastName !== undefined) {
      const fn = newProfile.firstName ?? '';
      const ln = newProfile.lastName  ?? '';
      newProfile.name = [fn, ln].filter(Boolean).join(' ') || newProfile.phone;
    }
    await storage.set(STORAGE_KEYS.USER_PROFILE, newProfile);
    set({ userProfile: newProfile });
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.warn('Logout failed on backend, clearing locally.');
    }
    await storage.remove(STORAGE_KEYS.USER_ROLE);
    await storage.remove(STORAGE_KEYS.USER_PROFILE);
    await storage.remove('AUTH_TOKEN');
    set({ userRole: null, userProfile: null, token: null });

    // Prevent state bleeding across sessions
    import('./useCustomerStore').then((m) => m.useCustomerStore.getState().clearStore());
    import('./useDriverStore').then((m) => m.useDriverStore.getState().clearStore());
  },

  hydrate: async () => {
    try {
      const token   = await storage.get<string>('AUTH_TOKEN');
      const role    = await storage.get<UserRole>(STORAGE_KEYS.USER_ROLE);
      const profile = await storage.get<UserProfile>(STORAGE_KEYS.USER_PROFILE);

      set({ token, userRole: role, userProfile: profile, isHydrated: true });
      return role;
    } catch {
      set({ isHydrated: true });
      return null;
    }
  },
}));
