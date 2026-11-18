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

  // Destinos de Google (reseñas, Maps): en iPhone, una redirección 302 deja el
  // enlace dentro de Safari, donde Google pide iniciar sesión. Si la persona
  // TOCA un enlace, iOS sí lo abre en la app de Google / Google Maps con su
  // sesión. Por eso para Google mostramos una página con un botón.
  if (isGoogle(target)) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.statusCode = 200;
    res.end(googlePage(target));
    return;
  }

  // 302 = redirección temporal
  res.setHeader("Location", target);
  res.statusCode = 302;
  res.end();
};

function isGoogle(url) {
  try {
    const h = new URL(url).hostname.toLowerCase();
    return (
      h === "google.com" || h.endsWith(".google.com") ||
      h === "g.page" || h.endsWith(".g.page") ||
      h === "goo.gl" || h.endsWith(".goo.gl")
    );
  } catch {
    return false;
  }
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function googlePage(url) {
  const u = esc(url);
  const review = /writereview|\/review/i.test(url);
  const label = review ? "Dejar reseña en Google" : "Abrir en Google";
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${label}</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,-apple-system,sans-serif;background:#f5f5f7;color:#222;text-align:center;padding:16px;box-sizing:border-box}
  .card{max-width:360px;width:100%}
  h1{font-size:1.3rem;margin:0 0 8px}
  p{color:#555;margin:0 0 24px}
  a.btn{display:block;padding:18px;border-radius:14px;background:#1a73e8;color:#fff;font-size:1.15rem;font-weight:600;text-decoration:none}
  a.btn:active{opacity:.85}
</style>
</head>
<body>
  <div class="card">
    <h1>${review ? "¡Gracias por tu visita!" : "Continuar"}</h1>
    <p>${review ? "Toca el botón para dejarnos tu reseña." : "Toca el botón para continuar."}</p>
    <a class="btn" href="${u}">${label}</a>
  </div>
</body>
</html>`;
}