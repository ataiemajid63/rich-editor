var webpack = require('webpack');
var path = require('path');

var BUILD_DIR = path.resolve(__dirname, 'example/dist');
var APP_DIR = path.resolve(__dirname, 'example/src');
var MAIN_DIR = path.resolve(__dirname);

var config = {
  entry: APP_DIR + '/main.jsx',
  output: {
    path: BUILD_DIR,
    filename: 'main.js'
  },
  module : {
    rules : [
      {
        test : /\.jsx?/,
        include : MAIN_DIR,
        loader : 'babel-loader'
      }
    ]
  }
};

module.exports = config;