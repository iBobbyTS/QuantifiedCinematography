<script lang="ts">
	import { goto } from '$app/navigation';
	import Icon from '@iconify/svelte';
	import * as m from '$lib/paraglide/messages.js';
	import Navbar from '$lib/components/Navbar.svelte';
	import ToastManager from '$lib/components/Toast/ToastManager.svelte';
	import CameraForm from '$lib/components/CameraForm.svelte';
	import CsvUploadModal from '$lib/components/Modal/CsvUploadModal.svelte';

	export let data;
	let isLoading = false;
	let toastManager: ToastManager;
	let showBatchModal = false;

	$: existingBrands = data.brands ? data.brands.map((b: any) => b.name) : [];
	$: formattedBrands = `<span class="font-bold text-base">${existingBrands.join((m as any)['camera.add.batch_add.brand_separator']())}</span>`;

	async function handleSubmit(formData: {
		brandId: number;
		modelName: string;
		releaseYear: number;
		isCinema: boolean;
	}) {
		isLoading = true;

		try {
			const fd = new FormData();
			fd.set('brandId', String(formData.brandId));
			fd.set('name', formData.modelName);
			fd.set('releaseYear', String(formData.releaseYear));
			fd.set('cinema', String(formData.isCinema));

			const response = await fetch('?/createCamera', {
				method: 'POST',
				body: fd
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
						duration: 3000,
						showCountdown: true
					});
					// Reset form by reloading the page or resetting the component
					// For now, we'll just show success and let user add another
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
				<CameraForm
					onSubmit={handleSubmit}
					isLoading={isLoading}
					submitButtonText={m['camera.add.buttons.add']()}
					submitButtonLoadingText={m['camera.add.buttons.adding']()}
				/>
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
	validateEndpoint="/api/camera/batch-validate"
	instructions={[
		m['camera.add.batch_add.instructions_1'](),
		m['camera.add.batch_add.instructions_2'](),
		`${m['camera.add.batch_add.instructions_brands']()} ${formattedBrands}`
	]}
	itemName="cameras"
>
	<div slot="preview" let:validationData class="overflow-x-auto">
		{#if validationData && validationData.results}
			<table class="table table-xs w-full">
				<thead>
					<tr>
						<th>
							<div class="flex flex-col gap-1">
								<span>{m['camera.add.batch_add.preview.brand']()}</span>
								<div class="flex flex-wrap gap-2 text-[10px] font-normal text-gray-500">
									<div class="flex items-center gap-1">
										<div class="w-1.5 h-1.5 rounded-full bg-green-500"></div>
										<span>{m['camera.add.batch_add.preview.existing']()}</span>
									</div>
									<div class="flex items-center gap-1">
										<div class="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
										<span>{m['camera.add.batch_add.preview.new']()}</span>
									</div>
								</div>
							</div>
						</th>
						<th>
							<div class="flex flex-col gap-1">
								<span>{m['camera.add.batch_add.preview.model']()}</span>
								<div class="flex flex-wrap gap-2 text-[10px] font-normal text-gray-500">
									<div class="flex items-center gap-1">
										<div class="w-1.5 h-1.5 rounded-full bg-green-500"></div>
										<span>{m['camera.add.batch_add.preview.new']()}</span>
									</div>
									<div class="flex items-center gap-1">
										<div class="w-1.5 h-1.5 rounded-full bg-red-500"></div>
										<span>{m['camera.add.batch_add.preview.duplicate']()}</span>
									</div>
								</div>
							</div>
						</th>
						<th>{m['camera.add.batch_add.preview.year']()}</th>
						<th>{m['camera.add.batch_add.preview.cinema']()}</th>
						<th>{m['camera.add.batch_add.preview.status']()}</th>
					</tr>
				</thead>
				<tbody>
					{#each validationData.results as row}
						<tr>
							<!-- Brand: Green dot if exists, Blue dot if new -->
							<td>
								<div class="flex items-center gap-2">
									<div
										class="w-2 h-2 rounded-full {row.brandExists ? 'bg-green-500' : 'bg-blue-500'}"
									></div>
									<span
										class={row.brandExists
											? 'text-green-700 dark:text-green-400'
											: 'text-blue-700 dark:text-blue-400'}
									>
										{row.brand}
									</span>
								</div>
							</td>

							<!-- Model: Green dot if new (valid), Red dot if exists (invalid) -->
							<td>
								<div class="flex items-center gap-2">
									<div
										class="w-2 h-2 rounded-full {!row.modelExists ? 'bg-green-500' : 'bg-red-500'}"
									></div>
									<span
										class={!row.modelExists
											? 'text-green-700 dark:text-green-400'
											: 'text-red-700 dark:text-red-400'}
									>
										{row.model}
									</span>
								</div>
							</td>

							<td>{row.year}</td>
							<td>{row.isCinema ? 'Y' : 'N'}</td>

							<!-- Status Icon -->
							<td>
								{#if row.isValid}
									<Icon icon="mdi:check-circle" class="text-green-500 h-5 w-5" />
								{:else}
									<div
										class="tooltip"
										data-tip={m['camera.add.batch_add.preview.model_exists_tooltip']()}
									>
										<Icon icon="mdi:close-circle" class="text-red-500 h-5 w-5" />
									</div>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
</CsvUploadModal>

<ToastManager bind:this={toastManager} />
