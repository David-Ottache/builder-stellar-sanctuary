import React, { useEffect, useMemo, useState } from 'react';

export default function AdminReports() {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(()=>{ (async()=>{ try { const t = await fetch('/api/admin/trips').then(r=>r.ok?r.json():{trips:[]}).catch(()=>({trips:[]})); setTrips(t.trips||[]); } finally { setLoading(false);} })(); },[]);
  const totals = useMemo(()=>({ revenue: trips.reduce((s,t)=> s+Number(t.fee||0),0), count: trips.length }),[trips]);
  return (
    <div>
      <div className="mb-4 text-xl font-bold">Reports</div>
      {loading ? <div className="text-sm text-neutral-600">Loading…</div> : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border bg-white p-4">
            <div className="text-xs text-neutral-600">Total trips</div>
            <div className="text-2xl font-bold">{totals.count.toLocaleString()}</div>
          </div>
          <div className="rounded-2xl border bg-white p-4">
            <div className="text-xs text-neutral-600">Total revenue</div>
            <div className="text-2xl font-bold">₦{totals.revenue.toLocaleString()}</div>
          </div>
        </div>
      )}
    </div>
  );
}
