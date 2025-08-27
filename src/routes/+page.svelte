<script lang="ts">
	import { locale } from 'svelte-i18n';
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';
	import { _ } from 'svelte-i18n';
	
	// 主题模式状态
	let currentTheme = 'system'; // 'light', 'dark', 'system'
	
	// 语言选项
	const languageOptions = [
		{ code: 'en', name: 'English', flag: '🇺🇸' },
		{ code: 'zh-CN', name: '中文', flag: '🇨🇳' }
	];
	
	// 主题选项
	const themeOptions = [
		{ code: 'light', name: 'light', icon: 'mdi:weather-sunny' },
		{ code: 'dark', name: 'dark', icon: 'mdi:weather-night' },
		{ code: 'system', name: 'system', icon: 'mdi:monitor' }
	];
	
	// 产品数量状态
	let productCount = 0;
	
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
		return $_('theme.' + themeCode);
	}
	
	// 获取当前主题的图标
	function getCurrentThemeIcon() {
		const option = themeOptions.find(t => t.code === currentTheme);
		return option ? option.icon : 'mdi:monitor';
	}
	
	// 切换语言
	function changeLanguage(langCode: string) {
		locale.set(langCode);
		// 保存语言设置到localStorage
		localStorage.setItem('locale', langCode);
	}
	
	// 加载产品数量
	async function loadProductCount() {
		try {
			// 这里应该调用实际的API，现在先用模拟数据
			// const response = await fetch('/api/products/count');
			// const data = await response.json();
			// productCount = data.count;
			
			// 模拟数据
			productCount = 42;
		} catch (error) {
			console.error('Failed to load product count:', error);
			productCount = 0;
		}
	}
	
	// 组件挂载时检查主题设置
	onMount(() => {
		try {
			// 检查本地存储的主题设置
			const savedTheme = localStorage.getItem('theme') || 'system';
			const savedLocale = localStorage.getItem('locale') || 'en'; // 默认英语
			
			changeTheme(savedTheme);
			locale.set(savedLocale); // 初始化语言
			
			// 监听系统主题变化
			const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
			
			mediaQuery.addEventListener('change', (e) => {
				
				if (currentTheme === 'system') {
					changeTheme('system');
				}
			});
			
			// 加载产品数量
			loadProductCount();
		} catch (error) {
			console.error('❌ Failed to check theme:', error);
		}
	});
</script>

<svelte:head>
	<title>Quantified Cinematography</title>
</svelte:head>

