import path from "path"
import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react-swc"
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import compression from 'vite-plugin-compression'
import { visualizer } from 'rollup-plugin-visualizer'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const isProd = mode === 'production'

  return {
    plugins: [
      react(),
      compression({
        algorithm: 'gzip',
        ext: '.gz',
      }),
      compression({
        algorithm: 'brotliCompress',
        ext: '.br',
      }),
      isProd && visualizer({
        open: false,
        gzipSize: true,
        brotliSize: true,
      })
    ].filter(Boolean),

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      }
    },

    build: {
      outDir: "dist/client",
      emptyOutDir: true,
      sourcemap: !isProd,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'ui-vendor': ['@radix-ui/react-icons', '@radix-ui/react-slot'],
            'utils-vendor': ['lodash-es']
          }
        }
      }
    },

    server: {
      port: 3000,
      strictPort: true,
      host: true,
      proxy: {
        '/rest/v1': {
          target: env.VITE_SUPABASE_URL,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/rest\/v1/, '/rest/v1'),
          headers: {
            'apikey': env.VITE_SUPABASE_ANON_KEY
          }
        },
        '/auth/v1': {
          target: env.VITE_SUPABASE_URL,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/auth\/v1/, '/auth/v1'),
          headers: {
            'apikey': env.VITE_SUPABASE_ANON_KEY
          }
        }
      }
    },

    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@radix-ui/react-icons',
        '@radix-ui/react-slot'
      ]
    }
  }
})