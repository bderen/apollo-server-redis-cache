const webpack = require('webpack');
const UglifyJsPlugin = webpack.optimize.UglifyJsPlugin;
const path = require('path');
const nodeExternals = require('webpack-node-externals');

let libraryName = 'library';

let plugins = [],
  outputFile;

if (process.env.NODE_ENV === 'build') {
  plugins.push(new UglifyJsPlugin({
    minimize: true,
  }));
  outputFile = libraryName + '.min.js';
} else {
  outputFile = libraryName + '.js';
}

const config = {
  target: 'node',
  externals: [nodeExternals()],
  entry: __dirname + '/index.js',
  devtool: 'source-map',
  output: {
    path: __dirname + '/lib',
    filename: outputFile,
    library: libraryName,
    libraryTarget: 'umd',
    umdNamedDefine: true,
  },
  module: {
    rules: [
      {
        test: /(\.jsx|\.js)$/,
        loader: 'babel-loader',
        exclude: /(node_modules|bower_components)/,
      },
      {
        test: /(\.jsx|\.js)$/,
        loader: "eslint-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    modules: [path.resolve('./node_modules'), path.resolve('./')],
    extensions: ['.json', '.js'],
  },
  plugins: plugins,
};

module.exports = config;
