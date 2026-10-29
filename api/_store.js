// Acceso a Upstash Redis mediante su API REST (sin dependencias).
// Vercel agrega estas variables solas al conectar Upstash al proyecto.
const BASE = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const HASH = "qr_links"; // un hash: slug -> url destino

const enabled = Boolean(BASE && TOKEN);

async function cmd(args) {
  const r = await fetch(BASE, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(j.error || `Redis HTTP ${r.status}`);
  return j.result;
}

const getLink = (slug) => cmd(["HGET", HASH, slug]);
const setLink = (slug, url) => cmd(["HSET", HASH, slug, url]);
const deleteLink = (slug) => cmd(["HDEL", HASH, slug]);

async function listLinks() {
  const flat = (await cmd(["HGETALL", HASH])) || [];
  const out = {};
  for (let i = 0; i < flat.length; i += 2) out[flat[i]] = flat[i + 1];
  return out;
}

module.exports = { enabled, getLink, setLink, deleteLink, listLinks };