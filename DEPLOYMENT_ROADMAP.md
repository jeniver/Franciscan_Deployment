# 🗺️ Franciscan Application - Complete Deployment Roadmap

## 📋 Overview

This roadmap provides a step-by-step guide to deploy the Franciscan React + Node.js application with MySQL database on another machine using Docker and Git.

**Estimated Time**: 45-60 minutes (excluding database migration)

---

## 🎯 Best & Fastest Roadmap

### Phase 1: Preparation (10 minutes)

#### Step 1.1: Install Prerequisites on Target Machine
- [ ] Install **Docker Desktop** (Windows/Mac) or **Docker Engine** (Linux)
  - Download: https://www.docker.com/products/docker-desktop
  - Verify: `docker --version` and `docker-compose --version`
- [ ] Install **Git**
  - Download: https://git-scm.com/downloads
  - Verify: `git --version`

#### Step 1.2: Backup Current Database
**On your current machine:**
```bash
# Windows (PowerShell - Recommended)
.\backup-database.ps1

# Windows (Command Prompt)
backup-database.bat

# Or use SQL Server Management Studio:
# Right-click database > Tasks > Back Up...
```

**Save backup file** in a safe location (will be needed for migration).

---

### Phase 2: Repository Setup (5 minutes)

#### Step 2.1: Clone Repository
**On target machine:**
```bash
git clone <your-repository-url>
cd Franciscan_Deployment
```

#### Step 2.2: Configure Environment
```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your settings
# Windows: notepad .env
# Linux/Mac: nano .env
```

**Critical values to update:**
- `MYSQL_ROOT_PASSWORD` - Strong password for MySQL root
- `MYSQL_PASSWORD` - Strong password for application user
- `JWT_SECRET` - Generate strong random key: `openssl rand -base64 32`

---

### Phase 3: Database Migration (20-30 minutes)

#### Step 3.1: Choose Migration Approach

**Option A: Update Backend Code for MySQL (Recommended - Faster)**
1. Install MySQL driver in backend:
   ```bash
   cd Fransiscan-Nodejs-BE
   npm install mysql2
   ```
2. Update `src/config/database.js` to use MySQL (see MYSQL_MIGRATION_GUIDE.md)
3. Convert SQL queries to MySQL syntax

**Option B: Migrate Database Schema**
1. Export SQL Server schema
2. Convert to MySQL syntax
3. Place SQL scripts in `mysql-init/` directory
4. They will run automatically on first container startup

#### Step 3.2: Create MySQL Initialization Scripts
```bash
# Create directory for initialization scripts
mkdir mysql-init

# Place your converted SQL scripts here
# They will run automatically when MySQL container starts for the first time
```

---

### Phase 4: Docker Deployment (10-15 minutes)

#### Step 4.1: Build and Start Services
```bash
# Build and start all containers
docker-compose up -d --build

# View logs
docker-compose logs -f

# Check container status
docker-compose ps
```

#### Step 4.2: Initialize Database
**If you have SQL initialization scripts:**
```bash
# Scripts in mysql-init/ run automatically on first startup
# Or manually import:
docker exec -i franciscan-mysql mysql -ufranciscan_user -p${MYSQL_PASSWORD} FransiscanLive < your-backup.sql
```

**If migrating from SQL Server backup:**
1. Convert SQL Server backup to MySQL format
2. Import using the command above

---

### Phase 5: Verification (5 minutes)

#### Step 5.1: Check Services
```bash
# Check all containers are running
docker-compose ps

# Should show:
# - franciscan-mysql (Up)
# - franciscan-backend (Up)
# - franciscan-frontend (Up)
```

#### Step 5.2: Test Endpoints
```bash
# Backend health check
curl http://localhost:3000/health
# Or open in browser: http://localhost:3000/health

# Frontend
# Open browser: http://localhost:3001

# MySQL connection
docker exec -it franciscan-mysql mysql -ufranciscan_user -p
# Enter password from .env
```

---

## 📦 What Gets Deployed

### Services
1. **MySQL 8.0** - Database server (port 3306)
2. **Node.js Backend** - API server (port 3000)
3. **React Frontend** - Web application (port 3001, served via nginx)

