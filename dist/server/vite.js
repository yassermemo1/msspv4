"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = log;
exports.setupVite = setupVite;
exports.serveStatic = serveStatic;
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const vite_1 = require("vite");
const vite_config_1 = __importDefault(require("../vite.config"));
const nanoid_1 = require("nanoid");
const url_1 = require("url");
// Ensure proper __dirname for ESM modules
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
const viteLogger = (0, vite_1.createLogger)();
function log(message, source = "express") {
    const formattedTime = new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
    });
    console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app, server) {
    const serverOptions = {
        middlewareMode: true,
        hmr: { server },
        allowedHosts: true,
    };
    const vite = await (0, vite_1.createServer)({
        ...vite_config_1.default,
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
            const clientTemplate = path_1.default.resolve(baseDir, "..", "client", "index.html");
            // Check if the client template exists
            if (!fs_1.default.existsSync(clientTemplate)) {
                // Fallback: try alternative paths
                const altPaths = [
                    path_1.default.resolve(process.cwd(), "client", "index.html"),
                    path_1.default.resolve(process.cwd(), "client", "public", "index.html"),
                    path_1.default.resolve(baseDir, "client", "index.html")
                ];
                let foundTemplate = null;
                for (const altPath of altPaths) {
                    if (fs_1.default.existsSync(altPath)) {
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
                let template = await fs_1.default.promises.readFile(foundTemplate, "utf-8");
                template = template.replace(`src="/src/main.tsx"`, `src="/src/main.tsx?v=${(0, nanoid_1.nanoid)()}"`);
                const page = await vite.transformIndexHtml(url, template);
                res.status(200).set({ "Content-Type": "text/html" }).end(page);
                return;
            }
            // Standard path - template exists
            let template = await fs_1.default.promises.readFile(clientTemplate, "utf-8");
            template = template.replace(`src="/src/main.tsx"`, `src="/src/main.tsx?v=${(0, nanoid_1.nanoid)()}"`);
            const page = await vite.transformIndexHtml(url, template);
            res.status(200).set({ "Content-Type": "text/html" }).end(page);
        }
        catch (e) {
            console.error('Error in Vite middleware:', e);
            vite.ssrFixStacktrace(e);
            next(e);
        }
    });
}
function serveStatic(app) {
    const distPath = path_1.default.resolve(__dirname, "..", "dist", "public");
    if (!fs_1.default.existsSync(distPath)) {
        throw new Error(`Could not find the build directory: ${distPath}, make sure to build the client first`);
    }
    app.use(express_1.default.static(distPath));
    // fall through to index.html if the file doesn't exist
    app.use("*", (_req, res) => {
        res.sendFile(path_1.default.resolve(distPath, "index.html"));
    });
}
