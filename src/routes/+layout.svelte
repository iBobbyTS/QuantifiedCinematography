<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { i18nReady, initializeI18n } from '../lib/i18n';
	
	// 深色模式状态
	let isDarkMode = false;
	
	// 组件挂载时检查主题设置和初始化 i18n
	onMount(async () => {
		try {
			// 检查本地存储的主题设置
			const savedTheme = localStorage.getItem('theme');
			if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
				isDarkMode = true;
				document.documentElement.classList.add('dark');
			}
			
			// 确保 i18n 初始化
			await initializeI18n();
		} catch (error) {
			console.error('Failed to initialize:', error);
		}
	});
</script>

{#if $i18nReady}
	<slot />
{:else}
	<!-- Loading State -->
	<div class="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
		<div class="text-center">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
			<p class="text-gray-600 dark:text-gray-400">Loading...</p>
		</div>
	</div>
{/if}
