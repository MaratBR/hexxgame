import * as path from "path";
import * as webpack from "webpack";
import {ForkTsCheckerWebpackPlugin} from "fork-ts-checker-webpack-plugin/lib/ForkTsCheckerWebpackPlugin";
const PNPPlugin = require('pnp-webpack-plugin')

function makeConfig(config: webpack.Configuration): webpack.Configuration {
    config.resolve = config.resolve || {}
    config.resolve.extensions = config.resolve.extensions || []
    for (let ext of ['.ts', '.js', '.json'])
        if (!config.resolve.extensions.includes(ext))
            config.resolve.extensions.push(ext)

    config.resolve.plugins = config.resolve.plugins || []
    config.resolve.plugins.push(PNPPlugin)

    config.resolveLoader = config.resolveLoader || {}
    config.resolveLoader.plugins = config.resolveLoader.plugins || []
    config.resolveLoader.plugins.push(PNPPlugin.moduleLoader(module))

    return config
}

const serverConfig = makeConfig({
    entry: path.resolve(__dirname, '../server/server.ts'),
    output: {
        filename: 'server.js',
        path: path.resolve(__dirname, '../dist/server')
    },
    resolve: {
        modules: [
            path.resolve(__dirname, '../server')
        ]
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: 'ts-loader',
                exclude: /node_modules/,
                options: {
                    transpileOnly: true,
                    configFile: path.resolve(__dirname, '../server/tsconfig.json')
                }
            }
        ]
    },
    plugins: [
        new ForkTsCheckerWebpackPlugin({
            typescript: {
                configFile: path.resolve(__dirname, '../server/tsconfig.json')
            }
        })
    ]
})

const clientConfig = makeConfig({
    entry: path.resolve(__dirname, '../client/client.ts'),
    resolve: {
        modules: [
            path.resolve(__dirname, '../client')
        ]
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: 'ts-loader',
                exclude: /node_modules/,
                options: {
                    transpileOnly: true
                }
            }
        ]
    },
    plugins: [
        new ForkTsCheckerWebpackPlugin({
            typescript: {
                configFile: path.resolve(__dirname, '../client/tsconfig.json')
            }
        })
    ]
})

const configs: webpack.Configuration[] = [
    serverConfig,
    clientConfig
]

console.log(serverConfig)

export default serverConfig