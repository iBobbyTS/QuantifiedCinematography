<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import Icon from '@iconify/svelte';
	import type { PageData } from './$types';
	import Navbar from '$lib/components/Navbar.svelte';
	import ToastManager from '$lib/components/Toast/ToastManager.svelte';
	import Pagination from '$lib/components/Pagination.svelte';
	import CameraTable from '$lib/components/CameraTable.svelte';
	import { ITEMS_PER_PAGE_OPTIONS } from '$lib/constants';
	import { parse as devalueParse } from 'devalue';
	import { getLocale } from '$lib/paraglide/runtime.js';

	let { data }: { data: PageData } = $props();

	// Camera data
	let cameras = $state(data.cameras);
	let totalCameras = $state(data.cameras.length);

	// localStorage key
	const STORAGE_KEY = 'dynamic-range-upload-items-per-page';

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

	// Selection state
	let selectedCameras = $state(new Set<number>());

	// Modal state
	let showModal = $state(false);
	let isDownloading = $state(false);
	let isUploading = $state(false);
	let uploadFileInput = $state<HTMLInputElement | null>(null);

	// Toast manager reference
	let toastManager: ToastManager;

	// Field name mapping for localization
	const fieldNameMap: Record<string, () => string> = {
		'EI': () => m['camera.dynamic_range_upload.modal.fields.ei'](),
		'ISO': () => m['camera.dynamic_range_upload.modal.fields.iso'](),
		'Codec': () => m['camera.dynamic_range_upload.modal.fields.codec'](),
		'Log Type': () => m['camera.dynamic_range_upload.modal.fields.log'](),
		'Bit Depth': () => m['camera.dynamic_range_upload.modal.fields.bit_depth'](),
		'Chroma Subsampling': () => m['camera.dynamic_range_upload.modal.fields.chroma_subsampling'](),
		'Bitrate': () => m['camera.dynamic_range_upload.modal.fields.bitrate'](),
		'Resolution': () => m['camera.dynamic_range_upload.modal.fields.resolution'](),
		'Framerate': () => m['camera.dynamic_range_upload.modal.fields.framerate'](),
		'Crop': () => m['camera.dynamic_range_upload.modal.fields.crop'](),
		'Slope-based': () => m['camera.dynamic_range_upload.modal.fields.slope_based'](),
		'SNR=1': () => m['camera.dynamic_range_upload.modal.fields.snr1'](),
		'SNR=2': () => m['camera.dynamic_range_upload.modal.fields.snr2'](),
		'SNR=4': () => m['camera.dynamic_range_upload.modal.fields.snr4'](),
		'SNR=10': () => m['camera.dynamic_range_upload.modal.fields.snr10'](),
		'SNR=40': () => m['camera.dynamic_range_upload.modal.fields.snr40']()
	};

	// Field definitions
	const fieldGroups = [
		{
			description: m['camera.dynamic_range_upload.modal.row1.description'](),
			fields: ['EI', 'ISO']
		},
		{
			description: m['camera.dynamic_range_upload.modal.row2.description'](),
			fields: ['Codec', 'Log Type', 'Bit Depth', 'Chroma Subsampling', 'Bitrate']
		},
		{
			description: m['camera.dynamic_range_upload.modal.row3.description'](),
			fields: ['Resolution', 'Framerate', 'Crop']
		},
		{
			description: '',
			fields: ['Slope-based', 'SNR=1', 'SNR=2', 'SNR=4', 'SNR=10', 'SNR=40']
		}
	];


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

	// Handle selection change
	function handleSelectionChange(cameraId: number, selected: boolean) {
		// Selection is already updated in the Set, no need to do anything here
	}

	// Open modal and download CSV
	async function openModal() {
		if (selectedCameras.size === 0) return;
		
		// Download CSV template first
		isDownloading = true;
		try {
			const fd = new FormData();
			fd.set('cameraIds', JSON.stringify(Array.from(selectedCameras)));
			// Use all available fields for the template
			const allFields = ['EI', 'ISO', 'Special Mode', 'Codec', 'Log Type', 'Bit Depth', 'Chroma Subsampling', 'Bitrate', 'Resolution', 'Framerate', 'Crop', 'Slope-based', 'SNR=1', 'SNR=2', 'SNR=4', 'SNR=10', 'SNR=40'];
			fd.set('selectedFields', JSON.stringify(allFields));
			// Add locale for CSV header localization
			fd.set('locale', getLocale());

			const response = await fetch('/api/camera/dynamic-range/template', {
				method: 'POST',
				body: fd
			});

			if (response.ok) {
				const blob = await response.blob();
				const url = window.URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = `dynamic_range_template_${Date.now()}.csv`;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				window.URL.revokeObjectURL(url);
				// Show modal after successful download
				showModal = true;
			} else {
				let errorMessage = m['camera.dynamic_range_upload.modal.download_failed_message']();
				try {
					const errorData = await response.json();
					if (errorData.message) {
						errorMessage = errorData.message;
					}
				} catch {
					// Ignore JSON parse errors
				}
				toastManager.showToast({
					title: m['camera.dynamic_range_upload.modal.download_failed'](),
					message: errorMessage,
					iconName: 'mdi:alert-circle',
					iconColor: 'text-red-500',
					duration: 5000,
					showCountdown: true
				});
			}
		} catch (error) {
			console.error('Download error:', error);
			toastManager.showToast({
				title: m['camera.dynamic_range_upload.modal.download_failed'](),
				message: m['camera.dynamic_range_upload.modal.network_error'](),
				iconName: 'mdi:alert-circle',
				iconColor: 'text-red-500',
				duration: 5000,
				showCountdown: true
			});
		} finally {
			isDownloading = false;
		}
	}

	// Close modal
	function closeModal() {
		showModal = false;
	}

	// Redownload template
	async function redownloadTemplate() {
		if (selectedCameras.size === 0) return;
		
		isDownloading = true;
		try {
			const fd = new FormData();
			fd.set('cameraIds', JSON.stringify(Array.from(selectedCameras)));
			const allFields = ['EI', 'ISO', 'Special Mode', 'Codec', 'Log Type', 'Bit Depth', 'Chroma Subsampling', 'Bitrate', 'Resolution', 'Framerate', 'Crop', 'Slope-based', 'SNR=1', 'SNR=2', 'SNR=4', 'SNR=10', 'SNR=40'];
			fd.set('selectedFields', JSON.stringify(allFields));
			// Add locale for CSV header localization
			fd.set('locale', getLocale());

			const response = await fetch('/api/camera/dynamic-range/template', {
				method: 'POST',
				body: fd
			});

			if (response.ok) {
				const blob = await response.blob();
				const url = window.URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = `dynamic_range_template_${Date.now()}.csv`;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				window.URL.revokeObjectURL(url);
			} else {
				let errorMessage = m['camera.dynamic_range_upload.modal.download_failed_message']();
				try {
					const errorData = await response.json();
					if (errorData.message) {
						errorMessage = errorData.message;
					}
				} catch {
					// Ignore JSON parse errors
				}
				toastManager.showToast({
					title: m['camera.dynamic_range_upload.modal.download_failed'](),
					message: errorMessage,
					iconName: 'mdi:alert-circle',
					iconColor: 'text-red-500',
					duration: 5000,
					showCountdown: true
				});
			}
		} catch (error) {
			console.error('Download error:', error);
			toastManager.showToast({
				title: m['camera.dynamic_range_upload.modal.download_failed'](),
				message: m['camera.dynamic_range_upload.modal.network_error'](),
				iconName: 'mdi:alert-circle',
				iconColor: 'text-red-500',
				duration: 5000,
				showCountdown: true
			});
		} finally {
			isDownloading = false;
		}
	}


	// Handle file upload
	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) {
			uploadData(file);
		}
	}

	// Upload data
	async function uploadData(file: File) {
		isUploading = true;
		try {
			const fd = new FormData();
			fd.set('file', file);

			const response = await fetch('?/uploadData', {
				method: 'POST',
				body: fd
			});

			if (response.ok) {
				const result = await response.json();
				toastManager.showToast({
					title: m['camera.dynamic_range_upload.modal.upload_success'](),
					message: result.message || 'Data uploaded successfully',
					iconName: 'mdi:check-circle',
					iconColor: 'text-green-500',
					duration: 5000,
					showCountdown: true
				});
				closeModal();
				// Reset file input
				if (uploadFileInput) {
					uploadFileInput.value = '';
				}
			} else {
				const error = await response.json();
				toastManager.showToast({
					title: m['camera.dynamic_range_upload.modal.upload_failure']({ error: error.message || 'Unknown error' }),
					message: error.message || 'Failed to upload data',
					iconName: 'mdi:alert-circle',
					iconColor: 'text-red-500',
					duration: 5000,
					showCountdown: true
				});
			}
		} catch (error) {
			console.error('Upload error:', error);
			toastManager.showToast({
				title: m['camera.dynamic_range_upload.modal.upload_failure']({ error: 'Network error' }),
				message: 'Network error',
				iconName: 'mdi:alert-circle',
				iconColor: 'text-red-500',
				duration: 5000,
				showCountdown: true
			});
		} finally {
			isUploading = false;
		}
	}

	// Check if at least one camera is selected
	let hasSelection = $derived(selectedCameras.size > 0);

	// Get selected cameras info
	let selectedCamerasInfo = $derived(
		Array.from(selectedCameras)
			.map(id => cameras.find(c => c.id === id))
			.filter((c): c is NonNullable<typeof c> => c !== undefined)
	);

	// Format selected cameras by brand
	let formattedSelectedCameras = $derived(() => {
		// Group cameras by brand
		const brandMap = new Map<string, string[]>();
		
		selectedCamerasInfo.forEach(camera => {
			const brand = camera.brandName || 'Unknown';
			if (!brandMap.has(brand)) {
				brandMap.set(brand, []);
			}
			brandMap.get(brand)!.push(camera.name);
		});

		// Format output
		const result: string[] = [];
		brandMap.forEach((models, brand) => {
			// Sort models for consistent display
			models.sort();
			
			if (models.length >= 2) {
				// Format as "Brand: Model1, Model2, ..."
				result.push(`${brand}: ${models.join(', ')}`);
			} else {
				// Format as "Brand Model" (original format)
				result.push(`${brand} ${models[0]}`);
			}
		});

		// Sort by brand name for consistent display
		result.sort();
		return result;
	});
