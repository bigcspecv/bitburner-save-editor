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
import { ascend, descend, sortWith } from "ramda";

import { FileContext } from "App";
import { Bitburner } from "bitburner.types";
import { Checkbox } from "components/inputs/checkbox";
import { Input } from "components/inputs/input";
import { useDebounce } from "util/hooks";

import { SortAscendingIcon, SortDescendingIcon } from "@heroicons/react/solid";
import { ReactComponent as SearchIcon } from "icons/search.svg";

interface Props extends PropsWithChildren<{}> {
  isFiltering?: boolean;
}

type AugmentationStatus = "none" | "installed" | "queued";

interface AugmentationData {
  name: string;
  level: number;
  status: AugmentationStatus;
}

export default observer(function AugmentationsSection({ isFiltering }: Props) {
  const { player } = useContext(FileContext);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 500);
  const [filters, setFilters] = useState<Partial<{ installed: boolean; queued: boolean; none: boolean; level: number }>>({
    level: -1,
  });

  // Special handling for NeuroFlux Governor
  const neurofluxData = useMemo(() => {
    const installed = player.data.augmentations?.filter((a) => a.name === "NeuroFlux Governor") || [];
    const queued = player.data.queuedAugmentations?.filter((a) => a.name === "NeuroFlux Governor") || [];
    const originalInstalled = player.originalData?.augmentations?.filter((a) => a.name === "NeuroFlux Governor") || [];
    const originalQueued = player.originalData?.queuedAugmentations?.filter((a) => a.name === "NeuroFlux Governor") || [];

    const maxInstalled = installed.length > 0 ? Math.max(...installed.map((a) => a.level)) : 0;
    const maxQueued = queued.length > 0 ? Math.max(...queued.map((a) => a.level)) : maxInstalled;
    const originalMaxInstalled = originalInstalled.length > 0 ? Math.max(...originalInstalled.map((a) => a.level)) : 0;
    const originalMaxQueued = originalQueued.length > 0 ? Math.max(...originalQueued.map((a) => a.level)) : originalMaxInstalled;

    return {
      installedLevel: maxInstalled,
      queuedLevel: maxQueued,
      originalInstalledLevel: originalMaxInstalled,
      originalQueuedLevel: originalMaxQueued,
      hasChanged: maxInstalled !== originalMaxInstalled || maxQueued !== originalMaxQueued,
    };
  }, [player.data.augmentations, player.data.queuedAugmentations, player.originalData]);

  // Build a comprehensive list of all augmentations with their status
  // We collect from both current and original save to show all aug that have ever been in the save
  // EXCLUDING NeuroFlux Governor which is handled separately
  const allAugmentations = useMemo(() => {
    const augMap = new Map<string, AugmentationData>();

    // First, add ALL augmentations from the static list with "none" status
    // Note: These use internal names like "NeuroFluxGovernor" which may not match save file names
    Bitburner.ALL_AUGMENTATIONS.forEach((augName) => {
      // Skip NeuroFlux variants - they're handled separately
      if (augName.includes("NeuroFlux")) return;
      augMap.set(augName, { name: augName, level: 0, status: "none" });
    });

    // Collect augmentation names from original save (to track what we started with)
    const originalAugNames = new Set<string>();
    if (player.originalData?.augmentations) {
      player.originalData.augmentations.forEach((aug) => {
        if (aug.name !== "NeuroFlux Governor") originalAugNames.add(aug.name);
      });
    }
    if (player.originalData?.queuedAugmentations) {
      player.originalData.queuedAugmentations.forEach((aug) => {
        if (aug.name !== "NeuroFlux Governor") originalAugNames.add(aug.name);
      });
    }

    // Add any augmentations from original save that aren't in our static list
    originalAugNames.forEach((name) => {
      if (!augMap.has(name)) {
        augMap.set(name, { name, level: 0, status: "none" });
      }
    });

    // Now process current save data to set actual status
    // Mark installed augmentations
    if (player.data.augmentations) {
      player.data.augmentations.forEach((aug) => {
        if (aug.name !== "NeuroFlux Governor") {
          augMap.set(aug.name, { name: aug.name, level: aug.level, status: "installed" });
        }
      });
    }

    // Mark queued augmentations
    if (player.data.queuedAugmentations) {
      player.data.queuedAugmentations.forEach((aug) => {
        if (aug.name !== "NeuroFlux Governor") {
          augMap.set(aug.name, { name: aug.name, level: aug.level, status: "queued" });
        }
      });
    }

    return Array.from(augMap.values());
  }, [player.data.augmentations, player.data.queuedAugmentations, player.originalData]);

  const filteredAugmentations = useMemo(() => {
    let filtered = allAugmentations.filter((aug) => {
      // Status filters
      const statusMatch =
        (!filters.installed || aug.status === "installed") &&
        (!filters.queued || aug.status === "queued") &&
        (!filters.none || aug.status === "none");

      if (!statusMatch) return false;

      // Search filter
      const searchMatch = debouncedQuery.length === 0 || aug.name.toLowerCase().indexOf(debouncedQuery.toLowerCase()) >= 0;

      return searchMatch;
    });

    // Sort by level if enabled
    if (filters.level) {
      return sortWith(
        [filters.level > 0 ? ascend((aug) => aug.level) : descend((aug) => aug.level)],
        filtered
      );
    }

    return filtered;
  }, [allAugmentations, filters, debouncedQuery]);

  const onSubmit = useCallback(
    (augName: string, status: AugmentationStatus, level: number) => {
      // Check if we're resetting to the original state
      const originalInstalled = player.originalData?.augmentations?.find((a) => a.name === augName);
      const originalQueued = player.originalData?.queuedAugmentations?.find((a) => a.name === augName);
      const originalStatus: AugmentationStatus = originalInstalled ? "installed" : originalQueued ? "queued" : "none";
      const originalLevel = originalInstalled?.level ?? originalQueued?.level ?? 0;

      const isResettingToOriginal = status === originalStatus && level === originalLevel;

      console.log(`Augmentation ${augName}: resetting to original? ${isResettingToOriginal} (status: ${status}/${originalStatus}, level: ${level}/${originalLevel})`);

      // If resetting to original and no other changes have been made, use original arrays directly
      if (isResettingToOriginal) {
        // Check if current arrays match original except for this one augmentation
        const currentMatchesOriginalExceptThisAug =
          player.data.augmentations?.filter(a => a.name !== augName).length ===
          player.originalData?.augmentations?.filter(a => a.name !== augName).length &&
          player.data.queuedAugmentations?.filter(a => a.name !== augName).length ===
          player.originalData?.queuedAugmentations?.filter(a => a.name !== augName).length;

        if (currentMatchesOriginalExceptThisAug && player.originalData?.augmentations && player.originalData?.queuedAugmentations) {
          console.log(`Using ORIGINAL arrays directly for ${augName} reset`);
          player.updatePlayer({
            augmentations: player.originalData.augmentations,
            queuedAugmentations: player.originalData.queuedAugmentations,
          });
          return;
        }
      }

      // Otherwise, rebuild the arrays with the change
      const installedAugs = [...(player.data.augmentations || [])];
      const queuedAugs = [...(player.data.queuedAugmentations || [])];

      const installedIndex = installedAugs.findIndex((a) => a.name === augName);
      const queuedIndex = queuedAugs.findIndex((a) => a.name === augName);

      // If already in correct array with correct level, just update in place to preserve order
      if (status === "installed" && installedIndex >= 0) {
        installedAugs[installedIndex] = { name: augName, level };
        // Remove from queued if it was there
        if (queuedIndex >= 0) queuedAugs.splice(queuedIndex, 1);
      } else if (status === "queued" && queuedIndex >= 0) {
        queuedAugs[queuedIndex] = { name: augName, level };
        // Remove from installed if it was there
        if (installedIndex >= 0) installedAugs.splice(installedIndex, 1);
      } else {
        // Need to move/add the augmentation
        // Remove from both arrays first
        if (installedIndex >= 0) installedAugs.splice(installedIndex, 1);
        if (queuedIndex >= 0) queuedAugs.splice(queuedIndex, 1);

        // Add to appropriate array based on status
        if (status === "installed") {
          installedAugs.push({ name: augName, level });
        } else if (status === "queued") {
          queuedAugs.push({ name: augName, level });
        }
        // If status is "none", we don't add it to either array (it's removed above)
      }

      console.log(`Augmentation ${augName} updated to status: ${status}, installed count: ${installedAugs.length}, queued count: ${queuedAugs.length}`);

      player.updatePlayer({
        augmentations: installedAugs,
        queuedAugmentations: queuedAugs,
      });
    },
    [player]
  );

  const onUpdateNeuroFlux = useCallback(
    (installedLevel: number, queuedLevel: number) => {
      console.log(`NeuroFlux update called: installedLevel=${installedLevel}, queuedLevel=${queuedLevel}`);
      console.log(`BEFORE filter - player.data.augmentations length: ${player.data.augmentations?.length || 0}`);
      console.log(`BEFORE filter - player.data.queuedAugmentations length: ${player.data.queuedAugmentations?.length || 0}`);
      console.log(`ORIGINAL - player.originalData.augmentations length: ${player.originalData?.augmentations?.length || 0}`);
      console.log(`ORIGINAL - player.originalData.queuedAugmentations length: ${player.originalData?.queuedAugmentations?.length || 0}`);

      // Determine which arrays to use as source based on whether we're resetting or updating
      const originalInstalledLevel = player.originalData?.augmentations?.filter(a => a.name === "NeuroFlux Governor").reduce((max, a) => Math.max(max, a.level), 0) || 0;
      const originalQueuedLevel = player.originalData?.queuedAugmentations?.filter(a => a.name === "NeuroFlux Governor").reduce((max, a) => Math.max(max, a.level), originalInstalledLevel) || originalInstalledLevel;
      const isResetting = installedLevel === originalInstalledLevel && queuedLevel === originalQueuedLevel;

      console.log(`Resetting? ${isResetting} (requested: ${installedLevel}/${queuedLevel}, original: ${originalInstalledLevel}/${originalQueuedLevel})`);

      // If resetting to original values, just use the original arrays directly!
      if (isResetting && player.originalData?.augmentations && player.originalData?.queuedAugmentations) {
        console.log(`Using ORIGINAL arrays directly (no rebuilding)`);
        player.updatePlayer({
          augmentations: player.originalData.augmentations,
          queuedAugmentations: player.originalData.queuedAugmentations,
        });
        return;
      }

      // If not resetting, use current data as source
      const sourceInstalledAugs = player.data.augmentations || [];
      const sourceQueuedAugs = player.data.queuedAugmentations || [];

      console.log(`Using CURRENT arrays as source (rebuilding with new NeuroFlux levels)`);

      // Build new installed augmentations array
      // NOTE: Installed NeuroFlux is stored as a SINGLE entry with the max level
      const installedAugs = [];
      let neuroFluxInserted = false;

      for (let i = 0; i < sourceInstalledAugs.length; i++) {
        const aug = sourceInstalledAugs[i];

        if (aug.name === "NeuroFlux Governor") {
          // Skip - we'll insert NeuroFlux at the position of the first one
          if (!neuroFluxInserted && installedLevel > 0) {
            // Insert a SINGLE entry with the max level
            installedAugs.push({ name: "NeuroFlux Governor", level: installedLevel });
            neuroFluxInserted = true;
          }
        } else {
          // Create a proper copy of the augmentation to avoid reference issues
          installedAugs.push({ ...aug });
        }
      }

      // If there were no NeuroFlux entries but we need to add some, append to end
      if (!neuroFluxInserted && installedLevel > 0) {
        installedAugs.push({ name: "NeuroFlux Governor", level: installedLevel });
      }

      // Build new queued augmentations array
      // NOTE: Queued NeuroFlux is stored as MULTIPLE entries, one for each level!
      const queuedAugs = [];
      neuroFluxInserted = false;

      for (let i = 0; i < sourceQueuedAugs.length; i++) {
        const aug = sourceQueuedAugs[i];

        if (aug.name === "NeuroFlux Governor") {
          // Skip - we'll insert NeuroFlux at the position of the first one
          if (!neuroFluxInserted && queuedLevel > installedLevel) {
            // Insert MULTIPLE entries, one for each level from installedLevel+1 to queuedLevel
            for (let level = installedLevel + 1; level <= queuedLevel; level++) {
              queuedAugs.push({ name: "NeuroFlux Governor", level });
            }
            neuroFluxInserted = true;
          }
        } else {
          // Create a proper copy of the augmentation to avoid reference issues
          queuedAugs.push({ ...aug });
        }
      }

      // If there were no NeuroFlux entries but we need to add some, append to end
      if (!neuroFluxInserted && queuedLevel > installedLevel) {
        for (let level = installedLevel + 1; level <= queuedLevel; level++) {
          queuedAugs.push({ name: "NeuroFlux Governor", level });
        }
      }

      console.log(`AFTER filter - installedAugs length (non-NeuroFlux): ${installedAugs.filter(a => a.name !== "NeuroFlux Governor").length}`);
      console.log(`AFTER filter - queuedAugs length (non-NeuroFlux): ${queuedAugs.filter(a => a.name !== "NeuroFlux Governor").length}`);
      console.log(`FINAL - installedAugs length: ${installedAugs.length}, queuedAugs length: ${queuedAugs.length}`);

      player.updatePlayer({
        augmentations: installedAugs,
        queuedAugmentations: queuedAugs,
      });
    },
    [player]
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

      setFilters((f) => ({
        ...f,
        [property]: !f[property] ? -1 : f[property] > 0 ? -1 : 1,
      }));
    }
  }, []);

  return (
    <div>
      {/* NeuroFlux Governor Special Section */}
      <div className="mb-8">
        <h3 className="text-xl font-bold text-green-300 mb-4">NeuroFlux Governor</h3>
        <NeuroFluxGovernor
          installedLevel={neurofluxData.installedLevel}
          queuedLevel={neurofluxData.queuedLevel}
          originalInstalledLevel={neurofluxData.originalInstalledLevel}
          originalQueuedLevel={neurofluxData.originalQueuedLevel}
          hasChanged={neurofluxData.hasChanged}
          onUpdate={onUpdateNeuroFlux}
        />
      </div>

      {/* Regular Augmentations */}
      <h3 className="text-xl font-bold text-green-300 mb-4">Other Augmentations</h3>
      {isFiltering && (
        <>
          <div className="mb-4 flex gap-4 flex-wrap">
            <label className="flex items-center">
              <SearchIcon className="h-6 w-6 text-slate-500" />
              <Input
                className="border-b border-green-900"
                onChange={(e) => setQuery(e.currentTarget.value)}
                value={query}
                type="text"
                placeholder="Search Augmentations..."
              />
            </label>
            <label className="inline-flex items-center text-slate-100">
              <Checkbox onChange={onEditFilters} data-key="installed" checked={filters.installed ?? false} />
              <span className="ml-2">Installed</span>
            </label>
            <label className="inline-flex items-center text-slate-100">
              <Checkbox onChange={onEditFilters} data-key="queued" checked={filters.queued ?? false} />
              <span className="ml-2">Queued</span>
            </label>
            <label className="inline-flex items-center text-slate-100">
              <Checkbox onChange={onEditFilters} data-key="none" checked={filters.none ?? false} />
              <span className="ml-2">Not Owned</span>
            </label>
          </div>
          <div className="mb-4 flex gap-4">
            <button
              className={clsx("flex items-center justify-center", !filters.level && "opacity-25")}
              data-key="level"
              onClick={onEditFilters}
            >
              {filters.level > 0 ? <SortAscendingIcon className="h-6 w-6" /> : <SortDescendingIcon className="h-6 w-6" />}
              <span className="ml-2">Level</span>
            </button>
          </div>
        </>
      )}
      {filteredAugmentations.length === 0 ? (
        <div className="text-slate-300">No augmentations found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 grid-flow-row gap-4">
          {filteredAugmentations.map((aug) => {
            const originalInstalled = player.originalData?.augmentations?.find((a) => a.name === aug.name);
            const originalQueued = player.originalData?.queuedAugmentations?.find((a) => a.name === aug.name);
            const originalStatus: AugmentationStatus = originalInstalled
              ? "installed"
              : originalQueued
              ? "queued"
              : "none";
            const originalLevel = originalInstalled?.level ?? originalQueued?.level ?? 0;

            return (
              <Augmentation
                key={aug.name}
                name={aug.name}
                level={aug.level}
                status={aug.status}
                originalStatus={originalStatus}
                originalLevel={originalLevel}
                onSubmit={onSubmit}
              />
            );
          })}
        </div>
      )}
    </div>
  );
});

