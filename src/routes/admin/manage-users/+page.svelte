<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import * as m from '$lib/paraglide/messages.js';
	import Icon from '@iconify/svelte';
	import type { PageData } from './$types';
	import Navbar from '$lib/components/Navbar.svelte';
	import { USER_PERMISSIONS, UserPermissions } from '$lib/permission/bitmask.js';
	import { PERMISSION_OPTIONS, PERMISSION_I18N_KEYS } from '$lib/permission/permissions.js';
	import ConfirmModal from '$lib/components/Modal/ConfirmModal.svelte';
	import Toast from '$lib/components/Toast.svelte';

	export let data: PageData;

	// 用户数据
	$: users = data.users;

	// 弹窗状态
	let showPermissionModal = false;
	let selectedUser: any = null;
	let originalPermissions: number = 0;
	let currentPermissions: number = 0;
	let isPermissionModalLoading = false;
	let permissionModalErrorMessage = '';
	let hasPermissionChanges = false;
	let isPermissionModalInitialized = false;

	// 删除确认弹窗状态
	let showDeleteConfirm = false;
	let userToDelete: any = null;
	let isDeleting = false;
	
	// Toast 通知状态
	let showSuccessToast = false;
	let showErrorToast = false;
	let toastMessage = '';

	// 检查编辑对象是否是当前用户
	$: isEditingCurrentUser = selectedUser && $page.data.user && selectedUser.id === $page.data.user.id;

	// 响应式声明：当 originalPermissions 变化时重新初始化
	$: if (originalPermissions !== undefined && !isPermissionModalInitialized) {
		currentPermissions = originalPermissions;
		isPermissionModalInitialized = true;
	}

	// 检查权限是否有变化
	$: {
		hasPermissionChanges = currentPermissions !== originalPermissions;
	}

	// 权限显示函数 - 使用国际化函数，响应语言变化
	$: getPermissionText = (permission: number): string => {
		const permissionNames: string[] = [];
		
		if (UserPermissions.hasLightPermission(permission)) {
			permissionNames.push(m[PERMISSION_OPTIONS[0].labelKey]());
		}
		if (UserPermissions.hasCameraPermission(permission)) {
			permissionNames.push(m[PERMISSION_OPTIONS[1].labelKey]());
		}
		if (UserPermissions.hasLensPermission(permission)) {
			permissionNames.push(m[PERMISSION_OPTIONS[2].labelKey]());
		}
		if (UserPermissions.hasAdministratorPermission(permission)) {
			permissionNames.push(m[PERMISSION_OPTIONS[3].labelKey]());
		}
		
		return permissionNames.length > 0 ? permissionNames.join(', ') : m[PERMISSION_I18N_KEYS.permissions.none]();
	};

	// 添加用户
	function addUser() {
		goto('/admin/add-user');
	}

	// 打开权限修改弹窗
	function openPermissionModal(user: any) {
		selectedUser = user;
		originalPermissions = user.permission;
		currentPermissions = user.permission;
		isPermissionModalInitialized = false;
		permissionModalErrorMessage = '';
		showPermissionModal = true;
	}

	// 关闭权限修改弹窗
	function closePermissionModal() {
		showPermissionModal = false;
		selectedUser = null;
		originalPermissions = 0;
		currentPermissions = 0;
		isPermissionModalInitialized = false;
		permissionModalErrorMessage = '';
	}

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
		hasPermissionChanges = currentPermissions !== originalPermissions;
	}

	// 提交权限修改
	async function submitPermissions() {
		if (!hasPermissionChanges) return;

		isPermissionModalLoading = true;
		permissionModalErrorMessage = '';

		try {
			const response = await fetch('/api/admin/user/change-permission', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					userId: selectedUser.id,
					permissions: currentPermissions
				})
			});

			if (response.ok) {
				// 更新 users 数组中对应的用户权限
				const userIndex = users.findIndex(u => u.id === selectedUser.id);
				if (userIndex !== -1) {
					users[userIndex].permission = currentPermissions;
				}
				closePermissionModal();
			} else {
				const errorData = await response.json();
				permissionModalErrorMessage = errorData.message || m[PERMISSION_I18N_KEYS.modal.errors.failedToUpdate]();
			}
		} catch (error) {
			console.error('Error updating permissions:', error);
			permissionModalErrorMessage = m[PERMISSION_I18N_KEYS.modal.errors.networkError]();
		} finally {
			isPermissionModalLoading = false;
		}
	}

	// 关闭权限弹窗
	function handlePermissionModalClose() {
		if (!isPermissionModalLoading) {
			closePermissionModal();
		}
	}

	// 点击背景关闭弹窗
	function handlePermissionModalBackgroundClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			handlePermissionModalClose();
		}
	}

	// 权限修改成功后的回调（保留兼容性）
	function onPermissionChanged(newPermissions: number) {
		if (selectedUser) {
			// 更新 users 数组中对应的用户权限
			const userIndex = users.findIndex(u => u.id === selectedUser.id);
			if (userIndex !== -1) {
				users[userIndex].permission = newPermissions;
			}
		}
		closePermissionModal();
	}

	// 禁用用户
	function disableUser(userId: string) {
		if (confirm(m['administrator.manage_users.confirmations.disable_user']())) {
			// TODO: 实现禁用用户逻辑
		}
	}

	// 打开删除确认弹窗
	function openDeleteConfirm(user: any) {
		userToDelete = user;
		showDeleteConfirm = true;
	}

	// 关闭删除确认弹窗
	function closeDeleteConfirm() {
		showDeleteConfirm = false;
		userToDelete = null;
	}

	// 确认删除用户
	async function confirmDeleteUser() {
		if (!userToDelete) return;

		isDeleting = true;

		try {
			const fd = new FormData();
			fd.set('userId', String(userToDelete.id));
			const response = await fetch('?/deleteUser', {
				method: 'POST',
				body: fd
			});

			if (response.ok) {
				// 解析 action envelope
				let ok = true;
				try {
					const envelope = await response.json();
					if (envelope?.type === 'failure') ok = false;
					else if (envelope?.type === 'success') ok = true;
				} catch {}
				if (ok) {
					const userIndex = users.findIndex(u => u.id === userToDelete.id);
					if (userIndex !== -1) {
						users.splice(userIndex, 1);
					}
					closeDeleteConfirm();
					// 显示成功 Toast
					showSuccessToast = true;
					return;
				}
			}
			// 非 2xx 或 envelope 标记失败
			let msg = 'Failed to delete user';
			try {
				const data = await response.json();
				msg = data?.message || msg;
			} catch {}
			// 显示错误 Toast 而不是 alert
			toastMessage = msg;
			showErrorToast = true;
		} catch (error) {
			console.error('Error deleting user:', error);
			// 显示网络错误 Toast 而不是 alert
			toastMessage = 'Network error occurred while deleting user';
			showErrorToast = true;
		} finally {
			isDeleting = false;
		}
	}

	// 处理成功 Toast
	function handleSuccessToastClose() {
		showSuccessToast = false;
	}

	// 处理错误 Toast
	function handleErrorToastClose() {
		showErrorToast = false;
		toastMessage = '';
	}