</script>

<svelte:head>
	<title>{m['camera.dynamic_range_upload.title']()} - {m['app.title']()}</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 pt-16">
	<Navbar centerTitle="app.title" showBackButton={true} />

	<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="text-2xl font-bold text-gray-900 dark:text-white">
				{m['camera.dynamic_range_upload.title']()}
			</h1>
			<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
				{m['camera.dynamic_range_upload.subtitle']()}
			</p>
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
		<CameraTable
			{cameras}
			{sortConfig}
			onSort={handleSort}
			showCheckbox={true}
			bind:selectedCameras
			onSelectionChange={handleSelectionChange}
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

<!-- Floating Next Button -->
<button
	onclick={openModal}
	disabled={!hasSelection}
	class="fixed bottom-8 right-8 z-50 inline-flex items-center px-6 py-3 border border-transparent rounded-full shadow-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
	title={hasSelection ? m['camera.dynamic_range_upload.next_button']() : 'Please select at least one camera'}
>
	<Icon icon="mdi:arrow-right" class="mr-2 h-5 w-5" />
	{m['camera.dynamic_range_upload.next_button']()}
</button>

<!-- Modal -->
{#if showModal}
	<div
		class="fixed inset-0 bg-gray-900/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
		onclick={(e) => e.target === e.currentTarget && closeModal()}
		onkeydown={(e) => e.key === 'Escape' && closeModal()}
		role="dialog"
		aria-modal="true"
		aria-labelledby="upload-modal-title"
		tabindex="-1"
	>
		<div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
			<!-- Header -->
			<div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
				<div class="flex items-center justify-between">
					<div>
						<h3 id="upload-modal-title" class="text-lg font-medium text-gray-900 dark:text-white">
							{m['camera.dynamic_range_upload.modal.title']()}
						</h3>
					</div>
					<button
						onclick={closeModal}
						disabled={isDownloading || isUploading}
						class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 ml-4"
					>
						<Icon icon="mdi:close" class="w-5 h-5" />
					</button>
				</div>
			</div>

			<!-- Body -->
			<div class="px-6 py-4 space-y-0">
				<!-- Section 1: Selected cameras list -->
				<div class="py-4">
					<div class="space-y-1">
						{#each formattedSelectedCameras() as formattedCamera}
							<p class="text-sm text-gray-600 dark:text-gray-400">
								{formattedCamera}
							</p>
						{/each}
					</div>
				</div>

				<!-- Divider 1 -->
				<div class="border-t border-gray-200 dark:border-gray-700 my-4"></div>

				<!-- Section 2: Redownload Template -->
				<div class="py-4">
					<h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
						{m['camera.dynamic_range_upload.modal.redownload_section_title']()}
					</h4>
					<button
						onclick={redownloadTemplate}
						disabled={isDownloading || isUploading}
						class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
					>
						{#if isDownloading}
							<Icon icon="mdi:loading" class="animate-spin -ml-1 mr-2 h-4 w-4" />
						{:else}
							<Icon icon="mdi:download" class="mr-2 h-4 w-4" />
						{/if}
						{m['camera.dynamic_range_upload.modal.redownload']()}
					</button>
				</div>

				<!-- Divider 2 -->
				<div class="border-t border-gray-200 dark:border-gray-700 my-4"></div>

				<!-- Section 3: Upload CSV File -->
				<div class="py-4">
					<h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
						{m['camera.dynamic_range_upload.modal.upload_section_title']()}
					</h4>
					<input
						id="csv-upload-input"
						bind:this={uploadFileInput}
						type="file"
						accept=".csv"
						onchange={handleFileSelect}
						disabled={isUploading}
						class="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-gray-700 dark:file:text-gray-300 disabled:opacity-50"
					/>
				</div>

				<!-- Divider 3 -->
				<div class="border-t border-gray-200 dark:border-gray-700 my-4"></div>

				<!-- Section 4: Notes -->
				<div class="py-4 space-y-4">
					<h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
						{m['camera.dynamic_range_upload.modal.notes_section_title']()}
					</h4>
					<!-- Notes list -->
					<div class="space-y-2">
						<p class="text-xs text-gray-500 dark:text-gray-400">
							{m['camera.dynamic_range_upload.modal.note_do_not_modify_camera_id']()}
						</p>
						<p class="text-xs text-gray-500 dark:text-gray-400">
							{m['camera.dynamic_range_upload.modal.additional_note']()}
						</p>
					</div>
					{#each fieldGroups as group}
						{#if group.description}
							<div class="space-y-2">
								<p class="text-xs text-gray-500 dark:text-gray-400 whitespace-pre-line">
									{@html group.description.replace(/\*\*(.*?)\*\*/g, '<strong style="text-decoration: underline;">$1</strong>')}
								</p>
							</div>
						{/if}
					{/each}
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Toast Manager -->
<ToastManager bind:this={toastManager} />
