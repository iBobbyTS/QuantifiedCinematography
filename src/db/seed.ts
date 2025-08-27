import { db, client } from './config.js';
import { brands, productTypes, productSeries, users } from './schema.js';
import { sql } from 'drizzle-orm';
import { USER_PERMISSIONS } from '../lib/bitmask.js';

/**
 * Seed the database with basic data
 * This script inserts the minimum required data for the application to function
 */
async function seed() {
  try {
    console.log('🌱 Starting database seeding...');

    // Insert basic product type
    console.log('📝 Inserting basic product type...');
    await db.insert(productTypes).values({
      id: 0,
      name: 'None',
      createdAt: new Date(),
      updatedAt: new Date(),
    }).onConflictDoNothing();

    // Insert basic brand
    console.log('🏷️ Inserting basic brand...');
    await db.insert(brands).values({
      id: 0,
      name: 'None',
      createdAt: new Date(),
      updatedAt: new Date(),
    }).onConflictDoNothing();

    // Insert basic product series
    console.log('📚 Inserting basic product series...');
    await db.insert(productSeries).values({
      id: 0,
      name: 'None',
      brandId: 0,
      productTypeId: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).onConflictDoNothing();

    // Insert admin user
    console.log('👤 Inserting admin user...');
    const adminPermissions = USER_PERMISSIONS.LIGHT | USER_PERMISSIONS.CAMERA | USER_PERMISSIONS.LENS;
    await db.insert(users).values({
      username: 'admin',
      displayName: 'Administrator',
      email: 'admin@quantifiedcinematography.com',
      passwordHash: '$2b$12$RhNV50qYMhV4wZUCmaQCeOrJyxYNP0LZdiEQVgUI6zv13g4T0vt4.', // qcpassword
      permission: adminPermissions,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).onConflictDoNothing();

    console.log('✅ Database seeding completed successfully!');
    console.log('📊 Inserted data:');
    console.log('   - Product Type: None (id: 0)');
    console.log('   - Brand: None (id: 0)');
    console.log('   - Product Series: None (id: 0)');
    console.log('   - Admin User: admin (full permissions)');

  } catch (error) {
    console.error('❌ Error during database seeding:', error);
    throw error;
  }
}

/**
 * Reset sequences to start from 1 for future inserts
 * This ensures that new records get IDs starting from 1
 */
async function resetSequences() {
  try {
    console.log('🔄 Resetting sequences...');
    
    // Reset sequences to start from 1
    await db.execute(sql`SELECT setval('product_types_id_seq', 1, false)`);
    await db.execute(sql`SELECT setval('brands_id_seq', 1, false)`);
    await db.execute(sql`SELECT setval('product_series_id_seq', 1, false)`);
    
    console.log('✅ Sequences reset successfully!');
  } catch (error) {
    console.error('❌ Error resetting sequences:', error);
    throw error;
  }
}

/**
 * Main seeding function
 */
async function main() {
  try {
    await seed();
    await resetSequences();
    console.log('🎉 All seeding operations completed!');
  } catch (error) {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { seed, resetSequences };
