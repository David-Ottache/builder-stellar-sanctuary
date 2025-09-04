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
}

export interface TripDetails {
  pickup: string;
  destination: string;
  fee: number;
  driverId: string | null;
}

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
  trip: TripDetails | null;
  startTrip: (t: Omit<TripDetails, "fee"> & { fee?: number }) => void;
  endTrip: () => void;
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
  const [user, setUser] = useState<UserProfile | null>(null);
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

  const drivers = useMemo(() => MOCK_DRIVERS, []);

  const setOnboarding = (updates: Partial<UserProfile>) =>
    setOnboardingState((prev) => ({ ...prev, ...updates }));

  const startTrip: StoreState["startTrip"] = ({ pickup, destination, driverId, fee }) => {
    const driver = drivers.find((d) => d.id === driverId) || drivers[0];
    const computedFee = fee ?? driver.price;
    setTrip({ pickup, destination, fee: computedFee, driverId: driver.id });
  };

  const endTrip = () => setTrip(null);

  const addContact: StoreState["addContact"] = (c) => {
    const id = `c_${Date.now()}`;
    setContacts((prev) => [...prev, { id, ...c }]);
  };
  const removeContact: StoreState["removeContact"] = (id) =>
    setContacts((prev) => prev.filter((c) => c.id !== id));

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

  const value: StoreState = {
    user,
    setUser,
    onboarding,
    setOnboarding,
    drivers,
    selectedDriverId,
    selectDriver,
    trip,
    startTrip,
    endTrip,
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
