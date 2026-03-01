import { IconSpinner } from "@/components/ui/icons";

interface SubmitButtonProps {
    loading: boolean;
    text: string;
    disabled?: boolean;
    onClick?: () => void;
}

export function SubmitButton({ loading, text, disabled = false, onClick }: SubmitButtonProps) {
    return (
        <button
            type="submit"
            onClick={onClick}
            disabled={loading || disabled}
            className="flex w-full items-center justify-center rounded-xl bg-zinc-900 py-2.5 text-sm font-semibold text-white shadow-lg shadow-zinc-900/20 transition-all hover:bg-zinc-700 hover:shadow-xl disabled:opacity-50"
        >
            {loading ? (
                <IconSpinner className="h-5 w-5 animate-spin text-white" />
            ) : (
                text
            )}
        </button>
    );
}
