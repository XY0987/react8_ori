import { getPackageJSON, resolvePkgPath, getBaseRollupPlugins } from './util'
import generatePackageJson from 'rollup-plugin-generate-package-json'

import alias from '@rollup/plugin-alias'

const { name, module } = getPackageJSON('react-dom')
// react-dom 包的路径
const pkgPath = resolvePkgPath(name)

// react-dom打包后的路径
const pkgDistPath = resolvePkgPath(name, true)

export default [
    // react
    {
        input: `${pkgPath}/${module}`,
        output: [
            {
                file: `${pkgDistPath}/index.js`,
                name: 'index.js',
                format: 'umd'
            },
            {
                file: `${pkgDistPath}/client.js`,
                name: 'client.js',
                format: 'umd'
            }
        ],
        plugins: [
            ...getBaseRollupPlugins(),
            // 指定hostConfig指向
            alias({
                entries: {
                    hostConfig: `${pkgPath}/src/hostConfig.ts`
                }
            }),
            generatePackageJson({
                inputFolder: pkgPath,
                outputFolder: pkgDistPath,
                baseContents: ({ name, description, version }) => {
                    return {
                        name,
                        description,
                        version,
                        peerDependencies: {
                            react: version
                        },
                        main: 'index.js'
                    }
                }
            })]
    }
]