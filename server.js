// server.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const child_process = require('child_process');

const app = express();
const PORT = 3000;

// Static serve
app.use('/dashboard', express.static(path.join(__dirname, 'dashboard')));
app.use('/dist', express.static(path.join(__dirname, 'my-site/dist')));

// Storage for uploads
const upload = multer({ dest: path.join(__dirname, 'uploads/') });

// Upload endpoint
app.post('/upload', upload.single('markdown'), (req, res) => {
  const tempPath = req.file.path;
  const originalName = req.file.originalname;
  const targetPath = path.join(__dirname, 'my-site/content', originalName);

  fs.rename(tempPath, targetPath, (err) => {
    if (err) return res.status(500).json({ message: 'File move error' });

    // Call static site generator
    exec('node ssg.js', (error, stdout, stderr) => {
      if (error) {
        console.error('Generation error:', stderr);
        return res.status(500).json({ message: 'Generation failed' });
      }
      res.json({ message: 'File uploaded and site generated successfully!' });
    });
  });
});

// Return generated HTML files
app.get('/pages', (req, res) => {
  const distPath = path.join(__dirname, 'my-site', 'dist');
  fs.readdir(distPath, (err, files) => {
    if (err) return res.status(500).json({ error: 'Failed to read dist folder' });

    const htmlFiles = files.filter(file => file.endsWith('.html'));
    res.json(htmlFiles);
  });
});
app.delete('/delete/:name', (req, res) => {
  const pageName = req.params.name; // without extension
  const mdPath = path.join(__dirname, 'my-site', 'content', `${pageName}.md`);

  if (fs.existsSync(mdPath)) {
    fs.unlinkSync(mdPath);
    console.log(`🗑 Deleted: ${pageName}.md`);

    // ✅ Rebuild to remove stale HTML from dist
    child_process.execSync('node ssg.js build');

    return res.json({ success: true });
  } else {
    return res.status(404).json({ success: false, message: "File not found" });
  }
});


app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}/dashboard`);
});
