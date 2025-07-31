import { resolve } from "path";
import { defineConfig } from "vite";
import dts from 'vite-plugin-dts'

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, "src/plugin.ts"),
            name: "Plugin",
            fileName: "plugin",
        },
        rollupOptions: {
            external: ["kaplay"],
        },
    },
    plugins: [dts({ rollupTypes: true, tsconfigPath: "./tsconfig.json" })]
})