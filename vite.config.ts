import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: true
        },
        manifest: {
          name: 'Certificado Manus',
          short_name: 'Certificado',
          description: 'Editor de Certificados Offline',
          theme_color: '#0b162c',
          background_color: '#0b162c',
          display: 'standalone',
          icons: [
            {
              src: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZDRhZjM3IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTIyIDguMjZjMC0xLjUtMS4wMy0yLjcyLTIuNDgtMi45OUE5LjgxIDkuODEgMCAwIDAgMTUgNWMtLjgzIDAtMS42NC4xNC0yLjQuM0M5LjI5IDQuOTMgNy41NyA1LjQ2IDYuMDggNi40MSA1LjEgNy4wNCA0LjIyIDcuNzYgMy41MSA4LjYzQTQuMDEzIDQuMDEzIDAgMCAwIDIgMTIuMTVjMCAxLjU1IDEuMDQgMi43NyAyLjQ5IDMuMDQgMS40NS4yNiAzIDEuMDYgNC4zMiAyLjAyLjYuNDQgMS4yLjkyIDEuNzkgMS40NC40OC40MyAxLjExLjcxIDEuNzcuNzhoLjA2Yy42Ni0uMDcgMS4yOS0uMzUgMS43Ny0uNzguNTktLjUxIDEuMTktMSAxLjc5LTEuNDQgMS4zMi0uOTYgMi44Ny0xLjc1IDQuMzItMi4wMkExMC4wMjQgMTAuMDI0IDAgMCAwIDIyIDguMjZaIi8+PC9zdmc+',
              sizes: '192x192',
              type: 'image/svg+xml'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          navigateFallbackDenylist: [/^\/__/]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
