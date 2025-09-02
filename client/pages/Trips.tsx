import Layout from "@/components/app/Layout";

export default function Trips() {
  return (
    <Layout>
      <div className="px-4 pt-6">
        <h1 className="text-2xl font-bold">Your Trips</h1>
        <p className="mt-2 text-neutral-600">
          No trips yet. Request your first ride from the Home tab.
        </p>
      </div>
    </Layout>
  );
}
