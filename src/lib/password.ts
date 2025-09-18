import { hash, verify } from '@node-rs/argon2';

/**
 * 加密密码
 * @param password 明文密码
 * @returns 加密后的密码哈希
 */
export async function hashPassword(password: string): Promise<string> {
	return await hash(password, {
		memoryCost: 19456,
		timeCost: 2,
		outputLen: 32,
		parallelism: 1
	});
}

/**
 * 验证密码
 * @param passwordHash 加密后的密码哈希
 * @param password 明文密码
 * @returns 是否匹配
 */
export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
	return await verify(passwordHash, password, {
		memoryCost: 19456,
		timeCost: 2,
		outputLen: 32,
		parallelism: 1
	});
}

/**
 * 生成随机密码
 * @param length 密码长度
 * @returns 随机密码
 */
export function generatePassword(length: number = 12): string {
	const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
	let password = '';
	
	for (let i = 0; i < length; i++) {
		password += charset.charAt(Math.floor(Math.random() * charset.length));
	}
	
	return password;
}
