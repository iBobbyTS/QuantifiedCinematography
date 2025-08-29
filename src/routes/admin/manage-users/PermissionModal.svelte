<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';
	import { USER_PERMISSIONS, UserPermissions } from '../../../lib/bitmask.js';

	export let user: any;
	export let originalPermissions: number;
	export let currentUser: any; // 当前登录用户
	export let onClose: () => void;
	export let onPermissionChanged: (permissions: number) => void;

	// 权限选项 - 直接使用权限值，不需要Math.log2()
	const permissionOptions = [
		{ permission: USER_PERMISSIONS.LIGHT, label: 'Light', description: 'Access to lighting-related features' },
		{ permission: USER_PERMISSIONS.CAMERA, label: 'Camera', description: 'Access to camera-related features' },
		{ permission: USER_PERMISSIONS.LENS, label: 'Lens', description: 'Access to lens-related features' },
		{ permission: USER_PERMISSIONS.ADMINISTRATOR, label: 'Administrator', description: 'Full system access' }
	];

	// 当前选择的权限
	let currentPermissions: number = 0;
	let isLoading = false;
	let errorMessage = '';
	let hasChanges = false;
	let isInitialized = false; // 跟踪是否已经初始化

	// 检查编辑对象是否是当前用户
	$: isEditingCurrentUser = currentUser && user && currentUser.id === user.id;

	// 响应式声明：当 originalPermissions 变化时重新初始化（但只在没有手动修改时）
	$: if (originalPermissions !== undefined && !isInitialized) {
		console.log('响应式更新: originalPermissions 变化为:', originalPermissions);
		currentPermissions = originalPermissions;
		isInitialized = true; // 标记为已初始化
		console.log('响应式更新: currentPermissions 设置为:', currentPermissions);
		console.log('响应式更新后检查权限:');
		console.log('Light (bit 0):', UserPermissions.hasLightPermission(currentPermissions));
		console.log('Camera (bit 1):', UserPermissions.hasCameraPermission(currentPermissions));
		console.log('Lens (bit 2):', UserPermissions.hasLensPermission(currentPermissions));
		console.log('Admin (bit 30):', UserPermissions.hasAdministratorPermission(currentPermissions));
	}

	// 初始化权限
	onMount(() => {
		console.log('=== 弹窗组件挂载 ===');
		console.log('接收到的 originalPermissions:', originalPermissions);
		console.log('originalPermissions 类型:', typeof originalPermissions);
		console.log('originalPermissions 二进制:', originalPermissions.toString(2));
		
		currentPermissions = originalPermissions;
		console.log('设置 currentPermissions:', currentPermissions);
		console.log('onMount后检查权限:');
		console.log('Light (bit 0):', UserPermissions.hasLightPermission(currentPermissions));
		console.log('Camera (bit 1):', UserPermissions.hasCameraPermission(currentPermissions));
		console.log('Lens (bit 2):', UserPermissions.hasLensPermission(currentPermissions));
		console.log('Admin (bit 30):', UserPermissions.hasAdministratorPermission(currentPermissions));
		console.log('初始 hasChanges 状态:', hasChanges);
	});

	// 检查权限是否被选中
	function isPermissionSelected(permission: number): boolean {
		return (currentPermissions & permission) !== 0;
	}

	// 切换权限选择
	function togglePermission(permission: number) {
		console.log('切换权限前 - currentPermissions:', currentPermissions, 'permission:', permission);
		console.log('切换权限前 - hasChanges:', hasChanges);
		
		let newPermissions: number;
		
		if (permission === USER_PERMISSIONS.ADMINISTRATOR) {
			// Administrator 是互斥的
			if (UserPermissions.hasPermission(currentPermissions, USER_PERMISSIONS.ADMINISTRATOR)) {
				newPermissions = 0;
			} else {
				newPermissions = USER_PERMISSIONS.ADMINISTRATOR;
			}
		} else {
			// 其他权限可以组合
			if (isPermissionSelected(permission)) {
				newPermissions = currentPermissions & ~permission;
			} else {
				newPermissions = currentPermissions | permission;
			}
		}
		
		// 更新权限并立即计算变化状态
		currentPermissions = newPermissions;
		hasChanges = currentPermissions !== originalPermissions;
		
		console.log('切换权限后 - currentPermissions:', currentPermissions);
		console.log('切换权限后 - hasChanges:', hasChanges);
	}

	// 检查权限是否有变化
	$: {
		hasChanges = currentPermissions !== originalPermissions;
		console.log('hasChanges 重新计算:');
		console.log('  currentPermissions:', currentPermissions, '(', currentPermissions.toString(2), ')');
		console.log('  originalPermissions:', originalPermissions, '(', originalPermissions.toString(2), ')');
		console.log('  hasChanges:', hasChanges);
	}

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
							checked={isPermissionSelected(option.permission)}
							onchange={() => togglePermission(option.permission)}
							disabled={isLoading || (isEditingCurrentUser && option.permission === USER_PERMISSIONS.ADMINISTRATOR)}
							class="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
						/>
						<div class="flex-1">
							<div class="text-sm font-medium text-gray-900 dark:text-white">
								{option.label}
								{#if isEditingCurrentUser && option.permission === USER_PERMISSIONS.ADMINISTRATOR}
									<span class="text-xs text-gray-500 dark:text-gray-400 ml-1">(Cannot modify own admin permission)</span>
								{/if}
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
