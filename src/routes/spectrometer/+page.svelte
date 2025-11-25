<script lang="ts">
	import { page } from '$app/stores';
	import * as m from '$lib/paraglide/messages.js';
	import Icon from '@iconify/svelte';
	import type { PageData } from './$types';
	import Navbar from '$lib/components/Navbar.svelte';
	import ConfirmModal from '$lib/components/Modal/ConfirmModal.svelte';
	import ToastManager from '$lib/components/Toast/ToastManager.svelte';
	import { parse as devalueParse } from 'devalue';

	let { data }: { data: PageData } = $props();

	// 光谱仪数据 - 创建可修改的本地副本
	let spectrometers = $state(data.spectrometers);

	// 过滤状态
	let searchQuery = $state('');
	let searchTimeout: ReturnType<typeof setTimeout> | null = null;

	// 删除确认弹窗状态
	let showDeleteConfirm = $state(false);
	let spectrometerToDelete: any = $state(null);
	let isDeleting = $state(false);

	// 重命名弹窗状态
	let showRenameModal = $state(false);
	let spectrometerToRename: any = $state(null);
	let newName = $state('');
	let isRenaming = $state(false);

	// 添加光谱仪弹窗状态
	let showAddModal = $state(false);
	let spectrometerName = $state('');
	let isAdding = $state(false);

	// 处理添加光谱仪弹窗的 message（加粗处理）
	let addModalMessage = $derived(
		m['spectrometer.add_modal.message']().replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
	);

	// Toast 管理器引用
	let toastManager: ToastManager;

	// 搜索防抖函数
	function handleSearchInput(event: Event) {
		const target = event.target as HTMLInputElement;
		searchQuery = target.value;

		// 清除之前的定时器
		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}

		// 设置新的定时器，0.5秒后触发搜索
		searchTimeout = setTimeout(() => {
			triggerFilter();
		}, 500);
	}

	// 统一的过滤触发函数
	async function triggerFilter() {
		const filterData = {
			search: searchQuery.trim() || null
		};

		try {
			const fd = new FormData();
			fd.set('payload', JSON.stringify(filterData));
			const response = await fetch('?/filter', {
				method: 'POST',
				body: fd
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			let success = false;
			let data: any = null;
			try {
				const envelope = await response.json();
				// SvelteKit action envelope
				if (envelope?.type === 'success') {
					success = true;
					data = envelope.data;
					// 兼容 devalue 字符串格式（SvelteKit 5 使用 devalue 序列化）
					if (typeof data === 'string') {
						try {
							data = devalueParse(data);
						} catch {
							try {
								data = JSON.parse(data);
							} catch (e) {
								console.error('Failed to parse data:', e);
							}
						}
					}
				} else if (envelope?.type === 'failure') {
					success = false;
					console.error('Filter action failed:', envelope?.data);
				}
			} catch (e) {
				console.error('Error parsing action envelope:', e);
			}

			if (success && data) {
				// 只提取 id 和 name 字段
				const parsedSpectrometers = (data.spectrometers || []).map((s: any) => ({
					id: s.id,
					name: s.name
				}));
				spectrometers = parsedSpectrometers;
			}
		} catch (error) {
			console.error('Filter request failed:', error);
		}
	}

	// 当 data.spectrometers 变化时更新本地副本
	$effect(() => {
		spectrometers = [...data.spectrometers];
	});

	// 打开重命名弹窗
	function openRenameModal(spectrometer: any) {
		spectrometerToRename = spectrometer;
		newName = spectrometer.name;
		showRenameModal = true;
	}

	// 关闭重命名弹窗
	function closeRenameModal() {
		showRenameModal = false;
		spectrometerToRename = null;
		newName = '';
	}

	// 确认重命名
	async function confirmRename() {
		if (!spectrometerToRename || !newName.trim()) return;

		isRenaming = true;

		try {
			const fd = new FormData();
			fd.set('spectrometerId', spectrometerToRename.id.toString());
			fd.set('name', newName.trim());
			const response = await fetch('?/rename', {
				method: 'POST',
				body: fd
			});

			if (response.ok) {
				let success = false;
				let errorMessage = 'Failed to rename spectrometer';
				try {
					const envelope = await response.json();
					if (envelope?.type === 'failure') {
						success = false;
						if (envelope.data && typeof envelope.data === 'object' && envelope.data.message) {
							errorMessage = envelope.data.message;
						} else if (Array.isArray(envelope.data) && envelope.data.length > 0) {
							errorMessage = envelope.data[envelope.data.length - 1];
						} else if (typeof envelope.data === 'string') {
							try {
								const parsedData = JSON.parse(envelope.data);
								if (Array.isArray(parsedData) && parsedData.length > 0) {
									errorMessage = parsedData[parsedData.length - 1];
								}
							} catch (e) {
								errorMessage = envelope.data;
							}
						}
					} else if (envelope?.type === 'success') {
						success = true;
					}
				} catch {}

				if (success) {
					// 更新本地数据
					const index = spectrometers.findIndex((s) => s.id === spectrometerToRename.id);
					if (index !== -1) {
						spectrometers[index].name = newName.trim();
					}
					closeRenameModal();

					// 显示成功 Toast
					toastManager.showToast({
						title: m['spectrometer.toasts.rename_success_title'](),
						message: m['spectrometer.toasts.rename_success_message'](),
						iconName: 'mdi:check-circle',
						iconColor: 'text-green-500',
						duration: 3000,
						showCountdown: true
					});
				} else {
					// 显示错误 Toast
					toastManager.showToast({
						title: m['spectrometer.toasts.rename_error_title'](),
						message: errorMessage,
						iconName: 'mdi:alert-circle',
						iconColor: 'text-red-500',
						duration: 5000,
						showCountdown: true
					});
				}
			} else {
				let msg = m['spectrometer.toasts.rename_error_title']();
				try {
					const data = await response.json();
					msg = data?.message || msg;
				} catch {}
				toastManager.showToast({
					title: m['spectrometer.toasts.rename_error_title'](),
					message: msg,
					iconName: 'mdi:alert-circle',
					iconColor: 'text-red-500',
					duration: 5000,
					showCountdown: true
				});
			}
		} catch (error) {
			console.error('Error renaming spectrometer:', error);
			toastManager.showToast({
				title: m['spectrometer.toasts.rename_error_title'](),
				message: m['spectrometer.toasts.rename_error_network'](),
				iconName: 'mdi:alert-circle',
				iconColor: 'text-red-500',
				duration: 5000,
				showCountdown: true
			});
		} finally {
			isRenaming = false;
		}
	}

	// 打开删除确认弹窗
	function openDeleteConfirm(spectrometer: any) {
		spectrometerToDelete = spectrometer;
		showDeleteConfirm = true;
	}

	// 关闭删除确认弹窗
	function closeDeleteConfirm() {
		showDeleteConfirm = false;
		spectrometerToDelete = null;
	}

	// 确认删除光谱仪
	async function confirmDeleteSpectrometer() {
		if (!spectrometerToDelete) return;

		isDeleting = true;

		try {
			const fd = new FormData();
			fd.set('spectrometerId', spectrometerToDelete.id.toString());
			const response = await fetch('?/delete', {
				method: 'POST',
				body: fd
			});

			if (response.ok) {
				let success = false;
				let errorMessage = 'Failed to delete spectrometer';
				try {
					const envelope = await response.json();
					if (envelope?.type === 'failure') {
						success = false;
						if (envelope.data && typeof envelope.data === 'object' && envelope.data.message) {
							errorMessage = envelope.data.message;
						} else if (Array.isArray(envelope.data) && envelope.data.length > 0) {
							errorMessage = envelope.data[envelope.data.length - 1];
						} else if (typeof envelope.data === 'string') {
							try {
								const parsedData = JSON.parse(envelope.data);
								if (Array.isArray(parsedData) && parsedData.length > 0) {
									errorMessage = parsedData[parsedData.length - 1];
								}
							} catch (e) {
								errorMessage = envelope.data;
							}
						}
					} else if (envelope?.type === 'success') {
						success = true;
					}
				} catch {}

				if (success) {
					const index = spectrometers.findIndex((s) => s.id === spectrometerToDelete.id);
					if (index !== -1) {
						spectrometers.splice(index, 1);
					}

					const deletedName = spectrometerToDelete.name;
					closeDeleteConfirm();

					// 显示成功 Toast
					toastManager.showToast({
						title: m['spectrometer.toasts.delete_success_title'](),
						message: m['spectrometer.toasts.delete_success_message']({ name: deletedName }),
						iconName: 'mdi:check-circle',
						iconColor: 'text-green-500',
						duration: 3000,
						showCountdown: true
					});
				} else {
					toastManager.showToast({
						title: m['spectrometer.toasts.delete_error_title'](),
						message: errorMessage,
						iconName: 'mdi:alert-circle',
						iconColor: 'text-red-500',
						duration: 5000,
						showCountdown: true
					});
				}
			} else {
				let msg = m['spectrometer.toasts.delete_error_title']();
				try {
					const data = await response.json();
					msg = data?.message || msg;
				} catch {}
				toastManager.showToast({
					title: m['spectrometer.toasts.delete_error_title'](),
					message: msg,
					iconName: 'mdi:alert-circle',
					iconColor: 'text-red-500',
					duration: 5000,
					showCountdown: true
				});
			}
		} catch (error) {
			console.error('Error deleting spectrometer:', error);
			toastManager.showToast({
				title: m['spectrometer.toasts.delete_error_title'](),
				message: m['spectrometer.toasts.delete_error_network'](),
				iconName: 'mdi:alert-circle',
				iconColor: 'text-red-500',
				duration: 5000,
				showCountdown: true
			});
		} finally {
			isDeleting = false;
		}
	}

	// 打开添加光谱仪弹窗
	function openAddModal() {
		spectrometerName = '';
		showAddModal = true;
	}

	// 关闭添加光谱仪弹窗
	function closeAddModal() {
		showAddModal = false;
		spectrometerName = '';
	}

	// 确认添加光谱仪
	async function confirmAddSpectrometer() {
		if (!spectrometerName.trim()) return;

		isAdding = true;

		try {
			const fd = new FormData();
			fd.set('name', spectrometerName.trim());
			const response = await fetch('?/add', {
				method: 'POST',
				body: fd
			});

			if (response.ok) {
				let success = false;
				let errorMessage = 'Failed to add spectrometer';
				try {
					const envelope = await response.json();
					if (envelope?.type === 'failure') {
						success = false;
						if (envelope.data && typeof envelope.data === 'object' && envelope.data.message) {
							errorMessage = envelope.data.message;
						} else if (Array.isArray(envelope.data) && envelope.data.length > 0) {
							errorMessage = envelope.data[envelope.data.length - 1];
						} else if (typeof envelope.data === 'string') {
							try {
								const parsedData = JSON.parse(envelope.data);
								if (Array.isArray(parsedData) && parsedData.length > 0) {
									errorMessage = parsedData[parsedData.length - 1];
								}
							} catch (e) {
								errorMessage = envelope.data;
							}
						}
					} else if (envelope?.type === 'success') {
						success = true;
					}
				} catch {}

				if (success) {
					// 保存添加前的名称用于 Toast
					const addedName = spectrometerName.trim();
					closeAddModal();

					// 重新加载数据（使用当前的搜索条件）
					await triggerFilter();

					// 显示成功 Toast
					toastManager.showToast({
						title: m['spectrometer.toasts.add_success_title'](),
						message: m['spectrometer.toasts.add_success_message']({ name: addedName }),
						iconName: 'mdi:check-circle',
						iconColor: 'text-green-500',
						duration: 3000,
						showCountdown: true
					});
				} else {
					// 显示错误 Toast
					toastManager.showToast({
						title: m['spectrometer.toasts.add_error_title'](),
						message: errorMessage,
						iconName: 'mdi:alert-circle',
						iconColor: 'text-red-500',
						duration: 5000,
						showCountdown: true
					});
				}
			} else {
				let msg = m['spectrometer.toasts.add_error_title']();
				try {
					const data = await response.json();
					msg = data?.message || msg;
				} catch {}
				toastManager.showToast({
					title: m['spectrometer.toasts.add_error_title'](),
					message: msg,
					iconName: 'mdi:alert-circle',
					iconColor: 'text-red-500',
					duration: 5000,
					showCountdown: true
				});
			}
		} catch (error) {
			console.error('Error adding spectrometer:', error);
			toastManager.showToast({
				title: m['spectrometer.toasts.add_error_title'](),
				message: m['spectrometer.toasts.add_error_network'](),
				iconName: 'mdi:alert-circle',
				iconColor: 'text-red-500',
				duration: 5000,
				showCountdown: true
			});
		} finally {
			isAdding = false;
		}
	}
</script>

<svelte:head>
	<title>{m['spectrometer.title']()} - {m['app.title']()}</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16">
	<!-- Navbar -->
	<Navbar centerTitle="app.title" showBackButton={true} />

	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<!-- Header -->
		<div class="mb-8">
			<div class="flex items-start justify-between">
				<div>
					<h1 class="text-3xl font-bold text-gray-900 dark:text-white">
						{m['spectrometer.title']()}
					</h1>
					<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
						{@html m['spectrometer.subtitle']().replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}
					</p>
				</div>
				<button
					onclick={openAddModal}
					class="inline-flex items-center whitespace-nowrap px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-500 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400 dark:hover:border-blue-500"
				>
					<Icon icon="mdi:plus" class="w-4 h-4 mr-2" />
					{m['spectrometer.add_spectrometer']()}
				</button>
			</div>
		</div>

		<!-- Filter Table -->
		<div class="bg-white dark:bg-gray-800 shadow sm:rounded-md mb-4">
			<div class="px-4 py-4 sm:py-5">
				<div class="overflow-hidden">
					<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
						<tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
							<!-- 模糊搜索 -->
							<tr>
								<td
									class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white w-20"
								>
									{m['spectrometer.filter.fuzzy_search']()}
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<input
										id="search-input"
										type="text"
										placeholder={m['spectrometer.filter.search_placeholder']()}
										class="w-1/2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
										oninput={handleSearchInput}
									/>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</div>

		<!-- Spectrometers Table -->
		<div class="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
			<div class="px-4 py-5 sm:p-6">
				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
						<thead class="bg-gray-50 dark:bg-gray-700">
							<tr>
								<th
									class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
								>
									{m['spectrometer.table.name']()}
								</th>
								<th
									class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
								>
									{m['spectrometer.table.actions']()}
								</th>
							</tr>
						</thead>
						<tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
							{#each spectrometers as spectrometer}
								<tr>
									<td
										class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white"
									>
										{spectrometer.name}
									</td>
									<td
										class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700 dark:text-gray-200"
									>
										<div class="flex space-x-2">
											<button
												onclick={() => openRenameModal(spectrometer)}
												class="p-2 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20"
												title={m['spectrometer.actions.rename']()}
											>
												<Icon icon="mdi:pencil" class="w-5 h-5" />
											</button>
											<button
												onclick={() => openDeleteConfirm(spectrometer)}
												class="p-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-200 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
												title={m['spectrometer.actions.delete']()}
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

				{#if spectrometers.length === 0}
					<div class="text-center py-12">
						<Icon icon="mdi:spectrometer" class="mx-auto h-12 w-12 text-gray-400" />
						<h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">
							{m['spectrometer.empty_state.title']()}
						</h3>
						<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
							{m['spectrometer.empty_state.description']()}
						</p>
						<div class="mt-6">
							<button
								onclick={openAddModal}
								class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-500 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400 dark:hover:border-blue-500"
							>
								<Icon icon="mdi:plus" class="w-4 h-4 mr-2" />
								{m['spectrometer.add_spectrometer']()}
							</button>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- Delete Confirmation Modal -->
<ConfirmModal
	bind:isOpen={showDeleteConfirm}
	title={m['spectrometer.confirmations.delete_title']()}
	message={spectrometerToDelete
		? m['spectrometer.confirmations.delete_message']({ name: spectrometerToDelete.name })
		: ''}
	confirmText={m['spectrometer.confirmations.delete_confirm']()}
	cancelText={m['spectrometer.confirmations.delete_cancel']()}
	confirmButtonColor="bg-red-600 hover:bg-red-700"
	iconName="mdi:delete-alert"
	iconColor="text-red-500"
	isLoading={isDeleting}
	onConfirm={confirmDeleteSpectrometer}
	onCancel={closeDeleteConfirm}
/>

<!-- Rename Modal -->
{#if showRenameModal && spectrometerToRename}
	<div
		class="fixed inset-0 bg-gray-900/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
		onclick={(e) => e.target === e.currentTarget && closeRenameModal()}
		onkeydown={(e) => e.key === 'Escape' && closeRenameModal()}
		role="dialog"
		aria-modal="true"
		aria-labelledby="rename-modal-title"
		tabindex="-1"
	>
		<div
			class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-700"
		>
			<!-- Header -->
			<div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
				<div class="flex items-center justify-between">
					<h3 id="rename-modal-title" class="text-lg font-medium text-gray-900 dark:text-white">
						{m['spectrometer.actions.rename']()}
					</h3>
					<button
						onclick={closeRenameModal}
						disabled={isRenaming}
						class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
					>
						<Icon icon="mdi:close" class="w-5 h-5" />
					</button>
				</div>
			</div>

			<!-- Body -->
			<div class="px-6 py-4">
				<label
					for="spectrometer-name"
					class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
				>
					{m['spectrometer.table.name']()}
				</label>
				<input
					id="spectrometer-name"
					type="text"
					bind:value={newName}
					disabled={isRenaming}
					class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
					placeholder={m['spectrometer.filter.search_placeholder']()}
					onkeydown={(e) => e.key === 'Enter' && !isRenaming && confirmRename()}
				/>
			</div>

			<!-- Footer -->
			<div
				class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3"
			>
				<button
					onclick={closeRenameModal}
					disabled={isRenaming}
					class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 hover:border-gray-200 dark:hover:bg-gray-600 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
				>
					{m['spectrometer.confirmations.delete_cancel']()}
				</button>
				<button
					onclick={confirmRename}
					disabled={!newName.trim() || isRenaming}
					class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-400 dark:hover:border-blue-500"
				>
					{#if isRenaming}
						<Icon icon="mdi:loading" class="animate-spin -ml-1 mr-2 h-4 w-4" />
						Renaming...
					{:else}
						{m['spectrometer.actions.rename']()}
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Add Spectrometer Modal -->
{#if showAddModal}
	<div
		class="fixed inset-0 bg-gray-900/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
		onclick={(e) => e.target === e.currentTarget && closeAddModal()}
		onkeydown={(e) => e.key === 'Escape' && closeAddModal()}
		role="dialog"
		aria-modal="true"
		aria-labelledby="add-spectrometer-modal-title"
		tabindex="-1"
	>
		<div
			class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-700"
		>
			<!-- Header -->
			<div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
				<div class="flex items-center justify-between">
					<h3
						id="add-spectrometer-modal-title"
						class="text-lg font-medium text-gray-900 dark:text-white"
					>
						{m['spectrometer.add_modal.title']()}
					</h3>
					<button
						onclick={closeAddModal}
						disabled={isAdding}
						class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
					>
						<Icon icon="mdi:close" class="w-5 h-5" />
					</button>
				</div>
			</div>

			<!-- Body -->
			<div class="px-6 py-4">
				<p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
					{@html addModalMessage}
				</p>
				<input
					id="spectrometer-name-input"
					type="text"
					bind:value={spectrometerName}
					placeholder={m['spectrometer.add_modal.input_placeholder']()}
					disabled={isAdding}
					class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
					onkeydown={(e) => {
						if (e.key === 'Enter' && !isAdding && spectrometerName.trim()) {
							confirmAddSpectrometer();
						}
					}}
				/>
			</div>

			<!-- Footer -->
			<div
				class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3"
			>
				<button
					onclick={closeAddModal}
					disabled={isAdding}
					class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
				>
					{m['spectrometer.add_modal.cancel_button']()}
				</button>
				<button
					onclick={confirmAddSpectrometer}
					disabled={!spectrometerName.trim() || isAdding}
					class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-400 dark:hover:border-blue-500"
				>
					{#if isAdding}
						<Icon icon="mdi:loading" class="animate-spin -ml-1 mr-2 h-4 w-4" />
						Adding...
					{:else}
						{m['spectrometer.add_modal.add_button']()}
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Toast Manager -->
<ToastManager bind:this={toastManager} />
