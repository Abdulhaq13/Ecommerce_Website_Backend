# Lumen E-Commerce — Backend

Express 5 + MongoDB (Mongoose) REST API for the Lumen storefront. Frontend: [Ecommerce_Website_Frontend](https://github.com/Abdulhaq13/Ecommerce_Website_Frontend).

## Setup

Requires Node 18+ and a MongoDB Atlas cluster (add your IP under **Network Access**).

```bash
npm install
cp .env.example .env   # then fill in the values
npm run seed           # admin + test user, 4 categories, 8 sample products (safe to re-run)
npm run dev            # http://localhost:5000
```

| Script | What it does |
|---|---|
| `npm run dev` | Start with nodemon (restarts on file changes) |
| `npm start` | Start with node |
| `npm run seed` | Create missing seed data; never duplicates or overwrites |

Cloudinary (product images, avatars) and SMTP (verification and password-reset emails) credentials are required for those features.

## API

Base URL: `/api/v1`. Auth uses httpOnly cookies (`accessToken` 15 min, `refreshToken` 7 days). Errors look like `{ success: false, message, code? }`.

| Area | Endpoints |
|---|---|
| Users | `POST /users/register`, `GET /users/verify-email/:token`, `POST /users/resend-verification`, `POST /users/login` (requires verified email), `GET /users/me`, `POST /users/refresh-token`, `POST /users/logout`, `POST /users/forgot-password`, `POST /users/reset-password/:token`, `POST /users/change-password`, `PATCH /users/profile`, `PUT /users/shipping-address`, `DELETE /users/delete-account` |
| Products | `GET /products` (search, category, price, rating, sort, page; admins may pass `includeInactive=true`), `GET /products/:id`; admin: `POST`, `PATCH /:id`, `DELETE /:id` |
| Categories | `GET /categories` (admins may pass `includeInactive=true`); admin: `POST`, `PATCH /:id`, `DELETE /:id` |
| Cart | `GET /cart`, `POST /cart`, `PATCH /cart/:productId`, `DELETE /cart/:productId`, `DELETE /cart` |
| Orders | `POST /orders` (cash on delivery), `GET /orders/my-orders`, `GET /orders/:id`, `PATCH /orders/:id/cancel`; admin: `GET /orders`, `PATCH /orders/:id/status` (Confirmed → Shipped → Delivered) |
| Admin | `GET /admin/stats`, `GET /admin/users`, `PATCH /admin/users/:id/deactivate`, `PATCH /admin/users/:id/reactivate`, `PATCH /admin/users/:id/role` |

## Structure

```
src/
├── app.js / server.js      # Express app (helmet, CORS, routes, error handler) / startup
├── config/                 # env, MongoDB, Cloudinary
├── controllers/            # Route handlers
├── middlewares/            # auth (JWT), optionalAuth, isAdmin, zod validate, multer, rate limits, errors
├── models/                 # User, Product, Category, Cart, Order, shared shipping address schema
├── routes/                 # One router per area
├── utils/                  # ApiError/ApiResponse, asyncHandler, Cloudinary, email, regex escape
├── validators/             # Zod request schemas
└── seed.js
```
