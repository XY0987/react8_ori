import { getPackageJSON, resolvePkgPath, getBaseRollupPlugins } from './util'
import generatePackageJson from 'rollup-plugin-generate-package-json'

const { name, module } = getPackageJSON('react')
// react 包的路径
const pkgPath = resolvePkgPath(name)

// react打包后的路径
const pkgDistPath = resolvePkgPath(name, true)

export default [
    // react
    {
        input: `${pkgPath}/${module}`,
        output: {
            file: `${pkgDistPath}/index.js`,
            name: 'React',
            format: 'umd'
        },
        plugins: [
            ...getBaseRollupPlugins(),
            generatePackageJson({
                inputFolder: pkgPath,
                outputFolder: pkgDistPath,
                baseContents: ({ name, description, version }) => {
                    return {
                        name,
                        description,
                        version,
                        main: 'index.js'
                    }
                }
            })]
    },
    // jsx-runtime
    {
        input: `${pkgPath}/src/jsx.ts`,
        output: [
            // jsx-runtime
            {
                file: `${pkgDistPath}/jsx-runtime.js`,
                name: 'jsx-runtime',
                format: 'umd',
            },
            // jsx-dev-runtime
            {
                file: `${pkgDistPath}/jsx-dev-runtime.js`,
                name: 'jsx-dev-runtime',
                format: 'umd',
            }
        ],
        plugins: getBaseRollupPlugins()
    }
]