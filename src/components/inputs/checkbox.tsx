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
}

export function Checkbox({ checked, indeterminate, className, "data-key": dataKey, disabled, onChange, value }: Props) {
  return (
    <>
      <div className={clsx("inline-block rounded border border-slate-500", className)}>
        {indeterminate ? (
          <div className="h-6 w-6 flex items-center justify-center text-green-500">
            <div className="w-3 h-0.5 bg-green-500" />
          </div>
        ) : (
          <CheckIcon
            className={clsx(
              "h-6 w-6 text-green-500 transition-opacity duration-200 ease-in-out",
              checked ? "opacity-100" : "opacity-0"
            )}
          />
        )}
      </div>
      <input
        className="hidden"
        type="checkbox"
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        data-key={dataKey}
      />
    </>
  );
}
