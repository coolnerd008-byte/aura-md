import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import axios from "axios";
import cors from "cors";
import crypto from "crypto";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API routes FIRST
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);
    next();
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Endpoint to save content to a file (Pricing, Privacy Policy)
  app.post("/api/save-content", (req, res) => {
    const { pricing, privacyPolicy } = req.body;
    const contentPath = path.join(process.cwd(), 'content.json');
    
    try {
      fs.writeFileSync(contentPath, JSON.stringify({ pricing, privacyPolicy }, null, 2));
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error saving content:", error);
      res.status(500).json({ error: "Failed to save content" });
    }
  });

  // Endpoint to load content from a file
  app.get("/api/load-content", (req, res) => {
    const contentPath = path.join(process.cwd(), 'content.json');
    const legacyPath = path.join(process.cwd(), 'src', 'constants', 'content.json');
    
    try {
      if (fs.existsSync(contentPath)) {
        const content = fs.readFileSync(contentPath, 'utf-8');
        res.json(JSON.parse(content));
      } else if (fs.existsSync(legacyPath)) {
        const content = fs.readFileSync(legacyPath, 'utf-8');
        res.json(JSON.parse(content));
      } else {
        res.json({ pricing: "", privacyPolicy: "" });
      }
    } catch (error: any) {
      console.error("Error loading content:", error);
      res.status(500).json({ error: "Failed to load content" });
    }
  });

  // Endpoint to provide runtime configuration to the client
  app.get("/api/config", (req, res) => {
    res.json({
      GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
      API_KEY: process.env.API_KEY || "",
      IS_DEV: process.env.NODE_ENV !== 'production'
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { index: false })); // Disable automatic index.html serving
    
    app.use((req, res) => {
      // Read the index.html file
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        let html = fs.readFileSync(indexPath, 'utf-8');
        
        // Inject environment variables into window.process.env at runtime
        const envScript = `<script>
      window.process = window.process || { env: {} };
      window.process.env = window.process.env || {};
      window.process.env.GEMINI_API_KEY = ${JSON.stringify(process.env.GEMINI_API_KEY || "")};
      window.process.env.API_KEY = ${JSON.stringify(process.env.API_KEY || "")};
      window.process.env.IS_DEV = ${JSON.stringify(process.env.NODE_ENV !== 'production')};
    </script>`;
        
        // Replace the placeholder block if present, otherwise inject into head
        const placeholderRegex = /<!-- ENV_VARIABLES_START -->[\s\S]*<!-- ENV_VARIABLES_END -->/;
        if (placeholderRegex.test(html)) {
          html = html.replace(placeholderRegex, envScript);
        } else {
          html = html.replace('</head>', `${envScript}</head>`);
        }
        
        res.send(html);
      } else {
        res.status(404).send('Not found. Did you run npm run build?');
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
