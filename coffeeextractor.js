// coffeeExtractor.js
import axios from "axios";
import * as cheerio from "cheerio";
import dotenv from "dotenv";
import { pathToFileURL } from "url";
dotenv.config();

/**
 * Step 1: Scrape a coffee product page
 */
export async function scrapeCoffeePage(url) {
  try {
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const $ = cheerio.load(data);

    // Grab visible text (simplified — could be tuned for your sites)
    let textContent = $("body")
      .text()
      .replace(/\s+/g, " ")
      .trim();

    // Optionally remove unrelated text like navigation/footer
    return textContent;
  } catch (err) {
    console.error("❌ Error scraping page:", err.message);
    return null;
  }
}

/**
 * Step 2: Extract structured coffee data using GPT (GitHub Models or OpenAI)
 */
export async function extractCoffeeData(rawText, promptOverride) {
  const defaultTemplate = `
  Du bist ein Experte für Kaffeeprodukte (Deutsch und Englisch).
  Extrahiere die folgenden Attribute aus der Produktbeschreibung, falls vorhanden:
  - Preis in EUR ohne Wärhungszeichen
  - Gewicht in Gramm ohne Einheit
  - Geschmacksnoten
  - Aufbereitung (Processing)
  - Farmer / Produzent

  Rückgabe im JSON-Format mit den Schlüsseln:
  { "price": "...", "weight": "...", "flavor": "...", "processing": "...", "farmer": "..." }
  Wenn ein Wert fehlt, verwende null.
  `;

  const base = (promptOverride && String(promptOverride).trim()) || defaultTemplate.trim();
  const prompt = `${base}\n\nProduktbeschreibung:\n"""${rawText}"""\n`;

  // Provider selection: github (default) or openai. Fallback if a sk- key is placed in GITHUB_TOKEN.
  let provider = (process.env.PROVIDER || "").toLowerCase().trim();
  const normalize = (v) => (v || "").trim().replace(/^['"]|['"]$/g, "").replace(/^Bearer\s+/i, "");
  const ghRaw = process.env.GITHUB_TOKEN;
  const ghToken = normalize(ghRaw);
  const oaRaw = process.env.OPENAI_API_KEY;
  const oaKey = normalize(oaRaw);

  if (!provider) {
    if (/^sk-/.test(ghToken)) {
      provider = "openai";
      console.warn("ℹ️ Detected an OpenAI-style key in GITHUB_TOKEN; using OpenAI provider. Consider moving it to OPENAI_API_KEY and set PROVIDER=openai.");
    } else {
      provider = "github";
    }
  }

  try {
    let resp;
    if (provider === "openai") {
      const key = oaKey || (/^sk-/.test(ghToken) ? ghToken : "");
      if (!key) {
        console.error("❌ Missing OPENAI_API_KEY in environment (.env) for provider 'openai'.");
        return null;
      }
      console.log("🔗 Using provider: openai");
      resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${key}`,
          "Content-Type": "application/json",
          "User-Agent": "coffee-extractor-script"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0
        })
      });
    } else {
      if (!ghToken) {
        console.error("❌ Missing GITHUB_TOKEN in environment (.env) for provider 'github'.");
        return null;
      }
      if (/^sk-/.test(ghToken)) {
        console.error("❌ GITHUB_TOKEN looks like an OpenAI API key (sk-...). Set PROVIDER=openai and use OPENAI_API_KEY instead.");
        return null;
      }
      console.log("🔗 Using provider: github (GitHub Models)");
      resp = await fetch("https://api.githubcopilot.com/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ghToken}`,
          "Content-Type": "application/json",
          // User-Agent required by GitHub APIs
          "User-Agent": "coffee-extractor-script",
          // Version header (future-proof)
          "X-GitHub-Api-Version": "2023-07-07"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0
        })
      });
    }

    if (!resp.ok) {
      const text = await resp.text();
      if (resp.status === 400) console.error("❌ Bad request. Check Authorization header formatting and token type/scope.");
      if (resp.status === 401) console.error("❌ Unauthorized. Token invalid or lacks Copilot scope.");
      if (resp.status === 403) console.error("❌ Forbidden. Copilot not enabled for this account/org.");
      if (resp.status === 429) console.error("❌ Rate limited. Slow down or try later.");
  console.error("❌ API error:", resp.status, text.slice(0, 500));
      return null;
    }

  const data = await resp.json();
  const output = data.choices?.[0]?.message?.content || "";

    // Try to isolate JSON (handle code fences or extra text)
    let jsonString = null;
    const fenced = output.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) jsonString = fenced[1].trim();
    else {
      const loose = output.match(/\{[\s\S]*\}/); // first JSON-like block
      if (loose) jsonString = loose[0];
    }

    if (!jsonString) {
      console.warn("⚠️ No JSON detected in model output:", output.slice(0, 200));
      return null;
    }

    try {
      return JSON.parse(jsonString);
    } catch (e) {
      console.error("❌ Failed to parse JSON:", e.message, "Raw:", jsonString);
      return null;
    }
  } catch (err) {
    console.error("❌ Network / fetch error:", err.message);
    return null;
  }
}

/**
 * Step 3: Main function
 */
async function main() {
  const url = "https://thebarn.de/products/nativo-nogales";

  console.log("🔍 Scraping page:", url);
  const rawText = await scrapeCoffeePage(url);
  if (!rawText) return;

  console.log("🤖 Sending to GPT for extraction...");
  const coffeeData = await extractCoffeeData(rawText);

  console.log("✅ Extracted coffee data:");
  console.log(coffeeData);

  // Security reminder (avoid leaking tokens if logging env accidentally)
  // console.log(process.env); // <-- Do NOT enable in production
}

try {
  if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    await main();
  }
} catch {
  // Fallback to avoid breaking CLI if detection fails
  await main();
}
