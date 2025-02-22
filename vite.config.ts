import path from "path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react-swc"
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    }
  },

  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    minify: true,
    target: 'esnext'
  },

  server: {
    port: parseInt(process.env.PORT || '3000'),
    host: true
  }
})