### Features
- ✅ Automatic container restart on failure
- ✅ Health checks for all services
- ✅ Persistent database storage (Docker volumes)
- ✅ Log file persistence
- ✅ Network isolation (Docker network)
- ✅ Environment-based configuration

---

## 🔧 Common Operations

### Start Services
```bash
docker-compose up -d
```

### Stop Services
```bash
docker-compose down
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mysql
```

### Restart a Service
```bash
docker-compose restart backend
docker-compose restart frontend
docker-compose restart mysql
```

### Rebuild After Code Changes
```bash
# Rebuild specific service
docker-compose up -d --build backend

# Rebuild all services
docker-compose up -d --build
```

### Access Container Shell
```bash
# Backend container
docker exec -it franciscan-backend sh

# MySQL container
docker exec -it franciscan-mysql bash
```

### Backup Database
```bash
docker exec franciscan-mysql mysqldump -ufranciscan_user -p${MYSQL_PASSWORD} FransiscanLive > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore Database
```bash
docker exec -i franciscan-mysql mysql -ufranciscan_user -p${MYSQL_PASSWORD} FransiscanLive < backup.sql
```

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Check what's using the port
# Windows: netstat -ano | findstr :3000
# Linux/Mac: lsof -i :3000

# Change ports in docker-compose.yml if needed
```

### Database Connection Issues
```bash
# Check MySQL logs
docker-compose logs mysql

# Test MySQL connection
docker exec -it franciscan-mysql mysql -uroot -p
```

### Backend Won't Start
```bash
# Check backend logs
docker-compose logs backend

# Check environment variables
docker-compose config

# Verify database is healthy
docker-compose ps mysql
```

### Frontend Not Loading
```bash
# Check frontend logs
docker-compose logs frontend

# Rebuild frontend
docker-compose up -d --build frontend

# Check nginx configuration
docker exec -it franciscan-frontend cat /etc/nginx/conf.d/default.conf
```

### Clear Everything and Start Fresh
```bash
# Stop and remove all containers, networks, and volumes
docker-compose down -v

# Remove images
docker-compose down --rmi all

# Start fresh
docker-compose up -d --build
```

---

## 📝 My Implementation Plan

### ✅ Completed
1. ✅ Analyzed React frontend project
2. ✅ Analyzed Node.js backend project
3. ✅ Reviewed database structure
4. ✅ Created database backup scripts
5. ✅ Created Docker configuration files
6. ✅ Created deployment documentation

### 🔄 Next Steps (For You)
1. **Backup Current Database** - Run backup scripts on current machine
2. **Update Backend Code** - Install mysql2 and update database.js (or I can help)
3. **Test Locally** - Run `docker-compose up` on your machine first
4. **Deploy to Target** - Follow Phase 2-5 on target machine

---

## 🎯 Success Criteria

Deployment is successful when:
- ✅ All containers show "Up" status: `docker-compose ps`
- ✅ Backend health check returns 200: `curl http://localhost:3000/health`
- ✅ Frontend loads in browser: http://localhost:3001
- ✅ Can connect to MySQL: `docker exec -it franciscan-mysql mysql -ufranciscan_user -p`
- ✅ Application login works
- ✅ Database queries return data

---

## 📚 Additional Resources

- **Project Analysis**: [PROJECT_ANALYSIS.md](./PROJECT_ANALYSIS.md)
- **MySQL Migration**: [MYSQL_MIGRATION_GUIDE.md](./MYSQL_MIGRATION_GUIDE.md) (to be created)
- **Docker Documentation**: https://docs.docker.com/

---

## ⚠️ Important Notes

1. **Database Migration Required**: Current code uses SQL Server. You need to either:
   - Update backend code to use MySQL (recommended)
   - Or migrate database schema to MySQL

2. **First Startup**: MySQL container takes 30-60 seconds to initialize

3. **Data Persistence**: Database data is stored in Docker volume `mysql_data` and persists across restarts

4. **Security**: Always change default passwords in `.env` file before deployment

5. **Backup Strategy**: Set up regular database backups (see backup commands above)

---

**Ready to deploy? Start with Phase 1!** 🚀

