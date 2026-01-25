# 🗺️ Franciscan Application - Complete Deployment Roadmap

## 📋 Overview

This roadmap provides a step-by-step guide to deploy the Franciscan React + Node.js application with SQL Server database on another machine using Docker and Git.

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
cp env-template.txt .env

# Edit .env file with your settings
# Windows: notepad .env
# Linux/Mac: nano .env
```

**Critical values to update:**
- `MSSQL_SA_PASSWORD` - Strong password for SQL Server SA user
- `DB_USER` / `DB_PASSWORD` - App database user credentials
- `MSSQL_BACKUP_FILE` - Backup filename placed in `mssql-backups/`
- `JWT_SECRET` - Generate strong random key: `openssl rand -base64 32`

---

### Phase 3: Database Restore (15-25 minutes)

#### Step 3.1: Restore SQL Server Backup
1. Ensure you have a recent `.bak` backup (see backup scripts in this repo)
2. Copy the backup into `mssql-backups/`
3. Set `MSSQL_BACKUP_FILE` in `.env` to match the filename
4. Start the stack — the init container restores the DB and creates the app user

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

#### Step 4.2: Verify Database Connectivity
Confirm the backend can connect to SQL Server after the restore. If the API health check returns `200`, the database is reachable.

---

### Phase 5: Verification (5 minutes)

#### Step 5.1: Check Services
```bash
# Check all containers are running
docker-compose ps

# Should show:
# - franciscan-mssql (Up)
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

# SQL Server connection
# Use SSMS or sqlcmd to connect to localhost:1433
```

---

## 📦 What Gets Deployed

### Services
1. **SQL Server 2022** - Database server (port 1433)
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
docker-compose logs -f mssql
```

### Restart a Service
```bash
docker-compose restart backend
docker-compose restart frontend
docker-compose restart mssql
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

# SQL Server container
docker exec -it franciscan-mssql bash
```

### Backup Database
Use `backup-database.ps1` or `backup-database.bat` to generate a SQL Server backup, then place the `.bak` file in `mssql-backups/`.

### Restore Database
Set `MSSQL_BACKUP_FILE` in `.env` and start the stack — the init container handles restore.

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
# Check SQL Server logs
docker-compose logs mssql

# Test SQL Server connection
# Use SSMS or sqlcmd to connect to localhost:1433
```

### Backend Won't Start
```bash
# Check backend logs
docker-compose logs backend

# Check environment variables
docker-compose config

# Verify database is healthy
docker-compose ps mssql
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
2. **Restore Database** - Restore the SQL Server backup into the container
3. **Test Locally** - Run `docker-compose up` on your machine first
4. **Deploy to Target** - Follow Phase 2-5 on target machine

---

## 🎯 Success Criteria

Deployment is successful when:
- ✅ All containers show "Up" status: `docker-compose ps`
- ✅ Backend health check returns 200: `curl http://localhost:3000/health`
- ✅ Frontend loads in browser: http://localhost:3001
- ✅ Can connect to SQL Server on localhost:1433
- ✅ Application login works
- ✅ Database queries return data

---

## 📚 Additional Resources

- **Project Analysis**: [PROJECT_ANALYSIS.md](./PROJECT_ANALYSIS.md)
- **Docker Documentation**: https://docs.docker.com/

---

## ⚠️ Important Notes

1. **Database Restore Required**: Restore your SQL Server backup into the container before using the app.

2. **First Startup**: SQL Server container takes 30-60 seconds to initialize

3. **Data Persistence**: Database data is stored in Docker volume `mssql_data` and persists across restarts

4. **Security**: Always change default passwords in `.env` file before deployment

5. **Backup Strategy**: Set up regular database backups (see backup scripts)

---

**Ready to deploy? Start with Phase 1!** 🚀

