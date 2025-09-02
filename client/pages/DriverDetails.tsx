import Layout from "@/components/app/Layout";
import { useParams, useNavigate } from "react-router-dom";
import { useAppStore } from "@/lib/store";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

export default function DriverDetails() {
  const { id } = useParams();
  const { drivers, startTrip, selectedDriverId, selectDriver } = useAppStore();
  const [method, setMethod] = useState<'wallet' | 'card'>('wallet');
  const navigate = useNavigate();

  const driver = useMemo(()=> drivers.find(d=>d.id===id) || drivers[0], [drivers, id]);

  return (
    <Layout>
      <div className="px-4 pt-6">
        <div className="flex items-center gap-3">
          <img src={driver.avatar} className="h-16 w-16 rounded-full object-cover" alt={driver.name} />
          <div>
            <div className="text-xl font-bold">{driver.name}</div>
            <div className="text-sm text-neutral-600">{driver.rides} Trips Taken • {driver.rating} Rating</div>
          </div>
        </div>
        <div className="mt-4 rounded-2xl border bg-white p-4">
          <div className="font-semibold">Trip Details</div>
          <div className="mt-2 text-sm text-neutral-700">
            <div>Pick Up Location: Federal Housing, Kuje.</div>
            <div>Destination: Transcorp Hilton</div>
          </div>
        </div>
        <div className="mt-4 rounded-2xl border bg-white p-4">
          <div className="font-semibold">Payment Method</div>
          <div className="mt-3 space-y-2">
            <label className="flex items-center justify-between rounded-xl border p-3"><span>Wallet</span><input type="radio" name="pm" checked={method==='wallet'} onChange={()=>setMethod('wallet')} /></label>
            <label className="flex items-center justify-between rounded-xl border p-3"><span>Master Card</span><input type="radio" name="pm" checked={method==='card'} onChange={()=>setMethod('card')} /></label>
          </div>
          <div className="mt-3 text-right text-sm text-neutral-700">Total Amount <span className="font-bold">N{driver.price * 1000}</span></div>
        </div>
        <div className="mt-4 flex gap-3">
          <Button className="h-12 flex-1 rounded-full" onClick={()=>{ if(!selectedDriverId) selectDriver(driver.id); startTrip({ pickup: 'Federal Housing, Kuje.', destination: 'Transcorp Hilton', driverId: driver.id, fee: driver.price }); navigate('/trip/summary'); }}>Pay</Button>
        </div>
      </div>
    </Layout>
  );
}
