import { getPackageJSON, resolvePkgPath, getBaseRollupPlugins } from './util'
import generatePackageJson from 'rollup-plugin-generate-package-json'

import alias from '@rollup/plugin-alias'

const { name, module, peerDependencies } = getPackageJSON('react-dom')
// react-dom 包的路径
const pkgPath = resolvePkgPath(name)

// react-dom打包后的路径
const pkgDistPath = resolvePkgPath(name, true)

export default [
    // react-dom
    {
        input: `${pkgPath}/${module}`,
        output: [
            {
                file: `${pkgDistPath}/index.js`,
                name: 'ReactDOM',
                format: 'umd'
            },
            {
                file: `${pkgDistPath}/client.js`,
                name: 'client',
                format: 'umd'
            }
        ],
        // react相对于react-dom是一个外部的包，不会打包进去
        external: [...Object.keys(peerDependencies)],
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
    },
    // react-test-utils
    {
        input: `${pkgPath}/test-utils.ts`,
        output: [
            {
                file: `${pkgDistPath}/test-utils.js`,
                name: 'testUtils',
                format: 'umd'
            }
        ],
        // react相对于react-dom是一个外部的包，不会打包进去
        external: ['react-dom', 'react'],
        plugins: getBaseRollupPlugins()
    }
]