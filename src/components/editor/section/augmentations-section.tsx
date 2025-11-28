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

interface ConfirmationDialog {
  augName: string;
  newStatus: AugmentationStatus;
  newLevel: number;
  affectedAugmentations: Array<{
    name: string;
    currentStatus: AugmentationStatus;
    newStatus: AugmentationStatus;
  }>;
}

export default observer(function AugmentationsSection({ isFiltering }: Props) {
  const { player } = useContext(FileContext);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 500);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmationDialog | null>(null);
  const [filters, setFilters] = useState<Partial<{
    installed: boolean;
    queued: boolean;
    none: boolean;
    level: number;
    // Effect filters
    hacking: boolean;
    strength: boolean;
    defense: boolean;
    dexterity: boolean;
    agility: boolean;
    charisma: boolean;
    company_rep: boolean;
    faction_rep: boolean;
    crime: boolean;
    hacknet: boolean;
    bladeburner: boolean;
  }>>({
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
    // Use the display name from AUGMENTATION_DATA if available
    Bitburner.ALL_AUGMENTATIONS.forEach((augName) => {
      // Skip NeuroFlux variants - they're handled separately
      if (augName.includes("NeuroFlux")) return;

      // Try to get the proper display name from AUGMENTATION_DATA
      const augData = Bitburner.AUGMENTATION_DATA[augName];
      const displayName = augData?.name || augName;

      augMap.set(displayName, { name: displayName, level: 0, status: "none" });
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

      if (!searchMatch) return false;

      // Effect filters - check if augmentation has the selected effects
      // First try direct key lookup (without spaces)
      let augData = Bitburner.AUGMENTATION_DATA[aug.name.replace(/\s+/g, "")];
      // If not found, search by matching the name property
      if (!augData) {
        augData = Object.values(Bitburner.AUGMENTATION_DATA).find(
          (a) => a.name === aug.name
        );
      }
      if (!augData) return true; // If no data, don't filter out

      const effectsMatch =
        (!filters.hacking ||
          augData.multipliers.hacking ||
          augData.multipliers.hacking_exp ||
          augData.multipliers.hacking_chance ||
          augData.multipliers.hacking_speed ||
          augData.multipliers.hacking_money ||
          augData.multipliers.hacking_grow) &&
        (!filters.strength || augData.multipliers.strength || augData.multipliers.strength_exp) &&
        (!filters.defense || augData.multipliers.defense || augData.multipliers.defense_exp) &&
        (!filters.dexterity || augData.multipliers.dexterity || augData.multipliers.dexterity_exp) &&
        (!filters.agility || augData.multipliers.agility || augData.multipliers.agility_exp) &&
        (!filters.charisma || augData.multipliers.charisma || augData.multipliers.charisma_exp) &&
        (!filters.company_rep || augData.multipliers.company_rep) &&
        (!filters.faction_rep || augData.multipliers.faction_rep) &&
        (!filters.crime || augData.multipliers.crime_money || augData.multipliers.crime_success) &&
        (!filters.hacknet ||
          augData.multipliers.hacknet_node_money ||
          augData.multipliers.hacknet_node_purchase_cost ||
          augData.multipliers.hacknet_node_ram_cost ||
          augData.multipliers.hacknet_node_core_cost ||
          augData.multipliers.hacknet_node_level_cost) &&
        (!filters.bladeburner ||
          augData.multipliers.bladeburner_max_stamina ||
          augData.multipliers.bladeburner_stamina_gain ||
          augData.multipliers.bladeburner_analysis ||
          augData.multipliers.bladeburner_success_chance);

      return effectsMatch;
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

  // Helper function to calculate the impact of changing an augmentation's status
  const calculateImpact = useCallback(
    (augName: string, newStatus: AugmentationStatus): Array<{
      name: string;
      currentStatus: AugmentationStatus;
      newStatus: AugmentationStatus;
    }> => {
      const affected: Array<{
        name: string;
        currentStatus: AugmentationStatus;
        newStatus: AugmentationStatus;
      }> = [];

      // Only need to check for impacts if we're downgrading or removing
      if (newStatus !== "installed") {
        const installedAugs = player.data.augmentations || [];
        const queuedAugs = player.data.queuedAugmentations || [];

        // Find all augmentations that have this one as a prerequisite
        const dependentAugs = Bitburner.ALL_AUGMENTATIONS.filter((otherAugName) => {
          if (otherAugName === augName || otherAugName.includes("NeuroFlux")) return false;
          const otherAugData = Bitburner.AUGMENTATION_DATA[otherAugName];
          if (!otherAugData || !otherAugData.prereqs) return false;

          // Check if this augmentation is in the prerequisites (match both key and display name)
          const augData = Bitburner.AUGMENTATION_DATA[augName.replace(/\s+/g, "")] ||
                          Object.values(Bitburner.AUGMENTATION_DATA).find(a => a.name === augName);
          const augKey = Object.keys(Bitburner.AUGMENTATION_DATA).find(
            key => Bitburner.AUGMENTATION_DATA[key] === augData
          );

          return otherAugData.prereqs.some(prereq => prereq === augKey || prereq === augName);
        });

        // For each dependent augmentation, calculate what would happen
        dependentAugs.forEach((depAugName) => {
          const depAugData = Bitburner.AUGMENTATION_DATA[depAugName];
          const depDisplayName = depAugData?.name || depAugName;

          const isInstalled = installedAugs.some(
            a => a.name === depAugName || a.name === depDisplayName
          );
          const isQueued = queuedAugs.some(
            a => a.name === depAugName || a.name === depDisplayName
          );

          if (isInstalled) {
            if (newStatus === "queued") {
              affected.push({
                name: depDisplayName,
                currentStatus: "installed",
                newStatus: "queued"
              });
            } else if (newStatus === "none") {
              affected.push({
                name: depDisplayName,
                currentStatus: "installed",
                newStatus: "none"
              });
            }
          } else if (isQueued && newStatus === "none") {
            affected.push({
              name: depDisplayName,
              currentStatus: "queued",
              newStatus: "none"
            });
          }
        });
      }

      return affected;
    },
    [player.data.augmentations, player.data.queuedAugmentations]
  );

  const applyChange = useCallback(
    (augName: string, status: AugmentationStatus, level: number, onCancel?: () => void, skipConfirmation = false) => {
      // Calculate impact
      const affectedAugs = calculateImpact(augName, status);

      // If there are affected augmentations and we haven't confirmed yet, show dialog
      if (affectedAugs.length > 0 && !skipConfirmation) {
        setConfirmDialog({
          augName,
          newStatus: status,
          newLevel: level,
          affectedAugmentations: affectedAugs
        });
        // Store the cancel callback to invoke if user cancels
        (window as any).__augmentationCancelCallback = onCancel;
        return;
      }

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

      // Apply cascade changes if confirmed (skipConfirmation means user confirmed or no affected augs)
      if (skipConfirmation && affectedAugs.length > 0) {
        affectedAugs.forEach((affected) => {
          const depInstalledIdx = installedAugs.findIndex(
            a => a.name === affected.name
          );
          const depQueuedIdx = queuedAugs.findIndex(
            a => a.name === affected.name
          );

          if (affected.currentStatus === "installed" && depInstalledIdx >= 0) {
            if (affected.newStatus === "queued") {
              console.log(`Downgrading ${affected.name} from installed to queued (prerequisite ${augName} is only queued)`);
              const aug = installedAugs[depInstalledIdx];
              installedAugs.splice(depInstalledIdx, 1);
              queuedAugs.push(aug);
            } else if (affected.newStatus === "none") {
              console.log(`Removing ${affected.name} (prerequisite ${augName} was removed)`);
              installedAugs.splice(depInstalledIdx, 1);
            }
          } else if (affected.currentStatus === "queued" && depQueuedIdx >= 0 && affected.newStatus === "none") {
            console.log(`Removing ${affected.name} (prerequisite ${augName} was removed)`);
            queuedAugs.splice(depQueuedIdx, 1);
          }
        });
      }

      player.updatePlayer({
        augmentations: installedAugs,
        queuedAugmentations: queuedAugs,
      });
    },
    [player, calculateImpact]
  );

  const onSubmit = useCallback(
    (augName: string, status: AugmentationStatus, level: number, onCancel?: () => void) => {
      applyChange(augName, status, level, onCancel, false);
    },
    [applyChange]
  );

  const handleConfirmChange = useCallback(() => {
    if (confirmDialog) {
      applyChange(confirmDialog.augName, confirmDialog.newStatus, confirmDialog.newLevel, undefined, true);
      setConfirmDialog(null);
      // Clear the cancel callback
      delete (window as any).__augmentationCancelCallback;
    }
  }, [confirmDialog, applyChange]);

  const handleCancelChange = useCallback(() => {
    // Call the cancel callback if it exists
    const cancelCallback = (window as any).__augmentationCancelCallback;
    if (cancelCallback) {
      cancelCallback();
      delete (window as any).__augmentationCancelCallback;
    }
    setConfirmDialog(null);
  }, []);

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
          </div>

          {/* Status Filters */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-green-300 mb-2">Status</h4>
            <div className="flex gap-4 flex-wrap">
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
          </div>

          {/* Effect Filters */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-green-300 mb-2">Filter by Effects</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <label className="inline-flex items-center text-slate-100">
                <Checkbox onChange={onEditFilters} data-key="hacking" checked={filters.hacking ?? false} />
                <span className="ml-2">Hacking</span>
              </label>
              <label className="inline-flex items-center text-slate-100">
                <Checkbox onChange={onEditFilters} data-key="strength" checked={filters.strength ?? false} />
                <span className="ml-2">Strength</span>
              </label>
              <label className="inline-flex items-center text-slate-100">
                <Checkbox onChange={onEditFilters} data-key="defense" checked={filters.defense ?? false} />
                <span className="ml-2">Defense</span>
              </label>
              <label className="inline-flex items-center text-slate-100">
                <Checkbox onChange={onEditFilters} data-key="dexterity" checked={filters.dexterity ?? false} />
                <span className="ml-2">Dexterity</span>
              </label>
              <label className="inline-flex items-center text-slate-100">
                <Checkbox onChange={onEditFilters} data-key="agility" checked={filters.agility ?? false} />
                <span className="ml-2">Agility</span>
              </label>
              <label className="inline-flex items-center text-slate-100">
                <Checkbox onChange={onEditFilters} data-key="charisma" checked={filters.charisma ?? false} />
                <span className="ml-2">Charisma</span>
              </label>
              <label className="inline-flex items-center text-slate-100">
                <Checkbox onChange={onEditFilters} data-key="company_rep" checked={filters.company_rep ?? false} />
                <span className="ml-2">Company Rep</span>
              </label>
              <label className="inline-flex items-center text-slate-100">
                <Checkbox onChange={onEditFilters} data-key="faction_rep" checked={filters.faction_rep ?? false} />
                <span className="ml-2">Faction Rep</span>
              </label>
              <label className="inline-flex items-center text-slate-100">
                <Checkbox onChange={onEditFilters} data-key="crime" checked={filters.crime ?? false} />
                <span className="ml-2">Crime</span>
              </label>
              <label className="inline-flex items-center text-slate-100">
                <Checkbox onChange={onEditFilters} data-key="hacknet" checked={filters.hacknet ?? false} />
                <span className="ml-2">Hacknet</span>
              </label>
              <label className="inline-flex items-center text-slate-100">
                <Checkbox onChange={onEditFilters} data-key="bladeburner" checked={filters.bladeburner ?? false} />
                <span className="ml-2">Bladeburner</span>
              </label>
            </div>
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
                onCalculateImpact={(augName, newStatus) => calculateImpact(augName, newStatus).length}
                installedAugmentations={player.data.augmentations || []}
                queuedAugmentations={player.data.queuedAugmentations || []}
              />
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={handleCancelChange}
          />

          {/* Dialog */}
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-gray-900 border-2 border-yellow-500 rounded-lg shadow-2xl p-6 max-w-2xl w-full mx-4">
            <h3 className="text-xl font-bold text-yellow-300 mb-4">
              Confirm Prerequisite Change
            </h3>

            <div className="text-slate-100 mb-4">
              <p className="mb-2">
                Changing <span className="font-semibold text-green-300">{confirmDialog.augName}</span> to{" "}
                <span className="font-semibold text-green-300">{confirmDialog.newStatus}</span> will affect the following augmentations:
              </p>

              <div className="bg-gray-800 rounded p-4 max-h-64 overflow-y-auto">
                {confirmDialog.affectedAugmentations.map((affected, index) => (
                  <div key={index} className="mb-2 pb-2 border-b border-gray-700 last:border-b-0">
                    <div className="font-semibold text-slate-200">{affected.name}</div>
                    <div className="text-sm text-slate-400">
                      Status: <span className="text-yellow-400">{affected.currentStatus}</span>
                      {" → "}
                      <span className={affected.newStatus === "none" ? "text-red-400" : "text-yellow-400"}>
                        {affected.newStatus}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4 justify-end">
              <button
                onClick={handleCancelChange}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmChange}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded transition-colors"
              >
                Confirm Changes
              </button>
            </div>
          </div>
        </>
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
  onSubmit(name: string, status: AugmentationStatus, level: number, onCancel?: () => void): void;
  onCalculateImpact(name: string, newStatus: AugmentationStatus): number; // Returns count of affected augmentations
  installedAugmentations: Array<{ name: string; level: number }>;
  queuedAugmentations: Array<{ name: string; level: number }>;
}

const Augmentation = function Augmentation({
  name,
  level,
  status,
  originalStatus,
  originalLevel,
  onSubmit,
  onCalculateImpact,
  installedAugmentations,
  queuedAugmentations,
}: AugmentationProps) {
  const [editing, setEditing] = useState(false);
  const [state, setState] = useState({ status, level });
  const [pendingSave, setPendingSave] = useState(false);
  const [pendingRevert, setPendingRevert] = useState(false);
  const [pendingResetTarget, setPendingResetTarget] = useState<{ status: AugmentationStatus; level: number } | null>(null);

  // Get augmentation data
  const augData = useMemo(() => {
    // First try direct key lookup (without spaces)
    const directLookup = Bitburner.AUGMENTATION_DATA[name.replace(/\s+/g, "")];
    if (directLookup) return directLookup;

    // If not found, search by matching the name property
    const entry = Object.values(Bitburner.AUGMENTATION_DATA).find(
      (aug) => aug.name === name
    );
    return entry;
  }, [name]);

  // Sync state when props change
  useEffect(() => {
    setState({ status, level });

    // If we had a pending reset and the props now match the target, clear it
    if (pendingResetTarget && status === pendingResetTarget.status && level === pendingResetTarget.level) {
      setPendingResetTarget(null);
    }
  }, [status, level, pendingResetTarget]);

  // Revert UI state when user cancels
  useEffect(() => {
    if (pendingRevert) {
      setState({ status, level });
      setPendingRevert(false);
    }
  }, [pendingRevert, status, level]);

  // Save when pendingSave flag is set
  useEffect(() => {
    if (pendingSave) {
      const finalLevel = Math.max(1, Math.min(Number.MAX_SAFE_INTEGER, Number(state.level)));
      const handleCancel = () => {
        setPendingRevert(true);
      };
      onSubmit(name, state.status, finalLevel, handleCancel);
      setPendingSave(false);
    }
  }, [pendingSave, state, name, onSubmit]);

  // Check if augmentation has changed from original
  // Only status matters since level is always 1 for regular augmentations
  const hasChanged = useMemo(() => {
    const currentStatus = editing ? state.status : status;
    return currentStatus !== originalStatus;
  }, [editing, state.status, status, originalStatus]);

  // Format multiplier value for display
  const formatMultiplier = (value: number | undefined) => {
    if (value === undefined) return null;
    const percent = ((value - 1) * 100).toFixed(1);
    return value >= 1 ? `+${percent}%` : `${percent}%`;
  };

  // Check prerequisites
  const prerequisiteStatus = useMemo(() => {
    if (!augData || !augData.prereqs || augData.prereqs.length === 0) {
      return { hasPrereqs: false, allOwned: true, allInstalled: true, prereqs: [] };
    }

    const prereqStatuses = augData.prereqs.map((prereqKey) => {
      // Convert the internal key to a display name
      const prereqData = Bitburner.AUGMENTATION_DATA[prereqKey];
      const prereqDisplayName = prereqData?.name || prereqKey;

      // Check if prerequisite is installed or queued using BOTH the key and display name
      const isInstalled = installedAugmentations.some(
        (a) => a.name === prereqKey || a.name === prereqDisplayName
      );
      const isQueued = queuedAugmentations.some(
        (a) => a.name === prereqKey || a.name === prereqDisplayName
      );

      return {
        name: prereqDisplayName,
        installed: isInstalled,
        queued: isQueued,
        owned: isInstalled || isQueued,
      };
    });

    return {
      hasPrereqs: true,
      allOwned: prereqStatuses.every((p) => p.owned),
      allInstalled: prereqStatuses.every((p) => p.installed),
      prereqs: prereqStatuses,
    };
  }, [augData, installedAugmentations, queuedAugmentations]);

  // Get effect list for detailed view
  const effectsList = useMemo(() => {
    if (!augData) return [];
    const effects: string[] = [];
    const m = augData.multipliers;

    // Stats
    if (m.hacking) effects.push(`${formatMultiplier(m.hacking)} hacking skill`);
    if (m.strength) effects.push(`${formatMultiplier(m.strength)} strength skill`);
    if (m.defense) effects.push(`${formatMultiplier(m.defense)} defense skill`);
    if (m.dexterity) effects.push(`${formatMultiplier(m.dexterity)} dexterity skill`);
    if (m.agility) effects.push(`${formatMultiplier(m.agility)} agility skill`);
    if (m.charisma) effects.push(`${formatMultiplier(m.charisma)} charisma skill`);

    // Exp multipliers
    if (m.hacking_exp) effects.push(`${formatMultiplier(m.hacking_exp)} hacking exp`);
    if (m.strength_exp) effects.push(`${formatMultiplier(m.strength_exp)} strength exp`);
    if (m.defense_exp) effects.push(`${formatMultiplier(m.defense_exp)} defense exp`);
    if (m.dexterity_exp) effects.push(`${formatMultiplier(m.dexterity_exp)} dexterity exp`);
    if (m.agility_exp) effects.push(`${formatMultiplier(m.agility_exp)} agility exp`);
    if (m.charisma_exp) effects.push(`${formatMultiplier(m.charisma_exp)} charisma exp`);

    // Hacking abilities
    if (m.hacking_speed) effects.push(`${formatMultiplier(m.hacking_speed)} faster hack(), grow(), and weaken()`);
    if (m.hacking_chance) effects.push(`${formatMultiplier(m.hacking_chance)} hack() success chance`);
    if (m.hacking_money) effects.push(`${formatMultiplier(m.hacking_money)} hack() power`);
    if (m.hacking_grow) effects.push(`${formatMultiplier(m.hacking_grow)} grow() power`);

    // Reputation
    if (m.company_rep) effects.push(`${formatMultiplier(m.company_rep)} reputation from companies`);
    if (m.faction_rep) effects.push(`${formatMultiplier(m.faction_rep)} reputation from factions`);

    // Crime
    if (m.crime_money) effects.push(`${formatMultiplier(m.crime_money)} crime money`);
    if (m.crime_success) effects.push(`${formatMultiplier(m.crime_success)} crime success rate`);

    // Work
    if (m.work_money) effects.push(`${formatMultiplier(m.work_money)} work money`);

    // Hacknet
    if (m.hacknet_node_money) effects.push(`${formatMultiplier(m.hacknet_node_money)} hacknet production`);
    if (m.hacknet_node_purchase_cost) {
      const percent = ((1 - m.hacknet_node_purchase_cost) * 100).toFixed(1);
      effects.push(`-${percent}% hacknet purchase cost`);
    }
    if (m.hacknet_node_level_cost) {
      const percent = ((1 - m.hacknet_node_level_cost) * 100).toFixed(1);
      effects.push(`-${percent}% hacknet level upgrade cost`);
    }
    if (m.hacknet_node_ram_cost) {
      const percent = ((1 - m.hacknet_node_ram_cost) * 100).toFixed(1);
      effects.push(`-${percent}% hacknet RAM upgrade cost`);
    }
    if (m.hacknet_node_core_cost) {
      const percent = ((1 - m.hacknet_node_core_cost) * 100).toFixed(1);
      effects.push(`-${percent}% hacknet core upgrade cost`);
    }

    // Bladeburner
    if (m.bladeburner_max_stamina) effects.push(`${formatMultiplier(m.bladeburner_max_stamina)} Bladeburner Max Stamina`);
    if (m.bladeburner_stamina_gain) effects.push(`${formatMultiplier(m.bladeburner_stamina_gain)} Bladeburner Stamina gain`);
    if (m.bladeburner_analysis) effects.push(`${formatMultiplier(m.bladeburner_analysis)} Bladeburner Field Analysis effectiveness`);
    if (m.bladeburner_success_chance) effects.push(`${formatMultiplier(m.bladeburner_success_chance)} Bladeburner action success chance`);

    return effects;
  }, [augData]);

  const handleRevert = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();

      // Check if this reset will affect other augmentations
      const affectedCount = onCalculateImpact(name, originalStatus);

      if (affectedCount > 0) {
        // Will need confirmation - don't update UI yet, just submit
        // Store the target so we know we're waiting for confirmation
        setPendingResetTarget({ status: originalStatus, level: originalLevel });

        const handleCancel = () => {
          // User cancelled - clear the pending reset
          setPendingResetTarget(null);
        };
        onSubmit(name, originalStatus, originalLevel, handleCancel);
      } else {
        // No confirmation needed - update UI immediately
        setState({ status: originalStatus, level: originalLevel });
        onSubmit(name, originalStatus, originalLevel);
      }
    },
    [name, originalStatus, originalLevel, onSubmit, onCalculateImpact]
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
          "transition-colors duration-200 ease-in-out relative inline-flex flex-col p-2 rounded border shadow row-span-2",
          editing ? "overflow-hidden" : "overflow-visible",
          hasChanged ? "border-yellow-500 shadow-yellow-700" : "border-gray-700 shadow-green-700",
          "hover:bg-gray-800 focus-within:bg-gray-800",
          editing ? "z-20 h-auto" : "h-10",
          hasValues && !editing && "bg-gray-800/50"
        )}
        onClick={!editing ? onClickEnter : undefined}
      >
        <form className="grid grid-cols-2 gap-1" data-id="augmentation-section" onSubmit={onClose}>
          {/* Collapsed view - single line with name, dropdown, and reset button */}
          {!editing && (
            <div className="col-span-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <h3 className={clsx("tracking-wide text-sm truncate", hasValues ? "text-green-300" : "text-green-100")} title={name}>
                  {name}
                </h3>
                {/* Prerequisites indicator - collapsed view */}
                {prerequisiteStatus.hasPrereqs && (
                  <div className="relative group flex-shrink-0">
                    <div
                      className={clsx(
                        "flex items-center justify-center w-4 h-4 rounded-full border",
                        prerequisiteStatus.allOwned
                          ? "bg-green-900 border-green-500"
                          : "bg-red-900 border-red-500"
                      )}
                      title={prerequisiteStatus.allOwned ? "Prerequisites Owned" : "Missing Prerequisites"}
                    >
                      {prerequisiteStatus.allOwned ? (
                        <span className="text-green-300 text-[10px] font-bold">✓</span>
                      ) : (
                        <span className="text-red-300 text-[10px] font-bold">✗</span>
                      )}
                    </div>
                    {/* Tooltip */}
                    <div className="absolute left-0 top-5 hidden group-hover:block z-[100] bg-gray-900 border border-gray-700 rounded p-2 shadow-lg min-w-[200px]">
                      <div className="text-xs font-semibold text-green-300 mb-1">Prerequisites:</div>
                      {prerequisiteStatus.prereqs.map((prereq, i) => (
                        <div key={i} className="text-xs text-slate-300 flex items-center gap-1">
                          {prereq.installed ? (
                            <span className="text-green-400">✓</span>
                          ) : prereq.queued ? (
                            <span className="text-yellow-400">Q</span>
                          ) : (
                            <span className="text-red-400">✗</span>
                          )}
                          <span>{prereq.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <label onClick={(e) => e.stopPropagation()}>
                  <select
                    value={state.status}
                    onChange={onStatusChange}
                    disabled={prerequisiteStatus.hasPrereqs && !prerequisiteStatus.allOwned && state.status === "none"}
                    className={clsx(
                      "text-slate-100 px-2 py-1 rounded border outline-none text-xs",
                      prerequisiteStatus.hasPrereqs && !prerequisiteStatus.allOwned && state.status === "none"
                        ? "bg-gray-800 border-gray-600 cursor-not-allowed opacity-50"
                        : "bg-gray-900 border-transparent hover:bg-gray-800 cursor-pointer"
                    )}
                    title={prerequisiteStatus.hasPrereqs && !prerequisiteStatus.allOwned && state.status === "none" ? "Prerequisites not met" : ""}
                  >
                    <option value="none" className="bg-gray-900 text-slate-100">
                      None
                    </option>
                    <option
                      value="queued"
                      className="bg-gray-900 text-slate-100"
                      disabled={prerequisiteStatus.hasPrereqs && !prerequisiteStatus.allOwned}
                    >
                      Queued
                    </option>
                    <option
                      value="installed"
                      className="bg-gray-900 text-slate-100"
                      disabled={prerequisiteStatus.hasPrereqs && !prerequisiteStatus.allInstalled}
                    >
                      Installed
                    </option>
                  </select>
                </label>
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
            </div>
          )}

          {/* Expanded view - show all details */}
          {editing && (
            <>
              {/* Header with title, status, and reset button on same line */}
              <div className="col-span-2 flex items-center justify-between gap-4 mb-3">
                <div className="flex items-center gap-2 flex-1">
                  <h3 className={clsx("tracking-wide text-sm font-semibold", hasValues ? "text-green-300" : "text-green-100")} title={name}>
                    {name}
                  </h3>
                  {/* Prerequisites indicator */}
                  {prerequisiteStatus.hasPrereqs && (
                    <div className="relative group">
                      <div
                        className={clsx(
                          "flex items-center justify-center w-5 h-5 rounded-full border-2",
                          prerequisiteStatus.allOwned
                            ? "bg-green-900 border-green-500"
                            : "bg-red-900 border-red-500"
                        )}
                        title={prerequisiteStatus.allOwned ? "Prerequisites Owned" : "Missing Prerequisites"}
                      >
                        {prerequisiteStatus.allOwned ? (
                          <span className="text-green-300 text-xs font-bold">✓</span>
                        ) : (
                          <span className="text-red-300 text-xs font-bold">✗</span>
                        )}
                      </div>
                      {/* Tooltip */}
                      <div className="absolute left-0 top-6 hidden group-hover:block z-30 bg-gray-900 border border-gray-700 rounded p-2 shadow-lg min-w-[200px]">
                        <div className="text-xs font-semibold text-green-300 mb-1">Prerequisites:</div>
                        {prerequisiteStatus.prereqs.map((prereq, i) => (
                          <div key={i} className="text-xs text-slate-300 flex items-center gap-1">
                            {prereq.installed ? (
                              <span className="text-green-400">✓</span>
                            ) : prereq.queued ? (
                              <span className="text-yellow-400">Q</span>
                            ) : (
                              <span className="text-red-400">✗</span>
                            )}
                            <span>{prereq.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <label className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <span className="text-xs text-slate-300">Status:</span>
                    <select
                      value={state.status}
                      onChange={onStatusChange}
                      disabled={prerequisiteStatus.hasPrereqs && !prerequisiteStatus.allOwned && state.status === "none"}
                      className={clsx(
                        "text-slate-100 px-2 py-1 rounded border outline-none text-xs",
                        prerequisiteStatus.hasPrereqs && !prerequisiteStatus.allOwned && state.status === "none"
                          ? "bg-gray-800 border-gray-600 cursor-not-allowed opacity-50"
                          : "bg-gray-900 border-gray-700 hover:bg-gray-800 focus:bg-gray-800 cursor-pointer"
                      )}
                      title={prerequisiteStatus.hasPrereqs && !prerequisiteStatus.allOwned && state.status === "none" ? "Prerequisites not met" : ""}
                    >
                      <option value="none" className="bg-gray-900 text-slate-100">
                        None
                      </option>
                      <option
                        value="queued"
                        className="bg-gray-900 text-slate-100"
                        disabled={prerequisiteStatus.hasPrereqs && !prerequisiteStatus.allOwned}
                      >
                        Queued
                      </option>
                      <option
                        value="installed"
                        className="bg-gray-900 text-slate-100"
                        disabled={prerequisiteStatus.hasPrereqs && !prerequisiteStatus.allInstalled}
                      >
                        Installed
                      </option>
                    </select>
                  </label>
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
              </div>

              {/* Description */}
              {augData && (
                <div className="col-span-2 mb-3 text-xs text-slate-300 leading-relaxed max-h-24 overflow-y-auto">
                  {augData.info}
                  {augData.stats && (
                    <div className="mt-2 text-slate-400 italic">{augData.stats}</div>
                  )}
                </div>
              )}

              {/* Effects list */}
              {effectsList.length > 0 && (
                <div className="col-span-2">
                  <div className="text-xs font-semibold text-green-300 mb-1">Effects:</div>
                  <div className="text-xs text-slate-300 leading-relaxed max-h-40 overflow-y-auto">
                    {effectsList.map((effect, i) => (
                      <div key={i}>{effect}</div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <button type="submit" className="hidden" />
        </form>
      </div>
      <div
        className={clsx(
          "fixed inset-0 bg-gray-900 transition-opacity duration-200 ease-in-out",
          editing ? "opacity-50 z-10" : "opacity-0 pointer-events-none -z-10"
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
            <h3 className="text-sm font-semibold text-green-300">NeuroFlux Governor</h3>
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

          {/* Description */}
          <div className="text-xs text-slate-300 leading-relaxed">
            {Bitburner.AUGMENTATION_DATA.NeuroFluxGovernor.info}
            <div className="mt-2 text-slate-400 italic">
              {Bitburner.AUGMENTATION_DATA.NeuroFluxGovernor.stats}
            </div>
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
          "fixed inset-0 bg-gray-900 transition-opacity duration-200 ease-in-out",
          editing ? "opacity-50 z-10" : "opacity-0 pointer-events-none -z-10"
        )}
        onClick={onClose}
      />
    </>
  );
};
