// API del panel. Requiere el header "x-admin-password" = ADMIN_PASSWORD.
//   GET  -> lista los enlaces
//   POST -> { slug, url }                 guarda o actualiza
//   POST -> { action: "delete", slug }    elimina
const crypto = require("crypto");
const { enabled, setLink, deleteLink, listLinks } = require("./_store");
const ADMIN_PASSWORD_HASH = "95d5b5f1fcc444aa6c851e142377da7d67328e5a4c0c5410ae3d5ded007fd400";

function passwordOk(req) {
  const given = String(req.headers["x-admin-password"] || "").trim();
  const givenHash = crypto.createHash("sha256").update(given).digest("hex");
  const a = Buffer.from(givenHash);
  const b = Buffer.from(ADMIN_PASSWORD_HASH.toLowerCase());
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

 
    if (!passwordOk(req)) {
    const given = String(req.headers["x-admin-password"] || "").trim();
    return res.status(401).json({
      error: "Contraseña incorrecta.",
      // TEMPORAL: borrar después del diagnóstico
      debug: {
        hashRecibido: crypto.createHash("sha256").update(given).digest("hex").slice(0, 8),
        hashEsperado: ADMIN_PASSWORD_HASH.slice(0, 8),
        largoHashEsperado: ADMIN_PASSWORD_HASH.length,
        largoRecibido: given.length,
      },
    });
  }
  if (!enabled) {
    return res.status(503).json({
      error: "Redis no está conectado. Conecta Upstash Redis en la pestaña Storage de Vercel.",
    });
  }

  try {
    if (req.method === "GET") {
      return res.status(200).json({ links: await listLinks() });
    }

    if (req.method === "POST") {
      const body = req.body || {};
      const slug = String(body.slug || "").toLowerCase().trim();

      if (!/^[a-z0-9_-]{1,50}$/.test(slug)) {
        return res.status(400).json({ error: "Slug inválido: usa letras, números, - o _ (máx. 50)." });
      }

      if (body.action === "delete") {
        await deleteLink(slug);
        return res.status(200).json({ ok: true });
      }

      const url = String(body.url || "").trim();
      if (!/^https?:\/\/.+/i.test(url)) {
        return res.status(400).json({ error: "La URL debe empezar con http:// o https://" });
      }
      await setLink(slug, url);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Método no permitido." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error del servidor: " + err.message });
  }
};