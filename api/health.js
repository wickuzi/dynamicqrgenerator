// Diagnóstico temporal. Solo muestra si las variables existen, nunca sus valores.
const store = require("./_store");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const info = {
    KV_REST_API_URL: Boolean(process.env.KV_REST_API_URL),
    KV_REST_API_TOKEN: Boolean(process.env.KV_REST_API_TOKEN),
    UPSTASH_REDIS_REST_URL: Boolean(process.env.UPSTASH_REDIS_REST_URL),
    UPSTASH_REDIS_REST_TOKEN: Boolean(process.env.UPSTASH_REDIS_REST_TOKEN),
    redisConfigurado: store.enabled,
  };
  if (store.enabled) {
    try {
      await store.listLinks();
      info.redis = "OK";
    } catch (e) {
      info.redis = "ERROR: " + e.message;
    }
  }
  res.status(200).json(info);
};