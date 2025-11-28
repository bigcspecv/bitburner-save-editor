import { Buffer } from "buffer";
import { Bitburner } from "bitburner";
import { makeAutoObservable, runInAction } from "mobx";
import * as pako from "pako";

export class FileStore {
  _file: File;
  originalSave: Bitburner.SaveData;
  modifiedSave: Bitburner.SaveData;

  constructor() {
    makeAutoObservable(this);

    // @ts-ignore
    window.store = this;
  }

  get file() {
    return this._file;
  }

  get ready() {
    return !!this.modifiedSave;
  }

  get save() {
    return this.modifiedSave;
  }

  get hasChanges() {
    if (!this.originalSave || !this.modifiedSave) {
      return false;
    }
    // Deep comparison using JSON stringify
    return JSON.stringify(this.originalSave) !== JSON.stringify(this.modifiedSave);
  }

  get player() {
    return {
      data: this.save.data.PlayerSave.data,
      originalData: this.originalSave?.data.PlayerSave.data,
      updatePlayer: this.updatePlayer,
    };
  }

  updatePlayer = (updates: Partial<Bitburner.PlayerSaveObject["data"]>) => {
    Object.assign(this.save.data.PlayerSave.data, updates);
  };

  get factions() {
    return {
      data: Object.entries(this.save.data.FactionsSave).map(([name, factionData]) => {
        // Handle both old format (with nested .data) and new format (flat object)
        const data = (factionData as any).data || factionData;

        // In 2.8.1+, membership/invitation status is stored in player data, not faction data
        const playerData = this.save.data.PlayerSave.data;
        const isMember = playerData.factions?.includes(name) ?? data.isMember ?? false;
        const alreadyInvited = playerData.factionInvitations?.includes(name) ?? data.alreadyInvited ?? false;

        return [
          name,
          {
            ctor: Bitburner.Ctor.Faction,
            data: {
              name,
              playerReputation: data.playerReputation ?? 0,
              favor: data.favor ?? 0,
              alreadyInvited,
              isMember,
              isBanned: data.isBanned ?? false,
              augmentations: data.augmentations ?? [],
            }
          }
        ] as [string, Bitburner.FactionsSaveObject];
      }).sort(
        (a, b) => {
          const repA = a[1]?.data?.playerReputation ?? 0;
          const repB = b[1]?.data?.playerReputation ?? 0;
          return repB - repA;
        }
      ) as [string, Bitburner.FactionsSaveObject][],
      updateFaction: this.updateFaction,
    };
  }

  updateFaction = (faction: string, updates: Partial<Bitburner.FactionsSaveObject["data"]>) => {
    const factionData = this.save.data.FactionsSave[faction] as any;

    // Handle both old format (with nested .data) and new format (flat object)
    if (factionData.data) {
      // Old format
      Object.assign(factionData.data, updates);
    } else {
      // New format - update the flat object directly
      Object.assign(factionData, updates);
    }

    if (updates.isMember !== undefined) {
      const playerFactions = (this.player.data as any).factions || this.player.data.factions;
      if (updates.isMember) {
        this.updatePlayer({ factions: Array.from(new Set(playerFactions.concat(faction))) });
      } else {
        this.updatePlayer({ factions: playerFactions.filter((f: string) => f !== faction) });
      }
    }

    if (updates.alreadyInvited !== undefined) {
      const playerInvitations = (this.player.data as any).factionInvitations || this.player.data.factionInvitations;
      if (updates.alreadyInvited && !updates.isMember) {
        this.updatePlayer({
          factionInvitations: Array.from(new Set(playerInvitations.concat(faction))),
        });
      } else {
        this.updatePlayer({ factionInvitations: playerInvitations.filter((f: string) => f !== faction) });
      }
    }
  };

  get companies() {
    // Helper to parse companies data
    const parseCompaniesData = (companiesSave: any) => {
      const allCompaniesMap = new Map<string, Bitburner.CompanySaveObject>();

      // Initialize all companies with zero values
      Bitburner.ALL_COMPANIES.forEach((companyName) => {
        allCompaniesMap.set(companyName, {
          favor: 0,
          playerReputation: 0,
        });
      });

      // Merge in saved data
      if (companiesSave) {
        Object.entries(companiesSave).forEach(([name, companyData]: [string, any]) => {
          allCompaniesMap.set(name, {
            favor: companyData.favor ?? 0,
            playerReputation: companyData.playerReputation ?? 0,
          });
        });
      }

      // Convert to array and sort by reputation
      return Array.from(allCompaniesMap.entries()).sort(
        (a, b) => {
          const repA = a[1]?.playerReputation ?? 0;
          const repB = b[1]?.playerReputation ?? 0;
          return repB - repA;
        }
      ) as [string, Bitburner.CompanySaveObject][];
    };

    return {
      data: parseCompaniesData(this.save.data.CompaniesSave),
      originalData: this.originalSave?.data.CompaniesSave ? parseCompaniesData(this.originalSave.data.CompaniesSave) : [],
      updateCompany: this.updateCompany,
    };
  }

