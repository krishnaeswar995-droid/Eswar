// Build / dev script using esbuild (no Vite needed).
//   node build.mjs          -> production bundle in dist/
//   node build.mjs --serve  -> dev server on http://localhost:5173 with rebuild on change
import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync } from 'node:fs';

const serve = process.argv.includes('--serve');
mkdirSync('dist/assets', { recursive: true });
copyFileSync('index.html', 'dist/index.html');

const options = {
  entryPoints: { app: 'src/main.jsx' },
  bundle: true,
  outdir: 'dist/assets',
  format: 'iife',
  jsx: 'automatic',
  loader: { '.js': 'jsx' },
  target: ['es2020'],
  minify: !serve,
  sourcemap: serve,
  define: { 'process.env.NODE_ENV': JSON.stringify(serve ? 'development' : 'production') },
  logLevel: 'info',
};

if (serve) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  const { port } = await ctx.serve({ servedir: 'dist', port: 5173 });
  console.log(`Prototype running at http://localhost:${port}`);
} else {
  await esbuild.build(options);
}
