import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";
import { fileURLToPath } from "url";

// Ensure proper __dirname for ESM modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      // Ensure we have a valid base directory
      const baseDir = __dirname && typeof __dirname === 'string' ? __dirname : process.cwd();
      const clientTemplate = path.resolve(baseDir, "..", "client", "index.html");
      
      // Check if the client template exists
      if (!fs.existsSync(clientTemplate)) {
        // Fallback: try alternative paths
        const altPaths = [
          path.resolve(process.cwd(), "client", "index.html"),
          path.resolve(process.cwd(), "client", "public", "index.html"),
          path.resolve(baseDir, "client", "index.html")
        ];
        
        let foundTemplate = null;
        for (const altPath of altPaths) {
          if (fs.existsSync(altPath)) {
            foundTemplate = altPath;
            break;
          }
        }
        
        if (!foundTemplate) {
          // Serve a basic HTML page if no template found
          const fallbackHtml = `
            <!DOCTYPE html>
            <html>
              <head>
                <title>MSSP Portal</title>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body>
                <div id="root">
                  <h1>MSSP Portal API Server</h1>
                  <p>The server is running successfully on port 3001.</p>
                  <p>Frontend client templates not found in expected locations.</p>
                  <p>Check the build process or ensure the client directory exists.</p>
                </div>
              </body>
            </html>`;
          res.status(200).set({ "Content-Type": "text/html" }).end(fallbackHtml);
          return;
        }
        
        // Use the found template
        let template = await fs.promises.readFile(foundTemplate, "utf-8");
        template = template.replace(
          `src="/src/main.tsx"`,
          `src="/src/main.tsx?v=${nanoid()}"`,
        );
        const page = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(page);
        return;
      }

      // Standard path - template exists
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
