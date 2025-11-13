const path = require('path');
const rules = require('./webpack.rules');

module.exports = {
  entry: './src/main.js',
  target: 'electron-main',
  module: {
    rules: [...rules],
  },
  resolve: {
    extensions: ['.js', '.jsx', '.json'],
  },
  output: {
    path: path.resolve(__dirname, '.webpack/main'),
  },
};
