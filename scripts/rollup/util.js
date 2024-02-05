import path from 'path'
import fs from 'fs'

// plugin
import ts from 'rollup-plugin-typescript2'
import cjs from '@rollup/plugin-commonjs'
// 为开发环境增加__DEV__标识，方便Dev包打印更多信息
import replace from '@rollup/plugin-replace'

// 这个变量指向packages目录
const pkgPath = path.resolve(__dirname, '../../packages')

// 指定一个打包后的文件的路径
const distPath = path.resolve(__dirname, '../../dist/node_modules')

// 第一个参数是获取对应的路径,第二个参数用于获取是否是打包后的路径
export function resolvePkgPath(pkgName, isDist) {
    // 是否是打包后的路径
    if (isDist) {
        return `${distPath}/${pkgName}`
    }
    return `${pkgPath}/${pkgName}`
}

// 根据文件名获取到对应的json文件
export function getPackageJSON(pkgName) {
    // 包的路径
    const path = `${resolvePkgPath(pkgName)}/package.json`
    const str = fs.readFileSync(path, { encoding: 'utf-8' })
    return JSON.parse(str)
}

// 获取所有基础的plugin
export function getBaseRollupPlugins({ alias = { __DEV__: true, preventAssignment: true }, typescript = {} } = {}) {
    return [replace(alias), cjs(), ts(typescript)]
}