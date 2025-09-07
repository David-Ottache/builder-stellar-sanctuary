import React, { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type Gender = "Male" | "Female" | "Other" | "";

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  countryCode: string;
  gender: Gender;
  location: string;
  profilePhoto?: string; // data URL
  driverLicenseNumber?: string;
  driverLicensePhoto?: string; // data URL
  identificationNumber?: string;
  identificationPhoto?: string; // data URL
  vehicleType?: string;
  password?: string;
  role?: 'driver' | 'user';
}

export interface DriverInfo {
  id: string;
  name: string;
  rating: number;
  rides: number;
  etaMin: number;
  distanceKm: number;
  price: number;
  passengers: number;
  avatar: string;
  // optional fields coming from onboarding
  driverLicenseNumber?: string;
  driverLicensePhoto?: string;
  vehicleType?: string;
}

export interface TripDetails {
  pickup: string;
  destination: string;
  fee: number;
  driverId: string | null;
}

export interface Coords { lat: number; lng: number }
export interface PendingTrip { pickup: string; destination: string; pickupCoords?: Coords | null; destinationCoords?: Coords | null; vehicle?: 'go' | 'comfort' | 'xl' }

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship?: string;
}

interface StoreState {
  user: UserProfile | null;
  setUser: (u: UserProfile | null) => void;
  onboarding: Partial<UserProfile>;
  setOnboarding: (updates: Partial<UserProfile>) => void;
  drivers: DriverInfo[];
  selectedDriverId: string | null;
  selectDriver: (id: string | null) => void;
  upsertDriver: (d: Partial<DriverInfo> & { id: string }) => void;
  mergeOnboardingToDriver: (updates?: Partial<UserProfile>) => void;
  trip: TripDetails | null;
  startTrip: (t: Omit<TripDetails, "fee"> & { fee?: number }) => void;
  endTrip: () => void;
  pendingTrip: PendingTrip | null;
  setPendingTrip: (p: PendingTrip | null) => void;
  contacts: EmergencyContact[];
  addContact: (c: Omit<EmergencyContact, "id">) => void;
  removeContact: (id: string) => void;
  sendSOS: (message?: string) => number;
  verifyDriver: (codeOrId: string) => DriverInfo | null;
}

const AppStore = createContext<StoreState | null>(null);

