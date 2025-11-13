const webpack = require('webpack');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');

const plugins = [];

if (process.env.NODE_ENV !== 'production') {
  plugins.push(new webpack.HotModuleReplacementPlugin());
  plugins.push(new ReactRefreshWebpackPlugin());
}

module.exports = plugins;
