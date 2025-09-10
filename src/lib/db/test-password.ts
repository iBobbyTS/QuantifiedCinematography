import bcrypt from 'bcrypt';

/**
 * Test script to generate password hash for 'qcpassword'
 * This helps us get the hash value to use in the seed script
 */

async function testPassword() {
  const plainPassword = 'qcpassword';
  
  try {
    // Generate hash with salt rounds 12 (good balance of security and performance)
    const hash = await bcrypt.hash(plainPassword, 12);
    
    console.log('🔐 Password Hash Generation Test');
    console.log('================================');
    console.log(`Plain Password: ${plainPassword}`);
    console.log(`Generated Hash: ${hash}`);
    console.log('');
    console.log('📋 Copy the hash above to use in your seed script');
    console.log('');
    
    // Verify the hash works
    const isValid = await bcrypt.compare(plainPassword, hash);
    console.log(`✅ Hash verification: ${isValid ? 'SUCCESS' : 'FAILED'}`);
    
    // Test with wrong password
    const isWrongValid = await bcrypt.compare('wrongpassword', hash);
    console.log(`❌ Wrong password test: ${isWrongValid ? 'FAILED (should be false)' : 'SUCCESS (correctly rejected)'}`);
    
  } catch (error) {
    console.error('❌ Error generating password hash:', error);
  }
}

// Run the test
testPassword();
