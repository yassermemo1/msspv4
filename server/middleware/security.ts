import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

// Security headers middleware
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Note: Consider removing unsafe-eval for stricter security
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable if causing issues with external resources
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  }
});

// General API rate limiter
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks and static assets
    return req.path === '/health' || req.path.startsWith('/assets/');
  }
});

// Strict rate limiter for authentication endpoints
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // Don't count successful requests
});

// Strict rate limiter for password reset
export const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset requests per hour
  message: {
    error: 'Too many password reset attempts, please try again later.',
    code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// API modification rate limiter (POST, PUT, DELETE)
export const modificationRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 50, // Limit each IP to 50 modification requests per 10 minutes
  message: {
    error: 'Too many modification requests, please try again later.',
    code: 'MODIFICATION_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'GET' || req.method === 'HEAD'
});

// Security headers for API responses
export const apiSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Hide server information
  res.removeHeader('X-Powered-By');
  
  // Prevent caching of sensitive data
  if (req.path.includes('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }
  
  next();
};

// HTTPS redirect middleware for production
export const httpsRedirect = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'production') {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(301, `https://${req.header('host')}${req.url}`);
    }
  }
  next();
};

// Request sanitization middleware
export const requestSanitizer = (req: Request, res: Response, next: NextFunction) => {
  // Remove potentially dangerous characters from URL parameters
  const sanitizeString = (str: string) => {
    return str.replace(/[<>\"'%;&\\]/g, '');
  };

  // Sanitize query parameters
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitizeString(req.query[key] as string);
      }
    });
  }

  // Sanitize URL parameters
  if (req.params) {
    Object.keys(req.params).forEach(key => {
      if (typeof req.params[key] === 'string') {
        req.params[key] = sanitizeString(req.params[key]);
      }
    });
  }

  next();
};

// Security logging middleware
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    };

    // Log suspicious activities
    if (res.statusCode === 401 || res.statusCode === 403) {
      console.warn('Security Event:', JSON.stringify({
        ...logData,
        type: 'UNAUTHORIZED_ACCESS'
      }));
    }

    if (res.statusCode === 429) {
      console.warn('Security Event:', JSON.stringify({
        ...logData,
        type: 'RATE_LIMIT_HIT'
      }));
    }

    // Log slow requests that might indicate attacks
    if (duration > 5000) {
      console.warn('Security Event:', JSON.stringify({
        ...logData,
        type: 'SLOW_REQUEST'
      }));
    }
  });

  next();
};

// Input size limiter to prevent DoS
export const inputSizeLimiter = (req: Request, res: Response, next: NextFunction) => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (req.headers['content-length'] && parseInt(req.headers['content-length']) > maxSize) {
    return res.status(413).json({
      error: 'Request entity too large',
      code: 'PAYLOAD_TOO_LARGE'
    });
  }
  
  next();
};

// IP whitelist middleware (for admin endpoints if needed)
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (process.env.NODE_ENV === 'development') {
      return next(); // Skip in development
    }
    
    if (!allowedIPs.includes(clientIP as string)) {
      console.warn('Security Event:', JSON.stringify({
        type: 'IP_NOT_WHITELISTED',
        ip: clientIP,
        url: req.url,
        timestamp: new Date().toISOString()
      }));
      
      return res.status(403).json({
        error: 'Access denied from this IP address',
        code: 'IP_NOT_ALLOWED'
      });
    }
    
    next();
  };
};

// Export all middleware for easy import
export const securityMiddleware = {
  securityHeaders,
  apiRateLimit,
  authRateLimit,
  passwordResetRateLimit,
  modificationRateLimit,
  apiSecurityHeaders,
  httpsRedirect,
  requestSanitizer,
  securityLogger,
  inputSizeLimiter,
  ipWhitelist
};

export default securityMiddleware; 