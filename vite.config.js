import { defineConfig } from "vite";
import newsHandler from "./api/news.js";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    { name: 'local-news-api', configureServer(server) {
      server.middlewares.use('/api/news', (req, res) => {
        res.status = code => { res.statusCode = code; return res; };
        res.json = body => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); };
        return newsHandler(req, res);
      });
    } },

    VitePWA({
      registerType: "autoUpdate",

      includeAssets: ["icon.svg"],

      manifest: {
        id: "/",
        name: "Protect Probashi",
        short_name: "PP",
        description:
          "Emergency information and assistance for Bangladeshis abroad",

        start_url: "/",
        scope: "/",
        display: "standalone",

        background_color: "#FAFAF7",
        theme_color: "#0F5132",

        lang: "bn",

        icons: [
          {
            src: "/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any"
          }
        ]
      },

      workbox: {
        globPatterns: [
          "**/*.{js,css,html,svg,json,woff2}"
        ],

        navigateFallback: "/index.html",

        navigateFallbackDenylist: [
          /^\/api\//
        ],

        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,

        cleanupOutdatedCaches: true
      }
    })
  ]
});