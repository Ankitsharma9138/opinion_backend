const test = require("node:test");
const assert = require("node:assert/strict");
const { getDatabaseConfig } = require("./database-config");

const validEnv = {
  DB_HOST: "mysql.example.com",
  DB_PORT: "27173",
  DB_USER: "avnadmin",
  DB_PASSWORD: "test-password",
  DB_NAME: "defaultdb",
};

test("missing Render variables cannot fall back to localhost", () => {
  assert.throws(() => getDatabaseConfig({}), /DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME/);
});

test("blank settings are rejected without disclosing credentials", () => {
  assert.throws(
    () => getDatabaseConfig({ ...validEnv, DB_HOST: " " }),
    (error) => error.message.includes("DB_HOST") && !error.message.includes(validEnv.DB_PASSWORD)
  );
});

test("invalid ports cannot fall back to the MySQL default", () => {
  for (const DB_PORT of ["NaN", "0", "65536", "27173.5"]) {
    assert.throws(() => getDatabaseConfig({ ...validEnv, DB_PORT }), /DB_PORT/);
  }
});

test("a URL cannot be used as a database hostname", () => {
  assert.throws(
    () => getDatabaseConfig({ ...validEnv, DB_HOST: "https://mysql.example.com" }),
    /DB_HOST must be a hostname/
  );
});

test("Aiven configuration uses its custom port and preserves the password", () => {
  const config = getDatabaseConfig({ ...validEnv, DB_PASSWORD: " spaced password " });
  assert.equal(config.host, "mysql.example.com");
  assert.equal(config.port, 27173);
  assert.equal(config.database, "defaultdb");
  assert.equal(config.password, " spaced password ");
  assert.ok(config.ssl);
});
