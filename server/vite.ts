import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as true,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  
  // Only serve HTML for non-API routes
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl || req.url || '';

    // Skip API routes
    if (typeof url === 'string' && url.startsWith('/api/')) {
      return next();
    }

    try {
      // Ensure __dirname is a valid string
      if (!__dirname || typeof __dirname !== 'string') {
        throw new Error('__dirname is not defined or not a string');
      }
      
      const clientTemplate = path.resolve(__dirname, "..", "client", "index.html");
      
      // Check if the client template exists
      if (!fs.existsSync(clientTemplate)) {
        // Fallback: try to serve a basic HTML page
        const fallbackHtml = `
          <!DOCTYPE html>
          <html>
            <head><title>MSSP Portal</title></head>
            <body>
              <div id="root">Loading MSSP Portal...</div>
              <script>
                // Try to redirect to the API or show an error
                setTimeout(() => {
                  if (!document.querySelector('#root').innerHTML.includes('Loading')) return;
                  document.querySelector('#root').innerHTML = '<h1>MSSP Portal API Server Running</h1><p>Frontend client not found. Server is running on port 3000.</p>';
                }, 2000);
              </script>
            </body>
          </html>`;
        res.status(200).set({ "Content-Type": "text/html" }).end(fallbackHtml);
        return;
      }

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      console.error('Error in Vite middleware:', e);
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "..", "dist", "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
