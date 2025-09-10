import { createHash } from 'crypto';

/**
 * Simple password hash test script
 * This generates a hash for 'qcpassword' using SHA-256
 * Note: In production, use bcrypt or argon2 for password hashing
 */

function testPassword() {
  const plainPassword = 'qcpassword';
  
  // Generate SHA-256 hash (for testing purposes only)
  const hash = createHash('sha256').update(plainPassword).digest('hex');
  
  console.log('🔐 Password Hash Generation Test (Simple)');
  console.log('==========================================');
  console.log(`Plain Password: ${plainPassword}`);
  console.log(`SHA-256 Hash: ${hash}`);
  console.log('');
  console.log('⚠️  Note: SHA-256 is NOT suitable for password hashing in production!');
  console.log('   Use bcrypt or argon2 instead.');
  console.log('');
  console.log('📋 For testing, you can use this hash in your seed script');
  console.log('   But remember to change it to a proper bcrypt hash in production');
}

// Run the test
testPassword();
