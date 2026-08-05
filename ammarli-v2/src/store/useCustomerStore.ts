// ─── Ammarli Customer Store ────────────────────────────────────────────────────
// Manages: orders, draft order, notifications, favorites
// NO driver data here — use useDriverStore

import { create } from 'zustand';
import { api } from '../services/api';

// ── Types ─────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'pending'
  | 'created'
  | 'searching'
  | 'dispatched'
  | 'accepted'
  | 'arrived'
  | 'delivering'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'scheduled';

export interface DriverInfo {
  id?: string | number;
  name: string;
  phone: string;
  plate?: string;
  rating?: string;
  avatarUrl?: string;
}

export interface Order {
  id: string | number;
  type: string;
  status: OrderStatus;
  quantity?: string;
  displayVolume?: string;
  price?: number;
  waterType?: string;
  locationName?: string;
  orderTime?: string;
  location?: { latitude: number; longitude: number };
  orderSummary?: string;
  schedulingInfo?: { date: string; time: string };
  items?: Array<{ brand: string; size: string; qty: number; unitPrice?: number; floor?: number }>;
  cancelReason?: string;
  /** Populated by socket event when a driver accepts the order */
  driverInfo?: DriverInfo;
}

export interface ScheduledDriverInfo {
  name: string;
  rating: string;
  image: string;
  phone: string;
}

export interface ScheduledOrder {
  id: string;
  status: 'pending' | 'accepted';
  title: string;
  schedule: string;
  iconName: any;
  driver?: ScheduledDriverInfo;
}

export interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  type: 'order' | 'promo' | 'driver' | 'schedule';
  isRead: boolean;
}

export interface PromoOffer {
  id: string | number;
  title: string;
  description?: string;
  subtitle?: string;
  icon?: string;
  discountPercent?: number;
  expiresAt?: string;
}

export interface DraftOrder {
  bottledWaterCart: Record<string, { small: number; medium: number; large: number }>;
  tankerDetails: {
    quantity: number;
    hoseLength: string;
    tankLocation: string;
    floorNumber: number;
  };
  location?: { latitude: number; longitude: number; address?: string };
}

// ── Store ─────────────────────────────────────────────────────────────────────

interface CustomerState {
  activeOrder: Order | null;
  pastOrders: Order[];
  scheduledOrders: ScheduledOrder[];
  draftOrder: DraftOrder;
  favorites: Order[];
  promos: PromoOffer[];
  isLoadingPromos: boolean;
  promosError: string | null;
  notifications: Notification[];
  userLocation: { latitude: number; longitude: number; address?: string } | null;
  driverLocation: { latitude: number; longitude: number } | null;

  // ── Order actions ───────────────────────────────────────────────────────────
  setUserLocation: (location: { latitude: number; longitude: number; address?: string } | null) => void;
  setDriverLocation: (location: { latitude: number; longitude: number } | null) => void;
  createOrder: (order: Order) => Promise<void>;
  updateOrder: (update: Partial<Order>) => void;
  cancelOrder: (reason?: string) => Promise<void>;
  completeOrder: () => void;
  scheduleOrder: (order: Order, date: string, time: string) => void;
  acceptScheduledOrder: (id: string, driver: ScheduledDriverInfo) => void;

  // ── Draft order actions ─────────────────────────────────────────────────────
  updateDraftOrder: (draft: Partial<DraftOrder>) => void;
  clearDraftOrder: () => void;

  // ── Favorites ───────────────────────────────────────────────────────────────
  addToFavorites: (order: Order) => void;

  // ── Notifications ───────────────────────────────────────────────────────────
  addNotification: (notification: Omit<Notification, 'id' | 'time' | 'isRead'>) => void;
  markAllNotificationsAsRead: () => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;

