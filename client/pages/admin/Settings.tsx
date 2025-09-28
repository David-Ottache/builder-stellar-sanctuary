import React from 'react';

export default function AdminSettings() {
  return (
    <div>
      <div className="mb-4 text-xl font-bold">Settings</div>
      <div className="rounded-2xl border bg-white p-4">
        <div className="text-sm text-neutral-700">Configure admin preferences here.</div>
        <ul className="mt-3 list-disc pl-6 text-sm text-neutral-600">
          <li>Theme: Inherits app theme</li>
          <li>Data sources: Server API</li>
          <li>Notifications: Enabled</li>
        </ul>
      </div>
    </div>
  );
}
