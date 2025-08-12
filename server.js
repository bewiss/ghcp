import express from "express";
import dotenv from "dotenv";
import ExcelJS from "exceljs";
import { scrapeCoffeePage, extractCoffeeData } from "./coffeeextractor.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3033;

// Serve static landing page and assets
app.use(express.static("public"));
app.use(express.json());

// Health endpoint
app.get("/healthz", (req, res) => res.json({ ok: true }));

// API: Extract coffee info from a product URL
app.get("/api/extract", async (req, res) => {
  const url = (req.query.url || "https://thebarn.de/de/products/elida-gesha").toString();
  try {
    const rawText = await scrapeCoffeePage(url);
    if (!rawText) return res.status(502).json({ ok: false, error: "Scrape failed" });
    const data = await extractCoffeeData(rawText);
    return res.json({ ok: true, data });
  } catch (e) {
    console.error("/api/extract error:", e);
    return res.status(500).json({ ok: false, error: e?.message || "Unknown error" });
  }
});

// API: Export provided data to Excel and trigger download
app.post("/api/export", async (req, res) => {
  try {
    const { url, price, weight, flavor, processing, farmer } = req.body || {};
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Coffee");
    sheet.columns = [
      { header: "URL", key: "URL", width: 50 },
      { header: "PriceEUR", key: "PriceEUR", width: 12 },
      { header: "WeightG", key: "WeightG", width: 10 },
      { header: "Flavor", key: "Flavor", width: 50 },
      { header: "Processing", key: "Processing", width: 14 },
      { header: "Farmer", key: "Farmer", width: 28 }
    ];
    sheet.addRow({
      URL: url || "",
      PriceEUR: price || "",
      WeightG: weight || "",
      Flavor: flavor || "",
      Processing: processing || "",
      Farmer: farmer || ""
    });

    const buf = await workbook.xlsx.writeBuffer();
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="coffee-data.xlsx"`);
    return res.status(200).send(buf);
  } catch (e) {
    console.error("/api/export error:", e);
    return res.status(500).json({ ok: false, error: e?.message || "Export failed" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Web app listening on http://localhost:${PORT}`);
});
