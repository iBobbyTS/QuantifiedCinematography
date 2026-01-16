<script lang="ts">
	import { goto } from '$app/navigation';
	import * as m from '$lib/paraglide/messages.js';
	import Icon from '@iconify/svelte';
	import type { PageData } from './$types';
	import Navbar from '$lib/components/Navbar.svelte';
	import Pagination from '$lib/components/Pagination.svelte';
	import { ITEMS_PER_PAGE_OPTIONS } from '$lib/constants';
	import { parse as devalueParse } from 'devalue';

	let { data }: { data: PageData } = $props();

	// Camera data
	let cameras = $state(data.cameras);
	let totalCameras = $state(data.cameras.length);

	// localStorage key
	const STORAGE_KEY = 'browse-cameras-items-per-page';

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
	// Default: select all types
	let selectedTypes = $state<string[]>(['camera', 'cinema']);
	
	// Brand filter
	// Default: select all brands (initialized once on mount)
	let selectedBrandIds = $state<number[]>([]);
	
	// Available brands from server
	let availableBrands = $state(data.availableBrands || []);
	
	// Initialize selectedBrandIds with all available brands only once on mount
	let brandsInitialized = $state(false);
	$effect(() => {
		if (data.availableBrands) {
			availableBrands = data.availableBrands;
			// Only initialize once when brands are first loaded and not yet initialized
			if (!brandsInitialized && availableBrands.length > 0 && selectedBrandIds.length === 0) {
				selectedBrandIds = availableBrands.map(b => b.id);
				brandsInitialized = true;
			}
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

	// Selection state for comparison
	let selectedCameras = $state(new Set<number>());

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
			sortConfig.brand = sortConfig.brand === 'asc' ? 'desc' : 'asc';
		} else if (field === 'name') {
			if (sortConfig.name) {
				sortConfig.name = sortConfig.name === 'asc' ? 'desc' : 'asc';
			} else {
				sortConfig.name = 'asc';
			}
			delete sortConfig.year;
		} else if (field === 'year') {
			if (sortConfig.year) {
				sortConfig.year = sortConfig.year === 'asc' ? 'desc' : 'asc';
			} else {
				sortConfig.year = 'desc';
			}
			delete sortConfig.name;
		}
		currentPage = 1;
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

	// Handle comparison checkbox change
	function handleComparisonChange(cameraId: number, checked: boolean) {
		const newSet = new Set(selectedCameras);
		if (checked) {
			newSet.add(cameraId);
		} else {
			newSet.delete(cameraId);
		}
		selectedCameras = newSet;
	}

	// Navigate to comparison page
	function navigateToComparison() {
		if (selectedCameras.size > 0) {
			goto('/camera/dynamic-range/browse');
		}
	}

	// Check if at least one camera is selected
	let hasSelection = $derived(selectedCameras.size > 0);
</script>

<svelte:head>
	<title>浏览相机 - {m['app.title']()}</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 pt-16">
	<Navbar centerTitle="app.title" showBackButton={true} />

	<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="text-2xl font-bold text-gray-900 dark:text-white">
				浏览所有相机和摄影机
			</h1>
			<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
				浏览所有已收录的相机和摄影机
			</p>
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
		<div class="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
			<div class="px-4 py-5 sm:p-6">
				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
						<thead class="bg-gray-50 dark:bg-gray-700">
							<tr>
								<th
									class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
									onclick={() => handleSort('brand')}
								>
									<div class="flex items-center gap-1">
										品牌
										{#if sortConfig.brand}
											<Icon
												icon={sortConfig.brand === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'}
												class="w-3 h-3"
											/>
										{/if}
									</div>
								</th>
								<th
									class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
									onclick={() => handleSort('name')}
								>
									<div class="flex items-center gap-1">
										型号
										{#if sortConfig.name}
											<Icon
												icon={sortConfig.name === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'}
												class="w-3 h-3"
											/>
										{/if}
									</div>
								</th>
								<th
									class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
									onclick={() => handleSort('year')}
								>
									<div class="flex items-center gap-1">
										年份
										{#if sortConfig.year}
											<Icon
												icon={sortConfig.year === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'}
												class="w-3 h-3"
											/>
										{/if}
									</div>
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
									动态范围数据
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
									比较
								</th>
							</tr>
						</thead>
						<tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
							{#if cameras.length === 0}
								<tr>
									<td colspan="5" class="px-6 py-12 text-center">
										<Icon icon="mdi:camera-off" class="mx-auto h-12 w-12 text-gray-400" />
										<h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">
											暂无相机
										</h3>
										<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
											没有找到匹配的相机
										</p>
									</td>
								</tr>
							{:else}
								{#each cameras as camera}
									<tr
										class="transition-colors {camera.cinema
											? 'bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700'
											: 'hover:bg-gray-50 dark:hover:bg-gray-700'}"
									>
										<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
											{camera.brandName || '-'}
										</td>
										<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
											{camera.name}
										</td>
										<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
											{camera.releaseYear || '-'}
										</td>
										<td class="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
											{#if camera.recordCount !== undefined && camera.recordCount > 0}
												<button
													onclick={() => goto(`/camera/dynamic-range/manage/${camera.id}`)}
													class="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors px-2 py-1 rounded"
												>
													{camera.recordCount}
												</button>
											{:else}
												<span class="text-gray-400 dark:text-gray-500">0</span>
											{/if}
										</td>
										<td class="px-6 py-4 whitespace-nowrap text-center">
											<input
												type="checkbox"
												class="checkbox checkbox-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
												checked={selectedCameras.has(camera.id)}
												onchange={(e) => handleComparisonChange(camera.id, e.currentTarget.checked)}
											/>
										</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
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

<!-- Floating Comparison Button -->
{#if hasSelection}
	<button
		onclick={navigateToComparison}
		class="fixed bottom-8 right-8 z-50 inline-flex items-center px-6 py-3 border border-transparent rounded-full shadow-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
	>
		动态范围
		<Icon icon="mdi:arrow-right" class="ml-2 h-5 w-5" />
	</button>
{/if}
