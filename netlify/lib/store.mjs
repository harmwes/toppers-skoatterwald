// Opslaglaag. Op Netlify: Netlify Blobs (sterk consistent).
// Lokaal testen: een map op schijf, via LOCAL_STORE_DIR.
import { getStore } from "@netlify/blobs";
import { promises as fs } from "node:fs";
import path from "node:path";

function fileStore(dir) {
  const enc = (k) => encodeURIComponent(k);
  const dec = (f) => decodeURIComponent(f);
  const p = (k) => path.join(dir, enc(k));
  return {
    async get(key, opts = {}) {
      try {
        const buf = await fs.readFile(p(key));
        if (opts.type === "json") return JSON.parse(buf.toString("utf8"));
        if (opts.type === "arrayBuffer") return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
        return buf.toString("utf8");
      } catch { return null; }
    },
    async getWithMetadata(key, opts = {}) {
      const data = await this.get(key, opts);
      if (data === null) return null;
      let metadata = {};
      try { metadata = JSON.parse(await fs.readFile(p(key) + ".__meta", "utf8")); } catch {}
      return { data, metadata, etag: "" };
    },
    async set(key, value, opts = {}) {
      await fs.mkdir(dir, { recursive: true });
      const data = typeof value === "string" ? value : Buffer.from(value instanceof ArrayBuffer ? value : await value.arrayBuffer());
      await fs.writeFile(p(key), data);
      if (opts.metadata) await fs.writeFile(p(key) + ".__meta", JSON.stringify(opts.metadata));
    },
    async setJSON(key, value, opts) { return this.set(key, JSON.stringify(value), opts); },
    async delete(key) { await fs.rm(p(key), { force: true }); await fs.rm(p(key) + ".__meta", { force: true }); },
    async list({ prefix = "" } = {}) {
      await fs.mkdir(dir, { recursive: true });
      const files = (await fs.readdir(dir)).filter((f) => !f.endsWith(".__meta")).map(dec);
      return { blobs: files.filter((k) => k.startsWith(prefix)).sort().map((key) => ({ key, etag: "" })), directories: [] };
    },
  };
}

let cached;
export function db() {
  if (cached) return cached;
  const local = process.env.LOCAL_STORE_DIR;
  cached = local ? fileStore(local) : getStore({ name: "toppers-skoatterwald", consistency: "strong" });
  return cached;
}
