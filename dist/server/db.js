"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.pool = void 0;
const dotenv_1 = require("dotenv");
const serverless_1 = require("@neondatabase/serverless");
const pg_1 = require("pg");
const neon_serverless_1 = require("drizzle-orm/neon-serverless");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const ws_1 = __importDefault(require("ws"));
const schema = __importStar(require("@shared/schema"));
// Load environment variables
(0, dotenv_1.config)();
serverless_1.neonConfig.webSocketConstructor = ws_1.default;
if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}
// Determine if we're using Neon (serverless) or local PostgreSQL
const isNeon = process.env.DATABASE_URL.includes('neon.tech') || process.env.DATABASE_URL.includes('neon.database');
// SSL configuration - only enable if explicitly set to true
const sslConfig = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false;
let pool;
let db;
if (isNeon) {
    // Use Neon serverless
    exports.pool = pool = new serverless_1.Pool({ connectionString: process.env.DATABASE_URL });
    exports.db = db = (0, neon_serverless_1.drizzle)(pool, { schema });
}
else {
    // Use local PostgreSQL with optional SSL
    const dbConfig = {
        connectionString: process.env.DATABASE_URL,
        ssl: sslConfig
    };
    exports.pool = pool = new pg_1.Pool(dbConfig);
    exports.db = db = (0, node_postgres_1.drizzle)(pool, { schema });
}
// Add query method to db object for backward compatibility
db.query = async (query, params = []) => {
    const result = await pool.query(query, params);
    return result;
};
