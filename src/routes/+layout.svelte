<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	
	// 深色模式状态
	let isDarkMode = false;
	
	// 组件挂载时检查主题设置
	onMount(() => {
		try {
			// 检查本地存储的主题设置
			const savedTheme = localStorage.getItem('theme');
			if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
				isDarkMode = true;
				document.documentElement.classList.add('dark');
			}
		} catch (error) {
			console.error('Failed to initialize theme:', error);
		}
	});
</script>

<slot />
