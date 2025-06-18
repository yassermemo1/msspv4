"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vite_1 = require("vite");
const plugin_react_1 = __importDefault(require("@vitejs/plugin-react"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
// Ensure we have a proper __dirname for ESM modules
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
exports.default = (0, vite_1.defineConfig)({
    plugins: [
        (0, plugin_react_1.default)(),
    ],
    resolve: {
        alias: {
            "@": path_1.default.resolve(__dirname, "client", "src"),
            "@shared": path_1.default.resolve(__dirname, "shared"),
            "@assets": path_1.default.resolve(__dirname, "attached_assets"),
        },
    },
    root: path_1.default.resolve(__dirname, "client"),
    build: {
        outDir: path_1.default.resolve(__dirname, "dist/public"),
        emptyOutDir: true,
        sourcemap: process.env.NODE_ENV !== 'production',
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: process.env.NODE_ENV === 'production',
                drop_debugger: true,
            },
        },
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom'],
                    ui: [
                        '@radix-ui/react-dialog',
                        '@radix-ui/react-dropdown-menu',
                        '@radix-ui/react-select',
                        '@radix-ui/react-tabs'
                    ],
                    forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
                    utils: ['date-fns', 'clsx', 'class-variance-authority'],
                    charts: ['recharts'],
                    icons: ['lucide-react']
                },
                chunkFileNames: (chunkInfo) => {
                    const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
                    return `js/[name]-[hash].js`;
                },
                entryFileNames: 'js/[name]-[hash].js',
                assetFileNames: (assetInfo) => {
                    const info = assetInfo.name?.split('.') || [];
                    const ext = info[info.length - 1];
                    if (/\.(png|jpe?g|gif|svg|webp|ico|avif)$/i.test(assetInfo.name || '')) {
                        return `images/[name]-[hash][extname]`;
                    }
                    if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name || '')) {
                        return `fonts/[name]-[hash][extname]`;
                    }
                    if (ext === 'css') {
                        return `css/[name]-[hash][extname]`;
                    }
                    return `assets/[name]-[hash][extname]`;
                }
            }
        },
        chunkSizeWarningLimit: 1000,
        assetsInlineLimit: 4096, // Inline assets smaller than 4kb
    },
    server: {
        proxy: {
            "/api": {
                target: "http://localhost:5001",
                changeOrigin: true,
                secure: false,
            },
        },
    },
    preview: {
        port: 3000,
        strictPort: true,
    },
    // Optimize dependencies for better loading
    optimizeDeps: {
        include: [
            'react',
            'react-dom',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            'react-hook-form',
            'zod',
            'lucide-react'
        ],
    },
});