<div class="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200">
	<!-- Navbar -->
	<nav class="bg-white dark:bg-gray-800 shadow-lg border-b border-gray-200 dark:border-gray-700">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex justify-between items-center h-16">
				<!-- Left side - Logo/Title -->
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<h1 class="text-2xl font-bold text-gray-900 dark:text-white">
							Quantified Cinematography
						</h1>
					</div>
				</div>
				
				<!-- Center - Main Title -->
				<div class="hidden md:block">
					<h2 class="text-xl font-semibold text-gray-700 dark:text-gray-300">
						Quantified Cinematography
					</h2>
				</div>
				
				<!-- Right side - Language and Theme controls -->
				<div class="flex items-center space-x-4">
					<!-- Language Selector -->
					<div class="relative">
						<button
							class="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
							on:click={() => document.getElementById('languageDropdown')?.classList.toggle('hidden')}
						>
							<Icon icon="mdi:translate" class="w-5 h-5" />
							<span class="hidden sm:inline">
								{languageOptions.find(lang => lang.code === $locale)?.name || 'Language'}
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
								{getThemeDisplayName(currentTheme)}
							</span>
							<Icon icon="mdi:chevron-down" class="w-4 h-4" />
						</button>
						
						<!-- Theme Dropdown -->
						<div
							id="themeDropdown"
							class="hidden absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50"
						>
							{#each themeOptions as theme}
								<button
									class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 transition-colors duration-200"
									on:click={() => {
										changeTheme(theme.code);
										document.getElementById('themeDropdown')?.classList.add('hidden');
									}}
								>
									<Icon icon={theme.icon} class="w-5 h-5" />
									<span>{getThemeDisplayName(theme.code)}</span>
								</button>
							{/each}
						</div>
					</div>
				</div>
			</div>
		</div>
	</nav>
	
	<!-- Main Content -->
	<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
		<!-- Introduction Card -->
		<div class="w-4/5 mx-auto mb-12 lg:w-4/5 xl:w-4/5">
			<div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
				<h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-4 text-center">
					{$_('testing.intro.title')}
				</h1>
				<p class="text-lg text-gray-600 dark:text-gray-400 text-center leading-relaxed">
					{$_('testing.intro.description')}
				</p>
			</div>
		</div>
		
		<!-- Lighting Section -->
		<div class="mb-12">
			<h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
				{$_('testing.lighting.title')}
			</h2>
			
			<!-- Cards Grid Container -->
			<div class="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
				<!-- Products Card -->
				<div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
					<h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
						{$_('testing.lighting.products.title').replace('{{count}}', productCount.toString())}
					</h3>
					<p class="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
						{$_('testing.lighting.products.description')}
					</p>
					<button class="w-full border-2 border-blue-800 text-blue-800 hover:bg-blue-800 hover:text-white font-medium py-3 rounded-lg transition-all duration-200 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-400 dark:hover:text-gray-900">
						{$_('testing.lighting.products.button')}
					</button>
				</div>
				
				<!-- Brightness Testing Card -->
				<div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
					<h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
						{$_('testing.lighting.brightness.title')}
					</h3>
					<p class="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
						{$_('testing.lighting.brightness.description')}
					</p>
					
					<!-- Brightness Test Buttons -->
					<div class="space-y-3">
						<button class="w-full border-2 border-green-800 text-green-800 hover:bg-green-600 hover:border-green-600 hover:text-white font-medium py-3 rounded-lg transition-all duration-200 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-400 dark:hover:text-gray-900">
							{$_('testing.lighting.brightness.buttons.cct_illuminance')}
						</button>
						<button class="w-full border-2 border-green-800 text-green-800 hover:bg-green-600 hover:border-green-600 hover:text-white font-medium py-3 rounded-lg transition-all duration-200 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-400 dark:hover:text-gray-900">
							{$_('testing.lighting.brightness.buttons.brightness_illuminance')}
						</button>
					</div>
				</div>
				
				<!-- White Light Quality Testing Card -->
				<div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
					<h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
						{$_('testing.lighting.white_light_quality.title')}
					</h3>
					<p class="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
						{$_('testing.lighting.white_light_quality.description')}
					</p>
					
					<!-- Quality Test Buttons -->
					<div class="space-y-3">
						<button class="w-full border-2 border-orange-600 text-orange-600 hover:bg-orange-600 hover:text-white font-medium py-3 rounded-lg transition-all duration-200 dark:border-orange-400 dark:text-orange-400 dark:hover:bg-orange-400 dark:hover:text-gray-900">
							{$_('testing.lighting.white_light_quality.buttons.cct_vs_actual')}
						</button>
						<button class="w-full border-2 border-orange-600 text-orange-600 hover:bg-orange-600 hover:text-white font-medium py-3 rounded-lg transition-all duration-200 dark:border-orange-400 dark:text-orange-400 dark:hover:bg-orange-400 dark:hover:text-gray-900">
							{$_('testing.lighting.white_light_quality.buttons.cct_vs_duv')}
						</button>
						<button class="w-full border-2 border-orange-600 text-orange-600 hover:bg-orange-600 hover:text-white font-medium py-3 rounded-lg transition-all duration-200 dark:border-orange-400 dark:text-orange-400 dark:hover:bg-orange-400 dark:hover:text-gray-900">
							{$_('testing.lighting.white_light_quality.buttons.brightness_vs_duv')}
						</button>
						<button class="w-full border-2 border-orange-600 text-orange-600 hover:bg-orange-600 hover:text-white font-medium py-3 rounded-lg transition-all duration-200 dark:border-orange-400 dark:text-orange-400 dark:hover:bg-orange-400 dark:hover:text-gray-900">
							{$_('testing.lighting.white_light_quality.buttons.cct_vs_color_rendering')}
						</button>
						<button class="w-full border-2 border-orange-600 text-orange-600 hover:bg-orange-600 hover:text-white font-medium py-3 rounded-lg transition-all duration-200 dark:border-orange-400 dark:text-orange-400 dark:hover:bg-orange-400 dark:hover:text-gray-900">
							{$_('testing.lighting.white_light_quality.buttons.spectrum')}
						</button>
					</div>
				</div>
				
				<!-- Color Light Testing Card -->
				<div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
					<h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
						{$_('testing.lighting.color_light.title')}
					</h3>
					<p class="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
						{$_('testing.lighting.color_light.description')}
					</p>
					<button class="w-full border-2 border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white font-medium py-3 rounded-lg transition-all duration-200 dark:border-purple-400 dark:text-purple-400 dark:hover:bg-purple-400 dark:hover:text-gray-900">
						{$_('testing.lighting.color_light.button')}
					</button>
				</div>
			</div>
		</div>
	</main>
</div>

<style>
	/* 确保下拉菜单在深色模式下正确显示 */
	#languageDropdown, #themeDropdown {
		backdrop-filter: blur(10px);
	}
	
	/* 响应式设计 */
	@media (max-width: 1024px) {
		.w-4\/5 {
			width: 100%;
		}
	}
</style>
