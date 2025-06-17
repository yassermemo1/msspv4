# Admin Testing Reference

## 🔑 Admin Credentials (from .env)

- **Email:** `admin@mssp.local`
- **Password:** `admin123`
- **Alternative Email:** `admin@test.mssp.local`
- **Alternative Password:** `admin123`

## 🧪 Quick Testing Commands

### Login and Get Session Cookie
```bash
curl -c cookies.txt -X POST http://localhost:80/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mssp.local","password":"admin123"}'
```

### Test Authenticated Endpoints
```bash
# Widget Manager
curl -b cookies.txt http://localhost:80/api/widgets/manage

# Current User Info
curl -b cookies.txt http://localhost:80/api/user

# Clients List
curl -b cookies.txt http://localhost:80/api/clients

# Health Check
curl -b cookies.txt http://localhost:80/api/health

# Plugins List
curl -b cookies.txt http://localhost:80/api/plugins

# Users Management
curl -b cookies.txt http://localhost:80/api/users
```

## 🚀 Automated Testing

### Run Complete Test Suite
```bash
./test-api-with-admin.sh
```

### Reset Admin Password (if needed)
```bash
npx tsx reset-admin-password.js
```

## 📋 Environment Variables

```env
# Admin Testing Credentials
ADMIN_EMAIL=admin@mssp.local
ADMIN_PASSWORD=admin123
TEST_ADMIN_EMAIL=admin@test.mssp.local
TEST_ADMIN_PASSWORD=admin123
```

## 🎯 Key Features

- ✅ Consistent admin credentials across all testing
- ✅ Session-based authentication
- ✅ Ready-to-use curl commands
- ✅ Automated test suite
- ✅ Password reset utility

## 📁 Testing Files

- `test-api-with-admin.sh` - Comprehensive API testing script
- `reset-admin-password.js` - Password reset utility
- `test-admin-login.js` - Simple login test
- `ADMIN_TESTING_REFERENCE.md` - This reference guide 