interface AugmentationProps extends PropsWithChildren<{}> {
  name: string;
  level: number;
  status: AugmentationStatus;
  originalStatus: AugmentationStatus;
  originalLevel: number;
  onSubmit(name: string, status: AugmentationStatus, level: number): void;
}

const Augmentation = function Augmentation({
  name,
  level,
  status,
  originalStatus,
  originalLevel,
  onSubmit,
}: AugmentationProps) {
  const [editing, setEditing] = useState(false);
  const [state, setState] = useState({ status, level });
  const [pendingSave, setPendingSave] = useState(false);

  // Sync state when props change
  useEffect(() => {
    setState({ status, level });
  }, [status, level]);

  // Save when pendingSave flag is set
  useEffect(() => {
    if (pendingSave && editing) {
      const finalLevel = Math.max(1, Math.min(Number.MAX_SAFE_INTEGER, Number(state.level)));
      onSubmit(name, state.status, finalLevel);
      setPendingSave(false);
    }
  }, [pendingSave, editing, state, name, onSubmit]);

  // Check if augmentation has changed from original
  // Only status matters since level is always 1 for regular augmentations
  const hasChanged = useMemo(() => {
    const currentStatus = editing ? state.status : status;
    return currentStatus !== originalStatus;
  }, [editing, state.status, status, originalStatus]);

  const handleRevert = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      onSubmit(name, originalStatus, originalLevel);
      setState({ status: originalStatus, level: originalLevel });
    },
    [name, originalStatus, originalLevel, onSubmit]
  );

  const onClickEnter = useCallback<MouseEventHandler<HTMLDivElement>>((event) => {
    setEditing(true);
    event.preventDefault();
  }, []);

  const onStatusChange = useCallback<ChangeEventHandler<HTMLSelectElement>>(
    (event) => {
      const { value } = event.currentTarget;
      const newStatus = value as AugmentationStatus;
      // Level is always 1 for regular augmentations, 0 for none
      setState((s) => ({ ...s, status: newStatus, level: newStatus === "none" ? 0 : 1 }));
      setPendingSave(true);
      event.stopPropagation();
    },
    []
  );

  const onClose = useCallback<FormEventHandler>(
    (event) => {
      setEditing(false);
      event.preventDefault();
    },
    []
  );

  const hasValues = state.status !== "none";

  return (
    <>
      <div
        className={clsx(
          "transition-colors duration-200 ease-in-out relative inline-flex flex-col p-2 rounded border shadow row-span-2 h-10 overflow-hidden",
          hasChanged ? "border-yellow-500 shadow-yellow-700" : "border-gray-700 shadow-green-700",
          "hover:bg-gray-800 focus-within:bg-gray-800",
          editing && "z-20 h-auto",
          hasValues && !editing && "bg-gray-800/50"
        )}
        onClick={!editing ? onClickEnter : undefined}
      >
        <form className="grid grid-cols-2 gap-1" data-id="augmentation-section" onSubmit={onClose}>
          <header className="col-span-2 flex items-baseline justify-between">
            <h3 className={clsx("tracking-wide text-sm", hasValues ? "text-green-300" : "text-green-100")} title={name}>
              {name}
            </h3>
            <div className="flex items-center gap-2">
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
          <label
            className={clsx("flex items-center gap-2", editing ? "col-span-2 mb-2" : "col-span-2")}
            onClick={(e) => e.stopPropagation()}
          >
            {editing && <span className="text-sm text-slate-300">Status:</span>}
            <select
              value={state.status}
              onChange={onStatusChange}
              className={clsx(
                "text-slate-100 px-2 py-1 rounded border outline-none cursor-pointer",
                editing
                  ? "flex-1 bg-gray-900 border-gray-700 hover:bg-gray-800 focus:bg-gray-800"
                  : "bg-gray-900 border-transparent text-xs"
              )}
            >
              <option value="none" className="bg-gray-900 text-slate-100">
                None
              </option>
              <option value="queued" className="bg-gray-900 text-slate-100">
                Queued
              </option>
              <option value="installed" className="bg-gray-900 text-slate-100">
                Installed
              </option>
            </select>
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

// NeuroFlux Governor Component
interface NeuroFluxGovernorProps {
  installedLevel: number;
  queuedLevel: number;
  originalInstalledLevel: number;
  originalQueuedLevel: number;
  hasChanged: boolean;
  onUpdate(installedLevel: number, queuedLevel: number): void;
}

const NeuroFluxGovernor = function NeuroFluxGovernor({
  installedLevel,
  queuedLevel,
  originalInstalledLevel,
  originalQueuedLevel,
  hasChanged,
  onUpdate,
}: NeuroFluxGovernorProps) {
  const [editing, setEditing] = useState(false);
  const [state, setState] = useState({ installedLevel, queuedLevel });

  // Sync state when props change from outside (e.g., after update or revert)
  useEffect(() => {
    setState({ installedLevel, queuedLevel });
  }, [installedLevel, queuedLevel]);

  // Check if current state differs from saved values
  const hasLocalChanges = useMemo(
    () => state.installedLevel !== installedLevel || state.queuedLevel !== queuedLevel,
    [state.installedLevel, state.queuedLevel, installedLevel, queuedLevel]
  );

  const handleUpdate = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      const finalInstalled = Math.max(0, Math.min(10000, Number(state.installedLevel)));
      const finalQueued = Math.max(finalInstalled, Math.min(10000, Number(state.queuedLevel)));
      onUpdate(finalInstalled, finalQueued);
      setEditing(false);
    },
    [state.installedLevel, state.queuedLevel, onUpdate]
  );

  const handleRevert = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      onUpdate(originalInstalledLevel, originalQueuedLevel);
      setState({ installedLevel: originalInstalledLevel, queuedLevel: originalQueuedLevel });
      setEditing(false);
    },
    [originalInstalledLevel, originalQueuedLevel, onUpdate]
  );

  const handleCancel = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      setState({ installedLevel, queuedLevel });
      setEditing(false);
    },
    [installedLevel, queuedLevel]
  );

  const onClickEnter = useCallback<MouseEventHandler<HTMLDivElement>>((event) => {
    setEditing(true);
    event.preventDefault();
  }, []);

  const onInstalledChange = useCallback<ChangeEventHandler<HTMLInputElement>>((event) => {
    const value = Number(event.currentTarget.value);
    setState((s) => ({ ...s, installedLevel: value, queuedLevel: Math.max(value, s.queuedLevel) }));
  }, []);

  const onQueuedChange = useCallback<ChangeEventHandler<HTMLInputElement>>((event) => {
    const value = Number(event.currentTarget.value);
    setState((s) => ({ ...s, queuedLevel: Math.max(s.installedLevel, value) }));
  }, []);

  const onClose = useCallback<FormEventHandler>(
    (event) => {
      // Don't close if there are unsaved changes - require explicit action
      event.preventDefault();
    },
    []
  );

  const hasValues = state.installedLevel > 0 || state.queuedLevel > 0;

  return (
    <>
      <div
        className={clsx(
          "transition-colors duration-200 ease-in-out relative inline-flex flex-col p-4 rounded border shadow overflow-hidden max-w-2xl",
          hasChanged ? "border-yellow-500 shadow-yellow-700" : "border-gray-700 shadow-green-700",
          "hover:bg-gray-800 focus-within:bg-gray-800",
          editing && "z-20",
          hasValues && !editing && "bg-gray-800/50"
        )}
        onClick={!editing ? onClickEnter : undefined}
      >
        <form className="flex flex-col gap-4" data-id="neuroflux-section" onSubmit={onClose}>
          <div className="flex items-baseline justify-between">
            <p className="text-sm text-slate-300">
              NeuroFlux Governor is unique - each level is a separate augmentation entry in the save file.
            </p>
            {hasChanged && (
              <button
                type="button"
                onClick={handleRevert}
                className="ml-4 px-2 py-0.5 text-xs rounded bg-yellow-600 hover:bg-yellow-500 text-white flex-shrink-0"
                title="Reset to original value"
              >
                Reset
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col">
              <span className="text-sm text-green-300 mb-1">Installed up to Level:</span>
              {editing ? (
                <Input
                  onChange={onInstalledChange}
                  value={`${state.installedLevel}`}
                  type="number"
                  min="0"
                  max="10000"
                  className="bg-gray-900 border border-gray-700 rounded px-2 py-1"
                />
              ) : (
                <span className="text-2xl font-bold text-green-100">{state.installedLevel}</span>
              )}
              {!editing && state.installedLevel > 0 && (
                <span className="text-xs text-slate-400 mt-1">Levels 1-{state.installedLevel}</span>
              )}
            </label>

            <label className="flex flex-col">
              <span className="text-sm text-yellow-300 mb-1">Queued up to Level:</span>
              {editing ? (
                <Input
                  onChange={onQueuedChange}
                  value={`${state.queuedLevel}`}
                  type="number"
                  min={state.installedLevel}
                  max="10000"
                  className="bg-gray-900 border border-gray-700 rounded px-2 py-1"
                />
              ) : (
                <span className="text-2xl font-bold text-yellow-100">{state.queuedLevel}</span>
              )}
              {!editing && state.queuedLevel > state.installedLevel && (
                <span className="text-xs text-slate-400 mt-1">
                  Levels {state.installedLevel + 1}-{state.queuedLevel}
                </span>
              )}
            </label>
          </div>

          {editing && hasLocalChanges && (
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-sm rounded bg-gray-700 hover:bg-gray-600 text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdate}
                className="px-4 py-2 text-sm rounded bg-green-600 hover:bg-green-500 text-white"
              >
                Update
              </button>
            </div>
          )}

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
