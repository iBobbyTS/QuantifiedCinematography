<script lang="ts">
    import { onMount } from 'svelte';
    import Icon from '@iconify/svelte';
    import * as m from '$lib/paraglide/messages.js';
    import { page } from '$app/stores';
    import { setLocale, getLocale } from '$lib/paraglide/runtime.js';
    import Dropdown from '$lib/components/Dropdown.svelte';
	let currentUser: any = null;
	$: currentUser = $page?.data?.user ?? null;
	
	// Props
	export let centerTitle: string = ''; // 本地化key，用于中间title
	export let centerTitleSize: string = '2xl'; // 中间标题字体大小 (text-2xl, text-3xl, text-4xl等)
	export let showBackButton: boolean = false; // 是否显示返回按钮
	export let backButtonUrl: string = '/'; // 返回按钮的URL
	export let backButtonText: string = 'navbar.backToHome'; // 返回按钮的文本key
	export let hideLoginButton: boolean = false; // 是否隐藏未登录时的登录按钮
	
	// 主题模式状态
	let currentTheme = 'system'; // 'light', 'dark', 'system'
	
	// 当前语言状态
	let currentLanguage = 'en'; // 默认英语
	
	// 语言选项
	const languageOptions = [
		{ code: 'en', name: 'English', flag: '🇺🇸' },
		{ code: 'zh-cn', name: '中文', flag: '🇨🇳' }
	];
	
	// 主题选项
	const themeOptions = [
		{ code: 'light', name: 'light', icon: 'mdi:weather-sunny' },
		{ code: 'dark', name: 'dark', icon: 'mdi:weather-night' },
		{ code: 'system', name: 'system', icon: 'mdi:monitor' }
	];
	
	// 应用主题（不保存到 localStorage）
	function applyTheme(theme: string, saveToStorage: boolean = false) {
		// 移除所有主题类
		document.documentElement.classList.remove('light', 'dark');
		
		if (theme === 'system') {
			// 跟随系统
			const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
			
			if (isSystemDark) {
				document.documentElement.classList.add('dark');
			} else {
				document.documentElement.classList.add('light');
			}
		} else {
			// 手动设置
			document.documentElement.classList.add(theme);
		}
		
		// 根据参数决定是否保存到本地存储
		if (saveToStorage) {
			localStorage.setItem('theme', theme);
		}
	}

	// 切换主题（用户主动操作）
	function changeTheme(theme: string) {
		currentTheme = theme;
		applyTheme(theme, true);
	}
	
	// 获取当前主题的显示名称
	function getThemeDisplayName(themeCode: string) {
		return m['theme.' + themeCode]();
	}
	
	// 获取当前主题的图标
	function getCurrentThemeIcon() {
		const option = themeOptions.find(t => t.code === currentTheme);
		return option ? option.icon : 'mdi:monitor';
	}
	
	// 响应式获取主题显示名称
	$: currentThemeDisplayName = m['theme.' + currentTheme]();
	
	// 响应式获取所有主题选项的本地化名称
	$: themeOptionsLocalized = themeOptions.map(theme => ({
		...theme,
		localizedName: m['theme.' + theme.code]()
	}));
	
	// 切换语言
	function changeLanguage(langCode: string) {
		try {
			// 使用ParaglideJS的setLocale函数
			setLocale(langCode, { reload: true });
		} catch (error) {
			console.error('🌐 语言切换失败:', error);
			// 如果ParaglideJS失败，回退到手动设置
			localStorage.setItem('locale', langCode);
			document.cookie = `PARAGLIDE_LOCALE=${langCode}; path=/; max-age=34560000`;
			window.location.reload();
		}
	}
	
	// 组件挂载时检查主题设置
	onMount(() => {
		try {
			// 检查本地存储的主题设置
			const savedTheme = localStorage.getItem('theme') || 'system';
			
			// 设置 currentTheme
			currentTheme = savedTheme;
			
			// 检查当前 DOM 是否已经有主题类，如果有则不重新应用
			const hasThemeClass = document.documentElement.classList.contains('dark') || 
								  document.documentElement.classList.contains('light');
			
			if (!hasThemeClass) {
				// 只有在没有主题类时才应用主题
				applyTheme(savedTheme, false);
			}
			
			// 获取当前语言
			try {
				currentLanguage = getLocale();
			} catch (error) {
				console.error('🌐 获取语言失败:', error);
				currentLanguage = 'en'; // 默认英语
			}
			
			// 监听系统主题变化
			const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
			
			mediaQuery.addEventListener('change', (e) => {
				// 只有在当前主题确实是 'system' 时才响应系统变化
				if (currentTheme === 'system') {
					applyTheme('system', false); // 不保存到 localStorage
				}
			});

		} catch (error) {
			console.error('❌ Failed to check theme:', error);
		}
	});
