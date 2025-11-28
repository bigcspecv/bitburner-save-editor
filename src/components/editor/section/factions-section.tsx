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
import { ascend, descend, path, pick, sortWith } from "ramda";

import { FileContext } from "App";
import { Bitburner } from "bitburner";
import { Checkbox } from "components/inputs/checkbox";
import { Input } from "components/inputs/input";
import { SearchBar } from "components/inputs/search-bar";
import { formatNumber } from "util/format";
import { useDebounce } from "util/hooks";

import { SortAscendingIcon, SortDescendingIcon } from "@heroicons/react/solid";

export type FactionDataKey = keyof Bitburner.FactionsSaveObject["data"];

interface Props extends PropsWithChildren<{}> {
  isFiltering?: boolean;
}
export default observer(function FactionSection({ isFiltering }: Props) {
  const { factions } = useContext(FileContext);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 500);
  const [filters, setFilters] = useState<Partial<Bitburner.FactionsSaveObject["data"]>>({
    playerReputation: -1,
  });

  // Create a map of original faction data for easy lookup
  const originalFactionsMap = useMemo(() => {
    if (!factions?.originalData) return new Map();
    return new Map(factions.originalData);
  }, [factions?.originalData]);

  const filteredFactions = useMemo(() => {
    if (!factions || !factions.data || factions.data.length === 0) {
      return [];
    }
    const filteredFactions = factions.data.filter(([, faction]) => {
      // Skip factions with malformed data
      if (!faction?.data) {
        return false;
      }
      return (
        (!filters.alreadyInvited || faction.data.alreadyInvited) &&
        (!filters.isMember || faction.data.isMember) &&
        (!filters.isBanned || faction.data.isBanned) &&
        (debouncedQuery.length === 0 || faction.data.name.indexOf(debouncedQuery) >= 0)
      );
    });

    // sort
    let sortProperty: keyof typeof filters = filters.playerReputation
      ? "playerReputation"
      : filters.favor
      ? "favor"
      : undefined;

    if (!sortProperty) return filteredFactions;

    return sortWith(
      [filters[sortProperty] > 0 ? ascend(path([1, "data", sortProperty])) : descend(path([1, "data", sortProperty]))],
      filteredFactions
    );
  }, [factions, filters, debouncedQuery]);

  const onSubmit = useCallback(
    (faction: string, updates: Partial<Bitburner.FactionsSaveObject["data"]>) => {
      factions.updateFaction(faction, updates);
    },
    [factions]
  );

  const onEditFilters = useCallback((event: ChangeEvent<HTMLInputElement> | MouseEvent<HTMLButtonElement>) => {
    if (event.currentTarget.type === "checkbox") {
      const element = event.currentTarget as HTMLInputElement;
      const property = element.dataset.key;
      const checked = element.checked;

      setFilters((f) => ({
        ...f,
        [property]: checked,
      }));
    } else {
      const element = event.currentTarget as HTMLButtonElement;
      const property = element.dataset.key as keyof typeof filters;
      const otherProperty = property === "favor" ? "playerReputation" : "favor";

      setFilters((f) => ({
        ...f,
        [property]: !f[property] ? -1 : f[property] > 0 ? -1 : 1,
        [otherProperty]: undefined,
      }));
    }
  }, []);

  // @TODO: Add sorting
  return (
    <div>
      {isFiltering && (
        <>
          <div className="mb-4 flex gap-4">
            <SearchBar
              onChange={(e) => setQuery(e.currentTarget.value)}
              value={query}
              placeholder="Search Factions..."
              onClear={() => setQuery("")}
            />
            <label className="inline-flex items-center text-slate-100">
              <Checkbox onChange={onEditFilters} data-key="alreadyInvited" checked={filters.alreadyInvited ?? false} />
              <span className="ml-2">Invited?</span>
            </label>
            <label className="inline-flex items-center text-slate-100">
              <Checkbox onChange={onEditFilters} data-key="isMember" checked={filters.isMember ?? false} />
              <span className="ml-2">Joined?</span>
            </label>
            <label className="inline-flex items-center text-slate-100">
              <Checkbox onChange={onEditFilters} data-key="isBanned" checked={filters.isBanned ?? false} />
              <span className="ml-2">Banned?</span>
            </label>
          </div>
          <div className="mb-4 flex gap-4">
            <button
              className={clsx("flex items-center justify-center", !filters.playerReputation && "opacity-25")}
              data-key="playerReputation"
              onClick={onEditFilters}
            >
              {filters.playerReputation > 0 ? (
                <SortAscendingIcon className="h-6 w-6" />
              ) : (
                <SortDescendingIcon className="h-6 w-6" />
              )}
              <span className="ml-2">Reputation</span>
            </button>
            <button
              className={clsx("flex items-center justify-center", !filters.favor && "opacity-25")}
              data-key="favor"
              onClick={onEditFilters}
            >
              {filters.favor > 0 ? (
                <SortAscendingIcon className="h-6 w-6" />
              ) : (
                <SortDescendingIcon className="h-6 w-6" />
              )}
              <span className="ml-2">Favor</span>
            </button>
          </div>
        </>
      )}
      {filteredFactions.length === 0 ? (
        <div className="text-slate-300">No faction data available.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 grid-flow-row gap-4">
          {filteredFactions.map(([faction, factionData]) => (
            <Faction
              key={faction}
              id={faction}
              faction={factionData}
              originalFaction={originalFactionsMap.get(faction)?.data}
              onSubmit={onSubmit}
            />
          ))}
        </div>
      )}
    </div>
  );
});

