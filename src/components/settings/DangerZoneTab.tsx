"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";

const DELETE_CONFIRM_PHRASE = "DELETE MY ACCOUNT";

export default function DangerZoneTab() {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  async function handleDeleteAccount() {
    if (deleteConfirm !== DELETE_CONFIRM_PHRASE) return;

    try {
      const res = await fetch("/api/delete-account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: DELETE_CONFIRM_PHRASE }),
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
      <div className="space-y-8">
        <div>
          <h2 className="font-display text-xl tracking-tight text-rose-300">Danger zone</h2>
          <p className="mt-1.5 text-sm text-[#A8B0C2]">
            Irreversible and destructive actions. Proceed with caution.
          </p>
        </div>

        <div className="border-t border-white/[0.06] pt-8">
          <h3 className="text-[15px] font-medium text-[#E8ECF4]">Delete account</h3>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-[#A8B0C2]">
            Once you delete your account, there is no going back. All your data, interviews,
            recordings, and settings will be permanently removed.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setDeleteOpen(true)}
            className="mt-5 !border-rose-500/25 !bg-transparent !text-rose-300 hover:!border-rose-500/40 hover:!bg-rose-500/10"
          >
            Delete account
          </Button>
        </div>
      </div>

      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close dialog"
            className="absolute inset-0 cursor-default bg-transparent"
            onClick={() => {
              setDeleteOpen(false);
              setDeleteConfirm("");
            }}
          />
          <div
            className="relative w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#12141A] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
            style={{ animation: "fadeSlideIn 0.15s ease-out" }}
          >
            <h3 className="font-display text-xl tracking-tight text-[#F2F4F8]">Delete account</h3>
            <p className="mt-2 text-sm text-[#A8B0C2]">
              This action is <strong className="text-[#E8ECF4]">permanent</strong> and cannot be
              undone. All your data will be deleted.
            </p>
            <div className="mt-5">
              <label className="mb-1.5 block text-[12px] font-medium text-[#A8B0C2]">
                Type{" "}
                <strong className="font-mono text-rose-300">{DELETE_CONFIRM_PHRASE}</strong> to
                confirm
              </label>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(event) => setDeleteConfirm(event.target.value)}
                placeholder={DELETE_CONFIRM_PHRASE}
                autoComplete="off"
                spellCheck={false}
                className="w-full border-0 border-b border-white/[0.12] bg-transparent px-0 py-2.5 text-[15px] text-[#F2F4F8] shadow-none outline-none ring-0 placeholder:text-[#6B7385] transition-colors focus:border-[#3B82F6] focus:outline-none focus:ring-0"
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
                disabled={deleteConfirm !== DELETE_CONFIRM_PHRASE}
              >
                Delete account
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
