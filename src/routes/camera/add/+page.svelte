<script lang="ts">
	import { goto } from '$app/navigation';
	import Icon from '@iconify/svelte';
	import * as m from '$lib/paraglide/messages.js';
	import Navbar from '$lib/components/Navbar.svelte';
	import ToastManager from '$lib/components/Toast/ToastManager.svelte';
	import BrandDropdownSearch from '$lib/components/DropdownSearch/BrandDropdownSearch.svelte';
	import CsvUploadModal from '$lib/components/Modal/CsvUploadModal.svelte';
	import { CINEMA_CAMERA_BRANDS } from '$lib/constants';

	import { onMount } from 'svelte';

	let isLoading = false;
	let toastManager: ToastManager;
	let modelInput: HTMLInputElement;
	let showBatchModal = false;
	let existingBrands: string[] = [];

	onMount(async () => {
		try {
			const response = await fetch('/api/camera/search/brand', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query: '' })
			});
			if (response.ok) {
				const data = await response.json();
				existingBrands = data.brands.map((b: any) => b.name);
			}
		} catch (error) {
			console.error('Error fetching brands:', error);
		}
	});

	// Form state
	let brandId: number | null = null;
	let brandName = '';
	let modelName = '';
	let releaseYear: number | null = new Date().getFullYear();
	let isCinema = false;

	// Validation state
	let isNameValid = true;
	let nameErrorMessage = '';
	let similarNames: string[] = [];
	let isCheckingName = false;
	let nameCheckTimeout: ReturnType<typeof setTimeout> | null = null;

	// Derived state
	let currentYear = new Date().getFullYear();
	$: isYearValid = releaseYear ? releaseYear > 1900 && releaseYear < currentYear + 2 : false;
	$: isFormValid = brandId !== null && modelName.trim().length > 0 && isNameValid && isYearValid;

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
			const response = await fetch('/api/camera/check-name', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name })
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
		if (!isFormValid) return;
		isLoading = true;

		try {
			const formData = new FormData();
			formData.set('brandId', String(brandId));
			formData.set('name', modelName);
			formData.set('releaseYear', String(releaseYear));
			formData.set('cinema', String(isCinema));

			const response = await fetch('?/createCamera', {
				method: 'POST',
				body: formData
			});

			if (response.ok) {
				let success = false;
				let errorMessage = 'Failed to create camera';
				try {
					const envelope = await response.json();
					if (envelope?.type === 'success') {
						success = true;
					} else if (envelope?.type === 'failure') {
						if (envelope.data?.message) errorMessage = envelope.data.message;
					}
				} catch {}

				if (success) {
					toastManager.showToast({
						title: m['camera.add.success'](),
						iconName: 'mdi:check-circle',
						iconColor: 'text-green-500',
						duration: 2000,
						showCountdown: true
					});
					setTimeout(() => goto('/camera/manage'), 2000);
				} else {
					toastManager.showToast({
						title: m['camera.add.failure'](),
						message: errorMessage,
						iconName: 'mdi:alert-circle',
						iconColor: 'text-red-500',
						duration: 5000,
						showCountdown: true
					});
				}
			} else {
				toastManager.showToast({
					title: m['camera.add.failure'](),
					iconName: 'mdi:alert-circle',
					iconColor: 'text-red-500',
					duration: 5000,
					showCountdown: true
				});
			}
		} catch (error) {
			console.error('Error creating camera:', error);
			toastManager.showToast({
				title: m['camera.add.network_error'](),
				iconName: 'mdi:alert-circle',
				iconColor: 'text-red-500',
				duration: 5000,
				showCountdown: true
			});
		} finally {
			isLoading = false;
		}
	}
</script>

<svelte:head>
	<title>{m['camera.add.title']()} - {m['app.title']()}</title>
</svelte:head>

<Navbar
	centerTitle="camera.add.title"
	showBackButton={true}
	backButtonUrl="/camera/manage"
	backButtonText="camera.manage.title"
/>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16">
	<div class="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
			<!-- Left Column: Single Add -->
			<div class="max-w-[20em] mx-auto md:mx-0 w-full">
				<!-- Header -->
				<div class="mb-8">
					<h1 class="text-3xl font-bold text-gray-900 dark:text-white">
						{m['camera.add.title']()}
					</h1>
					<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
						{m['camera.add.subtitle']()}
					</p>
				</div>

				<!-- Form -->
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
									max={currentYear + 1}
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
							<div class="flex justify-end space-x-3 pt-4">
								<button
									type="button"
									onclick={() => goto('/camera/manage')}
									class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 hover:border-gray-200 dark:hover:bg-gray-600 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
								>
									{m['camera.add.buttons.cancel']()}
								</button>
								<button
									type="submit"
									disabled={isLoading || !isFormValid}
									class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-500 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-400 dark:hover:border-blue-500"
								>
									{#if isLoading}
										<Icon icon="mdi:loading" class="animate-spin -ml-1 mr-3 h-5 w-5" />
										{m['camera.add.buttons.adding']()}
									{:else}
										<Icon icon="mdi:plus" class="-ml-1 mr-3 h-5 w-5" />
										{m['camera.add.buttons.add']()}
									{/if}
								</button>
							</div>
						</form>
					</div>
				</div>
			</div>

			<!-- Right Column: Batch Add -->
			<div class="max-w-[20em] mx-auto md:mx-0 w-full">
				<!-- Header -->
				<div class="mb-8">
					<h1 class="text-3xl font-bold text-gray-900 dark:text-white">
						{m['camera.add.batch_add.title']()}
					</h1>
					<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">&nbsp;</p>
				</div>

				<!-- Batch Add Button -->
				<div class="bg-white dark:bg-gray-800 shadow sm:rounded-lg">
					<div class="px-4 py-5 sm:p-6 flex justify-center">
						<button
							type="button"
							class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-500 hover:border-green-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:bg-green-500 dark:hover:bg-green-400 dark:hover:border-green-500"
							onclick={() => (showBatchModal = true)}
						>
							<Icon icon="mdi:file-upload" class="-ml-1 mr-3 h-5 w-5" />
							{m['camera.add.batch_add.button']()}
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<CsvUploadModal
	bind:isOpen={showBatchModal}
	title={m['camera.add.batch_add.modal_title']()}
	templateEndpoint="/api/camera/template"
	uploadEndpoint="/api/camera/batch-upload"
	instructions={[
		m['camera.add.batch_add.instructions_1'](),
		m['camera.add.batch_add.instructions_2'](),
		`${m['camera.add.batch_add.instructions_brands']()} ${existingBrands.join(', ')}`
	]}
	itemName="cameras"
/>

<ToastManager bind:this={toastManager} />
