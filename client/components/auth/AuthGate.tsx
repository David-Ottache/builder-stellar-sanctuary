import React, { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppStore } from "@/lib/store";

const INACTIVITY_MS = 30 * 60 * 1000; // 30 minutes

const PUBLIC_PATHS = [
  '/splash',
  '/login',
  '/admin/login',
  '/register',
  '/register/name',
  '/register/contact',
  '/register/details',
  '/register/documents',
  '/user/register/name',
  '/user/register/contact',
  '/user/register/details',
  '/user/register/documents',
  '/user/otp',
  '/vehicle',
  '/welcome',
  '/demo',
];

function isPublic(path: string) {
  if (!path) return false;
  for (const p of PUBLIC_PATHS) {
    if (path === p) return true;
    if (path.startsWith(p + '/')) return true;
  }
  return false;
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, setUser } = useAppStore();
  const location = useLocation();
  const navigate = useNavigate();
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    // On mount, if there's no authenticated user and route is protected, redirect to /splash
    if (!user && !isPublic(location.pathname)) {
      navigate('/splash');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // When route changes, if user is missing and route is protected, go to splash
    if (!user && !isPublic(location.pathname)) {
      navigate('/splash');
    }
    // if user is present and currently on splash or login, redirect to home
    if (user && (location.pathname === '/splash' || location.pathname === '/login' || location.pathname === '/welcome')) {
      navigate('/');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, user]);

  useEffect(() => {
    let last = Date.now();
    try {
      const raw = sessionStorage.getItem('session.lastActivity');
      if (raw) {
        const parsed = Number(raw);
        if (!Number.isNaN(parsed)) last = parsed;
      }
    } catch (e) {}

    const reset = () => {
      last = Date.now();
      try { sessionStorage.setItem('session.lastActivity', String(last)); } catch (e) {}
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(() => {
        // expire session
        try {
          setUser(null);
        } catch (e) {}
        try { sessionStorage.removeItem('session.user'); } catch (e) {}
        try { sessionStorage.removeItem('session.lastActivity'); } catch (e) {}
        navigate('/splash');
      }, INACTIVITY_MS);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'click', 'scroll'];
    for (const ev of events) window.addEventListener(ev, reset, { passive: true });
    // initialize timer
    reset();

    return () => {
      for (const ev of events) window.removeEventListener(ev, reset as any);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return <>{children}</>;
}
