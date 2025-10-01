import Layout from "@/components/app/Layout";
import { useParams, useNavigate } from "react-router-dom";
import { useAppStore } from "@/lib/store";
import { useMemo, useState, useEffect } from "react";
import MapView from "@/components/app/MapView";
import { apiFetch } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function DriverDetails() {
  const { id } = useParams();
  const { drivers, startTrip, selectedDriverId, selectDriver } = useAppStore();
  const navigate = useNavigate();
  const [online, setOnline] = useState(true);
  const [incoming, setIncoming] = useState<any | null>(null);
  const [assigned, setAssigned] = useState<any[]>([]);

  const driver = useMemo(()=> drivers.find(d=>d.id===id) || drivers[0], [drivers, id]);
  const avatar = driver?.avatar || 'https://cdn.builder.io/api/v1/image/assets%2Ffe9fd683ebc34eeab1db912163811d62%2Fab35a1634e2a43acab653d0184b25d6d?format=webp&width=800';

  useEffect(()=>{
    let iv: number | null = null;
    let iv2: number | null = null;
    if (!id || !online) { setIncoming(null); setAssigned([]); return; }
    const pollRequests = async () => {
      try {
        const res = await apiFetch(`/api/ride-requests?driverId=${encodeURIComponent(String(id))}&status=pending`);
        if (!res || !res.ok) return;
        const data = await res.json().catch(()=>null);
        const list = data?.requests || [];
        if (list.length) {
          const r = list[0];
          setIncoming({ id: r.id, pickup: r.pickup, destination: r.destination, fare: r.fare ?? null });
        } else {
          setIncoming(null);
        }
      } catch (e) { /* ignore */ }
    };
    const pollTrips = async () => {
      try {
        const r = await apiFetch(`/api/trips/driver/${encodeURIComponent(String(id))}`);
        const d = await r?.json().catch(()=>null);
        const items = (d?.trips || []).filter((t:any)=> t && t.status === 'ongoing');
        setAssigned(items);
      } catch {}
    };
    pollRequests();
    pollTrips();
    iv = window.setInterval(pollRequests, 4000);
    iv2 = window.setInterval(pollTrips, 5000);
    return () => { if (iv) window.clearInterval(iv); if (iv2) window.clearInterval(iv2); };
  }, [id, online]);

  const accept = async () => {
    if (!driver) return;
    try {
      await apiFetch(`/api/ride-requests/${encodeURIComponent(incoming.id)}/accept`, { method: 'POST' }).catch(()=>{});
    } catch {}
    if(!selectedDriverId) selectDriver(driver.id);
    startTrip({ pickup: incoming.pickup, destination: incoming.destination, driverId: driver.id, fee: typeof incoming.fare === 'number' ? incoming.fare : 0 });
    setIncoming(null);
    navigate('/trips');
  };
  const decline = async () => {
    try {
      await apiFetch(`/api/ride-requests/${encodeURIComponent(incoming.id)}/decline`, { method: 'POST' }).catch(()=>{});
    } catch {}
    setIncoming(null);
  };

  return (
    <Layout>
      <div className="px-4 pt-4">
      </div>

      <div className="mt-4 h-[60vh]">
        <MapView />
      </div>

      {assigned && assigned.length > 0 && (
        <div className="fixed left-4 right-4 bottom-36 z-40">
          <div className="rounded-2xl bg-white p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Assigned trips</div>
              <Button size="sm" onClick={()=>navigate('/driver/trips')}>View all</Button>
            </div>
            <div className="mt-3 max-h-48 overflow-auto space-y-2">
              {assigned.map((t:any)=> (
                <div key={t.id} className="rounded-xl border p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{t.pickup} → {t.destination}</div>
                    <div className="text-sm font-semibold">₦{Number(t.fee||0).toLocaleString()}</div>
                  </div>
                  <div className="mt-1 text-xs text-neutral-600">{t.startedAt ? new Date(t.startedAt).toLocaleString() : ''} • {t.status}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {incoming && (
        <div className="fixed left-4 right-4 bottom-20 z-40">
          <div className="rounded-2xl bg-white p-4 shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-neutral-500">Incoming ride</div>
                <div className="text-lg font-bold mt-1">New trip request</div>
                <div className="text-sm text-neutral-600">{incoming.pickup} → {incoming.destination}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-neutral-500">now</div>
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <button className="flex-1 rounded-xl bg-green-600 text-white py-3 font-semibold" onClick={accept}>Accept</button>
              <button className="flex-1 rounded-xl bg-neutral-100 py-3 font-semibold" onClick={decline}>Decline</button>
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
}
