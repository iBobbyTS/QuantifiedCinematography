<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';

	export let user: any;
	export let originalPermissions: number;
	export let onClose: () => void;
	export let onPermissionChanged: (permissions: number) => void;

	// 权限选项
	const permissionOptions = [
		{ bit: 0, label: 'Light', description: 'Access to lighting-related features' },
		{ bit: 1, label: 'Camera', description: 'Access to camera-related features' },
		{ bit: 2, label: 'Lens', description: 'Access to lens-related features' },
		{ bit: 31, label: 'Administrator', description: 'Full system access' }
	];

	// 当前选择的权限
	let currentPermissions: number = 0;
	let isLoading = false;
	let errorMessage = '';

	// 初始化权限
	onMount(() => {
		currentPermissions = originalPermissions;
	});

	// 检查权限是否被选中
	function isPermissionSelected(bit: number): boolean {
		return (currentPermissions & (1 << bit)) !== 0;
	}

	// 切换权限选择
	function togglePermission(bit: number) {
		if (bit === 31) {
			// Administrator 是互斥的
			if (isPermissionSelected(31)) {
				currentPermissions = 0;
			} else {
				currentPermissions = 1 << 31;
			}
		} else {
			// 其他权限可以组合
			if (isPermissionSelected(bit)) {
				currentPermissions &= ~(1 << bit);
			} else {
				currentPermissions |= (1 << bit);
			}
		}
	}

	// 检查权限是否有变化
	$: hasChanges = currentPermissions !== originalPermissions;

	// 提交权限修改
	async function submitPermissions() {
		if (!hasChanges) return;

		isLoading = true;
		errorMessage = '';

		try {
			const response = await fetch('/api/admin/user/change-permission', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					userId: user.id,
					permissions: currentPermissions
				})
			});

			if (response.ok) {
				onPermissionChanged(currentPermissions);
			} else {
				const errorData = await response.json();
				errorMessage = errorData.message || 'Failed to update permissions';
			}
		} catch (error) {
			console.error('Error updating permissions:', error);
			errorMessage = 'Network error occurred';
		} finally {
			isLoading = false;
		}
	}

	// 关闭弹窗
	function handleClose() {
		if (!isLoading) {
			onClose();
		}
	}

	// 点击背景关闭弹窗
	function handleBackgroundClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			handleClose();
		}
	}
</script>

<!-- Modal Backdrop -->
<div 
	class="fixed inset-0 bg-gray-900/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
	onclick={handleBackgroundClick}
>
	<!-- Modal Content -->
	<div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
		<!-- Header -->
		<div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
			<div class="flex items-center justify-between">
				<h3 class="text-lg font-medium text-gray-900 dark:text-white">
					Modify Permissions
				</h3>
				<button
					onclick={handleClose}
					disabled={isLoading}
					class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
				>
					<Icon icon="mdi:close" class="w-5 h-5" />
				</button>
			</div>
			<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
				User: {user.displayName} ({user.username})
			</p>
		</div>

		<!-- Body -->
		<div class="px-6 py-4">
			{#if errorMessage}
				<div class="mb-4 rounded-md bg-red-50 dark:bg-red-900/20 p-3">
					<div class="flex">
						<Icon icon="mdi:alert-circle" class="h-5 w-5 text-red-400" />
						<p class="ml-2 text-sm text-red-800 dark:text-red-200">
							{errorMessage}
						</p>
					</div>
				</div>
			{/if}

			<div class="space-y-3">
				{#each permissionOptions as option}
					<label class="flex items-start space-x-3 cursor-pointer">
						<input
							type="checkbox"
							checked={isPermissionSelected(option.bit)}
							onchange={() => togglePermission(option.bit)}
							disabled={isLoading}
							class="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
						/>
						<div class="flex-1">
							<div class="text-sm font-medium text-gray-900 dark:text-white">
								{option.label}
							</div>
							<div class="text-xs text-gray-500 dark:text-gray-400">
								{option.description}
							</div>
						</div>
					</label>
				{/each}
			</div>
		</div>

		<!-- Footer -->
		<div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
			<button
				onclick={handleClose}
				disabled={isLoading}
				class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
			>
				Cancel
			</button>
			<button
				onclick={submitPermissions}
				disabled={!hasChanges || isLoading}
				class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{#if isLoading}
					<Icon icon="mdi:loading" class="animate-spin -ml-1 mr-2 h-4 w-4" />
					Updating...
				{:else}
					Update Permissions
				{/if}
			</button>
		</div>
	</div>
</div>
