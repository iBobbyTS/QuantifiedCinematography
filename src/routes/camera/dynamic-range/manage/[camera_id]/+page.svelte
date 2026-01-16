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

	// Track deleted record IDs (only in memory, not persisted until update)
	let deletedRecordIds = $state<Set<number>>(new Set());

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

	// Temporary ID counter for new records (use negative numbers to avoid conflicts)
	let tempIdCounter = $state(-1);

	// Add new record
	function addNewRecord() {
		const newRecord = {
			id: tempIdCounter--, // Use negative ID for new records
			ei: '',
			iso: '',
			specialMode: '',
			codec: '',
			log: '',
			bitDepth: '',
			chromaSubsampling: '',
			bitrate: '',
			resolution: '',
			framerate: '',
			crop: '',
			slopeBased: '',
			snr1: '',
			snr2: '',
			snr4: '',
			snr10: '',
			snr40: ''
		};
		editableRecords = [...editableRecords, newRecord];
		// Also add to records for display (using any to bypass type checking for temporary records)
		// Use the userId from the first existing record, or empty string as fallback
		const existingUserId = records.length > 0 ? records[0].userId : '';
		const tempRecord: any = {
			id: newRecord.id,
			cameraId: camera.id,
			userId: existingUserId,
			ei: null,
			iso: null,
			specialMode: null,
			codec: null,
			log: null,
			bitDepth: null,
			chromaSubsampling: null,
			bitrate: null,
			resolution: null,
			framerate: null,
			crop: null,
			slopeBased: null,
			snr1: null,
			snr2: null,
			snr4: null,
			snr10: null,
			snr40: null,
			createdAt: new Date()
		};
		records = [...records, tempRecord];
	}

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
		if (isEditMode && !skipReinit) {
			if (records.length > 0) {
				// If there are existing records, initialize editableRecords from them
				// Only initialize if editableRecords is empty to avoid overwriting user edits
				if (editableRecords.length === 0) {
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
			} else {
				// If no records exist, automatically add one empty record
				// Only add if editableRecords is empty to avoid duplicate additions
				if (editableRecords.length === 0) {
					addNewRecord();
				}
			}
		} else if (!isEditMode) {
			// Clear editableRecords when exiting edit mode
			editableRecords = [];
		}
	});

	// Check if a record has at least one non-empty field
	function hasData(record: any): boolean {
		return !!(
			(record.ei && record.ei.trim() !== '') ||
			(record.iso && record.iso.trim() !== '') ||
			(record.specialMode && record.specialMode.trim() !== '') ||
			(record.codec && record.codec.trim() !== '') ||
			(record.log && record.log.trim() !== '') ||
			(record.bitDepth && record.bitDepth.trim() !== '') ||
			(record.chromaSubsampling && record.chromaSubsampling.trim() !== '') ||
			(record.bitrate && record.bitrate.trim() !== '') ||
			(record.resolution && record.resolution.trim() !== '') ||
			(record.framerate && record.framerate.trim() !== '') ||
			(record.crop && record.crop.trim() !== '') ||
			(record.slopeBased && record.slopeBased.trim() !== '') ||
			(record.snr1 && record.snr1.trim() !== '') ||
			(record.snr2 && record.snr2.trim() !== '') ||
			(record.snr4 && record.snr4.trim() !== '') ||
			(record.snr10 && record.snr10.trim() !== '') ||
			(record.snr40 && record.snr40.trim() !== '')
		);
	}

	// Handle form submission with enhance
	function handleUpdate({ formData }: any) {
		// Filter out empty records and mark records as new, existing, or deleted
		const validRecords: any[] = [];
		const skippedRecords: number[] = [];

		editableRecords.forEach((record, index) => {
			if (hasData(record)) {
				validRecords.push({
					...record,
					isNew: record.id < 0, // Negative IDs indicate new records
					isDeleted: false // Existing records being updated
				});
			} else {
				// Record is empty, skip it
				skippedRecords.push(index + 1); // Record number (1-based)
			}
		});
		
		// Add deleted records (only existing records with positive IDs)
		const deletedRecords = Array.from(deletedRecordIds).map((id) => ({
			id: id,
			isNew: false,
			isDeleted: true
		}));
		
		// Show toast for skipped records
		if (skippedRecords.length > 0) {
			skippedRecords.forEach((recordNum) => {
				toastManager.showToast({
					title: `第${recordNum}条为空，已跳过本条更新`,
					message: '',
					iconName: 'mdi:information',
					iconColor: 'text-yellow-500',
					duration: 3000,
					showCountdown: true
				});
			});
		}

		// Check if there are any records to submit
		const totalRecordsToSubmit = validRecords.length + deletedRecords.length;
		if (totalRecordsToSubmit === 0) {
			// No records to submit, show message and prevent submission
			toastManager.showToast({
				title: '没有可提交的数据',
				message: '所有记录都为空，已跳过提交',
				iconName: 'mdi:information',
				iconColor: 'text-blue-500',
				duration: 3000,
				showCountdown: true
			});
			// Don't set formData, which will prevent submission
			return;
		}
		
		// Combine all records
		const allRecords = [...validRecords, ...deletedRecords];
		formData.set('records', JSON.stringify(allRecords));

		return async ({ result }: any) => {
			if (result.type === 'success') {
				// Clear deleted records set
				deletedRecordIds.clear();
				
				// Reload data from server to get new IDs for newly created records
				skipReinit = true;
				try {
					const response = await fetch(`/camera/dynamic-range/manage/${camera.id}`);
					if (response.ok) {
						const data = await response.json();
						if (data.records) {
							records = data.records;
							// Reinitialize editableRecords with updated IDs
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
					}
				} catch (error) {
					console.error('Failed to reload data:', error);
				}
				skipReinit = false;
				
				// Show success toast
				toastManager.showToast({
					title: m['camera.dynamic_range_upload.dynamic_range_manage.update_success'](),
					message: '',
					iconName: 'mdi:check-circle',
					iconColor: 'text-green-500',
					duration: 3000,
					showCountdown: true
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

	// Delete record directly (only mark as deleted, don't actually delete until update)
	function deleteRecord(record: any) {
		// Only mark existing records (positive IDs) as deleted
		// New records (negative IDs) can just be removed
		if (record.id > 0) {
			deletedRecordIds.add(record.id);
		}

		// Remove from editableRecords and records
		editableRecords = editableRecords.filter((r) => r.id !== record.id);
		records = records.filter((r) => r.id !== record.id);

		// Show toast
		toastManager.showToast({
			title: '已标记删除',
			message: '删除操作可以通过刷新网页撤销，点击"更新"后不可撤销',
			iconName: 'mdi:information',
			iconColor: 'text-blue-500',
			duration: 5000,
			showCountdown: true
		});
	}

	// Check if record is marked for deletion
	function isRecordDeleted(recordId: number): boolean {
		return deletedRecordIds.has(recordId);
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
			<form 
				method="POST" 
				action="?/updateRecords" 
				use:enhance={handleUpdate}
				onsubmit={(e) => {
					// Check if there are any valid records before allowing submission
					const validRecords: any[] = [];
					editableRecords.forEach((record) => {
						if (hasData(record)) {
							validRecords.push(record);
						}
					});
					const deletedRecords = Array.from(deletedRecordIds);
					const totalRecordsToSubmit = validRecords.length + deletedRecords.length;
					
					if (totalRecordsToSubmit === 0) {
						e.preventDefault();
						return false;
					}
				}}
			>
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
									{#if !isRecordDeleted(record.id)}
										<tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
										<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
											{index + 1}
										</td>
										{#if isEditMode}
											<td class="px-6 py-4 whitespace-nowrap text-sm">
												<button
													type="button"
													onclick={() => deleteRecord(record)}
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
									{/if}
								{/each}
							</tbody>
						</table>
					</div>
				</div>

				<!-- Add and Update Buttons (only visible in edit mode) -->
				{#if isEditMode}
					<div class="mt-6 flex justify-between">
						<button
							type="button"
							onclick={addNewRecord}
							class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
						>
							<Icon icon="mdi:plus" class="mr-2 h-4 w-4" />
							添加
						</button>
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

