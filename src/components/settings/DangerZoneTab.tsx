"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

export default function DangerZoneTab() {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  async function handleDeleteAccount() {
    if (deleteConfirm !== "DELETE") return;

    try {
      const res = await fetch("/api/delete-account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      });
      if (res.ok) {
        await signOut({ callbackUrl: "/" });
      }
    } catch {
      setDeleteOpen(false);
      setDeleteConfirm("");
    }
  }

  return (
    <>
      <div>
        <div className="border-b border-red-100 px-8 py-6">
          <h2 className="text-lg font-semibold text-red-900">Danger Zone</h2>
          <p className="mt-1 text-sm text-red-700/70">Irreversible and destructive actions. Proceed with caution.</p>
        </div>

        <div className="px-8 py-6">
          <div className="rounded-xl border border-red-200 bg-red-50/40 p-6">
            <div className="flex items-start gap-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-100">
                <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-red-900">Delete Account</h3>
                <p className="mt-1 text-sm text-red-700/70">Once you delete your account, there is no going back. All your data, interviews, recordings, and settings will be permanently removed.</p>
                <button onClick={() => setDeleteOpen(true)} className="mt-4 rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50">
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm" onClick={() => setDeleteOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl" style={{ animation: "fadeSlideIn 0.15s ease-out" }}>
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="text-center text-lg font-semibold text-zinc-900">Delete Account</h3>
            <p className="mt-2 text-center text-sm text-zinc-500">This action is <strong>permanent</strong> and cannot be undone. All your data will be deleted.</p>
            <div className="mt-5">
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">Type <strong>DELETE</strong> to confirm</label>
              <input type="text" value={deleteConfirm} onChange={(event) => setDeleteConfirm(event.target.value)} className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100" />
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => { setDeleteOpen(false); setDeleteConfirm(""); }} className="flex-1 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors">Cancel</button>
              <button onClick={handleDeleteAccount} disabled={deleteConfirm !== "DELETE"} className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">Delete Account</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