const MOCK_DRIVERS: DriverInfo[] = [
  {
    id: "d1",
    name: "John Doe",
    rating: 4.7,
    rides: 70,
    etaMin: 10,
    distanceKm: 7,
    price: 50,
    passengers: 2,
    avatar: "https://i.pravatar.cc/80?img=3",
  },
  {
    id: "d2",
    name: "Akondu",
    rating: 4.5,
    rides: 110,
    etaMin: 7,
    distanceKm: 7,
    price: 30,
    passengers: 1,
    avatar: "https://i.pravatar.cc/80?img=14",
  },
  {
    id: "d3",
    name: "John Doe",
    rating: 4.8,
    rides: 30,
    etaMin: 15,
    distanceKm: 12,
    price: 25,
    passengers: 1,
    avatar: "https://i.pravatar.cc/80?img=8",
  },
];

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const raw = sessionStorage.getItem('session.user');
      if (!raw) return null;
      const parsed = JSON.parse(raw) as any;
      if (parsed && (parsed.walletBalance === undefined || parsed.walletBalance === null)) {
        parsed.walletBalance = 10000;
        try { sessionStorage.setItem('session.user', JSON.stringify(parsed)); } catch {}
      }
      return parsed as UserProfile;
    } catch {
      return null;
    }
  });
  const [onboarding, setOnboardingState] = useState<Partial<UserProfile>>({ countryCode: "+234" });
  const [selectedDriverId, selectDriver] = useState<string | null>(null);
  const [trip, setTrip] = useState<TripDetails | null>(null);
  const [contacts, setContacts] = useState<EmergencyContact[]>(() => {
    try {
      const raw = localStorage.getItem("safety.contacts");
      return raw ? (JSON.parse(raw) as EmergencyContact[]) : [];
    } catch {
      return [];
    }
  });
  const [pendingTrip, setPendingTrip] = useState<PendingTrip | null>(() => {
    try {
      const raw = sessionStorage.getItem("ride.pending");
      return raw ? (JSON.parse(raw) as PendingTrip) : null;
    } catch {
      return null;
    }
  });

  const [drivers, setDrivers] = useState<DriverInfo[]>(MOCK_DRIVERS);

  const setOnboarding = (updates: Partial<UserProfile>) =>
    setOnboardingState((prev) => ({ ...prev, ...updates }));

  const upsertDriver: StoreState['upsertDriver'] = (d) => {
    setDrivers((prev) => {
      const exists = prev.find((p) => p.id === d.id);
      if (exists) {
        return prev.map((p) => (p.id === d.id ? { ...p, ...d } as DriverInfo : p));
      }
      // fill missing fields with defaults
      const newDriver: DriverInfo = {
        id: d.id,
        name: (d.name as string) || 'Unknown',
        rating: (d.rating as number) || 0,
        rides: (d.rides as number) || 0,
        etaMin: (d.etaMin as number) || 0,
        distanceKm: (d.distanceKm as number) || 0,
        price: (d.price as number) || 0,
        passengers: (d.passengers as number) || 1,
        avatar: d.avatar || 'https://i.pravatar.cc/80',
      };
      return [newDriver, ...prev];
    });
  };

  const mergeOnboardingToDriver: StoreState['mergeOnboardingToDriver'] = (updates) => {
    const payload = updates ? updates : onboarding;
    if (!payload) return;
    if (!selectedDriverId) return;

    setDrivers((prev) =>
      prev.map((d) => {
        if (d.id !== selectedDriverId) return d;
        const nameParts = [payload.firstName ?? '', payload.lastName ?? ''].map(s => s.trim()).filter(Boolean);
        const newName = nameParts.length ? nameParts.join(' ') : d.name;
        const newAvatar = (payload.profilePhoto as string) || d.avatar;
        const newLicenseNumber = (payload.driverLicenseNumber as string) || d.driverLicenseNumber;
        const newLicensePhoto = (payload.driverLicensePhoto as string) || d.driverLicensePhoto;
        const newVehicleType = (payload.vehicleType as string) || (d as any).vehicleType;
        return {
          ...d,
          name: newName,
          avatar: newAvatar,
          driverLicenseNumber: newLicenseNumber,
          driverLicensePhoto: newLicensePhoto,
          vehicleType: newVehicleType,
        };
      }),
    );
  };

  const startTrip: StoreState["startTrip"] = ({ pickup, destination, driverId, fee }) => {
    const driver = drivers.find((d) => d.id === driverId) || drivers[0];
    const computedFee = fee ?? driver.price;
    setTrip({ pickup, destination, fee: computedFee, driverId: driver.id });
  };

  const endTrip = () => setTrip(null);

  const addContact: StoreState["addContact"] = (c) => {
    const id = `c_${Date.now()}`;
    // optimistic update
    setContacts((prev) => [...prev, { id, ...c }]);

    // persist to server if user available
    (async () => {
      try {
        if (!user) return;
        const origin = window.location.origin;
        const primary = `${origin}/api/users/${user.id}/contacts`;
        const fallback = `${origin}/.netlify/functions/api/users/${user.id}/contacts`;
        let res: Response | null = null;
        try {
          res = await fetch(primary, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) });
        } catch (e) {
          try { res = await fetch(fallback, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) }); } catch { res = null; }
        }
        if (!res) return console.warn('Could not persist contact to server');
        if (!res.ok) return console.warn('Server failed persisting contact', await res.text().catch(()=>''));
        const data = await res.json().catch(()=>null);
        const serverId = data?.id;
        if (serverId) {
          setContacts((prev) => prev.map(item => item.id === id ? { id: serverId, ...(data.contact || item) } : item));
        }
      } catch (e) {
        console.warn('addContact persistence error', e);
      }
    })();
  };
  const removeContact: StoreState["removeContact"] = (id) => {
    // optimistic
    setContacts((prev) => prev.filter((c) => c.id !== id));
    (async () => {
      try {
        if (!user) return;
        const origin = window.location.origin;
        const primary = `${origin}/api/users/${user.id}/contacts/${id}`;
        const fallback = `${origin}/.netlify/functions/api/users/${user.id}/contacts/${id}`;
        try {
          await fetch(primary, { method: 'DELETE' }).catch(async () => { await fetch(fallback, { method: 'DELETE' }).catch(()=>null); });
        } catch (e) {
          console.warn('removeContact persistence error', e);
        }
      } catch (e) {
        console.warn('removeContact error', e);
      }
    })();
  };

  const sendSOS: StoreState["sendSOS"] = (message) => {
    const count = contacts.length;
    // Here you would integrate SMS/Push provider. For now we just log.
    console.warn("SOS sent to contacts", { count, message });
    return count;
  };

  const verifyDriver: StoreState["verifyDriver"] = (codeOrId) => {
    if (!codeOrId) return null;
    const normalized = codeOrId.trim();
    const matchId = normalized.match(/d\d+/i)?.[0]?.toLowerCase();
    const id = matchId || normalized.toLowerCase();
    const found = drivers.find((d) => d.id.toLowerCase() === id);
    return found || null;
  };

  React.useEffect(() => {
    try {
      localStorage.setItem("safety.contacts", JSON.stringify(contacts));
    } catch {}
  }, [contacts]);

  React.useEffect(() => {
    try {
      if (pendingTrip) sessionStorage.setItem("ride.pending", JSON.stringify(pendingTrip));
      else sessionStorage.removeItem("ride.pending");
    } catch {}
  }, [pendingTrip]);

  // persist session user
  React.useEffect(() => {
    try {
      if (user) sessionStorage.setItem('session.user', JSON.stringify(user));
      else sessionStorage.removeItem('session.user');
    } catch {}
  }, [user]);

  // fetch contacts from server when user is present
  React.useEffect(() => {
    (async () => {
      try {
        if (!user) return;
        const origin = window.location.origin;
        const primary = `${origin}/api/users/${user.id}/contacts`;
        const fallback = `${origin}/.netlify/functions/api/users/${user.id}/contacts`;
        let res: Response | null = null;
        try { res = await fetch(primary); } catch (e) { try { res = await fetch(fallback); } catch { res = null; } }
        if (!res || !res.ok) return;
        const data = await res.json().catch(()=>null);
        if (data?.contacts) {
          setContacts(data.contacts.map((c: any) => ({ id: c.id, name: c.name, phone: c.phone, relationship: c.relationship })) as EmergencyContact[]);
        }
      } catch (e) {
        console.warn('Failed fetching contacts for user', e);
      }
    })();
  }, [user]);

  const value: StoreState = {
    user,
    setUser,
    onboarding,
    setOnboarding,
    drivers,
    selectedDriverId,
    selectDriver,
    upsertDriver,
    mergeOnboardingToDriver,
    trip,
    startTrip,
    endTrip,
    pendingTrip,
    setPendingTrip,
    contacts,
    addContact,
    removeContact,
    sendSOS,
    verifyDriver,
  };

  return <AppStore.Provider value={value}>{children}</AppStore.Provider>;
}

export function useAppStore() {
  const ctx = useContext(AppStore);
  if (!ctx) throw new Error("useAppStore must be used within AppStoreProvider");
  return ctx;
}