  updateCompany = (company: string, updates: Partial<Bitburner.CompanySaveObject>) => {
    runInAction(() => {
      // Check if we're reverting to zero values and the company doesn't exist in original
      const isRevertingToZero = (updates.favor === 0 || updates.favor === undefined) &&
                                 (updates.playerReputation === 0 || updates.playerReputation === undefined);
      const notInOriginal = !this.originalSave.data.CompaniesSave[company];

      if (isRevertingToZero && notInOriginal) {
        // Delete the company from the save to match the original state
        delete this.save.data.CompaniesSave[company];
      } else {
        // If the company doesn't exist in the save yet, create it
        if (!this.save.data.CompaniesSave[company]) {
          this.save.data.CompaniesSave[company] = {
            favor: 0,
            playerReputation: 0,
          };
        }

        const companyData = this.save.data.CompaniesSave[company];
        Object.assign(companyData, updates);
      }
    });
  };

  get servers() {
    if (!this.save.data.AllServersSave) {
      return {
        data: [],
        originalData: [],
        updateServer: this.updateServer,
      };
    }

    // Helper to parse server data
    const parseServersData = (serversData: any) => {
      return (Object.entries(serversData).map(([hostname, serverObj]: [string, any]) => {
        const serverData = serverObj.data || serverObj;
        return [
          hostname,
          {
            hostname: serverData.hostname || hostname,
            organizationName: serverData.organizationName,
            maxRam: serverData.maxRam ?? 0,
            cpuCores: serverData.cpuCores ?? 1,
            hackDifficulty: serverData.hackDifficulty ?? 0,
            minDifficulty: serverData.minDifficulty ?? 0,
            moneyAvailable: serverData.moneyAvailable ?? 0,
            moneyMax: serverData.moneyMax ?? 0,
            requiredHackingSkill: serverData.requiredHackingSkill ?? 0,
            hasAdminRights: serverData.hasAdminRights ?? false,
            backdoorInstalled: serverData.backdoorInstalled ?? false,
            purchasedByPlayer: serverData.purchasedByPlayer ?? false,
          } as Bitburner.ServerData
        ];
      }) as [string, Bitburner.ServerData][]).sort((a, b) => {
        // Sort: home first, then purchased servers, then by name
        if (a[0] === 'home') return -1;
        if (b[0] === 'home') return 1;
        if (a[1].purchasedByPlayer && !b[1].purchasedByPlayer) return -1;
        if (!a[1].purchasedByPlayer && b[1].purchasedByPlayer) return 1;
        return a[0].localeCompare(b[0]);
      });
    };

    // AllServersSave is already parsed as an object
    const serversData = this.save.data.AllServersSave;
    const originalServersData = this.originalSave?.data.AllServersSave;

    // Convert to array format [hostname, serverData]
    return {
      data: parseServersData(serversData),
      originalData: originalServersData ? parseServersData(originalServersData) : [],
      updateServer: this.updateServer,
    };
  }

  updateServer = (hostname: string, updates: Partial<Bitburner.ServerData>) => {
    if (!this.save.data.AllServersSave) {
      return;
    }

    runInAction(() => {
      const serversData = this.save.data.AllServersSave;

      if (!serversData[hostname]) {
        console.warn(`Server ${hostname} not found in save data`);
        return;
      }

      // Update the server data (might be nested in .data or flat)
      const serverObj = serversData[hostname];
      if (serverObj.data) {
        Object.assign(serverObj.data, updates);
      } else {
        Object.assign(serverObj, updates);
      }
    });
  };

  get jobs() {
    if (!this.save.data.PlayerSave || !this.save.data.PlayerSave.data) {
      return {
        data: [],
        originalData: [],
        updateJob: this.updateJob,
        deleteJob: this.deleteJob,
      };
    }

    // Helper to parse jobs data - returns array of [companyName, jobTitle]
    const parseJobsData = (jobs: Record<string, string> | undefined) => {
      if (!jobs) return [];
      return Object.entries(jobs).sort((a, b) => a[0].localeCompare(b[0]));
    };

    return {
      data: parseJobsData(this.save.data.PlayerSave.data.jobs),
      originalData: this.originalSave?.data.PlayerSave?.data?.jobs
        ? parseJobsData(this.originalSave.data.PlayerSave.data.jobs)
        : [],
      updateJob: this.updateJob,
      deleteJob: this.deleteJob,
    };
  }

