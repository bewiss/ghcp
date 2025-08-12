# Coffee Extractor (Node.js)

Scrape a coffee product page and extract structured product data (price, weight, flavor notes, processing, farmer) using the GitHub Models (Copilot) API.

## How it works

1. Scrape page HTML with axios and parse text with cheerio.
2. Send a compact prompt with the scraped text to GitHub Models (`gpt-4o-mini`).
3. Parse the model response for a JSON object with keys: `price`, `weight`, `flavor`, `processing`, `farmer`.

Entrypoint: `coffeeextractor.js` (ESM).

## Prerequisites

- Node.js 18+ (Fetch API is used without polyfills; Node 20+ recommended)
- A GitHub token that can access GitHub Models (Copilot) or an OpenAI API key. See “Auth notes” below.

## Setup

1. Install dependencies
   - npm: `npm install`

2. Configure environment variables
   - Copy `.env.example` to `.env` and set your token:
     - PowerShell: `Copy-Item .env.example .env`
     - Bash: `cp .env.example .env`
   - Edit `.env` and set one of:
     - GitHub Models (default):
       - `PROVIDER=github` (or omit; github is default)
       - `GITHUB_TOKEN=YOUR_GITHUB_TOKEN_WITH_COPILOT_ACCESS`
     - OpenAI:
       - `PROVIDER=openai`
       - `OPENAI_API_KEY=sk-...`

## Build and run

This project is a plain Node.js ESM script and does not require a build step.

- Quickstart (Windows PowerShell):

```powershell
# Install dependencies
npm install

# (Optional) create your env file from the example
Copy-Item .env.example .env

# Run the script
node coffeeextractor.js
```

- Optional npm script: add this to `package.json` and use `npm start`.

```json
{
  "scripts": {
    "start": "node coffeeextractor.js"
  }
}
```

Then run:

```powershell
npm start
```

## Run

- Run the script: `node coffeeextractor.js`

By default it targets: `https://thebarn.de/de/products/elida-gesha`. Edit the `url` in `main()` to point to a different product page.

Example output (shape only):

```json
{
  "price": "€14.90",
  "weight": "250g",
  "flavor": "jasmine, bergamot",
  "processing": "washed",
  "farmer": "Wilford Lamastus"
}
```

## Configuration

- Model: `gpt-4o-mini` (change in `extractCoffeeData()` if needed)
- Headers: User-Agent is set for both scraping and API calls
- Language: Prompt supports German and English product pages

## Auth notes (GitHub Models / Copilot)

- Provider selection:
  - GitHub Models (default): calls `https://api.githubcopilot.com/chat/completions` and requires a valid `GITHUB_TOKEN` with Copilot/Models access.
  - OpenAI: calls `https://api.openai.com/v1/chat/completions` and requires `OPENAI_API_KEY`.
- If your token starts with `sk-`, it’s an OpenAI key. Either set `PROVIDER=openai` and move the key to `OPENAI_API_KEY`, or rely on the auto-detection.
- Common ways to obtain a token:
  - Fine-grained or classic PAT with Copilot/Models access (availability depends on your plan)
  - Or a token from `gh auth token` if your account has the proper entitlements
- If you see 401/403, verify your subscription, token validity, and scopes.

## Troubleshooting

- 400 Bad request (GitHub Models)
  - Authorization header is badly formatted. Ensure you are using a GitHub token (not an OpenAI key) and that it’s set as `GITHUB_TOKEN`.
- 401 Unauthorized
  - Token invalid or missing required Copilot/Models access. Recreate token or use an account with Copilot enabled.
- 403 Forbidden
  - Copilot/Models likely not enabled for this account or organization.
- 429 Rate limited
  - Reduce frequency, add backoff, or try later.
- "No JSON detected in model output"
  - The model did not return a parsable JSON block; rerun or tighten the prompt.
- "Failed to parse JSON"
  - The response looked like JSON but was malformed; rerun or manually adjust parsing.
- `fetch is not defined`
  - Use Node 18+ (or add a fetch polyfill like `node-fetch`).
- Scraping returns little or noisy text
  - Some sites block bots or load content dynamically. You may need site-specific selectors or a headless browser.

## Notes

- Respect target sites’ Terms of Service and robots.txt. Use responsibly.
- Avoid logging secrets. The script already warns against printing `process.env`.
- For repeatable runs and CI, consider adding an npm script, CLI args for the URL, retries, and structured logging.

## Project structure

- `coffeeextractor.js` — main script (scrape + extract)
- `package.json` — ESM config and dependencies (axios, cheerio, dotenv)
- `.env.example` — sample environment variables
