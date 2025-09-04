import Layout from "@/components/app/Layout";

export default function Profile() {
  return (
    <Layout>
      <div className="px-4 pt-6">
        <h1 className="text-2xl font-bold">Profile</h1>
        <div className="mt-3 space-y-3">
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="text-sm text-neutral-600">Name</div>
            <div className="mt-1 font-semibold">Alex Rider</div>
          </div>
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="text-sm text-neutral-600">Email</div>
            <div className="mt-1 font-semibold">alex@example.com</div>
          </div>
          <a href="/safety" className="block rounded-2xl border bg-white p-4 text-center font-semibold shadow-sm">Safety & Emergency Contacts</a>
        </div>
      </div>
    </Layout>
  );
}
