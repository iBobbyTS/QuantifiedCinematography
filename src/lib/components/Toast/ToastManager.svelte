<!--
  @fileoverview Toast Manager Component
  
  Manages multiple toast notifications with automatic stacking and positioning.
  New toasts appear above existing ones, and toasts automatically reposition
  when others are closed.
  
  @author Bobby Sun
  @version 1.0.0
-->

<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Toast from './Toast.svelte';

	// Toast 数据结构
	interface ToastData {
		id: string;
		title: string;
		message?: string;
		iconName: string;
		iconColor: string;
		duration: number;
		showCountdown: boolean;
	}

	// Toast 状态管理
	let toasts = $state<ToastData[]>([]);
	let nextId = $state(1);

	// 添加新的 Toast
	export function showToast(toast: Omit<ToastData, 'id'>) {
		const newToast: ToastData = {
			id: `toast-${nextId++}`,
			...toast
		};
		
		// 新 Toast 添加到数组开头（显示在上方）
		toasts = [newToast, ...toasts];
		
		return newToast.id;
	}

	// 移除 Toast
	export function hideToast(id: string) {
		toasts = toasts.filter(toast => toast.id !== id);
	}

	// 清除所有 Toast
	export function clearAllToasts() {
		toasts = [];
	}

	// 获取当前 Toast 数量
	export function getToastCount() {
		return toasts.length;
	}

	// 暴露方法给父组件
	export { showToast, hideToast, clearAllToasts, getToastCount };
</script>

<!-- Toast 容器 -->
<div class="fixed bottom-4 right-4 z-50 space-y-3 pointer-events-none">
	{#each toasts as toast, index (toast.id)}
		<div 
			class="pointer-events-auto transform transition-all duration-300 ease-out"
			style="transform: translateY({index * 8}px);"
		>
			<Toast
				title={toast.title}
				message={toast.message}
				iconName={toast.iconName}
				iconColor={toast.iconColor}
				duration={toast.duration}
				showCountdown={toast.showCountdown}
				onClose={() => hideToast(toast.id)}
			/>
		</div>
	{/each}
</div>
