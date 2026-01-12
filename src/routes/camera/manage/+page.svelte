<script lang="ts">
	import { goto } from '$app/navigation';
	import * as m from '$lib/paraglide/messages.js';
	import Icon from '@iconify/svelte';
	import type { PageData } from './$types';
	import Navbar from '$lib/components/Navbar.svelte';
	import ConfirmModal from '$lib/components/Modal/ConfirmModal.svelte';
	import ToastManager from '$lib/components/Toast/ToastManager.svelte';
	import Pagination from '$lib/components/Pagination.svelte';
	import { ITEMS_PER_PAGE_OPTIONS } from '$lib/constants';
	import { parse as devalueParse } from 'devalue';

	let { data }: { data: PageData } = $props();

	// Camera data
	let cameras = $state(data.cameras);
	let totalCameras = $state(data.cameras.length);

	// localStorage key
	const STORAGE_KEY = 'manage-cameras-items-per-page';

	// Initialize items per page
	let initialItemsPerPage = 10;
	if (typeof window !== 'undefined') {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved) {
			const savedValue = parseInt(saved);
			if (ITEMS_PER_PAGE_OPTIONS.includes(savedValue)) {
				initialItemsPerPage = savedValue;
			}
		}
	}

	// Pagination state
	let currentPage = $state(1);
	let itemsPerPage = $state(initialItemsPerPage);
	const itemsPerPageOptions = ITEMS_PER_PAGE_OPTIONS;

	// Filter state
	let searchQuery = $state('');
	let searchTimeout: ReturnType<typeof setTimeout> | null = null;

	// Sort state - default: brand ASC, name ASC, year DESC
	let sortConfig = $state<{
		brand: 'asc' | 'desc';
		name: 'asc' | 'desc';
		year: 'asc' | 'desc';
	}>({
		brand: 'asc',
		name: 'asc',
		year: 'desc'
	});

	// Delete confirm modal state
	let showDeleteConfirm = $state(false);
	let cameraToDelete: any = $state(null);
	let isDeleting = $state(false);

	// Toast manager reference
	let toastManager: ToastManager;

	// Search debounce
	function handleSearchInput(event: Event) {
		const target = event.target as HTMLInputElement;
		searchQuery = target.value;

		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}

		searchTimeout = setTimeout(() => {
			triggerFilter();
		}, 500);
	}

	// Sort handler
	function handleSort(field: 'brand' | 'name' | 'year') {
		// Toggle sort direction for the clicked field
		if (sortConfig[field] === 'asc') {
			sortConfig[field] = 'desc';
		} else {
			sortConfig[field] = 'asc';
		}
		// Reset to first page when sorting changes
		currentPage = 1;
		// Trigger filter
		triggerFilter();
	}

	// Collect filter data
	function collectFilterData() {
		const filterData = {
			search: searchQuery.trim() || null,
			sort: sortConfig,
			pagination: {
				page: currentPage,
				limit: itemsPerPage
			}
		};

		return Object.fromEntries(Object.entries(filterData).filter(([_, value]) => value !== null));
	}

	// Trigger filter
	async function triggerFilter() {
		const filterData = collectFilterData();

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
				if (envelope?.type === 'success') {
					success = true;
					data = envelope.data;
					if (typeof data === 'string') {
						try {
							data = devalueParse(data);
						} catch {
							try {
								data = JSON.parse(data);
							} catch {}
						}
					}
				}
			} catch (e) {
				console.error('Error parsing action envelope:', e);
			}

			if (success && data) {
				cameras = data.cameras || [];
				if (data.pagination) {
					totalCameras = data.pagination.total;
				}
			}
		} catch (error) {
			console.error('Filter request failed:', error);
		}
	}

	// Paginated cameras (client-side slice if needed, but we do server-side pagination)
	// Since we update `cameras` directly from server response, we just use `cameras`

	// Open delete confirm
	function openDeleteConfirm(camera: any) {
		cameraToDelete = camera;
		showDeleteConfirm = true;
	}

	// Close delete confirm
	function closeDeleteConfirm() {
		showDeleteConfirm = false;
		cameraToDelete = null;
	}

	// Confirm delete
	async function confirmDeleteCamera() {
		if (!cameraToDelete) return;

		isDeleting = true;

		try {
			const fd = new FormData();
			fd.set('cameraId', String(cameraToDelete.id));
			const response = await fetch('?/deleteCamera', {
				method: 'POST',
				body: fd
			});

			if (response.ok) {
				let ok = true;
				let errorMessage = 'Failed to delete camera';
				try {
					const envelope = await response.json();
					if (envelope?.type === 'failure') {
						ok = false;
						if (envelope.data && typeof envelope.data === 'object' && envelope.data.message) {
							errorMessage = envelope.data.message;
						}
					} else if (envelope?.type === 'success') {
						ok = true;
					}
				} catch {}

				if (ok) {
					const index = cameras.findIndex((c) => c.id === cameraToDelete.id);
					if (index !== -1) {
						cameras.splice(index, 1);
						// Trigger filter to refresh pagination if needed, or just decrement total
						totalCameras--;
					}

					const deletedName = cameraToDelete.name;
					closeDeleteConfirm();

					toastManager.showToast({
						title: m['camera.manage.notifications.delete_success.title'](),
						message: m['camera.manage.notifications.delete_success.message']({ name: deletedName }),
						iconName: 'mdi:check-circle',
						iconColor: 'text-green-500',
						duration: 3000,
						showCountdown: true
					});
					return;
				} else {
					toastManager.showToast({
						title: m['camera.manage.notifications.delete_failure.title'](),
						message: m['camera.manage.notifications.delete_failure.message']({
							name: cameraToDelete.name,
							error: errorMessage
						}),
						iconName: 'mdi:alert-circle',
						iconColor: 'text-red-500',
						duration: 5000,
						showCountdown: true
					});
					return;
				}
			}
		} catch (error) {
			console.error('Error deleting camera:', error);
			toastManager.showToast({
				title: m['camera.manage.notifications.delete_failure.title'](),
				message: m['camera.manage.notifications.delete_failure.message']({
					name: cameraToDelete.name,
					error: 'Network error'
				}),
				iconName: 'mdi:alert-circle',
				iconColor: 'text-red-500',
				duration: 5000,
				showCountdown: true
			});
		} finally {
			isDeleting = false;
			closeDeleteConfirm();
		}
	}
