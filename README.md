# Bitburner Save Editor

Web-based editor for Bitburner save files. Upload your save (JSON/base64 or gzipped), tweak stats, factions, companies, servers, and augmentations, then download a fresh save ready to import. This fork continues work from the original project by Redmega (https://github.com/Redmega/bitburner-save-editor); credit to them for the foundation.

> Note: The code in this fork has been produced entirely via AI assistance under human guidance; the maintainer has not manually authored or deeply reviewed every change. If you file any issues or comments please do so with that context in mind.

> Compatibility: Verified with Bitburner Steam version 2.8.1 save files. Other game versions have not been tested.

## Usage

https://redmega.github.io/bitburner-save-editor/

Open the save editor and upload your exported Bitburner save file. When you're done editing, you can click the download icon in the header to get a new version of your save that you can import to the game.

## TODO

- [ ] Aliases
- [ ] Global Aliases
- [ ] Gangs
- [x] Servers (view/search, bulk select, edit RAM/money/root/backdoor flags)
- [x] Companies (rep/favor with search and sorting)
- [x] Factions (membership/invites/rep/favor with search and sorting)
- [ ] Player
  - [x] Money, karma, entropy
  - [x] Stats & skills
  - [x] Augmentations (installed/queued, NeuroFlux level tracking)
  - [x] Exploits
    - [x] Edit Save File (auto-added on load)
  - [ ] Jobs, hacknet, location, progression, stock, feature flags
- [ ] Settings
- [ ] Staneks
- [ ] Stock Market

## Contributing

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).
