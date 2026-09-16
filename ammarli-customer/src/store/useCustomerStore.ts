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
  subtotal?: number;
  deliveryFee?: number;
  waterType?: string;
  locationName?: string;
  orderTime?: string;
  location?: { latitude: number; longitude: number };
  orderSummary?: string;
  schedulingInfo?: { date: string; time: string };
  items?: Array<{ brand: string; size: string; qty: number; unitPrice?: number; floor?: number }>;
  cancelReason?: string;
  tankerDetails?: Record<string, any>;
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
  nearbyDrivers: Array<{ id: string; lat: number; lng: number }> | null;

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
  fetchNearbyDrivers: (lat: number, lng: number, radius?: number) => Promise<void>;
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
  nearbyDrivers: null,
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
    nearbyDrivers: null,
    notifications: [],
  }),

  // ── Fetch actions ─────────────────────────────────────────────────────────

  fetchNearbyDrivers: async (lat, lng, radius = 15) => {
    try {
      const response = await api.get('/drivers/nearby', {
        params: { lat, lng, radius }
      });
      // Assuming response.data is an array of drivers [{ id, lat, lng }, ...] or similar
      const drivers = Array.isArray(response.data) ? response.data : (response.data?.drivers || []);
      
      const parsedDrivers = drivers.map((d: any) => ({
        id: d.id || d.driverId,
        lat: Number(d.lat || d.latitude || 0),
        lng: Number(d.lng || d.longitude || 0),
      })).filter((d: any) => d.lat !== 0 && d.lng !== 0);

      set({ nearbyDrivers: parsedDrivers });
    } catch (e) {
      console.warn('Failed to fetch nearby drivers:', e);
    }
  },

  fetchActiveOrder: async () => {
    try {
      const { data } = await api.get('/requests/active');
      if (data) {
        const existingOrder = get().activeOrder;
        
        // ── Safe Merge for Driver Info ──
        // Ensure we don't wipe out the driver's info (name/phone) if the backend returns a partial driver entity
        let driverInfo = existingOrder?.driverInfo;
        if (data.driver) {
          const fetchedName = `${data.driver.user?.firstName ?? ''} ${data.driver.user?.lastName ?? ''}`.trim() || data.driver.name;
          const fetchedPhone = data.driver.user?.phone ?? data.driver.phone;
          
          driverInfo = {
            id: data.driver.id ?? existingOrder?.driverInfo?.id,
            name: fetchedName || existingOrder?.driverInfo?.name || 'السائق',
            phone: fetchedPhone || existingOrder?.driverInfo?.phone || '',
            plate: data.driver.truckPlate ?? data.driver.plate ?? existingOrder?.driverInfo?.plate,
            rating: data.driver.rating?.toString() ?? existingOrder?.driverInfo?.rating,
            avatarUrl: data.driver.avatarUrl ?? existingOrder?.driverInfo?.avatarUrl,
          };
        }

        const isTanker = (data.type || '').toUpperCase() === 'TANKER' || data.type === 'Well' || data.type === 'Spring' || data.type === 'Ashghal';
        
        // Parse tankerDetails if returned as JSON string
        const rawTankerDetails = data.tankerDetails || existingOrder?.tankerDetails;
        const tankerDetails = typeof rawTankerDetails === 'string'
          ? (() => { try { return JSON.parse(rawTankerDetails); } catch { return null; } })()
          : rawTankerDetails;

        const rawVolume = tankerDetails?.volume || data.volume;
        const existingQtyNum = Number(existingOrder?.quantity);

        // For tanker orders, volume can never be 1L (1 is backend truck count artifact).
        const realVolume = isTanker
          ? (Number(rawVolume) > 1
              ? rawVolume
              : (existingQtyNum > 1 ? existingOrder?.quantity : (Number(data.quantity) > 1 ? data.quantity : 1500)))
          : data.quantity;

        const displayVolume = data.displayVolume
          || (isTanker && realVolume ? `${realVolume} لتر` : undefined)
          || existingOrder?.displayVolume;

        const mappedOrder: Order = {
          id: data.id,
          type: isTanker ? 'Tanker' : 'Bottled',
          status: data.status.toLowerCase() as OrderStatus,
          quantity: realVolume?.toString(),
          displayVolume,
          price: data.totalPrice || data.subtotal,
          subtotal: data.subtotal,
          deliveryFee: data.deliveryFee,
          locationName: data.deliveryAddress,
          location: { latitude: data.pickupLat, longitude: data.pickupLng },
          waterType: tankerDetails?.waterType || data.waterType || existingOrder?.waterType || (isTanker ? data.type : undefined),
          tankerDetails: tankerDetails || existingOrder?.tankerDetails,
          items: data.bottledItems,
          driverInfo,
        };
        set({ activeOrder: mappedOrder });
      } else {
        const currentOrder = get().activeOrder;
        if (currentOrder && ['completed', 'delivered'].includes(currentOrder.status)) {
          // Do not wipe out terminal state so invoice/rating screens keep their data
        } else {
          set({ activeOrder: null });
        }
      }
    } catch (e) {
      console.log('No active order found or error:', e);
    }
  },

  handleSocketOrderUpdate: (payload: any) => {
    if (!payload) {
      const currentOrder = get().activeOrder;
      if (currentOrder && ['completed', 'delivered'].includes(currentOrder.status)) {
        return;
      }
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
          // Resolve phone from all possible payload shapes
          phone:     payload.driver.user?.phone ?? payload.driver.userPhone ?? payload.driver.phone ?? '',
          plate:     payload.driver.truckPlate ?? payload.driver.plate ?? payload.driver.licensePlate,
          rating:    payload.driver.rating?.toString() ?? payload.driver.user?.rating?.toString(),
          avatarUrl: payload.driver.avatarUrl ?? payload.driver.user?.image,
        }
      : existing?.driverInfo; // keep previous driverInfo if not re-sent

    const isTanker = (payload.type || '').toUpperCase() === 'TANKER' || payload.type === 'Well' || payload.type === 'Spring' || payload.type === 'Ashghal';

    // Parse tankerDetails if returned as JSON string
    const rawTankerDetails = payload.tankerDetails || existing?.tankerDetails;
    const tankerDetails = typeof rawTankerDetails === 'string'
      ? (() => { try { return JSON.parse(rawTankerDetails); } catch { return null; } })()
      : rawTankerDetails;

    const rawVolume = tankerDetails?.volume || payload.volume;
    const existingQtyNum = Number(existing?.quantity);

    // For tanker orders, volume can never be 1L (1 is backend truck count artifact).
    // Priority: tankerDetails.volume > existing quantity (set locally) > payload.quantity > 1500 default
    const realVolume = isTanker
      ? (Number(rawVolume) > 1
          ? rawVolume
          : (existingQtyNum > 1
              ? existing?.quantity
              : (Number(payload.quantity) > 1 ? payload.quantity : null)))
      : payload.quantity;

    // Priority for displayVolume: existing local value always wins over re-calculated.
    // This preserves the user-selected quantity (e.g. "3000 لتر") even when the backend
    // socket payload arrives with quantity=1 (truck count artifact).
    const displayVolume = existing?.displayVolume
      || payload.displayVolume
      || (isTanker && realVolume ? `${realVolume} لتر` : undefined)
      || (!isTanker && payload.bottledItems
          ? (() => {
              const items = Array.isArray(payload.bottledItems)
                ? payload.bottledItems
                : Object.values(payload.bottledItems);
              return items.length === 1 ? '1 منتج' : `${items.length} منتجات`;
            })()
          : undefined);

    const mappedOrder: Order = {
      id:           payload.id,
      type:         isTanker ? 'Tanker' : 'Bottled',
      status:       payload.status.toLowerCase() as OrderStatus,
      quantity:     realVolume?.toString(),
      displayVolume,
      price:        payload.total || payload.totalPrice || payload.subtotal,
      subtotal:     payload.subtotal,
      deliveryFee:  payload.deliveryFee,
      locationName: payload.deliveryAddress,
      location:     { latitude: payload.pickupLat, longitude: payload.pickupLng },
      waterType:    tankerDetails?.waterType || payload.waterType || existing?.waterType || (isTanker ? payload.type : undefined),
      tankerDetails: tankerDetails || existing?.tankerDetails,
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
          subtotal: r.subtotal,
          deliveryFee: r.deliveryFee,
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
      
      const activeNow = get().activeOrder;
      if (!activeNow) {
        // User cancelled locally while we were waiting for creation
        try {
          await api.post(`/requests/${res.data.id}/cancel`);
        } catch (e) {
          console.error('Failed to cancel on backend post-creation:', e);
        }
        return;
      }

      // Update with real ID from backend, but preserve current state in case it updated via socket
      set((s) => ({ 
        activeOrder: s.activeOrder ? { 
          ...s.activeOrder, 
          id: res.data.id,
          waterType: s.activeOrder.waterType || order.waterType || order.type,
          displayVolume: s.activeOrder.displayVolume || order.displayVolume || (isTanker ? `${order.quantity} لتر` : undefined),
          quantity: s.activeOrder.quantity || order.quantity,
          tankerDetails: s.activeOrder.tankerDetails || order.tankerDetails,
        } : null 
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
    if (activeId && typeof activeId === 'string' && !activeId.startsWith('local-')) {
      try {
        await api.post(`/requests/${activeId}/cancel`);
        // Successfully cancelled on backend, clear local state
        set((s) => ({
          pastOrders: s.activeOrder
            ? [{ ...s.activeOrder, status: 'cancelled', cancelReason: reason }, ...s.pastOrders]
            : s.pastOrders,
          activeOrder: null,
        }));
      } catch (e) {
        console.error('Failed to cancel on backend:', e);
        throw e; // Propagate error to the UI (cancel-order.tsx) to stop spinner & show Toast
      }
    } else {
      // Local/draft cancellation (no backend call needed)
      set((s) => ({
        pastOrders: s.activeOrder
          ? [{ ...s.activeOrder, status: 'cancelled', cancelReason: reason }, ...s.pastOrders]
          : s.pastOrders,
        activeOrder: null,
      }));
    }
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
