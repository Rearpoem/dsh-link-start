// Bundle the Host entry. The overlay in assets/ is plain JS/CSS and ships as is.
import { build } from 'esbuild';

await build({
  entryPoints: [new URL('../src/index.ts', import.meta.url).pathname],
  outfile: new URL('../dist/index.js', import.meta.url).pathname,
  bundle: true, platform: 'node', target: 'node22', format: 'esm', packages: 'external', sourcemap: false,
});
console.log('Built dsh-link-start');
