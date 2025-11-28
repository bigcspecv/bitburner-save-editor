import { ChangeEventHandler } from "react";
import clsx from "clsx";

import { Input } from "components/inputs/input";
import { ReactComponent as SearchIcon } from "icons/search.svg";

interface SearchBarProps {
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  onClear?: () => void;
}

export function SearchBar({ value, onChange, placeholder, className, inputClassName, onClear }: SearchBarProps) {
  return (
    <label className={clsx("flex items-center gap-2", className)}>
      <SearchIcon className="h-6 w-6 text-slate-500" />
      <div className="relative w-full">
        <Input
          className={clsx("border-b border-green-900 w-full pr-8", inputClassName)}
          onChange={onChange}
          value={value}
          type="text"
          placeholder={placeholder}
        />
        {onClear && value && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white px-2"
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>
    </label>
  );
}
