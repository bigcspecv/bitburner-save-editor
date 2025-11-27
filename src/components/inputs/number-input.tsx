import clsx from "clsx";
import { ChangeEvent, InputHTMLAttributes, PropsWithChildren, useCallback } from "react";

interface Props extends PropsWithChildren<Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>> {
  "data-key"?: string;
  value: string | number;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

export function NumberInput({ "data-key": dataKey, className, value, onChange, min, max, disabled, ...props }: Props) {
  const numValue = Number(value);
  const minValue = min !== undefined ? Number(min) : -Infinity;
  const maxValue = max !== undefined ? Number(max) : Infinity;

  const handleIncrement = useCallback(() => {
    if (disabled) return;
    const newValue = Math.min(maxValue, numValue + 1);
    const syntheticEvent = {
      currentTarget: {
        value: String(newValue),
        dataset: { key: dataKey },
        type: 'number',
        checked: false,
      },
    } as unknown as ChangeEvent<HTMLInputElement>;
    onChange(syntheticEvent);
  }, [disabled, maxValue, numValue, dataKey, onChange]);

  const handleDecrement = useCallback(() => {
    if (disabled) return;
    const newValue = Math.max(minValue, numValue - 1);
    const syntheticEvent = {
      currentTarget: {
        value: String(newValue),
        dataset: { key: dataKey },
        type: 'number',
        checked: false,
      },
    } as unknown as ChangeEvent<HTMLInputElement>;
    onChange(syntheticEvent);
  }, [disabled, minValue, numValue, dataKey, onChange]);

  return (
    <div className="relative flex w-full">
      <input
        className={clsx(
          "w-full bg-transparent px-2 py-1 pr-8 rounded border-gray-800 hover:bg-gray-900 focus:bg-gray-900 outline-none disabled:opacity-50",
          className
        )}
        data-key={dataKey}
        type="number"
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        disabled={disabled}
        {...props}
      />
      <div className="absolute right-0 top-0 bottom-0 flex flex-col border-l border-gray-700">
        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled || numValue >= maxValue}
          className={clsx(
            "px-1.5 flex-1 text-xs leading-none hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed",
            "border-b border-gray-700"
          )}
        >
          ▲
        </button>
        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled || numValue <= minValue}
          className={clsx(
            "px-1.5 flex-1 text-xs leading-none hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
          )}
        >
          ▼
        </button>
      </div>
    </div>
  );
}
