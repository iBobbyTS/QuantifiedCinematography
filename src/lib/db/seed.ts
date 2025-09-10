import { db, client } from './config.js';
import { sql } from 'drizzle-orm';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

/**
 * Seed the database with basic data
 * This script executes the init.sql file to initialize the database
 */
async function seed() {
  try {
    console.log('🌱 Starting database seeding...');

    // Read and execute init.sql
    console.log('📝 Executing init.sql...');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = join(__filename, '..');
    const initSqlPath = join(__dirname, 'init.sql');
    
    const initSql = readFileSync(initSqlPath, 'utf8');
    
    // 更智能的SQL语句分割方法
    const statements = initSql
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .reduce((acc, line) => {
        // 跳过纯注释行
        if (line.startsWith('--')) {
          return acc;
        }
        
        // 如果当前行包含注释，移除注释部分
        const commentIndex = line.indexOf('--');
        const cleanLine = commentIndex > 0 ? line.substring(0, commentIndex).trim() : line;
        
        if (cleanLine.length > 0) {
          if (acc.length === 0) {
            acc.push(cleanLine);
          } else {
            acc[acc.length - 1] += ' ' + cleanLine;
          }
        }
        
        return acc;
      }, [] as string[])
      .join(' ') // 将所有行连接成一个字符串
      .split(';') // 按分号分割
      .map(stmt => stmt.replace(/\s+/g, ' ').trim()) // 规范化空白字符
      .filter(stmt => stmt.length > 0);
    
    console.log(`📋 Found ${statements.length} SQL statements to execute`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        console.log(`🔧 Executing statement ${i + 1}: ${statement.substring(0, 50)}...`);
        await db.execute(sql.raw(statement));
        console.log(`✅ Successfully executed statement ${i + 1}`);
      } catch (error) {
        // 对于INSERT语句，如果是重复键错误，我们可以忽略
        if (error.message.includes('duplicate key') || error.message.includes('already exists')) {
          console.log(`   ⚠️  Skipping duplicate key error for statement ${i + 1}`);
        } else {
          console.log(`❌ Failed to execute statement ${i + 1}: ${error.message}`);
          console.log(`   Statement: ${statement}`);
          throw error;
        }
      }
    }

    console.log('✅ Database seeding completed successfully!');
    console.log('📊 Initialized data:');
    console.log('   - Product Type: None (id: 0)');
    console.log('   - Brand: None (id: 0)');
    console.log('   - Product Series: None (id: 0)');
    console.log('   - Admin User: admin (full permissions) - 密码: admin123');
    console.log('   - Test User: test (light permissions) - 密码: test123');

  } catch (error) {
    console.error('❌ Error during database seeding:', error);
    throw error;
  }
}

/**
 * Main seeding function
 */
async function main() {
  try {
    await seed();
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

export { seed };
