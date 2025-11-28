# Bitburner Save Editor - LLM Context

## IMPORTANT: Instructions for LLM Agents

**This document serves as persistent memory across chat sessions. Follow these guidelines:**

1. **Maintain this document**: When you discover important architectural decisions, patterns, gotchas, or implementation details during your work, add them to the appropriate section of this document. This ensures future AI agents have the context they need.

2. **Update the README checklist**: The `README.md` file contains a TODO checklist that tracks project progress. You MUST:
   - Mark items as complete `[x]` when you finish implementing them
   - Add new checklist items when you identify additional work needed
   - Keep sub-items organized under their parent features
   - Maintain the existing format and structure

3. **Document patterns**: If you establish a new pattern or convention while working on a feature, document it here so future implementations remain consistent.

4. **Note breaking changes**: If you discover version-specific behavior or compatibility issues, document them in the "Important Notes" section.

5. **This file is for LLMs**: Write for other AI agents, not humans. Be concise but comprehensive. Focus on what an LLM needs to work effectively on this codebase.

## Project Overview

This is a web-based save file editor for the game **Bitburner** (Steam version 2.8.1). It allows users to upload their Bitburner save files and modify various game attributes including player stats, factions, companies, servers, augmentations, and jobs. The editor maintains both an immutable original copy and a mutable working copy of the save data, enabling users to revert changes at any time.

