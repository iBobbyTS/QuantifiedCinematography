<script lang="ts">
	import Icon from '@iconify/svelte';
	import * as m from '$lib/paraglide/messages.js';

	interface Camera {
		id: number;
		name: string;
		brandName: string | null;
		releaseYear: number | null;
		cinema: boolean;
		recordCount?: number; // Optional: number of records uploaded by current user
	}

	interface Props {
		cameras: Camera[];
		sortConfig: {
			brand: 'asc' | 'desc';
			name?: 'asc' | 'desc';
			year?: 'asc' | 'desc';
		};
		emptyStateTitle?: string;
		emptyStateDescription?: string;
		emptyStateIcon?: string;
		onSort: (field: 'brand' | 'name' | 'year') => void;
		// For normal mode (edit/delete buttons)
		onEdit?: (camera: Camera) => void;
		onDelete?: (camera: Camera) => void;
		// For checkbox mode
		showCheckbox?: boolean;
		selectedCameras?: Set<number>;
		onSelectionChange?: (cameraId: number, selected: boolean) => void;
		// For record count click
		onRecordCountClick?: (camera: Camera) => void;
	}

	let {
		cameras,
		sortConfig,
		emptyStateTitle = m['camera.manage.empty_state.title'](),
		emptyStateDescription = m['camera.manage.empty_state.description'](),
		emptyStateIcon = 'mdi:camera-off',
		onSort,
		onEdit,
		onDelete,
		showCheckbox = false,
		selectedCameras = $bindable(new Set<number>()),
		onSelectionChange,
		onRecordCountClick
	}: Props = $props();

	function handleCheckboxChange(camera: Camera, checked: boolean) {
		// Create a new Set to trigger reactivity
		const newSet = new Set(selectedCameras);
		if (checked) {
			newSet.add(camera.id);
		} else {
			newSet.delete(camera.id);
		}
		selectedCameras = newSet;
		if (onSelectionChange) {
			onSelectionChange(camera.id, checked);
		}
	}

	// Handle select all
	function handleSelectAll(checked: boolean) {
		const newSet = new Set<number>();
		if (checked) {
			cameras.forEach(camera => {
				newSet.add(camera.id);
				if (onSelectionChange) {
					onSelectionChange(camera.id, true);
				}
			});
		}
		selectedCameras = newSet;
	}

	// Check if all cameras are selected
	let allSelected = $derived(
		cameras.length > 0 && cameras.every(camera => selectedCameras.has(camera.id))
	);

	// Check if some cameras are selected (for indeterminate state)
	let someSelected = $derived(
		cameras.length > 0 &&
			cameras.some(camera => selectedCameras.has(camera.id)) &&
			!allSelected
	);

	// Reference to the select all checkbox
	let selectAllCheckbox = $state<HTMLInputElement | null>(null);

	// Set indeterminate state
	$effect(() => {
		if (selectAllCheckbox) {
			selectAllCheckbox.indeterminate = someSelected;
		}
	});
</script>

<div class="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
	<div class="overflow-auto">
		<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700 relative">
			<thead class="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
				<tr>
					<th
						scope="col"
						class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
						onclick={() => onSort('brand')}
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
						onclick={() => onSort('name')}
					>
						<div class="flex items-center gap-1">
							{m['camera.manage.table.name']()}
							{#if sortConfig.name}
								<Icon
									icon={sortConfig.name === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'}
									class="w-3 h-3"
								/>
							{:else}
								<Icon icon="mdi:unfold-more-horizontal" class="w-3 h-3 opacity-50" />
							{/if}
						</div>
					</th>
					<th
						scope="col"
						class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
						onclick={() => onSort('year')}
					>
						<div class="flex items-center gap-1">
							{m['camera.manage.table.release_year']()}
							{#if sortConfig.year}
								<Icon
									icon={sortConfig.year === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'}
									class="w-3 h-3"
								/>
							{:else}
								<Icon icon="mdi:unfold-more-horizontal" class="w-3 h-3 opacity-50" />
							{/if}
						</div>
					</th>
					{#if showCheckbox && cameras.some(c => c.recordCount !== undefined)}
						<th
							scope="col"
							class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
						>
							{m['camera.dynamic_range_upload.table.record_count']()}
						</th>
					{/if}
					<th
						scope="col"
						class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
					>
						{#if showCheckbox}
							<div class="flex items-center justify-end gap-2">
								<input
									bind:this={selectAllCheckbox}
									type="checkbox"
									checked={allSelected}
									onchange={(e) => handleSelectAll(e.currentTarget.checked)}
									class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-0 focus:outline-none dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
									title={m['camera.manage.table.select_all']()}
								/>
								<span>{m['camera.manage.table.select']()}</span>
							</div>
						{:else}
							{m['camera.manage.table.actions']()}
						{/if}
					</th>
				</tr>
			</thead>
			<tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
				{#if cameras.length === 0}
					<tr>
						<td colspan="4" class="px-6 py-12 text-center">
							<Icon icon={emptyStateIcon} class="mx-auto h-12 w-12 text-gray-400" />
							<h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">
								{emptyStateTitle}
							</h3>
							<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
								{emptyStateDescription}
							</p>
						</td>
					</tr>
				{:else}
					{#each cameras as camera}
						<tr
							id={`camera-${camera.id}`}
							class="transition-colors {camera.cinema
								? 'bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700'
								: 'hover:bg-gray-50 dark:hover:bg-gray-700'}"
						>
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
							{#if showCheckbox && camera.recordCount !== undefined}
								{#if onRecordCountClick}
									<td
										onclick={() => onRecordCountClick(camera)}
										class="px-6 py-4 whitespace-nowrap text-right text-sm text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors"
									>
										{camera.recordCount}
									</td>
								{:else}
									<td class="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
										{camera.recordCount}
									</td>
								{/if}
							{/if}
							<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
								{#if showCheckbox}
									<input
										type="checkbox"
										checked={selectedCameras.has(camera.id)}
										onchange={(e) => handleCheckboxChange(camera, e.currentTarget.checked)}
										class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-0 focus:outline-none dark:bg-gray-700 dark:border-gray-600"
									/>
								{:else}
									{#if onEdit}
										<button
											onclick={() => onEdit(camera)}
											class="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4"
											title={m['camera.manage.actions.edit']()}
										>
											<Icon icon="mdi:pencil" class="h-5 w-5" />
										</button>
									{/if}
									{#if onDelete}
										<button
											onclick={() => onDelete(camera)}
											class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
											title={m['camera.manage.actions.delete']()}
										>
											<Icon icon="mdi:delete" class="h-5 w-5" />
										</button>
									{/if}
								{/if}
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</div>
