import {
  ChangeEventHandler,
  FormEventHandler,
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

import { SortAscendingIcon, SortDescendingIcon } from "@heroicons/react/solid";
import { useDebounce } from "util/hooks";

interface Props extends PropsWithChildren<{}> {
  isFiltering?: boolean;
}

export default observer(function JobsSection({ isFiltering }: Props) {
  const { jobs } = useContext(FileContext);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 500);
  const [sortAsc, setSortAsc] = useState(true);
  const [showAddNew, setShowAddNew] = useState(false);

  const filteredJobs = useMemo(() => {
    if (!jobs || !jobs.data || jobs.data.length === 0) {
      return [];
    }

    const filtered = jobs.data.filter(([company]) => {
      return debouncedQuery.length === 0 || company.toLowerCase().indexOf(debouncedQuery.toLowerCase()) >= 0;
    });

    return sortWith(
      [sortAsc ? ascend(path([0])) : descend(path([0]))],
      filtered
    );
  }, [jobs, debouncedQuery, sortAsc]);

  const onEditFilters = useCallback(() => {
    setSortAsc((s) => !s);
  }, []);

  const handleAddNew = useCallback(() => {
    setShowAddNew(true);
  }, []);

  const handleCancelAdd = useCallback(() => {
    setShowAddNew(false);
  }, []);

  return (
    <div>
      {isFiltering && (
        <>
          <div className="mb-4 flex gap-4 items-center">
            <SearchBar
              className="flex-1"
              onChange={(e) => setQuery(e.currentTarget.value)}
              value={query}
              placeholder="Search Companies..."
              onClear={() => setQuery("")}
            />
            <button
              className="flex items-center justify-center gap-2 px-4 py-2 rounded bg-green-800 hover:bg-green-700 text-white"
              onClick={handleAddNew}
            >
              <span>+ Add Job</span>
            </button>
          </div>
          <div className="mb-4 flex gap-4">
            <button
              className="flex items-center justify-center"
              onClick={onEditFilters}
            >
              {sortAsc ? (
                <SortAscendingIcon className="h-6 w-6" />
              ) : (
                <SortDescendingIcon className="h-6 w-6" />
              )}
              <span className="ml-2">Company Name</span>
            </button>
          </div>
        </>
      )}
      {showAddNew && (
        <AddJobForm
          onCancel={handleCancelAdd}
          onSubmit={(company, jobTitle) => {
            jobs.updateJob(company, jobTitle);
            setShowAddNew(false);
          }}
        />
      )}
      {filteredJobs.length === 0 && !showAddNew ? (
        <div className="text-slate-300">
          No jobs found. {isFiltering && "Click 'Add Job' to create a new job entry."}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 grid-flow-row gap-4">
          {filteredJobs.map(([company, jobTitle]) => {
            const originalJob = jobs.originalData.find(([name]) => name === company)?.[1];
            return (
              <Job
                key={company}
                company={company}
                jobTitle={jobTitle}
                originalJobTitle={originalJob}
                onUpdate={jobs.updateJob}
                onDelete={jobs.deleteJob}
              />
            );
          })}
        </div>
      )}
    </div>
  );
});

interface AddJobFormProps {
  onCancel: () => void;
  onSubmit: (company: string, jobTitle: string) => void;
}

