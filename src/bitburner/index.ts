// Import Bitburner namespace (contains SaveDataKey enum and other types)
import { Bitburner } from "./types";
// Import actual data constants
import { ALL_COMPANIES, ALL_JOB_TITLES, COMPANY_JOBS } from "./data/companies";
import {
  ALL_AUGMENTATIONS,
  AUGMENTATION_DATA,
  getAugmentationsByEffect,
  getAugmentationsByFaction,
  getAugmentationsByCategory,
} from "./data/augmentations";

// Re-export the Bitburner namespace (for both types and runtime enum values)
export { Bitburner } from "./types";

// Extend the Bitburner namespace with runtime data using Object.assign
// This modifies the imported namespace object to add our game data constants
Object.assign(Bitburner, {
  ALL_COMPANIES,
  ALL_JOB_TITLES,
  COMPANY_JOBS,
  ALL_AUGMENTATIONS,
  AUGMENTATION_DATA,
  getAugmentationsByEffect,
  getAugmentationsByFaction,
  getAugmentationsByCategory,
});

// Re-export data constants for direct imports
export {
  ALL_COMPANIES,
  ALL_JOB_TITLES,
  COMPANY_JOBS,
  ALL_AUGMENTATIONS,
  AUGMENTATION_DATA,
  getAugmentationsByEffect,
  getAugmentationsByFaction,
  getAugmentationsByCategory,
};
