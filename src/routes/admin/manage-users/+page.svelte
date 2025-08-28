<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { _ } from 'svelte-i18n';
	import Icon from '@iconify/svelte';
	import type { PageData } from './$types';
	import Navbar from '../../../lib/components/Navbar.svelte';

	export let data: PageData;

	// 用户数据
	$: users = data.users;

	// 权限显示函数
	function getPermissionText(permission: number): string {
		const permissions = [];
		if (permission & (1 << 0)) permissions.push('Light');
		if (permission & (1 << 1)) permissions.push('Camera');
		if (permission & (1 << 2)) permissions.push('Lens');
		if (permission & (1 << 31)) permissions.push('Administrator');
		return permissions.length > 0 ? permissions.join(', ') : 'None';
	}

	// 添加用户
	function addUser() {
		goto('/admin/add-user');
	}

	// 禁用用户
	function disableUser(userId: string) {
		if (confirm('Are you sure you want to disable this user?')) {
			// TODO: 实现禁用用户逻辑
			console.log('Disable user:', userId);
		}
	}

	// 删除用户
	function deleteUser(userId: string) {
		if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
			// TODO: 实现删除用户逻辑
			console.log('Delete user:', userId);
		}
	}
</script>

<svelte:head>
	<title>Manage Users - Quantified Cinematography</title>
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
						Manage Users
					</h1>
					<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
						Manage user accounts, permissions, and system access
					</p>
				</div>
				<button
					onclick={addUser}
					class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
				>
					<Icon icon="mdi:plus" class="w-4 h-4 mr-2" />
					Add User
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
									Username
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
									Nickname
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
									Email
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
									Permissions
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
									Actions
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
										<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
											{getPermissionText(user.permission)}
										</span>
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
										<div class="flex space-x-4">
											<button
												onclick={() => disableUser(user.id)}
												class="p-2 text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300 transition-colors duration-200 rounded-md hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
												title="Disable User"
											>
												<Icon icon="mdi:account-off" class="w-5 h-5" />
											</button>
											<button
												onclick={() => deleteUser(user.id)}
												class="p-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-200 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
												title="Delete User"
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
						<h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">No users</h3>
						<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
							Get started by creating a new user.
						</p>
						<div class="mt-6">
							<button
								onclick={addUser}
								class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
							>
								<Icon icon="mdi:plus" class="w-4 h-4 mr-2" />
								Add User
							</button>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
