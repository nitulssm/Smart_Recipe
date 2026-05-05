# Fridge to Recipe POC

This is a proof-of-concept app where you upload a fridge image and get recipe suggestions based on detected ingredients.

## How it works
1. Upload a fridge image in the web UI.
2. The backend detects ingredients (mocked for POC).
3. The backend fetches recipes using the detected ingredients (mocked for POC).
4. Recipes are displayed in the UI.

## Getting Started

### Backend
1. `cd server`
2. `npm install`
3. `npm start`

### Frontend
1. `cd client`
2. `npm install`
3. `npm start`

### Notes
- Ingredient detection and recipe search are mocked. Replace with real API integrations for production.
- Update API keys in `server/index.js` when integrating real services.
