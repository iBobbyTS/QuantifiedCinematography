<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import Icon from '@iconify/svelte';
	import { _ } from 'svelte-i18n';

	let errorMessage = '';
	let isLoading = false;

	// 权限选项
	const permissionOptions = [
		{ value: 0, label: 'No Permissions' },
		{ value: 1, label: 'Light' },
		{ value: 2, label: 'Camera' },
		{ value: 4, label: 'Lens' },
		{ value: 3, label: 'Light + Camera' },
		{ value: 5, label: 'Light + Lens' },
		{ value: 6, label: 'Camera + Lens' },
		{ value: 7, label: 'Light + Camera + Lens' },
		{ value: 2147483648, label: 'Administrator (Full Access)' }
	];

	function handleSubmit() {
		isLoading = true;
		errorMessage = '';
	}
</script>

<svelte:head>
	<title>Add User - Quantified Cinematography</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16">
	<div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<!-- Header -->
		<div class="mb-8">
			<div class="flex items-center">
				<button
					onclick={() => goto('/admin/manage-users')}
					class="mr-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
				>
					<Icon icon="mdi:arrow-left" class="w-5 h-5" />
				</button>
				<div>
					<h1 class="text-3xl font-bold text-gray-900 dark:text-white">
						Add New User
					</h1>
					<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
						Create a new user account with specific permissions
					</p>
				</div>
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
							Username
						</label>
						<div class="mt-1">
							<input
								id="username"
								name="username"
								type="text"
								required
								minlength="3"
								class="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 sm:text-sm"
								placeholder="Enter username (min 3 characters)"
							/>
						</div>
					</div>

					<div>
						<label for="displayName" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
							Display Name
						</label>
						<div class="mt-1">
							<input
								id="displayName"
								name="displayName"
								type="text"
								required
								class="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 sm:text-sm"
								placeholder="Enter display name"
							/>
						</div>
					</div>

					<div>
						<label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
							Email
						</label>
						<div class="mt-1">
							<input
								id="email"
								name="email"
								type="email"
								required
								class="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 sm:text-sm"
								placeholder="Enter email address"
							/>
						</div>
					</div>

					<div>
						<label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
							Password
						</label>
						<div class="mt-1">
							<input
								id="password"
								name="password"
								type="password"
								required
								minlength="6"
								class="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 sm:text-sm"
								placeholder="Enter password (min 6 characters)"
							/>
						</div>
					</div>

					<div>
						<label for="permission" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
							Permissions
						</label>
						<div class="mt-1">
							<select
								id="permission"
								name="permission"
								class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 sm:text-sm"
							>
								{#each permissionOptions as option}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
						</div>
						<p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
							Select the permissions for this user. Administrator has full access to all features.
						</p>
					</div>

					<div class="flex justify-end space-x-3">
						<button
							type="button"
							onclick={() => goto('/admin/manage-users')}
							class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={isLoading}
							class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{#if isLoading}
								<Icon icon="mdi:loading" class="animate-spin -ml-1 mr-3 h-5 w-5" />
								Creating...
							{:else}
								<Icon icon="mdi:plus" class="-ml-1 mr-3 h-5 w-5" />
								Create User
							{/if}
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
</div>
