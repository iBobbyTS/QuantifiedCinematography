<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import Icon from '@iconify/svelte';
	import type { PageData } from './$types';
	import Navbar from '$lib/components/Navbar.svelte';
	import ToastManager from '$lib/components/Toast/ToastManager.svelte';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	// Camera and records data
	let camera = $state(data.camera);
	let records = $state(data.records);

	// Edit mode state
	let isEditMode = $state(false);

	// Toast manager reference
	let toastManager: ToastManager;

	// Editable records (copy for editing)
	let editableRecords = $state<Array<Record<string, any>>>([]);

	// Delete confirmation modal state
	let showDeleteModal = $state(false);
	let recordToDelete = $state<any>(null);
	let isDeleting = $state(false);

	// Column visibility state - grouped to match CSV template order
	const columnGroups = [
		[
			{ key: 'ei', label: () => m['camera.dynamic_range_upload.modal.fields.ei']() },
			{ key: 'iso', label: () => m['camera.dynamic_range_upload.modal.fields.iso']() },
			{ key: 'specialMode', label: () => m['camera.dynamic_range_upload.modal.fields.special_mode']() }
		],
		[
			{ key: 'codec', label: () => m['camera.dynamic_range_upload.modal.fields.codec']() },
			{ key: 'log', label: () => m['camera.dynamic_range_upload.modal.fields.log']() },
			{ key: 'bitDepth', label: () => m['camera.dynamic_range_upload.modal.fields.bit_depth']() },
			{ key: 'chromaSubsampling', label: () => m['camera.dynamic_range_upload.modal.fields.chroma_subsampling']() },
			{ key: 'bitrate', label: () => m['camera.dynamic_range_upload.modal.fields.bitrate']() }
		],
		[
			{ key: 'resolution', label: () => m['camera.dynamic_range_upload.modal.fields.resolution']() },
			{ key: 'framerate', label: () => m['camera.dynamic_range_upload.modal.fields.framerate']() },
			{ key: 'crop', label: () => m['camera.dynamic_range_upload.modal.fields.crop']() }
		],
		[
			{ key: 'slopeBased', label: () => m['camera.dynamic_range_upload.modal.fields.slope_based']() },
			{ key: 'snr1', label: () => m['camera.dynamic_range_upload.modal.fields.snr1']() },
			{ key: 'snr2', label: () => m['camera.dynamic_range_upload.modal.fields.snr2']() },
			{ key: 'snr4', label: () => m['camera.dynamic_range_upload.modal.fields.snr4']() },
			{ key: 'snr10', label: () => m['camera.dynamic_range_upload.modal.fields.snr10']() },
			{ key: 'snr40', label: () => m['camera.dynamic_range_upload.modal.fields.snr40']() }
		]
	];

	// All column keys - matching CSV template order: EI, ISO, Special Mode, Codec, Log Type, Bit Depth, Chroma Subsampling, Bitrate, Resolution, Framerate, Crop, Slope-based, SNR=1, SNR=2, SNR=4, SNR=10, SNR=40
	const allColumnKeys = [
		'ei',
		'iso',
		'specialMode',
		'codec',
		'log',
		'bitDepth',
		'chromaSubsampling',
		'bitrate',
		'resolution',
		'framerate',
		'crop',
		'slopeBased',
		'snr1',
		'snr2',
		'snr4',
		'snr10',
		'snr40'
	];

	// Column visibility map - initialize based on data
	let columnVisibility = $state<Record<string, boolean>>({});

	// Initialize column visibility immediately based on initial data
	(function initializeVisibility() {
		const visibility: Record<string, boolean> = {};
		if (data.records && data.records.length > 0) {
			allColumnKeys.forEach((key) => {
				// Check if any record has data for this column
				const hasData = data.records.some((record: any) => {
					const value = record[key];
					// Check for non-empty values
					if (value === null || value === undefined) return false;
					if (typeof value === 'string' && value.trim() === '') return false;
					if (typeof value === 'number' && isNaN(value)) return false;
					return true;
				});
				visibility[key] = hasData;
			});
		} else {
			// If no records, default all to true
			allColumnKeys.forEach((key) => {
				visibility[key] = true;
			});
		}
		columnVisibility = visibility;
	})();

	// Track if we should skip reinitializing editableRecords (to preserve user edits after update)
	let skipReinit = $state(false);

	// Table scroll state
	let tableContainer = $state<HTMLDivElement | null>(null);
	let showLeftArrow = $state(false);
	let showRightArrow = $state(false);

	// Check scroll position and update arrow visibility
	function checkScrollPosition() {
		if (!tableContainer) return;
		const { scrollLeft, scrollWidth, clientWidth } = tableContainer;
		const isScrollable = scrollWidth > clientWidth;
		showLeftArrow = isScrollable && scrollLeft > 0;
		showRightArrow = isScrollable && scrollLeft < scrollWidth - clientWidth - 1; // -1 for rounding errors
	}

	// Scroll table left or right
	function scrollTable(direction: 'left' | 'right') {
		if (!tableContainer) return;
		const scrollAmount = 300; // pixels to scroll
		const currentScroll = tableContainer.scrollLeft;
		const newScroll = direction === 'left' 
			? currentScroll - scrollAmount 
			: currentScroll + scrollAmount;
		tableContainer.scrollTo({ left: newScroll, behavior: 'smooth' });
	}

	// Initialize scroll checking
	$effect(() => {
		if (tableContainer) {
			checkScrollPosition();
			tableContainer.addEventListener('scroll', checkScrollPosition);
			// Also check on resize
			const resizeObserver = new ResizeObserver(() => {
				checkScrollPosition();
			});
			resizeObserver.observe(tableContainer);
			return () => {
				tableContainer?.removeEventListener('scroll', checkScrollPosition);
				resizeObserver.disconnect();
			};
		}
	});

	// Check scroll position when visible columns change
	$effect(() => {
		// Access visibleColumns to create dependency
		visibleColumns;
		// Use requestAnimationFrame to wait for DOM update after column visibility changes
		if (tableContainer) {
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					checkScrollPosition();
				});
			});
		}
	});

	// Initialize editable records when entering edit mode
	$effect(() => {
		if (isEditMode && records.length > 0 && !skipReinit) {
			editableRecords = records.map((record) => ({
				id: record.id,
				ei: record.ei?.toString() || '',
				iso: record.iso?.toString() || '',
				specialMode: record.specialMode || '',
				codec: record.codec || '',
				log: record.log || '',
				bitDepth: record.bitDepth?.toString() || '',
				chromaSubsampling: record.chromaSubsampling || '',
				bitrate: record.bitrate || '',
				resolution: record.resolution || '',
				framerate: record.framerate || '',
				crop: record.crop || '',
				slopeBased: record.slopeBased?.toString() || '',
				snr1: record.snr1?.toString() || '',
				snr2: record.snr2?.toString() || '',
				snr4: record.snr4?.toString() || '',
				snr10: record.snr10?.toString() || '',
				snr40: record.snr40?.toString() || ''
			}));
		}
	});

	// Handle form submission with enhance
	function handleUpdate({ formData }: any) {
		// Update formData with current editableRecords before submission
		formData.set('records', JSON.stringify(editableRecords));

		return async ({ result }: any) => {
			if (result.type === 'success') {
				// Update records to reflect the saved state (sync with editableRecords)
				// This keeps the data in sync without losing user's edits
				skipReinit = true;
				records = records.map((record) => {
					const editableRecord = editableRecords.find((er) => er.id === record.id);
					if (editableRecord) {
						return {
							...record,
							ei: editableRecord.ei ? parseInt(editableRecord.ei) : null,
							iso: editableRecord.iso ? parseInt(editableRecord.iso) : null,
							specialMode: editableRecord.specialMode || null,
							codec: editableRecord.codec || null,
							log: editableRecord.log || null,
							bitDepth: editableRecord.bitDepth ? parseInt(editableRecord.bitDepth) : null,
							chromaSubsampling: editableRecord.chromaSubsampling || null,
							bitrate: editableRecord.bitrate || null,
							resolution: editableRecord.resolution || null,
							framerate: editableRecord.framerate || null,
							crop: editableRecord.crop || null,
							slopeBased: editableRecord.slopeBased ? parseFloat(editableRecord.slopeBased) : null,
							snr1: editableRecord.snr1 ? parseFloat(editableRecord.snr1) : null,
							snr2: editableRecord.snr2 ? parseFloat(editableRecord.snr2) : null,
							snr4: editableRecord.snr4 ? parseFloat(editableRecord.snr4) : null,
							snr10: editableRecord.snr10 ? parseFloat(editableRecord.snr10) : null,
							snr40: editableRecord.snr40 ? parseFloat(editableRecord.snr40) : null
						};
					}
					return record;
				});
				skipReinit = false;
				
				// Show success toast
				toastManager.showToast({
					title: m['camera.dynamic_range_upload.dynamic_range_manage.update_success'](),
					message: '',
					iconName: 'mdi:check-circle',
					iconColor: 'text-green-500',
					duration: 3000,
					showCountdown: false
				});
			} else if (result.type === 'failure') {
				let errorMessage = m['camera.dynamic_range_upload.dynamic_range_manage.update_error']();
				if (result.data) {
					if (typeof result.data === 'object' && result.data.message) {
						errorMessage = result.data.message;
					} else if (typeof result.data === 'string') {
						errorMessage = result.data;
					} else if (Array.isArray(result.data) && result.data.length > 0) {
						errorMessage = result.data[result.data.length - 1];
					}
				}
				toastManager.showToast({
					title: m['camera.dynamic_range_upload.dynamic_range_manage.update_failure'](),
					message: errorMessage,
					iconName: 'mdi:alert-circle',
					iconColor: 'text-red-500',
					duration: 5000,
					showCountdown: true
				});
			}
		};
	}

	// Column widths for edit mode (in pixels)
	const columnWidths: Record<string, number> = {
		ei: 75, // 6 digits
		iso: 85, // 6 digits
		specialMode: 200, // 10 Chinese characters
		codec: 100, // 10 English letters
		log: 80, // 10 English letters
		bitDepth: 5, // 2 digits
		chromaSubsampling: 60, // 4 digits
		bitrate: 60, // 4 digits
		resolution: 100, // 10 English letters
		framerate: 60, // 8 digits
		crop: 100, // 10 English letters
		slopeBased: 60, // 4 digits + decimal point
		snr1: 60, // 4 digits + decimal point
		snr2: 60, // 4 digits + decimal point
		snr4: 60, // 4 digits + decimal point
		snr10: 60, // 4 digits + decimal point
		snr40: 60 // 4 digits + decimal point
	};

	// Helper function to get column width
	function getColumnWidth(columnKey: string): string {
		if (isEditMode && columnWidths[columnKey]) {
			return `${columnWidths[columnKey]}px`;
		}
		return 'auto';
	}

	// Table columns (all columns) - matching CSV template order: EI, ISO, Special Mode, Codec, Log Type, Bit Depth, Chroma Subsampling, Bitrate, Resolution, Framerate, Crop, Slope-based, SNR=1, SNR=2, SNR=4, SNR=10, SNR=40
	const allColumns = [
		{ key: 'ei', label: () => m['camera.dynamic_range_upload.modal.fields.ei']() },
		{ key: 'iso', label: () => m['camera.dynamic_range_upload.modal.fields.iso']() },
		{ key: 'specialMode', label: () => m['camera.dynamic_range_upload.modal.fields.special_mode']() },
		{ key: 'codec', label: () => m['camera.dynamic_range_upload.modal.fields.codec']() },
		{ key: 'log', label: () => m['camera.dynamic_range_upload.modal.fields.log']() },
		{ key: 'bitDepth', label: () => m['camera.dynamic_range_upload.modal.fields.bit_depth']() },
		{ key: 'chromaSubsampling', label: () => m['camera.dynamic_range_upload.modal.fields.chroma_subsampling']() },
		{ key: 'bitrate', label: () => m['camera.dynamic_range_upload.modal.fields.bitrate']() },
		{ key: 'resolution', label: () => m['camera.dynamic_range_upload.modal.fields.resolution']() },
		{ key: 'framerate', label: () => m['camera.dynamic_range_upload.modal.fields.framerate']() },
		{ key: 'crop', label: () => m['camera.dynamic_range_upload.modal.fields.crop']() },
		{ key: 'slopeBased', label: () => m['camera.dynamic_range_upload.modal.fields.slope_based']() },
		{ key: 'snr1', label: () => m['camera.dynamic_range_upload.modal.fields.snr1']() },
		{ key: 'snr2', label: () => m['camera.dynamic_range_upload.modal.fields.snr2']() },
		{ key: 'snr4', label: () => m['camera.dynamic_range_upload.modal.fields.snr4']() },
		{ key: 'snr10', label: () => m['camera.dynamic_range_upload.modal.fields.snr10']() },
		{ key: 'snr40', label: () => m['camera.dynamic_range_upload.modal.fields.snr40']() }
	];

	// Filtered columns based on visibility
	const visibleColumns = $derived(
		allColumns.filter((col) => columnVisibility[col.key] !== false)
	);

	// Check if all columns are selected
	const allColumnsSelected = $derived(
		allColumnKeys.every((key) => columnVisibility[key] === true)
	);

	// Handle select all / deselect all
	function handleSelectAll(checked: boolean) {
		allColumnKeys.forEach((key) => {
			columnVisibility[key] = checked;
		});
	}

	// Helper function to get cell value
	function getCellValue(record: any, columnKey: string): string {
		if (isEditMode) {
			const editableRecord = editableRecords.find((r) => r.id === record.id);
			return editableRecord?.[columnKey] || '';
		} else {
			return record[columnKey]?.toString() || '-';
		}
	}

	// Helper function to update cell value
	function updateCellValue(recordId: number, columnKey: string, value: string) {
		const editableRecord = editableRecords.find((r) => r.id === recordId);
		if (editableRecord) {
			editableRecord[columnKey] = value;
		}
	}

	// Open delete confirmation modal
	function openDeleteModal(record: any) {
		recordToDelete = record;
		showDeleteModal = true;
	}

	// Close delete confirmation modal
	function closeDeleteModal() {
		showDeleteModal = false;
		recordToDelete = null;
	}

	// Get field label by key
	function getFieldLabel(key: string): string {
		const column = allColumns.find((col) => col.key === key);
		return column ? column.label() : key;
	}

	// Get record fields with values
	function getRecordFields(record: any): Array<{ key: string; label: string; value: any }> {
		const fields: Array<{ key: string; label: string; value: any }> = [];
		allColumnKeys.forEach((key) => {
			const value = record[key];
			if (value !== null && value !== undefined && value !== '') {
				if (typeof value === 'number' && !isNaN(value)) {
					fields.push({ key, label: getFieldLabel(key), value: value.toString() });
				} else if (typeof value === 'string' && value.trim() !== '') {
					fields.push({ key, label: getFieldLabel(key), value: value.trim() });
				}
			}
		});
		return fields;
	}

	// Confirm delete record
	async function confirmDelete() {
		if (!recordToDelete) return;

		isDeleting = true;

		try {
			const fd = new FormData();
			fd.set('recordId', recordToDelete.id.toString());

			const response = await fetch('?/deleteRecord', {
				method: 'POST',
				body: fd
			});

			if (response.ok) {
				const result = await response.json();
				if (result.type === 'success') {
					// Remove record from local state
					records = records.filter((r) => r.id !== recordToDelete.id);
					editableRecords = editableRecords.filter((r) => r.id !== recordToDelete.id);

					// Close modal
					closeDeleteModal();

					// Show success toast
					toastManager.showToast({
						title: '删除成功',
						message: '',
						iconName: 'mdi:check-circle',
						iconColor: 'text-green-500',
						duration: 3000,
						showCountdown: false
					});
				} else {
					let errorMessage = '删除失败';
					if (result.data) {
						if (typeof result.data === 'object' && result.data.message) {
							errorMessage = result.data.message;
						} else if (typeof result.data === 'string') {
							errorMessage = result.data;
						} else if (Array.isArray(result.data) && result.data.length > 0) {
							errorMessage = result.data[result.data.length - 1];
						}
					}
					toastManager.showToast({
						title: '删除失败',
						message: errorMessage,
						iconName: 'mdi:alert-circle',
						iconColor: 'text-red-500',
						duration: 5000,
						showCountdown: true
					});
				}
			} else {
				toastManager.showToast({
					title: '删除失败',
					message: '网络错误',
					iconName: 'mdi:alert-circle',
					iconColor: 'text-red-500',
					duration: 5000,
					showCountdown: true
				});
			}
		} catch (error) {
			console.error('Delete error:', error);
			toastManager.showToast({
				title: '删除失败',
				message: '网络错误',
				iconName: 'mdi:alert-circle',
				iconColor: 'text-red-500',
				duration: 5000,
				showCountdown: true
			});
		} finally {
			isDeleting = false;
		}
	}
