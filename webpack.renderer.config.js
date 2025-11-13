const rules = require('./webpack.rules');
const plugins = require('./webpack.plugins');

const rendererRules = [...rules];
rendererRules.push({
  test: /\.css$/i,
  use: ['style-loader', 'css-loader'],
});

module.exports = {
  module: {
    rules: rendererRules,
  },
  plugins,
  resolve: {
    extensions: ['.js', '.jsx', '.json'],
    fallback: {
      events: require.resolve('events/'),
    },
  },
};
