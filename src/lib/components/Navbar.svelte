<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { page } from '$app/stores';
	import { setLocale, getLocale } from '$lib/paraglide/runtime.js';
	let currentUser: any = null;
	$: currentUser = $page?.data?.user ?? null;
	
	// Props
	export let centerTitle: string = ''; // 本地化key，用于中间title
	export let showBackButton: boolean = false; // 是否显示返回按钮
	export let backButtonUrl: string = '/'; // 返回按钮的URL
	export let backButtonText: string = 'navbar.backToHome'; // 返回按钮的文本key
	
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
	
	// 切换主题
	function changeTheme(theme: string) {
		currentTheme = theme;
		
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
		
		// 保存到本地存储
		localStorage.setItem('theme', theme);
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
		console.log('🌐 切换语言到:', langCode);
		console.log('🌐 当前语言:', getLocale());
		
		try {
			// 使用ParaglideJS的setLocale函数
			setLocale(langCode, { reload: true });
			console.log('🌐 语言切换成功');
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
		
		changeTheme(savedTheme);
		
		// 获取当前语言
		try {
			currentLanguage = getLocale();
			console.log('🌐 组件挂载时获取到语言:', currentLanguage);
		} catch (error) {
			console.error('🌐 获取语言失败:', error);
			currentLanguage = 'en'; // 默认英语
		}
			
			// 监听系统主题变化
			const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
			
			mediaQuery.addEventListener('change', (e) => {
				if (currentTheme === 'system') {
					changeTheme('system');
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
			<!-- Left side - Back button or empty space -->
			<div class="flex items-center">
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
			{#if centerTitle}
				<div class="flex justify-center items-center">
					<h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100 text-center">
						{m[centerTitle]()}
					</h1>
				</div>
			{/if}
			
			<!-- Right align - Language and Theme controls -->
			<div class="flex items-center justify-end space-x-4">
				{#if currentUser}
					<!-- User Menu -->
					<div class="relative">
						<button
							class="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
							on:click={() => document.getElementById('userDropdown')?.classList.toggle('hidden')}
						>
							<Icon icon="mdi:account" class="w-5 h-5" />
							<span class="hidden sm:inline">{currentUser.nickname}</span>
							<Icon icon="mdi:chevron-down" class="w-4 h-4" />
						</button>
						<div id="userDropdown" class="hidden absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
							<button
								class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
								on:click={async () => {
									try {
										console.log('🚪 开始登出...');
										const response = await fetch('/logout', { method: 'POST' });
										if (response.ok) {
											console.log('✅ 登出成功，重定向到首页');
											window.location.href = '/';
										} else {
											console.error('❌ 登出失败:', response.status);
											// 即使登出失败，也重定向到首页
											window.location.href = '/';
										}
									} catch (error) {
										console.error('💥 登出过程中发生错误:', error);
										// 即使发生错误，也重定向到首页
										window.location.href = '/';
									}
								}}
							>
								<Icon icon="mdi:logout" class="w-4 h-4 inline mr-2" /> {m['auth.logout']()}
							</button>
							<a href="/user/change-password" class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
								<Icon icon="mdi:key-variant" class="w-4 h-4 inline mr-2" /> {m['auth.changePassword']()}
							</a>
						</div>
					</div>
				{:else}
					<!-- Login Button -->
					<a
						href="/login"
						class="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors duration-200"
					>
						<Icon icon="mdi:login" class="w-4 h-4" />
						<span class="hidden sm:inline">{m['auth.login']()}</span>
					</a>
				{/if}
				
				<!-- Language Selector -->
				<div class="relative">
					<button
						class="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
						on:click={() => document.getElementById('languageDropdown')?.classList.toggle('hidden')}
					>
						<Icon icon="mdi:translate" class="w-5 h-5" />
						<span class="hidden sm:inline">
							{languageOptions.find(lang => lang.code === currentLanguage)?.name || 'Language'}
						</span>
						<Icon icon="mdi:chevron-down" class="w-4 h-4" />
					</button>
					
					<!-- Language Dropdown -->
					<div
						id="languageDropdown"
						class="hidden absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50"
					>
						{#each languageOptions as lang}
							<button
								class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 transition-colors duration-200"
								on:click={() => {
									changeLanguage(lang.code);
									document.getElementById('languageDropdown')?.classList.add('hidden');
								}}
							>
								<span class="text-lg">{lang.flag}</span>
								<span>{lang.name}</span>
							</button>
						{/each}
					</div>
				</div>
				
				<!-- Theme Selector -->
				<div class="relative">
					<button
						class="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
						on:click={() => document.getElementById('themeDropdown')?.classList.toggle('hidden')}
					>
						<Icon icon={getCurrentThemeIcon()} class="w-5 h-5" />
						<span class="hidden sm:inline">
							{currentThemeDisplayName}
						</span>
						<Icon icon="mdi:chevron-down" class="w-4 h-4" />
					</button>
					
					<!-- Theme Dropdown -->
					<div
						id="themeDropdown"
						class="hidden absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50"
					>
						{#each themeOptionsLocalized as theme}
							<button
								class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 transition-colors duration-200"
								on:click={() => {
									changeTheme(theme.code);
									document.getElementById('themeDropdown')?.classList.add('hidden');
								}}
							>
								<Icon icon={theme.icon} />
								<span>{theme.localizedName}</span>
							</button>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>
</nav>

<style>
	/* 确保下拉菜单在深色模式下正确显示 */
	#languageDropdown, #themeDropdown {
		backdrop-filter: blur(10px);
	}
</style>
