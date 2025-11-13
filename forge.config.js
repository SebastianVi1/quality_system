const path = require('path');

module.exports = {
  packagerConfig: {},
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-webpack',
      config: {
        mainConfig: path.resolve(__dirname, './webpack.main.config.js'),
        renderer: {
          config: path.resolve(__dirname, './webpack.renderer.config.js'),
          entryPoints: [
            {
              html: path.resolve(__dirname, './src/index.html'),
              js: path.resolve(__dirname, './src/renderer.jsx'),
              name: 'main_window',
              preload: {
                js: path.resolve(__dirname, './src/preload.js'),
              },
            },
          ],
        },
      },
    },
  ],
};
