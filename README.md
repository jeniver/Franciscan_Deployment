hudson change test # Franciscan Application - Docker Deployment

Complete Docker setup for deploying the Franciscan React + Node.js application with SQL Server database.

## 🚀 Quick Start

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop) or Docker Engine
- [Git](https://git-scm.com/downloads)

### Deployment Steps

1. **Clone Repository**
   ```bash
   git clone <your-repository-url>
   cd Franciscan_Deployment
   ```

2. **Configure Environment**
   ```bash
   cp env-template.txt .env
   # Edit .env and update passwords and JWT_SECRET
   ```
   Critical values:
   - `MSSQL_SA_PASSWORD`
   - `DB_USER` / `DB_PASSWORD`
   - `MSSQL_BACKUP_FILE`
   - `JWT_SECRET`

3. **Backup Current Database** (on current machine)
   ```bash
   # Windows PowerShell
   .\backup-database.ps1
   
   # Windows CMD
   backup-database.bat
   ```

4. **Deploy with Docker**
   ```bash
   docker-compose up -d --build
   ```

5. **Access Application**
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:3000
   - SQL Server: localhost:1433

## 📚 Documentation

- **[DEPLOYMENT_ROADMAP.md](./DEPLOYMENT_ROADMAP.md)** - Complete step-by-step deployment guide
- **[PROJECT_ANALYSIS.md](./PROJECT_ANALYSIS.md)** - Detailed project analysis
- **[backup-database.ps1](./backup-database.ps1)** - Database backup script (PowerShell)
- **[backup-database.bat](./backup-database.bat)** - Database backup script (CMD)

## ⚠️ Important: Database Restore

**Current Status**: Application uses SQL Server. The Docker stack includes SQL Server.

**You need to**:
1. Backup your current SQL Server database (use backup scripts)
2. Place the `.bak` file in `mssql-backups/`
3. Start the stack — the init container restores the DB and creates the app user

See [DEPLOYMENT_ROADMAP.md](./DEPLOYMENT_ROADMAP.md) for detailed restore steps.

## 🛠️ Common Commands

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild after code changes
docker-compose up -d --build

# Check status
docker-compose ps

# Database backup/restore
# Use backup-database.ps1 / backup-database.bat, then restore into the SQL Server container
```

## 📁 Project Structure

```
Franciscan_Deployment/
├── docker-compose.yml          # Main orchestration
├── env-template.txt            # Environment template
├── backup-database.ps1         # Database backup (PowerShell)
├── backup-database.bat          # Database backup (CMD)
├── DEPLOYMENT_ROADMAP.md       # Complete deployment guide
├── PROJECT_ANALYSIS.md         # Project analysis
├── Fransiscan-Nodejs-BE/       # Backend application
│   ├── Dockerfile
│   └── ...
├── francisicon-react-front-end/ # Frontend application
│   ├── Dockerfile
│   ├── nginx.conf
│   └── ...
└── mssql-backups/              # SQL Server backups (optional)
```

## 🔐 Security

- Change all default passwords in `.env` file
- Generate strong JWT_SECRET: `openssl rand -base64 32`
- Don't commit `.env` to Git
- Use strong SQL Server passwords

## 🆘 Troubleshooting

See [DEPLOYMENT_ROADMAP.md](./DEPLOYMENT_ROADMAP.md) for detailed troubleshooting guide.

## 📞 Support

For issues or questions:
1. Check container logs: `docker-compose logs`
2. Verify environment: `docker-compose config`
3. Check container status: `docker-compose ps`
4. Review deployment roadmap

---

**Version**: 1.0.0  
**Last Updated**: 2024
