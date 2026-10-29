// Redirección dinámica: https://midominio.com/r/<slug>
// Prioridad del destino:
//   1) Panel de administración (Redis)
//   2) Variable de entorno REDIRECT_<SLUG>  (ej. REDIRECT_RESENAS)
//   3) FALLBACK_URL
//   4) Página principal "/"
const { enabled, getLink } = require("./_store");

module.exports = async function handler(req, res) {
  const slug = String(req.query.slug || "").toLowerCase().replace(/[^a-z0-9_-]/g, "");
  let target = null;

  // 1) Panel (si Redis está conectado). Si falla, seguimos con los respaldos.
  if (enabled && slug) {
    try {
      target = await getLink(slug);
    } catch (err) {
      console.error("Error leyendo Redis:", err.message);
    }
  }

  // 2) Variable de entorno específica
  if (!target && slug) {
    const envKey = `REDIRECT_${slug.toUpperCase().replace(/-/g, "_")}`;
    target = process.env[envKey];
  }

  // 3) y 4) Respaldos
  target = target || process.env.FALLBACK_URL || "/";

  // Solo http(s) o rutas internas
  if (!/^https?:\/\//i.test(target) && !target.startsWith("/")) target = "/";

  // Sin caché en navegador, celular ni CDN
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  // 302 = redirección temporal
  res.setHeader("Location", target);
  res.statusCode = 302;
  res.end();
};