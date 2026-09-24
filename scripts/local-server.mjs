// Lokale testserver: serveert dist/ en stuurt /api/* naar de Netlify-functie,
// met opslag in .local-store in plaats van Netlify Blobs.
import http from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.env.LOCAL_STORE_DIR ||= path.join(root, ".local-store");
const { default: api } = await import(path.join(root, "netlify/functions/api.mjs"));
const dist = path.join(root, "dist");
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".webmanifest": "application/manifest+json", ".json": "application/json", ".woff2": "font/woff2" };
const port = Number(process.env.PORT || 8888);

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  if (url.pathname.startsWith("/api/")) {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const r = await api(new Request(url, { method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : body }));
    const headers = {};
    r.headers.forEach((v, k) => { if (k !== "set-cookie") headers[k] = v; });
    const sc = r.headers.getSetCookie?.() || [];
    if (sc.length) headers["set-cookie"] = sc;
    res.writeHead(r.status, headers);
    res.end(Buffer.from(await r.arrayBuffer()));
    return;
  }
  let f = path.join(dist, decodeURIComponent(url.pathname));
  try { if ((await fs.stat(f)).isDirectory()) f = path.join(f, "index.html"); } catch { f = path.join(dist, "index.html"); }
  try {
    const data = await fs.readFile(f);
    res.writeHead(200, { "content-type": types[path.extname(f)] || "application/octet-stream" });
    res.end(data);
  } catch { res.writeHead(404); res.end(); }
}).listen(port, () => console.log(`Toppers lokaal op http://localhost:${port}`));
