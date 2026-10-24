import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "FORMA_")
  const backend = `http://127.0.0.1:${env.FORMA_PORT || "8090"}`
  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { "@": resolve(import.meta.dirname, "./src") } },
    server: {
      proxy: { "/api": { target: backend }, "/_": { target: backend } },
    },
  }
})
