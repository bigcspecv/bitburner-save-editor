import {
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
import { SearchBar } from "components/inputs/search-bar";
import { formatNumber } from "util/format";
import { useDebounce } from "util/hooks";

import { SortAscendingIcon, SortDescendingIcon } from "@heroicons/react/solid";

interface Props extends PropsWithChildren<{}> {
  isFiltering?: boolean;
}

export default observer(function CompaniesSection({ isFiltering }: Props) {
  const { companies } = useContext(FileContext);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 500);
  const [filters, setFilters] = useState<Partial<{ favor: number; playerReputation: number }>>({
    playerReputation: -1,
  });

  const filteredCompanies = useMemo(() => {
    if (!companies || !companies.data || companies.data.length === 0) {
      return [];
    }
    const filteredCompanies = companies.data.filter(([name]) => {
      return debouncedQuery.length === 0 || name.indexOf(debouncedQuery) >= 0;
    });

    // sort
    let sortProperty: keyof typeof filters = filters.playerReputation
      ? "playerReputation"
      : filters.favor
      ? "favor"
      : undefined;

    if (!sortProperty) return filteredCompanies;

    return sortWith(
      [filters[sortProperty] > 0 ? ascend(path([1, sortProperty])) : descend(path([1, sortProperty]))],
      filteredCompanies
    );
  }, [companies, filters, debouncedQuery]);

  const onSubmit = useCallback(
    (company: string, updates: Partial<Bitburner.CompanySaveObject>) => {
      companies.updateCompany(company, updates);
    },
    [companies]
  );

  const onEditFilters = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const element = event.currentTarget as HTMLButtonElement;
    const property = element.dataset.key as keyof typeof filters;
    const otherProperty = property === "favor" ? "playerReputation" : "favor";

    setFilters((f) => ({
      ...f,
      [property]: !f[property] ? -1 : f[property] > 0 ? -1 : 1,
      [otherProperty]: undefined,
    }));
  }, []);

  return (
    <div>
      {isFiltering && (
        <>
          <div className="mb-4 flex gap-4">
            <SearchBar
              onChange={(e) => setQuery(e.currentTarget.value)}
              value={query}
              placeholder="Search Companies..."
              onClear={() => setQuery("")}
            />
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
              {filters.favor > 0 ? <SortAscendingIcon className="h-6 w-6" /> : <SortDescendingIcon className="h-6 w-6" />}
              <span className="ml-2">Favor</span>
            </button>
          </div>
        </>
      )}
      {filteredCompanies.length === 0 ? (
        <div className="text-slate-300">No company data available.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 grid-flow-row gap-4">
          {filteredCompanies.map(([company, companyData]) => {
            const originalCompany = companies.originalData.find(([name]) => name === company)?.[1];
            return (
              <Company
                key={company}
                id={company}
                company={companyData}
                originalCompany={originalCompany}
                onSubmit={onSubmit}
              />
            );
          })}
        </div>
      )}
    </div>
  );
});

interface CompanyProps extends PropsWithChildren<{}> {
  id: string;
  company: Bitburner.CompanySaveObject;
  originalCompany?: Bitburner.CompanySaveObject;
  onSubmit(key: string, value: Partial<Bitburner.CompanySaveObject>): void;
}

