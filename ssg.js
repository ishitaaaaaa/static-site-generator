const fs = require('fs');
const path = require('path');

const command = process.argv[2];
const subcommand = process.argv[3];
const target = process.argv[4];

// ========== INIT ==========
if (command === 'init') {
  const siteName = subcommand;
  const sitePath = path.join(__dirname, siteName);
  if (fs.existsSync(sitePath)) {
    console.log(`⚠️  Folder '${siteName}' already exists.`);
  } else {
    fs.mkdirSync(sitePath);
    fs.writeFileSync(
      path.join(sitePath, 'index.html'),
      '<h1>Welcome to your site</h1>'
    );
    console.log(`✅ Project '${siteName}' initialized.`);
  }
}

// ========== THEME ADD ==========
else if (command === 'theme' && subcommand === 'add') {
  const themeName = target;
  const themesPath = path.join(__dirname, 'my-site', 'themes', themeName);

  fs.mkdirSync(themesPath, { recursive: true });

 const layoutContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>{{ Title }}</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header><h1>{{ Title }}</h1></header>
  <main>
    {{ Content }}
  </main>
  <footer><p> 2025 My Static Site Generator</p></footer>
</body>
</html>
`;


  fs.writeFileSync(path.join(themesPath, 'layout.html'), layoutContent.trim());
  console.log(`✅ Theme '${themeName}' created at themes/${themeName}/layout.html`);
}

// ========== CONTENT ADD ==========
else if (command === 'content' && subcommand === 'add') {
  const contentPath = path.join(__dirname, 'my-site', 'content');

  if (!fs.existsSync(contentPath)) {
    fs.mkdirSync(contentPath, { recursive: true });
  }

  const markdownContent = `# Welcome to My Site

This is a static site generated from markdown using custom SSG.

- Easy to use
- Super fast
- Markdown powered!
  `;

  fs.writeFileSync(path.join(contentPath, 'index.md'), markdownContent.trim());
  console.log(`✅ Markdown content created at my-site/content/index.md`);
}

// ========== BUILD ==========

if (command === 'build') {
  const contentDir = path.join(__dirname, 'my-site', 'content');
  const themeFile = path.join(__dirname, 'my-site', 'themes', 'my-theme', 'layout.html');
  const outputDir = path.join(__dirname, 'my-site', 'dist');
  const cssSrc = path.join(__dirname, 'my-site', 'themes', 'my-theme', 'styles.css');
  const cssDest = path.join(outputDir, 'styles.css');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  if (!fs.existsSync(themeFile)) {
    console.error('❌ Layout file not found.');
    process.exit(1);
  }

  const layout = fs.readFileSync(themeFile, 'utf-8');
  // Clean-up: Delete orphan HTML files
const existingHTMLFiles = fs.readdirSync(outputDir).filter(file => file.endsWith('.html'));
const validBaseNames = fs.readdirSync(contentDir)
  .filter(f => f.endsWith('.md'))
  .map(f => f.replace('.md', '.html'));

existingHTMLFiles.forEach(htmlFile => {
  if (!validBaseNames.includes(htmlFile)) {
    fs.unlinkSync(path.join(outputDir, htmlFile));
    console.log(`🗑️ Removed stale file: ${htmlFile}`);
  }
});

  const contentFiles = fs.readdirSync(contentDir).filter(file => file.endsWith('.md'));

  contentFiles.forEach(file => {
    const markdown = fs.readFileSync(path.join(contentDir, file), 'utf-8');

    const lines = markdown.split('\n');
    const titleLine = lines.find(line => line.startsWith('#')) || 'Untitled';
    const title = titleLine.replace(/^#/, '').trim();
    const body = lines.filter(line => !line.startsWith('#')).join('\n');

    const htmlBody = body
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      .replace(/\n/g, '<br>');

    // Wrap all list items in <ul> only once
let finalHtmlBody = htmlBody;
if (htmlBody.includes('<li>')) {
  const listItems = htmlBody.match(/<li>.*?<\/li>/g)?.join('') || '';
  finalHtmlBody = htmlBody.replace(/<li>.*?<\/li>/g, '');
  finalHtmlBody += `<ul>${listItems}</ul>`;
}


    let output = layout
      .replace(/{{\s*Title\s*}}/g, title)
      .replace(/{{\s*Content\s*}}/g, finalHtmlBody);

    const outputFileName = file.replace('.md', '.html');
    const outputPath = path.join(outputDir, outputFileName);
    fs.writeFileSync(outputPath, output);
    console.log(`✅ Built: ${outputFileName}`);
  });

  if (fs.existsSync(cssSrc)) {
    fs.copyFileSync(cssSrc, cssDest);
    console.log('✔ Copied styles.css to dist/');
  }
}

  

// ========== SERVE ==========
else if (command === 'serve') {
  const http = require('http');
  const open = require('open').default;
  const chokidar = require('chokidar');
  const child_process = require('child_process');

  const port = 3000;
  const distDir = path.join(__dirname, 'my-site', 'dist');
  const contentDir = path.join(__dirname, 'my-site', 'content');
  const layoutFile = path.join(__dirname, 'my-site', 'themes', 'my-theme', 'layout.html');

  const server = http.createServer((req, res) => {
    let reqPath = req.url === '/' ? '/index.html' : req.url;
    const filePath = path.join(distDir, reqPath);

    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath);
      const contentType = ext === '.html' ? 'text/html' : 'text/plain';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(fs.readFileSync(filePath));
    } else {
      res.writeHead(404);
      res.end('404 NOT FOUND');
    }
  });

  server.listen(port, async () => {
    console.log(`🚀 Dev server running at http://localhost:${port}`);
    await open(`http://localhost:${port}`);
  });

  chokidar.watch([contentDir, layoutFile]).on('change', () => {
    console.log('🔁 Change detected. Rebuilding...');
    child_process.execSync('node ssg.js build');
    console.log('✅ Site rebuilt.');
  });
}

// ========== UNKNOWN COMMAND ==========
else {
  console.log('❌ Unknown command.');
  console.log('📘 Try:');
  console.log('  node ssg.js init my-site');
  console.log('  node ssg.js theme add my-theme');
  console.log('  node ssg.js content add');
  console.log('  node ssg.js build');
  console.log('  node ssg.js serve');
}
