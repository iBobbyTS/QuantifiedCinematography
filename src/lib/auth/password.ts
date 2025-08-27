import bcrypt from 'bcrypt';

/**
 * 加密密码
 * @param password 明文密码
 * @returns 加密后的密码哈希
 */
export async function hashPassword(password: string): Promise<string> {
	const saltRounds = 12;
	return await bcrypt.hash(password, saltRounds);
}

/**
 * 验证密码
 * @param password 明文密码
 * @param hash 加密后的密码哈希
 * @returns 是否匹配
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
	return await bcrypt.compare(password, hash);
}

/**
 * 生成测试密码哈希（用于开发环境）
 */
export async function generateTestHashes() {
	const testPasswords = [
		'admin123',
		'qcpassword',
		'test123'
	];
	
	console.log('🔐 生成测试密码哈希:');
	for (const password of testPasswords) {
		const hash = await hashPassword(password);
		console.log(`密码: ${password} -> 哈希: ${hash}`);
	}
}
