import { generateTestHashes } from '../lib/auth/password.js';

/**
 * 生成测试密码哈希的脚本
 * 运行: bun run src/scripts/generate-password-hashes.ts
 */
async function main() {
	console.log('🔐 开始生成密码哈希...\n');
	
	try {
		await generateTestHashes();
		console.log('\n✅ 密码哈希生成完成！');
	} catch (error) {
		console.error('❌ 生成密码哈希时发生错误:', error);
		process.exit(1);
	}
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}
