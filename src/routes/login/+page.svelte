<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import Icon from '@iconify/svelte';
	import { _ } from 'svelte-i18n';
	
	// 表单状态
	let username = '';
	let password = '';
	let isLoading = false;
	let errorMessage = '';
	
	function handleSubmit() {
		isLoading = true;
		errorMessage = '';
	}
	
	function getErrorMessage() {
		return errorMessage || '';
	}
</script>

<svelte:head>
	<title>{$_('login.title')}</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
	<div class="sm:mx-auto sm:w-full sm:max-w-md">
		<div class="flex justify-center">
			<Icon icon="mdi:movie" class="w-16 h-16 text-blue-600 dark:text-blue-400" />
		</div>
		<h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">
			{$_('login.title')}
		</h2>
		<p class="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
			{$_('login.subtitle')}
		</p>
	</div>

	<div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
		<div class="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
			{#if getErrorMessage()}
				<div class="rounded-md bg-red-50 dark:bg-red-900/20 p-4 mb-6">
					<div class="flex">
						<div class="flex-shrink-0">
							<Icon icon="mdi:alert-circle" class="h-5 w-5 text-red-400" />
						</div>
						<div class="ml-3">
							<p class="text-sm text-red-800 dark:text-red-200 text-center">
								{getErrorMessage()}
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
							// 从后端 error 响应中读取 message
							errorMessage = (result as any)?.error?.message || '登录过程中发生错误，请稍后重试';
						} else if (result.type === 'redirect') {
							// 显式执行跳转
							goto((result as any).location);
						} else {
							errorMessage = '';
						}
					};
				}}
				onsubmit={handleSubmit}
			>
				<div>
					<label for="username" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
						{$_('login.username')}
					</label>
					<div class="mt-1">
						<input
							id="username"
							name="username"
							type="text"
							required
							bind:value={username}
							class="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 sm:text-sm"
							placeholder={$_('login.usernamePlaceholder')}
						/>
					</div>
				</div>

				<div>
					<label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
						{$_('login.password')}
					</label>
					<div class="mt-1">
						<input
							id="password"
							name="password"
							type="password"
							required
							bind:value={password}
							class="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 sm:text-sm"
							placeholder={$_('login.passwordPlaceholder')}
						/>
					</div>
				</div>

				<div>
					<button
						type="submit"
						disabled={isLoading}
						class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-600"
					>
						{#if isLoading}
							<Icon icon="mdi:loading" class="animate-spin -ml-1 mr-3 h-5 w-5" />
							{$_('login.signingIn')}
						{:else}
							<Icon icon="mdi:login" class="-ml-1 mr-3 h-5 w-5" />
							{$_('login.signIn')}
						{/if}
					</button>
				</div>
			</form>

			<div class="mt-6">
				<div class="relative">
					<div class="absolute inset-0 flex items-center">
						<div class="w-full border-t border-gray-300 dark:border-gray-600"></div>
					</div>
				</div>

				<div class="mt-6">
					<p class="text-sm text-gray-600 dark:text-gray-400 text-center leading-relaxed">
						{$_('login.description')}
					</p>
				</div>
			</div>
		</div>
	</div>
</div>
