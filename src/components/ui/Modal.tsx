import { motion, AnimatePresence } from "framer-motion";
import React from "react";
import ModalPortal from "./ModalPortal";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm?: () => void;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: "danger" | "info" | "warning";
    isLoading?: boolean;
}

export default function Modal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    variant = "info",
    isLoading = false,
}: ModalProps) {
    const isConfirmOnly = !onConfirm;

    const variantStyles = {
        danger: {
            bg: "bg-red-100",
            icon: "text-red-600",
            button: "bg-red-600 hover:bg-red-700",
        },
        info: {
            bg: "bg-blue-100",
            icon: "text-blue-600",
            button: "bg-blue-600 hover:bg-blue-700",
        },
        warning: {
            bg: "bg-amber-100",
            icon: "text-amber-600",
            button: "bg-amber-600 hover:bg-amber-700",
        },
    };

    const style = variantStyles[variant];

    return (
        <ModalPortal isOpen={isOpen}>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={isLoading ? undefined : onClose}
                        className="fixed inset-0 z-[80] flex min-h-dvh items-center justify-center bg-zinc-900/40 p-4 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: "spring", duration: 0.3 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl shadow-zinc-900/10 ring-1 ring-zinc-200"
                        >
                            <div className="p-6">
                                <div className="flex items-start gap-4">
                                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${style.bg}`}>
                                        {variant === "danger" ? (
                                            <svg className={`h-5 w-5 ${style.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                        ) : variant === "warning" ? (
                                            <svg className={`h-5 w-5 ${style.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                        ) : (
                                            <svg className={`h-5 w-5 ${style.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-base font-semibold text-zinc-900">
                                            {title}
                                        </h3>
                                        <p className="mt-2 text-sm text-zinc-600 whitespace-pre-wrap">
                                            {description}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-3 bg-zinc-50 px-6 py-4">
                                {!isConfirmOnly && (
                                    <button
                                        onClick={onClose}
                                        disabled={isLoading}
                                        className="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-default"
                                    >
                                        {cancelLabel}
                                    </button>
                                )}
                                <button
                                    onClick={onConfirm || onClose}
                                    disabled={isLoading}
                                    className={`flex cursor-pointer items-center justify-center min-w-[80px] rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-default ${style.button}`}
                                >
                                    {isLoading ? (
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
