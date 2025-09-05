import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/app/Layout";
import MapView from "@/components/app/MapView";
import LocationInputs from "@/components/app/LocationInputs";
import VehicleSelector, { type VehicleId } from "@/components/app/VehicleSelector";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";

export default function Index() {
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [vehicle, setVehicle] = useState<VehicleId>("go");
  const navigate = useNavigate();
  const { setPendingTrip } = useAppStore();

  return (
    <Layout className="relative">
      <MapView />

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
          <VehicleSelector selected={vehicle} onSelect={setVehicle} />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-12 rounded-xl">Schedule</Button>
            <Button className="h-12 rounded-xl" onClick={()=>{
              if (!destination) { toast.error('Please enter a destination'); return; }
              if (!navigator.geolocation) {
                setPendingTrip({ pickup: 'Unknown location', destination });
                navigate('/verify');
                return;
              }
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  const { latitude: lat, longitude: lng } = pos.coords;
                  setPendingTrip({ pickup: 'Current location', destination, pickupCoords: { lat, lng } });
                  navigate('/verify');
                },
                () => {
                  setPendingTrip({ pickup: 'Current location', destination });
                  navigate('/verify');
                },
                { enableHighAccuracy: true, timeout: 5000 }
              );
            }}>Start Trip</Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
