"use client";

import { useId } from "react";

interface SearchableDropdownProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
  isOptional?: boolean;
  allowCustomValue?: boolean;
}

export default function SearchableDropdown({
  label,
  value,
  onChange,
  options,
  placeholder = "Search or type...",
  isOptional = false,
  allowCustomValue = true,
}: SearchableDropdownProps) {
  const id = useId();
  const controlClass =
    "w-full border-b border-white/[0.12] bg-transparent px-0 py-2.5 text-[15px] text-[#F2F4F8] outline-none transition-colors focus:border-[#3B82F6]";

  return (
    <div data-practice-selector>
      <label htmlFor={id} className="mb-1.5 block text-[12px] font-medium text-[#A8B0C2]">
        {label}
        {isOptional ? <span className="text-[#6B7385]"> (optional)</span> : null}
      </label>

      {allowCustomValue ? (
        <>
          <input
            id={id}
            list={`${id}-options`}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            className={`${controlClass} placeholder-[#6B7385]`}
          />
          <datalist id={`${id}-options`}>
            {options.map((option) => <option key={option} value={option} />)}
          </datalist>
        </>
      ) : (
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={controlClass}
        >
          <option value="">{placeholder}</option>
          {value && !options.includes(value) ? <option value={value}>{value}</option> : null}
          {options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      )}
    </div>
  );
}
