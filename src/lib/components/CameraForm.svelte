<script lang="ts">
	import Icon from '@iconify/svelte';
	import * as m from '$lib/paraglide/messages.js';
	import BrandDropdownSearch from '$lib/components/DropdownSearch/BrandDropdownSearch.svelte';
	import { CINEMA_CAMERA_BRANDS } from '$lib/constants';

	interface Props {
		// Initial values for edit mode
		initialBrandId?: number | null;
		initialBrandName?: string;
		initialModelName?: string;
		initialReleaseYear?: number | null;
		initialIsCinema?: boolean;
		cameraId?: number; // For edit mode, to exclude from name check
		// Original values for comparison (edit mode only)
		originalBrandId?: number | null | undefined;
		originalModelName?: string | undefined;
		originalReleaseYear?: number | null | undefined;
		originalIsCinema?: boolean | undefined;
		onSubmit: (data: {
			brandId: number;
			modelName: string;
			releaseYear: number;
			isCinema: boolean;
		}) => Promise<void>;
		submitButtonText?: string;
		submitButtonLoadingText?: string;
		submitButtonIcon?: string; // Icon name for submit button
		isLoading?: boolean;
	}

	let {
		initialBrandId = null,
		initialBrandName = '',
		initialModelName = '',
		initialReleaseYear = new Date().getFullYear(),
		initialIsCinema = false,
		cameraId,
		originalBrandId,
		originalModelName,
		originalReleaseYear,
		originalIsCinema,
		onSubmit,
		submitButtonText = m['camera.add.buttons.add'](),
		submitButtonLoadingText = m['camera.add.buttons.adding'](),
		submitButtonIcon = 'mdi:plus',
		isLoading = false
	}: Props = $props();

	// Form state
	let brandId: number | null = $state(initialBrandId);
	let brandName = $state(initialBrandName);
	let modelName = $state(initialModelName);
	let releaseYear: number | null = $state(initialReleaseYear);
	let isCinema = $state(initialIsCinema);

	// Validation state
	let isNameValid = $state(true);
	let nameErrorMessage = $state('');
	let similarNames: string[] = $state([]);
	let isCheckingName = $state(false);
	let nameCheckTimeout: ReturnType<typeof setTimeout> | null = null;

	// Derived state
	let currentYear = new Date().getFullYear();
	let isYearValid = $derived(releaseYear ? releaseYear > 1900 && releaseYear < currentYear + 2 : false);
	let isFormValid = $derived(brandId !== null && modelName.trim().length > 0 && isNameValid && isYearValid);
	
	// Check if values have changed (for edit mode)
	let hasChanges = $derived(
		originalBrandId === undefined
			? true // Add mode, always allow submit
			: brandId !== originalBrandId ||
				modelName.trim() !== (originalModelName || '').trim() ||
				releaseYear !== originalReleaseYear ||
				isCinema !== (originalIsCinema || false)
	);

	let modelInput: HTMLInputElement;

	// Handle brand selection
	function handleBrandSelect(event: CustomEvent) {
		const { id, title } = event.detail;
		brandId = id;
		brandName = title;

		// Auto-select cinema camera based on brand
		if (CINEMA_CAMERA_BRANDS.some((b) => title.toLowerCase().includes(b.toLowerCase()))) {
			isCinema = true;
		}
	}

	function handleModalClose() {
		modelInput?.focus();
	}

	// Handle name input with debounce
	function handleNameInput(event: Event) {
		const target = event.target as HTMLInputElement;
		modelName = target.value;
		isNameValid = true; // Reset valid state initially
		nameErrorMessage = '';
		similarNames = [];

		if (nameCheckTimeout) clearTimeout(nameCheckTimeout);

		if (modelName.trim().length > 0) {
			isCheckingName = true;
			nameCheckTimeout = setTimeout(async () => {
				await checkName(modelName);
				isCheckingName = false;
			}, 500);
		}
	}

	// Check name API
	async function checkName(name: string) {
		try {
			const body: { name: string; excludeId?: number } = { name };
			if (cameraId) {
				body.excludeId = cameraId;
			}

			const response = await fetch('/api/camera/check-name', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});

			if (response.ok) {
				const data = await response.json();
				if (data.exists) {
					isNameValid = false;
					nameErrorMessage = m['camera.add.errors.name_exists']();
				} else {
					isNameValid = true;
					similarNames = data.similar || [];
				}
			}
		} catch (error) {
			console.error('Error checking name:', error);
		}
	}

	async function handleSubmit() {
		if (!isFormValid || !brandId) return;
		await onSubmit({
			brandId,
			modelName: modelName.trim(),
			releaseYear: releaseYear!,
			isCinema
		});
	}