</script>

<Navbar
	centerTitle={`${camera.brandName || ''} ${camera.name} ${m['camera.dynamic_range_upload.dynamic_range_manage.title']()}`}
	centerTitleDirect={true}
	showBackButton={true}
	backButtonUrl={`/camera/dynamic-range/manage#camera-${camera.id}`}
/>
<ToastManager bind:this={toastManager} />

<div class="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16 transition-colors duration-200">
	<div class="mx-auto py-8 px-4 sm:px-6 lg:px-8">
		<!-- Header -->
		<div class="mb-6 space-y-4">
			<!-- Switch for view/edit mode -->
			<div class="flex items-center gap-3 mt-4">
				<span class="text-sm font-medium text-gray-700 dark:text-gray-300">
					{m['camera.dynamic_range_upload.dynamic_range_manage.view_mode']()}
				</span>
				<label class="relative inline-flex items-center cursor-pointer">
					<input
						type="checkbox"
						bind:checked={isEditMode}
						class="sr-only peer"
					/>
					<div
						class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
					></div>
				</label>
				<span class="text-sm font-medium text-gray-700 dark:text-gray-300">
					{m['camera.dynamic_range_upload.dynamic_range_manage.edit_mode']()}
				</span>
			</div>

			<!-- Column visibility selector -->
			{#if records.length > 0}
				<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
					<div class="flex items-center gap-2 mb-3">
						<h3 class="text-sm font-medium text-gray-700 dark:text-gray-300">
							{m['camera.dynamic_range_upload.dynamic_range_manage.show_columns']()}
						</h3>
						<label class="flex items-center gap-2 cursor-pointer">
							<input
								type="checkbox"
								checked={allColumnsSelected}
								onchange={(e) => handleSelectAll(e.currentTarget.checked)}
								class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
							/>
							<span class="text-sm text-gray-700 dark:text-gray-300">
								全选
							</span>
						</label>
					</div>
					<div class="space-y-3">
						{#each columnGroups as group}
							<div class="flex flex-wrap items-center gap-4">
								{#each group as column}
									<label class="flex items-center gap-2 cursor-pointer">
										<input
											type="checkbox"
											bind:checked={columnVisibility[column.key]}
											class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
										/>
										<span class="text-sm text-gray-700 dark:text-gray-300">
											{column.label()}
										</span>
									</label>
								{/each}
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		<!-- Table -->
		{#if records.length === 0}
			<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
				<Icon icon="mdi:database-off" class="mx-auto h-12 w-12 text-gray-400" />
				<h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">
					{m['camera.dynamic_range_upload.dynamic_range_manage.empty_state.title']()}
				</h3>
				<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
					{m['camera.dynamic_range_upload.dynamic_range_manage.empty_state.description']()}
				</p>
			</div>
		{:else}
			<form method="POST" action="?/updateRecords" use:enhance={handleUpdate}>
				<div class="bg-white dark:bg-gray-800 shadow sm:rounded-lg relative">
					<!-- Left arrow -->
					{#if showLeftArrow}
						<button
							type="button"
							onclick={() => scrollTable('left')}
							class="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/50 dark:bg-gray-800/50 border border-gray-300/50 dark:border-gray-600/50 rounded-r-md p-2 shadow-lg hover:bg-white/70 dark:hover:bg-gray-800/70 transition-colors backdrop-blur-sm"
							aria-label="Scroll left"
						>
							<Icon icon="mdi:chevron-left" class="w-6 h-6 text-gray-600 dark:text-gray-300 opacity-50" />
						</button>
					{/if}
					<!-- Right arrow -->
					{#if showRightArrow}
						<button
							type="button"
							onclick={() => scrollTable('right')}
							class="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/50 dark:bg-gray-800/50 border border-gray-300/50 dark:border-gray-600/50 rounded-l-md p-2 shadow-lg hover:bg-white/70 dark:hover:bg-gray-800/70 transition-colors backdrop-blur-sm"
							aria-label="Scroll right"
						>
							<Icon icon="mdi:chevron-right" class="w-6 h-6 text-gray-600 dark:text-gray-300 opacity-50" />
						</button>
					{/if}
					<div class="overflow-x-auto" bind:this={tableContainer}>
						<table class="divide-y divide-gray-200 dark:divide-gray-700" style="width: max-content;">
							<thead class="bg-gray-50 dark:bg-gray-700">
								<tr>
									<th
										scope="col"
										class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap"
									>
										#
									</th>
									{#if isEditMode}
										<th
											scope="col"
											class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap"
										>
											操作
										</th>
									{/if}
									{#each visibleColumns as column}
										<th
											scope="col"
											class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap"
											style={isEditMode ? `width: ${getColumnWidth(column.key)}; min-width: ${getColumnWidth(column.key)};` : ''}
										>
											{column.label()}
										</th>
									{/each}
								</tr>
							</thead>
							<tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
								{#each records as record, index}
									<tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
										<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
											{index + 1}
										</td>
										{#if isEditMode}
											<td class="px-6 py-4 whitespace-nowrap text-sm">
												<button
													type="button"
													onclick={() => openDeleteModal(record)}
													class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
													aria-label="删除"
												>
													<Icon icon="mdi:delete" class="w-5 h-5" />
												</button>
											</td>
										{/if}
										{#each visibleColumns as column}
											<td 
												class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white"
												style={isEditMode ? `width: ${getColumnWidth(column.key)}; min-width: ${getColumnWidth(column.key)};` : ''}
											>
												{#if isEditMode}
													<input
														type="text"
														value={getCellValue(record, column.key)}
														oninput={(e) =>
															updateCellValue(
																record.id,
																column.key,
																e.currentTarget.value
															)}
														style={`width: ${getColumnWidth(column.key)};`}
														class="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
													/>
												{:else}
													{getCellValue(record, column.key)}
												{/if}
											</td>
										{/each}
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>

				<!-- Update Button (only visible in edit mode) -->
				{#if isEditMode}
					<div class="mt-6 flex justify-end">
						<button
							type="submit"
							class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
						>
							<Icon icon="mdi:content-save" class="mr-2 h-4 w-4" />
							{m['camera.dynamic_range_upload.dynamic_range_manage.update_button']()}
						</button>
					</div>
				{/if}
			</form>
		{/if}
	</div>
</div>

<!-- Delete Confirmation Modal -->
{#if showDeleteModal && recordToDelete}
	<div
		class="fixed inset-0 bg-gray-900/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
		onclick={(e) => {
			if (e.target === e.currentTarget) closeDeleteModal();
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') closeDeleteModal();
		}}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<div
			class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-700"
		>
			<!-- Header -->
			<div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
				<h3 class="text-lg font-medium text-gray-900 dark:text-white">
					是否确认删除本条数据
				</h3>
			</div>

			<!-- Body -->
			<div class="px-6 py-4">
				<div class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
					<div>
						<span class="font-medium text-gray-700 dark:text-gray-300">品牌：</span>
						{camera.brandName || '-'}
					</div>
					<div>
						<span class="font-medium text-gray-700 dark:text-gray-300">型号：</span>
						{camera.name || '-'}
					</div>
					{#each getRecordFields(recordToDelete) as field}
						<div>
							<span class="font-medium text-gray-700 dark:text-gray-300">{field.label}：</span>
							{field.value}
						</div>
					{/each}
				</div>
			</div>

			<!-- Footer -->
			<div
				class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3"
			>
				<button
					onclick={closeDeleteModal}
					disabled={isDeleting}
					class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					取消
				</button>
				<button
					onclick={confirmDelete}
					disabled={isDeleting}
					class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
				>
					{#if isDeleting}
						<Icon icon="mdi:loading" class="animate-spin -ml-1 mr-2 h-4 w-4" />
					{/if}
					删除
				</button>
			</div>
		</div>
	</div>
{/if}
