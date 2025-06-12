# 🚀 MSSP Production Deployment Guide

## Quick Start

Your MSSP application has been analyzed and prepared for production deployment. Follow this guide to ensure a secure and reliable production setup.

## ⚡ Immediate Action Required

### 🔴 Critical Issues (Must Fix First)

1. **TypeScript Compilation Errors** - Currently failing with 50+ errors
   ```bash
   npm run typecheck
   ```
   **Fix these errors before proceeding with production deployment.**

2. **Security Vulnerabilities** - 1 critical, 6 high severity
   ```bash
   npm audit fix --force  # Use with caution
   ```

3. **Missing Environment Variables**
   ```bash
   # Generate secure secrets
   openssl rand -hex 32  # For SESSION_SECRET
   openssl rand -hex 32  # For JWT_SECRET
   ```

## 🛠️ Production Setup Steps

### Step 1: Fix Critical Issues

```bash
# 1. Fix TypeScript errors
npm run typecheck
# Address all compilation errors in forms and components

# 2. Install security middleware (already done)
npm install helmet express-rate-limit

# 3. Update server/index.ts to use security middleware
```

**Update server/index.ts:**
```javascript
import { securityMiddleware } from './middleware/security';

// Add security middleware early in the pipeline
app.use(securityMiddleware.httpsRedirect);
app.use(securityMiddleware.securityHeaders);
app.use(securityMiddleware.apiRateLimit);
app.use(securityMiddleware.apiSecurityHeaders);
app.use(securityMiddleware.requestSanitizer);
app.use(securityMiddleware.securityLogger);
app.use(securityMiddleware.inputSizeLimiter);

// Apply auth rate limiting to auth routes
app.use('/api/auth', securityMiddleware.authRateLimit);
```

### Step 2: Environment Configuration

Create `.env.production`:
```bash
NODE_ENV=production
PORT=5001
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://user:password@host:port/database
DB_SSL=true
DB_POOL_MIN=2
DB_POOL_MAX=20

# Security
SESSION_SECRET=your-32-byte-secret-here
JWT_SECRET=your-32-byte-secret-here
SESSION_SECURE=true
TRUST_PROXY=true

# CORS
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com

# Features
ENABLE_AUTO_SYNC=false
```

### Step 3: Database Setup

```bash
# Run migrations in production
NODE_ENV=production npm run db:migrate

# Verify database connection
NODE_ENV=production npm run db:studio
```

### Step 4: Build and Test

```bash
# Run the automated deployment checker
./scripts/production-deployment.sh

# Or run steps manually:
npm run typecheck
npm run lint
npm run test:all
npm run build
npm run test:e2e
```

### Step 5: Production Deployment

```bash
# Build for production
NODE_ENV=production npm run build

# Start production server
NODE_ENV=production npm start

# Or use PM2 for process management
npm install -g pm2
pm2 start ecosystem.config.js --env production
```

## 📋 Pre-Deployment Checklist

### ✅ Security Checklist

- [ ] All TypeScript errors resolved
- [ ] Security headers implemented (Helmet)
- [ ] Rate limiting configured
- [ ] HTTPS enforced in production
- [ ] Environment variables secured
- [ ] Database connections use SSL
- [ ] Session security configured
- [ ] CORS properly configured
- [ ] No console.log in production build
- [ ] Error handling doesn't expose internals

### ✅ Performance Checklist

- [ ] Production build optimized
- [ ] Assets compressed and cached
- [ ] Database indexes created
- [ ] Connection pooling configured
- [ ] Memory usage monitored
- [ ] Load testing completed

### ✅ Monitoring Checklist

- [ ] Health check endpoint working
- [ ] Error logging configured
- [ ] Performance metrics collected
- [ ] Database monitoring setup
- [ ] Uptime monitoring configured

## 🔧 Production Optimizations

### Database Indexes

