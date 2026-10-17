// Para probar en esta compu: node servidor.js  ->  http://localhost:5196
const http = require('http'), fs = require('fs'), path = require('path')
const tipos = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' }
http.createServer((q, r) => {
  const f = path.join(__dirname, decodeURIComponent(q.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0]))
  if (!f.startsWith(__dirname) || !fs.existsSync(f)) { r.writeHead(404); return r.end() }
  r.writeHead(200, { 'Content-Type': tipos[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(r)
}).listen(5196, () => console.log('http://localhost:5196'))
