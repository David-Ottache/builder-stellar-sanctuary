import React from 'react';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import { cachedFetch } from '@/lib/utils';

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill={filled ? '#f59e0b' : 'none'} stroke={filled ? '#f59e0b' : '#d1d5db'} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 .587l3.668 7.431L23.4 9.75l-5.7 5.56L19.336 24 12 19.897 4.664 24l1.636-8.69L.6 9.75l7.732-1.732z" />
    </svg>
  );
}

export default function RatingModal() {
  const { ratingPrompt, closeRatingPrompt, submitRating, drivers } = useAppStore();
  const [stars, setStars] = React.useState<number>(5);
  const [fetchedDriver, setFetchedDriver] = React.useState<any>(null);

  React.useEffect(()=>{
    if (ratingPrompt.open) setStars(5);
  }, [ratingPrompt.open]);

  React.useEffect(()=>{
    (async()=>{
      if (!ratingPrompt.open || !ratingPrompt.driverId) return;
      const local = drivers.find(d=>d.id === ratingPrompt.driverId) || null;
      if (local) { setFetchedDriver(local); return; }
      try {
        const r = await cachedFetch(`/api/drivers/${encodeURIComponent(String(ratingPrompt.driverId))}`);
        if (r && r.ok) {
          const d = await r.json().catch(()=>null);
          const driver = d?.driver || null;
          if (driver) {
            setFetchedDriver({
              id: driver.id || ratingPrompt.driverId,
              name: (`${driver.firstName||''} ${driver.lastName||''}`).trim() || driver.name || 'Driver',
              avatar: driver.avatar || driver.profilePhoto || 'https://i.pravatar.cc/80',
              rides: driver.rides ?? 0,
              rating: driver.rating ?? 0,
            });
          }
        }
      } catch {}
    })();
  }, [ratingPrompt.open, ratingPrompt.driverId, drivers]);

  if (!ratingPrompt.open) return null;
  const driver = (drivers.find(d=>d.id === ratingPrompt.driverId) as any) || fetchedDriver;

  const onSubmit = () => {
    if (!ratingPrompt.driverId) return;
    submitRating(ratingPrompt.driverId, stars);
    toast.success('Thanks for rating the driver');
  };

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={()=>closeRatingPrompt()} />
      <div style={{ background: 'white', borderRadius: 12, padding: 20, minWidth: 320, maxWidth: 420, zIndex: 10000 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <img src={driver?.avatar || 'https://i.pravatar.cc/80'} style={{ width: 56, height: 56, borderRadius: 999 }} />
          <div>
            <div style={{ fontWeight: 700 }}>{driver?.name || 'Driver'}</div>
            <div style={{ fontSize: 12, color: '#666' }}>{(driver?.rides ?? 0)} trips • {(driver?.rating ?? 0)} avg</div>
            {ratingPrompt.tripId ? (
              <div style={{ fontSize: 11, color: '#6b7280' }}>Trip {ratingPrompt.tripId}</div>
            ) : null}
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Rate your ride</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {[1,2,3,4,5].map((s)=> (
              <button key={s} onClick={()=>setStars(s)} style={{ background: 'transparent', border: 'none', padding: 4, borderRadius: 6 }} aria-label={`Rate ${s} star`}>
                <StarIcon filled={s <= stars} />
              </button>
            ))}
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => { closeRatingPrompt(); }} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', background: 'white' }}>Skip</button>
            <button onClick={onSubmit} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: '#0ea5a5', color: 'white' }}>Submit</button>
          </div>
        </div>
      </div>
    </div>
  );
}
