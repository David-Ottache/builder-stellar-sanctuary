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

  const drivers = useMemo(() => MOCK_DRIVERS, []);

  const setOnboarding = (updates: Partial<UserProfile>) =>
    setOnboardingState((prev) => ({ ...prev, ...updates }));

  const startTrip: StoreState["startTrip"] = ({ pickup, destination, driverId, fee }) => {
    const driver = drivers.find((d) => d.id === driverId) || drivers[0];
    const computedFee = fee ?? driver.price;
    setTrip({ pickup, destination, fee: computedFee, driverId: driver.id });
  };

  const endTrip = () => setTrip(null);

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
  };

  return <AppStore.Provider value={value}>{children}</AppStore.Provider>;
}

export function useAppStore() {
  const ctx = useContext(AppStore);
  if (!ctx) throw new Error("useAppStore must be used within AppStoreProvider");
  return ctx;
}
