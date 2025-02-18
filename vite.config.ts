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
      react({
        plugins: [['@swc/plugin-react', { runtime: 'automatic' }]],
      }),
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
    ],

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      }
    },

    server: {
      port: 3000,
      host: true,
      strictPort: true,
      proxy: {
        "/api": {
          target: env.VITE_API_URL || "http://127.0.0.1:3001",
          changeOrigin: true,
          secure: isProd,
          ws: true
        }
      }
    },

    build: {
      outDir: "dist",
      sourcemap: false,
      minify: 'esbuild',
      target: 'esnext',
      assetsDir: 'assets',
      cssCodeSplit: true,
      reportCompressedSize: false,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'ui-vendor': ['@radix-ui/react-icons', '@radix-ui/react-slot', '@radix-ui/react-dialog'],
            'utils-vendor': ['date-fns', 'lodash-es']
          },
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
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
      ],
      exclude: ['@radix-ui/react-dialog']
    },

    css: {
      modules: {
        localsConvention: 'camelCase'
      },
      preprocessorOptions: {
        scss: {
          additionalData: `@import "@/styles/variables.scss";`
        }
      },
      devSourcemap: false
    },

    esbuild: {
      jsxInject: `import React from 'react'`,
      drop: isProd ? ['console', 'debugger'] : [],
      pure: isProd ? ['console.log', 'console.info', 'console.debug', 'console.trace'] : []
    },

    preview: {
      port: 3000,
      host: true,
      strictPort: true
    }
  }
})