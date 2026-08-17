// ─── Ammarli Driver Store ──────────────────────────────────────────────────────
// Manages: driver profile, status, active order, inventory, financials, trips
// NO customer data here — use useCustomerStore

import { create } from 'zustand';
import { api } from '../services/api';
import * as Location from 'expo-location';
import { useAuthStore } from './useAuthStore';

// ── Types ─────────────────────────────────────────────────────────────────────

export type DriverType = 'Tanker' | 'Bottled';
export type DriverStatus = 'AVAILABLE' | 'BUSY' | 'OFFLINE';
export type DriverOrderStatus = 'pending' | 'accepted' | 'driving' | 'arrived' | 'completed';

export interface RegisteredDriver {
  name: string;
  phone: string;
  password?: string;
  avatarUrl?: string;
  truckPlate: string;
  driverType: DriverType;
  waterType?: string;
  capacity?: number;
  brands?: string[];
  location?: { lat: number; lng: number };
  defaultPrice?: number;
  bottledPrices?: { '0.5L': number; '1.5L': number; '5L': number };
  pricePerUnit?: number;
  floorPrice?: number;
}

export interface DriverOrderItem {
  icon: string;
  description: string;
  detail: string;
  price: number;
  qty?: number;
  unitPrice?: number;
  floor?: string;
}

export interface ActiveDriverOrder {
  orderId: string;
  customer: { name: string; phone: string; avatarUrl?: string };
  deliveryAddress: { label: string; distance: string; lat: number; lng: number };
  driverLat: number;
  driverLng: number;
  items: DriverOrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: DriverOrderStatus;
  createdAt: string;
  tankerDetails?: { waterType?: string; volume?: number; floor?: number };
}

export interface PastTrip {
  id: string;
  date: string;
  time: string;
  orderSummary: string;
  customerName: string;
  deliveryType: string;
  amount: number;
  status: 'Completed' | 'Cancelled';
  cancelReason?: string;
}

export interface DriverTransaction {
  id: string;
  customerName: string;
  date: string;
  amount: number;
}

export interface DriverNotification {
  id: string;
  title: string;
  description: string;
  time: string;
  isRead: boolean;
  type: 'order' | 'schedule' | 'fee' | 'system' | 'wallet';
}

export interface WeeklyStatDay {
  day: string;
  amount: number;
  ordersCount?: number;
}

interface TankerInventory {
  remaining: number;
  total: number;
  waterType: string;
}

interface BottledInventory {
  stock: Record<string, { '0.5L': number; '1.5L': number; '5L': number }>;
}

interface Inventory {
  tanker: TankerInventory;
  bottled: BottledInventory;
}

// ── Store interface ───────────────────────────────────────────────────────────

interface DriverState {
  registeredDriver: RegisteredDriver | null;
  driverStatus: DriverStatus;
  activeDriverOrder: ActiveDriverOrder | null;
  activeDriverOrders: ActiveDriverOrder[];
  incomingOrdersQueue: ActiveDriverOrder[];

  // Financials
  totalEarnings: number;
  walletBalance: number;
  completedTrips: number;
  completedTripsCount: number;
  driverRating: number;
  appCommissionDebt: number;
  isSuspended: boolean;
  transactions: DriverTransaction[];
  weeklyStats: WeeklyStatDay[];
  pastTrips: PastTrip[];
  tripHistory: any[];

  // Inventory
  inventory: Inventory;

  // Notifications
  notifications: DriverNotification[];

  // Connection
  isOnline: boolean;

  // ── Actions ──────────────────────────────────────────────────────────────────
  registerDriver: (driver: RegisteredDriver) => void;
  updateDriverProfile: (name: string, phone: string) => void;
  updatePassword: (newPassword: string) => void;
  fetchDriverProfile: () => Promise<void>;
  fetchPastTrips: () => Promise<void>;
  updateDriverLocation: (lat: number, lng: number) => void;

  markAllNotificationsAsRead: () => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;

  setIsOnline: (val: boolean) => void;
  setDriverStatus: (status: DriverStatus) => void;

  acceptDriverOrder: (order: ActiveDriverOrder) => Promise<void>;
  rejectDriverOrder: (orderId: string) => Promise<void>;
  refuseDriverOrder: (requestId: string) => void;
  updateDriverOrderStatus: (status: DriverOrderStatus, price?: number, orderId?: string) => Promise<void>;
  completeDriverOrder: (quantityLiters?: number, orderId?: string) => Promise<void>;
  cancelDriverOrder: (reason: string) => void;
  addPastTrip: (trip: PastTrip) => void;

