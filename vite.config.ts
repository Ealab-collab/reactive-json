import {fileURLToPath} from 'node:url'
import {glob} from 'glob'
import {extname, relative, resolve} from 'path'
import {defineConfig} from 'vite'
import dts from 'vite-plugin-dts'
import {libInjectCss} from "vite-plugin-lib-inject-css";
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        libInjectCss(),
        dts({
            tsconfigPath: resolve(__dirname, 'tsconfig.lib.json'),
            //include: ['lib']
        }),
    ],
    build: {
        lib: {
            entry: resolve(__dirname, 'lib/main.jsx'),
            formats: ['es']
        },
        copyPublicDir: false,
        rollupOptions: {
            external: ['react', 'react/jsx-runtime'],
            input: Object.fromEntries(
                glob.sync('lib/**/*.{ts,tsx,js,jsx}', {
                    ignore: [
                        'lib/**/*.d.ts',
                        // This will ignore storybook files in case you have them in the lib directory.
                        'lib/**/*.stories.tsx',
                    ],
                }).map(file => [
                    // The name of the entry point
                    // lib/nested/foo.ts becomes nested/foo
                    relative(
                        'lib',
                        file.slice(0, file.length - extname(file).length)
                    ),
                    // The absolute path to the entry file
                    // lib/nested/foo.ts becomes /project/lib/nested/foo.ts
                    fileURLToPath(new URL(file, import.meta.url))
                ])
            ),
            output: {
                assetFileNames: 'assets/[name][extname]',
                entryFileNames: '[name].js',
            }
        }
    }
})
