import {
  ChangeEvent,
  ChangeEventHandler,
  FormEventHandler,
  MouseEvent,
  MouseEventHandler,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { observer } from "mobx-react-lite";
import clsx from "clsx";
import { ascend, descend, path, sortWith } from "ramda";

import { FileContext } from "App";
import { Bitburner } from "bitburner";
import { Input } from "components/inputs/input";
import { Checkbox } from "components/inputs/checkbox";
import { NumberInput } from "components/inputs/number-input";
import { SearchBar } from "components/inputs/search-bar";
import { formatNumber } from "util/format";
import { useDebounce } from "util/hooks";

import { SortAscendingIcon, SortDescendingIcon } from "@heroicons/react/solid";

interface Props extends PropsWithChildren<{}> {
  isFiltering?: boolean;
}

export default observer(function ServersSection({ isFiltering }: Props) {
  const { servers } = useContext(FileContext);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 500);
  const [filters, setFilters] = useState<Partial<{ maxRam: number; moneyMax: number }>>({});
  const [selectedServers, setSelectedServers] = useState<Set<string>>(new Set());

  const filteredServers = useMemo(() => {
    if (!servers || !servers.data || servers.data.length === 0) {
      return [];
    }
    const filteredServers = servers.data.filter(([hostname, serverData]) => {
      return debouncedQuery.length === 0 || hostname.indexOf(debouncedQuery) >= 0 ||
        (serverData.organizationName && serverData.organizationName.indexOf(debouncedQuery) >= 0);
    });

    // sort
    let sortProperty: keyof typeof filters = filters.maxRam
      ? "maxRam"
      : filters.moneyMax
      ? "moneyMax"
      : undefined;

    if (!sortProperty) return filteredServers;

    return sortWith(
      [filters[sortProperty] > 0 ? ascend(path([1, sortProperty])) : descend(path([1, sortProperty]))],
      filteredServers
    );
  }, [servers, filters, debouncedQuery]);

  const onSubmit = useCallback(
    (hostname: string, updates: Partial<Bitburner.ServerData>) => {
      servers.updateServer(hostname, updates);
    },
    [servers]
  );

  const onEditFilters = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const element = event.currentTarget as HTMLButtonElement;
    const property = element.dataset.key as keyof typeof filters;
    const otherProperty = property === "maxRam" ? "moneyMax" : "maxRam";

    setFilters((f) => ({
      ...f,
      [property]: !f[property] ? -1 : f[property] > 0 ? -1 : 1,
      [otherProperty]: undefined,
    }));
  }, []);

  const onToggleServer = useCallback((hostname: string, checked: boolean) => {
    setSelectedServers((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(hostname);
      } else {
        next.delete(hostname);
      }
      return next;
    });
  }, []);

  const allSelected = useMemo(() => {
    if (filteredServers.length === 0) return false;
    return filteredServers.every(([hostname]) => selectedServers.has(hostname));
  }, [filteredServers, selectedServers]);

  const someSelected = useMemo(() => {
    if (selectedServers.size === 0) return false;
    return filteredServers.some(([hostname]) => selectedServers.has(hostname));
  }, [filteredServers, selectedServers]);

  const onToggleAll = useCallback(() => {
    if (allSelected || someSelected) {
      // If all or some are selected, deselect all
      setSelectedServers(new Set());
    } else {
      // If none are selected, select all
      const allHostnames = filteredServers.map(([hostname]) => hostname);
      setSelectedServers(new Set(allHostnames));
    }
  }, [allSelected, someSelected, filteredServers]);

  const onSelectRooted = useCallback(() => {
    const rootedHostnames = filteredServers
      .filter(([, serverData]) => serverData.hasAdminRights)
      .map(([hostname]) => hostname);
    setSelectedServers(new Set(rootedHostnames));
  }, [filteredServers]);

  const onSelectBackdoored = useCallback(() => {
    const backdooredHostnames = filteredServers
      .filter(([, serverData]) => serverData.backdoorInstalled)
      .map(([hostname]) => hostname);
    setSelectedServers(new Set(backdooredHostnames));
  }, [filteredServers]);

  const onSelectPurchased = useCallback(() => {
    const purchasedHostnames = filteredServers
      .filter(([, serverData]) => serverData.purchasedByPlayer)
      .map(([hostname]) => hostname);
    setSelectedServers(new Set(purchasedHostnames));
  }, [filteredServers]);

  const onMaxRamSelected = useCallback(() => {
    const maxRam = VALID_RAM_VALUES[VALID_RAM_VALUES.length - 1];
    selectedServers.forEach((hostname) => {
      servers.updateServer(hostname, { maxRam });
    });
  }, [selectedServers, servers]);

  return (
    <div>
      {isFiltering && (
        <>
          <div className="mb-4 flex gap-4">
            <SearchBar
              onChange={(e) => setQuery(e.currentTarget.value)}
              value={query}
              placeholder="Search Servers..."
              onClear={() => setQuery("")}
            />
          </div>
          <div className="mb-4 flex gap-4">
            <button
              className={clsx("flex items-center justify-center", !filters.maxRam && "opacity-25")}
              data-key="maxRam"
              onClick={onEditFilters}
            >
              {filters.maxRam > 0 ? (
                <SortAscendingIcon className="h-6 w-6" />
              ) : (
                <SortDescendingIcon className="h-6 w-6" />
              )}
              <span className="ml-2">RAM</span>
            </button>
            <button
              className={clsx("flex items-center justify-center", !filters.moneyMax && "opacity-25")}
              data-key="moneyMax"
              onClick={onEditFilters}
            >
              {filters.moneyMax > 0 ? <SortAscendingIcon className="h-6 w-6" /> : <SortDescendingIcon className="h-6 w-6" />}
              <span className="ml-2">Max Money</span>
            </button>
          </div>
        </>
      )}
      <div className="mb-4 flex items-center gap-2 text-sm text-slate-300">
        <span>Select:</span>
        <label className="flex items-center cursor-pointer">
          <Checkbox
            checked={allSelected}
            indeterminate={!allSelected && someSelected}
            onChange={onToggleAll}
            className="cursor-pointer"
          />
        </label>
        <button
          onClick={onSelectRooted}
          className="px-2 py-1 text-green-300 hover:text-green-100 underline"
        >
          Rooted
        </button>
        <button
          onClick={onSelectBackdoored}
          className="px-2 py-1 text-green-300 hover:text-green-100 underline"
        >
          Backdoored
        </button>
        <button
          onClick={onSelectPurchased}
          className="px-2 py-1 text-green-300 hover:text-green-100 underline"
        >
          Purchased
        </button>
        {selectedServers.size > 0 && (
          <span className="ml-2 text-slate-400">({selectedServers.size} selected)</span>
        )}
        <span className="mx-2 text-gray-600">|</span>
        <span>Actions:</span>
        <button
          onClick={onMaxRamSelected}
          disabled={selectedServers.size === 0}
          className="px-2 py-1 text-green-300 hover:text-green-100 underline disabled:opacity-30 disabled:cursor-not-allowed disabled:no-underline"
        >
          Max RAM
        </button>
      </div>
      <hr className="mb-4 border-t border-gray-700" />
      {filteredServers.length === 0 ? (
        <div className="text-slate-300">No server data available.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 grid-flow-row gap-4">
          {filteredServers.map(([hostname, serverData]) => {
            const originalServer = servers.originalData?.find(([h]) => h === hostname)?.[1];
            return (
              <Server
                key={hostname}
                hostname={hostname}
                server={serverData}
                originalServer={originalServer}
                onSubmit={onSubmit}
                selected={selectedServers.has(hostname)}
                onToggleSelected={onToggleServer}
              />
            );
          })}
        </div>
      )}
    </div>
  );
});

