import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],

  resolve: {
    tsconfigPaths: true,
  },

  server: {
    host: "0.0.0.0", // veya "0.0.0.0"
    port: 5173,
    strictPort: true,
    hmr: {
      // Protokolü ws/wss yerine Nginx'in proxy'lemesi için ayıklıyoruz
      protocol: "wss",
      host: "peercomp.com.tr.localhost",
      clientPort: 443, // İstek doğrudan Nginx'in 443 HTTPS portuna çarpacak
    },
  },
});
