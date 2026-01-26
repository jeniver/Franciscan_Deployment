# Franciscan Application - Complete Project Documentation

**Version:** 3.0.0  
**Last Updated:** 2026-01-25  
**Status:** ✅ Production Ready with Performance Optimizations

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Performance Optimizations](#4-performance-optimizations)
5. [API Documentation](#5-api-documentation)
6. [Database Configuration](#6-database-configuration)
7. [Frontend Architecture](#7-frontend-architecture)
8. [Error Handling](#8-error-handling)
9. [Caching Strategy](#9-caching-strategy)
10. [Security](#10-security)
11. [Setup & Deployment](#11-setup--deployment)
12. [Monitoring & Maintenance](#12-monitoring--maintenance)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Project Overview

### Purpose
The Franciscan Application is a comprehensive management system for niche applications, bookings, inscriptions, wake rooms, and related services. It provides a complete workflow from application creation to invoice generation and receipt management.

### Key Features
- **Niche Management:** Applications, bookings, agreements, and inventory
- **Inscription Management:** Engrave applications with deceased details
- **Invoice & Receipt:** PDF generation, invoice tracking, receipt management
- **Wake Room Booking:** Booking management system
- **Gate of Life:** Application management
- **Authentication:** JWT-based authentication with role-based access control
- **Email Notifications:** Automated email sending for confirmations and invoices
- **PDF Generation:** Agreement and invoice PDFs using Puppeteer
- **Reporting:** Monthly reports for various entities
- **Bible Inscription Choices:** Management of inscription options

### Project Structure
```
Franciscan_Deployment/
├── Fransiscan-Nodejs-BE/          # Backend API (Node.js + Express)
│   ├── src/
│   │   ├── app.js                  # Main application entry
│   │   ├── config/                 # Database and configuration
│   │   ├── controllers/           # Request handlers
│   │   ├── services/              # Business logic
│   │   ├── repositories/          # Data access layer
│   │   ├── models/                 # Data models
│   │   ├── routes/                 # API routes
│   │   ├── middleware/             # Custom middleware
│   │   └── utils/                  # Utilities
│   └── package.json
├── francisicon-react-front-end/    # Frontend (React + TypeScript)
│   ├── src/
│   │   ├── App.tsx                 # Main application
│   │   ├── components/            # React components
│   │   ├── pages/                  # Page components
│   │   ├── services/              # API services
│   │   ├── store/                  # Redux store
│   │   ├── hooks/                  # Custom hooks
│   │   └── utils/                  # Utilities
│   └── package.json
└── PROJECT_DOCUMENTATION.md        # This file
```

---

## 2. Architecture

### Backend Architecture (3-Layer Pattern)
1. **Controller Layer** (`src/controllers/`)
   - Handles HTTP requests/responses
   - Validates input
   - Calls service layer
   - Returns formatted responses

2. **Service Layer** (`src/services/`)
   - Business logic
   - Data transformation
   - Caching logic
   - Error handling

3. **Repository Layer** (`src/repositories/`)
   - Database queries
   - Data access
   - Query optimization
   - Connection management

### Frontend Architecture
- **Component-Based:** React functional components with hooks
- **State Management:** Redux Toolkit for global state
- **API Layer:** Axios-based service layer
- **Routing:** React Router for navigation
- **Styling:** Tailwind CSS for UI

### Data Flow
```
Frontend (React) 
  → API Service (Axios)
    → Backend API (Express)
      → Controller
        → Service (Business Logic)
          → Repository (Database)
```

---

## 3. Technology Stack

### Backend
- **Runtime:** Node.js >=18.0.0
- **Framework:** Express.js ^4.18.2
- **Database:** Microsoft SQL Server (via mssql ^10.0.1)
- **Authentication:** JWT (jsonwebtoken ^9.0.2)
- **Security:** Helmet, CORS, express-rate-limit
- **Caching:** node-cache ^5.1.2
- **PDF Generation:** Puppeteer ^24.26.0
- **Email:** Nodemailer ^6.10.1
- **Logging:** Winston ^3.11.0
- **Validation:** Joi ^17.11.0

### Frontend
- **Framework:** React 18.3.1 with TypeScript
- **Build Tool:** Vite 5.2.0
- **State Management:** Redux Toolkit 2.9.1
- **Routing:** React Router DOM 6.26.2
- **HTTP Client:** Axios 1.4.0
- **Styling:** Tailwind CSS 3.4.17
- **PDF Generation:** html2pdf.js, jsPDF
- **Icons:** Lucide React

### Database
- **Primary:** Microsoft SQL Server
- **Drivers:** 
  - `mssql` (tedious) for SQL Server Authentication
  - `msnodesqlv8` for Windows Authentication

---

## 4. Performance Optimizations

### Backend Optimizations

#### 4.1 Response Caching
- **Middleware:** `src/middleware/responseCache.js`
- **TTL:** 300 seconds (5 minutes) default
- **Scope:** GET requests only
- **Bypass:** Set `X-Bypass-Cache: true` header or `?bypassCache=true` query param
- **Status:** ✅ Implemented

#### 4.2 Database Query Caching
- **Library:** node-cache
- **TTL:** 300 seconds (configurable via `CACHE_TTL_SECONDS`)
- **Key Strategy:** MD5 hash for shorter keys
- **Max Keys:** 1000 (prevents memory issues)
- **Hit Rate Target:** 60-80%
- **Status:** ✅ Implemented

#### 4.3 Query Optimizations
- **Parallel Queries:** `Promise.allSettled` for independent queries
- **Query Timeouts:** 60 seconds default (configurable)
- **Index Hints:** Optional index hints for better query plans
- **NOLOCK Hints:** Reduces lock contention
- **Wildcard Limiting:** Auto-adds 12-month filter for wildcard searches
- **Status:** ✅ Implemented

#### 4.4 Database Connection Pooling
- **Max Connections:** 20 (configurable)
- **Min Connections:** 2 (configurable)
- **Connection Timeout:** 60 seconds
- **Request Timeout:** 60 seconds
- **Idle Timeout:** 30 seconds
- **Retry Logic:** Exponential backoff (max 5 attempts)
- **Status:** ✅ Implemented

#### 4.5 Response Compression
- **Middleware:** compression
- **Algorithm:** gzip
- **Status:** ✅ Implemented

### Frontend Optimizations

#### 4.6 API Response Caching
- **Utility:** `src/utils/apiCache.ts`
- **TTL:** 5 minutes default
- **Automatic Cleanup:** Expired entries cleaned every minute
- **Status:** ✅ Implemented

#### 4.7 Request Debouncing/Throttling
- **Utility:** `src/utils/debounce.ts`
- **Use Cases:** Search inputs, API calls
- **Status:** ✅ Implemented

#### 4.8 React Optimizations
- **Memoization:** useMemo, useCallback, React.memo
- **Code Splitting:** Lazy loading for routes
- **Status:** ✅ Implemented (303 instances found)

### Performance Metrics
- **API Response Time (Cached):** < 0.01 seconds
- **API Response Time (First Request):** 0.1-0.5 seconds
- **Database Query Time:** 0.1-2 seconds (with indexes)
- **Cache Hit Rate:** 60-80% (target)

---

## 5. API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication
- `POST /api/auth/login` - User login (returns JWT token)
- `POST /api/auth/register` - User registration (if enabled)

### Niche Applications
- `GET /api/niche-applications` - Search applications (paginated)
  - Query params: `page`, `pageSize`, `churchId`, `applicationCode`, `applicantName`, `nomineeName`, `searchTerm`, `fromDate`, `toDate`, `status`, `skipTotal`, `lightweight`, `includeBeneficiaries`
  - **Performance Tips:**
    - Use `lightweight=true` for list views (50-70% less data)
    - Omit `includeBeneficiaries` (default: false) for faster responses
    - Provide date filters or application code for best performance
- `POST /api/niche-applications` - Create new application
- `GET /api/niche-applications/:code` - Get application by code (cached, < 0.5s)
- `PUT /api/niche-applications/:code` - Update application
- `DELETE /api/niche-applications/:code` - Delete application
- `POST /api/niche-applications/:code/send-invoice` - Send invoice email

### Niche Bookings
- `GET /api/niche-bookings` - List bookings
- `POST /api/niche-bookings` - Create booking
- `GET /api/niche-bookings/:code` - Get booking by application code
- `PUT /api/niche-bookings/:code` - Update booking

### Inscriptions (INCR)
- `GET /api/inscriptions/:code/items` - Get inscription items
- `POST /api/inscriptions` - Create inscription
- `PUT /api/inscriptions/:code` - Update inscription
- `POST /api/inscriptions/:code/invoice` - Create invoice for inscription

### Niche Agreements
- `GET /api/niche-agreements/:applicationNumber` - Get agreement details
- `GET /api/niche-agreements/:applicationNumber/pdf` - Get PDF data
- `GET /api/niche-agreements/:applicationNumber/invoice-pdf` - Get invoice PDF data
- `GET /api/niche-agreements/:applicationNumber/reports` - Get Crystal Reports info

### Invoices
- `GET /api/invoices` - List invoices
- `POST /api/invoices` - Create invoice
- `GET /api/invoices/:id` - Get invoice by ID

### Receipts
- `GET /api/receipts` - List receipts
- `POST /api/receipts` - Create receipt
- `GET /api/receipts/:id` - Get receipt by ID

### Wake Rooms
- `GET /api/wake-rooms` - List wake rooms
- `GET /api/wake-room-bookings` - List bookings
- `POST /api/wake-room-bookings` - Create booking

### Reports
- `GET /api/reports/monthly-receipts` - Monthly receipts report
- `GET /api/reports/monthly-gst` - Monthly GST report
- `GET /api/reports/monthly-goa` - Monthly GOA report
- `GET /api/reports/monthly-inscriptions` - Monthly inscriptions report
- `GET /api/reports/monthly-wake-rooms` - Monthly wake rooms report

### Bible Choices
- `GET /api/bible-choices` - List bible inscription choices
- `POST /api/bible-choices` - Create choice
- `PUT /api/bible-choices/:id` - Update choice

### Utilities
- `GET /api/utils/cache-stats` - Get cache statistics
- `GET /health` - Health check endpoint

---

## 6. Database Configuration

### Connection String
```env
DB_SERVER=localhost
DB_INSTANCE=SQLEXPRESS          # Optional, for named instances
DB_DATABASE=FransiscanLive
DB_PORT=1433
DB_USER=your_username           # Optional for Windows Auth
DB_PASSWORD=your_password       # Empty for Windows Auth
```

### Authentication Methods
1. **Windows Authentication** (default if `DB_PASSWORD` is empty)
   - Uses `msnodesqlv8` driver
   - No credentials required
   - Trusted connection

2. **SQL Server Authentication**
   - Uses `tedious` driver
   - Requires `DB_USER` and `DB_PASSWORD`

### Connection Pool Settings
```env
DB_POOL_MAX=20                  # Maximum connections
DB_POOL_MIN=2                   # Minimum connections
DB_CONNECTION_TIMEOUT=60000     # Connection timeout (ms)
DB_REQUEST_TIMEOUT=60000        # Request timeout (ms)
DB_CANCEL_TIMEOUT=180000       # Cancel timeout (ms)
DB_POOL_IDLE_TIMEOUT=30000     # Idle timeout (ms)
```

### Database Indexes
Critical indexes for performance (defined in `DATABASE_OPTIMIZATION.sql`):
- `IX_NicheApplication_ChurchId_Status_AgreementDate` - Main query index
- `IX_NicheApplication_Code` - Code lookup index
- `IX_NicheApplicationBeneficiary_NicheApplicationId` - Beneficiary join index

**To Apply:**
```bash
sqlcmd -S localhost -d FransiscanLive -i DATABASE_OPTIMIZATION.sql
```

### Connection Resilience
- **Retry Logic:** Exponential backoff (max 5 attempts)
- **Pool Validation:** Automatic connection health checks
- **Error Recovery:** Automatic pool recreation on failures
- **Health Check:** `GET /health` endpoint

---

## 7. Frontend Architecture

### State Management (Redux Toolkit)
- **Store:** Centralized state management
- **Slices:** Feature-based state slices
  - `authSlice` - Authentication state
  - `applicationSlice` - Niche applications
  - `inscriptionSlice` - Inscriptions
  - `receiptSlice` - Receipts
  - `reportSlice` - Reports
  - `wakeRoomSlice` - Wake rooms

### Custom Hooks
- `useApplication` - Niche application operations
- `useInscription` - Inscription operations
- `useReceipt` - Receipt operations
- `useReport` - Report operations
- `useWakeRoom` - Wake room operations
- `useAuth` - Authentication operations

### API Services
- `api.ts` - Axios instance with interceptors
- `nicheApplicationService.ts` - Niche application API
- `inscriptionService.ts` - Inscription API
- `receiptService.ts` - Receipt API
- `reportService.ts` - Report API
- `wakeRoomService.ts` - Wake room API

### Component Structure
- **Pages:** Full-page components (`src/pages/`)
- **Components:** Reusable UI components (`src/components/`)
- **Common:** Shared components (`src/components/common/`)

---

## 8. Error Handling

### Backend Error Handling

#### Error Handler Middleware
- **File:** `src/middleware/errorHandler.js`
- **Features:**
  - Comprehensive error classification
  - SQL Server error detection
  - JWT error handling
  - Validation error handling
  - Connection error handling
  - Proper HTTP status codes
  - Development vs production error details

#### Error Codes
- `DATABASE_UNAVAILABLE` (503) - Database connection failed
- `DATABASE_TIMEOUT` (504) - Database query timeout
- `INVALID_TOKEN` (401) - Invalid JWT token
- `TOKEN_EXPIRED` (401) - Expired JWT token
- `VALIDATION_ERROR` (400) - Validation failed
- `NOT_FOUND` (404) - Resource not found
- `ACCESS_DENIED` (403) - Access denied
- `RATE_LIMIT_EXCEEDED` (429) - Too many requests

### Frontend Error Handling

#### API Error Interceptor
- **File:** `src/services/api.ts`
- **Features:**
  - Automatic token refresh on 401
  - Error logging
  - Request/response duration tracking
  - Network error detection

#### Error Types
- **Network Errors:** Connection failures, timeouts
- **Server Errors:** 5xx responses
- **Client Errors:** 4xx responses
- **Validation Errors:** Form validation failures

---

## 9. Caching Strategy

### Backend Caching

#### Response Cache
- **Middleware:** `src/middleware/responseCache.js`
- **TTL:** 300 seconds (configurable)
- **Scope:** GET requests only
- **Bypass:** Header or query param

#### Query Cache
- **Library:** node-cache
- **TTL:** 300 seconds (configurable)
- **Key Strategy:** MD5 hash
- **Max Keys:** 1000
- **Statistics:** Available via `/api/utils/cache-stats`

### Frontend Caching

#### API Cache
- **Utility:** `src/utils/apiCache.ts`
- **TTL:** 5 minutes default
- **Automatic Cleanup:** Every minute
- **Statistics:** Available via `getStats()`

### Cache Invalidation
- **Manual:** Clear by pattern or key
- **Automatic:** TTL expiration
- **On Updates:** Clear related cache entries

---

## 10. Security

### Authentication
- **Method:** JWT (JSON Web Tokens)
- **Token Expiry:** Configurable
- **Refresh:** Automatic token refresh on 401
- **Storage:** Secure token storage

### Security Headers
- **Helmet:** Security headers middleware
- **CORS:** Configurable CORS policy
- **Rate Limiting:** 100 requests per 15 minutes per IP

### Input Validation
- **Backend:** Joi validation schemas
- **Frontend:** Form validation hooks
- **SQL Injection:** Parameterized queries

### Environment Variables
- **JWT_SECRET:** Strong secret required
- **DB_PASSWORD:** Secure database password
- **Never commit:** `.env` files to Git

---

## 11. Setup & Deployment

### Prerequisites
- Node.js >=18.0.0
- Microsoft SQL Server
- npm >=8.0.0

### Backend Setup
```bash
cd Fransiscan-Nodejs-BE
npm install
cp env.example .env
# Edit .env with your configuration
npm start
```

### Frontend Setup
```bash
cd francisicon-react-front-end
npm install
# Create .env file with VITE_API_BASE=http://localhost:3000
npm run dev
```

### Environment Variables

#### Backend (.env)
```env
# Server
PORT=3000
HOST=localhost
NODE_ENV=production

# Database
DB_SERVER=localhost
DB_DATABASE=FransiscanLive
DB_PORT=1433
DB_USER=your_user
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h

# Cache
CACHE_TTL_SECONDS=300
RESPONSE_CACHE_TTL=300
RESPONSE_CACHE_ENABLED=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Request Timeout
REQUEST_TIMEOUT_MS=70000
```

#### Frontend (.env)
```env
VITE_API_BASE=http://localhost:3000
```

### Docker Deployment
```bash
docker-compose up -d --build
```

---

## 12. Monitoring & Maintenance

### Health Checks
- **Endpoint:** `GET /health`
- **Checks:** Database connection, server status
- **Response:** JSON with status, uptime, database status

### Logging
- **Backend:** Winston logger
- **Levels:** error, warn, info, debug
- **Files:** `logs/error.log`, `logs/combined.log`
- **Rotation:** Automatic log rotation

### Cache Statistics
- **Endpoint:** `GET /api/utils/cache-stats`
- **Metrics:** Hits, misses, hit rate, current keys

### Performance Monitoring
- **Request Duration:** Logged in API interceptor
- **Database Query Time:** Logged in repository layer
- **Cache Hit Rate:** Available via cache stats

---

## 13. Troubleshooting

### Common Issues

#### Database Connection Failed
- **Check:** SQL Server is running
- **Check:** Connection string is correct
- **Check:** Firewall allows port 1433
- **Check:** Authentication method matches configuration

#### Slow API Responses
- **Check:** Database indexes are applied
- **Check:** Cache is enabled and working
- **Check:** Query timeouts are appropriate
- **Check:** Connection pool size

#### Cache Not Working
- **Check:** `RESPONSE_CACHE_ENABLED=true`
- **Check:** Cache TTL is set
- **Check:** Request is GET method
- **Check:** No bypass cache header

#### Frontend API Errors
- **Check:** API base URL is correct
- **Check:** CORS is configured
- **Check:** Token is valid
- **Check:** Network connectivity

### Debug Commands
```bash
# Test database connection
npm run test-db

# Diagnose database issues
npm run diagnose-db

# View logs
docker-compose logs -f

# Check cache stats
curl http://localhost:3000/api/utils/cache-stats
```

---

## Performance Best Practices

### Backend
1. **Use Caching:** Enable response caching for GET requests
2. **Add Indexes:** Apply database indexes for frequently queried columns
3. **Optimize Queries:** Use parallel queries where possible
4. **Set Timeouts:** Configure appropriate query timeouts
5. **Monitor Cache:** Check cache hit rates regularly

### Frontend
1. **Debounce Search:** Use debounce for search inputs
2. **Memoize Components:** Use React.memo for expensive components
3. **Lazy Load:** Lazy load routes and components
4. **Cache API Responses:** Use API cache for repeated requests
5. **Optimize Redux:** Use selectors and memoization

---

## Version History

### Version 3.0.0 (2026-01-25)
- ✅ Added response caching middleware
- ✅ Enhanced error handling
- ✅ Added frontend API caching
- ✅ Added request debouncing/throttling
- ✅ Improved database connection resilience
- ✅ Comprehensive documentation

### Version 2.0.0
- ✅ Performance optimizations
- ✅ Database query caching
- ✅ Parallel query execution

### Version 1.0.0
- ✅ Initial release
- ✅ Core features implemented

---

## Support & Contribution

For issues, questions, or contributions:
1. Check this documentation
2. Review error logs
3. Check health endpoint
4. Review cache statistics

---

**Last Updated:** 2026-01-25  
**Maintained By:** Franciscan Development Team

