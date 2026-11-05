import { defineConfig } from 'vite'

export default defineConfig({
  // Caminhos relativos para o build funcionar em qualquer subpasta (ex.: GitHub Pages)
  base: './',
  server: {
    port: 5173,
    strictPort: true,
  },
})
