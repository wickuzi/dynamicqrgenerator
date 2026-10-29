// API del panel. Requiere el header "x-admin-password" igual a ADMIN_PASSWORD.
//   GET  -> lista los enlaces
//   POST -> { slug, url }                 guarda o actualiza
//   POST -> { action: "delete", slug }    elimina
const { enabled, setLink, deleteLink, listLinks } = require("./_store");

// CAMBIA ESTO por tu contraseña (sin espacios al inicio ni al final).
const ADMIN_PASSWORD = "dedreviil";

function passwordOk(req) {
  const given = String(req.headers["x-admin-password"] || "").trim();
  return given.length > 0 && given === ADMIN_PASSWORD;
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (!passwordOk(req)) {
    return res.status(401).json({ error: "Contraseña incorrecta." });
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