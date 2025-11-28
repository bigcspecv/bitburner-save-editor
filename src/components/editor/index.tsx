import { MouseEventHandler, useCallback, useContext, useRef, useState } from "react";
import clsx from "clsx";
import { observer } from "mobx-react-lite";

import { Bitburner } from "bitburner";
import { FileContext } from "App";
import EditorSection from "components/editor/section";

const TAB_LABELS: Record<Bitburner.SaveDataKey, string> = {
  [Bitburner.SaveDataKey.PlayerSave]: "Player",
  [Bitburner.SaveDataKey.FactionsSave]: "Factions",
  [Bitburner.SaveDataKey.AllServersSave]: "Servers",
  [Bitburner.SaveDataKey.CompaniesSave]: "Companies",
  [Bitburner.SaveDataKey.AliasesSave]: "Aliases",
  [Bitburner.SaveDataKey.GlobalAliasesSave]: "Global Aliases",
  [Bitburner.SaveDataKey.StockMarketSave]: "Stock Market",
  [Bitburner.SaveDataKey.SettingsSave]: "Settings",
  [Bitburner.SaveDataKey.VersionSave]: "Version",
  [Bitburner.SaveDataKey.AllGangsSave]: "Gangs",
  [Bitburner.SaveDataKey.LastExportBonus]: "Export Bonus",
  [Bitburner.SaveDataKey.StaneksGiftSave]: "Stanek's Gift",
  [Bitburner.SaveDataKey.GoSave]: "Go",
  [Bitburner.SaveDataKey.InfiltrationsSave]: "Infiltrations",
};

export default observer(function EditorContainer() {
  const fileContext = useContext(FileContext);
  const navRef = useRef<HTMLElement>();

  const [isFiltering, setIsFiltering] = useState(false);
  const toggleFiltering = useCallback(() => {
    setIsFiltering((f) => !f);
  }, []);

  const [activeTab, setActiveTab] = useState(Bitburner.SaveDataKey.PlayerSave);
  const onClickTab = useCallback<MouseEventHandler<HTMLButtonElement>>((event) => {
    setActiveTab(event.currentTarget.value as Bitburner.SaveDataKey);
    setIsFiltering(false);
    navRef.current.scrollTo({
      left: event.currentTarget.offsetLeft - 32,
    });
  }, []);

  const scrollRight = useCallback(() => {
    navRef.current.scrollBy({ left: navRef.current.scrollWidth * 0.2 });
  }, []);
  const scrollLeft = useCallback(() => {
    navRef.current.scrollBy({ left: navRef.current.scrollWidth * -0.2 });
  }, []);

  return (
    <div className="h-full w-full mt-4 flex flex-col">
      <div className="w-full relative group px-6">
        <button
          className="absolute left-0 inset-y-0 bg-gray-800 rounded-tl py-1 px-2 opacity-25 group-hover:opacity-100 hover:text-green-900 transition duration-200 ease-in"
          onClick={scrollLeft}
        >
          {"<"}
        </button>
        <nav className="w-full scroll-hidden overflow-x-scroll flex gap-x-4 scroll-smooth" ref={navRef}>
          {Object.values(Bitburner.SaveDataKey).map((key) => (
            <div
              className={clsx(
                "flex items-center justify-center",
                "border-b-2 border-transparent transition-colors duration-200 ease-in",
                activeTab === key && "border-green-700"
              )}
              key={key}
            >
              <button property={key} className="px-4 py-2 -b-px font-semibold" value={key} onClick={onClickTab}>
                {TAB_LABELS[key] ?? key}
              </button>
              {/* TODO: remove filter toggle if we never add filters; button hidden for now */}
            </div>
          ))}
        </nav>
        <button
          className="absolute right-0 inset-y-0 bg-gray-800 rounded-tr py-1 px-2 opacity-25 group-hover:opacity-100 hover:text-green-900 transition duration-200 ease-in"
          onClick={scrollRight}
        >
          {">"}
        </button>
      </div>
      <div className="w-full h-full flex-1 mt-4 p-4 rounded shadow shadow-green-900">
        {!fileContext.ready && <span>Upload a file to begin...</span>}
        {fileContext.ready && <EditorSection tab={activeTab} isFiltering={isFiltering} />}
      </div>
    </div>
  );
});