  updateJob = (company: string, jobTitle: string) => {
    runInAction(() => {
      if (!this.save.data.PlayerSave.data.jobs) {
        this.save.data.PlayerSave.data.jobs = {};
      }
      this.save.data.PlayerSave.data.jobs[company] = jobTitle;
    });
  };

  deleteJob = (company: string) => {
    runInAction(() => {
      if (this.save.data.PlayerSave.data.jobs) {
        delete this.save.data.PlayerSave.data.jobs[company];
      }
    });
  };

  clearFile = () => {
    this._file = undefined;
    this.originalSave = undefined;
    this.modifiedSave = undefined;
  };

  uploadFile = async (file: File) => {
    this.clearFile();
    this._file = file;
    await this.processFile();
  };

  processFile = async () => {
    try {
      let fileText: string;

      // Check if the file is gzipped based on extension
      if (this.file.name.endsWith('.gz')) {
        // Read as array buffer for gzipped files
        const arrayBuffer = await this.file.arrayBuffer();
        const decompressed = pako.ungzip(new Uint8Array(arrayBuffer), { to: 'string' });
        fileText = decompressed;
      } else {
        // Read as text for regular files
        fileText = await this.file.text();
      }

      // Try to parse as JSON first (Bitburner 2.8.1+ format)
      let rawData: Bitburner.RawSaveData;
      try {
        rawData = JSON.parse(fileText);
      } catch {
        // If that fails, try base64 decoding (older format)
        const buffer = Buffer.from(fileText, "base64");
        rawData = JSON.parse(buffer.toString());
      }

      if (rawData.ctor !== "BitburnerSaveObject") {
        throw new Error("Invalid save file");
      }

      const data: any = {};

      for (const key of Object.values(Bitburner.SaveDataKey)) {
        if (!rawData.data[key]) {
          data[key] = null;
        } else {
          data[key] = JSON.parse(rawData.data[key]);
        }
      }

      const saveData: Bitburner.SaveData = {
        ctor: Bitburner.Ctor.BitburnerSaveObject,
        data,
      };

      // Create deep copies for both original and modified stores
      this.setSaveData(saveData);

      if (this.modifiedSave.data.PlayerSave && this.modifiedSave.data.PlayerSave.data && !this.modifiedSave.data.PlayerSave.data.exploits.includes(Bitburner.Exploit.EditSaveFile)) {
        console.info("Applying EditSaveFile exploit!");
        this.modifiedSave.data.PlayerSave.data.exploits.push(Bitburner.Exploit.EditSaveFile);
      }

      // Log original NeuroFlux data for debugging
      const origInstalledNeuroFlux = this.originalSave.data.PlayerSave.data.augmentations?.filter((a: any) => a.name === "NeuroFlux Governor") || [];
      const origQueuedNeuroFlux = this.originalSave.data.PlayerSave.data.queuedAugmentations?.filter((a: any) => a.name === "NeuroFlux Governor") || [];
      console.info(`ORIGINAL FILE - Installed NeuroFlux: ${origInstalledNeuroFlux.length} entries (levels: ${origInstalledNeuroFlux.map((a: any) => a.level).join(', ')})`);
      console.info(`ORIGINAL FILE - Queued NeuroFlux: ${origQueuedNeuroFlux.length} entries (levels: ${origQueuedNeuroFlux.map((a: any) => a.level).join(', ')})`);

      console.info("File processed...");
    } catch (error) {
      console.error("Error processing file:", error);
      alert(`Failed to process save file: ${error instanceof Error ? error.message : String(error)}`);
      this.clearFile();
    }
  };

