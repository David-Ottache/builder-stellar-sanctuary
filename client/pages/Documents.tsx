import Layout from "@/components/app/Layout";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import { useAppStore } from "@/lib/store";
import { useState } from "react";

function toDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}

export default function Documents() {
  const { onboarding, setOnboarding } = useAppStore();
  const [license, setLicense] = useState(onboarding.driverLicenseNumber || "");
  const [profilePhoto, setProfilePhoto] = useState<string | undefined>(onboarding.profilePhoto);
  const [licensePhoto, setLicensePhoto] = useState<string | undefined>(onboarding.driverLicensePhoto);
  const nav = useNavigate();

  return (
    <Layout hideTopBar hideBottomNav>
      <div className="mx-4 mt-4 rounded-3xl bg-white p-6 shadow-soft">
        <h1 className="text-3xl font-extrabold">Almost There!</h1>
        <p className="mt-1 text-sm text-neutral-600">This Is What Is Needed To Set Up An Account</p>
        <div className="mt-6 space-y-5">
          <div>
            <div className="text-sm font-semibold">Your Profile Photo</div>
            <p className="mb-2 text-xs text-neutral-600">Please Provide A Clear Image Of Yourself(From The Neck Up)</p>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm">
              <input type="file" accept="image/*" className="hidden" onChange={async (e)=>{ const f=e.target.files?.[0]; if(!f) return; const url=await toDataUrl(f); setProfilePhoto(url); }} />
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100">+</span>
              Upload File
            </label>
            {profilePhoto && <img src={profilePhoto} alt="Profile preview" className="mt-2 h-16 w-16 rounded-full object-cover" />}
          </div>
          <div>
            <div className="text-sm font-semibold">Drivers License Number</div>
            <p className="mb-2 text-xs text-neutral-600">Please Add Your Drivers License Number Below</p>
            <input value={license} onChange={(e)=>setLicense(e.target.value)} placeholder="License Number" className="w-full rounded-xl border bg-neutral-100 px-4 py-3 outline-none focus:bg-white" />
          </div>
          <div>
            <div className="text-sm font-semibold">Drivers License</div>
            <p className="mb-2 text-xs text-neutral-600">Please Provide A Clear Drivers License</p>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm">
              <input type="file" accept="image/*" className="hidden" onChange={async (e)=>{ const f=e.target.files?.[0]; if(!f) return; const url=await toDataUrl(f); setLicensePhoto(url); }} />
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100">+</span>
              Upload File
            </label>
            {licensePhoto && <img src={licensePhoto} alt="License preview" className="mt-2 h-16 w-24 rounded object-cover" />}
          </div>
          <Button className="h-12 w-full rounded-full" onClick={()=>{ setOnboarding({ driverLicenseNumber: license, profilePhoto, driverLicensePhoto: licensePhoto }); nav("/wallet"); }}>Next</Button>
          <div className="text-center text-sm">Already Have An Account? <Link to="/login" className="font-semibold">Sign In</Link></div>
        </div>
      </div>
    </Layout>
  );
}
