import path from "path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react-swc"
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    exclude: ['pg'] // Exclude pg from optimization
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      "/api": {
        target: "https://emp-i6gc.onrender.com/",
        changeOrigin: true,
        secure: false
      }
    }
  },
  preview: {
    port: 3000,
    host: true,
    allowedHosts: ["emp-i6gc.onrender.com"]
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@radix-ui/react-icons', '@radix-ui/react-slot'],
          charts: ['recharts'],
          database: ['pg'],
          websocket: ['pusher-js']
        }
      }
    },
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    }
  },
  define: {
    // Polyfill process.env for pg
    'process.env': {
      VITE_DATABASE_URL: JSON.stringify(process.env.VITE_DATABASE_URL),
      NODE_ENV: JSON.stringify(process.env.NODE_ENV)
    }
  }
})