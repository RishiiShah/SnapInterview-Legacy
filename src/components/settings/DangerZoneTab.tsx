"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";

export default function DangerZoneTab() {
  const router = useRouter();
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
        await signOut();
        router.push("/");
      }
    } catch {
      setDeleteOpen(false);
      setDeleteConfirm("");
    }
  }

  return (
    <>
      <div>
        <div className="border-b border-rose-500/15 px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
          <h2 className="text-lg font-semibold text-rose-300">Danger Zone</h2>
          <p className="mt-1 text-sm text-rose-300/70">Irreversible and destructive actions. Proceed with caution.</p>
        </div>

        <div className="px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 sm:p-6">
            <div className="flex flex-col items-start gap-4 sm:flex-row">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-rose-500/20 bg-rose-500/15">
                <svg className="h-5 w-5 text-rose-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-rose-200">Delete Account</h3>
                <p className="mt-1 text-sm text-rose-300/70">Once you delete your account, there is no going back. All your data, interviews, recordings, and settings will be permanently removed.</p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setDeleteOpen(true)}
                  className="mt-4 !border-rose-500/30 !bg-transparent !text-rose-300 hover:!bg-rose-500/15 hover:!border-rose-500/40"
                >
                  Delete Account
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-[#070910]/70 backdrop-blur-sm" onClick={() => setDeleteOpen(false)} />
          <div
            className="relative mx-4 w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#12141A] p-5 shadow-2xl sm:p-6"
            style={{ animation: "fadeSlideIn 0.15s ease-out" }}
          >
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border border-rose-500/20 bg-rose-500/15">
              <svg className="h-6 w-6 text-rose-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="text-center text-lg font-semibold text-[#F2F4F8]">Delete Account</h3>
            <p className="mt-2 text-center text-sm text-[#A8B0C2]">
              This action is <strong className="text-[#E8ECF4]">permanent</strong> and cannot be undone. All your data will be deleted.
            </p>
            <div className="mt-5">
              <label className="mb-1.5 block text-sm font-medium text-[#C5CBD8]">
                Type <strong className="text-rose-300">DELETE</strong> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(event) => setDeleteConfirm(event.target.value)}
                className="w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 py-2.5 text-sm text-[#F2F4F8] outline-none transition-all focus:border-rose-500/45 focus:ring-2 focus:ring-rose-500/15"
              />
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button
                variant="secondary"
                className="flex-1 !border-white/[0.1] !bg-white/[0.03] !text-[#C5CBD8] hover:!bg-white/[0.06]"
                onClick={() => {
                  setDeleteOpen(false);
                  setDeleteConfirm("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                className="flex-1 !bg-rose-600 hover:!bg-rose-500"
                onClick={handleDeleteAccount}
                disabled={deleteConfirm !== "DELETE"}
              >
                Delete Account
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
