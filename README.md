# Get coffee bean information for BEANCONQUERER import

Scrape a coffee product page, extract structured data with AI, and export to Excel. This project provides:

- A web UI (served from `public/index.html`)
- An Express API (`server.js`) to extract data and export an `.xlsx`
- A reusable scraper + extractor module (`coffeeextractor.js`)

Works with either GitHub Models (Copilot) or OpenAI as the LLM provider.

## Requirements

- Node.js 18+ (Node 20+ recommended). The code uses the built-in Fetch API.
- One of:
  - GitHub token with Copilot/Models access (for provider "github"), or
  - OpenAI API key (for provider "openai").

## Quick start (Windows PowerShell)

```powershell
# 1) Install dependencies
npm install

# 2) Create .env with your provider and token
# Example for GitHub Models (default provider):
@"
PROVIDER=github
GITHUB_TOKEN=ghp_your_token_here
PORT=3033
"@ | Out-File -Encoding utf8 .env

# Or for OpenAI:
@"
PROVIDER=openai
OPENAI_API_KEY=sk-your-key-here
PORT=3033
"@ | Out-File -Encoding utf8 .env

# 3) Start the web app
npm start

# App will listen on http://localhost:3033 (unless you changed PORT)
```

Then open http://localhost:3033 in your browser. The UI is pre-filled with a sample product URL and lets you:

- Get info: calls `/api/extract` to scrape + extract using the chosen provider
- Edit fields: adjust any value manually
- Export data: posts to `/api/export` and downloads `coffee-data.xlsx`

## How it works

1. `scrapeCoffeePage(url)` downloads the page HTML (axios) and extracts visible text (cheerio).
2. `extractCoffeeData(rawText, promptOverride?)` sends a prompt + text to the LLM and expects a JSON object with keys:
   - name, roaster, price, cost, weight, flavor, processing, farmer (missing values are allowed as null)
3. The server exposes endpoints and the UI consumes them. Excel export is generated with ExcelJS.

Default model: `gpt-4o-mini` (changeable in `coffeeextractor.js`). The default prompt is bilingual (German/English).

## Configuration (.env)

Create a `.env` file in the project root. Supported variables:

- PROVIDER: `github` (default if not set) or `openai`
- GITHUB_TOKEN: required if PROVIDER=github
- OPENAI_API_KEY: required if PROVIDER=openai
- PORT: optional, defaults to 3033

Auto-detection: If PROVIDER is empty and your `GITHUB_TOKEN` looks like an OpenAI key (starts with `sk-`), the code switches to `openai` and warns. Prefer setting the correct variable explicitly.

## Endpoints

- GET `/healthz`
  - Returns `{ ok: true }` when the server is up.

- GET `/api/extract?url=...`
  - Scrapes the given product URL and runs AI extraction.
  - Response: `{ ok: true, data: { name, roaster, price, cost, weight, flavor, processing, farmer } }`.
  - If `url` is omitted, a sample The Barn product is used.

- POST `/api/extract`
  - JSON body: `{ "url": "https://...", "prompt": "optional override" }`
  - Returns the same shape as the GET endpoint.

- POST `/api/export`
  - JSON body: accepts all fields shown in the UI (see `public/index.html`).
  - Returns: an Excel file `coffee-data.xlsx` with three sheets:
    - Readme_and_Consistency_Check
    - Beans (headers at A1; submitted data in row 2)
    - Bean_Information (enums/hints; headers at A3)

### PowerShell examples

```powershell
# Extract (GET)
iwr "http://localhost:3033/api/extract?url=https://thebarn.de/de/products/elida-gesha" | select -ExpandProperty Content

# Extract (POST with custom prompt)
$body = @{ url = "https://thebarn.de/de/products/elida-gesha"; prompt = "Your custom prompt here" } | ConvertTo-Json
iwr http://localhost:3033/api/extract -Method Post -ContentType 'application/json' -Body $body | select -ExpandProperty Content

# Export (download xlsx)
$payload = @{ name="..."; roaster="..."; price=39.5; weight=250; flavourProfile="..."; processing1="..."; farmer1="..." } | ConvertTo-Json
iwr http://localhost:3033/api/export -Method Post -ContentType 'application/json' -Body $payload -OutFile coffee-data.xlsx
```

## Troubleshooting

- App doesn’t start with `npm start`
  - Check Node version: `node -v` (must be 18+). Reinstall if needed.
  - Ensure `npm install` completed without errors.
  - Verify `.env` exists and contains the correct token for your provider.

- 400/401/403 from provider
  - 400: Likely a malformed Authorization header or wrong token type.
  - 401: Token invalid or lacks access.
  - 403: Copilot/Models not enabled for your account/org.

- `fetch is not defined`
  - Use Node 18+ (or add a polyfill like `node-fetch`, though not needed on 18+).

- “No JSON detected in model output” / “Failed to parse JSON”
  - Rerun. Consider tightening the prompt or selecting fewer fields. The UI supports adding extra fields to the prompt.

- Scraping yields little/no text
  - Some sites block bots or load data dynamically. You may need site-specific selectors or a headless browser.

## Development notes

- UI lives in `public/index.html`. It pre-fills a sample URL and exposes “Get info” and “Export data”.
- Server is `server.js`. It serves static files, exposes API routes, and listens on `PORT` or 3033.
- Core logic is in `coffeeextractor.js` (also runnable directly as a CLI script). When run directly, it uses the URL hard-coded in `main()`.
- Model: change the `model` field in `extractCoffeeData()`.

## Project structure

- `server.js` — Express server, API endpoints, static hosting, Excel export
- `coffeeextractor.js` — scraping + AI extraction helpers; also runnable standalone
- `public/index.html` — simple UI for extraction + export
- `package.json` — ESM project, scripts, dependencies (axios, cheerio, dotenv, express, exceljs)
- `.env` — provider config and tokens (not committed)

## Security

- Don’t commit secrets. Keep tokens in `.env` or an external secret store.
- Avoid logging environment variables. The code already warns against printing `process.env`.

---

Happy brewing!
