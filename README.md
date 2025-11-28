# Bitburner Save Editor

Web-based editor for Bitburner save files. Upload your save (JSON/base64 or gzipped), tweak stats, factions, companies, servers, and augmentations, then download a fresh save ready to import. This fork continues work from the original project by Redmega (https://github.com/Redmega/bitburner-save-editor); credit to them for the foundation.

> Note: The code in this fork has been produced entirely via AI assistance under human guidance; the maintainer has not manually authored or deeply reviewed every change. If you file any issues or comments please do so with that context in mind.

> Compatibility: Verified with Bitburner Steam version 2.8.1 save files. Other game versions have not been tested.

## Usage

1. Install dependencies: `npm install`
2. Start the app locally: `npm start` (runs on http://localhost:3000 by default)
3. In the app, upload your exported Bitburner save (JSON, base64, or gzipped).
4. Edit sections as needed (player, factions, companies, servers, augmentations).
5. Download the modified save and import it back into Bitburner.

## TODO

- [ ] Aliases
- [ ] Global Aliases
- [ ] Gangs
- [x] Servers (view/search, bulk select, edit RAM/money/root/backdoor flags)
- [x] Companies (rep/favor with search and sorting)
- [x] Factions (membership/invites/rep/favor with search and sorting)
- [ ] Player
  - [x] Stats & skills
  - [x] Augmentations (installed/queued, NeuroFlux level tracking)
    - [x] Display augmentation effects/benefits
    - [x] Filter by effect type (hacking, combat stats, reputation, etc.)
  - [x] Jobs
  - [ ] hacknet
  - [ ] location
  - [ ] progression
  - [ ] stock
  - [ ] feature flags
- [ ] Settings
- [ ] Staneks
- [ ] Stock Market

## Contributing

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).
