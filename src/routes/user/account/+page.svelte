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

	// 公开信息状态
	let publicInfoItems = [];
	let isUpdatingInfo = false;
	let infoMessage = '';

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

	// 平台选项
	const platformOptions = [
		{ value: 'bilibili', label: m['user.account.platforms.bilibili'](), icon: 'mdi:youtube' },
		{ value: 'zhihu', label: m['user.account.platforms.zhihu'](), icon: 'mdi:help-circle' },
		{ value: 'douyin', label: m['user.account.platforms.douyin'](), icon: 'mdi:music-note' },
		{ value: 'youtube', label: m['user.account.platforms.youtube'](), icon: 'mdi:youtube' },
		{ value: 'facebook', label: m['user.account.platforms.facebook'](), icon: 'mdi:facebook' },
		{ value: 'instagram', label: m['user.account.platforms.instagram'](), icon: 'mdi:instagram' },
		{ value: 'email', label: m['user.account.platforms.email'](), icon: 'mdi:email' }
	];

	// 获取可用的平台选项（排除已选择的）
	$: availablePlatforms = platformOptions.filter(platform => 
		!publicInfoItems.some(item => item.platform === platform.value)
	);

	// 添加新的平台信息行
	function addPlatformInfo() {
		// 找到第一个可用的平台
		const firstAvailablePlatform = availablePlatforms[0];
		
		publicInfoItems = [...publicInfoItems, {
			id: Date.now(), // 临时ID
			platform: firstAvailablePlatform ? firstAvailablePlatform.value : '',
			link: ''
		}];
	}

	// 删除平台信息
	function removePlatformInfo(id) {
		publicInfoItems = publicInfoItems.filter(item => item.id !== id);
	}

	// 更新公开信息
	async function updatePublicInfo() {
		// 过滤掉空的条目
		const validItems = publicInfoItems.filter(item => item.platform && item.link);
		
		if (validItems.length === 0) {
			infoMessage = '请至少添加一个有效的平台信息';
			return;
		}
		
		isUpdatingInfo = true;
		infoMessage = '';
		
		try {
			// 这里应该调用API来保存数据
			// const response = await fetch('/api/user/public-info', {
			// 	method: 'POST',
			// 	headers: { 'Content-Type': 'application/json' },
			// 	body: JSON.stringify({ items: validItems })
			// });
			
			// 模拟API调用
			await new Promise(resolve => setTimeout(resolve, 1000));
			
			// 只保留有效的条目
			publicInfoItems = validItems;
			infoMessage = m['user.account.infoUpdatedSuccess']();
		} catch (error) {
			infoMessage = m['app.networkError']();
		} finally {
			isUpdatingInfo = false;
		}
	}

	// 获取信息消息
	function getInfoMessage() {
		return infoMessage || '';
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
										class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-500 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-400 dark:hover:border-blue-500"
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
							<div class="mb-6">
								<h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
									{m['user.account.publicInfoTitle']()}
								</h3>
								<p class="text-sm text-gray-600 dark:text-gray-400">
									{m['user.account.publicInfoSubtitle']()}
								</p>
							</div>

							{#if getInfoMessage()}
								<div class="rounded-md bg-green-50 dark:bg-green-900/20 p-4 mb-6">
									<div class="flex">
										<div class="flex-shrink-0">
											<Icon icon="mdi:check-circle" class="h-5 w-5 text-green-400" />
										</div>
										<div class="ml-3">
											<p class="text-sm text-green-800 dark:text-green-200">
												{getInfoMessage()}
											</p>
										</div>
									</div>
								</div>
							{/if}

							<!-- 社交媒体标题和添加按钮 -->
							<div class="flex items-center justify-between mb-6">
								<h4 class="text-lg font-medium text-gray-900 dark:text-white">
									{m['user.account.socialMedia']()}
								</h4>
								<button
									onclick={addPlatformInfo}
									disabled={availablePlatforms.length === 0}
									class="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<Icon icon="mdi:plus" class="w-4 h-4" />
									<span>{availablePlatforms.length === 0 ? m['user.account.allPlatformsAdded']() : m['user.account.add']()}</span>
								</button>
							</div>

							<!-- 平台信息列表 -->
							{#if publicInfoItems.length > 0}
								<div class="space-y-3 mb-6">
									{#each publicInfoItems as item, index}
										<div class="flex items-center space-x-4 p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
											<!-- 平台选择下拉框 -->
											<div class="flex-shrink-0 w-32">
												<div class="relative">
													<button
														class="w-full px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 flex items-center justify-between"
														onclick={() => {
															const dropdown = document.getElementById(`platformDropdown-${item.id}`);
															dropdown?.classList.toggle('hidden');
														}}
													>
														<span class="text-left">
															{platformOptions.find(p => p.value === item.platform)?.label || m['user.account.platform']()}
														</span>
														<Icon icon="mdi:chevron-down" class="w-4 h-4" />
													</button>
													
													<!-- Platform Dropdown -->
													<div
														id="platformDropdown-{item.id}"
														class="hidden absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50"
													>
														{#each availablePlatforms as platform}
															<button
																class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 transition-colors duration-200"
																onclick={() => {
																	item.platform = platform.value;
																	document.getElementById(`platformDropdown-${item.id}`)?.classList.add('hidden');
																}}
															>
																<Icon icon={platform.icon} class="w-4 h-4" />
																<span>{platform.label}</span>
															</button>
														{/each}
													</div>
												</div>
											</div>
											
											<!-- 链接输入框 -->
											<div class="flex-1 min-w-0">
												<input
													type="url"
													bind:value={item.link}
													placeholder={m['user.account.linkPlaceholder']()}
													class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:text-gray-100"
												/>
											</div>
											
											<!-- 删除按钮 -->
											<button
												onclick={() => removePlatformInfo(item.id)}
												class="flex-shrink-0 p-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-200 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
												title={m['user.account.remove']()}
											>
												<Icon icon="mdi:delete" class="w-4 h-4" />
											</button>
										</div>
									{/each}
								</div>
							{/if}

							<!-- 更新按钮 -->
							<div class="flex justify-end">
								<button
									onclick={updatePublicInfo}
									disabled={isUpdatingInfo || publicInfoItems.length === 0}
									class="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-500 hover:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-green-500 dark:hover:bg-green-400 dark:hover:border-green-500"
								>
									{#if isUpdatingInfo}
										<Icon icon="mdi:loading" class="animate-spin -ml-1 mr-2 h-4 w-4" />
										{m['user.account.updatingInfo']()}
									{:else}
										<Icon icon="mdi:update" class="-ml-1 mr-2 h-4 w-4" />
										{m['user.account.update']()}
									{/if}
								</button>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>
