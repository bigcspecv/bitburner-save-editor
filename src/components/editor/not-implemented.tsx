import { PropsWithChildren } from "react";

import { ExclamationCircleIcon } from "@heroicons/react/solid";

export function NotImplemented({ children }: PropsWithChildren<{}>) {
  return (
    <div className="text-slate-300">
      <p className="flex items-center gap-2">
        <ExclamationCircleIcon className="h-5 w-5 text-yellow-500" />
        <span>Not Implemented</span>
      </p>
      {children}
    </div>
  );
}
