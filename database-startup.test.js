const test = require("node:test");
const assert = require("node:assert/strict");
const { checkDatabaseConnection } = require("./database-startup");

test("successful startup releases the connection", async () => {
  let released = false;
  await checkDatabaseConnection({
    getConnection(callback) {
      callback(null, { release() { released = true; } });
    },
  });
  assert.equal(released, true);
});

test("connection failures retain their original error code", async () => {
  const failure = Object.assign(new Error("Connection refused"), { code: "ECONNREFUSED" });
  await assert.rejects(
    checkDatabaseConnection({ getConnection(callback) { callback(failure); } }),
    { code: "ECONNREFUSED" }
  );
});

test("a stalled handshake fails and a late connection is released", async () => {
  let complete;
  let released = false;
  await assert.rejects(
    checkDatabaseConnection({ getConnection(callback) { complete = callback; } }, 10),
    { code: "DB_STARTUP_TIMEOUT" }
  );
  complete(null, { release() { released = true; } });
  assert.equal(released, true);
});

test("synchronous connection errors reject and clear the deadline", async () => {
  await assert.rejects(
    checkDatabaseConnection({ getConnection() { throw new Error("Invalid connection"); } }),
    /Invalid connection/
  );
});
