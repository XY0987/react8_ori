import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import replace from '@rollup/plugin-replace'

import { resolvePkgPath } from '../rollup/util'

import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    replace(
      {
        __DEV__: true,
        preventAssignment: true
      })
  ],
  // 设置模块解析路径（避免引入真实的react，引入自己写的react）
  resolve: {
    alias: [
      {
        find: 'react',
        replacement: resolvePkgPath('react')
      },
      {
        find: 'react-dom',
        replacement: resolvePkgPath('react-dom')
      },
      {
        find: 'hostConfig',
        replacement: path.resolve(resolvePkgPath('react-dom'), './src/hostConfig.ts')
      }
    ]
  }
})
