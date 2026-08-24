import { defineConfig } from 'vite'

export default defineConfig({
    build: {
        lib: {
            entry: 'src/index.js',
            formats: ['es'],
            fileName: () => 'super-beautiful-modals.js',
            cssFileName: 'style',
        },
        cssCodeSplit: false,
        sourcemap: true,
        target: 'es2020',
    },
})
