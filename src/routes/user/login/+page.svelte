<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { invalidateAll } from '$app/navigation';
	import Icon from '@iconify/svelte';
	import * as m from '$lib/paraglide/messages.js';
	import Navbar from '$lib/components/Navbar.svelte';
	
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

<Navbar
	centerTitle="login.title"
	showBackButton={true}
	backButtonUrl="/"
	backButtonText="navbar.backToHome"
	hideLoginButton={true}
/>

<svelte:head>
	<title>{m['login.title']()}</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
	<div class="sm:mx-auto sm:w-full sm:max-w-md">
		<div class="flex justify-center">
			<Icon icon="mdi:movie" class="w-16 h-16 text-blue-600 dark:text-blue-400" />
		</div>
		<h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">
			{m['login.title']()}
		</h2>
		<p class="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
			{m['login.subtitle']()}
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
				action="?/login"
				use:enhance={() => {
					return async ({ result }) => {
						isLoading = false;
						console.log('🔍 登录结果:', result);
						
						if (result.type === 'failure') {
							// 处理失败响应
							console.log('❌ 登录失败:', result.data);
							let message = '';
							
							if (Array.isArray(result.data)) {
								// 如果data是数组，取最后一个元素作为错误消息
								message = result.data[result.data.length - 1] || 'Unknown error';
							} else if (typeof result.data === 'object' && result.data.message) {
								// 如果data是对象，取message字段
								message = result.data.message;
							} else if (typeof result.data === 'string') {
								// 如果data是字符串
								message = result.data;
							} else {
								message = 'Unknown error';
							}
							
							console.log('📝 提取的错误消息:', message);
							
							// map known backend messages to i18n keys
							if (message.includes('用户不存在') || message.toLowerCase().includes('user not found') || message.toLowerCase().includes('incorrect username')) {
								errorMessage = m['auth.errors.userNotFound']();
							} else if (message.includes('密码错误') || message.toLowerCase().includes('incorrect password')) {
								errorMessage = m['auth.errors.wrongPassword']();
							} else if (message.toLowerCase().includes('invalid username')) {
								errorMessage = '用户名格式不正确（3-31个字符，只能包含字母、数字、下划线和连字符）';
							} else if (message.toLowerCase().includes('invalid password')) {
								errorMessage = '密码格式不正确（6-255个字符）';
							} else if (message.toLowerCase().includes('internal server error')) {
								errorMessage = `${m['app.networkError']()}: ${message}`;
							} else {
								errorMessage = message || m['app.networkError']();
							}
						} else if (result.type === 'error') {
							// 处理错误响应（旧格式）
							const raw = (result as any)?.error?.message || '';
							console.log('❌ 登录错误:', raw);
							
							if (raw.includes('用户不存在') || raw.toLowerCase().includes('user not found')) {
								errorMessage = m['auth.errors.userNotFound']();
							} else if (raw.includes('密码错误') || raw.toLowerCase().includes('incorrect password')) {
								errorMessage = m['auth.errors.wrongPassword']();
							} else {
								errorMessage = raw ? `${m['app.networkError']()}: ${raw}` : m['app.networkError']();
							}
						} else if (result.type === 'redirect') {
							// 登录成功后，先刷新所有数据，然后跳转
							console.log('✅ 登录成功，重定向到:', (result as any).location);
							await invalidateAll();
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
						{m['login.username']()}
					</label>
					<div class="mt-1">
						<input
							id="username"
							name="username"
							type="text"
							required
							bind:value={username}
							class="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 sm:text-sm"
							placeholder={m['login.usernamePlaceholder']()}
						/>
					</div>
				</div>

				<div>
					<label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
						{m['login.password']()}
					</label>
					<div class="mt-1">
						<input
							id="password"
							name="password"
							type="password"
							required
							bind:value={password}
							class="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 sm:text-sm"
							placeholder={m['login.passwordPlaceholder']()}
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
							{m['login.signingIn']()}
						{:else}
							<Icon icon="mdi:login" class="-ml-1 mr-3 h-5 w-5" />
							{m['auth.login']()}
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
						{m['login.description']()}
					</p>
				</div>
			</div>
		</div>
	</div>
</div>
