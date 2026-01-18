<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import * as m from '$lib/paraglide/messages.js';
	import type { PageData } from './$types';
	import Navbar from '$lib/components/Navbar.svelte';
	import { theme } from '$lib/stores/theme.svelte.js';
	// ApexCharts will be imported dynamically

	let { data }: { data: PageData } = $props();

	// Record data type
	interface DynamicRangeRecord {
		id: number;
		cameraId: number;
		userId: string | null;
		ei: number | null;
		iso: number | null;
		specialMode: string | null;
		codec: string | null;
		log: string | null;
		bitDepth: number | null;
		chromaSubsampling: string | null;
		bitrate: string | null;
		resolution: string | null;
		framerate: string | null;
		crop: string | null;
		slopeBased: number | null;
		snr1: number | null;
		snr2: number | null;
		snr4: number | null;
		snr10: number | null;
		snr40: number | null;
		userNickname: string | null;
	}

	// Camera data type
	interface Camera {
		id: number;
		name: string;
		brandId: number;
		brandName: string | null;
		releaseYear: number | null;
		cinema: boolean;
		dynamicRangeData: DynamicRangeRecord[];
	}

	let cameras = $state<Camera[]>(data.cameras || []);
	let selectedRecordIds = $state(new Set<number>()); // Changed from selectedCameraIds to selectedRecordIds
	let expandedCameraIds = $state(new Set<number>()); // Track which cameras are expanded
	let showFullYAxis = $state(false);
	let chartElement: HTMLDivElement | undefined = $state();
	let chart: any = $state(null);
	let initialized = $state(false);

	// Initialize: select first record with data
	$effect(() => {
		if (cameras.length > 0 && !initialized) {
			initialized = true;
			const urlSelectedIds = (data as any).selectedCameraIds || [];
			if (urlSelectedIds.length > 0) {
				// Select first valid record from cameras specified in URL
				const validRecordIds: number[] = [];
				for (const cameraId of urlSelectedIds) {
					const camera = cameras.find((c) => c.id === cameraId);
					if (camera) {
						const records = camera.dynamicRangeData || [];
						const validRecords = records.filter(recordHasDynamicRangeData);
						if (validRecords.length > 0) {
							validRecordIds.push(validRecords[0].id);
						}
					}
				}
				if (validRecordIds.length > 0) {
					selectedRecordIds = new Set(validRecordIds);
				} else {
					// No valid records from URL, find first record with data
					const firstRecord = findFirstRecordWithData();
					if (firstRecord) {
						selectedRecordIds = new Set([firstRecord.id]);
					}
				}
			} else {
				// No URL parameter, find first record with data
				const firstRecord = findFirstRecordWithData();
				if (firstRecord) {
					selectedRecordIds = new Set([firstRecord.id]);
				}
			}
		}
	});

	// Helper function to find first record with data
	function findFirstRecordWithData(): DynamicRangeRecord | null {
		for (const camera of cameras) {
			const records = camera.dynamicRangeData || [];
			const validRecords = records.filter(recordHasDynamicRangeData);
			if (validRecords.length > 0) {
				return validRecords[0];
			}
		}
		return null;
	}

	// Get selected records
	let selectedRecords = $derived(() => {
		const records: Array<{ record: DynamicRangeRecord; camera: Camera }> = [];
		for (const camera of cameras) {
			for (const record of camera.dynamicRangeData || []) {
				if (selectedRecordIds.has(record.id)) {
					records.push({ record, camera });
				}
			}
		}
		return records;
	});

	// Get all dynamic range values from selected records
	let allValues = $derived(() => {
		const values: number[] = [];
		for (const { record } of selectedRecords()) {
			if (record.slopeBased !== null) values.push(record.slopeBased);
			if (record.snr1 !== null) values.push(record.snr1);
			if (record.snr2 !== null) values.push(record.snr2);
			if (record.snr4 !== null) values.push(record.snr4);
			if (record.snr10 !== null) values.push(record.snr10);
			if (record.snr40 !== null) values.push(record.snr40);
		}
		return values;
	});

	// Calculate initial Y-axis range estimates (before alignment)
	let yAxisMinEstimate = $derived(() => {
		if (allValues().length === 0) {
			return showFullYAxis ? 0 : 12;
		}
		if (showFullYAxis) {
			return 0;
		} else {
			const minValue = Math.min(...allValues()) - 0.1;
			return Math.floor(minValue * 2) / 2;
		}
	});

	let yAxisMaxEstimate = $derived(() => {
		if (allValues().length === 0) {
			return 17;
		}
		const maxValue = Math.max(...allValues()) + 0.1;
		return Math.ceil(maxValue * 2) / 2;
	});

	// Determine grid interval based on final Y-axis range estimate
	let yAxisInterval = $derived(() => {
		const minEst = yAxisMinEstimate();
		const maxEst = yAxisMaxEstimate();
		const rangeEst = maxEst - minEst;
		return rangeEst > 9 ? 1.0 : 0.5;
	});

	// Calculate Y-axis range, aligned to interval
	let yAxisMin = $derived(() => {
		if (allValues().length === 0) {
			// No cameras selected: 12 when not showing full axis, 0 when showing full axis
			return showFullYAxis ? 0 : 12;
		}
		if (showFullYAxis) {
			return 0;
		} else {
			const minValue = Math.min(...allValues()) - 0.1;
			const interval = yAxisInterval();
			// Round down to nearest interval
			if (interval === 1.0) {
				return Math.floor(minValue);
			} else {
				return Math.floor(minValue * 2) / 2;
			}
		}
	});

	let yAxisMax = $derived(() => {
		if (allValues().length === 0) {
			// No cameras selected: always show 17
			return 17;
		}
		const maxValue = Math.max(...allValues()) + 0.1;
		const interval = yAxisInterval();
		// Round up to nearest interval
		if (interval === 1.0) {
			return Math.ceil(maxValue);
		} else {
			return Math.ceil(maxValue * 2) / 2;
		}
	});

	// Calculate tick amount based on interval
	let yAxisTickAmount = $derived(() => {
		const min = yAxisMin();
		const max = yAxisMax();
		const range = max - min;
		const interval = yAxisInterval();
		return Math.ceil(range / interval);
	});

	// Prepare chart data
	let chartSeries = $derived(() => {
		const seriesData: any[] = [
			{ name: 'Slope-based', data: [] }, // red
			{ name: 'SNR=1', data: [] }, // orange
			{ name: 'SNR=2', data: [] }, // yellow
			{ name: 'SNR=4', data: [] }, // green
			{ name: 'SNR=10', data: [] }, // cyan
			{ name: 'SNR=40', data: [] } // blue
		];

		// Build categories array with null at start and end
		// Use array format for labels to support multiline: [cameraName, recordDetails]
		const categories: (string | string[] | null)[] = [null];

		// Only show selected records
		const selected = selectedRecords();
		for (const { record, camera } of selected) {
			const cameraLabel = `${camera.brandName || ''} ${camera.name || ''}`.trim();
			const recordDetails = formatRecordDetails(record);
			// For chart labels, split by '; ' to create an array where each property is on a separate line
			// Format: [cameraName, property1, property2, ...] - ApexCharts will display each array element on a new line
			const recordDetailsArray = recordDetails.split('; ').filter(p => p.length > 0);
			const chartLabelArray = [cameraLabel, ...recordDetailsArray];
			
			categories.push(chartLabelArray);
			
			// Data point is placed at this category (one entry per record)
			const xValue = categories.length - 1;
			
			if (record.slopeBased !== null) {
				seriesData[0].data.push({ x: xValue, y: record.slopeBased });
			}
			if (record.snr1 !== null) {
				seriesData[1].data.push({ x: xValue, y: record.snr1 });
			}
			if (record.snr2 !== null) {
				seriesData[2].data.push({ x: xValue, y: record.snr2 });
			}
			if (record.snr4 !== null) {
				seriesData[3].data.push({ x: xValue, y: record.snr4 });
			}
			if (record.snr10 !== null) {
				seriesData[4].data.push({ x: xValue, y: record.snr10 });
			}
			if (record.snr40 !== null) {
				seriesData[5].data.push({ x: xValue, y: record.snr40 });
			}
		}

		// Add null at the end
		categories.push(null);

		return { seriesData, categories };
	});

	// Check if a record has any dynamic range value
	function recordHasDynamicRangeData(record: {
		slopeBased: number | null;
		snr1: number | null;
		snr2: number | null;
		snr4: number | null;
		snr10: number | null;
		snr40: number | null;
	}): boolean {
		return (
			record.slopeBased !== null ||
			record.snr1 !== null ||
			record.snr2 !== null ||
			record.snr4 !== null ||
			record.snr10 !== null ||
			record.snr40 !== null
		);
	}

	// Check if camera has any valid dynamic range data
	function hasDynamicRangeData(camera: Camera): boolean {
		if (!camera.dynamicRangeData || camera.dynamicRangeData.length === 0) {
			return false;
		}
		// Check if at least one record has dynamic range data
		return camera.dynamicRangeData.some(recordHasDynamicRangeData);
	}

	// Get valid records count for a camera
	function getValidRecordsCount(camera: Camera): number {
		const records = camera.dynamicRangeData || [];
		return records.filter(recordHasDynamicRangeData).length;
	}

	// Format record details as "{property1}: {value1}; {property2}: {value2}; etc."
	// Only includes properties other than slope-based and snr values
	function formatRecordDetails(record: DynamicRangeRecord): string {
		const parts: string[] = [];
		if (record.ei !== null) {
			parts.push(`${m['camera.dynamic_range.browse.fields.ei']()}: ${record.ei}`);
		}
		if (record.iso !== null) {
			parts.push(`${m['camera.dynamic_range.browse.fields.iso']()}: ${record.iso}`);
		}
		if (record.specialMode !== null) {
			parts.push(`${m['camera.dynamic_range.browse.fields.special_mode']()}: ${record.specialMode}`);
		}
		if (record.codec !== null) {
			parts.push(`${m['camera.dynamic_range.browse.fields.codec']()}: ${record.codec}`);
		}
		if (record.log !== null) {
			parts.push(`${m['camera.dynamic_range.browse.fields.log']()}: ${record.log}`);
		}
		if (record.bitDepth !== null) {
			parts.push(`${m['camera.dynamic_range.browse.fields.bit_depth']()}: ${record.bitDepth}`);
		}
		if (record.chromaSubsampling !== null) {
			parts.push(`${m['camera.dynamic_range.browse.fields.chroma_subsampling']()}: ${record.chromaSubsampling}`);
		}
		if (record.bitrate !== null) {
			parts.push(`${m['camera.dynamic_range.browse.fields.bitrate']()}: ${record.bitrate}`);
		}
		if (record.resolution !== null) {
			parts.push(`${m['camera.dynamic_range.browse.fields.resolution']()}: ${record.resolution}`);
		}
		if (record.framerate !== null) {
			parts.push(`${m['camera.dynamic_range.browse.fields.framerate']()}: ${record.framerate}`);
		}
		if (record.crop !== null) {
			parts.push(`${m['camera.dynamic_range.browse.fields.crop']()}: ${record.crop}`);
		}
		// Add uploader at the end
		if (record.userNickname !== null) {
			parts.push(`${m['camera.dynamic_range.browse.fields.uploader']()}: ${record.userNickname}`);
		}
		return parts.join('; ');
	}

	// Toggle camera expansion
	function toggleExpansion(cameraId: number) {
		const newSet = new Set(expandedCameraIds);
		if (newSet.has(cameraId)) {
			newSet.delete(cameraId);
		} else {
			newSet.add(cameraId);
		}
		expandedCameraIds = newSet;
	}

	// Toggle record selection
	function toggleRecord(recordId: number) {
		const newSet = new Set(selectedRecordIds);
		if (newSet.has(recordId)) {
			newSet.delete(recordId);
		} else {
			newSet.add(recordId);
		}
		selectedRecordIds = newSet;
	}

	// Handle camera row click (for expansion only)
	function handleCameraRowClick(cameraId: number, event: MouseEvent) {
		const camera = cameras.find((c) => c.id === cameraId);
		if (!camera || !hasDynamicRangeData(camera)) {
			return;
		}
		const validRecordsCount = getValidRecordsCount(camera);
		
		// Only handle expansion for cameras with multiple records
		if (validRecordsCount > 1) {
			const target = event.target as HTMLElement;
			if (target.closest('.arrow-icon')) {
				return; // Arrow click is handled separately
			}
			toggleExpansion(cameraId);
		}
	}

	// Handle record row click (for selection)
	function handleRecordRowClick(recordId: number, event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (target.tagName === 'INPUT') {
			return; // Checkbox click is handled separately
		}
		toggleRecord(recordId);
	}

	// Get current theme colors
	let textColor = $derived(theme.resolved === 'dark' ? '#e5e7eb' : '#374151');
	let titleColor = $derived(theme.resolved === 'dark' ? '#f9fafb' : '#111827');
	let tooltipBg = $derived(theme.resolved === 'dark' ? '#1f2937' : '#ffffff');
	let tooltipText = $derived(theme.resolved === 'dark' ? '#e5e7eb' : '#374151');
	let tooltipBorder = $derived(theme.resolved === 'dark' ? '#374151' : '#e5e7eb');

	// Initialize and update chart
	$effect(() => {
		if (!browser || !chartElement) return;

		const { seriesData, categories } = chartSeries();

		// Calculate required height for x-axis labels based on content
		let labelHeight = 0;
		if (browser && chartElement) {
			// Estimate label height: each array element in category represents a line
			// Count max number of lines in all categories
			let maxLines = 0;
			for (const category of categories) {
				if (Array.isArray(category)) {
					maxLines = Math.max(maxLines, category.length);
				} else if (category) {
					maxLines = Math.max(maxLines, 1);
				}
			}
			// Estimate: each line ~16px, add margin for spacing
			labelHeight = maxLines * 16 + 10;
		}

		const options = {
			chart: {
				type: 'scatter',
				height: 600,
				zoom: {
					enabled: true,
					type: 'xy'
				},
				parentHeightOffset: 0
			},
			grid: {
				padding: {
					bottom: 0,
					left: 10,
					right: 0,
					top: 0
				}
			},
			series: seriesData,
			xaxis: {
				type: 'numeric',
				min: 0,
				max: categories.length-1,
				tickAmount: categories.length,
				labels: {
					formatter: (val: string) => {
						const index = Math.round(parseFloat(val));
						if (index >= 0 && index < categories.length) {
							const category = categories[index];
							// Return empty string for null categories
							if (!category) return '';
							
							// If category is an array, ApexCharts will handle multiline display automatically
							// If it's a string, return as is
							if (Array.isArray(category)) {
								// For array format, return the array - ApexCharts will display as multiline
								return category;
							}
							return category;
						}
						return '';
					},
					rotate: 0,
					rotateAlways: false,
					minHeight: labelHeight || undefined,
					style: {
						colors: textColor
					},
					showDuplicates: false
				}
			},
			yaxis: {
				title: {
					text: m['camera.dynamic_range.browse.y_axis_title'](),
					style: {
						color: titleColor
					}
				},
				min: yAxisMin,
				max: yAxisMax,
				tickAmount: yAxisTickAmount(),
				decimalsInFloat: 1,
				labels: {
					style: {
						colors: textColor
					},
					formatter: (val: number) => {
						// Always show one decimal place (e.g., 12.0, 13.0)
						return val.toFixed(1);
					}
				}
			},
			colors: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6'],
			legend: {
				show: true,
				position: 'top',
				labels: {
					colors: textColor
				}
			},
			tooltip: {
				shared: false,
				intersect: true,
				theme: theme.resolved,
				style: {
					fontSize: '14px'
				},
				custom: function ({ seriesIndex, dataPointIndex, w }: any) {
					const data = w.globals.initialSeries[seriesIndex].data[dataPointIndex];
					const xValue = Math.round(data.x);
					const value = data.y;
					const seriesName = seriesData[seriesIndex].name;
					
					// Get camera name and record details from category
					let cameraName = '';
					let recordDetails = '';
					if (xValue >= 0 && xValue < categories.length) {
						const category = categories[xValue];
						if (Array.isArray(category)) {
							// Category is in array format: [cameraName, recordDetails]
							cameraName = category[0] || '';
							recordDetails = category[1] || '';
						} else if (typeof category === 'string') {
							cameraName = category;
						}
					}
					
					return `<div style="padding: 8px; background-color: ${tooltipBg}; color: ${tooltipText}; border: 1px solid ${tooltipBorder}; border-radius: 4px;">
						${cameraName ? `<div style="font-weight: 600; margin-bottom: 4px;">${cameraName}</div>` : ''}
						${recordDetails ? `<div style="font-size: 12px; margin-bottom: 4px; opacity: 0.8;">${recordDetails}</div>` : ''}
						<div>${seriesName}: ${value}</div>
					</div>`;
				}
			},
			markers: {
				size: 6
			}
		};

		if (chart) {
			chart.updateOptions(options);
			chart.updateSeries(seriesData);
		} else {
			import('apexcharts').then((ApexChartsModule) => {
				const ApexCharts = ApexChartsModule.default;
				chart = new ApexCharts(chartElement, options);
				chart.render();
			});
		}
	});

	onMount(() => {
		return () => {
			if (chart) {
				chart.destroy();
				chart = null;
			}
		};
	});
