# Docker Strategy for Retail Assist App

## Quick Start Commands

### Development Environment
```bash
# Start development environment (with hot reload)
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f app-dev

# Stop services
docker-compose down
```

### Production Environment
```bash
# Start production environment
docker-compose --profile production up

# Start production in background
docker-compose --profile production up -d

# View production logs
docker-compose logs -f app-prod
```

### Database Management
```bash
# Start with PgAdmin for database management
docker-compose --profile tools up

# Access PgAdmin at http://localhost:8080
# Email: admin@retail.com
# Password: admin123
```

## Individual Service Management

### Database Only
```bash
# Start only PostgreSQL
docker-compose up postgres

# Connect to database directly
docker-compose exec postgres psql -U retail_user -d retail_assist
```

### Application Only (if database is external)
```bash
# Build and run app container only
docker build -t retail-assist .
docker run -p 3001:3001 -e DATABASE_URL="your_external_db_url" retail-assist
```

## Database Operations

### Prisma Operations
```bash
# Run migrations
docker-compose exec app-dev npx prisma migrate dev

# Generate Prisma client
docker-compose exec app-dev npx prisma generate

# Seed database
docker-compose exec app-dev npx prisma db seed

# Open Prisma Studio
docker-compose exec app-dev npx prisma studio

# Reset database
docker-compose exec app-dev npx prisma migrate reset
```

### Database Backup & Restore
```bash
# Backup database
docker-compose exec postgres pg_dump -U retail_user retail_assist > backup.sql

# Restore database
docker-compose exec -T postgres psql -U retail_user retail_assist < backup.sql
```

## Development Workflow

### Hot Reload Development
1. Start development environment: `docker-compose up`
2. Edit files in `src/` directory
3. Changes are automatically reflected (hot reload via nodemon)

### Debugging
```bash
# Access container shell
docker-compose exec app-dev sh

# View container logs
docker-compose logs -f app-dev

# Check container status
docker-compose ps
```

## Production Deployment

### Build Production Image
```bash
# Build production-ready image
docker build --target production -t retail-assist:latest .

# Run production container
docker run -d \
  --name retail-assist-prod \
  -p 3001:3001 \
  -e DATABASE_URL="postgresql://user:password@host:5432/db" \
  -e PORT=3001 \
  -e AUTHTOKEN="your_token" \
  retail-assist:latest
```

### Environment Configuration
1. Copy `.env.example` to `.env`
2. Update environment variables as needed
3. For production, use secure passwords and tokens

## Container Architecture

### Multi-Stage Dockerfile
- **Builder Stage**: Compiles TypeScript and generates Prisma client
- **Production Stage**: Minimal runtime image with built application
- **Development Stage**: Full development environment with hot reload

### Services
- **postgres**: PostgreSQL database container
- **app-dev**: Development application with hot reload
- **app-prod**: Production application (use with --profile production)
- **pgadmin**: Database administration tool (use with --profile tools)

## Health Checks & Monitoring

### Application Health
```bash
# Check application health
curl http://localhost:3001/health

# View health check logs
docker-compose logs app-dev | grep health
```

### Container Resource Usage
```bash
# View container stats
docker stats

# View specific container stats
docker stats retail_assist_dev
```

## Troubleshooting

### Common Issues

1. **Database Connection Issues**
   ```bash
   # Check if database is ready
   docker-compose exec postgres pg_isready -U retail_user
   
   # Check database logs
   docker-compose logs postgres
   ```

2. **Port Already in Use**
   ```bash
   # Find process using port 3001
   lsof -i :3001
   
   # Kill process
   kill -9 <PID>
   ```

3. **Volume Permission Issues**
   ```bash
   # Reset volumes
   docker-compose down -v
   docker-compose up
   ```

4. **Container Won't Start**
   ```bash
   # Rebuild containers
   docker-compose build --no-cache
   docker-compose up
   ```

### Clean Up

```bash
# Remove all containers and volumes
docker-compose down -v

# Remove images
docker-compose down --rmi all

# Clean up Docker system
docker system prune -a
```

## Best Practices

1. **Development**: Use `docker-compose up` for local development with hot reload
2. **Production**: Use `docker-compose --profile production up` for production deployment
3. **Security**: Change default passwords in production
4. **Backup**: Regularly backup your database
5. **Monitoring**: Monitor container health and logs
6. **Updates**: Regularly update base images for security patches