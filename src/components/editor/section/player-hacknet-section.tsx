import { ChangeEvent, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { observer } from "mobx-react-lite";
import clsx from "clsx";

import { Bitburner } from "bitburner";
import { FileContext } from "App";
import { NumberInput } from "components/inputs/number-input";
import { Input } from "components/inputs/input";
import { formatNumber } from "util/format";
import { ExclamationCircleIcon } from "@heroicons/react/solid";

type HacknetNodeData = Bitburner.HacknetNodeSaveObject["data"];

interface HacknetNodeView {
  index: number;
  data: HacknetNodeData;
  isString?: boolean;
}

interface HashManagerData {
  capacity: number;
  hashes: number;
  upgrades: Record<string, number>;
}

const HASH_UPGRADES: readonly string[] = [
  "Sell for Money",
  "Sell for Corporation Funds",
  "Reduce Minimum Security",
  "Increase Maximum Money",
  "Improve Studying",
  "Improve Gym Training",
  "Exchange for Corporation Research",
  "Exchange for Bladeburner Rank",
  "Exchange for Bladeburner SP",
  "Generate Coding Contract",
  "Company Favor",
];

const normalizeHacknetNodes = (nodes?: (Bitburner.HacknetNodeSaveObject | string)[]): HacknetNodeView[] => {
  if (!nodes) return [];
  return nodes.map((node, index) => {
    if (typeof node === "string") {
      return {
        index,
        isString: true,
        data: {
          name: node,
          level: 1,
          ram: 1,
          cores: 1,
          moneyGainRatePerSecond: 0,
          onlineTimeSeconds: 0,
          totalMoneyGenerated: 0,
        },
      };
    }
    const raw = (node as any).data || node;
    return {
      index,
      isString: false,
      data: {
        name: raw.name ?? `hacknet-node-${index}`,
        level: raw.level ?? 1,
        ram: raw.ram ?? 1,
        cores: raw.cores ?? 1,
        moneyGainRatePerSecond: raw.moneyGainRatePerSecond ?? 0,
        onlineTimeSeconds: raw.onlineTimeSeconds ?? 0,
        totalMoneyGenerated: raw.totalMoneyGenerated ?? 0,
      },
    };
  });
};

const normalizeHashManager = (hashManager?: Bitburner.HashManagerSaveObject | null): HashManagerData => {
  const raw = (hashManager as any)?.data || hashManager || {};
  return {
    capacity: raw.capacity ?? 0,
    hashes: raw.hashes ?? 0,
    upgrades: raw.upgrades ?? {},
  };
};

const nodeDataEqual = (a?: HacknetNodeData, b?: HacknetNodeData) => {
  if (!a || !b) return false;
  return (
    a.name === b.name &&
    a.level === b.level &&
    a.ram === b.ram &&
    a.cores === b.cores &&
    a.moneyGainRatePerSecond === b.moneyGainRatePerSecond &&
    a.onlineTimeSeconds === b.onlineTimeSeconds &&
    a.totalMoneyGenerated === b.totalMoneyGenerated
  );
};

const hashManagersEqual = (a: HashManagerData, b: HashManagerData) => {
  if (a.capacity !== b.capacity || a.hashes !== b.hashes) return false;
  const keys = new Set([...Object.keys(a.upgrades || {}), ...Object.keys(b.upgrades || {}), ...HASH_UPGRADES]);
  for (const key of keys) {
    if ((a.upgrades?.[key] ?? 0) !== (b.upgrades?.[key] ?? 0)) {
      return false;
    }
  }
  return true;
};

export default observer(function PlayerHacknetSection() {
  const { hacknet } = useContext(FileContext);
  const [targetNodeCount, setTargetNodeCount] = useState(50);

  const nodes = normalizeHacknetNodes(hacknet?.nodes);
  const originalNodes = normalizeHacknetNodes(hacknet?.originalNodes);

  const hashManager = useMemo(() => normalizeHashManager(hacknet?.hashManager), [hacknet?.hashManager]);
  const originalHashManager = useMemo(
    () => normalizeHashManager(hacknet?.originalHashManager),
    [hacknet?.originalHashManager]
  );

  const totalProduction = useMemo(
    () => nodes.reduce((sum, node) => sum + (Number(node.data.moneyGainRatePerSecond) || 0), 0),
    [nodes]
  );
  const totalGenerated = useMemo(
    () => nodes.reduce((sum, node) => sum + (Number(node.data.totalMoneyGenerated) || 0), 0),
    [nodes]
  );

  const handleNodeUpdate = useCallback(
    (index: number, updates: Partial<HacknetNodeData>) => {
      hacknet?.updateNode(index, updates);
    },
    [hacknet]
  );

  const handleNodeDelete = useCallback(
    (index: number) => {
      hacknet?.deleteNode(index);
    },
    [hacknet]
  );

  const handleNodeReset = useCallback(
    (index: number) => {
      hacknet?.resetNode(index);
    },
    [hacknet]
  );

  const handleAddNode = useCallback(() => {
    hacknet?.addNode();
  }, [hacknet]);

  const handleFillToCount = useCallback(() => {
    if (!hacknet) return;
    const target = Math.max(targetNodeCount, nodes.length);
    const safeTarget = Math.min(target, 1000); // guard against accidental huge fills
    let current = nodes.length;
    while (current < safeTarget) {
      hacknet.addNode();
      current += 1;
    }
  }, [hacknet, nodes.length, targetNodeCount]);

  const handleResetNodes = useCallback(() => {
    hacknet?.resetNodes();
  }, [hacknet]);

  const handleHashChange = useCallback(
    (key: keyof HashManagerData, value: number) => {
      hacknet?.updateHashManager({ [key]: Math.max(0, value) } as Partial<Bitburner.HashManagerSaveObject["data"]>);
    },
    [hacknet]
  );

  const handleUpgradeChange = useCallback(
    (upgrade: string, event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = Math.max(0, Number(event.currentTarget.value) || 0);
      hacknet?.updateHashManager({ upgrades: { [upgrade]: nextValue } });
    },
    [hacknet]
  );

  const handleResetHashManager = useCallback(() => {
    hacknet?.resetHashManager();
  }, [hacknet]);

  const hashChanged = useMemo(() => !hashManagersEqual(hashManager, originalHashManager), [hashManager, originalHashManager]);
  const nodesChanged = useMemo(() => {
    if (nodes.length !== originalNodes.length) return true;
    return nodes.some((node, idx) => {
      const matched =
        originalNodes.find((orig) => orig.data.name === node.data.name) ?? originalNodes[idx] ?? undefined;
      if (!matched) return true;
      return !nodeDataEqual(node.data, matched.data);
    });
  }, [nodes, originalNodes]);

  const handleMaxLevelsAll = useCallback(() => {
    nodes.forEach((_, idx) => hacknet?.updateNode(idx, { level: 200 }));
  }, [hacknet, nodes]);

  const handleMaxRamAll = useCallback(() => {
    nodes.forEach((_, idx) => hacknet?.updateNode(idx, { ram: 64 }));
  }, [hacknet, nodes]);

  const handleMaxCoresAll = useCallback(() => {
    nodes.forEach((_, idx) => hacknet?.updateNode(idx, { cores: 16 }));
  }, [hacknet, nodes]);

  const handleMaxAll = useCallback(() => {
    nodes.forEach((_, idx) => hacknet?.updateNode(idx, { level: 200, ram: 64, cores: 16 }));
  }, [hacknet, nodes]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div
          className={clsx(
            "p-4 rounded border shadow bg-gray-900/70",
            hashChanged ? "border-yellow-500 shadow-yellow-700" : "border-gray-700 shadow-green-700"
          )}
        >
          <header className="flex items-center justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg text-green-300 font-semibold">Hash Manager</h3>
                <span className="flex items-center gap-1 text-xs text-slate-400" title="Not implemented yet">
                  <ExclamationCircleIcon className="h-4 w-4 text-yellow-500" aria-hidden="true" />
                  <span>Not Implemented</span>
                </span>
              </div>
              <p className="text-xs text-slate-400">Hashes, capacity, and upgrade levels.</p>
            </div>
            {hashChanged && (
              <button
                type="button"
                onClick={handleResetHashManager}
                className="px-2 py-1 text-xs rounded bg-yellow-600 hover:bg-yellow-500 text-white"
              >
                Reset
              </button>
            )}
          </header>
          <div className="space-y-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-300">Hashes</span>
              <NumberInput
                value={hashManager.hashes}
                min={0}
                data-key="hashes"
                onChange={(e) => handleHashChange("hashes", Number(e.currentTarget.value) || 0)}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-300">Capacity</span>
              <NumberInput
                value={hashManager.capacity}
                min={0}
                data-key="capacity"
                onChange={(e) => handleHashChange("capacity", Number(e.currentTarget.value) || 0)}
              />
            </label>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-slate-300">Upgrades</span>
                <span className="text-xs text-slate-500">Levels per upgrade</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {HASH_UPGRADES.map((upgrade) => (
                  <label key={upgrade} className="flex flex-col gap-1">
                    <span className="text-xs text-slate-400">{upgrade}</span>
                    <NumberInput
                      min={0}
                      value={hashManager.upgrades?.[upgrade] ?? 0}
                      data-key={upgrade}
                      onChange={(event) => handleUpgradeChange(upgrade, event)}
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-2 p-4 rounded border border-gray-700 shadow shadow-green-700 bg-gray-900/70">
          <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
            <div>
              <h3 className="text-lg text-green-300 font-semibold">Hacknet Nodes</h3>
              <p className="text-xs text-slate-400">
                {nodes.length} nodes | {formatNumber(totalProduction)} / sec | {formatNumber(totalGenerated)} lifetime earned
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAddNode}
                className="px-3 py-2 text-sm rounded bg-green-700 hover:bg-green-600 text-white"
              >
                + Add Node
              </button>
              <div className="flex items-center gap-2">
                <NumberInput
                  min={nodes.length}
                  max={1000}
                  value={targetNodeCount}
                  data-key="targetNodes"
                  onChange={(e) =>
                    setTargetNodeCount(Math.max(nodes.length, Number(e.currentTarget.value) || nodes.length))
                  }
                  className="w-20"
                />
                <button
                  type="button"
                  onClick={handleFillToCount}
                  className="px-3 py-2 text-sm rounded bg-green-900 hover:bg-green-800 text-green-100 border border-green-700"
                >
                  Fill to {targetNodeCount}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleMaxLevelsAll}
                  className="px-3 py-2 text-xs rounded bg-green-900 hover:bg-green-800 text-green-100 border border-green-700"
                >
                  Max Level
                </button>
                <button
                  type="button"
                  onClick={handleMaxRamAll}
                  className="px-3 py-2 text-xs rounded bg-green-900 hover:bg-green-800 text-green-100 border border-green-700"
                >
                  Max RAM
                </button>
                <button
                  type="button"
                  onClick={handleMaxCoresAll}
                  className="px-3 py-2 text-xs rounded bg-green-900 hover:bg-green-800 text-green-100 border border-green-700"
                >
                  Max Cores
                </button>
                <button
                  type="button"
                  onClick={handleMaxAll}
                  className="px-3 py-2 text-xs rounded bg-green-900 hover:bg-green-800 text-green-100 border border-green-700"
                >
                  Max All
                </button>
              </div>
              {nodes.length > 0 && nodesChanged && (
                <button
                  type="button"
                  onClick={handleResetNodes}
                  className="px-3 py-2 text-sm rounded bg-yellow-600 hover:bg-yellow-500 text-white"
                >
                  Reset All
                </button>
              )}
            </div>
          </header>

          {nodes.length === 0 ? (
            <div className="text-slate-300">No hacknet nodes found.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
              {nodes.map((node) => (
                <HacknetNodeCard
                  key={node.data.name || node.index}
                  node={node}
                  originalNode={
                    originalNodes.find((orig) => orig.data.name === node.data.name) ?? originalNodes[node.index]
                  }
                  onUpdate={handleNodeUpdate}
                  onDelete={handleNodeDelete}
                  onReset={handleNodeReset}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

interface NodeCardProps {
  node: HacknetNodeView;
  originalNode?: HacknetNodeView;
  onUpdate(index: number, updates: Partial<HacknetNodeData>): void;
  onDelete(index: number): void;
  onReset(index: number): void;
}

const RAM_OPTIONS = [1, 2, 4, 8, 16, 32, 64];
const MINIMUMS: Record<keyof HacknetNodeData, number> = {
  name: 0,
  level: 1,
  ram: 1,
  cores: 1,
  moneyGainRatePerSecond: 0,
  onlineTimeSeconds: 0,
  totalMoneyGenerated: 0,
};
const MAXIMUMS: Partial<Record<keyof HacknetNodeData, number>> = {
  level: 200,
  cores: 16,
  ram: 64,
};

const HacknetNodeCard = ({ node, originalNode, onUpdate, onDelete, onReset }: NodeCardProps) => {
  const [draft, setDraft] = useState(node.data);

  useEffect(() => {
    setDraft(node.data);
  }, [node]);

  const hasChanged = useMemo(() => {
    if (!originalNode) return true;
    return !nodeDataEqual(node.data, originalNode.data);
  }, [node.data, originalNode]);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { dataset, value } = event.currentTarget;
      const key = dataset.key as keyof HacknetNodeData;
      if (!key) return;
      const minimum = MINIMUMS[key] ?? 0;
      const maximum = MAXIMUMS[key] ?? Number.POSITIVE_INFINITY;
      const nextValue =
        key === "name" ? value : Math.min(maximum, Math.max(minimum, Number(value) || 0));
      const updates: Partial<HacknetNodeData> = { [key]: nextValue } as Partial<HacknetNodeData>;
      setDraft((prev) => ({ ...prev, ...updates }));
      onUpdate(node.index, updates);
    },
    [node.index, onUpdate]
  );

  const handleSetMax = useCallback(
    (key: keyof HacknetNodeData, value: number) => {
      const updates: Partial<HacknetNodeData> = { [key]: value } as Partial<HacknetNodeData>;
      setDraft((prev) => ({ ...prev, ...updates }));
      onUpdate(node.index, updates);
    },
    [node.index, onUpdate]
  );

  const handleReset = useCallback(() => {
    onReset(node.index);
  }, [node.index, onReset]);

  const handleDelete = useCallback(() => {
    onDelete(node.index);
  }, [node.index, onDelete]);

  return (
    <div
      className={clsx(
        "p-3 rounded border shadow bg-gray-900/70",
        hasChanged ? "border-yellow-500 shadow-yellow-700" : "border-gray-700 shadow-green-700"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-green-200 font-semibold">{draft.name}</span>
          {node.isString && <span className="px-2 py-0.5 text-xs bg-blue-900 text-blue-200 rounded">Converted</span>}
          {!originalNode && <span className="px-2 py-0.5 text-xs bg-blue-900 text-blue-200 rounded">New</span>}
        </div>
        <div className="flex gap-2">
          {hasChanged && (
            <button
              type="button"
              onClick={handleReset}
              className="px-2 py-1 text-xs rounded bg-yellow-600 hover:bg-yellow-500 text-white"
            >
              Reset
            </button>
          )}
          <button
            type="button"
            onClick={handleDelete}
            className="px-2 py-1 text-xs rounded bg-red-800 hover:bg-red-700 text-white"
          >
            Delete
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="col-span-2 flex flex-col gap-1">
          <span className="text-xs text-slate-400">Name</span>
          <Input value={draft.name} onChange={handleChange} data-key="name" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-400">Level</span>
          <div className="flex gap-2 items-center">
            <NumberInput value={draft.level} min={1} max={200} data-key="level" onChange={handleChange} />
            <button
              type="button"
              onClick={() => handleSetMax("level", 200)}
              className="px-2 py-1 text-xs bg-green-900 hover:bg-green-800 text-green-100 rounded border border-green-700"
            >
              MAX
            </button>
          </div>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-400">RAM (GB)</span>
          <div className="flex gap-2 items-center">
            <select
              value={draft.ram}
              data-key="ram"
              onChange={handleChange}
              className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-slate-100 outline-none hover:bg-gray-800 focus:bg-gray-800"
            >
              {RAM_OPTIONS.map((ram) => (
                <option key={ram} value={ram} className="bg-gray-900 text-slate-100">
                  {ram}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => handleSetMax("ram", 64)}
              className="px-2 py-1 text-xs bg-green-900 hover:bg-green-800 text-green-100 rounded border border-green-700"
            >
              MAX
            </button>
          </div>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-400">Cores</span>
          <div className="flex gap-2 items-center">
            <NumberInput value={draft.cores} min={1} max={16} data-key="cores" onChange={handleChange} />
            <button
              type="button"
              onClick={() => handleSetMax("cores", 16)}
              className="px-2 py-1 text-xs bg-green-900 hover:bg-green-800 text-green-100 rounded border border-green-700"
            >
              MAX
            </button>
          </div>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-400">$/sec</span>
          <NumberInput
            value={draft.moneyGainRatePerSecond}
            min={0}
            step="any"
            data-key="moneyGainRatePerSecond"
            onChange={handleChange}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-400">Lifetime $</span>
          <NumberInput
            value={draft.totalMoneyGenerated}
            min={0}
            step="any"
            data-key="totalMoneyGenerated"
            onChange={handleChange}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-400">Online Time (sec)</span>
          <NumberInput
            value={draft.onlineTimeSeconds}
            min={0}
            step="any"
            data-key="onlineTimeSeconds"
            onChange={handleChange}
          />
        </label>
      </div>
    </div>
  );
};
