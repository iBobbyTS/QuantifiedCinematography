# Quantified Cinematography

## Setup

### Start Docker Containers
```bash
docker compose up -d
```

### Update Database schema
```bash
docker compose exec app bun run db:push
```

### Insert Seed Data
```bash
docker compose exec app bun run db:seed
```

## Default Admin User
Username: admin
Password: admin123
You can create a new admin user, log into the new admin user, and then delete the default admin.

