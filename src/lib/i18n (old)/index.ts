import { init, register, getLocaleFromNavigator, waitLocale } from 'svelte-i18n';
import { writable } from 'svelte/store';

// 注册语言
register('en', () => import('./locales/en.json'));
register('zh-CN', () => import('./locales/zh-CN.json'));

// 获取初始语言设置
function getInitialLocale(): string {
	if (typeof window !== 'undefined') {
		// 检查localStorage中是否有保存的语言设置
		const savedLocale = localStorage.getItem('locale');
		if (savedLocale && (savedLocale === 'en' || savedLocale === 'zh-CN')) {
			return savedLocale;
		}
		
		// 如果没有保存的设置，读取系统语言
		const systemLocale = getLocaleFromNavigator();
		// 将系统语言映射到我们支持的语言
		if (systemLocale && systemLocale.startsWith('zh')) {
			return 'zh-CN';
		}
		return 'en'; // 默认英语
	}
	return 'en';
}

// 初始化 i18n
init({
	fallbackLocale: 'en',
	initialLocale: getInitialLocale(),
});

// 使用 Svelte store 来管理 i18n 状态
export const i18nReady = writable(false);

async function initializeI18n() {
	try {
		await waitLocale();
		
		// 如果是初次加载且没有保存的语言设置，保存当前语言到localStorage
		if (typeof window !== 'undefined') {
			const savedLocale = localStorage.getItem('locale');
			if (!savedLocale) {
				const currentLocale = getInitialLocale();
				localStorage.setItem('locale', currentLocale);
			}
		}
		
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

