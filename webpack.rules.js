const babelLoader = {
  test: /\.jsx?$/i,
  exclude: /(node_modules|\.webpack)/,
  use: {
    loader: 'babel-loader',
    options: {
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              electron: '39',
            },
          },
        ],
        '@babel/preset-react',
      ],
      plugins: [
        process.env.NODE_ENV !== 'production' && require.resolve('react-refresh/babel'),
      ].filter(Boolean),
    },
  },
};

module.exports = [babelLoader];