  downloadFile = () => {
    console.log(`DOWNLOAD - Current state before download:`);
    console.log(`  - this.save.data.PlayerSave.data.augmentations: ${this.save.data.PlayerSave.data.augmentations?.length || 0}`);
    console.log(`  - this.save.data.PlayerSave.data.queuedAugmentations: ${this.save.data.PlayerSave.data.queuedAugmentations?.length || 0}`);

    const rawData: Partial<Bitburner.RawSaveData> = {
      ctor: Bitburner.Ctor.BitburnerSaveObject,
    };

    const data: any = {};

    Object.values(Bitburner.SaveDataKey).forEach((key) => {
      // Each key's value needs to be stringified independently
      if (this.save.data[key] === null) {
        data[key] = "";
      } else {
        // Special handling for CompaniesSave - filter out companies with zero values
        if (key === Bitburner.SaveDataKey.CompaniesSave) {
          const filteredCompanies: any = {};
          Object.entries(this.save.data.CompaniesSave).forEach(([companyName, companyData]) => {
            // Only include companies where reputation or favor is not zero
            if (companyData.playerReputation !== 0 || companyData.favor !== 0) {
              filteredCompanies[companyName] = companyData;
            }
          });
          data[key] = JSON.stringify(filteredCompanies);
        } else if (key === Bitburner.SaveDataKey.PlayerSave) {
          // Special handling for PlayerSave - ensure augmentations are properly saved
          // Make a deep copy to avoid mutating the original
          const playerSaveCopy = JSON.parse(JSON.stringify(this.save.data.PlayerSave));

          // Log what we're about to save
          console.log(`DOWNLOAD - About to save PlayerSave with:`);
          console.log(`  - augmentations: ${playerSaveCopy.data.augmentations?.length || 0} total`);
          console.log(`  - queuedAugmentations: ${playerSaveCopy.data.queuedAugmentations?.length || 0} total`);

          const installedNeuroFlux = playerSaveCopy.data.augmentations?.filter((a: any) => a.name === "NeuroFlux Governor") || [];
          const queuedNeuroFlux = playerSaveCopy.data.queuedAugmentations?.filter((a: any) => a.name === "NeuroFlux Governor") || [];
          console.log(`  - installed NeuroFlux: ${installedNeuroFlux.length} entries (levels: ${installedNeuroFlux.map((a: any) => a.level).join(', ')})`);
          console.log(`  - queued NeuroFlux: ${queuedNeuroFlux.length} entries (levels: ${queuedNeuroFlux.map((a: any) => a.level).join(', ')})`);

          // The augmentations should already be correctly set by onSubmit in augmentations-section
          // This is just defensive - log if we see unexpected augmentation counts
          if (playerSaveCopy.data.augmentations && playerSaveCopy.data.augmentations.length > 200) {
            console.warn(`Warning: PlayerSave has ${playerSaveCopy.data.augmentations.length} augmentations - this seems excessive`);
          }
          if (playerSaveCopy.data.queuedAugmentations && playerSaveCopy.data.queuedAugmentations.length > 200) {
            console.warn(`Warning: PlayerSave has ${playerSaveCopy.data.queuedAugmentations.length} queued augmentations - this seems excessive`);
          }

          data[key] = JSON.stringify(playerSaveCopy);
        } else {
          data[key] = JSON.stringify(this.save.data[key]);
        }
      }
    });

    rawData.data = data;

    // Convert to JSON string
    const jsonString = JSON.stringify(rawData);

    // Check if original file was gzipped
    const isGzipped = this.file.name.endsWith('.gz');

    let blobData: Blob;
    let fileExtension: string;

    if (isGzipped) {
      // Compress the JSON string using gzip
      const compressed = pako.gzip(jsonString);
      blobData = new Blob([compressed], { type: "application/gzip" });
      fileExtension = ".json.gz";
    } else {
      // For non-gzipped files, use base64 encoding
      const encodedData = Buffer.from(jsonString).toString("base64");
      blobData = new Blob([encodedData], { type: "base64" });
      fileExtension = ".json";
    }

    const blobUrl = window.URL.createObjectURL(blobData);

    // Trick to start a download
    const downloadLink = document.createElement("a");
    downloadLink.style.display = "none";
    downloadLink.href = blobUrl;
    const match = this.file.name.match(/bitburnerSave_(?<ts>\d+)_(?<bn>BN.+?)(?:-H4CKeD)*?\.json/);

    downloadLink.download = `bitburnerSave_${
      Math.floor(Date.now() / 1000) // Seconds, not milliseconds
    }_${match.groups.bn ?? "BN1x0"}-H4CKeD${fileExtension}`;

    document.body.appendChild(downloadLink);
    downloadLink.click();

    downloadLink.remove();

    window.URL.revokeObjectURL(blobUrl);

    return jsonString;
  };

  setSaveData = (save: Bitburner.SaveData) => {
    // Create deep copies for both original and modified stores
    // We use JSON parse/stringify for deep cloning
    this.originalSave = JSON.parse(JSON.stringify(save));
    this.modifiedSave = JSON.parse(JSON.stringify(save));
  };

  revertChanges = () => {
    if (!this.originalSave) {
      console.warn("No original save data to revert to");
      return;
    }
    // Create a fresh deep copy of the original save
    // Wrap in runInAction to ensure MobX properly tracks this change
    runInAction(() => {
      this.modifiedSave = JSON.parse(JSON.stringify(this.originalSave));
    });
    console.info("Reverted all changes to original save data");
  };
}

export default new FileStore();
