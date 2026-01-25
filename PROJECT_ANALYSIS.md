# Franciscan Application - Complete Project Analysis

## 📊 Executive Summary

This document provides a comprehensive analysis of the Franciscan application, including frontend, backend, and database structure, to facilitate Docker deployment with MySQL.

---

## 🎯 Project Overview

### Application Stack
- **Frontend**: React 18.3 + TypeScript + Vite
- **Backend**: Node.js 18+ + Express.js
- **Current Database**: Microsoft SQL Server (FransiscanLive)
- **Target Database**: MySQL 8.0 (for Docker deployment)

---

## 📱 Frontend Analysis (francisicon-react-front-end)

### Technology Stack
- **Framework**: React 18.3.1 with TypeScript
- **Build Tool**: Vite 5.2.0
- **State Management**: Redux Toolkit 2.9.1
- **Routing**: React Router DOM 6.26.2
- **Styling**: Tailwind CSS 3.4.17
- **HTTP Client**: Axios 1.4.0
- **PDF Generation**: html2pdf.js, jsPDF
- **Development Port**: 3001

### Project Structure
```
francisicon-react-front-end/
├── src/
│   ├── components/        # React components
│   │   ├── common/       # Reusable UI components
│   │   └── ...           # Feature-specific components
│   ├── pages/            # Page components
│   ├── services/         # API service layer
│   ├── store/            # Redux store and slices
│   ├── hooks/            # Custom React hooks
│   ├── utils/            # Utility functions
│   └── types/            # TypeScript type definitions
├── public/               # Static assets
├── dist/                 # Build output
└── package.json
```

### Key Features
1. **Authentication**: JWT-based login system
2. **Niche Management**: Application wizard, agreements, bookings
3. **Wake Room Booking**: Booking management system
4. **Invoice & Receipt**: PDF generation and management
5. **Reports**: Monthly reports for various entities
6. **Gate of Life**: Application management

### API Configuration
- **Base URL**: `http://localhost:3000` (configurable via `VITE_API_BASE`)
- **Authentication**: Bearer token in Authorization header
- **Timeout**: 10 seconds

### Build Configuration
- **Entry Point**: `src/index.tsx`
- **Build Command**: `pnpm run build` or `npm run build`
- **Output Directory**: `dist/`
- **Production Server**: Nginx (configured in Dockerfile)

---

## 🔧 Backend Analysis (Fransiscan-Nodejs-BE)

### Technology Stack
- **Runtime**: Node.js 18.0.0+
- **Framework**: Express.js 4.18.2
- **Database Driver**: mssql 10.0.1, msnodesqlv8 5.1.1 (SQL Server)
- **Authentication**: JWT (jsonwebtoken 9.0.2)
- **Security**: Helmet, CORS, Rate Limiting
- **Logging**: Winston 3.11.0
- **PDF Generation**: Puppeteer 24.26.0
- **Port**: 3000

### Project Structure
```
Fransiscan-Nodejs-BE/
├── src/
│   ├── app.js            # Main application entry point
│   ├── config/           # Configuration files
│   │   ├── database.js   # Database connection (SQL Server)
│   │   └── knex.js       # Knex query builder config
│   ├── controllers/      # Request handlers
│   ├── services/        # Business logic
│   ├── repositories/     # Data access layer
│   ├── models/          # Data models
│   ├── routes/          # API routes
│   ├── middleware/      # Express middleware
│   └── utils/           # Utility functions
├── scripts/             # Utility scripts
├── logs/                # Application logs
└── package.json
```

### API Endpoints
- **Authentication**: `/api/auth/login`, `/api/auth/register`
- **Niche Applications**: `/api/niche-applications`
- **Niche Agreements**: `/api/niche-agreements/:applicationNumber`
- **Invoices**: `/api/invoices`
- **Receipts**: `/api/receipts`
- **Wake Rooms**: `/api/wake-rooms`
- **Reports**: `/api/reports`
- **Health Check**: `/health`

### Database Configuration
- **Current**: SQL Server (Windows Authentication or SQL Auth)
- **Connection**: Uses `mssql` package with connection pooling
- **Database Name**: FransiscanLive
- **Connection Timeout**: 30-60 seconds
- **Pool Size**: Max 20, Min 2 connections

### Key Dependencies
```json
{
  "express": "^4.18.2",
  "mssql": "^10.0.1",
  "msnodesqlv8": "^5.1.1",
  "jsonwebtoken": "^9.0.2",
  "bcryptjs": "^2.4.3",
  "helmet": "^7.1.0",
  "cors": "^2.8.5",
  "winston": "^3.11.0",
  "puppeteer": "^24.26.0"
}
```

