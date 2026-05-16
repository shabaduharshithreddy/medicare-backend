const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const src = path.join(root, 'index.html');
const outDir = path.join(root, 'dist');
const dest = path.join(outDir, 'index.html');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Read the source HTML
let html = fs.readFileSync(src, 'utf8');

// Extract CSS from <style> tags
const cssMatch = html.match(/<style>([\s\S]*?)<\/style>/);
let cssContent = '';
if (cssMatch) {
  cssContent = cssMatch[1];
  html = html.replace(cssMatch[0], '<link rel="stylesheet" href="css/style.css">');
}

// Extract JS from <script> tags (assuming one main script)
const jsMatch = html.match(/<script>([\s\S]*?)<\/script><\/body>/);
let jsContent = '';
if (jsMatch) {
  jsContent = jsMatch[1];
  html = html.replace(jsMatch[0], '<script src="js/app.js"></script></body>');
}

// Create subdirectories
const cssDir = path.join(outDir, 'css');
const jsDir = path.join(outDir, 'js');
const assetsDir = path.join(outDir, 'assets');

if (!fs.existsSync(cssDir)) fs.mkdirSync(cssDir, { recursive: true });
if (!fs.existsSync(jsDir)) fs.mkdirSync(jsDir, { recursive: true });
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

// Write extracted files
fs.writeFileSync(path.join(cssDir, 'style.css'), cssContent);
fs.writeFileSync(path.join(jsDir, 'app.js'), jsContent);

// Write the updated HTML
fs.writeFileSync(dest, html);

console.log('Built web assets to dist/');
console.log('- index.html');
console.log('- css/style.css');
console.log('- js/app.js');
console.log('- assets/ (empty)');