interface FactionProps extends PropsWithChildren<{}> {
  id: string;
  faction: Bitburner.FactionsSaveObject;
  originalFaction?: Bitburner.FactionsSaveObject["data"];
  onSubmit(key: string, value: Partial<Bitburner.FactionsSaveObject["data"]>): void;
}

const Faction = function Faction({ id, faction, originalFaction, onSubmit }: FactionProps) {
  const [editing, setEditing] = useState(false);
  const [state, setState] = useState(faction?.data ? Object.assign({}, faction.data) : {} as any);

  // Reset local state when faction data changes (e.g., after revert)
  useEffect(() => {
    if (faction?.data) {
      setState(Object.assign({}, faction.data));
    }
  }, [faction]);

  // Check if faction has changed from original
  const hasChanged = useMemo(() => {
    if (!originalFaction) return false;
    return JSON.stringify(faction.data) !== JSON.stringify(originalFaction);
  }, [originalFaction, faction]);

  const handleRevert = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    if (originalFaction) {
      // Submit all properties to ensure proper cleanup
      onSubmit(id, {
        playerReputation: originalFaction.playerReputation,
        favor: originalFaction.favor,
        isBanned: originalFaction.isBanned,
        alreadyInvited: originalFaction.alreadyInvited,
        isMember: originalFaction.isMember,
      });
      setState(Object.assign({}, originalFaction));
    }
  }, [originalFaction, id, onSubmit]);

  const onClickEnter = useCallback<MouseEventHandler<HTMLDivElement>>((event) => {
    setEditing(true);
    // So clicking into the box does not trigger checkboxes
    event.preventDefault();
  }, []);

  const onChange = useCallback<ChangeEventHandler<HTMLInputElement>>((event) => {
    const { checked, dataset, type, value } = event.currentTarget;
    setState((s: any) => ({ ...s, [dataset.key]: type === "checkbox" ? checked : value }));
  }, []);

  const onStatusChange = useCallback<ChangeEventHandler<HTMLSelectElement>>((event) => {
    const { value } = event.currentTarget;
    const newState = {
      ...state,
      alreadyInvited: value === "invited",
      isMember: value === "joined"
    };
    setState(newState);

    // Immediately persist the change to the store
    onSubmit(id, {
      alreadyInvited: newState.alreadyInvited,
      isMember: newState.isMember,
    });

    // Stop propagation to prevent triggering the parent onClick when in collapsed mode
    event.stopPropagation();
  }, [state, id, onSubmit]);

  const onClose = useCallback<FormEventHandler>(
    (event) => {
      // Process rep and favor
      const playerReputation = Math.min(Number.MAX_SAFE_INTEGER, Number(state.playerReputation));
      const favor = Math.min(Number.MAX_SAFE_INTEGER, Number(state.favor));

      onSubmit(id, {
        ...pick(["alreadyInvited", "isMember", "isBanned"], state),
        playerReputation,
        favor,
      });

      setEditing(false);
      event.preventDefault();
    },
    [id, state, onSubmit]
  );

  // Safety check - if faction data is malformed, don't render
  if (!faction?.data) {
    return null;
  }

  // Determine membership status for display
  const radioValue = state.isMember ? "joined" : state.alreadyInvited ? "invited" : "none";

  // @TODO: Display Augmentations
  return (
    <>
      <div
        className={clsx(
          "transition-colors duration-200 ease-in-out relative inline-flex flex-col p-2 rounded border shadow row-span-2 overflow-hidden",
          hasChanged ? "border-yellow-500 shadow-yellow-700" : "border-gray-700 shadow-green-700",
          "hover:bg-gray-800 focus-within:bg-gray-800",
          editing ? "z-20 h-auto" : "h-10"
        )}
        onClick={!editing ? onClickEnter : undefined}
      >
        <form className="grid grid-cols-3 gap-1" data-id="faction-section" onSubmit={onClose}>
          <header className={clsx("flex items-baseline justify-between", editing ? "col-span-3" : "col-span-2")}>
            <h3 className="tracking-wide text-green-100">{faction.data.name}</h3>
            {hasChanged && editing && (
              <button
                type="button"
                onClick={handleRevert}
                className="px-2 py-0.5 text-xs rounded bg-yellow-600 hover:bg-yellow-500 text-white"
                title="Reset to original value"
              >
                Reset
              </button>
            )}
          </header>
          <div className={clsx("flex items-center gap-1", editing ? "col-span-3 mb-2" : "ml-auto")}>
            {hasChanged && !editing && (
              <button
                type="button"
                onClick={handleRevert}
                className="px-2 py-0.5 text-xs rounded bg-yellow-600 hover:bg-yellow-500 text-white whitespace-nowrap"
                title="Reset to original value"
              >
                Reset
              </button>
            )}
            <label
              className={clsx("flex items-center gap-2", editing && "flex-1")}
              onClick={(e) => e.stopPropagation()}
            >
            {editing && <span className="text-sm text-slate-300">Status:</span>}
            <select
              value={radioValue}
              onChange={onStatusChange}
              className={clsx(
                "text-slate-100 px-2 py-1 rounded border outline-none cursor-pointer",
                editing
                  ? "flex-1 bg-gray-900 border-gray-700 hover:bg-gray-800 focus:bg-gray-800"
                  : "bg-gray-900 border-transparent text-sm"
              )}
            >
              <option value="none" className="bg-gray-900 text-slate-100">None</option>
              <option value="invited" className="bg-gray-900 text-slate-100">Invited</option>
              <option value="joined" className="bg-gray-900 text-slate-100">Joined</option>
            </select>
            </label>
          </div>
          <label className="col-span-2 flex items-center">
            <span className="mr-1">Reputation: </span>
            {editing && (
              <Input
                disabled={!editing}
                onChange={onChange}
                value={`${state.playerReputation}`}
                type="number"
                data-key="playerReputation"
              />
            )}
            {!editing && <p className="px-2 py-1 w-full">{formatNumber(state.playerReputation)}</p>}
          </label>
          <label className="ml-auto inline-flex items-center text-slate-100">
            <span className="mr-2 text-sm">Banned: </span>
            <Checkbox checked={state.isBanned} disabled={!editing} onChange={onChange} data-key="isBanned" />
          </label>
          <label className="col-span-2 flex items-center">
            <span className="mr-1">Favor: </span>
            {editing && (
              <Input disabled={!editing} onChange={onChange} value={`${state.favor}`} type="number" data-key="favor" />
            )}
            {!editing && <p className="px-2 py-1 w-full">{formatNumber(state.favor)}</p>}
          </label>
          <button type="submit" className="hidden" />
        </form>
      </div>
      <div
        className={clsx(
          "z-10 absolute inset-0 bg-gray-900  transition-opacity duration-200 ease-in-out",
          editing ? "opacity-50" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
    </>
  );
};