const Company = function Company({ id, company, originalCompany, onSubmit }: CompanyProps) {
  const [editing, setEditing] = useState(false);
  const [state, setState] = useState(Object.assign({}, company));
  const [pendingSave, setPendingSave] = useState(false);

  // Sync state when company prop changes
  useEffect(() => {
    setState(Object.assign({}, company));
  }, [company]);

  // Save when pendingSave flag is set
  useEffect(() => {
    if (pendingSave && editing) {
      const favor = Math.min(Number.MAX_SAFE_INTEGER, Number(state.favor));
      const playerReputation = Math.min(Number.MAX_SAFE_INTEGER, Number(state.playerReputation || 0));
      onSubmit(id, { favor, playerReputation });
      setPendingSave(false);
    }
  }, [pendingSave, editing, state, id, onSubmit]);

  // Check if company has changed from original
  const hasChanged = useMemo(() => {
    if (!originalCompany) return false;
    const currentData = editing ? state : company;
    return JSON.stringify(currentData) !== JSON.stringify(originalCompany);
  }, [originalCompany, company, state, editing]);

  const handleRevert = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    if (originalCompany) {
      onSubmit(id, originalCompany);
      setState(Object.assign({}, originalCompany));
    }
  }, [originalCompany, id, onSubmit]);

  const onClickEnter = useCallback<MouseEventHandler<HTMLDivElement>>((event) => {
    setEditing(true);
    event.preventDefault();
  }, []);

  const onChange = useCallback<ChangeEventHandler<HTMLInputElement>>((event) => {
    const { dataset, value } = event.currentTarget;
    setState((s: any) => ({ ...s, [dataset.key]: value }));
    setPendingSave(true);
  }, []);

  const onSetFavorToMax = useCallback(() => {
    setState((s: any) => ({ ...s, favor: 150 }));
    setPendingSave(true);
  }, []);

  const onClose = useCallback<FormEventHandler>(
    (event) => {
      setEditing(false);
      event.preventDefault();
    },
    []
  );

  // Check if company has any non-zero values
  const hasValues = (state.playerReputation || 0) !== 0 || state.favor !== 0;

  return (
    <>
      <div
        className={clsx(
          "transition-colors duration-200 ease-in-out relative inline-flex flex-col p-2 rounded border shadow row-span-2 overflow-hidden",
          hasChanged ? "border-yellow-500 shadow-yellow-700" : "border-gray-700 shadow-green-700",
          "hover:bg-gray-800 focus-within:bg-gray-800",
          editing ? "z-20 h-auto" : "h-10",
          hasValues && !editing && "bg-gray-800/50"
        )}
        onClick={!editing ? onClickEnter : undefined}
      >
        <form className="grid grid-cols-2 gap-1" data-id="company-section" onSubmit={onClose}>
          <header className="col-span-2 flex items-baseline justify-between">
            <h3 className={clsx("tracking-wide", hasValues ? "text-green-300" : "text-green-100")}>{id}</h3>
            <div className="flex items-center gap-2">
              {!editing && hasValues && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-green-900/50 text-green-300">
                  {state.playerReputation > 0 && state.favor > 0 ? "Rep + Favor" : state.playerReputation > 0 ? "Rep" : "Favor"}
                </span>
              )}
              {hasChanged && (
                <button
                  type="button"
                  onClick={handleRevert}
                  className="px-2 py-0.5 text-xs rounded bg-yellow-600 hover:bg-yellow-500 text-white"
                  title="Reset to original value"
                >
                  Reset
                </button>
              )}
            </div>
          </header>
          <label className="col-span-2 flex items-center">
            <span className="mr-1">Reputation: </span>
            {editing && (
              <Input
                disabled={!editing}
                onChange={onChange}
                value={`${state.playerReputation || 0}`}
                type="number"
                data-key="playerReputation"
              />
            )}
            {!editing && <p className="px-2 py-1 w-full">{formatNumber(state.playerReputation || 0)}</p>}
          </label>
          <label className="col-span-2 flex items-center gap-2">
            <span className="mr-1">Favor: </span>
            {editing && (
              <Input
                className="flex-1"
                disabled={!editing}
                onChange={onChange}
                value={`${state.favor}`}
                type="number"
                data-key="favor"
              />
            )}
            {editing && (
              <button
                type="button"
                onClick={onSetFavorToMax}
                className="px-2 py-1 text-xs rounded bg-green-700 hover:bg-green-600 text-white whitespace-nowrap"
              >
                150
              </button>
            )}
            {!editing && <p className="px-2 py-1 w-full">{formatNumber(state.favor)}</p>}
          </label>
          <button type="submit" className="hidden" />
        </form>
      </div>
      <div
        className={clsx(
          "z-10 absolute inset-0 bg-gray-900 transition-opacity duration-200 ease-in-out",
          editing ? "opacity-50" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
    </>
  );
};
