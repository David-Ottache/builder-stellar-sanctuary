import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/app/Layout";
import MapView from "@/components/app/MapView";
import LocationInputs from "@/components/app/LocationInputs";
import { type VehicleId, computeFare } from "@/components/app/VehicleSelector";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";
import Swal from 'sweetalert2';
import { haversineKm } from "@/lib/utils";

export default function Index() {
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [vehicle, setVehicle] = useState<VehicleId>("go");
  const [destinationCoords, setDestinationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [pickMode, setPickMode] = useState<'pickup' | 'destination' | null>(null);
  const navigate = useNavigate();
  const { setPendingTrip, user } = useAppStore();

  // attempt to read current position early so we can show pricing
  useEffect(()=>{
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos)=>{
      setPickupCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    }, ()=>{}, { enableHighAccuracy: false, timeout: 3000 });
  }, []);

  const distanceKm = (pickupCoords && destinationCoords) ? haversineKm(pickupCoords, destinationCoords) : null;

  // When user types a destination, attempt to geocode it (pin on map) using Google Maps Geocoder
  useEffect(() => {
    if (!destination || destination.trim().length === 0) {
      setDestinationCoords(null);
      return;
    }

    let mounted = true;
    const timeout = setTimeout(async () => {
      try {
        const g = (window as any).google;
        if (!g || !g.maps || !g.maps.Geocoder) return;
        const geocoder = new g.maps.Geocoder();
        geocoder.geocode({ address: destination }, (results: any, status: any) => {
          try {
            if (!mounted) return;
            if (status === 'OK' && results && results[0] && results[0].geometry && results[0].geometry.location) {
              const loc = results[0].geometry.location;
              setDestinationCoords({ lat: loc.lat(), lng: loc.lng() });
            }
          } catch (e) { /* ignore geocode parse errors */ }
        });
      } catch (e) {
        // geocoding failed; ignore
      }
    }, 600);

    return () => { mounted = false; clearTimeout(timeout); };
  }, [destination]);


  const handleStart = () => {
    if (!vehicle) { Swal.fire('Missing selection', 'Please choose a vehicle type', 'warning'); return; }
    if (!destination) { Swal.fire('Missing destination', 'Please enter a destination', 'warning'); return; }
    if (!destinationCoords) { Swal.fire('Missing destination', 'Please tap the map to choose a destination', 'warning'); return; }

    // ensure pickup is available (either pinned or current)
    const hasPickup = !!pickupCoords || pickup === 'Current location' || pickup === 'Pinned location';
    if (!hasPickup && navigator.geolocation) {
      // ask user to allow location or set pickup
      return Swal.fire({ title: 'Pickup missing', text: 'Please allow access to your device location or pin a pickup on the map', icon: 'warning', confirmButtonText: 'Use Current Location' }).then((res)=>{
        if (res.isConfirmed) {
          // try to get current position
          navigator.geolocation.getCurrentPosition((pos)=>{
            const pickup = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setPendingTrip({ pickup: 'Current location', destination, pickupCoords: pickup, destinationCoords, vehicle });
            navigate('/user/verify');
          }, ()=>{
            Swal.fire('Location unavailable', 'Unable to access current location. Please pick a location on the map.', 'error');
          }, { enableHighAccuracy: true, timeout: 5000 });
        }
      });
    }

    if (!navigator.geolocation) {
      setPendingTrip({ pickup: 'Unknown location', destination, destinationCoords, vehicle });
      navigate('/user/verify');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const pickup = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPendingTrip({ pickup: 'Current location', destination, pickupCoords: pickup, destinationCoords, vehicle });
        navigate('/user/verify');
      },
      () => {
        setPendingTrip({ pickup: 'Current location', destination, destinationCoords, vehicle });
        navigate('/user/verify');
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  return (
    <Layout className="relative">
      <MapView
        pickupCoords={pickupCoords}
        destinationCoords={destinationCoords}
        hidePickupMarker={!pickupCoords}
        onPick={(c) => {
          // when map is clicked, set coords based on active mode
          if (pickMode === 'pickup') {
            setPickupCoords(c);
            // try reverse geocode
            try {
              const g = (window as any).google;
              if (g && g.maps && g.maps.Geocoder) {
                const geocoder = new g.maps.Geocoder();
                geocoder.geocode({ location: c }, (results:any, status:any) => {
                  try { if (status === 'OK' && results && results[0]) setPickup(results[0].formatted_address || 'Pinned location'); } catch(e){}
                });
              } else {
                setPickup('Pinned location');
              }
            } catch(e) { setPickup('Pinned location'); }
            setPickMode(null);
          } else if (pickMode === 'destination') {
            setDestinationCoords(c);
            try {
              const g = (window as any).google;
              if (g && g.maps && g.maps.Geocoder) {
                const geocoder = new g.maps.Geocoder();
                geocoder.geocode({ location: c }, (results:any, status:any) => {
                  try { if (status === 'OK' && results && results[0]) setDestination(results[0].formatted_address || 'Pinned location'); } catch(e){}
                });
              } else {
                setDestination('Pinned location');
              }
            } catch(e) { setDestination('Pinned location'); }
            setPickMode(null);
          } else {
            // default fallback: set destination
            setDestinationCoords(c);
            setDestination('Pinned location');
          }
        }}
        pickMode={pickMode}
      />

      {user?.role !== 'driver' && (
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
            onPickDestination={() => setPickMode('destination')}
            onUseCurrentLocation={() => {
              if (!navigator.geolocation) { setPickup('Current location'); return; }
              navigator.geolocation.getCurrentPosition((pos)=>{
                setPickupCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setPickup('Current location');
              }, ()=>{ setPickup('Current location'); });
            }}
            className="pointer-events-auto"
          />
        </div>
      )}

      {user?.role !== 'driver' && (
        <div className="absolute bottom-[5.5rem] left-0 right-0 z-20">
          <div className="mx-4 rounded-t-3xl border-t bg-white/95 p-4 pb-4 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-white/75">
            <div className="mb-2 text-sm font-semibold text-neutral-600">Estimated fare</div>
            <div className="text-2xl font-bold">
              {distanceKm && destinationCoords ? `₦${computeFare(distanceKm, 'go').toLocaleString()}` : 'Enter destination to see estimate'}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
