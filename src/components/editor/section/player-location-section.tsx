import { ChangeEvent, KeyboardEvent, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { observer } from "mobx-react-lite";
import clsx from "clsx";

import { Bitburner } from "bitburner";
import { FileContext } from "App";
import { Input } from "components/inputs/input";

const EMPTY_LIST: string[] = [];

interface ComboBoxProps {
  value: string;
  options: string[];
  placeholder?: string;
  enforceOptions?: boolean;
  onCommit: (value: string) => void;
}

const ComboBox = ({ value, options, placeholder, enforceOptions, onCommit }: ComboBoxProps) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  const findExactOption = useCallback(
    (candidate: string) => {
      const normalized = candidate.trim().toLowerCase();
      return options.find((opt) => opt.trim().toLowerCase() === normalized);
    },
    [options]
  );

  useEffect(() => {
    setText(value);
  }, [value]);

  const filtered = useMemo(() => {
    const lowered = text.toLowerCase();
    return options.filter((opt) => opt.toLowerCase().includes(lowered));
  }, [options, text]);

  const handleFocus = useCallback(() => {
    setOpen(true);
    setText("");
  }, []);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const next = e.currentTarget.value;
      setText(next);
      setOpen(true);
    },
    []
  );

  const handleSelect = useCallback(
    (option: string) => {
      setText(option);
      onCommit(option);
      setOpen(false);
    },
    [onCommit]
  );

  const handleBlurCombo = useCallback(() => {
    setTimeout(() => {
      if (enforceOptions) {
        const match = findExactOption(text);
        if (match) {
          setText(match);
          if (match !== value) {
            onCommit(match);
          }
        } else {
          setText(value); // revert to last valid
        }
      } else {
        onCommit(text);
      }
      setOpen(false);
    }, 75);
  }, [enforceOptions, findExactOption, onCommit, text, value]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        const first = filtered[0] ?? findExactOption(text) ?? text;
        if (enforceOptions) {
          const match = findExactOption(text) ?? (typeof first === "string" ? first : undefined);
          if (match) {
            handleSelect(match);
          }
        } else if (typeof first === "string") {
          handleSelect(first);
        }
        e.preventDefault();
      }
    },
    [enforceOptions, filtered, findExactOption, handleSelect, text]
  );

  return (
    <div className="relative" ref={containerRef}>
      <Input
        value={text}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlurCombo}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="border border-gray-700 bg-gray-900 text-slate-100"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-30 mt-1 w-full max-h-48 overflow-y-auto rounded border border-gray-700 bg-gray-900 shadow-lg">
          {filtered.map((opt) => (
            <button
              type="button"
              key={opt}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-800"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const CITY_LOCATIONS: Record<Bitburner.CityName, string[]> = {
  [Bitburner.CityName.Aevum]: [
    "AeroCorp",
    "Bachman & Associates",
    "Clarke Incorporated",
    "Crush Fitness Gym",
    "ECorp",
    "Fulcrum Technologies",
    "Galactic Cybersystems",
    "NetLink Technologies",
    "Aevum Police Headquarters",
    "Rho Construction",
    "Snap Fitness Gym",
    "Summit University",
    "Watchdog Security",
    "Iker Molina Casino",
  ],
  [Bitburner.CityName.Chongqing]: ["KuaiGong International", "Solaris Space Systems", "Church of the Machine God"],
  [Bitburner.CityName.Ishima]: ["Nova Medical", "Omega Software", "Storm Technologies", "0x6C1"],
  [Bitburner.CityName.NewTokyo]: ["DefComm", "Global Pharmaceuticals", "Noodle Bar", "VitaLife"],
  [Bitburner.CityName.Sector12]: [
    "Alpha Enterprises",
    "Blade Industries",
    "Central Intelligence Agency",
    "Carmichael Security",
    "Sector-12 City Hall",
    "DeltaOne",
    "FoodNStuff",
    "Four Sigma",
    "Icarus Microsystems",
    "Iron Gym",
    "Joe's Guns",
    "MegaCorp",
    "National Security Agency",
    "Powerhouse Gym",
    "Rothman University",
    "Universal Energy",
  ],
  [Bitburner.CityName.Volhaven]: [
    "CompuTek",
    "Helios Labs",
    "LexoCorp",
    "Millenium Fitness Gym",
    "NWO",
    "OmniTek Incorporated",
    "Omnia Cybersystems",
    "SysCore Securities",
    "ZB Institute of Technology",
  ],
};

const GENERIC_LOCATIONS = ["Hospital", "The Slums", "Travel Agency", "World Stock Exchange", "The Void"];

const LOCATION_TO_CITY: Record<string, Bitburner.CityName> = Object.entries(CITY_LOCATIONS).reduce(
  (acc, [city, locations]) => {
    locations.forEach((loc) => {
      acc[loc] = city as Bitburner.CityName;
    });
    return acc;
  },
  {} as Record<string, Bitburner.CityName>
);

const arraysEqual = (a: string[], b: string[]) => a.length === b.length && a.every((item, idx) => item === b[idx]);

export default observer(function PlayerLocationSection() {
  const { player, servers } = useContext(FileContext);
  const [newServerName, setNewServerName] = useState("");

  const city = (player.data as any).city ?? "";
  const location = (player.data as any).location ?? "";
  const currentServer = (player.data as any).currentServer ?? "";
  const purchasedServers: string[] = (player.data as any).purchasedServers ?? EMPTY_LIST;

  const originalCity = (player.originalData as any)?.city;
  const originalLocation = (player.originalData as any)?.location;
  const originalServer = (player.originalData as any)?.currentServer;
  const originalPurchasedServers: string[] = (player.originalData as any)?.purchasedServers ?? EMPTY_LIST;

  const knownServerHostnames = useMemo(() => {
    if (!servers?.data) return [];
    return servers.data.map(([hostname]) => hostname);
  }, [servers]);

  const locationOptions = useMemo(() => {
    const set = new Set<string>();
    Object.values(CITY_LOCATIONS).forEach((locs) => locs.forEach((loc) => set.add(loc)));
    GENERIC_LOCATIONS.forEach((loc) => set.add(loc));
    if (location) set.add(location);
    if (originalLocation) set.add(originalLocation);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [location, originalLocation]);

  const cityChanged = originalCity === undefined ? Boolean(city) : city !== originalCity;
  const locationChanged = originalLocation === undefined ? Boolean(location) : location !== originalLocation;
  const serverChanged = originalServer === undefined ? Boolean(currentServer) : currentServer !== originalServer;
  const purchasedChanged = !arraysEqual(purchasedServers, originalPurchasedServers);

  const syncPurchasedFlags = useCallback(
    (purchasedList: string[]) => {
      if (!servers?.data) return;
      const purchasedSet = new Set(purchasedList);
      servers.data.forEach(([hostname, serverData]) => {
        const shouldBePurchased = purchasedSet.has(hostname);
        if (serverData.purchasedByPlayer !== shouldBePurchased) {
          servers.updateServer(hostname, { purchasedByPlayer: shouldBePurchased });
        }
      });
    },
    [servers]
  );

  const handleCityChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const nextCity = event.currentTarget.value as Bitburner.CityName;
      player.updatePlayer({ city: nextCity });
    },
    [player]
  );

  const handleLocationCommit = useCallback(
    (nextLocation: string) => {
      const updates: Partial<Bitburner.PlayerSaveObject["data"]> = {
        location: nextLocation as Bitburner.PlayerSaveObject["data"]["location"],
      };
      const matchedCity = LOCATION_TO_CITY[nextLocation];
      if (matchedCity && matchedCity !== city) {
        updates.city = matchedCity;
      }
      player.updatePlayer(updates);
    },
    [city, player]
  );

  const handleServerCommit = useCallback((next: string) => {
    player.updatePlayer({ currentServer: next });
  }, [player]);

  const handleResetTravel = useCallback(() => {
    const updates: Partial<Bitburner.PlayerSaveObject["data"]> = {};
    if (originalCity !== undefined) updates.city = originalCity;
    if (originalLocation !== undefined) updates.location = originalLocation;
    player.updatePlayer(updates);
  }, [originalCity, originalLocation, player]);

  const handleResetServer = useCallback(() => {
    if (originalServer !== undefined) {
      player.updatePlayer({ currentServer: originalServer });
    } else {
      player.updatePlayer({ currentServer: "" });
    }
  }, [originalServer, player]);

  const handleResetPurchased = useCallback(() => {
    if ((player as any).resetPurchasedServers) {
      (player as any).resetPurchasedServers();
    } else {
      player.updatePlayer({ purchasedServers: originalPurchasedServers });
      syncPurchasedFlags(originalPurchasedServers);
    }
  }, [originalPurchasedServers, player, syncPurchasedFlags]);

  const handleRemovePurchased = useCallback(
    (hostname: string) => {
      const next = purchasedServers.filter((host) => host !== hostname);
      player.updatePlayer({ purchasedServers: next });
      syncPurchasedFlags(next);
    },
    [player, purchasedServers, syncPurchasedFlags]
  );

  const hasMaxPurchased = purchasedServers.length >= 25;
  const trimmedNewName = newServerName.trim();
  const newNameInUse = trimmedNewName.length > 0 && knownServerHostnames.some((host) => host.toLowerCase() === trimmedNewName.toLowerCase());

  const handleAddPurchased = useCallback(() => {
    const trimmed = newServerName.trim();
    if (!trimmed) return;
    if (hasMaxPurchased) return;
    if (knownServerHostnames.some((host) => host.toLowerCase() === trimmed.toLowerCase())) return;
    const next = [...purchasedServers, trimmed];
    player.updatePlayer({ purchasedServers: next });
    syncPurchasedFlags(next);
    setNewServerName("");
  }, [newServerName, hasMaxPurchased, knownServerHostnames, player, purchasedServers, syncPurchasedFlags]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div
        className={clsx(
          "relative p-4 rounded border shadow bg-gray-900/70",
          cityChanged || locationChanged ? "border-yellow-500 shadow-yellow-700" : "border-gray-700 shadow-green-700"
        )}
      >
        <header className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg text-green-300 font-semibold">Travel</h3>
            <p className="text-xs text-slate-400">City and location within the world.</p>
          </div>
          {(cityChanged || locationChanged) && (
            <button
              type="button"
              onClick={handleResetTravel}
              className="px-2 py-1 text-xs rounded bg-yellow-600 hover:bg-yellow-500 text-white"
            >
              Reset
            </button>
          )}
        </header>

        <div className="space-y-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-300">City</span>
            <select
              value={city}
              onChange={handleCityChange}
              className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-slate-100 outline-none hover:bg-gray-800 focus:bg-gray-800"
            >
              <option value="">-- Select City --</option>
              {Object.values(Bitburner.CityName).map((cityName) => (
                <option key={cityName} value={cityName}>
                  {cityName}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-300">Location</span>
            <ComboBox
              value={location}
              onCommit={handleLocationCommit}
              options={locationOptions}
              enforceOptions
              placeholder="e.g., Joe's Guns or Four Sigma"
            />
            <p className="text-xs text-slate-500">
              Picking a location tied to a city will auto-sync the city field.
            </p>
          </label>
        </div>
      </div>

      <div
        className={clsx(
          "relative p-4 rounded border shadow bg-gray-900/70",
          serverChanged || purchasedChanged ? "border-yellow-500 shadow-yellow-700" : "border-gray-700 shadow-green-700"
        )}
      >
        <header className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg text-green-300 font-semibold">Servers</h3>
            <p className="text-xs text-slate-400">Connected server and purchased server list.</p>
          </div>
          {(serverChanged || purchasedChanged) && (
            <div className="flex gap-2">
              {serverChanged && (
                <button
                  type="button"
                  onClick={handleResetServer}
                  className="px-2 py-1 text-xs rounded bg-yellow-600 hover:bg-yellow-500 text-white"
                >
                  Reset Connection
                </button>
              )}
            </div>
          )}
        </header>

        <div className="space-y-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-300">Current Server</span>
            <ComboBox
              value={currentServer}
              onCommit={handleServerCommit}
              enforceOptions
              options={knownServerHostnames}
              placeholder="home, n00dles, etc."
            />
          </label>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Purchased Servers ({purchasedServers.length})</span>
              <div className="flex items-center gap-2">
                {purchasedServers.length === 0 && <span className="text-xs text-slate-500">None</span>}
                {purchasedChanged && (
                  <button
                    type="button"
                    onClick={handleResetPurchased}
                    className="px-2 py-1 text-xs rounded bg-yellow-600 hover:bg-yellow-500 text-white"
                  >
                    Reset Purchased
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {purchasedServers.map((host) => (
                <span
                  key={host}
                  className="inline-flex items-center gap-2 px-2 py-1 rounded border border-gray-700 bg-gray-800 text-sm"
                >
                  {host}
                  <button
                    type="button"
                    onClick={() => handleRemovePurchased(host)}
                    className="text-xs text-red-300 hover:text-red-200"
                    title="Remove from purchased list"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2 items-center">
              <Input
                value={newServerName}
                onChange={(e) => setNewServerName(e.currentTarget.value)}
                placeholder="Add unique hostname..."
                disabled={hasMaxPurchased}
                title={hasMaxPurchased ? "Maximum 25 purchased servers reached" : undefined}
              />
              <button
                type="button"
                onClick={handleAddPurchased}
                disabled={
                  hasMaxPurchased ||
                  !trimmedNewName ||
                  newNameInUse
                }
                title={
                  hasMaxPurchased
                    ? "Maximum 25 purchased servers reached"
                    : newNameInUse
                    ? "Hostname already exists; choose a unique name"
                    : undefined
                }
                className="px-3 py-2 rounded bg-green-700 hover:bg-green-600 text-white disabled:bg-gray-700 disabled:cursor-not-allowed text-sm"
              >
                Add
              </button>
            </div>
            {newNameInUse && (
              <p className="text-xs text-red-300">
                Hostname already exists in your servers. Please choose a unique name.
              </p>
            )}
            {hasMaxPurchased && (
              <p className="text-xs text-yellow-400">
                You already have 25 purchased servers. Remove one to add another.
              </p>
            )}
            <p className="text-xs text-slate-500">
              Updating this list also toggles the purchased flag on matching servers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});
