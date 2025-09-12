<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';
	import * as m from '$lib/paraglide/messages.js';
	import Navbar from '$lib/components/Navbar.svelte';
	import { USER_PERMISSIONS, UserPermissions } from '$lib/permission/bitmask.js';
	import { PERMISSION_OPTIONS, PERMISSION_I18N_KEYS } from '$lib/permission/permissions.js';

	let errorMessage = '';
	let isLoading = false;
	let showPermissionModal = false;
	let selectedPermissions = 0;
	let showPasswordModal = false;
	let generatedPassword = '';
	let createdUsername = '';

	// 权限弹窗相关状态
	let permissionModalUser: any = null;
	let originalPermissions: number = 0;
	let currentPermissions: number = 0;
	let isPermissionModalLoading = false;
	let permissionModalErrorMessage = '';
	let hasPermissionChanges = false;
	let isPermissionModalInitialized = false;

	// 检查编辑对象是否是当前用户
	$: isEditingCurrentUser = permissionModalUser && permissionModalUser.id === 'new';

	// 响应式声明：当 originalPermissions 变化时重新初始化
	$: if (originalPermissions !== undefined && !isPermissionModalInitialized) {
		currentPermissions = originalPermissions;
		isPermissionModalInitialized = true;
	}

	// 检查权限是否有变化
	$: {
		hasPermissionChanges = currentPermissions !== originalPermissions;
	}

	async function handleSubmit() {
		isLoading = true;
		errorMessage = '';

		try {
			const response = await fetch('/api/admin/user/create', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					username: (document.getElementById('username') as HTMLInputElement)?.value,
					permissions: selectedPermissions
				})
			});

			if (response.ok) {
				const data = await response.json();
				generatedPassword = data.password;
				createdUsername = data.username;
				showPasswordModal = true;
			} else {
				const errorData = await response.json();
				errorMessage = errorData.message || 'Failed to create user';
			}
		} catch (error) {
			console.error('Error creating user:', error);
			errorMessage = 'Network error occurred';
		} finally {
			isLoading = false;
		}
	}

	function closePasswordModal() {
		showPasswordModal = false;
		generatedPassword = '';
		createdUsername = '';
		// 清空表单
		(document.getElementById('username') as HTMLInputElement).value = '';
		selectedPermissions = 0;
	}

	function copyPassword() {
		navigator.clipboard.writeText(generatedPassword);
	}

	function openPermissionModal() {
		permissionModalUser = { id: 'new', nickname: 'New User', username: 'newuser' };
		originalPermissions = selectedPermissions;
		currentPermissions = selectedPermissions;
		isPermissionModalInitialized = false;
		showPermissionModal = true;
	}

	function closePermissionModal() {
		showPermissionModal = false;
		permissionModalUser = null;
		originalPermissions = 0;
		currentPermissions = 0;
		isPermissionModalInitialized = false;
		permissionModalErrorMessage = '';
	}

	function handlePermissionChanged(permissions: number) {
		selectedPermissions = permissions;
		closePermissionModal();
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
			// 模拟API调用，实际应该调用真实的API
			await new Promise(resolve => setTimeout(resolve, 1000));
			
			// 更新权限
			handlePermissionChanged(currentPermissions);
		} catch (error) {
			console.error('Error updating permissions:', error);
			permissionModalErrorMessage = $_(PERMISSION_I18N_KEYS.modal.errors.networkError);
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

	// 获取权限显示文本
	function getPermissionDisplayText(permissions: number): string {
		if (permissions === 0) return $_(PERMISSION_I18N_KEYS.permissions.none);
		
		const permissionNames = [];
		if (permissions & USER_PERMISSIONS.LIGHT) permissionNames.push($_(PERMISSION_OPTIONS[0].labelKey));
		if (permissions & USER_PERMISSIONS.CAMERA) permissionNames.push($_(PERMISSION_OPTIONS[1].labelKey));
		if (permissions & USER_PERMISSIONS.LENS) permissionNames.push($_(PERMISSION_OPTIONS[2].labelKey));
		if (permissions & USER_PERMISSIONS.ADMINISTRATOR) permissionNames.push($_(PERMISSION_OPTIONS[3].labelKey));
		
		return permissionNames.join(', ');
	}

	// 初始化权限
	onMount(() => {
		currentPermissions = originalPermissions;
	});
</script>

<svelte:head>
	<title>{$_('testing.administrator.manage_users.add_user_page.title')} - Quantified Cinematography</title>
</svelte:head>

<!-- Navbar -->
<Navbar 
	centerTitle="testing.administrator.manage_users.add_user_page.title" 
	showBackButton={true} 
	backButtonUrl="/admin/manage-users"
	backButtonText="navbar.backToManageUsers"
/>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16">
	<div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<!-- Header -->
		<div class="mb-8">
			<div>
				<h1 class="text-3xl font-bold text-gray-900 dark:text-white">
					{$_('testing.administrator.manage_users.add_user_page.title')}
				</h1>
			</div>
		</div>

		<!-- Add User Form -->
		<div class="bg-white dark:bg-gray-800 shadow sm:rounded-lg">
			<div class="px-4 py-5 sm:p-6">
				{#if errorMessage}
					<div class="rounded-md bg-red-50 dark:bg-red-900/20 p-4 mb-6">
						<div class="flex">
							<div class="flex-shrink-0">
								<Icon icon="mdi:alert-circle" class="h-5 w-5 text-red-400" />
							</div>
							<div class="ml-3">
								<p class="text-sm text-red-800 dark:text-red-200">
									{errorMessage}
								</p>
							</div>
						</div>
					</div>
				{/if}

				<form
					class="space-y-6"
					onsubmit={(e) => {
						e.preventDefault();
						handleSubmit();
					}}
				>
					<div>
						<label for="username" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
							{$_('testing.administrator.manage_users.add_user_page.form.username')}
						</label>
						<div class="mt-1">
							<input
								id="username"
								name="username"
								type="text"
								required
								minlength="3"
								class="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 sm:text-sm"
								placeholder={$_('testing.administrator.manage_users.add_user_page.form.username_placeholder')}
							/>
						</div>
					</div>


					<div>
						<fieldset>
							<legend class="block text-sm font-medium text-gray-700 dark:text-gray-300">
								{$_('testing.administrator.manage_users.add_user_page.form.permissions')}
							</legend>
							<div class="mt-1">
								<div class="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm dark:bg-gray-700">
									<div class="space-y-3">
										{#each PERMISSION_OPTIONS as option}
											<label class="flex items-start space-x-3 cursor-pointer">
												<input
													type="checkbox"
													checked={(selectedPermissions & option.permission) !== 0}
													onchange={() => {
														if ((selectedPermissions & option.permission) !== 0) {
															selectedPermissions = selectedPermissions & ~option.permission;
														} else {
															selectedPermissions = selectedPermissions | option.permission;
														}
													}}
													class="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
												/>
												<div class="flex-1">
													<div class="text-sm font-medium text-gray-900 dark:text-white">
														{$_(option.labelKey)}
													</div>
													<div class="text-xs text-gray-500 dark:text-gray-400">
														{$_(option.descriptionKey)}
													</div>
												</div>
											</label>
										{/each}
									</div>
								</div>
							</div>
							<!-- Hidden input for form submission -->
							<input type="hidden" name="permission" value={selectedPermissions} />
						</fieldset>
					</div>

					<div class="flex justify-end space-x-3">
						<button
							type="button"
							onclick={() => goto('/admin/manage-users')}
							class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
						>
							{$_('testing.administrator.manage_users.add_user_page.buttons.cancel')}
						</button>
						<button
							type="submit"
							disabled={isLoading}
							class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{#if isLoading}
								<Icon icon="mdi:loading" class="animate-spin -ml-1 mr-3 h-5 w-5" />
								{$_('testing.administrator.manage_users.add_user_page.buttons.creating')}
							{:else}
								<Icon icon="mdi:plus" class="-ml-1 mr-3 h-5 w-5" />
								{$_('testing.administrator.manage_users.add_user_page.buttons.create')}
							{/if}
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
</div>

<!-- Permission Modal -->
{#if showPermissionModal && permissionModalUser}
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
						{$_(PERMISSION_I18N_KEYS.modal.title)}
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
					{$_(PERMISSION_I18N_KEYS.modal.userInfo).replace('{nickname}', permissionModalUser.nickname).replace('{username}', permissionModalUser.username)}
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
									{$_(option.labelKey)}
									{#if isEditingCurrentUser && option.permission === USER_PERMISSIONS.ADMINISTRATOR}
										<span class="text-xs text-gray-500 dark:text-gray-400 ml-1">{$_(PERMISSION_I18N_KEYS.modal.permissionOptions.administrator.cannotModifyOwn)}</span>
									{/if}
								</div>
								<div class="text-xs text-gray-500 dark:text-gray-400">
									{$_(option.descriptionKey)}
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
					class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
				>
					{$_(PERMISSION_I18N_KEYS.modal.buttons.cancel)}
				</button>
				<button
					onclick={submitPermissions}
					disabled={!hasPermissionChanges || isPermissionModalLoading}
					class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{#if isPermissionModalLoading}
						<Icon icon="mdi:loading" class="animate-spin -ml-1 mr-2 h-4 w-4" />
						{$_(PERMISSION_I18N_KEYS.modal.buttons.updating)}
					{:else}
						{$_(PERMISSION_I18N_KEYS.modal.buttons.update)}
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Password Modal -->
{#if showPasswordModal}
	<!-- Modal Backdrop -->
	<div 
		class="fixed inset-0 bg-gray-900/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
		onclick={(e) => e.target === e.currentTarget && closePasswordModal()}
		onkeydown={(e) => e.key === 'Escape' && closePasswordModal()}
		role="dialog"
		aria-modal="true"
		aria-labelledby="password-modal-title"
		tabindex="-1"
	>
		<!-- Modal Content -->
		<div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-700">
			<!-- Header -->
			<div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
				<h3 id="password-modal-title" class="text-lg font-medium text-gray-900 dark:text-white">
					User Created Successfully
				</h3>
			</div>

			<!-- Body -->
			<div class="px-6 py-4">
				<div class="mb-4">
					<p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
						User <strong>{createdUsername}</strong> has been created successfully.
					</p>
					<p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
						Please copy the generated password and share it with the user:
					</p>
				</div>

				<div class="mb-4">
					<label for="generated-password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
						Generated Password:
					</label>
					<div class="flex">
						<input
							id="generated-password"
							type="text"
							value={generatedPassword}
							readonly
							class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm font-mono"
						/>
						<button
							type="button"
							onclick={copyPassword}
							class="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
						>
							Copy
						</button>
					</div>
				</div>

				<div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
					<div class="flex">
						<Icon icon="mdi:alert" class="h-5 w-5 text-yellow-400" />
						<p class="ml-2 text-sm text-yellow-800 dark:text-yellow-200">
							Please save this password securely. It will not be shown again.
						</p>
					</div>
				</div>
			</div>

			<!-- Footer -->
			<div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
				<button
					onclick={closePasswordModal}
					class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
				>
					Continue Adding Users
				</button>
				<button
					onclick={() => {
						closePasswordModal();
						goto('/admin/manage-users');
					}}
					class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
				>
					Return to User Management
				</button>
			</div>
		</div>
	</div>
{/if}
