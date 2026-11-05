import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Caminhos relativos para o build funcionar em qualquer subpasta (ex.: GitHub Pages)
  base: './',
  server: {
    port: 5173,
    strictPort: true,
  },
  test: {
    include: ['src/**/*.test.ts'],
    // A lógica do jogo não depende do DOM; quem precisa usa `// @vitest-environment jsdom`
    environment: 'node',
  },
})
