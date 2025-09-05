<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import Icon from '@iconify/svelte';
	import { _ } from 'svelte-i18n';
	import Navbar from '../../../lib/components/Navbar.svelte';
	import PermissionModal from '../manage-users/PermissionModal.svelte';
	import { USER_PERMISSIONS } from '../../../lib/bitmask.js';

	let errorMessage = '';
	let isLoading = false;
	let showPermissionModal = false;
	let selectedPermissions = 0;

	function handleSubmit() {
		isLoading = true;
		errorMessage = '';
	}

	function openPermissionModal() {
		showPermissionModal = true;
	}

	function closePermissionModal() {
		showPermissionModal = false;
	}

	function handlePermissionChanged(permissions: number) {
		selectedPermissions = permissions;
		closePermissionModal();
	}

	// 获取权限显示文本
	function getPermissionDisplayText(permissions: number): string {
		if (permissions === 0) return $_('testing.administrator.manage_users.permissions.none');
		
		const permissionNames = [];
		if (permissions & USER_PERMISSIONS.LIGHT) permissionNames.push($_('testing.administrator.manage_users.permission_modal.permission_options.light.label'));
		if (permissions & USER_PERMISSIONS.CAMERA) permissionNames.push($_('testing.administrator.manage_users.permission_modal.permission_options.camera.label'));
		if (permissions & USER_PERMISSIONS.LENS) permissionNames.push($_('testing.administrator.manage_users.permission_modal.permission_options.lens.label'));
		if (permissions & USER_PERMISSIONS.ADMINISTRATOR) permissionNames.push($_('testing.administrator.manage_users.permission_modal.permission_options.administrator.label'));
		
		return permissionNames.join(', ');
	}
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
				<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
					{$_('testing.administrator.manage_users.add_user_page.subtitle')}
				</p>
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
					method="POST"
					use:enhance={() => {
						return async ({ result }) => {
							isLoading = false;
							if (result.type === 'error') {
								errorMessage = result.error?.message || 'Failed to create user';
							} else if (result.type === 'redirect') {
								goto(result.location);
							}
						};
					}}
					onsubmit={handleSubmit}
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
						<label for="displayName" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
							{$_('testing.administrator.manage_users.add_user_page.form.display_name')}
						</label>
						<div class="mt-1">
							<input
								id="displayName"
								name="displayName"
								type="text"
								required
								class="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 sm:text-sm"
								placeholder={$_('testing.administrator.manage_users.add_user_page.form.display_name_placeholder')}
							/>
						</div>
					</div>

					<div>
						<label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
							{$_('testing.administrator.manage_users.add_user_page.form.email')}
						</label>
						<div class="mt-1">
							<input
								id="email"
								name="email"
								type="email"
								required
								class="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 sm:text-sm"
								placeholder={$_('testing.administrator.manage_users.add_user_page.form.email_placeholder')}
							/>
						</div>
					</div>

					<div>
						<label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
							{$_('testing.administrator.manage_users.add_user_page.form.password')}
						</label>
						<div class="mt-1">
							<input
								id="password"
								name="password"
								type="password"
								required
								minlength="6"
								class="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 sm:text-sm"
								placeholder={$_('testing.administrator.manage_users.add_user_page.form.password_placeholder')}
							/>
						</div>
					</div>

					<div>
						<label for="permission-button" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
							{$_('testing.administrator.manage_users.add_user_page.form.permissions')}
						</label>
						<div class="mt-1">
							<button
								id="permission-button"
								type="button"
								onclick={openPermissionModal}
								class="w-full flex items-center justify-between px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
							>
								<span class="text-left">
									{selectedPermissions === 0 ? $_('testing.administrator.manage_users.add_user_page.form.select_permissions') : getPermissionDisplayText(selectedPermissions)}
								</span>
								<Icon icon="mdi:chevron-down" class="w-4 h-4" />
							</button>
						</div>
						<p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
							{$_('testing.administrator.manage_users.add_user_page.form.permissions_description')}
						</p>
						<!-- Hidden input for form submission -->
						<input type="hidden" name="permission" value={selectedPermissions} />
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
{#if showPermissionModal}
	<PermissionModal
		user={{ id: 'new', displayName: 'New User', username: 'newuser' }}
		originalPermissions={selectedPermissions}
		currentUser={null}
		onClose={closePermissionModal}
		onPermissionChanged={handlePermissionChanged}
	/>
{/if}
