import Layout from "@/components/app/Layout";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppStore } from "@/lib/store";

import Swal from 'sweetalert2';

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { setUser } = useAppStore();
  const navigate = useNavigate();

  const doLogin = async () => {
    try {
      const res = await fetch('/api/drivers/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // if account exists but no password set, prompt to choose password
        if (data.error === 'no_password') {
          const { value: newPassword } = await Swal.fire({
            title: 'Set a password',
            input: 'password',
            inputLabel: 'Please set a password for your account',
            inputPlaceholder: 'Enter a password',
            inputAttributes: { maxlength: '50', autocapitalize: 'off', autocorrect: 'off' },
            showCancelButton: true,
          }) as any;
          if (newPassword) {
            // call set-password endpoint
            const r = await fetch('/api/drivers/set-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: newPassword }) });
            if (r.ok) {
              await Swal.fire({ icon: 'success', title: 'Password set', text: 'You can now log in with your password.' });
            } else {
              const dd = await r.json().catch(()=>({}));
              await Swal.fire({ icon: 'error', title: 'Failed', text: dd.error || 'Could not set password' });
            }
          }
        } else {
          await Swal.fire({ icon: 'error', title: 'Login failed', text: data.error || 'Invalid credentials' });
        }
        return;
      }
      const data = await res.json();
      const user = data.user;
      await Swal.fire({ icon: 'success', title: `Welcome ${user.firstName || ''}`, text: 'You are now logged in.' });
      setUser(user);
      navigate('/');
    } catch (e) {
      console.error('Login error', e);
      await Swal.fire({ icon: 'error', title: 'Login failed', text: 'An error occurred.' });
    }
  };

  return (
    <Layout hideTopBar hideBottomNav>
      <div className="mx-4 mt-4 rounded-3xl bg-white p-6 shadow-soft">
        <h1 className="mb-6 text-2xl font-bold">Welcome Back</h1>
        <div className="space-y-3">
          <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Email" className="w-full rounded-xl border bg-neutral-100 px-4 py-3 outline-none focus:bg-white" />
          <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Password" className="w-full rounded-xl border bg-neutral-100 px-4 py-3 outline-none focus:bg-white" />
          <div className="flex items-center justify-between text-xs text-neutral-600">
            <label className="inline-flex items-center gap-2"><input type="checkbox" className="rounded"/> Remember Me</label>
            <Link to="#" className="font-semibold">FORGOT PASSWORD?</Link>
          </div>
          <Button className="h-12 w-full rounded-full" onClick={doLogin}>Login</Button>
          <div className="text-center text-sm">Dont Have An Account? <Link to="/register/name" className="font-semibold">Sign Up</Link></div>
        </div>
      </div>
    </Layout>
  );
}
