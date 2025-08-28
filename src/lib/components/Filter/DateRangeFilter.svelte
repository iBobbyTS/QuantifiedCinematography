<!--
  @fileoverview Date range filter component
  
  Provides a date range filter with start and end date inputs and quick selection buttons.
  
  @author Bobby Sun
  @version 1.0.0
-->

<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	let {
		label,
		value = $bindable({ start: '', end: '' })
	} = $props<{
		label: string;
		value: { start: string; end: string };
	}>();

	const dispatch = createEventDispatcher<{ change: { start: string; end: string } }>();

	function handleChange() {
		// Ensure we're dispatching a proper object
		const dateRange = { start: value.start || '', end: value.end || '' };
		dispatch('change', dateRange);
	}

	function formatDate(date: Date): string {
		return date.toISOString().split('T')[0];
	}

	function getWeekStart(date: Date): Date {
		const d = new Date(date);
		const day = d.getDay();
		const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
		return new Date(d.setDate(diff));
	}

	function getMonthStart(date: Date): Date {
		return new Date(date.getFullYear(), date.getMonth(), 1);
	}

	function getYearStart(date: Date): Date {
		return new Date(date.getFullYear(), 0, 1);
	}

	function setQuickRange(type: 'thisWeek' | 'last7Days' | 'thisMonth' | 'last30Days' | 'thisYear') {
		const today = new Date();
		let start: Date;
		let end: Date = new Date(today);

		switch (type) {
			case 'thisWeek':
				start = getWeekStart(today);
				break;
			case 'last7Days':
				start = new Date(today);
				start.setDate(today.getDate() - 6);
				break;
			case 'thisMonth':
				start = getMonthStart(today);
				break;
			case 'last30Days':
				start = new Date(today);
				start.setDate(today.getDate() - 29);
				break;
			case 'thisYear':
				start = getYearStart(today);
				break;
			default:
				return;
		}

		value = {
			start: formatDate(start),
			end: formatDate(end)
		};
		handleChange();
	}
</script>

<div class="filter-group">
	{#if label}
		<div class="text-sm font-medium text-gray-700 mb-2 block">{label}</div>
	{/if}
	<div class="space-y-2">
		<!-- Date inputs -->
		<div class="flex gap-2 items-center">
			<input
				type="date"
				class="input input-bordered input-sm w-32"
				bind:value={value.start}
				onchange={handleChange}
			/>
			<span class="text-sm text-gray-500">to</span>
			<input
				type="date"
				class="input input-bordered input-sm w-32"
				bind:value={value.end}
				onchange={handleChange}
			/>
		</div>
		
		<!-- Quick selection buttons -->
		<div class="flex flex-wrap gap-1">
			<button
				type="button"
				class="btn btn-xs btn-outline"
				onclick={() => setQuickRange('thisWeek')}
			>
				This Week
			</button>
			<button
				type="button"
				class="btn btn-xs btn-outline"
				onclick={() => setQuickRange('last7Days')}
			>
				Last 7 Days
			</button>
			<button
				type="button"
				class="btn btn-xs btn-outline"
				onclick={() => setQuickRange('thisMonth')}
			>
				This Month
			</button>
			<button
				type="button"
				class="btn btn-xs btn-outline"
				onclick={() => setQuickRange('last30Days')}
			>
				Last 30 Days
			</button>
			<button
				type="button"
				class="btn btn-xs btn-outline"
				onclick={() => setQuickRange('thisYear')}
			>
				This Year
			</button>
		</div>
	</div>
</div>

<style>
	.filter-group {
		min-width: 320px;
	}
</style> 