interface ServerProps extends PropsWithChildren<{}> {
  hostname: string;
  server: Bitburner.ServerData;
  originalServer?: Bitburner.ServerData;
  onSubmit(hostname: string, value: Partial<Bitburner.ServerData>): void;
  selected: boolean;
  onToggleSelected(hostname: string, checked: boolean): void;
}

// Valid RAM values in the game (powers of 2 from 8 to 1073741824)
const VALID_RAM_VALUES = [
  8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536,
  131072, 262144, 524288, 1048576, 2097152, 4194304, 8388608, 16777216,
  33554432, 67108864, 134217728, 268435456, 536870912, 1073741824
];

const Server = function Server({ hostname, server, originalServer, onSubmit, selected, onToggleSelected }: ServerProps) {
  const [editing, setEditing] = useState(false);
  const [state, setState] = useState(Object.assign({}, server));
  const [pendingSave, setPendingSave] = useState(false);

  // Sync state when server prop changes (e.g., after revert)
  useEffect(() => {
    setState(Object.assign({}, server));
  }, [server]);

  // Save to store when state changes (but not on initial mount or when syncing from server prop)
  useEffect(() => {
    if (pendingSave && editing) {
      const updates: Partial<Bitburner.ServerData> = {
        maxRam: Math.max(0, Number(state.maxRam)),
        cpuCores: Math.min(8, Math.max(1, Number(state.cpuCores))),
        hackDifficulty: Math.max(0, Number(state.hackDifficulty)),
        minDifficulty: Math.max(0, Number(state.minDifficulty)),
        moneyAvailable: Math.max(0, Number(state.moneyAvailable)),
        moneyMax: Math.max(0, Number(state.moneyMax)),
        requiredHackingSkill: Math.max(0, Number(state.requiredHackingSkill)),
        hasAdminRights: Boolean(state.hasAdminRights),
        backdoorInstalled: Boolean(state.backdoorInstalled),
      };
      onSubmit(hostname, updates);
      setPendingSave(false);
    }
  }, [pendingSave, editing, state, hostname, onSubmit]);

  // Check if server has been modified from original
  // Compare current state (if editing) or server prop (if not editing) with original
  const hasChanged = useMemo(() => {
    if (!originalServer) return false;
    const currentData = editing ? state : server;
    return JSON.stringify(currentData) !== JSON.stringify(originalServer);
  }, [originalServer, server, state, editing]);

  const onClickEnter = useCallback<MouseEventHandler<HTMLDivElement>>((event) => {
    setEditing(true);
    event.preventDefault();
  }, []);

  const onCheckboxChange = useCallback<ChangeEventHandler<HTMLInputElement>>((event) => {
    onToggleSelected(hostname, event.currentTarget.checked);
    event.stopPropagation();
  }, [hostname, onToggleSelected]);

  const onChange = useCallback<ChangeEventHandler<HTMLInputElement>>((event) => {
    const { dataset, value, type, checked } = event.currentTarget;
    let finalValue: any = type === "checkbox" ? checked : value;

    // Cap cpuCores at 8
    if (dataset.key === "cpuCores") {
      const numValue = Number(value);
      if (numValue > 8) {
        finalValue = "8";
      }
    }

    setState((s: any) => ({ ...s, [dataset.key]: finalValue }));
    setPendingSave(true);
  }, []);

  const onSelectChange = useCallback<ChangeEventHandler<HTMLSelectElement>>((event) => {
    const { dataset, value } = event.currentTarget;
    setState((s: any) => ({ ...s, [dataset.key]: value }));
    setPendingSave(true);
  }, []);

  const onMaxRam = useCallback<MouseEventHandler<HTMLButtonElement>>((event) => {
    setState((s: any) => ({ ...s, maxRam: VALID_RAM_VALUES[VALID_RAM_VALUES.length - 1] }));
    setPendingSave(true);
    event.preventDefault();
  }, []);

  const onClose = useCallback<FormEventHandler>(
    (event) => {
      // Just close the form - changes are already saved
      setEditing(false);
      event.preventDefault();
    },
    []
  );

  const handleRevert = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (originalServer) {
      onSubmit(hostname, originalServer);
      setState(Object.assign({}, originalServer));
    }
  }, [hostname, originalServer, onSubmit]);

  // Check if server is modified (has non-default interesting values)
  const isModified = state.purchasedByPlayer || state.backdoorInstalled || state.hasAdminRights;

  return (
    <>
      <div
        className={clsx(
          "transition-colors duration-200 ease-in-out relative inline-flex flex-col p-2 rounded border shadow row-span-2 overflow-hidden",
          hasChanged ? "border-yellow-500 shadow-yellow-700" : "border-gray-700 shadow-green-700",
          "hover:bg-gray-800 focus-within:bg-gray-800",
          editing ? "z-20 h-auto" : "h-10",
          isModified && !editing && "bg-gray-800/50"
        )}
        onClick={!editing ? onClickEnter : undefined}
      >
        <form className="grid grid-cols-2 gap-1" data-id="server-section" onSubmit={onClose}>
          <header className="col-span-2 flex items-baseline justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selected}
                onChange={onCheckboxChange}
                className="cursor-pointer"
              />
              <h3 className={clsx("tracking-wide", isModified ? "text-green-300" : "text-green-100")}>
                {hostname}
              </h3>
              {hasChanged && (
                <button
                  type="button"
                  onClick={handleRevert}
                  className="ml-1 px-1.5 py-0.5 text-xs rounded bg-yellow-600 hover:bg-yellow-500 text-white"
                  title="Reset to original values"
                >
                  Reset
                </button>
              )}
            </div>
            <span className="text-xs text-slate-400">
              {state.purchasedByPlayer ? "Purchased" : state.organizationName || "Server"}
            </span>
          </header>
          <label className="col-span-2 flex items-center gap-1">
            <span className="mr-1 text-xs">RAM (GB): </span>
            {editing && (
              <>
                <select
                  value={`${state.maxRam}`}
                  onChange={onSelectChange}
                  data-key="maxRam"
                  className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-slate-100 outline-none hover:bg-gray-800 focus:bg-gray-800"
                >
                  {VALID_RAM_VALUES.map((ram) => (
                    <option key={ram} value={ram} className="bg-gray-900 text-slate-100">
                      {formatNumber(ram)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={onMaxRam}
                  className="px-2 py-1 text-xs bg-green-900 hover:bg-green-800 text-green-100 rounded border border-green-700"
                >
                  MAX
                </button>
              </>
            )}
            {!editing && <p className="px-2 py-1 w-full text-sm">{formatNumber(state.maxRam)}</p>}
          </label>
          <label className="col-span-1 flex items-center">
            <span className="mr-1 text-xs">Cores: </span>
            {editing && (
              <NumberInput
                disabled={!editing}
                onChange={onChange}
                value={`${state.cpuCores}`}
                min="1"
                max="8"
                data-key="cpuCores"
              />
            )}
            {!editing && <p className="px-2 py-1 w-full text-sm">{state.cpuCores}</p>}
          </label>
          <label className="col-span-1 flex items-center">
            <span className="mr-1 text-xs">Skill: </span>
            {editing && (
              <Input
                disabled={!editing}
                onChange={onChange}
                value={`${state.requiredHackingSkill}`}
                type="number"
                data-key="requiredHackingSkill"
              />
            )}
            {!editing && <p className="px-2 py-1 w-full text-sm">{state.requiredHackingSkill}</p>}
          </label>
          <label className="col-span-2 flex items-center">
            <span className="mr-1 text-xs">Money: </span>
            {editing && (
              <Input
                disabled={!editing}
                onChange={onChange}
                value={`${state.moneyAvailable}`}
                type="number"
                data-key="moneyAvailable"
              />
            )}
            {!editing && <p className="px-2 py-1 w-full text-sm">{formatNumber(state.moneyAvailable)}</p>}
          </label>
          <label className="col-span-2 flex items-center">
            <span className="mr-1 text-xs">Max Money: </span>
            {editing && (
              <Input
                disabled={!editing}
                onChange={onChange}
                value={`${state.moneyMax}`}
                type="number"
                data-key="moneyMax"
              />
            )}
            {!editing && <p className="px-2 py-1 w-full text-sm">{formatNumber(state.moneyMax)}</p>}
          </label>
          <label className="col-span-1 flex items-center">
            <span className="mr-1 text-xs">Min Sec: </span>
            {editing && (
              <Input
                disabled={!editing}
                onChange={onChange}
                value={`${state.minDifficulty}`}
                type="number"
                data-key="minDifficulty"
              />
            )}
            {!editing && <p className="px-2 py-1 w-full text-sm">{state.minDifficulty}</p>}
          </label>
          <label className="col-span-1 flex items-center">
            <span className="mr-1 text-xs">Sec: </span>
            {editing && (
              <Input
                disabled={!editing}
                onChange={onChange}
                value={`${state.hackDifficulty}`}
                type="number"
                data-key="hackDifficulty"
              />
            )}
            {!editing && <p className="px-2 py-1 w-full text-sm">{state.hackDifficulty}</p>}
          </label>
          <label className="col-span-1 inline-flex items-center text-slate-100">
            <span className="mr-1 text-xs">Root: </span>
            <Checkbox checked={state.hasAdminRights} disabled={!editing} onChange={onChange} data-key="hasAdminRights" />
          </label>
          <label className="col-span-1 inline-flex items-center text-slate-100">
            <span className="mr-1 text-xs">Backdoor: </span>
            <Checkbox checked={state.backdoorInstalled} disabled={!editing} onChange={onChange} data-key="backdoorInstalled" />
          </label>
          <button type="submit" className="hidden" />
        </form>
      </div>
      <div
        className={clsx(
          "z-10 fixed inset-0 bg-gray-900 transition-opacity duration-200 ease-in-out",
          editing ? "opacity-50" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
    </>
  );
};
