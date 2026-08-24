import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

export default defineConfig({
    base: './',
    resolve: {
        alias: {
            'super-beautiful-modals': fileURLToPath(new URL('../../src/index.js', import.meta.url)),
        },
    },
})
