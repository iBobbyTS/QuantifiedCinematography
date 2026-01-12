<script lang="ts">
	import Icon from '@iconify/svelte';
	import * as m from '$lib/paraglide/messages.js';

	interface Camera {
		id: number;
		name: string;
		brandName: string | null;
		releaseYear: number | null;
		cinema: boolean;
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
		onEdit: (camera: Camera) => void;
		onDelete: (camera: Camera) => void;
	}

	let {
		cameras,
		sortConfig,
		emptyStateTitle = m['camera.manage.empty_state.title'](),
		emptyStateDescription = m['camera.manage.empty_state.description'](),
		emptyStateIcon = 'mdi:camera-off',
		onSort,
		onEdit,
		onDelete
	}: Props = $props();
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
							<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
								<button
									onclick={() => onEdit(camera)}
									class="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4"
									title={m['camera.manage.actions.edit']()}
								>
									<Icon icon="mdi:pencil" class="h-5 w-5" />
								</button>
								<button
									onclick={() => onDelete(camera)}
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
