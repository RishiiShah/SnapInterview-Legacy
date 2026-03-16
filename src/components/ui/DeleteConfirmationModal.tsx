import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";

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
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={isDeleting ? undefined : onClose}
                        className="fixed inset-0 z-50 bg-zinc-900/40 backdrop-blur-sm"
                    />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: "spring", duration: 0.3 }}
                            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl shadow-zinc-900/10 ring-1 ring-zinc-200"
                        >
                            <div className="p-6">
                                <div className="flex items-start gap-4">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                                        <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-base font-semibold text-zinc-900">
                                            {title}
                                        </h3>
                                        <p className="mt-2 text-sm text-zinc-500">
                                            {description}
                                        </p>
                                        {extraContent ? <div className="mt-4">{extraContent}</div> : null}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-3 bg-zinc-50 px-6 py-4">
                                <button
                                    onClick={onClose}
                                    disabled={isDeleting}
                                    className="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-default"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={onConfirm}
                                    disabled={isDeleting}
                                    className="flex cursor-pointer items-center justify-center min-w-[80px] rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50 disabled:cursor-default"
                                >
                                    {isDeleting ? (
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                    ) : (
                                        confirmLabel
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
