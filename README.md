# Franciscan Application - Docker Deployment

Complete Docker setup for deploying the Franciscan React + Node.js application with MySQL database.

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
   cp .env.example .env
   # Edit .env and update passwords and JWT_SECRET
   ```

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
   - MySQL: localhost:3306

## 📚 Documentation

- **[PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md)** - Complete project documentation (API, architecture, performance, setup)
- **[backup-database.ps1](./backup-database.ps1)** - Database backup script (PowerShell)
- **[backup-database.bat](./backup-database.bat)** - Database backup script (CMD)

## ⚠️ Important: Database Configuration

**Current Status**: Application uses Microsoft SQL Server.

**Configuration**:
- See [PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md) for detailed database setup
- Supports both Windows Authentication and SQL Server Authentication
- Connection pooling and query optimization included

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

# Backup database
docker exec franciscan-mysql mysqldump -ufranciscan_user -p FransiscanLive > backup.sql
```

## 📁 Project Structure

```
Franciscan_Deployment/
├── docker-compose.yml          # Main orchestration
├── .env.example                # Environment template
├── backup-database.ps1         # Database backup (PowerShell)
├── backup-database.bat          # Database backup (CMD)
├── PROJECT_DOCUMENTATION.md    # Complete project documentation
├── Fransiscan-Nodejs-BE/       # Backend application
│   ├── Dockerfile
│   └── ...
├── francisicon-react-front-end/ # Frontend application
│   ├── Dockerfile
│   ├── nginx.conf
│   └── ...
└── mysql-init/                 # SQL initialization scripts (optional)
```

## 🔐 Security

- Change all default passwords in `.env` file
- Generate strong JWT_SECRET: `openssl rand -base64 32`
- Don't commit `.env` to Git
- Use strong MySQL passwords

## 🆘 Troubleshooting

See [PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md) for detailed troubleshooting guide and performance optimization tips.

## 📞 Support

For issues or questions:
1. Check container logs: `docker-compose logs`
2. Verify environment: `docker-compose config`
3. Check container status: `docker-compose ps`
4. Review deployment roadmap

---

**Version**: 1.0.0  
**Last Updated**: 2024