  // ── Network actions ─────────────────────────────────────────────────────────
  fetchActiveOrder: () => Promise<void>;
  fetchPastOrders: () => Promise<void>;
  fetchScheduledOrders: () => Promise<void>;
  fetchPromos: () => Promise<void>;
  handleSocketOrderUpdate: (payload: any) => void;
  clearActiveOrderStore: () => void;
  clearStore: () => void;
}

const INITIAL_DRAFT: DraftOrder = {
  bottledWaterCart: {},
  tankerDetails: {
    quantity: 3000,
    hoseLength: 'standard',
    tankLocation: 'ground',
    floorNumber: 0,
  },
};

export const useCustomerStore = create<CustomerState>((set, get) => ({
  activeOrder: null,
  pastOrders: [],
  scheduledOrders: [],
  draftOrder: INITIAL_DRAFT,
  favorites: [],
  promos: [],
  isLoadingPromos: false,
  promosError: null,
  userLocation: null,
  driverLocation: null,
  notifications: [],
  // NOTE: Real notifications are pushed via socket / backend FCM push

  // ── Order actions ───────────────────────────────────────────────────────────
  setUserLocation: (location) => set({ userLocation: location }),
  setDriverLocation: (location) => set({ driverLocation: location }),
  
  clearActiveOrderStore: () => set({ activeOrder: null }),
  clearStore: () => set({
    activeOrder: null,
    pastOrders: [],
    scheduledOrders: [],
    draftOrder: INITIAL_DRAFT,
    favorites: [],
    promos: [],
    isLoadingPromos: false,
    promosError: null,
    userLocation: null,
    driverLocation: null,
    notifications: [],
  }),

  fetchActiveOrder: async () => {
    try {
      const { data } = await api.get('/requests/active');
      if (data) {
        const mappedOrder: Order = {
          id: data.id,
          type: data.type === 'TANKER' ? 'Tanker' : 'Bottled',
          status: data.status.toLowerCase() as OrderStatus,
          quantity: data.quantity?.toString(),
          displayVolume: data.displayVolume,
          price: data.totalPrice || data.subtotal,
          locationName: data.deliveryAddress,
          location: { latitude: data.pickupLat, longitude: data.pickupLng },
          waterType: data.tankerDetails?.waterType,
          items: data.bottledItems,
          driverInfo: data.driver ? {
            id: data.driver.id,
            name: `${data.driver.user?.firstName ?? ''} ${data.driver.user?.lastName ?? ''}`.trim() || data.driver.name || 'السائق',
            phone: data.driver.user?.phone ?? data.driver.phone ?? '',
            plate: data.driver.truckPlate ?? data.driver.plate,
            rating: data.driver.rating?.toString(),
            avatarUrl: data.driver.avatarUrl,
          } : undefined,
        };
        set({ activeOrder: mappedOrder });
      } else {
        set({ activeOrder: null });
      }
    } catch (e) {
      console.log('No active order found or error:', e);
    }
  },

  handleSocketOrderUpdate: (payload: any) => {
    if (!payload) {
      set({ activeOrder: null });
      return;
    }

    const existing = get().activeOrder;

    // Build driverInfo from the socket payload if a driver is assigned
    const isSearching = payload.status === 'SEARCHING';
    const driverInfo: DriverInfo | undefined = isSearching
      ? undefined
      : payload.driver
      ? {
          id:        payload.driver.id,
          name:      `${payload.driver.user?.firstName ?? ''} ${payload.driver.user?.lastName ?? ''}`.trim() || payload.driver.name || 'السائق',
          phone:     payload.driver.user?.phone ?? payload.driver.phone ?? '',
          plate:     payload.driver.truckPlate ?? payload.driver.plate,
          rating:    payload.driver.rating?.toString(),
          avatarUrl: payload.driver.avatarUrl,
        }
      : existing?.driverInfo; // keep previous driverInfo if not re-sent

    const mappedOrder: Order = {
      id:           payload.id,
      type:         payload.type === 'TANKER' ? 'Tanker' : 'Bottled',
      status:       payload.status.toLowerCase() as OrderStatus,
      quantity:     payload.quantity?.toString(),
      displayVolume: payload.displayVolume,
      price:        payload.total || payload.totalPrice || payload.subtotal,
      locationName: payload.deliveryAddress,
      location:     { latitude: payload.pickupLat, longitude: payload.pickupLng },
      waterType:    payload.tankerDetails?.waterType,
      items:        payload.bottledItems,
      driverInfo,
    };

    set({ activeOrder: mappedOrder });
  },

  fetchPastOrders: async () => {
    try {
      const { data } = await api.get('/requests?limit=50&isScheduled=false');
      if (data && data.data) {
        const past = data.data.map((r: any): Order => ({
          id: r.id,
          type: r.type === 'TANKER' ? 'Tanker' : 'Bottled',
          status: r.status.toLowerCase() as OrderStatus,
          quantity: r.quantity?.toString(),
          displayVolume: r.displayVolume,
          price: r.totalPrice || r.subtotal,
          locationName: r.deliveryAddress,
          location: { latitude: r.pickupLat, longitude: r.pickupLng },
          waterType: r.tankerDetails?.waterType,
          items: r.bottledItems,
          cancelReason: r.cancelReason,
          orderTime: r.createdAt ? new Date(r.createdAt).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', month: 'short', day: '2-digit' }) : undefined,
        }));
        set({ pastOrders: past });
      }
    } catch (e) {
      console.log('Failed to fetch past orders:', e);
    }
  },

  fetchScheduledOrders: async () => {
    try {
      const { data } = await api.get('/requests?limit=50&isScheduled=true');
      if (data && data.data) {
        const scheduled = data.data.map((r: any): ScheduledOrder => ({
          id: r.id,
          status: r.status.toLowerCase() === 'scheduled' ? 'pending' : r.status.toLowerCase() as any,
          title: r.type === 'TANKER' ? 'صهريج مياه' : 'مياه معبأة',
          schedule: `(${r.scheduledDate} | ${r.scheduledTime})`,
          iconName: r.type === 'TANKER' ? 'truck-outline' : 'bottle-wine-outline',
          driver: r.driver ? {
            name: `${r.driver.firstName} ${r.driver.lastName}`,
            rating: '4.8',
            image: r.driver.avatarUrl || '',
            phone: r.driver.phone || ''
          } : undefined
        }));
        set({ scheduledOrders: scheduled });
      }
    } catch (e) {
      console.log('Failed to fetch scheduled orders:', e);
    }
  },
  
  fetchPromos: async () => {
    set({ isLoadingPromos: true, promosError: null });
    try {
      const { data } = await api.get('/promos');
      if (data) {
        set({ promos: data, isLoadingPromos: false });
      } else {
        set({ isLoadingPromos: false });
      }
    } catch (e: any) {
      console.log('Failed to fetch promos:', e);
      set({ 
        isLoadingPromos: false, 
        promosError: e.response?.data?.message || 'فشل في جلب العروض' 
      });
    }
  },
  
  createOrder: async (order) => {
    try {
      const isTanker = order.type === 'Tanker' || order.type === 'Well' || order.type === 'Spring' || order.type === 'Ashghal';
      const payload = {
        pickupLat: order.location?.latitude || 0,
        pickupLng: order.location?.longitude || 0,
        deliveryAddress: order.locationName,
        quantity: isTanker 
          ? 1 
          : (order.items?.reduce((sum: number, item: any) => sum + (item.qty || 1), 0) || parseInt(order.quantity || '1', 10)),
        type: isTanker ? 'TANKER' : 'BOTTLED',
        tankerDetails: isTanker ? { 
          waterType: order.waterType || order.type, 
          volume: parseInt(order.quantity || '3000', 10),
          floor: order.items?.[0]?.floor
        } : undefined,
        bottledItems: !isTanker ? order.items : undefined,
        isScheduled: false,
      };
      const res = await api.post('/requests', payload);
      // Update with real ID from backend, but preserve current state in case it updated via socket
      set((s) => ({ 
        activeOrder: s.activeOrder ? { ...s.activeOrder, id: res.data.id } : { ...order, id: res.data.id } 
      }));
    } catch (error: any) {
      console.error('Failed to create order on backend:', error?.response?.data || error);
      throw error;
    }
  },

  updateOrder: (update) =>
    set((s) => ({
      activeOrder: s.activeOrder ? { ...s.activeOrder, ...update } : null,
    })),

  cancelOrder: async (reason) => {
    const activeId = get().activeOrder?.id;
    if (activeId && typeof activeId === 'string') {
      try {
        await api.post(`/requests/${activeId}/cancel`);
      } catch (e) {
        console.error('Failed to cancel on backend:', e);
      }
    }
    set((s) => ({
      pastOrders: s.activeOrder
        ? [{ ...s.activeOrder, status: 'cancelled', cancelReason: reason }, ...s.pastOrders]
        : s.pastOrders,
      activeOrder: null,
    }));
  },

  completeOrder: async () => {
    const activeId = get().activeOrder?.id;
    if (activeId && typeof activeId === 'string') {
      try {
        await api.post(`/requests/${activeId}/complete`);
      } catch (e) {
        console.error('Failed to complete on backend:', e);
      }
    }
    set((s) => ({
      pastOrders: s.activeOrder
        ? [{ ...s.activeOrder, status: 'delivered' }, ...s.pastOrders]
        : s.pastOrders,
      activeOrder: null,
    }));
  },

  scheduleOrder: async (order, date, time) => {
    try {
      const isTanker = order.type === 'Tanker' || order.type === 'Well' || order.type === 'Spring' || order.type === 'Ashghal';
      const payload = {
        pickupLat: order.location?.latitude || 0,
        pickupLng: order.location?.longitude || 0,
        deliveryAddress: order.locationName,
        quantity: isTanker ? 1 : parseInt(order.quantity || '1', 10),
        type: isTanker ? 'TANKER' : 'BOTTLED',
        tankerDetails: isTanker ? { 
          waterType: order.waterType || order.type, 
          volume: parseInt(order.quantity || '3000', 10),
          floor: order.items?.[0]?.floor
        } : undefined,
        bottledItems: !isTanker ? order.items : undefined,
        subtotal: order.price,
        totalPrice: order.price,
        isScheduled: true,
        scheduledDate: date,
        scheduledTime: time,
      };
      await api.post('/requests', payload);
      // Refresh scheduled orders from backend
      get().fetchScheduledOrders();
    } catch (e) {
      console.error('Failed to schedule order:', e);
      throw e;
    }
  },

  acceptScheduledOrder: async (id, driver) => {
    // Real implementation would notify backend driver acceptance
    set((s) => ({
      scheduledOrders: s.scheduledOrders.map((o) =>
        o.id === id ? { ...o, status: 'accepted', driver } : o
      ),
    }));
  },

  // ── Draft order actions ─────────────────────────────────────────────────────
  updateDraftOrder: (draft) =>
    set((s) => ({ draftOrder: { ...s.draftOrder, ...draft } })),

  clearDraftOrder: () => set({ draftOrder: INITIAL_DRAFT }),

  // ── Favorites ───────────────────────────────────────────────────────────────
  addToFavorites: (order) =>
    set((s) => ({ favorites: [order, ...s.favorites] })),

  // ── Notifications ───────────────────────────────────────────────────────────
  addNotification: (noti) => {
    const id = Math.random().toString(36).slice(2, 11);
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    set((s) => ({
      notifications: [{ ...noti, id, time, isRead: false }, ...s.notifications],
    }));
  },

  markAllNotificationsAsRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, isRead: true })),
    })),

  markNotificationRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) => n.id === id ? { ...n, isRead: true } : n),
    })),

  clearNotifications: () => set({ notifications: [] }),
}));