const AddJobForm = function AddJobForm({ onCancel, onSubmit }: AddJobFormProps) {
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");

  // Get available job titles for the selected company
  const availableJobTitles = useMemo(() => {
    if (!company) return [];
    return Bitburner.COMPANY_JOBS[company] || [];
  }, [company]);

  // Reset job title when company changes
  useEffect(() => {
    setJobTitle("");
  }, [company]);

  const handleSubmit = useCallback<FormEventHandler>(
    (event) => {
      event.preventDefault();
      if (company && jobTitle) {
        onSubmit(company, jobTitle);
        setCompany("");
        setJobTitle("");
      }
    },
    [company, jobTitle, onSubmit]
  );

  // Get sorted list of companies
  const sortedCompanies = useMemo(() => {
    return Object.keys(Bitburner.COMPANY_JOBS).sort();
  }, []);

  return (
    <div className="mb-4 p-4 border border-green-700 rounded bg-gray-800">
      <h3 className="text-lg text-green-300 mb-3">Add New Job</h3>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex gap-3">
          <label className="flex-1 flex flex-col">
            <span className="text-sm text-slate-300 mb-1">Company Name</span>
            <select
              value={company}
              onChange={(e) => setCompany(e.currentTarget.value)}
              className="border border-gray-600 rounded px-3 py-2 bg-gray-900 text-white"
            >
              <option value="">-- Select a Company --</option>
              {sortedCompanies.map((companyName) => (
                <option key={companyName} value={companyName}>
                  {companyName}
                </option>
              ))}
            </select>
          </label>
          <label className="flex-1 flex flex-col">
            <span className="text-sm text-slate-300 mb-1">Job Title</span>
            <select
              value={jobTitle}
              onChange={(e) => setJobTitle(e.currentTarget.value)}
              disabled={!company}
              className="border border-gray-600 rounded px-3 py-2 bg-gray-900 text-white disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed"
            >
              <option value="">
                {company ? "-- Select a Job Title --" : "-- Select a Company First --"}
              </option>
              {availableJobTitles.map((title) => (
                <option key={title} value={title}>
                  {title}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!company || !jobTitle}
            className="px-4 py-2 rounded bg-green-700 hover:bg-green-600 text-white disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            Add Job
          </button>
        </div>
      </form>
    </div>
  );
};

interface JobProps extends PropsWithChildren<{}> {
  company: string;
  jobTitle: string;
  originalJobTitle?: string;
  onUpdate(company: string, jobTitle: string): void;
  onDelete(company: string): void;
}

const Job = function Job({ company, jobTitle, originalJobTitle, onUpdate, onDelete }: JobProps) {
  const [editing, setEditing] = useState(false);
  const [state, setState] = useState(jobTitle);
  const [pendingSave, setPendingSave] = useState(false);

  // Sync state when jobTitle prop changes
  useEffect(() => {
    setState(jobTitle);
  }, [jobTitle]);

  // Save when pendingSave flag is set
  useEffect(() => {
    if (pendingSave && editing && state.trim()) {
      onUpdate(company, state.trim());
      setPendingSave(false);
    }
  }, [pendingSave, editing, state, company, onUpdate]);

  // Check if job has changed from original
  const hasChanged = useMemo(() => {
    if (!originalJobTitle) return true; // New job
    const currentData = editing ? state : jobTitle;
    return currentData !== originalJobTitle;
  }, [originalJobTitle, jobTitle, state, editing]);

  const handleRevert = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    if (originalJobTitle) {
      onUpdate(company, originalJobTitle);
      setState(originalJobTitle);
    }
  }, [originalJobTitle, company, onUpdate]);

  const handleDelete = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    if (window.confirm(`Delete job at ${company}?`)) {
      onDelete(company);
    }
  }, [company, onDelete]);

  const onClickEnter = useCallback<MouseEventHandler<HTMLDivElement>>((event) => {
    setEditing(true);
    event.preventDefault();
  }, []);

  const onChange = useCallback<ChangeEventHandler<HTMLInputElement>>((event) => {
    setState(event.currentTarget.value);
    setPendingSave(true);
  }, []);

  const onClose = useCallback<FormEventHandler>(
    (event) => {
      setEditing(false);
      event.preventDefault();
    },
    []
  );

  return (
    <>
      <div
        className={clsx(
          "transition-colors duration-200 ease-in-out relative inline-flex flex-col p-2 rounded border shadow row-span-2 overflow-hidden",
          hasChanged ? "border-yellow-500 shadow-yellow-700" : "border-gray-700 shadow-green-700",
          "hover:bg-gray-800 focus-within:bg-gray-800",
          editing ? "z-20 h-auto" : "h-10",
          "bg-gray-800/50"
        )}
        onClick={!editing ? onClickEnter : undefined}
      >
        <form className="flex flex-col gap-2" data-id="job-section" onSubmit={onClose}>
          <header className="flex items-baseline justify-between">
            <h3 className="text-green-300 font-semibold">{company}</h3>
            <div className="flex items-center gap-2">
              {hasChanged && originalJobTitle && (
                <button
                  type="button"
                  onClick={handleRevert}
                  className="px-2 py-0.5 text-xs rounded bg-yellow-600 hover:bg-yellow-500 text-white"
                  title="Reset to original value"
                >
                  Reset
                </button>
              )}
              {!originalJobTitle && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-300">
                  New
                </span>
              )}
            </div>
          </header>
          <label className="flex items-center">
            <span className="mr-1 text-sm">Job Title: </span>
            {editing && (
              <Input
                disabled={!editing}
                onChange={onChange}
                value={state}
                type="text"
                className="flex-1"
              />
            )}
            {!editing && <p className="px-2 py-1 flex-1 text-sm">{state}</p>}
          </label>
          {editing && (
            <div className="flex gap-2 justify-end mt-2">
              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-1 text-xs rounded bg-red-700 hover:bg-red-600 text-white"
              >
                Delete
              </button>
              <button
                type="submit"
                className="px-3 py-1 text-xs rounded bg-green-700 hover:bg-green-600 text-white"
              >
                Done
              </button>
            </div>
          )}
          {!editing && (
            <button type="submit" className="hidden" />
          )}
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
