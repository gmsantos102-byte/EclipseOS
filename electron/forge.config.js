// EclipseOS — Electron Forge packaging config.
// After exporting this project to GitHub and running `npm install`, use:
//   npx electron-forge import      (once — wires the npm scripts)
//   npm run make                   (builds the Windows installer)
module.exports = {
  packagerConfig: {
    asar: true,
    name: 'EclipseOS',
    executableName: 'EclipseOS',
  },
  rebuildConfig: {},
  makers: [
    { name: '@electron-forge/maker-squirrel', config: { name: 'EclipseOS' } },
    { name: '@electron-forge/maker-zip', platforms: ['win32', 'linux'] },
  ],
};