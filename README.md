# Opiniontix backend

## Local development

Copy `.env.example` to `.env` if `.env` does not already exist. Fill in the
actual Aiven password and admin credentials. Use `DB_NAME=defaultdb` if your
tables are in `defaultdb`, or `DB_NAME=opiniontix` if they are in an Aiven
database named `opiniontix`. A local phpMyAdmin database must be imported into
Aiven separately.

Run `npm install` and `npm start` from this folder. The server loads `.env`
relative to `server.js`, even when started from another directory.
Existing environment variables take precedence over `.env`.

## Render deployment

The local `.env` is ignored by Git and is not deployed. In the existing Render
backend service, open **Environment** and add these exact keys:

| Key | Value |
| --- | --- |
| DB_HOST | mysql-1b7c4ecd-ankitsharma91381-18a2.h.aivencloud.com |
| DB_PORT | 27173 |
| DB_USER | avnadmin |
| DB_PASSWORD | Your actual Aiven password |
| DB_NAME | defaultdb, or the actual Aiven database containing your tables |

Also configure `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `API_URL`, and `FRONTEND_URL`
with your deployed values. Keep passwords out of Git. Select **Save and deploy**.
Deploy the updated backend code as well. The start command is `npm start`
with this folder as the service root. Render supplies `PORT` automatically.

Missing database settings now produce a configuration error instead of silently
connecting to localhost:3306. The server starts listening only after the initial
database connection succeeds. Expect `Database Connected` in the deployment logs.
If the connection fails, the log includes the error code and target host/port.
The full startup connection and SSL handshake have a 15-second deadline.
`DB_STARTUP_TIMEOUT` means the handshake stalled; check Aiven network access
and the latest Render deployment's logs. `Your service is live` by itself
does not confirm that the database connection succeeded.

## Checks

Run `npm test` for database configuration validation and `node --check server.js`
for server syntax. These checks do not connect to or modify the database.
