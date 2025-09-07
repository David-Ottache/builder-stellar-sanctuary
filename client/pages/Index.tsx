import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/app/Layout";
import MapView from "@/components/app/MapView";
import LocationInputs from "@/components/app/LocationInputs";
import VehicleSelector, { type VehicleId } from "@/components/app/VehicleSelector";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";
import { useState } from "react";
import { haversineKm } from "@/lib/utils";

export default function Index() {
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [vehicle, setVehicle] = useState<VehicleId>("go");
  const [destinationCoords, setDestinationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const navigate = useNavigate();
  const { setPendingTrip } = useAppStore();

  const handleStart = () => {
    if (!destination) { toast.error('Please enter a destination'); return; }
    if (!navigator.geolocation) {
      // if we don't have pickup coords, ask user to allow or fallback
      if (!destinationCoords) { toast.error('Please tap the map to choose a destination'); return; }
      setPendingTrip({ pickup: 'Unknown location', destination, destinationCoords });
      navigate('/user/verify');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const pickupCoords = { lat, lng };
        if (!destinationCoords) { toast.error('Please tap the map to choose a destination'); return; }
        const distance = haversineKm(pickupCoords, destinationCoords);
        setPendingTrip({ pickup: 'Current location', destination, pickupCoords, destinationCoords });
        navigate('/user/verify');
      },
      () => {
        if (!destinationCoords) { toast.error('Please tap the map to choose a destination'); return; }
        setPendingTrip({ pickup: 'Current location', destination, destinationCoords });
        navigate('/user/verify');
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  return (
    <Layout className="relative">
      <MapView pickupCoords={null} destinationCoords={destinationCoords} onPickDestination={(c)=> setDestinationCoords(c)} />

      <div className="pointer-events-none absolute inset-x-4 top-4 z-20">
        <LocationInputs
          pickup={pickup}
          destination={destination}
          setPickup={setPickup}
          setDestination={setDestination}
          onSwap={() => {
            setPickup(destination);
            setDestination(pickup);
          }}
          className="pointer-events-auto"
        />
      </div>

      <div className="absolute bottom-[5.5rem] left-0 right-0 z-20">
        <div className="mx-4 rounded-t-3xl border-t bg-white/95 p-4 pb-4 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-white/75">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold text-neutral-600">Choose your ride</div>
            <div className="text-xs text-neutral-500">Upfront pricing</div>
          </div>
          <VehicleSelector selected={vehicle} onSelect={setVehicle} distanceKm={destinationCoords && pickup ? undefined : undefined} />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-12 rounded-xl">Schedule</Button>
            <Button className="h-12 rounded-xl" onClick={handleStart}>Start Trip</Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
