function getDatabaseConfig(env = process.env) {
  const required = ["DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME"];
  const missing = required.filter(
    (key) => typeof env[key] !== "string" || env[key].trim() === ""
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing database environment variables: ${missing.join(", ")}. ` +
      "Set them in Render > backend service > Environment, then Save and deploy. " +
      "For local development, use backend/.env."
    );
  }

  const port = Number(env.DB_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("DB_PORT must be an integer between 1 and 65535.");
  }

  const host = env.DB_HOST.trim();
  if (host.includes("://") || host.includes("/")) {
    throw new Error("DB_HOST must be a hostname, without https:// or a path.");
  }

  return {
    host,
    port,
    user: env.DB_USER.trim(),
    password: env.DB_PASSWORD,
    database: env.DB_NAME.trim(),
    ssl: { rejectUnauthorized: false },
    connectTimeout: 10000,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };
}

module.exports = { getDatabaseConfig };
