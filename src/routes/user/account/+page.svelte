<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import * as m from '$lib/paraglide/messages.js';
	import Navbar from '$lib/components/Navbar.svelte';
	import Icon from '@iconify/svelte';
	import { enhance } from '$app/forms';

	// 当前选中的页面
	let currentPage = 'change-password';

	// 修改密码表单状态
	let currentPassword = '';
	let newPassword = '';
	let confirmPassword = '';
	let isChangingPassword = false;
	let passwordMessage = '';

	// 页面选项
	const pageOptions = [
		{
			id: 'change-password',
			title: m['user.account.changePassword'](),
			icon: 'mdi:key-variant'
		},
		{
			id: 'public-info',
			title: m['user.account.publicInfo'](),
			icon: 'mdi:account-edit'
		}
	];

	// 切换页面
	function switchPage(pageId: string) {
		currentPage = pageId;
		passwordMessage = '';
	}

	// 修改密码处理
	function handleChangePassword() {
		isChangingPassword = true;
		passwordMessage = '';
	}

	// 获取密码错误消息
	function getPasswordMessage() {
		return passwordMessage || '';
	}
</script>

<svelte:head>
	<title>{m['user.account.title']()} - {m['app.title']()}</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16">
	<!-- Navbar -->
	<Navbar centerTitle="user.account.title" showBackButton={true} backButtonUrl="/" />
	
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
			<!-- 左侧导航 -->
			<div class="lg:col-span-1">
				<div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
					<h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
						{m['user.account.settings']()}
					</h2>
					<nav class="space-y-2">
						{#each pageOptions as option}
							<button
								class="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 {currentPage === option.id 
									? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200' 
									: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}"
								onclick={() => switchPage(option.id)}
							>
								<Icon icon={option.icon} class="w-5 h-5 mr-3" />
								<div class="text-left">
									<div class="font-medium">{option.title}</div>
								</div>
							</button>
						{/each}
					</nav>
				</div>
			</div>

			<!-- 右侧内容 -->
			<div class="lg:col-span-3">
				<div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
					{#if currentPage === 'change-password'}
						<!-- 修改密码页面 -->
						<div class="p-6">
							<div class="mb-6">
								<h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
									{m['user.account.changePassword']()}
								</h3>
							</div>

							{#if getPasswordMessage()}
								<div class="rounded-md bg-red-50 dark:bg-red-900/20 p-4 mb-6">
									<div class="flex">
										<div class="flex-shrink-0">
											<Icon icon="mdi:alert-circle" class="h-5 w-5 text-red-400" />
										</div>
										<div class="ml-3">
											<p class="text-sm text-red-800 dark:text-red-200">
												{getPasswordMessage()}
											</p>
										</div>
									</div>
								</div>
							{/if}

							<form
								class="space-y-6"
								method="POST"
								action="?/changePassword"
								use:enhance={() => {
									return async ({ result }) => {
										isChangingPassword = false;
										console.log('🔍 修改密码结果:', result);
										
										if (result.type === 'failure') {
											let message = '';
											
											if (Array.isArray(result.data)) {
												message = result.data[result.data.length - 1] || 'Unknown error';
											} else if (typeof result.data === 'object' && result.data.message) {
												message = result.data.message;
											} else if (typeof result.data === 'string') {
												message = result.data;
											} else {
												message = 'Unknown error';
											}
											
											passwordMessage = message || m['app.networkError']();
										} else if (result.type === 'success') {
											passwordMessage = '';
											// 清空表单
											currentPassword = '';
											newPassword = '';
											confirmPassword = '';
											// 显示成功消息
											passwordMessage = m['user.account.passwordChangedSuccess']();
										}
									};
								}}
								onsubmit={handleChangePassword}
							>
								<div>
									<label for="currentPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
										{m['user.account.currentPassword']()}
									</label>
									<div class="mt-1">
										<input
											id="currentPassword"
											name="currentPassword"
											type="password"
											required
											bind:value={currentPassword}
											class="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 sm:text-sm"
											placeholder={m['user.account.currentPasswordPlaceholder']()}
										/>
									</div>
								</div>

								<div>
									<label for="newPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
										{m['user.account.newPassword']()}
									</label>
									<div class="mt-1">
										<input
											id="newPassword"
											name="newPassword"
											type="password"
											required
											bind:value={newPassword}
											class="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 sm:text-sm"
											placeholder={m['user.account.newPasswordPlaceholder']()}
										/>
									</div>
								</div>

								<div>
									<label for="confirmPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
										{m['user.account.confirmPassword']()}
									</label>
									<div class="mt-1">
										<input
											id="confirmPassword"
											name="confirmPassword"
											type="password"
											required
											bind:value={confirmPassword}
											class="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 sm:text-sm"
											placeholder={m['user.account.confirmPasswordPlaceholder']()}
										/>
									</div>
								</div>

								<div>
									<button
										type="submit"
										disabled={isChangingPassword}
										class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-600"
									>
										{#if isChangingPassword}
											<Icon icon="mdi:loading" class="animate-spin -ml-1 mr-3 h-5 w-5" />
											{m['user.account.changingPassword']()}
										{:else}
											<Icon icon="mdi:key-variant" class="-ml-1 mr-3 h-5 w-5" />
											{m['user.account.changePassword']()}
										{/if}
									</button>
								</div>
							</form>
						</div>
					{:else if currentPage === 'public-info'}
						<!-- 账号公开信息页面 -->
						<div class="p-6">
							<div class="text-center py-12">
								<Icon icon="mdi:account-edit" class="mx-auto h-12 w-12 text-gray-400" />
								<h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">
									{m['user.account.publicInfoComingSoon']()}
								</h3>
								<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
									{m['user.account.publicInfoDescription']()}
								</p>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>
