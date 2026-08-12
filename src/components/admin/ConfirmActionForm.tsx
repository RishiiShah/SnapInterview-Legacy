"use client";

import { useRef, useState, useTransition } from "react";

import DeleteConfirmationModal from "@/components/ui/DeleteConfirmationModal";
import { Input } from "@/components/ui/Input";
import { cn } from "@/utils/helpers";
import { adminInputOverrideClass } from "./admin-styles";

type ConfirmActionFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  hiddenFields: Record<string, string | number>;
  buttonLabel: string;
  buttonClassName: string;
  confirmMessage: string;
  reasonPrompt?: string;
  reasonRequired?: boolean;
};

export function ConfirmActionForm({
  action,
  hiddenFields,
  buttonLabel,
  buttonClassName,
  confirmMessage,
  reasonPrompt,
  reasonRequired = false,
}: ConfirmActionFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const reasonRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [isSubmitting, startTransition] = useTransition();

  function handleConfirm() {
    if (reasonRequired) {
      const normalized = reason.trim();
      if (!normalized) {
        setReasonError("Reason is required.");
        return;
      }
      if (reasonRef.current) {
        reasonRef.current.value = normalized;
      }
    }

    setReasonError("");
    startTransition(() => {
      formRef.current?.requestSubmit();
      setIsOpen(false);
      setReason("");
    });
  }

  return (
    <>
      <form ref={formRef} action={action}>
        {Object.entries(hiddenFields).map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={String(value)} />
        ))}
        <input ref={reasonRef} type="hidden" name="reason" />
        <button
          type="button"
          className={cn("cursor-pointer", buttonClassName)}
          onClick={() => setIsOpen(true)}
        >
          {buttonLabel}
        </button>
      </form>

      <DeleteConfirmationModal
        isOpen={isOpen}
        onClose={() => {
          if (!isSubmitting) {
            setIsOpen(false);
            setReasonError("");
          }
        }}
        onConfirm={handleConfirm}
        isDeleting={isSubmitting}
        title={buttonLabel}
        description={confirmMessage}
        confirmLabel={buttonLabel}
        extraContent={
          reasonRequired ? (
            <div className="space-y-2">
              <label htmlFor="admin-action-reason" className="block text-xs font-medium text-[#A8B0C2]">
                {reasonPrompt ?? "Reason"}
              </label>
              <Input
                id="admin-action-reason"
                value={reason}
                onChange={(event) => {
                  setReason(event.target.value);
                  if (reasonError) setReasonError("");
                }}
                placeholder="Enter reason"
                className={adminInputOverrideClass}
              />
              {reasonError ? <p className="text-xs text-red-300">{reasonError}</p> : null}
            </div>
          ) : null
        }
      />
    </>
  );
}

