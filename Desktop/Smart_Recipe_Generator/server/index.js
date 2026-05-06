import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Groq from 'groq-sdk';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import pool from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();
const upload = multer({ dest: uploadsDir });
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'smart-recipe-ai-jwt-secret-2024';

/* ── Auth middleware ─────────────────────────────────────────────────────────── */
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

/* ── Register ────────────────────────────────────────────────────────────────── */
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name?.trim() || !email?.trim() || !password)
    return res.status(400).json({ error: 'Name, email and password are required.' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  const key = email.toLowerCase().trim();

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [key]);
  if (existing.rows.length > 0)
    return res.status(409).json({ error: 'An account with this email already exists.' });

  const hash = await bcrypt.hash(password, 10);
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await pool.query(
    `INSERT INTO pending_users (id, name, email, password_hash, code, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (email) DO UPDATE
       SET id = EXCLUDED.id, name = EXCLUDED.name, password_hash = EXCLUDED.password_hash,
           code = EXCLUDED.code, expires_at = EXCLUDED.expires_at, created_at = NOW()`,
    [Date.now(), name.trim(), key, hash, code, expiresAt]
  );

  let emailSent = false;
  try {
    emailSent = await sendEmail({
      to: key, name: name.trim(), subject: 'Verify your email – Smart Recipe', code,
      bodyTitle: 'Verify your email',
      bodyIntro: 'enter the code below to activate your account.',
    });
    if (emailSent) console.log(`[EMAIL] Verification code sent to ${key}`);
  } catch (err) {
    console.error('[EMAIL] Verification send failed:', err.message);
  }

  console.log(`[DEV] Verification code for ${key}: ${code}`);
  res.json({ requiresVerification: true, email: key, code, emailSent });
});

/* ── Verify email ────────────────────────────────────────────────────────────── */
app.post('/api/auth/verify-email', async (req, res) => {
  const { email, code } = req.body || {};
  if (!email?.trim() || !code?.trim())
    return res.status(400).json({ error: 'Email and code are required.' });

  const key = email.toLowerCase().trim();
  const { rows } = await pool.query('SELECT * FROM pending_users WHERE email = $1', [key]);
  const pending = rows[0];

  if (!pending)
    return res.status(400).json({ error: 'No pending registration. Please register again.' });
  if (new Date() > new Date(pending.expires_at)) {
    await pool.query('DELETE FROM pending_users WHERE email = $1', [key]);
    return res.status(400).json({ error: 'Verification code expired. Please register again.' });
  }
  if (pending.code !== code.trim())
    return res.status(400).json({ error: 'Invalid code. Please check and try again.' });

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [key]);
  if (existing.rows.length > 0) {
    await pool.query('DELETE FROM pending_users WHERE email = $1', [key]);
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const result = await pool.query(
    `INSERT INTO users (name, email, password) VALUES ($1, $2, $3)
     RETURNING id, name, email, created_at`,
    [pending.name, pending.email, pending.password_hash]
  );
  await pool.query('DELETE FROM pending_users WHERE email = $1', [key]);

  const dbUser = result.rows[0];
  const user = { id: String(dbUser.id), name: dbUser.name, email: dbUser.email, createdAt: dbUser.created_at };
  const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user });
});

/* ── Login ───────────────────────────────────────────────────────────────────── */
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email?.trim() || !password)
    return res.status(400).json({ error: 'Email and password are required.' });

  const key = email.toLowerCase().trim();
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [key]);
  const found = rows[0];

  if (!found) return res.status(401).json({ error: 'Invalid email or password.' });

  const match = await bcrypt.compare(password, found.password);
  if (!match) return res.status(401).json({ error: 'Invalid email or password.' });

  const user = { id: String(found.id), name: found.name, email: found.email, createdAt: found.created_at };
  const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user });
});

/* ── Email client (Brevo API → Brevo SMTP → Gmail → Resend) ─────────────────── */
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function getBrevoTransport() {
  if (!process.env.BREVO_USER || !process.env.BREVO_PASS ||
      process.env.BREVO_USER.includes('your_brevo')) return null;
  return nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    auth: { user: process.env.BREVO_USER, pass: process.env.BREVO_PASS },
  });
}

function getGmailTransport() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS ||
      process.env.EMAIL_PASS.includes('your_16')) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
}

