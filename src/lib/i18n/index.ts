import { init, register, getLocaleFromNavigator, waitLocale } from 'svelte-i18n';
import { writable } from 'svelte/store';

// 注册语言
register('en', () => import('./locales/en.json'));
register('zh-CN', () => import('./locales/zh-CN.json'));

// 初始化 i18n
init({
	fallbackLocale: 'en',
	initialLocale: getLocaleFromNavigator(),
});

// 使用 Svelte store 来管理 i18n 状态
export const i18nReady = writable(false);

async function initializeI18n() {
	try {
		await waitLocale();
		i18nReady.set(true);
		console.log('i18n initialized successfully');
	} catch (error) {
		console.error('Failed to initialize i18n:', error);
		// 即使失败也设置为就绪状态，避免无限加载
		i18nReady.set(true);
	}
}

// 在客户端环境下初始化
if (typeof window !== 'undefined') {
	// 使用 setTimeout 确保在下一个事件循环中执行
	setTimeout(() => {
		initializeI18n();
	}, 0);
}

export { initializeI18n };

