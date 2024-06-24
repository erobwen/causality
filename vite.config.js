// For more info: https://vitejs.dev/config/
import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [],
  test: {
    globals: true,
    environment: 'jsdom',
  },
  build: {
    minify: true,
    lib: {
      entry: resolve(__dirname, 'src/causality.js'),
      name: "output_name"
    },
  }
})
