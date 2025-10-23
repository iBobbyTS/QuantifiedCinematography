<!--
  @fileoverview Toast notification component
  
  Provides a toast notification that appears in the bottom-right corner
  with customizable title, content, action button, and countdown timer.
  
  @author Bobby Sun
  @version 1.0.0
-->

<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Icon from '@iconify/svelte';

	let {
		isVisible = $bindable(),
		title = 'Notification',
		message = '',
		iconName = 'mdi:information',
		iconColor = 'text-blue-500',
		duration = 5000, // 5 seconds
		showCountdown = true,
		onClose = () => {}
	} = $props<{
		isVisible: boolean;
		title?: string;
		message?: string;
		iconName?: string;
		iconColor?: string;
		duration?: number;
		showCountdown?: boolean;
		onClose?: () => void;
	}>();

	let progress = $state(100);
	let timer: ReturnType<typeof setTimeout> | null = null;
	let progressTimer: ReturnType<typeof setInterval> | null = null;

	// 开始倒计时
	function startCountdown() {
		if (timer) clearTimeout(timer);
		if (progressTimer) clearInterval(progressTimer);

		const startTime = Date.now();
		const totalDuration = duration;

		// 更新进度条
		progressTimer = setInterval(() => {
			const elapsed = Date.now() - startTime;
			const remaining = Math.max(0, totalDuration - elapsed);
			progress = (remaining / totalDuration) * 100;

			if (remaining <= 0) {
				closeToast();
			}
		}, 50);

		// 自动关闭
		timer = setTimeout(() => {
			closeToast();
		}, duration);
	}

	// 关闭 Toast
	function closeToast() {
		if (timer) {
			clearTimeout(timer);
			timer = null;
		}
		if (progressTimer) {
			clearInterval(progressTimer);
			progressTimer = null;
		}
		isVisible = false;
		onClose();
	}


	// 监听 isVisible 变化
	$effect(() => {
		if (isVisible) {
			progress = 100;
			startCountdown();
		}
	});

	// 组件销毁时清理定时器
	onDestroy(() => {
		if (timer) clearTimeout(timer);
		if (progressTimer) clearInterval(progressTimer);
	});
</script>

{#if isVisible}
	<div class="fixed bottom-4 right-4 z-50 max-w-sm w-full">
		<div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
			<!-- Progress bar -->
			{#if showCountdown}
				<div class="h-1 bg-gray-200 dark:bg-gray-700">
					<div 
						class="h-full bg-blue-500 transition-all duration-50 ease-linear"
						style="width: {progress}%"
					></div>
				</div>
			{/if}

			<!-- Toast content -->
			<div class="p-4">
				<div class="flex items-start space-x-3">
					<!-- Icon -->
					<div class="flex-shrink-0">
						<Icon icon={iconName} class="w-6 h-6 {iconColor}" />
					</div>

					<!-- Content -->
					<div class="flex-1 min-w-0">
						<h3 class="text-lg font-semibold text-gray-900 dark:text-white">
							{title}
						</h3>
						{#if message}
							<p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
								{message}
							</p>
						{/if}
					</div>

					<!-- Close button -->
					<button
						onclick={closeToast}
						class="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
					>
						<Icon icon="mdi:close" class="w-5 h-5" />
					</button>
				</div>

			</div>
		</div>
	</div>
{/if}
