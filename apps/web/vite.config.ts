import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import Sitemap from 'vite-plugin-sitemap';
import { indexableRoutes } from './src/seo/routes';

const siteUrl = 'https://gstbro.com';

const priorityMap = Object.fromEntries(
  indexableRoutes.map((r) => [r.path, r.priority ?? 0.7])
);
const changefreqMap = Object.fromEntries(
  indexableRoutes.map((r) => [r.path, r.changefreq ?? 'weekly'])
);

function gscVerificationPlugin() {
  return {
    name: 'gstbro-gsc-verification',
    transformIndexHtml(html: string) {
      const token = process.env.VITE_GSC_VERIFICATION?.trim();
      if (!token) {
        return html.replace('    <!-- gsc-verification-placeholder -->\n', '');
      }
      return html.replace(
        '<!-- gsc-verification-placeholder -->',
        `<meta name="google-site-verification" content="${token}" />`
      );
    },
  };
}

export default defineConfig(({ isSsrBuild }) => ({
  base: '/',
  plugins: [
    react(),
    gscVerificationPlugin(),
    !isSsrBuild &&
      Sitemap({
        hostname: siteUrl,
        dynamicRoutes: indexableRoutes.map((r) => r.path).filter((p) => p !== '/'),
        priority: priorityMap,
        changefreq: changefreqMap,
        exclude: [
          '/dashboard',
          '/dashboard/*',
          '/admin',
          '/admin/*',
          '/client',
          '/client/*',
          '/team',
          '/team/*',
          '/login',
          '/signup',
          '/login/*',
          '/signup/*',
          '/forgot-password',
          '/privacy/requests',
          '/privacy/requests/*',
        ],
        generateRobotsTxt: false,
      }),
  ].filter(Boolean),
  ssr: {
    noExternal: ['react-helmet-async', '@gst/ui'],
  },
  build: isSsrBuild
    ? {
        rollupOptions: {
          input: 'src/entry-server.tsx',
        },
      }
    : {
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) {
                return 'vendor-react';
              }
              if (id.includes('node_modules/motion')) {
                return 'vendor-motion';
              }
              if (id.includes('node_modules/@tanstack/react-query')) {
                return 'vendor-query';
              }
            },
          },
        },
        chunkSizeWarningLimit: 1000,
      },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  resolve: {
    alias: { '@': '/src' },
  },
}));
