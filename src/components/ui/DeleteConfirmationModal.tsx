import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";
import ModalPortal from "./ModalPortal";

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isDeleting: boolean;
    title?: string;
    description?: string;
    confirmLabel?: string;
    extraContent?: ReactNode;
}

export default function DeleteConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    isDeleting,
    title = "Delete Recording",
    description = "Are you sure you want to delete this recording? This action cannot be undone.",
    confirmLabel = "Delete",
    extraContent,
}: DeleteConfirmationModalProps) {
    return (
        <ModalPortal isOpen={isOpen}>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={isDeleting ? undefined : onClose}
                        className="fixed inset-0 z-[80] flex min-h-dvh items-center justify-center bg-[#0B0C10]/80 p-4 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: "spring", duration: 0.3 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-md overflow-hidden rounded-2xl border border-white/[0.08] bg-[#12141A] shadow-2xl"
                        >
                            <div className="p-6">
                                <div className="flex items-start gap-4">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-500/15">
                                        <svg className="h-5 w-5 text-rose-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-base font-semibold text-[#F2F4F8]">
                                            {title}
                                        </h3>
                                        <p className="mt-2 text-sm text-[#A8B0C2]">
                                            {description}
                                        </p>
                                        {extraContent ? <div className="mt-4">{extraContent}</div> : null}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-3 border-t border-white/[0.06] bg-white/[0.02] px-6 py-4">
                                <button
                                    onClick={onClose}
                                    disabled={isDeleting}
                                    className="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-[#C5CBD8] transition-colors hover:bg-white/[0.06] hover:text-[#E8ECF4] disabled:cursor-default disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={onConfirm}
                                    disabled={isDeleting}
                                    className="flex min-w-[80px] cursor-pointer items-center justify-center rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-500 disabled:cursor-default disabled:opacity-50"
                                >
                                    {isDeleting ? (
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                    ) : (
                                        confirmLabel
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </ModalPortal>
    );
}
