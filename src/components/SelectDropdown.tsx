"use client";

import { useId } from "react";

interface Option {
  label: string;
  value: string;
  description?: string;
}

interface SelectDropdownProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly Option[];
  disabled?: boolean;
}

export default function SelectDropdown({
  label,
  value,
  onChange,
  options,
  disabled = false,
}: SelectDropdownProps) {
  const id = useId();

  return (
    <div data-practice-selector>
      <label htmlFor={id} className="mb-1.5 block text-[12px] font-medium text-[#A8B0C2]">
        {label}
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full cursor-pointer border-b border-white/[0.12] bg-transparent px-0 py-2.5 text-[15px] text-[#F2F4F8] outline-none transition-colors focus:border-[#3B82F6] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );
}