</script>

<div class="bg-white dark:bg-gray-800 shadow sm:rounded-lg">
	<div class="px-4 py-5 sm:p-6">
		<form
			class="space-y-6"
			onsubmit={(e) => {
				e.preventDefault();
				handleSubmit();
			}}
		>
			<!-- Brand -->
			<div>
				<label
					for="brand"
					class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
				>
					{m['camera.add.form.brand']()}
				</label>
				<BrandDropdownSearch
					initialBrandId={brandId ?? undefined}
					initialBrandName={brandName}
					on:select={handleBrandSelect}
					on:modal-close={handleModalClose}
				/>
			</div>

			<!-- Model Name -->
			<div>
				<label
					for="model"
					class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
				>
					{m['camera.add.form.model']()}
				</label>
				<div class="flex items-start gap-4">
					<div class="flex-1">
						<input
							bind:this={modelInput}
							id="model"
							type="text"
							class="appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white
							{isNameValid
								? 'border-gray-300 dark:border-gray-600'
								: 'border-red-500 focus:border-red-500 focus:ring-red-500'}"
							placeholder={m['camera.add.form.model_placeholder']()}
							value={modelName}
							oninput={handleNameInput}
						/>
						<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
							{m['camera.add.form.model_help']()}
						</p>
						{#if !isNameValid}
							<p class="mt-1 text-sm text-red-600 dark:text-red-400">
								{nameErrorMessage}
							</p>
						{/if}
					</div>

					<!-- Similar names warning -->
					{#if similarNames.length > 0}
						<div
							class="flex-1 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3"
						>
							<div class="flex">
								<Icon icon="mdi:alert" class="h-5 w-5 text-yellow-400 flex-shrink-0" />
								<div class="ml-2">
									<p class="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
										{m['camera.add.warnings.similar_names_found']()}
									</p>
									<ul
										class="mt-1 text-sm text-yellow-700 dark:text-yellow-300 list-disc list-inside"
									>
										{#each similarNames as name}
											<li>{name}</li>
										{/each}
									</ul>
									<p class="mt-1 text-xs text-yellow-600 dark:text-yellow-400">
										{m['camera.add.warnings.check_duplicate']()}
									</p>
								</div>
							</div>
						</div>
					{/if}
				</div>
			</div>

			<!-- Release Year -->
			<div>
				<label
					for="year"
					class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
				>
					{m['camera.add.form.release_year']()}
				</label>
				<input
					id="year"
					type="number"
					min="1901"
					max={String(currentYear + 1)}
					class="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
					bind:value={releaseYear}
				/>
			</div>

			<!-- Cinema Camera Checkbox -->
			<div class="flex flex-col space-y-1">
				<span class="text-sm font-medium text-gray-700 dark:text-gray-300">
					{m['camera.add.form.cinema']()}
				</span>
				<label class="flex items-center space-x-2 cursor-pointer">
					<input
						type="checkbox"
						bind:checked={isCinema}
						class="checkbox checkbox-sm checkbox-primary"
					/>
					<span class="text-xs text-gray-500 dark:text-gray-400 select-none">
						{m['camera.add.form.cinema_help']()}
					</span>
				</label>
			</div>

			<!-- Actions -->
			<div class="flex justify-end pt-4">
				<div class="relative group">
					<button
						type="submit"
						disabled={isLoading || !isFormValid || !hasChanges}
						class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-500 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-400 dark:hover:border-blue-500"
					>
						{#if isLoading}
							<Icon icon="mdi:loading" class="animate-spin -ml-1 mr-3 h-5 w-5" />
							{submitButtonLoadingText}
						{:else}
							<Icon icon={submitButtonIcon} class="-ml-1 mr-3 h-5 w-5" />
							{submitButtonText}
						{/if}
					</button>
					{#if !hasChanges && originalBrandId !== undefined}
						<div
							class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-sm text-white bg-gray-900 dark:bg-gray-700 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10"
						>
							{m['camera.edit.tooltip.no_changes']()}
							<div
								class="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"
							></div>
						</div>
					{/if}
				</div>
			</div>
		</form>
	</div>
</div>