</script>

<nav class="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 shadow-lg border-b border-gray-200 dark:border-gray-700">
	<div class="mx-auto px-4 sm:px-6 lg:px-8">
		<div class="grid grid-cols-3 items-center h-16">
			<!-- Left side - Logo and Back button -->
			<div class="flex items-center space-x-3">
				<!-- Website Logo -->
				<a
					href="/"
					class="flex items-center hover:opacity-80 transition-opacity duration-200"
					title={m['navbar.backToHome']()}
				>
					<img 
						src="/favicon.svg" 
						alt="Quantified Cinematography" 
						class="w-8 h-8"
					/>
				</a>
				
				{#if showBackButton}
					<a
						href={backButtonUrl}
						class="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
					>
						<Icon icon="mdi:arrow-left" class="w-4 h-4" />
						<span class="hidden sm:inline">{m[backButtonText]()}</span>
					</a>
				{/if}
			</div>
			
			<!-- Center - Dynamic Title (always centered) -->
			<!-- 中间列始终占位，只有内容有无之分，避免右侧按钮漂移 -->
			<div class="flex justify-center items-center">
				{#if centerTitle}
					<h1 class="text-{centerTitleSize} font-semibold text-gray-900 dark:text-gray-100 text-center">
						{m[centerTitle]()}
					</h1>
				{:else}
					<!-- 占位元素，保持三列布局不变 -->
					<span aria-hidden="true"></span>
				{/if}
			</div>
			
			<!-- Right align - Language and Theme controls -->
			<div class="flex items-center justify-end space-x-2">
					{#if currentUser}
					<!-- User Menu -->
            <div>
                <Dropdown
                    placeholder={currentUser.nickname}
                    options={[
                        { value: 'account', label: m['user.account.title'](), icon: 'mdi:account-cog' },
                        { value: 'logout', label: m['auth.logout'](), icon: 'mdi:logout' }
                    ]}
                    widthClass="w-40"
                    on:change={async (e) => {
                        const v = e.detail as string;
                        if (v === 'account') {
                            window.location.href = '/user/account';
                        } else if (v === 'logout') {
                            try {
                                const response = await fetch('/user/logout', { method: 'POST' });
                                window.location.href = '/';
                            } catch {
                                window.location.href = '/';
                            }
                        }
                    }}
                />
            </div>
					{:else if !hideLoginButton}
					<!-- Login Button -->
					<a
						href="/user/login"
						class="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors duration-200"
					>
						<Icon icon="mdi:login" class="w-4 h-4" />
						<span class="hidden sm:inline">{m['auth.login']()}</span>
					</a>
				{/if}
				
				<!-- Language Selector -->
            <div>
                <Dropdown
                    placeholder={languageOptions.find(lang => lang.code === currentLanguage)?.name || 'Language'}
                    options={languageOptions.map((lang) => ({ value: lang.code, label: `${lang.flag} ${lang.name}` }))}
                    widthClass="w-24"
                    on:change={(e) => changeLanguage(e.detail as string)}
                />
            </div>
				
				<!-- Theme Selector -->
            <div>
                <Dropdown
                    placeholder={currentThemeDisplayName}
                    options={themeOptionsLocalized.map((t) => ({ value: t.code, label: t.localizedName, icon: t.icon }))}
                    widthClass="w-36"
                    on:change={(e) => changeTheme(e.detail as string)}
                />
            </div>
			</div>
		</div>
	</div>
</nav>