**Origin**: This is a fork of the original project by Redmega (https://github.com/Redmega/bitburner-save-editor). All code in this fork has been produced via AI assistance under human guidance.

**Tech Stack**: React, TypeScript, MobX (state management), Tailwind CSS, Create React App

## Save File Format

Bitburner save files can be in three formats:
1. **Gzipped JSON** (`.json.gz`) - Compressed JSON
2. **Base64-encoded JSON** (`.json`) - JSON encoded as base64 string
3. **Plain JSON** (`.json`) - Direct JSON (version 2.8.1+)

The root structure is a `BitburnerSaveObject` containing nested save data for different game systems (PlayerSave, FactionsSave, CompaniesSave, AllServersSave, etc.). Each system's data is stored as a stringified JSON value that must be parsed individually.

## Project Structure

### Core Files

- **`src/App.tsx`** - Root component, provides FileStore context
- **`src/store/file.store.ts`** - MobX store managing save data (original + modified copies)
- **`src/bitburner.types.ts`** - TypeScript definitions for Bitburner data structures, game constants (companies, jobs, augmentations)
- **`src/components/file-loader.tsx`** - File upload component
- **`src/components/editor/`** - Main editor interface with tabbed sections

### Editor Sections

All section components follow a similar pattern:
- Fetch data from FileStore via React Context
- Display items in a grid with inline editing
- Support search/filter and sorting
- Track changes with visual indicators (yellow border = modified, blue tag = new)
- Provide "Reset" buttons to revert individual items

**Implemented Sections**:
- **PlayerSection** (`player-section.tsx`) - Nested tabs for Stats, Augmentations, Jobs, etc.
- **FactionsSection** (`factions-section.tsx`) - Faction membership, reputation, favor
- **CompaniesSection** (`companies-section.tsx`) - Company reputation and favor
- **ServersSection** (`servers-section.tsx`) - Server RAM, money, admin rights, backdoors
- **AugmentationsSection** (`augmentations-section.tsx`) - Installed/queued augmentations
- **JobsSection** (`jobs-section.tsx`) - Player jobs at companies

### State Management Pattern

The FileStore uses MobX observables and follows this pattern for each game system:

```typescript
get systemName() {
  return {
    data: parseData(this.save.data.SystemSave),
    originalData: parseData(this.originalSave.data.SystemSave),
    updateItem: this.updateItem,
    deleteItem: this.deleteItem, // if applicable
  };
}
```

All mutations use `runInAction()` to ensure MobX tracking. The store provides:
- `uploadFile()` - Process and load a save file
- `downloadFile()` - Export modified save in original format (gzipped or base64)
- `revertChanges()` - Reset modified save to original state
- `hasChanges` - Computed property comparing original vs modified

## Bitburner Reference Materials

### Local Bitburner Source Code

The Bitburner source code repository is cloned locally at:
**`.bitburner-src-dev/`** (ignored by git)

This contains the complete source code for reference when implementing features.

### Official Documentation

The official Bitburner documentation is located at:
**`.bitburner-src-dev/src/Documentation/doc/en/index.md`**

This includes comprehensive game documentation, API references, and mechanics explanations.

### Key Source Files for Reference

When implementing features, these source files are particularly useful:

- **Company Data**: `.bitburner-src-dev/src/Company/`
  - `Enums.ts` - Company name constants
  - `data/CompaniesMetadata.ts` - Company job availability
  - `data/JobTracks.ts` - Career progression tracks

- **Job Data**: `.bitburner-src-dev/src/Work/Enums.ts`
  - JobName enum with all job titles

- **Faction Data**: `.bitburner-src-dev/src/Faction/`
  - Faction names, requirements, augmentations

- **Augmentation Data**: `.bitburner-src-dev/src/Augmentation/`
  - Augmentation names, effects, prerequisites

- **Server Data**: `.bitburner-src-dev/src/Server/`
  - Server properties and mechanics

## Game Data Constants

The editor includes hardcoded constants from Bitburner in `src/bitburner.types.ts`:

- **`ALL_COMPANIES`** - All 38 companies in the game
- **`ALL_JOB_TITLES`** - All 36 job positions
- **`COMPANY_JOBS`** - Mapping of which companies offer which jobs
- **`ALL_AUGMENTATIONS`** - All augmentation names

These constants are extracted from the official Bitburner source code and verified for version 2.8.1.

## Development Workflow

### Adding a New Feature

1. **Research**: Check Bitburner source code in `.bitburner-src-dev/` for data structures
2. **Types**: Add/update TypeScript definitions in `bitburner.types.ts`
3. **Store**: Add getter and update methods to `file.store.ts`
4. **UI Component**: Create section component in `src/components/editor/section/`
5. **Integration**: Wire up component in `section/index.tsx`
6. **Test**: Build with `npm run build` and verify functionality

### Pattern for Section Components

Section components should:
- Be observer components (MobX)
- Accept `isFiltering?: boolean` prop
- Use `useContext(FileContext)` to access store
- Implement search/filter when `isFiltering` is true
- Use the Input component from `components/inputs/`
- Display items in a responsive grid (`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4`)
- Show visual change indicators (yellow border + "Reset" button for modified items)

### Styling

- Uses Tailwind CSS utility classes
- Color scheme: Green theme (`green-300`, `green-700`, etc.) for primary actions
- Gray theme (`gray-700`, `gray-800`, `gray-900`) for surfaces
- Yellow (`yellow-500`) for change indicators
- Blue (`blue-300`, `blue-900`) for new items

## Save File Processing

### Loading a Save

1. User uploads file via FileLoader
2. FileStore detects format (gzipped vs base64 vs JSON)
3. Decompresses/decodes as needed
4. Validates `ctor === "BitburnerSaveObject"`
5. Parses each nested JSON string into objects
6. Deep-clones data into `originalSave` and `modifiedSave`
7. Auto-adds "EditSaveFile" exploit if not present

### Downloading a Save

1. Iterates through all SaveDataKey values
2. Stringifies each system's data independently
3. Special handling:
   - **CompaniesSave**: Filters out companies with zero rep/favor
   - **PlayerSave**: Preserves augmentation arrays correctly
4. Encodes as base64 or compresses with gzip (matches original format)
5. Generates filename: `bitburnerSave_{timestamp}_{bitnodeN}-H4CKeD.json[.gz]`

## Common Data Patterns

### Jobs
- Stored as `Record<string, string>` (company name � job title)
- Editable via JobsSection with dropdowns filtered by company

### Factions
- Membership stored in PlayerSave.data.factions (string array)
- Invitations stored in PlayerSave.data.factionInvitations
- Reputation/favor stored in FactionsSave (per-faction objects)

### Companies
- Reputation/favor stored in CompaniesSave (per-company objects)
- Some companies may not exist in save until player interacts with them
- Editor shows all companies with zero values by default

### Augmentations
- Installed: `PlayerSave.data.augmentations` (array of `{name, level}`)
- Queued: `PlayerSave.data.queuedAugmentations`
- NeuroFlux Governor can appear multiple times with different levels

### Servers
- Stored as `AllServersSave` (Record<hostname, ServerObject>)
- Key editable properties: maxRam, moneyAvailable, hasAdminRights, backdoorInstalled
- Special servers: "home" (player's home server), purchased servers

## Progress Tracking

**CRITICAL**: You must actively maintain the project checklist in `README.md`.

### Checklist Management Rules

1. **Location**: All progress tracking is in `README.md` under the "TODO" section
2. **Format**: Uses markdown checkboxes `- [ ]` (incomplete) and `- [x]` (complete)
3. **Your Responsibilities**:
   - Mark items complete when you finish implementing them
   - Add new items when you identify work that needs to be done
   - Keep nested sub-items properly indented
   - Don't remove completed items - they show project history
4. **When to Update**:
   - Immediately after completing a feature or sub-feature
   - When you discover new requirements during implementation
   - When breaking a large feature into smaller tasks

The TODO list is the **single source of truth** for project status. Keep it current.

## Important Notes

- **Save Compatibility**: Tested with Bitburner Steam version 2.8.1 only
- **Data Validation**: The editor does minimal validation - users can set invalid values
- **Exploit Marking**: Editing a save automatically adds the "EditSaveFile" exploit
- **Change Tracking**: Uses JSON.stringify comparison (deep equality check)
- **MobX Reactivity**: All state mutations must use `runInAction()` or MobX action methods
- **Type Safety**: TypeScript strict mode is enabled, but uses `any` in some places for flexibility
- **No Backend**: This is a pure client-side application - all processing happens in the browser

## Example Usage Flow

1. User exports save from Bitburner (Settings � Export Game)
2. User uploads save file to editor
3. Editor parses and displays data across multiple tabs
4. User navigates to desired section (e.g., Player � Jobs)
5. User clicks "Add Job" and selects company + job title from dropdowns
6. Editor shows yellow border indicating unsaved change
7. User can revert individual changes or all changes
8. User downloads modified save
9. User imports modified save back into Bitburner (Settings � Import Game)

## Key Dependencies

- **React 18** - UI framework
- **MobX 6** - State management (observable, computed, action)
- **Ramda** - Functional utilities (sorting, path access)
- **Pako** - Gzip compression/decompression
- **Tailwind CSS** - Utility-first styling
- **Heroicons** - Icon components

## File Naming Conventions

- Components: PascalCase (e.g., `JobsSection.tsx`, `FileLoader.tsx`)
- Utilities: kebab-case (e.g., `file.store.ts`, `format.ts`)
- Types: PascalCase namespaced (e.g., `Bitburner.PlayerSaveObject`)

## Testing Notes

- No automated tests currently implemented
- Manual testing required with actual Bitburner save files
- Example save files located in `example save files/` (ignored by git)
- Test both gzipped and base64 save formats
- Verify downloaded saves can be imported back into Bitburner successfully

---

## Document Maintenance Log

*Track significant updates to this context document here. Include date and brief description.*

- **2025-01** - Initial document creation with comprehensive project context
- **2025-01** - Added LLM agent instructions for maintaining this document and README checklist
