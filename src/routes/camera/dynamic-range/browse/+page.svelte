<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import * as m from '$lib/paraglide/messages.js';
	import type { PageData } from './$types';
	import Navbar from '$lib/components/Navbar.svelte';
	import { theme } from '$lib/stores/theme.svelte.js';
	// ApexCharts will be imported dynamically

	let { data }: { data: PageData } = $props();

	// Camera data type
	interface Camera {
		id: number;
		name: string;
		brandId: number;
		brandName: string | null;
		releaseYear: number | null;
		cinema: boolean;
		dynamicRangeData: Array<{
			slopeBased: number | null;
			snr1: number | null;
			snr2: number | null;
			snr4: number | null;
			snr10: number | null;
			snr40: number | null;
		}>;
	}

	let cameras = $state<Camera[]>(data.cameras || []);
	let selectedCameraIds = $state(new Set<number>());
	let showFullYAxis = $state(false);
	let chartElement: HTMLDivElement | undefined = $state();
	let chart: any = $state(null);
	let initialized = $state(false);

	// Initialize: select cameras based on URL parameter or first camera
	$effect(() => {
		if (cameras.length > 0 && !initialized) {
			initialized = true;
			const urlSelectedIds = (data as any).selectedCameraIds || [];
			if (urlSelectedIds.length > 0) {
				// Select cameras from URL parameter
				// Only select cameras that actually exist
				const validIds = urlSelectedIds.filter((id: number) =>
					cameras.some((c) => c.id === id)
				);
				if (validIds.length > 0) {
					selectedCameraIds = new Set(validIds);
				} else {
					// Default: select first camera
					selectedCameraIds = new Set([cameras[0].id]);
				}
			} else {
				// Default: select first camera
				selectedCameraIds = new Set([cameras[0].id]);
			}
		}
	});

	// Get selected cameras in order
	let selectedCameras = $derived(
		cameras.filter((c) => selectedCameraIds.has(c.id))
	);

	// Get all dynamic range values from selected cameras
	let allValues = $derived(() => {
		const values: number[] = [];
		for (const camera of selectedCameras) {
			for (const record of camera.dynamicRangeData) {
				if (record.slopeBased !== null) values.push(record.slopeBased);
				if (record.snr1 !== null) values.push(record.snr1);
				if (record.snr2 !== null) values.push(record.snr2);
				if (record.snr4 !== null) values.push(record.snr4);
				if (record.snr10 !== null) values.push(record.snr10);
				if (record.snr40 !== null) values.push(record.snr40);
			}
		}
		return values;
	});

	// Calculate Y-axis range
	let yAxisMin = $derived(() => {
		if (allValues().length === 0) return 0;
		if (showFullYAxis) {
			return 0;
		} else {
			return Math.min(...allValues()) - 1;
		}
	});

	let yAxisMax = $derived(() => {
		if (allValues().length === 0) return 20;
		return Math.max(...allValues()) + 1;
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

		const categories: string[] = [];

		for (let i = 0; i < selectedCameras.length; i++) {
			const camera = selectedCameras[i];
			const label = `${camera.brandName || ''} ${camera.name || ''}`.trim();
			categories.push(label);

			// Get all records for this camera and collect all values
			const records = camera.dynamicRangeData;
			if (records.length > 0) {
				// For each record, add data points for each series
				for (const record of records) {
					if (record.slopeBased !== null) {
						seriesData[0].data.push({ x: i, y: record.slopeBased });
					}
					if (record.snr1 !== null) {
						seriesData[1].data.push({ x: i, y: record.snr1 });
					}
					if (record.snr2 !== null) {
						seriesData[2].data.push({ x: i, y: record.snr2 });
					}
					if (record.snr4 !== null) {
						seriesData[3].data.push({ x: i, y: record.snr4 });
					}
					if (record.snr10 !== null) {
						seriesData[4].data.push({ x: i, y: record.snr10 });
					}
					if (record.snr40 !== null) {
						seriesData[5].data.push({ x: i, y: record.snr40 });
					}
				}
			}
		}

		return { seriesData, categories };
	});

	// Toggle camera selection
	function toggleCamera(cameraId: number) {
		const newSet = new Set(selectedCameraIds);
		if (newSet.has(cameraId)) {
			newSet.delete(cameraId);
		} else {
			newSet.add(cameraId);
		}
		selectedCameraIds = newSet;
	}

	// Reset chart zoom and pan
	function resetChart() {
		if (chart) {
			chart.resetZoom();
		}
	}

	// Handle row click
	function handleRowClick(cameraId: number, event: MouseEvent) {
		// Don't toggle if clicking directly on checkbox
		if ((event.target as HTMLElement).tagName === 'INPUT') {
			return;
		}
		toggleCamera(cameraId);
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

		const options = {
			chart: {
				type: 'scatter',
				height: 600,
				zoom: {
					enabled: true,
					type: 'xy'
				}
			},
			series: seriesData,
			xaxis: {
				title: {
					text: 'Camera',
					style: {
						color: titleColor
					}
				},
				type: 'numeric',
				tickAmount: selectedCameras.length,
				labels: {
					formatter: (val: string) => {
						const index = Math.round(parseFloat(val));
						if (index >= 0 && index < categories.length) {
							return categories[index];
						}
						return val;
					},
					rotate: -45,
					rotateAlways: false,
					style: {
						colors: textColor
					}
				}
			},
			yaxis: {
				title: {
					text: 'Dynamic Range',
					style: {
						color: titleColor
					}
				},
				min: yAxisMin,
				max: yAxisMax,
				labels: {
					style: {
						colors: textColor
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
					const cameraIndex = Math.round(data.x);
					const cameraName = categories[cameraIndex] || '';
					const value = data.y;
					const seriesName = seriesData[seriesIndex].name;
					return `<div style="padding: 8px; background-color: ${tooltipBg}; color: ${tooltipText}; border: 1px solid ${tooltipBorder}; border-radius: 4px;">
						<div style="font-weight: 600; margin-bottom: 4px;">${cameraName}</div>
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
	<title>Dynamic Range Browse - {m['app.title']()}</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 pt-16">
	<Navbar centerTitle="动态范围浏览" centerTitleDirect={true} showBackButton={true} />

	<main class="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<div class="flex gap-4 h-[calc(100vh-8rem)]">
			<!-- Left sidebar: Camera list -->
			<div class="w-80 bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden flex flex-col">
				<div class="p-4 border-b border-gray-200 dark:border-gray-700">
					<h2 class="text-lg font-semibold text-gray-900 dark:text-white">Cameras</h2>
				</div>
				<div class="flex-1 overflow-y-auto">
					{#each cameras as camera (camera.id)}
						{@const isSelected = selectedCameraIds.has(camera.id)}
						<div
							role="button"
							tabindex="0"
							class="flex items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 {isSelected
								? 'bg-blue-50 dark:bg-blue-900/20'
								: ''}"
							onclick={(e) => handleRowClick(camera.id, e)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									handleRowClick(camera.id, e as any);
								}
							}}
						>
							<input
								type="checkbox"
								checked={isSelected}
								onchange={() => toggleCamera(camera.id)}
								class="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
							/>
							<span class="text-sm text-gray-900 dark:text-white">
								{camera.brandName || ''} {camera.name || ''}
							</span>
						</div>
					{/each}
				</div>
			</div>

			<!-- Right side: Chart -->
			<div class="flex-1 bg-white dark:bg-gray-800 shadow rounded-lg p-6 flex flex-col">
				<!-- Controls -->
				<div class="mb-4 flex items-center justify-between">
					<label class="flex items-center gap-2 cursor-pointer">
						<input
							type="checkbox"
							bind:checked={showFullYAxis}
							class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
						/>
						<span class="text-sm text-gray-700 dark:text-gray-300">显示完整纵轴</span>
					</label>
					<button
						type="button"
						onclick={resetChart}
						class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
					>
						重置
					</button>
				</div>

				<!-- Chart container -->
				<div class="flex-1 min-h-0">
					<div bind:this={chartElement} class="w-full h-full"></div>
				</div>
			</div>
		</div>
	</main>
</div>
