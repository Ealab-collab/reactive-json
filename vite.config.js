import {defineConfig} from "vite";
import {resolve} from "path";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({command}) => {
    return {
        plugins: [react()],
        // Do not include the public dir when building; it's only for the demo app.
        // See: https://github.com/vitejs/vite/discussions/7374
        publicDir: command === 'build' ? false : 'public',
        build: {
            lib: {
                entry: resolve(__dirname, "lib/main.jsx"),
                name: "ReactiveJson"
            },
            rollupOptions: {
                external: ["react", "react-dom"],
                output: {
                    globals: {
                        "react": 'React',
                        "react-dom": 'React.DOM',
                    }
                }
            }
        },
        resolve: {
            alias: {
                "react": resolve(__dirname, "./node_modules/react")
            }
        }
    }
});
