# AkerVitorSob API — Render + Turso

This is the Render/Turso version of the uploaded SQLite backend. The React frontend stays on the existing cPanel hosting. This package contains only the backend.

## Architecture

- Frontend: existing `akervitorsob.com` cPanel hosting
- API: Render Web Service in Singapore
- Database: Turso (libSQL / SQLite-compatible)
- Product images: Cloudinary
- API custom domain: `api.akervitorsob.com`

## Important free-plan limitations

Render Free web services sleep after 15 minutes without inbound traffic and can take about a minute to wake. Their local filesystem is ephemeral: files created or changed at runtime are lost on restart, redeploy, or spin-down. Free services are intended for testing/hobby projects, not dependable production e-commerce. Turso keeps database data remotely; Cloudinary stores newly uploaded product images.

Do not use local SQLite files or local disk uploads as the live production store on Render Free.

## What changed from the uploaded backend

- Replaced synchronous Node `node:sqlite` calls with asynchronous `@libsql/client` calls to Turso.
- Converted repository callers to `await` the database operations.
- Added Render health check and Singapore Blueprint.
- Added CORS allow-list for the existing frontend domain.
- New product uploads use Cloudinary rather than Render's temporary disk.
- Admin-only operations now require a valid Bearer JWT with role `admin`.
- Customer cart/order/payment routes require a valid JWT and check the logged-in user against the requested customer ID where applicable.
- Preserved the existing API paths and SQLite table layout.
- bKash/Nagad files in the uploaded project were placeholders, not real gateway integrations. They now remain Pending rather than falsely marking arbitrary transaction IDs as Paid.

## 1. Create the Turso database

1. Create/sign in to your Turso account.
2. Create a new database (choose Singapore if the dashboard offers a region selector).
3. Create an auth token with read/write access.
4. Copy the database URL and token into a password manager. Do not post them in chat or commit them to Git.

Set these Render environment variables:

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `JWT_SECRET` (Render can generate this)
- `CORS_ORIGINS` = `https://akervitorsob.com,https://www.akervitorsob.com`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

## 2. Import the uploaded SQLite database

The ZIP originally uploaded in this conversation contained a SQLite database, plus its `-wal` and `-shm` companion files. Keep those three files together when extracting the original ZIP.

On your Windows PC:

1. Extract the original `akervitorsob-sqlite-backend-clean.zip` to a folder. Do not upload its database file to GitHub.
2. Open PowerShell in this new backend project folder.
3. Copy `.env.example` to `.env`.
4. Fill in `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, and `SQLITE_SOURCE_PATH`. Example Windows path:

```env
SQLITE_SOURCE_PATH=C:/Users/YourUser/Downloads/old-backend/database/akervitorsob.sqlite
```

5. Install dependencies and run:

```powershell
npm install
npm run migrate:sqlite
```

The migration script checks the source SQLite integrity first. It refuses to import if any destination table already contains rows. It imports all application tables in a single Turso write transaction. If it stops with an error, do not clear the Turso database; inspect the error first.

The uploaded database was checked before preparing this package: integrity check passed; it contained one admin user and zero product, category, cart, order, payment, seller, or warehouse records. Importing preserves that admin user's existing password hash.

## 3. Reset or create the Admin password (optional)

After the SQLite import, you can set a new Admin password without exposing it in chat.

In your local `.env`, set:

```env
ADMIN_EMAIL=admin@akervitorsob.com
ADMIN_PASSWORD=use_a_new_unique_password_at_least_12_characters
```

Then run:

```powershell
npm run setup-admin
```

This updates the existing account with that email to role `admin` and a new bcrypt password hash, or creates it if it does not exist. Remove `ADMIN_PASSWORD` from your local `.env` when finished.

## 4. Push the backend to a private GitHub repository

Upload this backend project to a private repository. Do not include:

- `.env`
- `node_modules`
- `database/*.sqlite`
- `database/*.sqlite-wal`
- `database/*.sqlite-shm`
- SSH private keys
- any real API tokens or passwords

The `.gitignore` in this package blocks these paths.

## 5. Deploy on Render

1. In Render, choose **New → Blueprint** or create a **Web Service** from the private GitHub repository.
2. If using the Blueprint, review `render.yaml`. It selects the Singapore region and Free plan.
3. Set the secret environment variables listed above in Render.
4. Build command: `npm install`
5. Start command: `npm start`
6. Wait for the deploy to complete.
7. Test `https://YOUR-RENDER-SERVICE.onrender.com/api/health`.

Expected response:

```json
{
  "success": true,
  "message": "AkerVitorSob API Running",
  "database": true,
  "databaseType": "Turso (libSQL)"
}
```

## 6. Add the API subdomain

1. In Render service settings, add the custom domain `api.akervitorsob.com`.
2. Render will show the exact DNS target for your service. Add the DNS record it specifies at your domain DNS provider (usually a CNAME for `api`).
3. Wait for Render to verify the domain and issue TLS.
4. Test `https://api.akervitorsob.com/api/health`.

Do not guess the DNS target; copy the exact value shown by Render.

## 7. Connect the existing frontend

The frontend source was not included in the uploaded ZIP, so this package cannot update the React API configuration yet.

When you have the frontend source, set its API base URL to:

```js
const API_BASE_URL = "https://api.akervitorsob.com";
```

The frontend must send the JWT returned by `/api/auth/login` on protected operations:

```js
Authorization: `Bearer ${token}`
```

For Axios, add that header to Admin product/category/user/seller/warehouse/order/payment requests. Do not store an Admin password in frontend code.

## 8. Final checks

Test these routes after deployment:

- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/products`
- `POST /api/products/add` (Admin JWT required; Cloudinary configured)
- `GET /api/categories`
- `GET /api/admin/dashboard` (Admin JWT required)

Do not switch the live frontend to the new API until health, Admin login, Product create/read/update/delete, image upload, and customer flows have been tested.

## Notes and limitations

- The frontend was not included in the uploaded ZIP. Its API base URL and token handling still need to be updated after you provide the frontend source.
- Real bKash/Nagad gateway integration is not present in the uploaded source. Those modules were placeholders; live payment settlement must not be enabled until official server-side gateway credentials and verification APIs are implemented.
- The uploaded `models/` directory contains legacy Mongoose model definitions. The active SQLite repository does not import them; Turso is used by the active routes.
- Keep the old cPanel backend and database backup until the new API is verified. Do not delete the original SQLite files.
