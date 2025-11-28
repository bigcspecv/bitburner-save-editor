import { Bitburner } from "./types";
import { ALL_COMPANIES, ALL_JOB_TITLES, COMPANY_JOBS } from "./data/companies";
import {
  ALL_AUGMENTATIONS,
  AUGMENTATION_DATA,
  getAugmentationsByEffect,
  getAugmentationsByFaction,
  getAugmentationsByCategory,
} from "./data/augmentations";

// Attach data/constants/helpers onto the Bitburner namespace value
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

export { Bitburner };
export * from "./types";
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
