import { defineConfig, mergeConfig } from 'vitest/config'
import vite from './vite.config'

export default mergeConfig(vite, defineConfig({
  test: { include: ['tests/{unit,integration}/**/*.test.{ts,tsx}'] },
}))
