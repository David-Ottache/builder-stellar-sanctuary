import Layout from "@/components/app/Layout";
import { useAppStore } from "@/lib/store";

export default function Trips() {
  const { trips } = useAppStore();
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
                  </div>
                  <div className="font-bold">N{(t.fee || 0).toLocaleString()}</div>
                </div>
                {t.distanceKm != null && <div className="mt-2 text-xs text-neutral-500">Distance: {t.distanceKm.toFixed(2)} km • Type: {t.vehicle}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
