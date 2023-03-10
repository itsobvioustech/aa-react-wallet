const webpack = require("webpack")
const webpackPlugins = require("craco-webpack-plugins")

module.exports = {
    webpack: {
        configure: {
            module: {
                rules: [
                    {
                        test: /\.m?js$/,
                        resolve: {
                            fullySpecified: false,
                        },
                    },
                ]
            },
            resolve: {
                fallback: {
                    "crypto": require.resolve("crypto-browserify"),
                    "buffer": require.resolve('buffer/'),
                    "stream": false
                }
            }
        }
    },
    plugins: [{
        plugin: webpackPlugins,
        options: {
            plugins: [new webpack.ProvidePlugin({
                Buffer: ['buffer', 'Buffer'],
            })]
        }
    }],
};