  refillStock: (type: 'tanker' | 'bottled', amount?: any) => void;
  setDriverBusy: (isBusy: boolean) => void;
  handleSocketDispatch: (payload: any) => void;
  handleSocketCancel: (orderId?: string) => void;
  shiftIncomingQueue: () => void;
  removeIncomingOrder: (orderId: string) => void;

  // ── Location tracking ──────────────────────────────────────────────────────
  startLocationTracking: () => Promise<void>;
  stopLocationTracking: () => void;
  _locationSubscription: Location.LocationSubscription | null;
  _heartbeatTimer: ReturnType<typeof setInterval> | null;

  completeDelivery: (earnings: number, quantityLiters: number) => void;
  markOrderAsCompleted: (orderData: { orderId: string; price: number; customerName: string }) => void;
  fetchActiveOrder: () => Promise<{ hasActiveOrder: boolean; orderId?: string } >;
  clearStore: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const buildInitialWeeklyStats = (): WeeklyStatDay[] =>
  DAY_LABELS.map((day) => ({ day, amount: 0, ordersCount: 0 }));

const todayIndexInWeek = (): number => {
  const jsDay = new Date().getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
};

const INITIAL_INVENTORY: Inventory = {
  tanker: { remaining: 3000, total: 5000, waterType: 'SPRING WATER' },
  bottled: {
    stock: {
      Ifri: { '0.5L': 25, '1.5L': 15, '5L': 10 },
      Guedila: { '0.5L': 30, '1.5L': 8, '5L': 22 },
      Saida: { '0.5L': 12, '1.5L': 20, '5L': 5 },
      'Lalla Khedidja': { '0.5L': 40, '1.5L': 18, '5L': 3 },
    },
  },
};

// ── Store ─────────────────────────────────────────────────────────────────────

export const useDriverStore = create<DriverState>((set, get) => ({
  registeredDriver: null,
  driverStatus: 'OFFLINE',
  isOnline: false,
  activeDriverOrders: [],
  activeDriverOrder: null,
  incomingOrdersQueue: [],

  totalEarnings: 0,
  walletBalance: 0,
  completedTrips: 0,
  completedTripsCount: 0,
  driverRating: 4.9,
  appCommissionDebt: 0,
  isSuspended: false,
  transactions: [],
  weeklyStats: buildInitialWeeklyStats(),
  pastTrips: [],
  tripHistory: [],

  inventory: INITIAL_INVENTORY,

  notifications: [],
  // NOTE: Real notifications are pushed by backend via FCM/APNs

  // ── Notifications Actions ──────────────────────────────────────────────────
  markAllNotificationsAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
    })),

  markNotificationRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
    })),

  clearNotifications: () => set({ notifications: [] }),
  
  clearStore: () => set({
    registeredDriver: null,
    driverStatus: 'OFFLINE',
    isOnline: false,
    activeDriverOrders: [],
    activeDriverOrder: null,
    incomingOrdersQueue: [],
    totalEarnings: 0,
    walletBalance: 0,
    completedTrips: 0,
    completedTripsCount: 0,
    driverRating: 4.9,
    appCommissionDebt: 0,
    isSuspended: false,
    transactions: [],
    weeklyStats: buildInitialWeeklyStats(),
    pastTrips: [],
    tripHistory: [],
    inventory: INITIAL_INVENTORY,
    notifications: []
  }),

  // ── Profile ────────────────────────────────────────────────────────────────
  registerDriver: (driver) =>
    set({
      registeredDriver: driver,
      driverStatus: 'AVAILABLE',
      totalEarnings: 0,
      walletBalance: 0,
      completedTrips: 0,
      weeklyStats: buildInitialWeeklyStats(),
      inventory: {
        ...INITIAL_INVENTORY,
        tanker: {
          total: driver.capacity || 5000,
          remaining: driver.capacity || 5000,
          waterType: driver.waterType || 'Spring',
        }
      }
    }),

  updateDriverProfile: (name, phone) =>
    set((s) => ({
      registeredDriver: s.registeredDriver
        ? { ...s.registeredDriver, name, phone }
        : null,
    })),

  updatePassword: (newPassword) =>
    set((s) => ({
      registeredDriver: s.registeredDriver
        ? { ...s.registeredDriver, password: newPassword }
        : null,
    })),

  fetchDriverProfile: async () => {
    try {
      const res = await api.get('/drivers/me');
      if (res.data) {
        const d = res.data;
        set({
          registeredDriver: {
            name:          `${d.user?.firstName || ''} ${d.user?.lastName || ''}`.trim() || 'السائق',
            phone:         d.user?.phone || '',
            truckPlate:    d.truckPlate || '',
            capacity:      d.capacity || 5000,
            waterType:     d.waterType || 'spring',
            driverType:    d.type === 'TANKER' ? 'Tanker' : 'Bottled',
            brands:        d.inventory ? Object.keys(d.inventory) : ['Ifri', 'Guedila'],
            location:      { lat: 36.752887, lng: 3.042048 },
            defaultPrice:  d.defaultPrice,
            bottledPrices: d.bottledPrices,
            pricePerUnit:  d.pricePerUnit,
            floorPrice:    d.floorPrice,
          },
        });
      }
    } catch (e) {
      console.error('Failed to fetch driver profile:', e);
    }

    // Also load financial stats if endpoint available
    try {
      const stats = await api.get('/drivers/dashboard');
      if (stats.data) {
        set((s) => {
          const todayIdx = todayIndexInWeek();
          const updatedWeekly = [...s.weeklyStats];
          updatedWeekly[todayIdx] = {
            ...updatedWeekly[todayIdx],
            amount: stats.data.todayEarnings ?? 0,
            ordersCount: stats.data.todayJobs ?? 0
          };

          return {
            totalEarnings:  stats.data.todayEarnings  ?? 0,
            walletBalance:  stats.data.walletBalance   ?? 0,
            completedTrips: stats.data.todayJobs  ?? 0,
            driverRating:   stats.data.rating   ?? 4.9,
            appCommissionDebt:  stats.data.appCommissionDebt ?? 0,
            isSuspended:    stats.data.isSuspended ?? false,
            weeklyStats: updatedWeekly,
          };
        });
      }
    } catch {
      // Stats endpoint may not exist yet — silently skip
    }
  },

  // ── Fetch & Restore Active Order on App Launch ─────────────────────────────
  fetchActiveOrder: async () => {
    try {
      const res = await api.get('/drivers/me/active-order');
      if (res.data && res.data.id) {
        const raw = res.data;
        // Map backend response to ActiveDriverOrder shape
        const restoredOrder: ActiveDriverOrder = {
          orderId:   raw.id,
          status:    raw.status?.toLowerCase() === 'delivering' ? 'driving'
                   : raw.status?.toLowerCase() === 'arrived'    ? 'arrived'
                   : 'accepted',
          customer: {
            name:      raw.user ? `${raw.user.firstName || ''} ${raw.user.lastName || ''}`.trim() : 'الزبون',
            phone:     raw.user?.phone || '',
            avatarUrl: raw.user?.image || '',
          },
          deliveryAddress: {
            label:    raw.deliveryAddress || 'موقع التوصيل',
            distance: raw.distance || '',
            lat:      raw.pickupLat  || 0,
            lng:      raw.pickupLng  || 0,
          },
          items:       raw.bottledItems ? Object.entries(raw.bottledItems).map(([k, v]) => ({ icon: 'package', description: k, detail: k, price: 0, qty: Number(v) })) : [],
          subtotal:    raw.subtotal || raw.totalPrice || 0,
          deliveryFee: raw.appCommission || 0,
          total:       raw.totalPrice || 0,
          status_raw:  raw.status,
          createdAt:   raw.createdAt || new Date().toISOString(),
          tankerDetails: raw.tankerDetails,
        };
        set((state) => {
          const alreadyExists = state.activeDriverOrders.some(o => o.orderId === restoredOrder.orderId);
          if (alreadyExists) return state;
          const newOrders = [restoredOrder];
          return {
            activeDriverOrders: newOrders,
            activeDriverOrder:  newOrders[0],
            driverStatus: 'BUSY',
          };
        });
        return { hasActiveOrder: true, orderId: raw.id };
      }
    } catch (e) {
      console.log('[fetchActiveOrder] No active order or error:', e);
    }
    return { hasActiveOrder: false };
  },

  fetchPastTrips: async () => {
    try {
      // Backend RequestController returns paginated requests. We can map them to PastTrip interface
      const res = await api.get('/requests?limit=20');
      if (res.data?.data) {
        const fetchedTrips: PastTrip[] = res.data.data.map((req: any) => ({
          id: req.id,
          date: new Date(req.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase(),
          time: new Date(req.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          orderSummary: req.bottledItems ? Object.keys(req.bottledItems).join(', ') : 'Delivery',
          customerName: req.user ? `${req.user.firstName} ${req.user.lastName}`.trim() : 'Customer',
          deliveryType: req.type === 'BOTTLED' ? 'Bottled Water' : 'Tanker Delivery',
          amount: req.totalPrice || 0,
          status: req.status === 'CANCELLED' ? 'Cancelled' : 'Completed',
          cancelReason: req.cancelReason
        }));
        set({ pastTrips: fetchedTrips });
      }
    } catch (e) {
      console.error('Failed to fetch past trips:', e);
    }
  },

  updateDriverLocation: async (lat, lng) => {
    // We emit the location over WebSockets instead of an HTTP PATCH
    const { socketService } = await import('../services/socket');
    socketService.emitLocationUpdate(lat, lng);

    set((s) => ({
      registeredDriver: s.registeredDriver
        ? { ...s.registeredDriver, location: { lat, lng } }
        : null,
    }));
  },

  // ── Status ─────────────────────────────────────────────────────────────────
  setIsOnline: (val) => set({ isOnline: val }),
  setDriverStatus: (status) => set({ driverStatus: status }),

  // ── Active Order ──────────────────────────────────────────────────────────
  handleSocketDispatch: (payload: any) => {
    console.log("DRIVER SOCKET PAYLOAD:", JSON.stringify(payload, null, 2));
    const driverLat = get().registeredDriver?.location?.lat || 0;
    const driverLng = get().registeredDriver?.location?.lng || 0;
    
    // Calculate distance
    let distanceStr = '---';
    if (driverLat && driverLng && payload.pickupLat && payload.pickupLng) {
      const R = 6371; 
      const dLat = (payload.pickupLat - driverLat) * Math.PI / 180;  
      const dLon = (payload.pickupLng - driverLng) * Math.PI / 180; 
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(driverLat * Math.PI / 180) * Math.cos(payload.pickupLat * Math.PI / 180) * 
                Math.sin(dLon/2) * Math.sin(dLon/2); 
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
      distanceStr = (R * c).toFixed(1) + ' كم';
    }

    const mappedOrder: ActiveDriverOrder = {
      orderId: payload.id,
      customer: { 
        name: payload.user?.firstName ? `${payload.user.firstName} ${payload.user.lastName || ''}`.trim() : (payload.user?.phone || 'الزبون'),
        phone: payload.user?.phone || ''
      },
      deliveryAddress: { 
        label: payload.deliveryAddress || 'موقع العميل', 
        distance: distanceStr, 
        lat: payload.pickupLat, 
        lng: payload.pickupLng 
      },
      driverLat,
      driverLng,
      items: payload.bottledItems ? Object.values(payload.bottledItems).map((i: any) => ({
        icon: 'droplet',
        description: i.brand,
        detail: i.size,
        qty: i.qty,
        unitPrice: i.unitPrice,
        price: i.unitPrice * i.qty,
        floor: i.floor
      })) : [{ 
        icon: 'droplet', 
        description: payload.tankerDetails?.waterType === 'Well' ? 'مياه آبار' : payload.tankerDetails?.waterType === 'Spring' ? 'مياه ينابيع' : payload.tankerDetails?.waterType === 'Ashghal' ? 'مياه أشغال' : 'صهريج مياه', 
        detail: `${payload.tankerDetails?.volume || payload.quantity} لتر`, 
        qty: payload.tankerDetails?.volume || payload.quantity,
        unitPrice: payload.totalPrice,
        price: payload.totalPrice,
        floor: payload.tankerDetails?.floor
      }],
      subtotal: payload.subtotal || payload.totalPrice,
      deliveryFee: 0,
      total: payload.totalPrice,
      status: 'pending', // Waiting for driver to accept
      createdAt: new Date().toISOString(),
    };
    
    set((state) => {
      // Idempotency: skip if already in queue or if it's in activeDriverOrders
      if (state.activeDriverOrders.some(o => o.orderId === mappedOrder.orderId)) return state;
      if (state.incomingOrdersQueue.some(o => o.orderId === mappedOrder.orderId)) return state;
      return { incomingOrdersQueue: [...state.incomingOrdersQueue, mappedOrder] };
    });
  },

  shiftIncomingQueue: () => {
    set((state) => ({
      incomingOrdersQueue: state.incomingOrdersQueue.slice(1)
    }));
  },

  removeIncomingOrder: (orderId: string) => {
    set((state) => ({
      incomingOrdersQueue: state.incomingOrdersQueue.filter(o => o.orderId !== orderId)
    }));
  },

  handleSocketCancel: (orderId?: string) => {
    set((state) => {
      // If the cancelled order matches the active order, clear it
      if (!orderId || state.activeDriverOrders.some(o => o.orderId === orderId)) {
        const remainingOrders = state.activeDriverOrders.filter(o => o.orderId !== orderId);
        return {
          activeDriverOrders: remainingOrders,
          activeDriverOrder: remainingOrders[0] || null,
          driverStatus: remainingOrders.length > 0 ? state.driverStatus : 'AVAILABLE'
        };
      }
      // Otherwise, just ensure it's removed from the queue
      return {
        incomingOrdersQueue: state.incomingOrdersQueue.filter(o => o.orderId !== orderId)
      };
    });
  },

  acceptDriverOrder: async (order) => {
    try {
      await api.post(`/requests/${order.orderId}/lock`);
      const isRetail = get().registeredDriver?.driverType === 'Bottled' || 
                       (get().registeredDriver?.driverType === 'Tanker' && get().registeredDriver?.waterType === 'spring');
      set((state) => {
        const newOrders = [...state.activeDriverOrders, { ...order, status: 'accepted' as any }];
        return {
          activeDriverOrders: newOrders,
          activeDriverOrder: newOrders[0],
          incomingOrdersQueue: state.incomingOrdersQueue.filter(o => o.orderId !== order.orderId),
          driverStatus: isRetail ? 'AVAILABLE' : 'BUSY',
        };
      });
    } catch (e) { 
      console.error('Failed to accept order:', e); 
      throw e;
    }
  },

  rejectDriverOrder: async (orderId) => {
    try {
      await api.post(`/requests/${orderId}/reject`);
    } catch (e) {
      console.error('Failed to reject order:', e);
    }
    // Instantly remove from queue and clear active driver order if it matches
    set((state) => {
      const remainingOrders = state.activeDriverOrders.filter(o => o.orderId !== orderId);
      const isActiveMatch = state.activeDriverOrders.some(o => o.orderId === orderId);
      return {
        incomingOrdersQueue: state.incomingOrdersQueue.filter(o => o.orderId !== orderId),
        activeDriverOrders: remainingOrders,
        activeDriverOrder: remainingOrders[0] || null,
        driverStatus: isActiveMatch && remainingOrders.length === 0 ? 'AVAILABLE' : state.driverStatus,
      };
    });
  },

  refuseDriverOrder: async (requestId) => {
    try {
      await api.post(`/dispatch/refuse`, { requestId });
    } catch (e) { console.error('Failed to refuse order:', e); }
    // DO NOT clear activeDriverOrder here. The UI will shift the queue, active is only for accepted orders.
  },

  updateDriverOrderStatus: async (status, price?: number, orderId?: string) => {
    const activeId = orderId || get().activeDriverOrder?.orderId;
    let updatedRequest: any = null;
    if (activeId) {
      try {
        if (status === 'arrived') await api.post(`/requests/${activeId}/arrived`);
        if (status === 'driving') {
          const res = await api.post(`/requests/${activeId}/start`, { price });
          if (res.data) {
            updatedRequest = res.data;
          }
        }
      } catch (e: any) {
        console.error('Failed to update order status (arrived/driving):', e?.response?.data || e.message);
        // We catch the error here so it doesn't crash the calling function (handleAccept)
        // This ensures the driver is still navigated to the order-details screen.
      }
    }
    
    set((s) => {
      const activeId = orderId || s.activeDriverOrder?.orderId;
      if (!activeId) return {};
      
      const newOrders = s.activeDriverOrders.map(o => {
        if (o.orderId === activeId) {
          const newSubtotal = updatedRequest?.subtotal ?? (price !== undefined ? price : o.subtotal);
          const newDeliveryFee = updatedRequest?.deliveryFee ?? o.deliveryFee;
          const newTotal = updatedRequest?.totalPrice ?? (price !== undefined ? price : o.total);

          return { 
            ...o, 
            status, 
            subtotal: newSubtotal,
            deliveryFee: newDeliveryFee,
            total: newTotal
          };
        }
        return o;
      });
      
      return {
        activeDriverOrders: newOrders,
        activeDriverOrder: newOrders[0] || null
      };
    });
  },

  completeDriverOrder: async (quantityLiters: number = 0, orderId?: string) => {
    const activeId = orderId || get().activeDriverOrder?.orderId;
    if (!activeId) return;

    try {
      await api.post(`/requests/${activeId}/complete`);
    } catch (e) { console.error('Failed to complete order:', e); }

    set((s) => {
      const targetOrder = s.activeDriverOrders.find(o => o.orderId === activeId);
      if (!targetOrder) return {};

      const earned = targetOrder.total;
      const remainingOrders = s.activeDriverOrders.filter(o => o.orderId !== activeId);
      
      let commission = 0;
      const isBottled = s.registeredDriver?.driverType === 'Bottled';
      const isSpring = s.registeredDriver?.driverType === 'Tanker' && s.registeredDriver?.waterType === 'spring';
      const isWell = s.registeredDriver?.driverType === 'Tanker' && s.registeredDriver?.waterType !== 'spring';
      
      if (isBottled && targetOrder.items) {
        const totalFardeaus = targetOrder.items.reduce((sum, item) => sum + (Number(item.qty) || 1), 0);
        commission = totalFardeaus * 6; // 3 customer + 3 driver
      } else if (isSpring) {
        const capacity = Number(targetOrder.items?.[0]?.qty || 1000);
        commission = (capacity / 20) * 7; // 5 customer + 2 driver
      } else if (isWell) {
        const capacity = Number(targetOrder.items?.[0]?.qty || 1500);
        commission = Math.ceil(capacity / 1500) * 100; // 50 customer + 50 driver
      } else {
        commission = Math.round(earned * 0.1); // Fallback
      }

      const newTrip: PastTrip = {
        id: targetOrder.orderId,
        date: new Date().toLocaleDateString('ar-DZ'),
        time: new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
        orderSummary: targetOrder.items.map((i) => i.description).join(', ') || 'Delivery',
        customerName: targetOrder.customer.name,
        deliveryType: 'Delivery',
        amount: earned,
        status: 'Completed',
      };

      const newTransaction: DriverTransaction = {
        id: targetOrder.orderId,
        customerName: targetOrder.customer.name,
        date: new Date().toLocaleDateString('ar-DZ'),
        amount: earned,
      };

      const todayIdx = todayIndexInWeek();
      const updatedWeekly = s.weeklyStats.map((stat, idx) =>
        idx === todayIdx ? { ...stat, amount: stat.amount + earned, ordersCount: (stat.ordersCount || 0) + 1 } : stat,
      );

      const currentRemaining = s.inventory.tanker.remaining;
      const newRemaining = Math.max(0, currentRemaining - quantityLiters);

      return {
        activeDriverOrders: remainingOrders,
        activeDriverOrder: remainingOrders[0] || null,
        driverStatus: remainingOrders.length > 0 ? s.driverStatus : 'AVAILABLE',
        totalEarnings: s.totalEarnings + earned,
        walletBalance: s.walletBalance + earned,
        appCommissionDebt: s.appCommissionDebt + commission,
        completedTrips: s.completedTrips + 1,
        weeklyStats: updatedWeekly,
        pastTrips: [newTrip, ...s.pastTrips],
        transactions: [newTransaction, ...s.transactions],
        inventory: {
          ...s.inventory,
          tanker: {
            ...s.inventory.tanker,
            remaining: newRemaining
          }
        }
      };
    });

    // ── إعادة تفعيل استقبال الطلبيات الجديدة ───────────────────────────────
    try {
      const { socketService } = await import('../services/socket');
      const driver = useDriverStore.getState().registeredDriver;
      if (driver?.location) {
        socketService.emitLocationUpdate(driver.location.lat, driver.location.lng);
        console.log('[Socket] Location re-sent after order completion — driver back in GeoIndex');
      }
    } catch (e) {
      console.warn('[Socket] Failed to re-register listeners after order completion:', e);
    }
  },

  cancelDriverOrder: async (reason, orderId?: string) => {
    const activeId = orderId || get().activeDriverOrder?.orderId;
    if (activeId) {
      const payload = { reason: reason || 'Driver cancelled due to unforeseen circumstances' };
      console.log('[DEBUG API] Cancelling order with payload:', payload); 
      try {
        await api.post(`/requests/${activeId}/cancel`, payload);
      } catch (e) { console.error('Failed to cancel order:', e); }
    }
    set((s) => {
      const targetOrder = s.activeDriverOrders.find(o => o.orderId === activeId);
      if (!targetOrder) return {};

      const cancelledTrip: PastTrip = {
        id: targetOrder.orderId,
        date: new Date().toLocaleDateString('ar-DZ'),
        time: new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
        orderSummary: targetOrder.items.map((i) => i.description).join(', ') || 'Delivery',
        customerName: targetOrder.customer.name,
        deliveryType: 'Cancelled Delivery',
        amount: 0,
        status: 'Cancelled',
        cancelReason: reason,
      };

      const remainingOrders = s.activeDriverOrders.filter(o => o.orderId !== activeId);
      return {
        pastTrips: [cancelledTrip, ...s.pastTrips],
        activeDriverOrders: remainingOrders,
        activeDriverOrder: remainingOrders[0] || null,
        driverStatus: remainingOrders.length > 0 ? s.driverStatus : 'AVAILABLE'
      };
    });
  },

  addPastTrip: (trip) => set((s) => ({ pastTrips: [trip, ...s.pastTrips] })),

  // ── Inventory ─────────────────────────────────────────────────────────────
  refillStock: async (type, amount) => {
    try {
      await api.post('/drivers/me/inventory/refill', { type, amount });
    } catch (e) { console.error('Failed to refill inventory:', e); }
    set((s) => {
      const inv = s.inventory;
      if (type === 'tanker') {
        return {
          inventory: {
            ...inv,
            tanker: { ...inv.tanker, remaining: inv.tanker.total },
          },
        };
      }
      const { brand = 'Ifri', size = '1.5L', qty = 50 } = amount ?? {};
      const brandStock = inv.bottled.stock[brand] ?? {
        '0.5L': 0,
        '1.5L': 0,
        '5L': 0,
      };
      return {
        inventory: {
          ...inv,
          bottled: {
            stock: {
              ...inv.bottled.stock,
              [brand]: {
                ...brandStock,
                [size]: brandStock[size as keyof typeof brandStock] + qty,
              },
            },
          },
        },
      };
    });
  },

  // ── Trip Flow Management ────────────────────────────────────────────────
  setDriverBusy: (isBusy) => set({ driverStatus: isBusy ? 'BUSY' : 'AVAILABLE' }),

  // ── Location Tracking ──────────────────────────────────────────────────
  _locationSubscription: null,
  _heartbeatTimer: null,

  startLocationTracking: async () => {
    // Avoid double-starting
    if (useDriverStore.getState()._locationSubscription) return;

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('[Location] Permission denied');
      return;
    }

    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,   // emit every 5 s
        distanceInterval: 10, // or when moved 10 m
      },
      async (loc) => {
        const { lat, lng } = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        // Update local store
        useDriverStore.getState().updateDriverLocation(lat, lng);
      }
    );

    useDriverStore.setState({ _locationSubscription: subscription });
    console.log('[Location] Tracking started');

    // ── Socket Connection ──────────────────────────────────────────────────
    const driverId = useAuthStore.getState().userProfile?.id;
    const { socketService } = await import('../services/socket');
    
    if (driverId) {
      // Always disconnect first to ensure clean connection & no duplicate listeners
      if (socketService.socket) {
        socketService.off('dispatch_offer');
        socketService.off('request_cancelled');
        socketService.off('request_locked');
        socketService.disconnect();
      }

      await socketService.connectAsDriver(driverId);
      
      socketService.on('dispatch_offer', (data) => {
        console.log('socket event: dispatch_offer', data);
        useDriverStore.getState().handleSocketDispatch(data);
      });

      socketService.on('sync_suspension', (data) => {
        console.log('socket event: sync_suspension', data);
        if (typeof data?.isSuspended === 'boolean') {
          useDriverStore.setState({ isSuspended: data.isSuspended });
        }
      });

      socketService.on('request_cancelled', (data) => {
        console.log('socket event: request_cancelled', data);
        
        const state = useDriverStore.getState();
        const orderId = data?.id || data?.orderId;
        const isActiveOrder = state.activeDriverOrders.some(o => o.orderId === orderId);
        const isIncomingOrder = state.incomingOrdersQueue.some(o => o.orderId === orderId);

        if (isActiveOrder || isIncomingOrder) {
          // Immediately clear state and navigate so the UI reacts without waiting for the user to press OK
          if (isActiveOrder) {
            useDriverStore.getState().handleSocketCancel(orderId);
          }
          if (isIncomingOrder) {
            useDriverStore.getState().removeIncomingOrder(orderId);
          }
          // Redirect is handled automatically by the order-details.tsx component
          // when activeDriverOrder becomes null.

          // Show the alert purely as an informational message
          import('react-native').then(({ Alert }) => {
            const reasonMsg = data.reason || 'تم إلغاء الطلبية من الطرف الآخر.';
            Alert.alert(
              'تم الإلغاء',
              reasonMsg,
              [{ text: 'حسناً' }]
            );
          });
        }
      });

      socketService.on('request_locked', (data) => {
        console.log('socket event: request_locked', data);
        if (data?.orderId) {
          useDriverStore.getState().removeIncomingOrder(data.orderId);
        }
      });
    }

    // Heartbeat: every 30s, re-send last known location to keep Redis TTL alive
    const heartbeatTimer = setInterval(async () => {
      const driver = useDriverStore.getState().registeredDriver;
      if (driver?.location) {
        const { socketService } = await import('../services/socket');
        socketService.emitLocationUpdate(driver.location.lat, driver.location.lng);
        console.log('[Heartbeat] Sent keepalive location to server');
      }
    }, 30000); // Every 30 seconds

    useDriverStore.setState({ _heartbeatTimer: heartbeatTimer });
  },

  stopLocationTracking: async () => {
    const sub = useDriverStore.getState()._locationSubscription;
    if (sub) {
      try {
        if (typeof sub.remove === 'function') {
          sub.remove();
        }
      } catch (e) {
        console.warn('[Location] Error removing subscription (Web limitation):', e);
      }
      useDriverStore.setState({ _locationSubscription: null });
      console.log('[Location] Tracking stopped');

      // Clear heartbeat timer
      const heartbeat = useDriverStore.getState()._heartbeatTimer;
      if (heartbeat) {
        clearInterval(heartbeat);
        useDriverStore.setState({ _heartbeatTimer: null });
        console.log('[Heartbeat] Stopped');
      }
      
      // Tell backend we are offline and disconnect socket completely
      const { socketService } = await import('../services/socket');
      socketService.emitOffline();
      socketService.disconnect();
    }
  },

  completeDelivery: (earnings, quantityLiters) =>
    set((s) => {
      const newEarnings = s.totalEarnings + earnings;
      const newTrips = s.completedTrips + 1;
      
      // Update inventory (deduct liters)
      const currentRemaining = s.inventory.tanker.remaining;
      const newRemaining = Math.max(0, currentRemaining - quantityLiters);
      
      return {
        totalEarnings: newEarnings,
        completedTrips: newTrips,
        completedTripsCount: newTrips,
        driverStatus: 'AVAILABLE', // Order is done, available again
        inventory: {
          ...s.inventory,
          tanker: {
            ...s.inventory.tanker,
            remaining: newRemaining
          }
        }
      };
    }),

  markOrderAsCompleted: (orderData) =>
    set((s) => {
      const price = orderData.price;
      const now = new Date();

      const timeLabel = now.toLocaleTimeString('ar-DZ', {
        hour: '2-digit',
        minute: '2-digit',
      });

      const newHistoryItem = {
        id: String(Math.floor(Math.random() * 100000)),
        name: orderData.customerName,
        date: `اليوم • ${timeLabel}`,
        amount: price,
      };

      const todayIdx = todayIndexInWeek();
      const updatedWeekly = s.weeklyStats.map((stat, idx) =>
        idx === todayIdx ? { ...stat, amount: stat.amount + price } : stat
      );

      const remainingOrders = s.activeDriverOrders.filter(o => o.orderId !== orderData.orderId);

      return {
        completedTrips: s.completedTrips + price,
        completedTripsCount: s.completedTripsCount + 1,
        activeDriverOrders: remainingOrders,
        activeDriverOrder: remainingOrders[0] || null,
        driverStatus: remainingOrders.length > 0 ? s.driverStatus : 'AVAILABLE',
        tripHistory: [newHistoryItem, ...s.tripHistory],
        weeklyStats: updatedWeekly,
        walletBalance: s.walletBalance + price,
      };
    }),
}));
