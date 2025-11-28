import { ChangeEventHandler, PropsWithChildren } from "react";

import { ReactComponent as CheckIcon } from "icons/check.svg";
import clsx from "clsx";

interface Props extends PropsWithChildren<{}> {
  checked?: boolean;
  indeterminate?: boolean;
  className?: string;
  "data-key"?: string;
  disabled?: boolean;
  onChange: ChangeEventHandler<HTMLInputElement>;
  value?: string;
  stopPropagation?: boolean;
}

export function Checkbox({
  checked,
  indeterminate,
  className,
  "data-key": dataKey,
  disabled,
  onChange,
  value,
  stopPropagation,
}: Props) {
  const handleStop: React.MouseEventHandler<any> | undefined = stopPropagation
    ? (e) => {
        e.stopPropagation();
      }
    : undefined;

  return (
    <label
      className={clsx("inline-flex items-center relative select-none", className)}
      onClick={handleStop}
      onMouseDown={handleStop}
    >
      <input
        className="absolute inset-0 h-6 w-6 cursor-pointer opacity-0"
        type="checkbox"
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        data-key={dataKey}
        onClick={handleStop}
        onMouseDown={handleStop}
      />
      <span
        className={clsx(
          "inline-flex h-6 w-6 items-center justify-center rounded border border-slate-500",
          disabled && "opacity-50"
        )}
      >
        {indeterminate ? (
          <span className="w-3 h-0.5 bg-green-500" />
        ) : (
          <CheckIcon
            className={clsx(
              "h-4 w-4 text-green-500 transition-opacity duration-200 ease-in-out",
              checked ? "opacity-100" : "opacity-0"
            )}
          />
        )}
      </span>
    </label>
  );
}
