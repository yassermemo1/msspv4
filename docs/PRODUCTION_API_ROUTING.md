# Production API Routing Documentation

## Overview

The MSSP Portal production build correctly handles both API routes and static file serving from a single Express server running on port 80.

## How It Works

### 1. Server Configuration (`server/index.ts`)

The server uses different serving strategies based on the environment:

```typescript
// Development mode: Uses Vite middleware
if (config.server.environment === "development") {
  await setupVite(app, server);
} else {
  // Production mode: Serves static files
  serveStatic(app);
}
```

### 2. Route Registration Order

The critical aspect is the order of middleware registration:

1. **API Routes First**: All API routes are registered BEFORE static file serving
   - `/api/plugins/*` - Plugin system routes
   - `/api/service-scopes/*` - Service scope routes  
   - `/api/health` - Health check endpoint
   - `/api/version` - Version endpoint
   - Other API routes...

2. **Static Files Last**: The static file middleware is added after all API routes

### 3. Static File Serving (`server/vite.ts`)

The `serveStatic` function properly handles production routing:

```typescript
export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "..", "dist", "public");
  
  // Serve static files from the build directory
  app.use(express.static(distPath));
  
  // SPA fallback - but skip API routes
  app.use("*", (req, res, next) => {
    const url = req.originalUrl || req.url || '';
    
    // Skip API routes - let them be handled by API handlers
    if (typeof url === 'string' && url.startsWith('/api/')) {
      return next();
    }
    
    // For all other routes, serve the SPA index.html
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
```

### 4. Build Process

```bash
# Build the frontend
npm run build

# This creates:
# - dist/public/index.html
# - dist/public/js/*.js (bundled JavaScript)
# - dist/public/css/*.css (bundled CSS)
```

### 5. Running in Production

```bash
# Start the production server
NODE_ENV=production PORT=80 npm start

# Or use the startup script
./start-with-env.sh
```

## Verified Functionality

✅ **API Routes Working**:
- `/api/health` returns health status
- `/api/plugins` returns plugin information  
- `/api/plugins/*/query` handles plugin queries
- Non-existent API routes return 404

✅ **Static Files Served**:
- `/` serves the React SPA
- `/js/*`, `/css/*` serve bundled assets
- Client-side routing works (React Router)

✅ **Proper Error Handling**:
- API errors return appropriate status codes
- Missing static files fall back to index.html (SPA behavior)

## Key Points

1. **Single Server**: Both API and frontend are served from the same Express server
2. **No Proxy Needed**: Unlike development mode, production doesn't need Vite's proxy
3. **Correct Route Priority**: API routes take precedence over static file serving
4. **SPA Support**: Non-API routes serve index.html for client-side routing

## Troubleshooting

If API routes return 404 in production:

1. **Check Route Order**: Ensure API routes are registered before `serveStatic()`
2. **Verify Build**: Ensure `npm run build` completed successfully
3. **Check Paths**: Verify `dist/public/` directory exists with built files
4. **Environment**: Confirm `NODE_ENV=production` is set

## Performance Optimizations

The production build includes:
- Minified JavaScript and CSS
- Code splitting for optimal loading
- Gzip compression support
- Static asset caching headers
- Efficient chunk loading

This setup ensures both API functionality and frontend performance in production environments. 