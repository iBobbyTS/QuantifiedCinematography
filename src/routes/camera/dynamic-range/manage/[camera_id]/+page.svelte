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

	// Initialize editable records
	$effect(() => {
		if (isEditMode && records.length > 0) {
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

	// Toggle edit mode
	function toggleEditMode() {
		isEditMode = !isEditMode;
		if (isEditMode) {
			// Initialize editable records when entering edit mode
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

	// Handle form submission
	async function handleUpdate(event: SubmitEvent) {
		const form = event.currentTarget as HTMLFormElement;
		const formData = new FormData(form);
		formData.set('records', JSON.stringify(editableRecords));

		const response = await fetch('?/updateRecords', {
			method: 'POST',
			body: formData
		});

		const result = await response.json();

		if (result.type === 'success' && result.data?.success) {
			toastManager.showToast({
				title: m['camera.dynamic_range_upload.dynamic_range_manage.update_success'](),
				message: '',
				iconName: 'mdi:check-circle',
				iconColor: 'text-green-500',
				duration: 3000,
				showCountdown: false
			});
			// Reload page to get updated data
			await goto(window.location.pathname, { invalidateAll: true });
		} else {
			toastManager.showToast({
				title: m['camera.dynamic_range_upload.dynamic_range_manage.update_failure'](),
				message: result.data?.message || m['camera.dynamic_range_upload.dynamic_range_manage.update_error'](),
				iconName: 'mdi:alert-circle',
				iconColor: 'text-red-500',
				duration: 5000,
				showCountdown: true
			});
		}
	}

	// Table columns
	const columns = [
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
</script>

<Navbar
	centerTitle={`${camera.brandName || ''} ${camera.name} ${m['camera.dynamic_range_upload.dynamic_range_manage.title']()}`}
	centerTitleDirect={true}
	showBackButton={true}
	backButtonUrl={`/camera/dynamic-range/manage#camera-${camera.id}`}
/>
<ToastManager bind:this={toastManager} />

<div class="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16 transition-colors duration-200">
	<div class="w-[95%] mx-auto py-8">
		<!-- Header -->
		<div class="mb-6">
			<!-- Switch for view/edit mode -->
			<div class="flex items-center gap-3 mt-4">
				<span class="text-sm font-medium text-gray-700 dark:text-gray-300">
					{m['camera.dynamic_range_upload.dynamic_range_manage.view_mode']()}
				</span>
				<label class="relative inline-flex items-center cursor-pointer">
					<input
						type="checkbox"
						bind:checked={isEditMode}
						onchange={toggleEditMode}
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
			<form onsubmit={handleUpdate} use:enhance>
				<div class="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
					<div class="overflow-x-auto">
						<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
							<thead class="bg-gray-50 dark:bg-gray-700">
								<tr>
									<th
										scope="col"
										class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
									>
										#
									</th>
									{#each columns as column}
										<th
											scope="col"
											class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
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
										{#each columns as column}
											<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
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
														class="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
