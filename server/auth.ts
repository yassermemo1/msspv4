import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { createLdapStrategy } from "./auth/ldap.strategy";
import bcrypt from "bcryptjs";

declare global {
  namespace Express {
    interface User extends Omit<SelectUser, 'password'> {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  try {
    // Check if it's a bcrypt hash (starts with $2)
    if (stored.startsWith('$2')) {
      console.log("Using bcrypt comparison for hash:", stored.substring(0, 10) + "...");
      return await bcrypt.compare(supplied, stored);
    }
    
    // Check if stored password has the expected scrypt format (hex.hex)
    if (!stored.includes('.') || stored.split('.').length !== 2) {
      console.log("Password format error: Expected 'hash.salt' format, got:", stored.substring(0, 20) + "...");
      return false;
    }
    
    console.log("Using scrypt comparison");
    const [hashed, salt] = stored.split(".");
    
    // Validate hex format
    if (!/^[0-9a-f]+$/i.test(hashed) || !/^[0-9a-f]+$/i.test(salt)) {
      console.log("Password format error: Invalid hex format");
      return false;
    }
    
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    
    // Ensure buffers are the same length before comparison
    if (hashedBuf.length !== suppliedBuf.length) {
      console.log(`Password buffer length mismatch: stored=${hashedBuf.length}, supplied=${suppliedBuf.length}`);
      return false;
    }
    
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error("Password comparison error:", error);
    return false;
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  
  // Determine if we should use secure cookies based on environment and actual usage
  const isSecure = process.env.NODE_ENV === 'production' && process.env.HTTPS_ENABLED === 'true';
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "fallback-secret-key-for-development",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    rolling: true, // Extend session on each request
    cookie: {
      secure: isSecure, // Only require HTTPS if explicitly enabled
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: isSecure ? 'strict' : 'lax', // Use 'lax' for HTTP
      path: '/',
      domain: undefined, // Let browser set domain automatically
    },
    name: 'session'
  };

  console.log("=== SESSION CONFIGURATION ===");
  console.log("Secure cookies:", isSecure);
  console.log("SameSite policy:", sessionSettings.cookie?.sameSite);
  console.log("Environment:", process.env.NODE_ENV);
  console.log("==============================");

  app.use(session(sessionSettings));
  

  
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
      console.log("=== LOGIN ATTEMPT ===");
      console.log("Email:", email);
      console.log("Password received:", password ? "Yes" : "No");
      
      const user = await storage.getUserByEmail(email);
      console.log("User found:", !!user);
      
      if (!user) {
        console.log("User not found in database");
        return done(null, false);
      }
      
      const passwordMatch = await comparePasswords(password, user.password);
      console.log("Password match:", passwordMatch);
      console.log("===================");
      
      if (!passwordMatch) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    }),
  );

  // Register LDAP strategy if enabled
  console.log("=== REGISTERING LDAP STRATEGY ===");
  
  // Check both environment variables and database settings for LDAP configuration
  try {
    const ldapStrategy = await createLdapStrategy();
    if (ldapStrategy) {
      passport.use('ldap', ldapStrategy);
      console.log("LDAP strategy registered successfully");
    } else {
      console.log("LDAP strategy not created - configuration not available or disabled");
    }
  } catch (error) {
    console.error("Failed to register LDAP strategy:", error);
    console.log("LDAP authentication will not be available");
  }
  console.log("=================================");

  passport.serializeUser((user, done) => {
    console.log("Serializing user:", user.id);
    // Store user ID as string to maintain consistency
    done(null, user.id.toString());
  });
  
  passport.deserializeUser(async (id: string, done) => {
    try {
      console.log("Deserializing user ID:", id, "Type:", typeof id);
      
      const user = await storage.getUserById(id);
      if (!user) {
        console.log("User not found during deserialization:", id);
        return done(null, false);
      }
      // Remove password from user object for security
      const { password, ...userWithoutPassword } = user;
      console.log("User deserialized successfully:", userWithoutPassword.email);
      done(null, userWithoutPassword);
    } catch (error) {
      console.error("Error during user deserialization:", error);
      // If there's a UUID vs integer mismatch, clear the session
      if (error instanceof Error && error.message.includes('invalid input syntax for type uuid')) {
        console.log("UUID/integer mismatch detected, clearing invalid session");
        return done(null, false);
      }
      done(error, null);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    const existingUser = await storage.getUserByEmail(req.body.email);
    if (existingUser) {
      return res.status(400).send("Email already exists");
    }

    const user = await storage.createUser({
      ...req.body,
      password: await hashPassword(req.body.password),
    });

    req.login(user, (err) => {
      if (err) return next(err);
      req.session.save((saveErr) => {
        if (saveErr) return next(saveErr);
        res.status(201).json(user);
      });
    });
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    console.log("=== LOGIN SUCCESS ===");
    console.log("User logged in:", req.user?.email);
    console.log("Session ID:", req.sessionID);
    console.log("Session before save:", req.session);
    
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.status(500).json({ error: "Session save failed" });
      }
      
      console.log("Session saved successfully");
      console.log("Session after save:", req.session);
      console.log("Is authenticated after save:", req.isAuthenticated());
      console.log("===================");
      
      res.status(200).json(req.user);
    });
  });

  // LDAP login endpoint
  app.post("/api/auth/ldap/login", (req, res, next) => {
    // Check if LDAP strategy is registered
    if (!passport._strategies.ldap) {
      return res.status(400).json({ 
        error: "LDAP authentication is not available",
        message: "LDAP authentication is not configured or enabled. Please contact your administrator."
      });
    }

    console.log("=== LDAP LOGIN ATTEMPT ===");
    console.log("Username:", req.body.username);
    console.log("Password received:", req.body.password ? "Yes" : "No");
    
    passport.authenticate("ldap", (err, user, info) => {
      if (err) {
        console.error("LDAP authentication error:", err);
        return res.status(500).json({ 
          error: "LDAP authentication failed",
          message: err.message || "Internal server error"
        });
      }
      
      if (!user) {
        console.log("LDAP authentication failed:", info);
        return res.status(401).json({ 
          error: "Invalid LDAP credentials",
          message: "Username or password is incorrect"
        });
      }
      
      // Log the user in using Passport's req.login
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("Session login error:", loginErr);
          return res.status(500).json({ 
            error: "Session creation failed",
            message: "Failed to create user session"
          });
        }
        
        console.log("=== LDAP LOGIN SUCCESS ===");
        console.log("LDAP user logged in:", user.email);
        console.log("Session ID:", req.sessionID);
        console.log("Auth provider:", user.authProvider);
        
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Session save error:", saveErr);
            return res.status(500).json({ error: "Session save failed" });
          }
          
          console.log("LDAP session saved successfully");
          console.log("Is authenticated after save:", req.isAuthenticated());
          console.log("=========================");
          
          res.status(200).json(user);
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy((sessionErr) => {
        if (sessionErr) {
          console.error("Session destroy error:", sessionErr);
          return res.status(500).json({ error: "Failed to destroy session" });
        }
        res.clearCookie('connect.sid');
        res.clearCookie('session');
        res.status(200).json({ message: "Logged out successfully" });
      });
    });
  });

  // Test endpoint to debug cookie handling
  app.get("/api/test-cookie", (req, res) => {
    console.log("=== COOKIE TEST ===");
    console.log("Cookies received:", req.headers.cookie);
    console.log("Session ID:", req.sessionID);
    console.log("Session exists:", !!req.session);
    console.log("===================");
    
    res.cookie('test', 'value', { httpOnly: true, path: '/' });
    res.json({ 
      message: 'Cookie test', 
      sessionId: req.sessionID,
      cookiesReceived: req.headers.cookie || 'none'
    });
  });

  app.get("/api/user", (req, res) => {
    console.log("=== USER REQUEST DEBUG ===");
    console.log("Session ID:", req.sessionID);
    console.log("Session data:", req.session);
    console.log("Is authenticated:", req.isAuthenticated());
    console.log("User from request:", req.user);
    console.log("Cookies received:", req.headers.cookie);
    console.log("All headers:", req.headers);
    console.log("========================");
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ 
        error: "Authentication required",
        sessionId: req.sessionID,
        cookies: req.headers.cookie || 'none',
        sessionExists: !!req.session
      });
    }
    res.json(req.user);
  });

  // Debug endpoint to clear sessions (useful for UUID -> integer ID transition)
  app.post("/api/debug/clear-session", (req, res) => {
    console.log("=== CLEARING SESSION ===");
    console.log("Session ID:", req.sessionID);
    console.log("Current session:", req.session);
    
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
        return res.status(500).json({ error: "Failed to clear session" });
      }
      
      // Clear the session cookie
      res.clearCookie('connect.sid');
      console.log("Session cleared successfully");
      console.log("======================");
      
      res.json({ 
        message: "Session cleared successfully",
        note: "Please refresh the page to start a new session"
      });
    });
  });
}