async function sendEmail({ to, name, subject, code, bodyTitle, bodyIntro }) {
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#f9fafb;border-radius:12px">
      <div style="text-align:center;margin-bottom:24px">
        <div style="display:inline-block;background:#16a34a;color:#fff;border-radius:10px;padding:10px 18px;font-size:1.1rem;font-weight:800">
          🌿 Smart Recipe
        </div>
      </div>
      <h2 style="color:#111827;margin-bottom:8px">${bodyTitle}</h2>
      <p style="color:#6b7280;margin-bottom:24px">Hi ${name}, ${bodyIntro} It expires in <strong>10 minutes</strong>.</p>
      <div style="background:#fff;border:2px solid #16a34a;border-radius:10px;padding:24px;text-align:center;margin-bottom:24px">
        <div style="font-size:2.4rem;font-weight:800;letter-spacing:0.4em;color:#16a34a;font-variant-numeric:tabular-nums">${code}</div>
      </div>
      <p style="color:#9ca3af;font-size:0.82rem;text-align:center">If you didn't request this, you can safely ignore this email.</p>
    </div>`;

  const fromAddr = process.env.BREVO_USER || process.env.EMAIL_USER || 'noreply@smartrecipeai.com';

  if (process.env.BREVO_API_KEY) {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: { name: 'Smart Recipe', email: process.env.BREVO_USER },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });
    if (r.ok) return true;
    const err = await r.json();
    throw new Error(`Brevo API: ${err.message}`);
  }

  const brevo = getBrevoTransport();
  if (brevo) {
    await brevo.sendMail({ from: `"Smart Recipe" <${fromAddr}>`, to, subject, html });
    return true;
  }

  const gmail = getGmailTransport();
  if (gmail) {
    await gmail.sendMail({ from: `"Smart Recipe" <${process.env.EMAIL_USER}>`, to, subject, html });
    return true;
  }

  if (resend) {
    await resend.emails.send({ from: 'Smart Recipe <onboarding@resend.dev>', to, subject, html });
    return true;
  }

  return false;
}

/* ── Forgot password ─────────────────────────────────────────────────────────── */
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body || {};
  if (!email?.trim()) return res.status(400).json({ error: 'Email is required.' });

  const key = email.toLowerCase().trim();
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [key]);
  const found = rows[0];
  if (!found) return res.status(404).json({ error: 'No account found with this email address.' });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await pool.query(
    `INSERT INTO reset_codes (email, code, expires_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET code = EXCLUDED.code, expires_at = EXCLUDED.expires_at, created_at = NOW()`,
    [key, code, expiresAt]
  );

  let emailSent = false;
  try {
    emailSent = await sendEmail({
      to: found.email, name: found.name, subject: 'Your Password Reset Code – Smart Recipe', code,
      bodyTitle: 'Password Reset Code',
      bodyIntro: 'use the code below to reset your password.',
    });
    if (emailSent) console.log(`[EMAIL] Reset code sent to ${found.email}`);
  } catch (err) {
    console.error('[EMAIL] Reset email failed:', err.message);
  }

  console.log(`[DEV] Reset code for ${key}: ${code}`);
  res.json({ message: emailSent ? 'Reset code sent to your email.' : 'Reset code generated.', code, emailSent });
});

/* ── Reset password ──────────────────────────────────────────────────────────── */
app.post('/api/auth/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body || {};
  if (!email?.trim() || !code?.trim() || !newPassword)
    return res.status(400).json({ error: 'Email, code and new password are required.' });

  const key = email.toLowerCase().trim();
  const { rows } = await pool.query('SELECT * FROM reset_codes WHERE email = $1', [key]);
  const stored = rows[0];

  if (!stored)
    return res.status(400).json({ error: 'No reset code found. Please request a new one.' });
  if (new Date() > new Date(stored.expires_at)) {
    await pool.query('DELETE FROM reset_codes WHERE email = $1', [key]);
    return res.status(400).json({ error: 'Reset code has expired. Please request a new one.' });
  }
  if (stored.code !== code.trim())
    return res.status(400).json({ error: 'Invalid reset code. Please check and try again.' });
  if (newPassword.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  const newHash = await bcrypt.hash(newPassword, 10);
  const result = await pool.query('UPDATE users SET password = $1 WHERE email = $2 RETURNING id', [newHash, key]);
  if (result.rowCount === 0) return res.status(404).json({ error: 'User not found.' });

  await pool.query('DELETE FROM reset_codes WHERE email = $1', [key]);
  res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
});

/* ── Saved Recipes ───────────────────────────────────────────────────────────── */
app.get('/api/recipes/saved', authMiddleware, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM saved_recipes WHERE user_id = $1 ORDER BY saved_at DESC',
    [req.user.id]
  );
  res.json(rows.map(dbRowToRecipe));
});

app.post('/api/recipes/saved', authMiddleware, async (req, res) => {
  const rec = req.body;
  if (!rec?.title) return res.status(400).json({ error: 'Recipe title is required.' });
  await pool.query(
    `INSERT INTO saved_recipes (user_id, title, time, difficulty, servings, description, ingredients, steps, tips, image_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (user_id, title) DO NOTHING`,
    [req.user.id, rec.title, rec.time || null, rec.difficulty || null, rec.servings || null,
     rec.description || null, JSON.stringify(rec.ingredients || []), JSON.stringify(rec.steps || []),
     JSON.stringify(rec.tips || []), rec.imageUrl || null]
  );
  res.json({ ok: true });
});

app.delete('/api/recipes/saved/:title', authMiddleware, async (req, res) => {
  await pool.query(
    'DELETE FROM saved_recipes WHERE user_id = $1 AND title = $2',
    [req.user.id, decodeURIComponent(req.params.title)]
  );
  res.json({ ok: true });
});

/* ── Viewed Recipes ──────────────────────────────────────────────────────────── */
app.get('/api/recipes/viewed', authMiddleware, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM viewed_recipes WHERE user_id = $1 ORDER BY viewed_at DESC',
    [req.user.id]
  );
  res.json(rows.map(dbRowToRecipe));
});

app.post('/api/recipes/viewed', authMiddleware, async (req, res) => {
  const rec = req.body;
  if (!rec?.title) return res.status(400).json({ error: 'Recipe title is required.' });
  await pool.query(
    `INSERT INTO viewed_recipes (user_id, title, time, difficulty, servings, description, ingredients, steps, tips, image_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (user_id, title) DO UPDATE SET viewed_at = NOW()`,
    [req.user.id, rec.title, rec.time || null, rec.difficulty || null, rec.servings || null,
     rec.description || null, JSON.stringify(rec.ingredients || []), JSON.stringify(rec.steps || []),
     JSON.stringify(rec.tips || []), rec.imageUrl || null]
  );
  res.json({ ok: true });
});

function dbRowToRecipe(row) {
  return {
    title: row.title,
    time: row.time,
    difficulty: row.difficulty,
    servings: row.servings,
    description: row.description,
    ingredients: row.ingredients || [],
    steps: row.steps || [],
    tips: row.tips || [],
    imageUrl: row.image_url,
  };
}

/* ── AI / Image processing ───────────────────────────────────────────────────── */
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const TEXT_MODEL = 'llama-3.3-70b-versatile';

function extractJsonArray(text) {
  try { const v = JSON.parse(text.trim()); if (Array.isArray(v)) return v; } catch {}
  const m = text.match(/\[[\s\S]*\]/);
  if (m) { try { const v = JSON.parse(m[0]); if (Array.isArray(v)) return v; } catch {} }
  return null;
}

function getGroqClient() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not set. Create server/.env with: GROQ_API_KEY=your_key_here');
  }
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

async function detectIngredients(imagePath, mimeType) {
  const groq = getGroqClient();
  const base64 = fs.readFileSync(imagePath).toString('base64');

  const response = await groq.chat.completions.create({
    model: VISION_MODEL,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: { url: `data:${mimeType};base64,${base64}` },
        },
        {
          type: 'text',
          text: 'List every food ingredient visible in this image. If there are no food ingredients, return an empty array. Reply with ONLY a JSON array of strings, e.g. ["egg","milk","cheese"] or [] if none found. No other text.',
        },
      ],
    }],
    max_tokens: 256,
  });

  const text = response.choices[0].message.content;
  const parsed = extractJsonArray(text);
  if (parsed) return parsed.map(String);

  return [];
}

async function getRecipes(ingredients) {
  const groq = getGroqClient();
  const list = ingredients.join(', ');

  const response = await groq.chat.completions.create({
    model: TEXT_MODEL,
    messages: [{
      role: 'user',
      content:
        `I have these ingredients: ${list}.\n` +
        'Suggest 3 different recipes I can cook with them.\n' +
        'Reply with ONLY a JSON array in this exact format:\n' +
        '[{"title":"Recipe Name","time":"20 mins","difficulty":"Easy","ingredients":["ingredient1","ingredient2","ingredient3"],"steps":["Step 1 instruction","Step 2 instruction","Step 3 instruction","Step 4 instruction"]}]\n' +
        'Each recipe must have: estimated cooking time, difficulty (Easy/Medium/Hard), 3-5 key ingredients used, and 4-6 clear steps. No other text outside the array.',
    }],
    max_tokens: 1200,
  });

  const text = response.choices[0].message.content;
  const parsed = extractJsonArray(text);
  if (parsed && parsed.length > 0) {
    return parsed.map(r => ({
      title: String(r.title || r.name || 'Recipe'),
      time: String(r.time || '20 mins'),
      difficulty: String(r.difficulty || 'Easy'),
      ingredients: Array.isArray(r.ingredients) ? r.ingredients.map(String) : [],
      steps: Array.isArray(r.steps) ? r.steps.map(String) : [String(r.description || r.instructions || text.trim())],
    }));
  }
  return [{ title: 'Recipe suggestion', time: '20 mins', difficulty: 'Easy', ingredients: [], steps: [text.trim()] }];
}

async function getMealImage(title, recipeIngredients) {
  try {
    const r1 = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(title)}`);
    const d1 = await r1.json();
    if (d1.meals?.[0]) return d1.meals[0].strMealThumb;

    const keyword = title.split(' ').sort((a, b) => b.length - a.length)[0];
    if (keyword && keyword.length > 3) {
      const r2 = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(keyword)}`);
      const d2 = await r2.json();
      if (d2.meals?.[0]) return d2.meals[0].strMealThumb;
    }

    for (const ing of (recipeIngredients || []).slice(0, 3)) {
      const r3 = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(ing)}`);
      const d3 = await r3.json();
      if (d3.meals?.[0]) return d3.meals[0].strMealThumb;
    }
  } catch (e) {
    console.error('Image fetch error:', e.message);
  }

  return `https://source.unsplash.com/400x300/?${encodeURIComponent(title)},food,dish`;
}

