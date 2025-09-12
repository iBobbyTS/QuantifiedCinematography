import { hash } from '@node-rs/argon2';

async function generatePasswordHash() {
	console.log('🔐 生成密码哈希...');
	
	const password = 'admin123';
	const hashResult = await hash(password, {
		memoryCost: 19456,
		timeCost: 2,
		outputLen: 32,
		parallelism: 1
	});
	
	console.log('密码:', password);
	console.log('哈希:', hashResult);
	
	const testPassword = 'test123';
	const testHashResult = await hash(testPassword, {
		memoryCost: 19456,
		timeCost: 2,
		outputLen: 32,
		parallelism: 1
	});
	
	console.log('\n测试密码:', testPassword);
	console.log('测试哈希:', testHashResult);
}

generatePasswordHash().catch(console.error);
