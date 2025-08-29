<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { _ } from 'svelte-i18n';
	import Icon from '@iconify/svelte';
	import type { PageData } from './$types';
	import Navbar from '../../../lib/components/Navbar.svelte';
	import PermissionModal from './PermissionModal.svelte';
	import { UserPermissions } from '../../../lib/bitmask.js';

	export let data: PageData;

	// 用户数据
	$: users = data.users;

	// 弹窗状态
	let showPermissionModal = false;
	let selectedUser: any = null;
	let originalPermissions: number = 0;

	// 权限显示函数 - 使用国际化函数
	function getPermissionText(permission: number): string {
		const permissionNames: string[] = [];
		
		if (UserPermissions.hasLightPermission(permission)) {
			permissionNames.push($_('testing.administrator.manage_users.permission_modal.permission_options.light.label'));
		}
		if (UserPermissions.hasCameraPermission(permission)) {
			permissionNames.push($_('testing.administrator.manage_users.permission_modal.permission_options.camera.label'));
		}
		if (UserPermissions.hasLensPermission(permission)) {
			permissionNames.push($_('testing.administrator.manage_users.permission_modal.permission_options.lens.label'));
		}
		if (UserPermissions.hasAdministratorPermission(permission)) {
			permissionNames.push($_('testing.administrator.manage_users.permission_modal.permission_options.administrator.label'));
		}
		
		return permissionNames.length > 0 ? permissionNames.join(', ') : $_('testing.administrator.manage_users.permissions.none');
	}

	// 添加用户
	function addUser() {
		goto('/admin/add-user');
	}

	// 打开权限修改弹窗
	function openPermissionModal(user: any) {
		console.log('=== 打开权限弹窗 ===');
		console.log('用户对象:', user);
		console.log('用户权限值:', user.permission);
		console.log('权限值类型:', typeof user.permission);
		console.log('权限值二进制:', user.permission.toString(2));
		
		selectedUser = user;
		originalPermissions = user.permission;
		console.log('设置 originalPermissions:', originalPermissions);
		showPermissionModal = true;
		console.log('弹窗状态设置为:', showPermissionModal);
	}

	// 关闭权限修改弹窗
	function closePermissionModal() {
		showPermissionModal = false;
		selectedUser = null;
		originalPermissions = 0;
	}

	// 权限修改成功后的回调
	function onPermissionChanged(newPermissions: number) {
		if (selectedUser) {
			selectedUser.permission = newPermissions;
		}
		closePermissionModal();
	}

	// 禁用用户
	function disableUser(userId: string) {
		if (confirm($_('testing.administrator.manage_users.confirmations.disable_user'))) {
			// TODO: 实现禁用用户逻辑
			console.log('Disable user:', userId);
		}
	}

	// 删除用户
	function deleteUser(userId: string) {
		if (confirm($_('testing.administrator.manage_users.confirmations.delete_user'))) {
			// TODO: 实现删除用户逻辑
			console.log('Delete user:', userId);
		}
	}
</script>

<svelte:head>
	<title>{$_('testing.administrator.manage_users.title')} - {$_('app.title')}</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16">
	<!-- Navbar -->
	<Navbar centerTitle="app.title" />
	
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<!-- Header -->
		<div class="mb-8">
			<div class="flex items-center justify-between">
				<div>
					<h1 class="text-3xl font-bold text-gray-900 dark:text-white">
						{$_('testing.administrator.manage_users.title')}
					</h1>
					<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
						{$_('testing.administrator.manage_users.subtitle')}
					</p>
				</div>
				<button
					onclick={addUser}
					class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
				>
					<Icon icon="mdi:plus" class="w-4 h-4 mr-2" />
					{$_('testing.administrator.manage_users.add_user')}
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
									{$_('testing.administrator.manage_users.table.username')}
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
									{$_('testing.administrator.manage_users.table.nickname')}
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
									{$_('testing.administrator.manage_users.table.email')}
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
									{$_('testing.administrator.manage_users.table.permissions')}
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
									{$_('testing.administrator.manage_users.table.actions')}
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
										{user.displayName}
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
												title={$_('testing.administrator.manage_users.actions.disable_user')}
											>
												<Icon icon="mdi:account-off" class="w-5 h-5" />
											</button>
											<button
												onclick={() => deleteUser(user.id)}
												class="p-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-200 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
												title={$_('testing.administrator.manage_users.actions.delete_user')}
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
						<h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">{$_('testing.administrator.manage_users.empty_state.title')}</h3>
						<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
							{$_('testing.administrator.manage_users.empty_state.description')}
						</p>
						<div class="mt-6">
							<button
								onclick={addUser}
								class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
							>
								<Icon icon="mdi:plus" class="w-4 h-4 mr-2" />
								{$_('testing.administrator.manage_users.add_user')}
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
	<PermissionModal
		user={selectedUser}
		originalPermissions={originalPermissions}
		currentUser={$page.data.user}
		onClose={closePermissionModal}
		onPermissionChanged={onPermissionChanged}
	/>
{/if}
