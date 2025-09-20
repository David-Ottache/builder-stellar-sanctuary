import Layout from "@/components/app/Layout";
import { useParams, useNavigate } from "react-router-dom";
import { useAppStore } from "@/lib/store";
import { useMemo, useState } from "react";
import MapView from "@/components/app/MapView";
import { Button } from "@/components/ui/button";

export default function DriverDetails() {
  const { id } = useParams();
  const { drivers, startTrip, selectedDriverId, selectDriver } = useAppStore();
  const navigate = useNavigate();
  const [online, setOnline] = useState(true);
  const [incoming, setIncoming] = useState<any | null>({
    id: 'req1',
    pickup: '123 Main St',
    destination: '456 Elm St',
    eta: '15s',
    amount: 1840,
  });

  const driver = useMemo(()=> drivers.find(d=>d.id===id) || drivers[0], [drivers, id]);
  const avatar = driver?.avatar || 'https://cdn.builder.io/api/v1/image/assets%2Ffe9fd683ebc34eeab1db912163811d62%2Fab35a1634e2a43acab653d0184b25d6d?format=webp&width=800';

  const accept = () => {
    if (!driver) return;
    // start trip
    if(!selectedDriverId) selectDriver(driver.id);
    startTrip({ pickup: incoming.pickup, destination: incoming.destination, driverId: driver.id, fee: Math.round(incoming.amount/100) });
    setIncoming(null);
    navigate('/trips');
  };
  const decline = () => { setIncoming(null); };

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
                <div className="text-sm text-neutral-600">Details will show to the rider</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-neutral-500">{incoming.eta}</div>
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
