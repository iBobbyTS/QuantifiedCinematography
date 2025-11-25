# Quantified Cinematography

## Setup

```bash
docker compose up -d
```

```bash
docker compose exec app bun run db:push
```

```bash
docker compose exec app bun run db:seed
```

## Default Admin User
Username: admin
Password: admin123
You can create a new admin user, log into the new admin user, and then delete the default admin.
