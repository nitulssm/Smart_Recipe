# Smart Recipe AI — Architecture Document

> **Related document:** [TECHNICAL_DOCS.md](TECHNICAL_DOCS.md) — detailed technical documentation covering code-level implementation, API reference, and authentication flows.

---

## 1. System Overview

Smart Recipe AI is a full-stack web application that lets users scan their fridge via photo upload or camera, detect food ingredients using AI vision, and receive AI-generated recipes. Users can search recipes by name, save favourites, and track recently viewed recipes — all persisted in a PostgreSQL database.

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER BROWSER                             │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              React SPA  (localhost:3000)                │   │
│   │                                                         │   │
│   │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────┐  │   │
│   │  │   Auth   │  │  Fridge  │  │  Recipe  │  │  My   │  │   │
│   │  │   Page   │  │   Scan   │  │  Search  │  │Recipes│  │   │
│   │  └──────────┘  └──────────┘  └──────────┘  └───────┘  │   │
│   │                                                         │   │
│   │        localStorage: authToken, authUser                │   │
│   └─────────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            │  HTTP / REST  (axios)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              Express API Server  (localhost:5000)               │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │  Auth Routes │  │  AI Routes   │  │   Recipe CRUD Routes  │ │
│  │  /api/auth/* │  │  /api/upload │  │  /api/recipes/saved   │ │
│  │              │  │  /api/detect │  │  /api/recipes/viewed  │ │
│  │              │  │  /api/recipe │  │  /api/recipes-from-   │ │
│  │              │  │  -by-name    │  │  ingredients          │ │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬────────────┘ │
│         │                 │                      │              │
│  ┌──────▼─────────────────▼──────────────────────▼───────────┐ │
│  │                   pg Pool  (db.js)                        │ │
│  └───────────────────────────┬───────────────────────────────┘ │
│                              │                                  │
│  ┌───────────────────────────▼───────────────────────────────┐ │
│  │             multer  (uploads/ — temp files)               │ │
│  └───────────────────────────────────────────────────────────┘ │
└───────────┬──────────────────────────────┬──────────────────────┘
            │                              │
            ▼                              ▼
┌───────────────────────┐      ┌───────────────────────────────────┐
│   PostgreSQL 16       │      │        External APIs              │
│   smart_recipe_db     │      │                                   │
│                       │      │  ┌─────────────────────────────┐  │
│  ┌─────────────────┐  │      │  │  Groq AI  (Vision + Text)   │  │
│  │     users       │  │      │  │  llama-4-scout (vision)     │  │
│  ├─────────────────┤  │      │  │  llama-3.3-70b (recipes)    │  │
│  │  pending_users  │  │      │  └─────────────────────────────┘  │
│  ├─────────────────┤  │      │  ┌─────────────────────────────┐  │
│  │  reset_codes    │  │      │  │  TheMealDB  (recipe images) │  │
│  ├─────────────────┤  │      │  └─────────────────────────────┘  │
│  │  saved_recipes  │  │      │  ┌─────────────────────────────┐  │
│  ├─────────────────┤  │      │  │  Brevo / Gmail / Resend     │  │
│  │  viewed_recipes │  │      │  │  (email delivery)           │  │
│  └─────────────────┘  │      │  └─────────────────────────────┘  │
└───────────────────────┘      └───────────────────────────────────┘
```

---

## 3. Tech Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Frontend | React | 18 | SPA UI |
| Frontend | axios | 1.6 | HTTP client |
| Frontend | CSS (custom) | — | Styling |
| Backend | Node.js | 24 | Runtime |
| Backend | Express | 4.18 | HTTP framework |
| Backend | multer | 1.4 | Image upload handling |
| Backend | bcryptjs | 3.0 | Password hashing |
| Backend | jsonwebtoken | 9.0 | JWT auth |
| Backend | pg (node-postgres) | 8.20 | PostgreSQL client |
| Backend | groq-sdk | 1.1 | Groq AI API client |
| Backend | nodemailer | 8.0 | SMTP email |
| Backend | resend | 6.12 | Resend email API |
| Database | PostgreSQL | 16 | Persistent storage |
| AI Vision | Groq (llama-4-scout-17b) | — | Ingredient detection |
| AI Text | Groq (llama-3.3-70b) | — | Recipe generation |
| Images | TheMealDB API | v1 | Recipe food images |
| Email | Brevo / Gmail / Resend | — | Verification & reset emails |

---

## 4. Project Structure

```
Smart_Recipe_Generator/
│
├── server/                        # Express API server
│   ├── index.js                   # Main server — all routes & logic
│   ├── db.js                      # PostgreSQL connection pool
│   ├── schema.sql                 # DB table definitions (run once)
│   ├── .env                       # Environment variables (secrets)
│   ├── uploads/                   # Temp image storage (auto-deleted)
│   └── package.json
│
└── client/                        # React frontend
    ├── public/
    │   └── index.html
    └── src/
        ├── index.js               # React entry point
        ├── App.js                 # Entire frontend (components + logic)
        └── App.css                # All styles
```

---

## 5. Database Schema

```
┌──────────────────────────────────────────────────────────────┐
│                          users                               │
│  id (PK, BIGSERIAL) │ name │ email (UNIQUE) │ password      │
│  created_at                                                  │
└──────────────┬───────────────────────────────────────────────┘
               │ 1
               │
               │ ∞                          ∞
    ┌──────────▼──────────┐      ┌───────────────────────┐
    │    saved_recipes    │      │    viewed_recipes      │
    │  id (PK)            │      │  id (PK)               │
    │  user_id (FK)       │      │  user_id (FK)          │
    │  title (UNIQUE/user)│      │  title (UNIQUE/user)   │
    │  time               │      │  time                  │
    │  difficulty         │      │  difficulty            │
    │  servings           │      │  servings              │
    │  description        │      │  description           │
    │  ingredients (JSONB)│      │  ingredients (JSONB)   │
    │  steps (JSONB)      │      │  steps (JSONB)         │
    │  tips (JSONB)       │      │  tips (JSONB)          │
    │  image_url          │      │  image_url             │
    │  saved_at           │      │  viewed_at             │
    └─────────────────────┘      └────────────────────────┘

┌─────────────────────────────────┐   ┌──────────────────────────────┐
│         pending_users           │   │         reset_codes          │
│  id │ name │ email (UNIQUE)     │   │  email (PK)                  │
│  password_hash │ code (6-char)  │   │  code (6-char)               │
│  expires_at │ created_at        │   │  expires_at │ created_at     │
│  [deleted after verification]   │   │  [deleted after reset]       │
└─────────────────────────────────┘   └──────────────────────────────┘
```

**Key constraints:**
- `saved_recipes(user_id, title)` — UNIQUE, prevents duplicate saves
- `viewed_recipes(user_id, title)` — UNIQUE, `viewed_at` updated on re-view
- Both recipe tables cascade-delete when the parent user is deleted

---

## 6. API Endpoints

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Register; sends 6-digit email verification code |
| POST | `/api/auth/verify-email` | No | Verify code; moves pending → users; returns JWT |
| POST | `/api/auth/login` | No | Validate credentials; returns JWT |
| POST | `/api/auth/forgot-password` | No | Generate reset code; send email |
| POST | `/api/auth/reset-password` | No | Validate reset code; update password |

### AI & Recipe Generation

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/upload` | No | Upload fridge image → detect ingredients → generate recipes |
| POST | `/api/detect-only` | No | Upload image → detect ingredients only (no recipes) |
| POST | `/api/recipe-by-name` | No | Search recipe by name using Groq AI |
| POST | `/api/recipes-from-ingredients` | No | Regenerate recipes from updated ingredient list |

### User Recipe Storage

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/recipes/saved` | JWT | Fetch all saved recipes for current user |
| POST | `/api/recipes/saved` | JWT | Save a recipe |
| DELETE | `/api/recipes/saved/:title` | JWT | Unsave a recipe by title |
| GET | `/api/recipes/viewed` | JWT | Fetch all viewed recipes for current user |
| POST | `/api/recipes/viewed` | JWT | Record a recipe as viewed (upserts viewed_at) |

---

## 7. Authentication Flow

```
REGISTRATION
─────────────
User fills form
      │
      ▼
POST /api/auth/register
  ├─ Validate input
  ├─ Check email not already in users table
  ├─ bcrypt.hash(password, 10)
  ├─ Generate 6-digit code (10 min expiry)
  ├─ INSERT into pending_users (upsert on email conflict)
  ├─ Send verification email (Brevo → Gmail → Resend fallback)
  └─ Return { requiresVerification: true, code }

User enters code
      │
      ▼
POST /api/auth/verify-email
  ├─ Lookup pending_users by email
  ├─ Check expiry
  ├─ Check code match
  ├─ INSERT into users
  ├─ DELETE from pending_users
  ├─ jwt.sign({ id, name, email }, 30d)
  └─ Return { token, user }

LOGIN
──────
POST /api/auth/login
  ├─ SELECT user by email
  ├─ bcrypt.compare(password, hash)
  ├─ jwt.sign({ id, name, email }, 30d)
  └─ Return { token, user }

CLIENT SESSION
───────────────
  ├─ Store token → localStorage.authToken
  ├─ Store user → localStorage.authUser
  └─ On logout → clear localStorage, clear state
```

---

## 8. Fridge Scan Flow

```
User uploads image
       │
       ▼
POST /api/upload  (multipart/form-data)
       │
       ├─► multer saves file → uploads/<uuid>
       │
       ├─► detectIngredients(imagePath, mimeType)
       │     ├─ Read file → base64
       │     ├─ Send to Groq Vision (llama-4-scout-17b)
       │     │   Prompt: "List food ingredients as JSON array.
       │     │            Return [] if no food visible."
       │     └─ Parse JSON array → string[]
       │          └─ If parse fails → return []
       │
       ├─ If ingredients.length === 0
       │     └─ Return { ingredients: [], recipes: [], noIngredientsFound: true }
       │
       ├─► getRecipes(ingredients)
       │     ├─ Send ingredient list to Groq Text (llama-3.3-70b)
       │     └─ Parse JSON array of recipe objects
       │
       ├─► getMealImage(title, ingredients)  [per recipe]
       │     ├─ TheMealDB search by title
       │     ├─ TheMealDB search by keyword
       │     ├─ TheMealDB filter by ingredient
       │     └─ Unsplash fallback URL
       │
       ├─► fs.unlink(imagePath)   ← temp file always deleted
       │
       └─ Return { ingredients, recipes: [...with imageUrl] }

CLIENT SIDE
       ├─ No ingredients → show error message, no recipes
       ├─ Filter out recipes with empty ingredients or default title
       └─ Show ingredient cards + recipe cards
```

---

## 9. Recipe Search Flow

```
User types recipe name → clicks Search
              │
              ▼
POST /api/recipe-by-name  { recipeName }
              │
              ├─► Groq Text (llama-3.3-70b)
              │    Prompt: structured JSON with title, time,
              │    difficulty, servings, description,
              │    ingredients[{name,quantity}],
              │    steps[{title,instruction}], tips[]
              │
              ├─► getMealImage(title, ingredients)
              │
              └─ Return { recipe: { ...fields, imageUrl } }

CLIENT SIDE
              ├─ Display inline (no modal)
              ├─ Record as viewed (POST /api/recipes/viewed)
              └─ Save button → POST/DELETE /api/recipes/saved
```

---

## 10. Ingredient Edit → Recipe Regeneration Flow

```
User adds or removes an ingredient
              │
              ▼
Client calls regenerateRecipes(updatedIngredients)
              │
              ▼
POST /api/recipes-from-ingredients  { ingredients: string[] }
              │
              ├─► getRecipes(ingredients)
              ├─► getMealImage() per recipe
              ├─ Filter out empty/fallback recipes
              └─ Return { recipes }

CLIENT SIDE
              ├─ Show loading spinner ("Updating recipes…")
              └─ Replace recipe cards with new results
```

---

## 11. Email Delivery Strategy

The server tries email providers in priority order, falling back automatically:

```
1. Brevo API  (BREVO_API_KEY set)
       │ fail
       ▼
2. Brevo SMTP  (BREVO_USER + BREVO_PASS set)
       │ fail
       ▼
3. Gmail SMTP  (EMAIL_USER + EMAIL_PASS set)
       │ fail
       ▼
4. Resend API  (RESEND_API_KEY set)
       │ fail
       ▼
5. No email sent — code still returned in response (dev fallback)
```

Email types:
- **Verification email** — sent on register, contains 6-digit code, 10 min expiry
- **Password reset email** — sent on forgot-password, contains 6-digit code, 10 min expiry

---

## 12. Security

| Concern | Implementation |
|---|---|
| Passwords | bcryptjs, cost factor 10 (~100ms hash time) |
| Sessions | JWT, 30-day expiry, signed with `JWT_SECRET` |
| Auth on protected routes | `authMiddleware` validates Bearer token on all `/api/recipes/*` routes |
| Temp file cleanup | `fs.unlink()` in `finally` block — always runs even on error |
| Verification codes | 6-digit random, 10-minute expiry, deleted after use |
| Reset codes | 6-digit random, 10-minute expiry, deleted after use |
| SQL injection | All queries use parameterised placeholders (`$1, $2, …`) |
| CORS | Enabled via `cors()` middleware for local dev |

---

## 13. Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `DATABASE_SSL` | No | Set `true` for cloud/production DB |
| `GROQ_API_KEY` | Yes | Groq AI API key |
| `JWT_SECRET` | No | JWT signing secret (has default fallback) |
| `BREVO_API_KEY` | One of | Brevo email API key |
| `BREVO_USER` | One of | Brevo SMTP username |
| `BREVO_PASS` | One of | Brevo SMTP password |
| `EMAIL_USER` | One of | Gmail address |
| `EMAIL_PASS` | One of | Gmail app password |
| `RESEND_API_KEY` | One of | Resend API key |

---

## 14. Data Flow Summary

```
                    ┌─────────┐
                    │  User   │
                    └────┬────┘
                         │
              ┌──────────▼──────────┐
              │    React SPA        │
              │  - Auth state       │
              │  - localStorage     │
              │    (token, user)    │
              └──────────┬──────────┘
                         │  REST API calls (axios)
              ┌──────────▼──────────┐
              │   Express Server    │
              │  - JWT middleware   │
              │  - multer uploads   │
              │  - bcrypt hashing   │
              └───┬──────┬──────┬───┘
                  │      │      │
         ┌────────▼┐  ┌──▼──┐  ┌▼──────────┐
         │Postgres │  │Groq │  │TheMealDB  │
         │   DB    │  │ AI  │  │+ Email    │
         └─────────┘  └─────┘  └───────────┘
```

---

## 15. Running the Application

**Prerequisites:**
- Node.js 18+
- PostgreSQL 16

**Setup:**
```bash
# 1. Create database
psql -U postgres -c "CREATE DATABASE smart_recipe_db;"

# 2. Run schema
psql -U postgres -d smart_recipe_db -f server/schema.sql

# 3. Configure environment
# Edit server/.env with your DATABASE_URL, GROQ_API_KEY, email keys

# 4. Install dependencies
cd server && npm install
cd ../client && npm install

# 5. Start server (terminal 1)
cd server && node index.js

# 6. Start client (terminal 2)
cd client && npm start
```

**URLs:**
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000`
- pgAdmin / DB: `localhost:5432` → database `smart_recipe_db`
