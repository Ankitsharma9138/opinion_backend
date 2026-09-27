function checkDatabaseConnection(pool, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const deadline = setTimeout(() => {
      settled = true;
      const error = new Error(
        `Database connection/SSL handshake did not finish within ${timeoutMs}ms.`
      );
      error.code = "DB_STARTUP_TIMEOUT";
      reject(error);
    }, timeoutMs);

    try {
      pool.getConnection((error, connection) => {
        if (settled) {
          connection?.release();
          return;
        }
        settled = true;
        clearTimeout(deadline);
        if (error) {
          reject(error);
          return;
        }
        connection.release();
        resolve();
      });
    } catch (error) {
      settled = true;
      clearTimeout(deadline);
      reject(error);
    }
  });
}

module.exports = { checkDatabaseConnection };
