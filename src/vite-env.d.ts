/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_STORAGE_URL: string
  readonly VITE_REDIS_URL: string
  readonly VITE_DATABASE_URL: string
  readonly VITE_SESSION_SECRET: string
  readonly VITE_NODE_ENV: 'development' | 'production' | 'test'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
