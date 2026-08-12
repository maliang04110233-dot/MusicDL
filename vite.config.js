import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import path from 'node:path';
import { execSync } from 'node:child_process';

const isDev = process.env.NODE_ENV !== 'production';
const projectRoot = process.cwd();

// 读取版本号 + git commit hash
const pkgVersion = execSync('node -p "require(\'./package.json\').version"', { cwd: projectRoot, encoding: 'utf8' }).trim();
let gitCommit = '';
try { gitCommit = execSync('git rev-parse HEAD', { cwd: projectRoot, encoding: 'utf8' }).trim(); } catch (_e) {}

export default defineConfig({
  define: {
    'window.__APP_VERSION__': JSON.stringify(pkgVersion),
    'window.__APP_COMMIT__': JSON.stringify(gitCommit),
  },
  plugins: [
    electron([
      {
        entry: path.resolve(projectRoot, 'src/main/index.js'),
        onstart(args) {
          args.startup();
        },
        vite: {
          build: {
            outDir: path.resolve(projectRoot, 'dist/main'),
            rollupOptions: {
              external: ['electron', 'NeteaseCloudMusicApi', 'qq-music-api'],
            },
          },
        },
      },
      {
        entry: path.resolve(projectRoot, 'src/main/preload.js'),
        onstart(args) {
          args.reload();
        },
        vite: {
          build: {
            outDir: path.resolve(projectRoot, 'dist/preload'),
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
      },
    ]),
    renderer(),
  ],
  root: 'src/renderer',
  base: './',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
    sourcemap: isDev,
  },
  resolve: {
    alias: {
      '@': path.resolve(projectRoot, 'src'),
    },
  },
  server: {
    port: 5173,
  },
});
