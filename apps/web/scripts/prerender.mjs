import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, '..');
const distDir = path.join(webRoot, 'dist');
const serverDir = path.join(webRoot, 'dist-server');

const template = fs.readFileSync(path.join(distDir, 'index.html'), 'utf-8');
const { render, indexableRoutes } = await import(
  pathToFileURL(path.join(serverDir, 'entry-server.js')).href
);

function stripDefaultSeoTags(html) {
  return html
    .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
    .replace(/<meta\s+name="description"[\s\S]*?\/>\s*/gi, '')
    .replace(/<meta\s+name="robots"[\s\S]*?\/>\s*/gi, '')
    .replace(/<link\s+rel="canonical"[\s\S]*?\/>\s*/gi, '')
    .replace(/<meta\s+property="og:[^"]*"[\s\S]*?\/>\s*/gi, '')
    .replace(/<meta\s+name="twitter:[^"]*"[\s\S]*?\/>\s*/gi, '')
    .replace(/<meta\s+name="apple-mobile-web-app-title"[\s\S]*?\/>\s*/gi, '');
}

let count = 0;
for (const route of indexableRoutes) {
  const routePath = route.path;
  const { html: appHtml, helmet } = render(routePath);

  const headTags = [
    helmet?.title?.toString() ?? '',
    helmet?.meta?.toString() ?? '',
    helmet?.link?.toString() ?? '',
    helmet?.script?.toString() ?? '',
  ]
    .filter(Boolean)
    .join('\n    ');

  let pageHtml = stripDefaultSeoTags(template);
  pageHtml = pageHtml.replace('</head>', `    ${headTags}\n  </head>`);
  pageHtml = pageHtml.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);

  const outFile =
    routePath === '/'
      ? path.join(distDir, 'index.html')
      : path.join(distDir, routePath.replace(/^\//, ''), 'index.html');

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, pageHtml, 'utf-8');
  count += 1;
}

fs.rmSync(serverDir, { recursive: true, force: true });
console.log(`Prerendered ${count} static routes into ${distDir}`);
