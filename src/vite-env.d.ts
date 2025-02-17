/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_STORAGE_URL: string
  readonly VITE_REDIS_URL: string
  readonly VITE_DATABASE_URL: string
  readonly VITE_SESSION_SECRET: string
  readonly VITE_NODE_ENV: 'development' | 'production' | 'test'
  readonly VITE_ADMIN_ID: string
  readonly VITE_ADMIN_PASSWORD: string
  readonly VITE_AGENT1_ID: string
  readonly VITE_AGENT1_PASSWORD: string
  readonly VITE_AGENT2_ID: string
  readonly VITE_AGENT2_PASSWORD: string
  readonly VITE_PUSHER_APP_KEY: string
  readonly VITE_PUSHER_CLUSTER: string
  readonly VITE_ADMIN_EMAIL: string
  readonly VITE_ADMIN_PASSWORD: string
  readonly VITE_ADMIN_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
