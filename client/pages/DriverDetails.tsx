import Layout from "@/components/app/Layout";
import { useParams, useNavigate } from "react-router-dom";
import { useAppStore } from "@/lib/store";
import { useMemo, useState, useEffect } from "react";
import MapView from "@/components/app/MapView";
import { Button } from "@/components/ui/button";

export default function DriverDetails() {
  const { id } = useParams();
  const { drivers, startTrip, selectedDriverId, selectDriver } = useAppStore();
  const navigate = useNavigate();
  const [online, setOnline] = useState(true);
  const [incoming, setIncoming] = useState<any | null>(null);

  const driver = useMemo(()=> drivers.find(d=>d.id===id) || drivers[0], [drivers, id]);
  const avatar = driver?.avatar || 'https://cdn.builder.io/api/v1/image/assets%2Ffe9fd683ebc34eeab1db912163811d62%2Fab35a1634e2a43acab653d0184b25d6d?format=webp&width=800';

  useEffect(()=>{
    let iv: number | null = null;
    if (!id || !online) { setIncoming(null); return; }
    const origin = window.location.origin;
    const poll = async () => {
      try {
        const res = await fetch(`${origin}/api/ride-requests?driverId=${encodeURIComponent(String(id))}&status=pending`);
        if (!res.ok) return;
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
    poll();
    iv = window.setInterval(poll, 3000);
    return () => { if (iv) window.clearInterval(iv); };
  }, [id, online]);

  const accept = async () => {
    if (!driver) return;
    try {
      const origin = window.location.origin;
      await fetch(`${origin}/api/ride-requests/${encodeURIComponent(incoming.id)}/accept`, { method: 'POST' }).catch(()=>{});
    } catch {}
    if(!selectedDriverId) selectDriver(driver.id);
    startTrip({ pickup: incoming.pickup, destination: incoming.destination, driverId: driver.id, fee: typeof incoming.fare === 'number' ? incoming.fare : 0 });
    setIncoming(null);
    navigate('/trips');
  };
  const decline = async () => {
    try {
      const origin = window.location.origin;
      await fetch(`${origin}/api/ride-requests/${encodeURIComponent(incoming.id)}/decline`, { method: 'POST' }).catch(()=>{});
    } catch {}
    setIncoming(null);
  };

  return (
    <Layout>
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center text-green-600 font-bold">⚡</div>
            <div className="font-bold text-lg">VoltGo</div>
          </div>
          <div className="h-10 w-10 rounded-full overflow-hidden ring-2 ring-primary/30">
            <img src={avatar} alt="driver" className="h-full w-full object-cover" />
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold">Online</div>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={online} onChange={(e)=>setOnline(e.target.checked)} className="sr-only" />
              <div className={`h-6 w-11 rounded-full ${online ? 'bg-green-500' : 'bg-neutral-200'}`}>
                <div className={`h-5 w-5 rounded-full bg-white shadow transform ${online ? 'translate-x-6' : 'translate-x-0'}`} />
              </div>
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <button className="flex-1 rounded-xl border px-3 py-2 text-sm font-medium hover:bg-neutral-50" onClick={()=>navigate('/trips')}>Trips</button>
            <button className="flex-1 rounded-xl border px-3 py-2 text-sm font-medium hover:bg-neutral-50" onClick={()=>navigate('/wallet')}>Wallet</button>
          </div>
        </div>
      </div>

      <div className="mt-4 h-[60vh]">
        <MapView />
      </div>

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
