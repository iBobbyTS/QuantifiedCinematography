# Password Setup Guide

This guide explains how to set up passwords for the database seeding.

## Admin Account Details

The seed script creates an admin account with the following credentials:

- **Username**: `admin`
- **Password**: `qcpassword`
- **Email**: `admin@quantifiedcinematography.com`
- **Permissions**: Full access (Light, Camera, Lens)

## Password Hash

The password hash used in the seed script is:
```
$2b$12$RhNV50qYMhV4wZUCmaQCeOrJyxYNP0LZdiEQVgUI6zv13g4T0vt4.
```

This is a bcrypt hash of the password `qcpassword`.

## Testing Password Hashing

### Option 1: Use the provided hash (Recommended)
The seed script already contains the correct hash for `qcpassword`. You can run it directly:

```bash
bun run src/db/seed.ts
```

### Option 2: Generate your own hash
If you want to use a different password, you can generate your own hash:

1. **Install bcrypt** (if not already installed):
   ```bash
   bun add bcrypt
   bun add -d @types/bcrypt
   ```

2. **Run the password test script**:
   ```bash
   bun run src/db/test-password.ts
   ```

3. **Copy the generated hash** and update the seed script

### Option 3: Simple hash generation (for testing only)
For quick testing without installing bcrypt:

```bash
bun run src/db/test-password-simple.ts
```

⚠️ **Warning**: The simple script uses SHA-256 which is NOT suitable for production password hashing!

## Updating the Seed Script

If you want to change the admin password, update this line in `seed.ts`:

```typescript
passwordHash: '$2b$12$RhNV50qYMhV4wZUCmaQCeOrJyxYNP0LZdiEQVgUI6zv13g4T0vt4.', // qcpassword
```

Replace the hash with your new password hash.

## Security Notes

- **Never store plain text passwords** in your code
- **Use bcrypt or argon2** for password hashing in production
- **Change default passwords** after first login
- **Use environment variables** for sensitive data in production
- **Regularly rotate passwords** for admin accounts

## Login After Seeding

After running the seed script, you can log in with:
- Username: `admin`
- Password: `qcpassword`

The admin user will have full permissions to access all features of the application.
