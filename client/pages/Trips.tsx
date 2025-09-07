import Layout from "@/components/app/Layout";
import { useAppStore } from "@/lib/store";
import { useEffect, useState } from "react";

export default function Trips() {
  const { trips, setTrips, user } = useAppStore();
  const [requesterNames, setRequesterNames] = useState<Record<string,string>>({});

  useEffect(()=>{
    (async ()=>{
      try {
        if (!user) return;
        // if driver, fetch trips assigned to driver
        const isDriver = user.role === 'driver' || !!user.vehicleType;
        const endpoint = isDriver ? `/api/trips/driver/${user.id}` : `/api/trips/${user.id}`;
        const res = await fetch(endpoint);
        if (!res.ok) return;
        const data = await res.json().catch(()=>null);
        if (data?.trips) setTrips(data.trips);
        // fetch requester names for driver view
        if (isDriver && data?.trips?.length) {
          const ids = Array.from(new Set(data.trips.map((t:any)=> t.userId).filter(Boolean)));
          const map: Record<string,string> = {};
          await Promise.all(ids.map(async (id)=>{
            try {
              const r = await fetch(`/api/users/${id}`);
              if (!r.ok) return;
              const d = await r.json().catch(()=>null);
              if (d?.user) map[id] = (d.user.firstName ? `${d.user.firstName} ${d.user.lastName || ''}`.trim() : d.user.phone || d.user.email || id);
            } catch(e){}
          }));
          setRequesterNames(map);
        }
      } catch (e) { console.warn('failed fetching trips', e); }
    })();
  }, [user]);

  const endTrip = async (tripId: string) => {
    if (!tripId) return;
    const ok = window.confirm('Are you sure you want to end this trip?');
    if (!ok) return;
    try {
      const res = await fetch(`/api/trips/${tripId}/end`, { method: 'POST' });
      if (!res.ok) {
        const d = await res.json().catch(()=>({}));
        alert(d.error || 'Failed ending trip');
        return;
      }
      const data = await res.json().catch(()=>null);
      if (!data?.trip) {
        alert('Failed updating trip');
        return;
      }
      // update local trips
      setTrips((prev)=> prev.map(t=> t.id === tripId ? data.trip : t));
      alert('Trip ended');
    } catch (e) {
      console.warn('endTrip failed', e);
      alert('Failed ending trip');
    }
  };

  return (
    <Layout>
      <div className="px-4 pt-6">
        <h1 className="text-2xl font-bold">Your Trips</h1>
        {(!trips || trips.length === 0) ? (
          <p className="mt-2 text-neutral-600">No trips yet. Request your first ride from the Home tab.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {trips.map((t) => (
              <div key={t.id} className="rounded-xl border bg-white p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{t.pickup} → {t.destination}</div>
                    <div className="text-xs text-neutral-600">{t.startedAt ? new Date(t.startedAt).toLocaleString() : ''} • {t.status}</div>
                    {t.userId && <div className="text-xs text-neutral-600">Requested by: {requesterNames[t.userId] ?? t.userId}</div>}
                  </div>
                  <div className="font-bold">N{(t.fee || 0).toLocaleString()}</div>
                </div>
                {t.distanceKm != null && <div className="mt-2 text-xs text-neutral-500">Distance: {t.distanceKm.toFixed(2)} km • Type: {t.vehicle}</div>}
                {t.status !== 'completed' && (
                  <div className="mt-3 flex gap-2">
                    <button className="flex-1 rounded-xl bg-red-500 px-3 py-2 text-white" onClick={()=>endTrip(t.id)}>End Trip</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
