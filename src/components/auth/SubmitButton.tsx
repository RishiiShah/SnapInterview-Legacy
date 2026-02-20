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
                <svg
                    className="h-5 w-5 animate-spin text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            ) : (
                text
            )}
        </button>
    );
}
