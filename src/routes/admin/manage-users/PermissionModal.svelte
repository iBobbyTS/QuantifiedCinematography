<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Icon from '@iconify/svelte';
	import { USER_PERMISSIONS, UserPermissions } from '../../../lib/bitmask.js';

	export let user: any;
	export let originalPermissions: number;
	export let currentUser: any; // 当前登录用户
	export let onClose: () => void;
	export let onPermissionChanged: (permissions: number) => void;

	// 权限选项 - 使用国际化函数
	const permissionOptions = [
		{ 
			permission: USER_PERMISSIONS.LIGHT, 
			label: $_('testing.administrator.manage_users.permission_modal.permission_options.light.label'), 
			description: $_('testing.administrator.manage_users.permission_modal.permission_options.light.description') 
		},
		{ 
			permission: USER_PERMISSIONS.CAMERA, 
			label: $_('testing.administrator.manage_users.permission_modal.permission_options.camera.label'), 
			description: $_('testing.administrator.manage_users.permission_modal.permission_options.camera.description') 
		},
		{ 
			permission: USER_PERMISSIONS.LENS, 
			label: $_('testing.administrator.manage_users.permission_modal.permission_options.lens.label'), 
			description: $_('testing.administrator.manage_users.permission_modal.permission_options.lens.description') 
		},
		{ 
			permission: USER_PERMISSIONS.ADMINISTRATOR, 
			label: $_('testing.administrator.manage_users.permission_modal.permission_options.administrator.label'), 
			description: $_('testing.administrator.manage_users.permission_modal.permission_options.administrator.description') 
		}
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
		currentPermissions = originalPermissions;
		isInitialized = true; // 标记为已初始化
	}

	// 初始化权限
	onMount(() => {
		currentPermissions = originalPermissions;
	});

	// 检查权限是否被选中
	function isPermissionSelected(permission: number): boolean {
		return (currentPermissions & permission) !== 0;
	}

	// 切换权限选择
	function togglePermission(permission: number) {
		let newPermissions: number;
		
		if (permission === USER_PERMISSIONS.ADMINISTRATOR) {
			// Administrator 权限可以与其他权限组合
			if (isPermissionSelected(permission)) {
				newPermissions = currentPermissions & ~permission;
			} else {
				newPermissions = currentPermissions | permission;
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
	}

	// 检查权限是否有变化
	$: {
		hasChanges = currentPermissions !== originalPermissions;
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
				errorMessage = errorData.message || $_('testing.administrator.manage_users.permission_modal.errors.failed_to_update');
			}
		} catch (error) {
			console.error('Error updating permissions:', error);
			errorMessage = $_('testing.administrator.manage_users.permission_modal.errors.network_error');
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
					{$_('testing.administrator.manage_users.permission_modal.title')}
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
				{$_('testing.administrator.manage_users.permission_modal.user_info').replace('{displayName}', user.displayName).replace('{username}', user.username)}
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
									<span class="text-xs text-gray-500 dark:text-gray-400 ml-1">{$_('testing.administrator.manage_users.permission_modal.permission_options.administrator.cannot_modify_own')}</span>
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
				{$_('testing.administrator.manage_users.permission_modal.buttons.cancel')}
			</button>
			<button
				onclick={submitPermissions}
				disabled={!hasChanges || isLoading}
				class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{#if isLoading}
					<Icon icon="mdi:loading" class="animate-spin -ml-1 mr-2 h-4 w-4" />
					{$_('testing.administrator.manage_users.permission_modal.buttons.updating')}
				{:else}
					{$_('testing.administrator.manage_users.permission_modal.buttons.update')}
				{/if}
			</button>
		</div>
	</div>
</div>
