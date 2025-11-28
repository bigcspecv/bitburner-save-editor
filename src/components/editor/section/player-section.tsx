import { useCallback, useContext, useState } from "react";
import { observer } from "mobx-react-lite";
import clsx from "clsx";

import { Bitburner } from "bitburner.types";
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
  | "market"
  | "features";

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
    { key: "general", label: "General" },
    { key: "stats", label: "Stats & Skills" },
    { key: "augmentations", label: "Augmentations" },
    { key: "jobs", label: "Jobs" },
    { key: "hacknet", label: "Hacknet" },
    { key: "location", label: "Location & Servers" },
    { key: "progression", label: "Progression" },
    { key: "market", label: "Stock Market" },
    { key: "features", label: "Game Features" },
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
      case "hacknet":
      case "location":
      case "progression":
      case "market":
      case "features":
        return <div className="text-slate-300">Not Implemented</div>;

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