</script>

<svelte:head>
	<title>{m['camera.dynamic_range.browse.title']()} - {m['app.title']()}</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 pt-16">
	<Navbar centerTitle={m['camera.dynamic_range.browse.title']()} centerTitleDirect={true} showBackButton={true} />

	<main class="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<div class="flex gap-4 h-[calc(100vh-8rem)]">
			<!-- Left sidebar: Camera list -->
			<div class="w-80 bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden flex flex-col">
				<div class="p-4 border-b border-gray-200 dark:border-gray-700">
					<h2 class="text-lg font-semibold text-gray-900 dark:text-white">{m['camera.dynamic_range.browse.cameras_list_title']()}</h2>
				</div>
				<div class="flex-1 overflow-y-auto">
					{#each cameras as camera (camera.id)}
						{@const hasData = hasDynamicRangeData(camera)}
						{@const validRecordsCount = hasData ? getValidRecordsCount(camera) : 0}
						{@const isExpanded = expandedCameraIds.has(camera.id)}
						{@const hasMultipleRecords = validRecordsCount > 1}
						{@const validRecords = hasData ? (camera.dynamicRangeData || []).filter(recordHasDynamicRangeData) : []}
						
						{#if hasMultipleRecords}
							<!-- Camera row with arrow (multiple records) -->
							<div
								role={hasData ? 'button' : undefined}
								{...(hasData ? { tabindex: 0 } : {})}
								class="flex items-center px-4 py-3 border-b border-gray-100 dark:border-gray-700 {hasData
									? 'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer'
									: 'opacity-50 cursor-not-allowed'}"
								onclick={(e) => hasData && handleCameraRowClick(camera.id, e)}
								onkeydown={(e) => {
									if (hasData && (e.key === 'Enter' || e.key === ' ')) {
										e.preventDefault();
										handleCameraRowClick(camera.id, e as any);
									}
								}}
							>
								<!-- Arrow icon for multiple records -->
								<button
									type="button"
									class="arrow-icon mr-3 h-4 w-4 text-gray-600 dark:text-gray-400 transition-transform duration-200 {isExpanded
										? 'rotate-90'
										: ''} focus:outline-none"
									onclick={(e) => {
										e.stopPropagation();
										toggleExpansion(camera.id);
									}}
									aria-label={isExpanded ? 'Collapse' : 'Expand'}
								>
									<svg
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
										class="w-full h-full"
									>
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
									</svg>
								</button>
								<span class="text-sm {hasData
									? 'text-gray-900 dark:text-white'
									: 'text-gray-400 dark:text-gray-600'}">
									{camera.brandName || ''} {camera.name || ''}
								</span>
							</div>

							<!-- Expanded records (only show if expanded) -->
							{#if isExpanded}
								{#each validRecords as record (record.id)}
									{@const isRecordSelected = selectedRecordIds.has(record.id)}
									<div
										role="button"
										tabindex="0"
										class="flex items-center px-4 py-3 pl-8 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer {isRecordSelected
											? 'bg-blue-50 dark:bg-blue-900/20'
											: ''}"
										onclick={(e) => handleRecordRowClick(record.id, e)}
										onkeydown={(e) => {
											if (e.key === 'Enter' || e.key === ' ') {
												e.preventDefault();
												handleRecordRowClick(record.id, e as any);
											}
										}}
									>
										<input
											type="checkbox"
											checked={isRecordSelected}
											onchange={() => toggleRecord(record.id)}
											onclick={(e) => e.stopPropagation()}
											class="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
										/>
										<span class="text-xs text-gray-700 dark:text-gray-300">
											{formatRecordDetails(record)}
										</span>
									</div>
								{/each}
							{/if}
						{:else if validRecordsCount === 1}
							<!-- Camera row with checkbox (single record) -->
							{@const record = validRecords[0]}
							{@const isRecordSelected = selectedRecordIds.has(record.id)}
							<div
								role={hasData ? 'button' : undefined}
								{...(hasData ? { tabindex: 0 } : {})}
								class="flex items-center px-4 py-3 border-b border-gray-100 dark:border-gray-700 {hasData
									? 'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer'
									: 'opacity-50 cursor-not-allowed'} {isRecordSelected
									? 'bg-blue-50 dark:bg-blue-900/20'
									: ''}"
								onclick={(e) => hasData && handleRecordRowClick(record.id, e)}
								onkeydown={(e) => {
									if (hasData && (e.key === 'Enter' || e.key === ' ')) {
										e.preventDefault();
										handleRecordRowClick(record.id, e as any);
									}
								}}
							>
								<input
									type="checkbox"
									checked={isRecordSelected}
									disabled={!hasData}
									onchange={() => toggleRecord(record.id)}
									onclick={(e) => e.stopPropagation()}
									class="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
								/>
								<span class="text-sm {hasData
									? 'text-gray-900 dark:text-white'
									: 'text-gray-400 dark:text-gray-600'}">
									{camera.brandName || ''} {camera.name || ''}
								</span>
							</div>
						{:else}
							<!-- Camera row without data -->
							<div
								class="flex items-center px-4 py-3 border-b border-gray-100 dark:border-gray-700 opacity-50 cursor-not-allowed"
							>
								<span class="text-sm text-gray-400 dark:text-gray-600">
									{camera.brandName || ''} {camera.name || ''}
								</span>
							</div>
						{/if}
					{/each}
				</div>
			</div>

			<!-- Right side: Chart -->
			<div class="flex-1 bg-white dark:bg-gray-800 shadow rounded-lg p-6 flex flex-col">
				<!-- Controls -->
				<div class="mb-4">
					<label class="flex items-center gap-2 cursor-pointer">
						<input
							type="checkbox"
							bind:checked={showFullYAxis}
							class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
						/>
						<span class="text-sm text-gray-700 dark:text-gray-300">{m['camera.dynamic_range.browse.show_full_y_axis']()}</span>
					</label>
				</div>

				<!-- Chart container -->
				<div class="flex-1 min-h-0 overflow-visible">
					<div bind:this={chartElement} class="w-full h-full"></div>
				</div>
			</div>
		</div>
	</main>
</div>
