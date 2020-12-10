const shutil = require('shutil')
const path = require('path')
const async = require('async')

if (path.resolve(__dirname, '..') !== process.cwd()) {
    console.error('OOPS! You have to run this from the root of the project')
    process.exit(1)
}

async.waterfall([
    shutil.run('yarn workspace @hexx/common build'),
    shutil.run('yarn workspace @hexx/server build'),
    shutil.run('yarn workspace @hexx/client build')
])