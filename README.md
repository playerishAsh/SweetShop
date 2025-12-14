# SweetShop Backend (PERN scaffold)

This is a minimal TypeScript + Express backend scaffold using PostgreSQL (Neon-ready), Jest + Supertest for testing, and dotenv for env vars. It follows a TDD-friendly directory layout.

Quick commands (Windows cmd.exe):

```cmd
npm install
npm test
npm run dev
```

TDD & Test DB
---------------

This project expects a PostgreSQL database for integration tests. Set a TEST or default
`DATABASE_URL` in your environment before running the auth integration tests. Example:

```cmd
set DATABASE_URL=postgres://user:password@localhost:5432/sweetshop_test
npm test
```

The tests create and drop a `users` table during their lifecycle; ensure your test DB
is isolated from production data.

PowerShell example:

```powershell
$env:DATABASE_URL = "postgres://user:password@localhost:5432/sweetshop_test"
npm test
```
