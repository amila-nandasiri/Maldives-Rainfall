import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API Route to proxy weather data
  app.get("/api/weather", async (req, res) => {
    console.log(`[Server] Weather request received: ${req.url}`);
    const { latitude, longitude, past_days, forecast_days } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ error: "Latitude and longitude are required" });
    }

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=precipitation_sum&timezone=auto&past_days=${past_days || 7}&forecast_days=${forecast_days || 7}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        console.error(`[Server] External API error: ${response.status} - ${errorText}`);
        return res.status(response.status).json({ error: `Weather API error: ${response.status}`, details: errorText });
      }
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("[Server] Proxy error:", error);
      res.status(500).json({ error: "Failed to fetch weather data from source", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // Catch-all for other /api routes to prevent them from hitting the SPA fallback
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.url}` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
