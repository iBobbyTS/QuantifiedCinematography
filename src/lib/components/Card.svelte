<script lang="ts">
	// Props
	export let title: string = '';
	export let description: string = '';
	export let buttons: Array<{
		text: string;
		color: string;
		onClick?: () => void;
	}> = [];
	export let color: string = 'blue';
	export let id: string | undefined = undefined;
	
	// 颜色配置
	const colorConfig = {
		blue: {
			border: 'border-blue-800 dark:border-blue-400',
			text: 'text-blue-800 dark:text-blue-400',
			hover: 'hover:bg-blue-600 hover:border-blue-500 hover:text-white dark:hover:bg-blue-400 dark:hover:border-blue-500 dark:hover:text-gray-900'
		},
		green: {
			border: 'border-green-800 dark:border-green-400',
			text: 'text-green-800 dark:text-green-400',
			hover: 'hover:bg-green-600 hover:border-green-500 hover:text-white dark:hover:bg-green-400 dark:hover:border-green-500 dark:hover:text-gray-900'
		},
		orange: {
			border: 'border-orange-600 dark:border-orange-400',
			text: 'text-orange-600 dark:text-orange-400',
			hover: 'hover:bg-orange-500 hover:border-orange-400 hover:text-white dark:hover:bg-orange-400 dark:hover:border-orange-500 dark:hover:text-gray-900'
		},
		purple: {
			border: 'border-purple-600 dark:border-purple-400',
			text: 'text-purple-600 dark:text-purple-400',
			hover: 'hover:bg-purple-500 hover:border-purple-400 hover:text-white dark:hover:bg-purple-400 dark:hover:border-purple-500 dark:hover:text-gray-900'
		},
		red: {
			border: 'border-red-600 dark:border-red-400',
			text: 'text-red-600 dark:text-red-400',
			hover: 'hover:bg-red-500 hover:border-red-400 hover:text-white dark:hover:bg-red-400 dark:hover:border-red-500 dark:hover:text-gray-900'
		}
	};
	
	// 获取当前颜色的配置
	$: currentColor = colorConfig[color as keyof typeof colorConfig] || colorConfig.blue;
</script>

<div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
	{#if id}
		<div id={id} class="scroll-mt-24 invisible pointer-events-none relative"></div>
	{/if}
	<h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
		{title}
	</h3>
	<p class="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
		{description}
	</p>
	
	<!-- Buttons Container -->
	<div class="space-y-3">
		{#each buttons as button}
			<button 
				class="w-full border-2 font-medium py-3 rounded-lg transition-all duration-200 {currentColor.border} {currentColor.text} {currentColor.hover}"
				onclick={button.onClick}
			>
				{button.text}
			</button>
		{/each}
	</div>
</div>
