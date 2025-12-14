# SweetShop API Documentation 🎯

This document lists all public API endpoints for the SweetShop backend, their authorization, request and response shapes, and example requests.

Note: this project uses JWT for authentication via the `Authorization: Bearer <token>` header, and a simple role-based access control (`ADMIN`, `USER`) enforced by middleware.

---

## Common auth & error rules 🔐

- Authentication: Add header `Authorization: Bearer <token>` for protected endpoints. Missing or invalid token -> **401 Unauthorized**.
- RBAC: Roles are `ADMIN` or `USER`. Role violations -> **403 Forbidden**.
- IDs are numeric path parameters (e.g. `:id`).
- All responses are JSON. Errors return `{ error: string }` with appropriate status codes.

Common HTTP status codes used:

- 200 OK — successful reads/updates
- 201 Created — resource created
- 400 Bad Request — validation errors (invalid inputs, business rule violations)
- 401 Unauthorized — missing or invalid JWT
- 403 Forbidden — role not allowed
- 404 Not Found — resource not found
- 409 Conflict — e.g. duplicate email on registration
- 500 Internal Server Error — unexpected server error

---

## Public / Utility endpoints

### GET /health ✅
- Description: Basic health check
- Auth: none
- Response: 200

Example
Request:
GET /health

Response:
{
  "status": "ok"
}

---

### GET /ping ✅
- Description: Lightweight ping endpoint
- Auth: none
- Response: 200

Example
GET /ping

Response:
{
  "pong": true
}

---

## Authentication

### POST /api/auth/register 📝
- Description: Register a new user.
- Auth: none
- Body (application/json):

```json
{
  "email": "user@example.com",
  "password": "s3cret"
}
```

- Success: **201 Created** — returns created user object (id, email, role)
- Errors: **400** (invalid data), **409** (duplicate email)

Example response (201):

```json
{
  "id": 1,
  "email": "user@example.com",
  "role": "USER"
}
```

---

### POST /api/auth/login 🔐
- Description: Login and get a JWT token
- Auth: none
- Body (application/json):

```json
{
  "email": "user@example.com",
  "password": "s3cret"
}
```

- Success: **200 OK** — returns `{ token: "<JWT>" }`
- Errors: **401** (invalid credentials)

Example response:

```json
{
  "token": "eyJhbGciOi..."
}
```

---

## Sweets (Inventory) Endpoints

All sweets resources have the following shape:

```json
{
  "id": 1,
  "name": "Gummy",
  "category": "Candy",
  "price": 1.0,
  "quantity": 5
}
```

### POST /api/sweets (Create) ➕
- Description: Create a new sweet
- Auth: **ADMIN** only
- Body (application/json): `name`, `category`, `price` (number), `quantity` (integer >= 0)
- Success: **201 Created** — created sweet
- Errors: **400** (missing/invalid fields)

Example request body:

```json
{
  "name": "Chocolate",
  "category": "Candy",
  "price": 1.5,
  "quantity": 10
}
```

---

### GET /api/sweets (List) 📋
- Description: List all sweets
- Auth: **ADMIN** and **USER**
- Query params: none
- Response: **200 OK** — array of sweets (may be empty)

---

### PUT /api/sweets/:id (Update) ✏️
- Description: Update a sweet (partial updates allowed)
- Auth: **ADMIN** only
- Body: any of `name`, `category`, `price`, `quantity`
- Success: **200 OK** — updated sweet
- Errors: **400** (invalid data), **404** (not found)

---

### DELETE /api/sweets/:id (Delete) 🗑️
- Description: Delete a sweet
- Auth: **ADMIN** only
- Success: **200 OK** or **204 No Content**
- Errors: **404** (not found)

---

### POST /api/sweets/:id/purchase (Purchase) 🛒
- Description: Decrease stock by requested quantity (business rules enforce quantity >= 0)
- Auth: **ADMIN**, **USER**
- Body (application/json): `{ "quantity": number }` where number > 0
- Success: **200 OK** — returns updated sweet with decreased `quantity`
- Errors:
  - **400** if `quantity` invalid (<= 0) or if insufficient stock
  - **404** if sweet not found
  - **401 / 403** per auth/RBAC

Notes:
- The update is performed atomically in a single SQL statement so stock cannot go negative.

Example request:

```http
POST /api/sweets/1/purchase
Authorization: Bearer <token>
Content-Type: application/json

{ "quantity": 2 }
```

Example success response (200):

```json
{
  "id": 1,
  "name": "Gummy",
  "category": "Candy",
  "price": 1.0,
  "quantity": 3
}
```

---

### POST /api/sweets/:id/restock (Restock) 📦
- Description: Increase stock by requested quantity
- Auth: **ADMIN** only
- Body (application/json): `{ "quantity": number }` where number > 0
- Success: **200 OK** — returns updated sweet with increased `quantity`
- Errors: **400** invalid quantity, **404** not found, **401/403** per auth

Example request/response similar to purchase but quantity increases.

---

### GET /api/sweets/search (Search & Filter) 🔎
- Description: Search sweets by partial name (case-insensitive), filter by category and/or price range.
- Auth: **ADMIN** and **USER**
- Query parameters (all optional):
  - `name`: partial, case-insensitive match (e.g. `?name=gum`)
  - `category`: exact match (case-insensitive) (e.g. `?category=Candy`)
  - `minPrice`: numeric minimum price (>= 0)
  - `maxPrice`: numeric maximum price (>= 0)

- Validation:
  - Non-numeric or negative price params → **400 Bad Request**
  - `minPrice > maxPrice` → **400 Bad Request**

- Behavior:
  - Filters can be combined (e.g. `?name=choc&category=Candy&minPrice=1.5`)
  - If no query params provided → return all sweets
  - If no matches → return `[]` with **200 OK**

Example:

GET /api/sweets/search?name=gum&minPrice=1&maxPrice=2

Response: 200

```json
[
  { "id": 1, "name": "Gummy", "category": "Candy", "price": 1.0, "quantity": 3 },
  { "id": 2, "name": "gummi", "category": "Candy", "price": 2.0, "quantity": 5 }
]
```

---

## Error response examples ❌

- Validation error (400):

```json
{ "error": "Invalid quantity" }
```

- Unauthorized (401):

```json
{ "error": "Unauthorized" }
```

- Forbidden (403):

```json
{ "error": "Forbidden" }
```

- Not found (404):

```json
{ "error": "Not found" }
```

---

## Notes & Implementation details 💡

- Authentication tokens are produced by `POST /api/auth/login` and validated by `authMiddleware`.
- RBAC is enforced by `authorizeRoles(['ADMIN'])` or `authorizeRoles(['ADMIN','USER'])`.
- Repository methods use parameterized SQL to avoid injection and single-statement updates to ensure quantity consistency.
- The API intentionally avoids pagination, sorting, or full-text search per project constraints.

---

If you want, I can:

- Add this to the top-level `README.md` with quick curl examples ✅
- Generate an OpenAPI (Swagger) spec from this and add a UI to the repo 🔧

---

Generated on: 2025-12-14
