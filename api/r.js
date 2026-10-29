// Función de redirección dinámica para QR / NFC.
// Ruta pública:  https://midominio.com/r/<slug>
// Variable de entorno que lee: REDIRECT_<SLUG>  (en mayúsculas)
//   /r/resenas  ->  REDIRECT_RESENAS
//   /r/menu     ->  REDIRECT_MENU

export default function handler(req, res) {
  // 1. Limpiar el slug: solo letras, números, guion y guion bajo.
  const rawSlug = String(req.query.slug || "");
  const slug = rawSlug.replace(/[^a-zA-Z0-9_-]/g, "");

  // 2. Convertir a nombre de variable: "mi-menu" -> "REDIRECT_MI_MENU"
  const envKey = `REDIRECT_${slug.toUpperCase().replace(/-/g, "_")}`;

  // 3. Orden de prioridad del destino:
  //    a) variable específica del slug
  //    b) variable de respaldo FALLBACK_URL
  //    c) página principal "/"
  const target = process.env[envKey] || process.env.FALLBACK_URL || "/";

  // 4. Validar que sea http(s) o ruta interna; si no, usar "/".
  const isValid = /^https?:\/\//i.test(target) || target.startsWith("/");
  const destination = isValid ? target : "/";

  // 5. Evitar cualquier caché (navegador, celular, CDN).
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  // 6. Redirección 302 (temporal): el navegador NO memoriza el destino.
  res.setHeader("Location", destination);
  res.statusCode = 302;
  res.end();
}