import Layout from "@/components/app/Layout";
import { useAppStore } from "@/lib/store";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function UserVerify() {
  const { pendingTrip, selectDriver } = useAppStore();
  const [code, setCode] = useState("");
  const [result, setResult] = useState<any | null>(null);
  const navigate = useNavigate();

  const check = async (c: string) => {
    if (!c) return setResult(null);
    const origin = window.location.origin;
    const tryUrls = [
      `${origin}/api/users/${c}`,
      `${origin}/.netlify/functions/api/users/${c}`,
      `${origin}/api/drivers/${c}`,
      `${origin}/.netlify/functions/api/drivers/${c}`,
    ];
    for (const url of tryUrls) {
      try {
        const res = await fetch(url);
        if (!res || !res.ok) continue;
        const data = await res.json().catch(()=>null);
        if (data?.user) {
          const u = data.user;
          setResult({ id: u.id, name: `${u.firstName||''} ${u.lastName||''}`.trim() || u.email || u.phone, avatar: u.profilePhoto || 'https://i.pravatar.cc/80', rides: 0, rating: 0 });
          return;
        }
        if (data?.driver) {
          const d = data.driver;
          setResult({ id: d.id, name: `${d.firstName||''} ${d.lastName||''}`.trim() || d.email || d.phone, avatar: d.profilePhoto || 'https://i.pravatar.cc/80', rides: d.rides || 0, rating: d.rating || 0 });
          return;
        }
      } catch (e) {
        console.warn('check url failed', url, e);
      }
    }
    setResult(null);
  };

  return (
    <Layout>
      <div className="px-4 pt-6">
        <h1 className="text-2xl font-bold">Verify User</h1>
        <p className="mt-1 text-sm text-neutral-600">Scan a QR code or enter assigned user ID.</p>

        {pendingTrip && (
          <div className="mt-3 rounded-2xl border bg-white p-4 text-sm">
            <div className="font-semibold">Trip</div>
            <div className="text-neutral-700">Pickup: {pendingTrip.pickup} {pendingTrip.pickupCoords ? `(${pendingTrip.pickupCoords.lat.toFixed(4)}, ${pendingTrip.pickupCoords.lng.toFixed(4)})` : ''}</div>
            <div className="text-neutral-700">Destination: {pendingTrip.destination}</div>
          </div>
        )}

        <div className="mt-4 rounded-2xl border bg-white p-4">
          <div className="relative mx-auto h-44 w-full max-w-xs rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50">
            <div className="absolute inset-6 rounded border-2 border-primary/70" />
            <div className="absolute inset-0 flex items-end justify-center p-3">
              <Button variant="secondary" className="rounded-full" onClick={()=>{ setCode("d2"); check("d2"); }}>Simulate Scan (Akondu)</Button>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <input value={code} onChange={(e)=>setCode(e.target.value)} placeholder="Enter user ID e.g. d1 or QR text" className="flex-1 rounded-xl border bg-neutral-100 px-4 py-3 outline-none focus:bg-white" />
            <Button onClick={()=>check(code)}>Check</Button>
          </div>
        </div>

        {result ? (
          <div className="mt-4 rounded-2xl border bg-white p-4">
            <div className="flex items-center gap-3">
              <img src={result.avatar} className="h-12 w-12 rounded-full object-cover" />
              <div>
                <div className="font-semibold">{result.name}</div>
                <div className="text-xs text-neutral-600">{result.rides} rides • {result.rating} rating</div>
              </div>
            </div>
            <div className="mt-3 text-sm text-green-700">User verified • ID matched</div>
            <Button className="mt-3 w-full rounded-full" onClick={()=>{ upsertDriver({ id: result.id, name: result.name, avatar: result.avatar, rides: result.rides, rating: result.rating }); selectDriver(result.id); navigate(`/user/${result.id}`); }}>Continue</Button>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border bg-white p-4 text-sm text-red-600">No user found for provided code.</div>
        )}
      </div>
    </Layout>
  );
}