app.post('/api/recipes-from-ingredients', async (req, res) => {
  const { ingredients } = req.body || {};
  if (!Array.isArray(ingredients) || ingredients.length === 0)
    return res.status(400).json({ error: 'Ingredients list is required.' });

  try {
    const recipes = await getRecipes(ingredients);
    const recipesWithImages = await Promise.all(
      recipes.map(async r => ({
        ...r,
        imageUrl: await getMealImage(r.title, r.ingredients),
      }))
    );
    const filtered = recipesWithImages.filter(r =>
      r.title && r.title !== 'Recipe suggestion' && (r.ingredients || []).length > 0
    );
    res.json({ recipes: filtered });
  } catch (err) {
    console.error('Recipe regen error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/detect-only', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image file provided.' });
  const imagePath = req.file.path;
  const mimeType = req.file.mimetype || 'image/jpeg';
  try {
    const ingredients = await detectIngredients(imagePath, mimeType);
    res.json({ ingredients });
  } catch (err) {
    console.error('Detect error:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    fs.unlink(imagePath, () => {});
  }
});

app.post('/api/upload', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file provided.' });
  }
  const imagePath = req.file.path;
  const mimeType = req.file.mimetype || 'image/jpeg';
  try {
    const ingredients = await detectIngredients(imagePath, mimeType);

    if (ingredients.length === 0) {
      return res.json({ ingredients: [], recipes: [], noIngredientsFound: true });
    }

    const recipes = await getRecipes(ingredients);

    const recipesWithImages = await Promise.all(
      recipes.map(async r => ({
        ...r,
        imageUrl: await getMealImage(r.title, r.ingredients),
      }))
    );

    res.json({ ingredients, recipes: recipesWithImages });
  } catch (err) {
    console.error('Processing error:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    fs.unlink(imagePath, () => {});
  }
});

app.post('/api/recipe-by-name', async (req, res) => {
  const { recipeName } = req.body || {};
  if (!recipeName?.trim()) return res.status(400).json({ error: 'Recipe name is required.' });

  const groq = getGroqClient();
  const response = await groq.chat.completions.create({
    model: TEXT_MODEL,
    messages: [{
      role: 'user',
      content:
        `Give me a complete recipe for "${recipeName.trim()}".\n` +
        'Reply with ONLY a JSON object in this exact format:\n' +
        '{"title":"Recipe Name","time":"30 mins","difficulty":"Medium","servings":"4","description":"One line description",' +
        '"ingredients":[{"name":"Paneer (cubes)","quantity":"200 g"},{"name":"Butter","quantity":"2 tbsp"}],' +
        '"steps":[{"title":"Prepare the base","instruction":"Heat 1 tbsp butter and oil in a pan. Add chopped onions and sauté until golden."},{"title":"Add ginger garlic","instruction":"Add ginger garlic paste and sauté for a minute."}],' +
        '"tips":["Tip 1","Tip 2"]}\n' +
        'Include 8-14 ingredients and 6-8 clear steps with short titles. No text outside the JSON.',
    }],
    max_tokens: 1000,
  });

  const text = response.choices[0].message.content;
  let recipe;
  try { recipe = JSON.parse(text.trim()); } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) try { recipe = JSON.parse(m[0]); } catch {}
  }

  if (!recipe) return res.status(500).json({ error: 'Failed to parse recipe. Please try again.' });

  const imageUrl = await getMealImage(recipe.title, recipe.ingredients);
  res.json({ recipe: { ...recipe, imageUrl } });
});

app.listen(5000, () => {
  console.log('Server running on http://localhost:5000');
  console.log(`Vision: ${VISION_MODEL}  |  Text: ${TEXT_MODEL}`);
});
