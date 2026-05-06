# Smart Recipe — Technical Documentation

> **Related document:** [ARCHITECTURE.md](ARCHITECTURE.md) — system architecture diagrams, data flow, and infrastructure overview.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Frontend Architecture](#4-frontend-architecture)
5. [Backend Architecture](#5-backend-architecture)
6. [Database Architecture — PostgreSQL](#6-database-architecture--postgresql)
7. [How Ingredient Images Are Fetched](#7-how-ingredient-images-are-fetched)
8. [How Recipe Images Are Fetched](#8-how-recipe-images-are-fetched)
9. [AI Integration — Groq API](#9-ai-integration--groq-api)
10. [Authentication System](#10-authentication-system)
11. [Data Storage — Where Everything Lives](#11-data-storage--where-everything-lives)
12. [Full Request Lifecycle](#12-full-request-lifecycle)
13. [API Endpoints Reference](#13-api-endpoints-reference)
14. [Environment Variables Reference](#14-environment-variables-reference)

---

## 1. Project Overview

Smart Recipe is a full-stack web application that lets users photograph the inside of their fridge, automatically detects the ingredients using AI vision, and instantly generates personalized recipe suggestions. Users can save recipes, track viewed recipes, and manage their profile — all tied to individual accounts persisted in a **PostgreSQL database**.

**Core capabilities:**
- AI-powered ingredient detection from fridge photos
- AI-generated recipe suggestions with steps and metadata
- Automatic recipe image lookup from a meals database
- Multi-user authentication with email verification and password reset
- Saved and viewed recipe persistence per account (stored in PostgreSQL)
- Dynamic recipe regeneration when ingredients are added or removed

---

## 2. Technology Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 18.x | UI library |
| react-scripts (CRA) | 5.0.1 | Build toolchain |
| Axios | 1.6.x | HTTP requests to backend |
| CSS Custom Properties | — | Green theme design system |
| localStorage | Browser API | Auth session only (token + user object) |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js | 24.x | Runtime |
| Express.js | 4.18.x | HTTP server & routing |
| pg (node-postgres) | 8.20.x | PostgreSQL database client |
| Groq SDK | 1.1.x | AI API client |
| Multer | 1.4.x | File upload handling |
| bcryptjs | 3.x | Password hashing |
| jsonwebtoken (JWT) | 9.x | Session tokens |
| nodemailer | 8.x | SMTP email sending |
| resend | 6.x | Resend email API |
| dotenv | 17.x | Environment variable loading |
| cors | 2.8.x | Cross-origin request headers |

### Database
| Technology | Version | Purpose |
|---|---|---|
| PostgreSQL | 16 | Primary persistent data store for users, recipes, and auth codes |

### External Services
| Service | Usage | Cost |
|---|---|---|
| Groq API | Vision AI + text AI | Free tier |
| TheMealDB API | Recipe images | Free, no key needed |
| Spoonacular CDN | Ingredient images | Free CDN, no key needed |
| Brevo | Email delivery (primary) | Free tier |
| Gmail SMTP | Email delivery (fallback) | Free |
| Resend | Email delivery (last fallback) | Free tier |

---

## 3. Project Structure

```
Smart_Recipe_Generator/
│
├── client/                        # React frontend
│   ├── src/
│   │   ├── App.js                 # All components + app logic
│   │   └── App.css                # All styles
│   └── package.json
│
├── server/                        # Express backend
│   ├── index.js                   # All routes + AI logic
│   ├── db.js                      # PostgreSQL connection pool
│   ├── schema.sql                 # DB table definitions (run once to set up)
│   ├── uploads/                   # Temporary image storage (auto-deleted after AI)
│   ├── .env                       # API keys and DB credentials (not in git)
│   └── package.json
│
├── ARCHITECTURE.md                # System architecture diagrams
└── TECHNICAL_DOCS.md              # This file
```

---

## 4. Frontend Architecture

### Entry Point
The entire frontend lives in a single file: `client/src/App.js`. It uses a **component-per-section** pattern — every UI section is its own React function component defined in the same file.

### Component Tree

```
App()                          ← Root component, holds all state
│
├── AuthPage()                 ← Shown when no user is logged in
│
└── (main app — when logged in)
    ├── Header
    │   └── UserDropdown
    │       └── ProfileModal() ← User profile popup
    ├── StepBar()              ← 3-step progress indicator
    ├── RecipeSearch()         ← Home tab: search recipe by name
    ├── Left Column (Fridge tab)
    │   └── Upload card (drag & drop, file input, Analyze button)
    ├── Right Column (Fridge tab)
    │   ├── IngredientChip()   ← One chip per detected ingredient
    │   ├── RecipeCard()       ← Grid view recipe card
    │   ├── RecipeListCard()   ← List view recipe card
    │   └── RecipeTableRows()  ← Table view
    ├── RecipeModal()          ← Full recipe detail popup
    ├── AllRecipesModal()      ← All suggested recipes popup
    ├── SavedModal()           ← Saved recipes popup
    ├── MyRecipesModal()       ← Viewed + Saved tabs popup
    └── HowItWorksModal()      ← 4-step explainer popup
```

### State Management

All state is managed locally in the `App()` component using React `useState`. There is no external state library. Key state variables:

```js
// Auth
currentUser        // { id, name, email, createdAt } or null
showUserMenu       // boolean — avatar dropdown open/closed
showProfile        // boolean — profile modal open/closed

// Per-user recipe data — fetched from PostgreSQL API on user change
savedRecipes       // array of recipe objects
viewedRecipes      // array of recipe objects

// Upload flow
image              // File object from input
preview            // Object URL for image preview
ingredients        // [{ name, confidence }]
recipes            // [{ title, time, difficulty, ingredients, steps, imageUrl }]
loading            // boolean
status / error     // string feedback

// UI
recipeViewMode     // 'grid' | 'list' | 'table'
viewingRecipe      // recipe object currently open in modal
showAllRecipes     // boolean
showSaved          // boolean
showMyRecipes      // boolean
showHowItWorks     // boolean
```

### Per-User Data Loading from PostgreSQL

When the logged-in user changes, a `useEffect` hook watches `userKey` (= `currentUser?.id || 'guest'`) and fetches saved/viewed recipes from the API (backed by PostgreSQL):

```js
useEffect(() => {
  const token = localStorage.getItem('authToken');
  if (!token || !currentUser) {
    setSavedRecipes([]);
    setViewedRecipes([]);
    return;
  }
  const headers = { Authorization: `Bearer ${token}` };
  axios.get('http://localhost:5000/api/recipes/saved', { headers })
    .then(r => setSavedRecipes(normalizeRecipeList(r.data)));
  axios.get('http://localhost:5000/api/recipes/viewed', { headers })
    .then(r => setViewedRecipes(normalizeRecipeList(r.data)));
}, [userKey]);
```

> Saved and viewed recipes are **no longer stored in localStorage** — they are fetched from and persisted to PostgreSQL, so they are available across devices and browsers.

---

## 5. Backend Architecture

The entire backend is a single Express file: `server/index.js`, plus `server/db.js` for the PostgreSQL connection pool.

It uses **ES Modules** (`"type": "module"` in package.json).

### Middleware Stack
```
CORS          → allows requests from React dev server (localhost:3000)
express.json  → parses JSON request bodies
multer        → parses multipart/form-data (image upload routes only)
```

### Auth Middleware
All `/api/recipes/*` routes are protected by JWT middleware:

```js
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
    return res.status(401).json({ error: 'Authentication required.' });
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}
```

### Server Startup
```
Port            : 5000
Uploads dir     : server/uploads/  (auto-created if missing)
Database        : PostgreSQL via pg Pool (DATABASE_URL from .env)
```

---

## 6. Database Architecture — PostgreSQL

### Connection Pool (`server/db.js`)

```js
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});
```

The pool manages multiple concurrent connections. `DATABASE_URL` is set in `server/.env`:

```
DATABASE_URL=postgresql://postgres:userpass@localhost:5432/smart_recipe_db
```

### Tables

#### `users` — Registered accounts
```sql
CREATE TABLE users (
    id          BIGSERIAL                PRIMARY KEY,
    name        VARCHAR(255)             NOT NULL,
    email       VARCHAR(255)             NOT NULL UNIQUE,
    password    VARCHAR(255)             NOT NULL,   -- bcrypt hash
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `pending_users` — Awaiting email verification
```sql
CREATE TABLE pending_users (
    id              BIGINT                   NOT NULL,
    name            VARCHAR(255)             NOT NULL,
    email           VARCHAR(255)             NOT NULL UNIQUE,
    password_hash   VARCHAR(255)             NOT NULL,
    code            CHAR(6)                  NOT NULL,
    expires_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```
Rows are deleted after successful email verification or on code expiry.

#### `reset_codes` — Password reset codes
```sql
CREATE TABLE reset_codes (
    email       VARCHAR(255)             NOT NULL PRIMARY KEY,
    code        CHAR(6)                  NOT NULL,
    expires_at  TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```
One active reset code per email at a time. Deleted after a successful password reset.

#### `saved_recipes` — User bookmarked recipes
```sql
CREATE TABLE saved_recipes (
    id          BIGSERIAL                PRIMARY KEY,
    user_id     BIGINT                   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(500)             NOT NULL,
    time        VARCHAR(100),
    difficulty  VARCHAR(50),
    servings    VARCHAR(50),
    description TEXT,
    ingredients JSONB                    NOT NULL DEFAULT '[]',
    steps       JSONB                    NOT NULL DEFAULT '[]',
    tips        JSONB                    NOT NULL DEFAULT '[]',
    image_url   TEXT,
    saved_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, title)
);
```

#### `viewed_recipes` — Recently viewed recipes
```sql
CREATE TABLE viewed_recipes (
    id          BIGSERIAL                PRIMARY KEY,
    user_id     BIGINT                   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(500)             NOT NULL,
    time        VARCHAR(100),
    difficulty  VARCHAR(50),
    servings    VARCHAR(50),
    description TEXT,
    ingredients JSONB                    NOT NULL DEFAULT '[]',
    steps       JSONB                    NOT NULL DEFAULT '[]',
    tips        JSONB                    NOT NULL DEFAULT '[]',
    image_url   TEXT,
    viewed_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, title)
);
```
On re-view of the same recipe, `viewed_at` is updated to `NOW()` (upsert).

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────┐
│                   users                     │
│  id (PK) │ name │ email (UNIQUE) │ password │
│  created_at                                 │
└──────────────────┬──────────────────────────┘
                   │ 1
          ─────────┴─────────
         │                   │
         │ ∞                 │ ∞
┌────────▼────────┐   ┌──────▼──────────────┐
│  saved_recipes  │   │   viewed_recipes     │
│  id (PK)        │   │  id (PK)             │
│  user_id (FK)   │   │  user_id (FK)        │
│  title          │   │  title               │
│  ingredients[]  │   │  ingredients[]       │
│  steps[]  JSONB │   │  steps[]  JSONB      │
│  tips[]         │   │  tips[]              │
│  saved_at       │   │  viewed_at           │
└─────────────────┘   └──────────────────────┘

┌──────────────────────────┐  ┌──────────────────────────┐
│      pending_users       │  │       reset_codes         │
│  email (UNIQUE)          │  │  email (PK)               │
│  code │ expires_at       │  │  code │ expires_at        │
│  [deleted after verify]  │  │  [deleted after reset]    │
└──────────────────────────┘  └──────────────────────────┘
```

### Key Constraints

| Table | Constraint | Behaviour |
|---|---|---|
| `users.email` | UNIQUE | One account per email |
| `pending_users.email` | UNIQUE | Upsert on re-register |
| `reset_codes.email` | PRIMARY KEY | One active reset code per email |
| `saved_recipes(user_id, title)` | UNIQUE | No duplicate saves per user |
| `viewed_recipes(user_id, title)` | UNIQUE | `viewed_at` updated on re-view |
| `saved_recipes.user_id` | ON DELETE CASCADE | Deleting user removes their saves |
| `viewed_recipes.user_id` | ON DELETE CASCADE | Deleting user removes their history |

### Database Setup Commands

```bash
# 1. Create the database
psql -U postgres -c "CREATE DATABASE smart_recipe_db;"

# 2. Run schema to create all tables and indexes
psql -U postgres -d smart_recipe_db -f server/schema.sql

# 3. Set connection string in server/.env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/smart_recipe_db
```

---

## 7. How Ingredient Images Are Fetched

### Source
**Spoonacular CDN** — a free public image CDN that hosts food ingredient photos.

### Where it happens
Entirely on the **frontend** (inside `IngredientChip` component in `App.js`).

### How the URL is built

```js
const normalized = item.name
  .toLowerCase()
  .trim()
  .replace(/\s+/g, '-')
  .replace(/[^a-z0-9-]/g, '');

const imgUrl = `https://spoonacular.com/cdn/ingredients_100x100/${normalized}.jpg`;
```

**Example:** `"Bell Pepper"` → `"bell-pepper"` → `…/bell-pepper.jpg`

### Fallback
If the image fails to load, an `onError` handler shows a **letter avatar** — a coloured circle with the first letter of the ingredient name.

---

## 8. How Recipe Images Are Fetched

### Source
**TheMealDB API** — free public meal database with photos. No API key required.

### Where it happens
On the **backend** (`server/index.js`, `getMealImage` function). Avoids CORS issues.

### Three-Strategy Fallback

```
Strategy 1: Search by full recipe title
  GET /search.php?s=Spaghetti+Bolognese
  → if meals found → return meals[0].strMealThumb

Strategy 2: Search by longest word in title
  "Creamy Vegetable Pasta" → keyword = "Vegetable"
  GET /search.php?s=Vegetable

Strategy 3: Filter by top 3 recipe ingredients
  GET /filter.php?i=chicken
  GET /filter.php?i=tomato
  GET /filter.php?i=garlic

No match: return Unsplash fallback URL
```

All 3 image lookups per upload run in parallel via `Promise.all`.

---

## 9. AI Integration — Groq API

### Models Used
| Model | Task |
|---|---|
| `meta-llama/llama-4-scout-17b-16e-instruct` | Vision — reads fridge photo, lists ingredients |
| `llama-3.3-70b-versatile` | Text — generates recipes from ingredient list |

### Step 1 — Ingredient Detection (Vision Model)

Image is read from disk, base64-encoded, and sent to Groq:

```js
groq.chat.completions.create({
  model: 'meta-llama/llama-4-scout-17b-16e-instruct',
  messages: [{
    role: 'user',
    content: [
      { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
      { type: 'text', text: 'List every food ingredient visible in this image. If there are no food ingredients, return an empty array. Reply with ONLY a JSON array of strings...' }
    ]
  }],
  max_tokens: 256
});
```

- If response cannot be parsed as JSON array → returns `[]`
- If `[]` → server skips recipe generation → returns `{ noIngredientsFound: true }`
- Client shows error message instead of recipe cards

### Step 2 — Recipe Generation (Text Model)

```js
`I have these ingredients: ${list}.
Suggest 3 different recipes I can cook with them.
Reply with ONLY a JSON array:
[{"title":"...","time":"...","difficulty":"...","ingredients":[...],"steps":[...]}]`
```

### Step 3 — Dynamic Regeneration

When the user adds or removes an ingredient, the client calls:
```
POST /api/recipes-from-ingredients  { ingredients: string[] }
```
Server runs `getRecipes()` + `getMealImage()` again with the updated list.

### Temporary File Handling
```js
} finally {
  fs.unlink(imagePath, () => {});  // always deleted, even on AI error
}
```

---

## 10. Authentication System

### Registration + Email Verification

```
POST /api/auth/register
  ├─ Validate fields
  ├─ SELECT FROM users WHERE email = $1  (duplicate check)
  ├─ bcrypt.hash(password, 10)
  ├─ Generate 6-digit code, expiry = now + 10 min
  ├─ INSERT INTO pending_users (upsert on email conflict)
  ├─ Send verification email (Brevo → Gmail → Resend fallback)
  └─ Return { requiresVerification: true, code, emailSent }

POST /api/auth/verify-email
  ├─ SELECT FROM pending_users WHERE email = $1
  ├─ Check expires_at > now
  ├─ Check code matches
  ├─ INSERT INTO users (name, email, password_hash)
  ├─ DELETE FROM pending_users WHERE email = $1
  ├─ jwt.sign({ id, name, email }, JWT_SECRET, { expiresIn: '30d' })
  └─ Return { token, user }
```

### Login

```
POST /api/auth/login
  ├─ SELECT * FROM users WHERE email = $1
  ├─ bcrypt.compare(password, stored_hash)
  ├─ jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' })
  └─ Return { token, user }
```

### Password Reset

```
POST /api/auth/forgot-password
  ├─ SELECT user by email from users table
  ├─ Generate 6-digit code, expiry = now + 10 min
  ├─ INSERT/UPDATE reset_codes (upsert)
  └─ Send reset email

POST /api/auth/reset-password
  ├─ SELECT FROM reset_codes WHERE email = $1
  ├─ Check expiry and code
  ├─ bcrypt.hash(newPassword, 10)
  ├─ UPDATE users SET password = $1 WHERE email = $2
  └─ DELETE FROM reset_codes WHERE email = $1
```

### Client Session

```js
// Restore session on page load
const [currentUser, setCurrentUser] = useState(() => {
  const u = localStorage.getItem('authUser');
  const t = localStorage.getItem('authToken');
  return (u && t) ? JSON.parse(u) : null;
});

// Logout — clear session
localStorage.removeItem('authToken');
localStorage.removeItem('authUser');
```

### Email Delivery Priority

```
1. Brevo API      (BREVO_API_KEY set)
       ↓ fail
2. Brevo SMTP     (BREVO_USER + BREVO_PASS set)
       ↓ fail
3. Gmail SMTP     (EMAIL_USER + EMAIL_PASS set)
       ↓ fail
4. Resend API     (RESEND_API_KEY set)
       ↓ fail
5. No email sent  (code still returned in API response — dev fallback)
```

### Security Measures

| Concern | Implementation |
|---|---|
| Passwords | bcryptjs, cost factor 10 (~100ms per hash) |
| Sessions | JWT, 30-day expiry, signed with `JWT_SECRET` |
| Protected routes | `authMiddleware` validates Bearer token |
| Verification codes | 6-digit random, 10-minute expiry, deleted after use |
| Reset codes | 6-digit random, 10-minute expiry, deleted after use |
| SQL injection | All queries use parameterised placeholders `$1, $2, …` |
| Temp file cleanup | `fs.unlink()` in `finally` block — always runs |

---

## 11. Data Storage — Where Everything Lives

### PostgreSQL (`smart_recipe_db`) — Primary Store

| Table | Data | Lifecycle |
|---|---|---|
| `users` | Registered accounts | Permanent |
| `pending_users` | Registrations awaiting email verify | Deleted after verification |
| `reset_codes` | Password reset codes | Deleted after reset |
| `saved_recipes` | User bookmarked recipes | Permanent per user |
| `viewed_recipes` | Recently viewed recipes | Permanent per user |

### Browser `localStorage` — Session Only

| Key | Value | Cleared on logout? |
|---|---|---|
| `authToken` | JWT string | Yes |
| `authUser` | JSON `{id, name, email, createdAt}` | Yes |

> **Saved and viewed recipes are no longer in localStorage.** They are fetched from PostgreSQL on login and written to PostgreSQL on every save/view action — meaning they persist across devices and browsers.

### Temporary File Storage

| Location | Contents | Lifetime |
|---|---|---|
| `server/uploads/` | Uploaded fridge photos | Deleted immediately after AI processing |

### Full Summary

| Data | Storage | Persists across devices? |
|---|---|---|
| User accounts | PostgreSQL `users` | Yes |
| Pending registrations | PostgreSQL `pending_users` (temp) | N/A |
| Reset codes | PostgreSQL `reset_codes` (temp) | N/A |
| Saved recipes | PostgreSQL `saved_recipes` | Yes |
| Viewed recipes | PostgreSQL `viewed_recipes` | Yes |
| Auth session | `localStorage` | No (browser only) |
| Uploaded photos | `server/uploads/` | No (deleted after AI) |

---

## 12. Full Request Lifecycle

### Fridge photo → recipes on screen

```
1. User selects/drops image
   → React creates Object URL for preview

2. User clicks "Analyze Fridge"
   → POST http://localhost:5000/api/upload  (multipart)

3. Server (multer) saves file to server/uploads/<uuid>

4. detectIngredients()
   → base64 encode image
   → Groq Vision API (llama-4-scout-17b)
   → Parse JSON array → if [] → return { noIngredientsFound: true }

5. getRecipes(ingredients)
   → Groq Text API (llama-3.3-70b)
   → Parse 3 recipe objects

6. getMealImage() × 3  [Promise.all]
   → TheMealDB API (3-strategy fallback per recipe)

7. fs.unlink(imagePath)  ← always runs

8. Return { ingredients, recipes: [...with imageUrl] }

9. Client updates state
   → ingredients → IngredientChip components
   → recipes → RecipeCard / list / table
```

### User saves a recipe

```
User clicks ♡
        ↓
toggleSave(rec) — optimistic UI update (instant)
        ↓
POST /api/recipes/saved  { ...recipe }
  Authorization: Bearer <token>
        ↓
INSERT INTO saved_recipes ... ON CONFLICT DO NOTHING
        ↓
Persisted in PostgreSQL
```

### User views a recipe

```
User clicks "View Recipe"
        ↓
handleViewRecipe(rec)
  → setViewingRecipe(rec) — RecipeModal opens
        ↓
POST /api/recipes/viewed  { ...recipe }
  Authorization: Bearer <token>
        ↓
INSERT INTO viewed_recipes ...
  ON CONFLICT (user_id, title) DO UPDATE SET viewed_at = NOW()
        ↓
Persisted in PostgreSQL
```

---

## 13. API Endpoints Reference

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Start registration; send email verification code |
| POST | `/api/auth/verify-email` | No | Verify code; create user; return JWT |
| POST | `/api/auth/login` | No | Validate credentials; return JWT |
| POST | `/api/auth/forgot-password` | No | Generate reset code; send email |
| POST | `/api/auth/reset-password` | No | Validate code; update password |

### AI & Image Processing

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/upload` | No | Fridge image → detect ingredients → generate recipes |
| POST | `/api/detect-only` | No | Fridge image → detect ingredients only |
| POST | `/api/recipe-by-name` | No | Search recipe by name using Groq AI |
| POST | `/api/recipes-from-ingredients` | No | Regenerate recipes from updated ingredient list |

### User Recipe Storage *(JWT required)*

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/recipes/saved` | JWT | Fetch all saved recipes for current user |
| POST | `/api/recipes/saved` | JWT | Save a recipe |
| DELETE | `/api/recipes/saved/:title` | JWT | Remove a saved recipe |
| GET | `/api/recipes/viewed` | JWT | Fetch all viewed recipes (newest first) |
| POST | `/api/recipes/viewed` | JWT | Record recipe as viewed (upserts `viewed_at`) |

---

## 14. Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | **Yes** | PostgreSQL connection string e.g. `postgresql://postgres:pass@localhost:5432/smart_recipe_db` |
| `DATABASE_SSL` | No | Set `true` for cloud/production DB (Supabase, Neon, etc.) |
| `GROQ_API_KEY` | **Yes** | Groq AI API key |
| `JWT_SECRET` | Recommended | JWT signing secret (insecure default used if not set) |
| `BREVO_API_KEY` | One of | Brevo email API key (primary email provider) |
| `BREVO_USER` | One of | Brevo SMTP username |
| `BREVO_PASS` | One of | Brevo SMTP password |
| `EMAIL_USER` | One of | Gmail address (fallback email provider) |
| `EMAIL_PASS` | One of | Gmail app password |
| `RESEND_API_KEY` | One of | Resend API key (last fallback) |

---

*End of Technical Documentation*
