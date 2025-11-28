import { useCallback, useContext, useState } from "react";
import { observer } from "mobx-react-lite";
import clsx from "clsx";

import { Bitburner } from "bitburner";
import EditableSection from "./properties/editable";
import StatSection from "./properties/stat";
import { FileContext } from "App";
import { formatMoney, formatNumber } from "util/format";
import AugmentationsSection from "./augmentations-section";
import JobsSection from "./jobs-section";

export type PlayerDataKey = keyof Bitburner.PlayerSaveObject["data"];

type SectionKey =
  | "general"
  | "stats"
  | "augmentations"
  | "jobs"
  | "hacknet"
  | "location"
  | "progression"
  | "finance"
  | "meta";

const PLACEHOLDER_FIELDS: Record<SectionKey, string[]> = {
  general: ["city", "bitNodeN", "currentServer", "identifier", "focus", "entropy"],
  stats: [],
  augmentations: [],
  jobs: [],
  hacknet: ["hacknetNodes", "hashManager (capacity, hashes, upgrades)"],
  location: ["location", "purchasedServers"],
  progression: [
    "playtimeSinceLastAug",
    "playtimeSinceLastBitnode",
    "lastAugReset",
    "lastNodeReset",
    "totalPlaytime",
    "scriptProdSinceLastAug",
    "currentWork",
  ],
  finance: ["hasWseAccount", "hasTixApiAccess", "has4SData", "has4SDataTixApi", "moneySourceA", "moneySourceB"],
  meta: [
    "factions",
    "factionInvitations",
    "factionRumors",
    "exploits",
    "achievements",
    "sourceFiles",
    "sleeves",
    "sleevesFromCovenant",
    "bitNodeOptions",
    "terminalCommandHistory",
    "corporation",
    "gang",
    "bladeburner",
  ],
};

export default observer(function PlayerSection() {
  const { player } = useContext(FileContext);
  const [activeSection, setActiveSection] = useState<SectionKey>("stats");

  const onSubmit = useCallback(
    (key: PlayerDataKey, value: any) => {
      player.updatePlayer({
        [key]: value,
      });
    },
    [player]
  );

  const sections: { key: SectionKey; label: string }[] = [
    { key: "general", label: "Identity & Basics" },
    { key: "stats", label: "Stats & Skills" },
    { key: "augmentations", label: "Augmentations" },
    { key: "jobs", label: "Jobs" },
    { key: "hacknet", label: "Hacknet" },
    { key: "location", label: "Location & Servers" },
    { key: "progression", label: "Progression & Timers" },
    { key: "finance", label: "Finance & Market" },
    { key: "meta", label: "Factions & Flags" },
  ];

  const renderSection = () => {
    switch (activeSection) {
      case "stats":
        return (
          <div className="flex flex-wrap gap-4">
            <EditableSection
              type="number"
              label="Money"
              property="money"
              value={player.data.money}
              originalValue={player.originalData?.money}
              formatter={formatMoney}
              onSubmit={onSubmit}
            />
            <EditableSection
              type="number"
              label="Karma"
              property="karma"
              value={player.data.karma}
              originalValue={player.originalData?.karma}
              formatter={formatNumber}
              onSubmit={onSubmit}
            />
            <EditableSection
              type="number"
              label="Entropy"
              property="entropy"
              value={player.data.entropy}
              originalValue={player.originalData?.entropy}
              onSubmit={onSubmit}
            />
            {Bitburner.PLAYER_STATS.map((stat) => (
              <StatSection
                // @ts-ignore
                key={stat}
                property={stat}
                onSubmit={onSubmit}
              />
            ))}
          </div>
        );

      case "augmentations":
        return <AugmentationsSection isFiltering={true} />;

      case "jobs":
        return <JobsSection isFiltering={true} />;

      case "general":
        return (
          <div className="text-slate-300">
            <p>Not Implemented</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              {PLACEHOLDER_FIELDS.general.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        );

      case "hacknet":
        return (
          <div className="text-slate-300">
            <p>Not Implemented</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              {PLACEHOLDER_FIELDS.hacknet.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        );

      case "location":
        return (
          <div className="text-slate-300">
            <p>Not Implemented</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              {PLACEHOLDER_FIELDS.location.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        );

      case "progression":
        return (
          <div className="text-slate-300">
            <p>Not Implemented</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              {PLACEHOLDER_FIELDS.progression.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        );

      case "finance":
        return (
          <div className="text-slate-300">
            <p>Not Implemented</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              {PLACEHOLDER_FIELDS.finance.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        );

      case "meta":
        return (
          <div className="text-slate-300">
            <p>Not Implemented</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              {PLACEHOLDER_FIELDS.meta.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        );

      default:
        return <div className="text-slate-300">Not Implemented</div>;
    }
  };

  return (
    <div>
      <div className="mb-6 flex gap-2 flex-wrap border-b border-gray-700 pb-2">
        {sections.map((section) => (
          <button
            key={section.key}
            onClick={() => setActiveSection(section.key)}
            className={clsx(
              "px-4 py-2 rounded-t text-sm transition-colors",
              activeSection === section.key
                ? "bg-gray-800 text-green-300 border-b-2 border-green-500"
                : "bg-gray-900 text-slate-400 hover:text-slate-200 hover:bg-gray-800"
            )}
          >
            {section.label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {renderSection()}
      </div>
    </div>
  );
});
