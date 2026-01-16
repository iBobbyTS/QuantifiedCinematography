<script lang="ts">
	import { goto } from '$app/navigation';
	import * as m from '$lib/paraglide/messages.js';
	import Icon from '@iconify/svelte';
	import type { PageData } from './$types';
	import Navbar from '$lib/components/Navbar.svelte';
	import ConfirmModal from '$lib/components/Modal/ConfirmModal.svelte';
	import ToastManager from '$lib/components/Toast/ToastManager.svelte';
	import Pagination from '$lib/components/Pagination.svelte';
	import CameraTable, { type Camera } from '$lib/components/CameraTable.svelte';
	import { ITEMS_PER_PAGE_OPTIONS } from '$lib/constants';
	import { parse as devalueParse } from 'devalue';

	let { data }: { data: PageData } = $props();

	// Camera data
	let cameras = $state<Camera[]>(data.cameras || []);
	let totalCameras = $state(0);

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
	
	// Type filter: 'cinema' for 电影机, 'camera' for 照相机
	// Default: select all types (initialized via $effect to show animation)
	let selectedTypes = $state<string[]>([]);
	
	// Brand filter
	// Default: select all brands (initialized once on mount)
	let selectedBrandIds = $state<number[]>([]);
	
	// Available brands from server
	let availableBrands = $state(data.availableBrands || []);
	
	// Initialize selectedTypes and selectedBrandIds with default values via $effect
	let filtersInitialized = $state(false);
	$effect(() => {
		if (!filtersInitialized) {
			// Initialize types to all (camera and cinema)
			if (selectedTypes.length === 0) {
				selectedTypes = ['camera', 'cinema'];
			}
			
			// Initialize brands when available
			if (data.availableBrands) {
				availableBrands = data.availableBrands;
				if (availableBrands.length > 0 && selectedBrandIds.length === 0) {
					selectedBrandIds = availableBrands.map(b => b.id);
				}
			}
			
			filtersInitialized = true;
		}
	});

	// Sort state - brand always exists, name and year are mutually exclusive
	// Default: brand ASC, name ASC
	let sortConfig = $state<{
		brand: 'asc' | 'desc';
		name?: 'asc' | 'desc';
		year?: 'asc' | 'desc';
	}>({
		brand: 'asc',
		name: 'asc'
	});

	// Delete confirm modal state
	let showDeleteConfirm = $state(false);
	let cameraToDelete: Camera | null = $state(null);
	let isDeleting = $state(false);

	// Toast manager reference
	let toastManager: ToastManager;

	// Trigger filter on mount based on localStorage preference
	let filterTriggered = $state(false);
	$effect(() => {
		// Only trigger once on initial load
		if (!filterTriggered && typeof window !== 'undefined') {
			filterTriggered = true;
			// Always trigger filter on mount to load data with user's preferred pagination
			currentPage = 1;
			triggerFilter();
		}
	});

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
		if (field === 'brand') {
			// Brand always exists, just toggle direction
			sortConfig.brand = sortConfig.brand === 'asc' ? 'desc' : 'asc';
		} else if (field === 'name') {
			// Name and year are mutually exclusive
			if (sortConfig.name) {
				// Currently sorting by name, toggle direction
				sortConfig.name = sortConfig.name === 'asc' ? 'desc' : 'asc';
			} else {
				// Currently sorting by year (or neither), switch to name
				sortConfig.name = 'asc';
			}
			// Remove year if it exists
			delete sortConfig.year;
		} else if (field === 'year') {
			// Name and year are mutually exclusive
			if (sortConfig.year) {
				// Currently sorting by year, toggle direction
				sortConfig.year = sortConfig.year === 'asc' ? 'desc' : 'asc';
			} else {
				// Currently sorting by name (or neither), switch to year
				sortConfig.year = 'desc';
			}
			// Remove name if it exists
			delete sortConfig.name;
		}
		// Reset to first page when sorting changes
		currentPage = 1;
		// Trigger filter
		triggerFilter();
	}

	// Collect filter data
	function collectFilterData() {
		const filterData: any = {
			search: searchQuery.trim() || null,
			sort: sortConfig,
			pagination: {
				page: currentPage,
				limit: itemsPerPage
			}
		};

		// Add type filter if any selected
		if (selectedTypes.length > 0) {
			filterData.types = selectedTypes;
		}

		// Add brand filter if any selected
		if (selectedBrandIds.length > 0) {
			filterData.brandIds = selectedBrandIds;
		}

		return Object.fromEntries(Object.entries(filterData).filter(([_, value]) => value !== null));
	}
	
	// Handle type checkbox change
	function handleTypeChange(type: string, checked: boolean) {
		if (checked) {
			if (!selectedTypes.includes(type)) {
				selectedTypes = [...selectedTypes, type];
			}
		} else {
			selectedTypes = selectedTypes.filter(t => t !== type);
		}
		// Reset to first page and trigger filter
		currentPage = 1;
		triggerFilter();
	}
	
	// Handle brand checkbox change
	function handleBrandChange(brandId: number, checked: boolean) {
		if (checked) {
			if (!selectedBrandIds.includes(brandId)) {
				selectedBrandIds = [...selectedBrandIds, brandId];
			}
		} else {
			selectedBrandIds = selectedBrandIds.filter(id => id !== brandId);
		}
		// Reset to first page and trigger filter
		currentPage = 1;
		triggerFilter();
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
	function openDeleteConfirm(camera: Camera) {
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

		// Save reference to avoid null checks
		const camera = cameraToDelete;
		isDeleting = true;

		try {
			const fd = new FormData();
			fd.set('cameraId', String(camera.id));
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
					const index = cameras.findIndex((c) => c.id === camera.id);
					if (index !== -1) {
						cameras.splice(index, 1);
						// Trigger filter to refresh pagination if needed, or just decrement total
						totalCameras--;
					}

					const deletedName = camera.name;
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
							name: camera.name,
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
					name: camera.name,
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
	<Navbar centerTitle="camera.manage.title" showBackButton={true} />

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
		<div class="bg-white dark:bg-gray-800 shadow sm:rounded-md mb-4">
			<div class="px-4 py-4 sm:py-5">
				<!-- 过滤条件表格 -->
				<div class="overflow-hidden">
					<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
						<tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
							<!-- 第一行：模糊搜索 -->
							<tr>
								<td
									class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white w-20"
								>
									{m['camera.manage.filter.fuzzy_search']()}
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<input
										id="search-input"
										type="text"
										placeholder={m['camera.manage.filter.search_placeholder']()}
										class="w-1/2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
										value={searchQuery}
										oninput={handleSearchInput}
									/>
								</td>
							</tr>

							<!-- 第二行：类型过滤 -->
							<tr>
								<td
									class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white w-20"
								>
									类型
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="flex flex-wrap gap-3">
										<label class="flex items-center gap-2 cursor-pointer">
											<input
												type="checkbox"
												class="checkbox checkbox-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
												checked={selectedTypes.includes('camera')}
												onchange={(e) => handleTypeChange('camera', e.currentTarget.checked)}
											/>
											<span class="text-sm text-gray-700 dark:text-gray-300">照相机</span>
										</label>
										<label class="flex items-center gap-2 cursor-pointer">
											<input
												type="checkbox"
												class="checkbox checkbox-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
												checked={selectedTypes.includes('cinema')}
												onchange={(e) => handleTypeChange('cinema', e.currentTarget.checked)}
											/>
											<span class="text-sm text-gray-700 dark:text-gray-300">电影机</span>
										</label>
									</div>
								</td>
							</tr>

							<!-- 第三行：品牌过滤 -->
							<tr>
								<td
									class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white w-20"
								>
									品牌
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="flex flex-wrap gap-3">
										{#if availableBrands.length === 0}
											<p class="text-sm text-gray-500 dark:text-gray-400">暂无品牌</p>
										{:else}
											{#each availableBrands as brand}
												<label class="flex items-center gap-2 cursor-pointer">
													<input
														type="checkbox"
														class="checkbox checkbox-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
														checked={selectedBrandIds.includes(brand.id)}
														onchange={(e) => handleBrandChange(brand.id, e.currentTarget.checked)}
													/>
													<span class="text-sm text-gray-700 dark:text-gray-300">{brand.name}</span>
												</label>
											{/each}
										{/if}
									</div>
								</td>
							</tr>
						</tbody>
					</table>
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
		<CameraTable
			{cameras}
			{sortConfig}
			onSort={handleSort}
			onEdit={(camera) => goto(`/camera/edit/${camera.id}`)}
			onDelete={openDeleteConfirm}
		/>

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