```sql
-- Critical indexes for performance
CREATE INDEX CONCURRENTLY idx_clients_active ON clients(is_active);
CREATE INDEX CONCURRENTLY idx_contracts_status ON contracts(status);
CREATE INDEX CONCURRENTLY idx_licenses_expiry ON licenses(expiry_date);
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY idx_sessions_expires ON sessions(expires);
```

### Nginx Configuration (if using)

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static assets caching
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### PM2 Ecosystem Configuration

Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'mssp-app',
    script: 'server/index.ts',
    interpreter: 'tsx',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5001,
      instances: 'max',
      exec_mode: 'cluster'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

## 🔍 Testing Your Production Setup

### Health Check Tests

```bash
# Check application health
curl https://yourdomain.com/health

# Check API endpoints
curl -H "Content-Type: application/json" https://yourdomain.com/api/status

# Test authentication
curl -X POST https://yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mssp.com","password":"yourpassword"}'
```

### Load Testing

```bash
# Install k6 for load testing
brew install k6  # On macOS

# Run load tests
k6 run tests/load/load-test.js
```

### E2E Testing

```bash
# Run production E2E tests
npm run test:e2e -- --grep "production"

# Or run the comprehensive production tests
npx playwright test tests/e2e/production-readiness.spec.ts
```

## 📊 Monitoring & Maintenance

### Application Monitoring

1. **Health Checks**: Monitor `/health` endpoint
2. **Performance**: Track response times and throughput
3. **Errors**: Monitor error rates and types
4. **Database**: Track query performance and connections
5. **Security**: Monitor failed login attempts and suspicious activity

### Recommended Monitoring Tools

- **Application**: New Relic, DataDog, or AppSignal
- **Infrastructure**: Prometheus + Grafana
- **Uptime**: Pingdom, UptimeRobot, or StatusCake
- **Logs**: ELK Stack or Splunk

### Backup Strategy

```bash
# Database backups
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql

# Application backups
tar -czf app-backup-$(date +%Y%m%d).tar.gz \
  --exclude=node_modules \
  --exclude=dist \
  --exclude=.git \
  .
```

## 🚨 Troubleshooting

### Common Issues

1. **Application won't start**
   - Check environment variables
   - Verify database connectivity
   - Check port availability

2. **High memory usage**
   - Monitor database connection pools
   - Check for memory leaks in logs
   - Review session storage

3. **Slow response times**
   - Check database query performance
   - Review API rate limiting
   - Monitor database indexes

4. **Authentication issues**
   - Verify JWT/session secrets
   - Check CORS configuration
   - Review session security settings

### Debug Commands

```bash
# Check application logs
pm2 logs mssp-app

# Monitor real-time metrics
pm2 monit

# Check database connections
psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity;"

# Test API responses
curl -v https://yourdomain.com/api/health
```

## 🎯 Post-Deployment Steps

### Week 1: Monitoring & Stabilization
1. Monitor error rates and performance
2. Review security logs for suspicious activity
3. Validate backup procedures
4. Fine-tune performance based on real traffic

### Week 2: Optimization
1. Analyze user behavior and performance data
2. Optimize database queries based on actual usage
3. Implement additional monitoring based on learnings
4. Plan capacity scaling if needed

### Ongoing Maintenance
1. Regular security updates
2. Database maintenance and optimization
3. Performance monitoring and tuning
4. Feature updates and improvements

## 📞 Support & Resources

### Documentation
- [Production Readiness Report](./PRODUCTION_READINESS_REPORT.md)
- [Security Middleware](./server/middleware/security.ts)
- [E2E Tests](./tests/e2e/production-readiness.spec.ts)

### Quick Commands
```bash
# Check deployment readiness
./scripts/production-deployment.sh

# Start production server
NODE_ENV=production npm start

# View application status
pm2 status

# Monitor logs
pm2 logs --lines 100
```

---

**🎉 Your MSSP application is ready for production once the critical TypeScript errors are resolved!**

Remember: The deployment script will guide you through all checks and provide a detailed report of what needs to be fixed before production deployment. 