</script>

<svelte:head>
	<title>{m['administrator.manage_users.title']()} - {m['app.title']()}</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16">
	<!-- Navbar -->
	<Navbar centerTitle="app.title" showBackButton={true} />
	
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<!-- Header -->
		<div class="mb-8">
			<div class="flex items-center justify-between">
				<div>
					<h1 class="text-3xl font-bold text-gray-900 dark:text-white">
						{m['administrator.manage_users.title']()}
					</h1>
					<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
						{m['administrator.manage_users.subtitle']()}
					</p>
				</div>
				<button
					onclick={addUser}
					class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-500 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400 dark:hover:border-blue-500"
				>
					<Icon icon="mdi:plus" class="w-4 h-4 mr-2" />
					{m['administrator.manage_users.add_user']()}
				</button>
			</div>
		</div>

		<!-- Users Table -->
		<div class="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
			<div class="px-4 py-5 sm:p-6">
				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
						<thead class="bg-gray-50 dark:bg-gray-700">
							<tr>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
									{m['administrator.manage_users.table.username']()}
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
									{m['administrator.manage_users.table.nickname']()}
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
									{m['administrator.manage_users.table.email']()}
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
									{m['administrator.manage_users.table.permissions']()}
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
									{m['administrator.manage_users.table.actions']()}
								</th>
							</tr>
						</thead>
						<tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
							{#each users as user}
								<tr>
									<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
										{user.username}
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
										{user.nickname}
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
										{user.email}
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
										<button
											onclick={() => openPermissionModal(user)}
											class="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors duration-200 cursor-pointer"
										>
											{getPermissionText(user.permission)}
											<Icon icon="mdi:pencil" class="w-3 h-3 ml-1" />
										</button>
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
										<div class="flex space-x-4">
											<button
												onclick={() => disableUser(user.id)}
												class="p-2 text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300 transition-colors duration-200 rounded-md hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
							title={m['administrator.manage_users.actions.disable_user']()}
											>
												<Icon icon="mdi:account-off" class="w-5 h-5" />
											</button>
											<button
												onclick={() => openDeleteConfirm(user)}
												class="p-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-200 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
							title={m['administrator.manage_users.actions.delete_user']()}
											>
												<Icon icon="mdi:delete" class="w-5 h-5" />
											</button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				{#if users.length === 0}
					<div class="text-center py-12">
						<Icon icon="mdi:account-group" class="mx-auto h-12 w-12 text-gray-400" />
					<h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">{m['administrator.manage_users.empty_state.title']()}</h3>
						<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
						{m['administrator.manage_users.empty_state.description']()}
						</p>
						<div class="mt-6">
							<button
								onclick={addUser}
								class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-500 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400 dark:hover:border-blue-500"
							>
								<Icon icon="mdi:plus" class="w-4 h-4 mr-2" />
							{m['administrator.manage_users.add_user']()}
							</button>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- Permission Modal -->
{#if showPermissionModal && selectedUser}
	<!-- Modal Backdrop -->
	<div 
		class="fixed inset-0 bg-gray-900/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
		onclick={handlePermissionModalBackgroundClick}
		onkeydown={(e) => e.key === 'Escape' && handlePermissionModalClose()}
		role="dialog"
		aria-modal="true"
		aria-labelledby="permission-modal-title"
		tabindex="-1"
	>
		<!-- Modal Content -->
		<div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
			<!-- Header -->
			<div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
				<div class="flex items-center justify-between">
					<h3 id="permission-modal-title" class="text-lg font-medium text-gray-900 dark:text-white">
						{m[PERMISSION_I18N_KEYS.modal.title]()}
					</h3>
					<button
						onclick={handlePermissionModalClose}
						disabled={isPermissionModalLoading}
						class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
					>
						<Icon icon="mdi:close" class="w-5 h-5" />
					</button>
				</div>
				<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
					{m[PERMISSION_I18N_KEYS.modal.userInfo]({ nickname: selectedUser.nickname, username: selectedUser.username })}
				</p>
			</div>

			<!-- Body -->
			<div class="px-6 py-4">
				{#if permissionModalErrorMessage}
					<div class="mb-4 rounded-md bg-red-50 dark:bg-red-900/20 p-3">
						<div class="flex">
							<Icon icon="mdi:alert-circle" class="h-5 w-5 text-red-400" />
							<p class="ml-2 text-sm text-red-800 dark:text-red-200">
								{permissionModalErrorMessage}
							</p>
						</div>
					</div>
				{/if}

				<div class="space-y-3">
					{#each PERMISSION_OPTIONS as option}
						<label class="flex items-start space-x-3 cursor-pointer">
							<input
								type="checkbox"
								checked={isPermissionSelected(option.permission)}
								onchange={() => togglePermission(option.permission)}
								disabled={isPermissionModalLoading || (isEditingCurrentUser && option.permission === USER_PERMISSIONS.ADMINISTRATOR)}
								class="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
							/>
							<div class="flex-1">
								<div class="text-sm font-medium text-gray-900 dark:text-white">
									{m[option.labelKey]()}
									{#if isEditingCurrentUser && option.permission === USER_PERMISSIONS.ADMINISTRATOR}
										<span class="text-xs text-gray-500 dark:text-gray-400 ml-1">{m[PERMISSION_I18N_KEYS.modal.permissionOptions.administrator.cannotModifyOwn]()}</span>
									{/if}
								</div>
								<div class="text-xs text-gray-500 dark:text-gray-400">
									{m[option.descriptionKey]()}
								</div>
							</div>
						</label>
					{/each}
				</div>
			</div>

			<!-- Footer -->
			<div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
				<button
					onclick={handlePermissionModalClose}
					disabled={isPermissionModalLoading}
					class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 hover:border-gray-200 dark:hover:bg-gray-600 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
				>
					{m[PERMISSION_I18N_KEYS.modal.buttons.cancel]()}
				</button>
				<button
					onclick={submitPermissions}
					disabled={!hasPermissionChanges || isPermissionModalLoading}
					class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-400 dark:hover:border-blue-500"
				>
					{#if isPermissionModalLoading}
						<Icon icon="mdi:loading" class="animate-spin -ml-1 mr-2 h-4 w-4" />
						{m[PERMISSION_I18N_KEYS.modal.buttons.updating]()}
					{:else}
						{m[PERMISSION_I18N_KEYS.modal.buttons.update]()}
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Delete Confirmation Modal -->
<ConfirmModal
	bind:isOpen={showDeleteConfirm}
	title={m['administrator.manage_users.confirmations.delete_user_title']()}
	message={userToDelete ? m['administrator.manage_users.confirmations.delete_user_message']({ username: userToDelete.username, nickname: userToDelete.nickname }) : ''}
	confirmText={m['administrator.manage_users.confirmations.delete_confirm']()}
	cancelText={m['administrator.manage_users.confirmations.delete_cancel']()}
	confirmButtonColor="bg-red-600 hover:bg-red-700"
	iconName="mdi:delete-alert"
	iconColor="text-red-500"
	on:confirm={confirmDeleteUser}
	on:cancel={closeDeleteConfirm}
/>

<!-- Success Toast -->
<Toast
	bind:isVisible={showSuccessToast}
	title="删除成功"
	message="用户已成功删除"
	iconName="mdi:check-circle"
	iconColor="text-green-500"
	duration={3000}
	onClose={handleSuccessToastClose}
/>

<!-- Error Toast -->
<Toast
	bind:isVisible={showErrorToast}
	title="删除失败"
	message={toastMessage}
	iconName="mdi:alert-circle"
	iconColor="text-red-500"
	duration={5000}
	onClose={handleErrorToastClose}
/>
