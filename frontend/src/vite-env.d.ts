/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Base URL of the backend API. Leave unset in development (requests go
   * through the Vite dev proxy) and when serving the built frontend from the
   * backend itself (same origin).
   */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