---

## 🗄️ Database Analysis

### Current Database: SQL Server (FransiscanLive)

#### Key Tables (from optimization script)
1. **NicheApplication** - Main application records
2. **NicheApplicationBeneficiary** - Beneficiary information
3. **NicheBooking** - Booking records
4. **Invoice** - Invoice master records
5. **InvoiceDetail** - Invoice line items
6. **Receipt** - Receipt records
7. **Niche** - Niche inventory
8. **NicheRow** - Niche row hierarchy
9. **NicheWall** - Niche wall hierarchy
10. **Chapel** - Chapel information

#### Database Characteristics
- **Database Name**: FransiscanLive
- **Compatibility Level**: 100 (SQL Server 2008)
- **Recovery Model**: Simple
- **Collation**: SQL_Latin1_General_CP1_CI_AS

#### Performance Optimizations
- Multiple indexes created for query optimization
- Statistics updated regularly
- Connection pooling enabled
- Query timeouts configured

### Migration to MySQL Requirements

#### Schema Conversion Needed
1. **Data Types**:
   - `NVARCHAR` → `VARCHAR` or `TEXT`
   - `DATETIME2` → `DATETIME`
   - `BIT` → `TINYINT(1)` or `BOOLEAN`
   - `UNIQUEIDENTIFIER` → `CHAR(36)` or `VARCHAR(36)`
   - `IDENTITY` → `AUTO_INCREMENT`

2. **SQL Syntax**:
   - `TOP N` → `LIMIT N`
   - `GETDATE()` → `NOW()`
   - `ISNULL()` → `IFNULL()`
   - `@@IDENTITY` → `LAST_INSERT_ID()`
   - String concatenation: `+` → `CONCAT()`

3. **Stored Procedures**: May need rewriting for MySQL syntax

4. **Indexes**: Most indexes can be directly converted

---

## 🔄 Migration Strategy

### Option 1: Update Backend for MySQL (Recommended)
**Pros**:
- Faster implementation
- Better Docker compatibility
- MySQL is more common in containerized environments
- Easier to maintain

**Cons**:
- Requires code changes
- Need to test all queries

**Steps**:
1. Install `mysql2` package
2. Update `src/config/database.js` to use MySQL
3. Convert SQL queries to MySQL syntax
4. Test all endpoints

### Option 2: Migrate Database Schema
**Pros**:
- Minimal code changes
- Preserves existing logic

**Cons**:
- More complex migration
- Need to convert all SQL scripts
- Potential data migration issues

**Steps**:
1. Export SQL Server schema
2. Convert to MySQL syntax
3. Import to MySQL
4. Migrate data
5. Update connection strings

---

## 📦 Docker Deployment Requirements

### Services Needed
1. **MySQL 8.0**: Database server
2. **Node.js Backend**: API server (port 3000)
3. **React Frontend**: Web application (port 3001, nginx)

### Ports Required
- **3000**: Backend API
- **3001**: Frontend (nginx)
- **3306**: MySQL

### Environment Variables
- Database credentials
- JWT secret
- CORS origins
- API URLs

---

## 🚀 Deployment Roadmap

### Phase 1: Preparation (Current)
- ✅ Project analysis complete
- ✅ Database structure reviewed
- ⏳ Create backup scripts
- ⏳ Create Docker configuration

### Phase 2: Database Migration
- Create MySQL schema
- Convert SQL Server scripts
- Test data migration
- Update backend code

### Phase 3: Docker Setup
- Create Dockerfiles
- Create docker-compose.yml
- Configure environment variables
- Test locally

### Phase 4: Deployment
- Deploy to target machine
- Initialize database
- Start services
- Verify functionality

---

## 📝 Next Steps

1. **Create Database Backup** (Current SQL Server)
2. **Create Docker Configuration** (MySQL + Services)
3. **Update Backend Code** (MySQL compatibility)
4. **Create Migration Scripts** (SQL Server → MySQL)
5. **Test Deployment** (Local Docker)
6. **Deploy to Target Machine**

---

## ⚠️ Important Notes

1. **Database Migration**: Critical step - ensure all data is backed up
2. **Code Changes**: Backend needs MySQL driver and query updates
3. **Testing**: Thoroughly test all API endpoints after migration
4. **Backup**: Always maintain backups before migration
5. **Rollback Plan**: Have a plan to revert if migration fails

---

**Last Updated**: 2024
**Version**: 1.0.0

