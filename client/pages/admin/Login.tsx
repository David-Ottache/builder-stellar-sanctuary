import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/lib/store";
import Layout from "@/components/app/Layout";
import Swal from 'sweetalert2';

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { setUser } = useAppStore();
  const navigate = useNavigate();

  const doLogin = async () => {
    try {
      // Reuse user login endpoint for admin sign-in; access control can be refined server-side
      const res = await fetch('/api/users/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        await Swal.fire({ icon: 'error', title: 'Login failed', text: data.error || 'Invalid credentials' });
        return;
      }
      const data = await res.json();
      const user = data.user;
      await Swal.fire({ icon: 'success', title: `Welcome ${user.firstName || ''}`, text: 'Signed in as admin.' });
      setUser(user);
      navigate('/admin');
    } catch (e) {
      await Swal.fire({ icon: 'error', title: 'Login failed', text: 'An error occurred.' });
    }
  };

  return (
    <Layout hideTopBar hideBottomNav>
      <div className="mx-4 mt-4 rounded-3xl bg-white p-6 shadow-soft">
        <h1 className="mb-6 text-2xl font-bold">Admin Login</h1>
        <div className="space-y-3">
          <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Email" className="w-full rounded-xl border bg-neutral-100 px-4 py-3 outline-none focus:bg-white" />
          <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Password" className="w-full rounded-xl border bg-neutral-100 px-4 py-3 outline-none focus:bg-white" />
          <Button className="h-12 w-full rounded-full" onClick={doLogin}>Login</Button>
        </div>
      </div>
    </Layout>
  );
}
