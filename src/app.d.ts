/*
 * TypeScript 类型声明文件
 * 定义 SvelteKit 应用的全局类型接口
 * 包括用户认证、会话管理等类型定义
 * 参考: https://svelte.dev/docs/kit/types#app.d.ts
 */
// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			user: import('$lib/server/auth').SessionValidationResult['user'];
			session: import('$lib/server/auth').SessionValidationResult['session'];
		}
	} // interface Error {}
	// interface Locals {}
} // interface PageData {}
// interface PageState {}

// interface Platform {}
export {};
