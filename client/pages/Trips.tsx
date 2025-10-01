import Layout from "@/components/app/Layout";
import { useAppStore } from "@/lib/store";
import { useEffect, useState } from "react";
import Swal from 'sweetalert2';

export default function Trips() {
  const { trips, setTrips, user, upsertDriver } = useAppStore();
  const [requesterNames, setRequesterNames] = useState<Record<string,string>>({});
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);

  useEffect(()=>{
    (async ()=>{
      try {
        if (!user) return;
        // if driver, fetch trips assigned to driver
        const isDriver = user.role === 'driver' || !!user.vehicleType;
        const endpoint = isDriver ? `/api/trips/driver/${user.id}` : `/api/trips/${user.id}`;
        const res = await (await import('@/lib/utils')).apiFetch(endpoint);
        if (!res || !res.ok) return;
        const data = await res.json().catch(()=>null);
        if (data?.trips) {
          setTrips(data.trips);
          // synchronize driver rides counts from trip history (aggregate by driverId)
          try {
            const counts: Record<string, number> = {};
            (data.trips || []).forEach((tr:any) => {
              if (tr && tr.driverId) {
                counts[String(tr.driverId)] = (counts[String(tr.driverId)] || 0) + 1;
              }
            });
            Object.keys(counts).forEach((did) => {
              try { upsertDriver({ id: did, rides: counts[did] }); } catch(e){}
            });
          } catch(e) { console.warn('sync driver rides failed', e); }
        }
        // fetch requester names for driver view
        if (isDriver && data?.trips?.length) {
          const ids = Array.from(new Set(data.trips.map((t:any)=> String(t.userId)).filter(Boolean))) as string[];
          const map: Record<string,string> = {};
          await Promise.all(ids.map(async (id)=>{
            try {
              const r = await fetch(`/api/users/${encodeURIComponent(id)}`);
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
    const { isConfirmed } = await Swal.fire({
      title: 'End trip?',
      text: 'Are you sure you want to end this trip?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, end trip',
      cancelButtonText: 'Cancel',
    });
    if (!isConfirmed) return;
    try {
      const res = await fetch(`/api/trips/${tripId}/end`, { method: 'POST' });
      if (!res.ok) {
        const d = await res.json().catch(()=>({}));
        await Swal.fire({ icon: 'error', title: 'Error', text: d.error || 'Failed ending trip' });
        return;
      }
      const data = await res.json().catch(()=>null);
      if (!data?.trip) {
        await Swal.fire('Error', 'Failed updating trip', 'error');
        return;
      }
      // update local trips
      setTrips(trips.map(t=> t.id === tripId ? data.trip : t));
      await Swal.fire('Success', 'Trip ended', 'success');
    } catch (e) {
      console.warn('endTrip failed', e);
      await Swal.fire('Error', 'Failed ending trip', 'error');
    }
  };

  const toggleDetails = (id?: string | null) => setExpandedTripId(prev => prev === id ? null : (id ?? null));

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

                <div className="mt-3 flex items-center justify-start gap-2">
                  <div className="flex gap-2 items-center">
                    <button
                      className="rounded-lg bg-neutral-100 px-3 py-1 text-sm text-neutral-700"
                      onClick={() => toggleDetails(t.id)}
                    >{expandedTripId === t.id ? 'Hide details' : 'View details'}</button>
                    {/* show rating (stars) if available */}
                    {typeof t.rating === 'number' && (
                      <div className="text-sm text-yellow-600 font-semibold">{t.rating} ★</div>
                    )}
                  </div>
                </div>

                {expandedTripId === t.id && (
                  <div className="mt-3 border-t pt-3 text-sm text-neutral-700">
                    <div><strong>Driver:</strong> {t.driverId ?? 'N/A'}</div>
                    <div><strong>Started:</strong> {t.startedAt ? new Date(t.startedAt).toLocaleString() : '—'}</div>
                    <div><strong>Ended:</strong> {t.endedAt ? new Date(t.endedAt).toLocaleString() : '—'}</div>
                    <div><strong>Distance:</strong> {t.distanceKm != null ? `${t.distanceKm.toFixed(2)} km` : '—'}</div>
                    <div><strong>Vehicle:</strong> {t.vehicle ?? '—'}</div>
                    <div><strong>Fee:</strong> N{(t.fee || 0).toLocaleString()}</div>
                    <div><strong>Rating:</strong> {typeof t.rating === 'number' ? `${t.rating} / 5` : 'Not rated'}</div>
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
