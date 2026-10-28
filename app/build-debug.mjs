import { build } from 'esbuild';
import fs from 'fs';
const r = await build({ entryPoints: ['src/main.js'], bundle: true, minify: false, format: 'iife', write: false, target: 'es2020', loader: { '.png': 'dataurl' }, logLevel: 'warning' });
const js = r.outputFiles[0].text.replace(/<\/script/g, '<\\/script');
let html = fs.readFileSync('src/index.html', 'utf8');
html = html.replace('<!--APP-->', () => `<script>${js}</script>`);
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/debug.html', html);
console.log('built', (html.length / 1024 | 0) + ' KB');