</script>

<svelte:head>
	<title>{m['camera.manage.title']()} - {m['app.title']()}</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 pt-16">
	<Navbar centerTitle="app.title" showBackButton={true} />

	<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<!-- Header -->
		<div class="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
			<div>
				<h1 class="text-2xl font-bold text-gray-900 dark:text-white">
					{m['camera.manage.title']()}
				</h1>
				<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
					{m['camera.manage.subtitle']()}
				</p>
			</div>
			<button
				onclick={() => goto('/camera/add')}
				class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
			>
				<Icon icon="mdi:plus" class="mr-2 h-5 w-5" />
				{m['camera.manage.add_camera']()}
			</button>
		</div>

		<!-- Filters -->
		<div class="bg-white dark:bg-gray-800 rounded-lg shadow mb-6 p-4">
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<!-- Search -->
				<div class="md:col-span-1">
					<label
						for="search"
						class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
					>
						{m['camera.manage.filter.fuzzy_search']()}
					</label>
					<div class="relative rounded-md shadow-sm">
						<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
							<Icon icon="mdi:magnify" class="h-5 w-5 text-gray-400" />
						</div>
						<input
							type="text"
							name="search"
							id="search"
							class="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md h-10"
							placeholder={m['camera.manage.filter.search_placeholder']()}
							value={searchQuery}
							oninput={handleSearchInput}
						/>
					</div>
				</div>
			</div>
		</div>

		<!-- Top Pagination Component -->
		{#if totalCameras > 0}
			<div class="mb-4">
				<Pagination
					bind:currentPage
					bind:itemsPerPage
					totalItems={totalCameras}
					storageKey={STORAGE_KEY}
					{itemsPerPageOptions}
					dropdownPosition="bottom"
					onPageChange={(page) => {
						currentPage = page;
						triggerFilter();
					}}
					onItemsPerPageChange={(limit) => {
						itemsPerPage = limit;
						currentPage = 1;
						localStorage.setItem(STORAGE_KEY, limit.toString());
						triggerFilter();
					}}
				/>
			</div>
		{/if}

		<!-- Table -->
		<div class="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
			<div class="overflow-auto">
				<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700 relative">
					<thead class="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
						<tr>
							<th
								scope="col"
								class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
								onclick={() => handleSort('brand')}
							>
								<div class="flex items-center gap-1">
									{m['camera.manage.table.brand']()}
									<Icon
										icon={sortConfig.brand === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'}
										class="w-3 h-3"
									/>
								</div>
							</th>
							<th
								scope="col"
								class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
								onclick={() => handleSort('name')}
							>
								<div class="flex items-center gap-1">
									{m['camera.manage.table.name']()}
									<Icon
										icon={sortConfig.name === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'}
										class="w-3 h-3"
									/>
								</div>
							</th>
							<th
								scope="col"
								class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
								onclick={() => handleSort('year')}
							>
								<div class="flex items-center gap-1">
									{m['camera.manage.table.release_year']()}
									<Icon
										icon={sortConfig.year === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'}
										class="w-3 h-3"
									/>
								</div>
							</th>
							<th
								scope="col"
								class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
							>
								{m['camera.manage.table.actions']()}
							</th>
						</tr>
					</thead>
					<tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
						{#if cameras.length === 0}
							<tr>
								<td colspan="4" class="px-6 py-12 text-center">
									<Icon icon="mdi:camera-off" class="mx-auto h-12 w-12 text-gray-400" />
									<h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">
										{m['camera.manage.empty_state.title']()}
									</h3>
									<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
										{m['camera.manage.empty_state.description']()}
									</p>
								</td>
							</tr>
						{:else}
							{#each cameras as camera}
								<tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
										{camera.brandName || '-'}
									</td>
									<td
										class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white"
									>
										{camera.name}
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
										{camera.releaseYear || '-'}
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
										<button
											onclick={() => goto(`/camera/edit/${camera.id}`)}
											class="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4"
											title={m['camera.manage.actions.edit']()}
										>
											<Icon icon="mdi:pencil" class="h-5 w-5" />
										</button>
										<button
											onclick={() => openDeleteConfirm(camera)}
											class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
											title={m['camera.manage.actions.delete']()}
										>
											<Icon icon="mdi:delete" class="h-5 w-5" />
										</button>
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</div>

		<!-- Bottom Pagination Component -->
		{#if totalCameras > 0}
			<div class="mt-4">
				<Pagination
					bind:currentPage
					bind:itemsPerPage
					totalItems={totalCameras}
					storageKey={STORAGE_KEY}
					{itemsPerPageOptions}
					dropdownPosition="top"
					onPageChange={(page) => {
						currentPage = page;
						triggerFilter();
					}}
					onItemsPerPageChange={(limit) => {
						itemsPerPage = limit;
						currentPage = 1;
						localStorage.setItem(STORAGE_KEY, limit.toString());
						triggerFilter();
					}}
				/>
			</div>
		{/if}
	</main>
</div>

<!-- Delete Confirmation Modal -->
<ConfirmModal
	isOpen={showDeleteConfirm}
	title={m['camera.manage.confirmations.delete_title']()}
	message={m['camera.manage.confirmations.delete_message']({ name: cameraToDelete?.name || '' })}
	confirmText={m['camera.manage.confirmations.delete_confirm']()}
	cancelText={m['camera.manage.confirmations.delete_cancel']()}
	confirmButtonColor="bg-red-600 hover:bg-red-700 focus:ring-red-500"
	isLoading={isDeleting}
	onConfirm={confirmDeleteCamera}
	onCancel={closeDeleteConfirm}
/>

<!-- Toast Manager -->
<ToastManager bind:this={toastManager} />
