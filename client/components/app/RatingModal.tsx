import React from 'react';
import { useAppStore } from '@/lib/store';

export default function RatingModal() {
  const { ratingPrompt, closeRatingPrompt, submitRating, drivers } = useAppStore();
  const [stars, setStars] = React.useState<number>(5);

  React.useEffect(()=>{
    if (ratingPrompt.open) setStars(5);
  }, [ratingPrompt.open]);

  if (!ratingPrompt.open) return null;
  const driver = drivers.find(d=>d.id === ratingPrompt.driverId) || null;

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={()=>closeRatingPrompt()} />
      <div style={{ background: 'white', borderRadius: 12, padding: 20, minWidth: 320, maxWidth: 420, zIndex: 10000 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <img src={driver?.avatar || 'https://i.pravatar.cc/80'} style={{ width: 56, height: 56, borderRadius: 999 }} />
          <div>
            <div style={{ fontWeight: 700 }}>{driver?.name || 'Driver'}</div>
            <div style={{ fontSize: 12, color: '#666' }}>{driver?.rides ?? 0} trips • {driver?.rating ?? 0} avg</div>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Rate your ride</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {[1,2,3,4,5].map((s)=> (
              <button key={s} onClick={()=>setStars(s)} style={{ background: s <= stars ? '#f59e0b' : '#e5e7eb', border: 'none', padding: 8, borderRadius: 6, width: 40, height: 40, color: s <= stars ? 'white' : '#111', fontWeight: 700 }}>{s}★</button>
            ))}
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => { closeRatingPrompt(); }} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', background: 'white' }}>Skip</button>
            <button onClick={() => { if (ratingPrompt.driverId) submitRating(ratingPrompt.driverId, stars); }} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: '#0ea5a5', color: 'white' }}>Submit</button>
          </div>
        </div>
      </div>
    </div>
  );
}
