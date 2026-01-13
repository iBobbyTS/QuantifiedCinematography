<!--
  @fileoverview CSV Upload Modal component
  
  Provides a reusable CSV upload modal with file selection, template download,
  and detailed instructions. Supports responsive design and automatic centering.
  
  @author Bobby Sun
  @version 1.0.0
-->

<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Icon from '@iconify/svelte';

	import * as m from '$lib/paraglide/messages.js';

	let {
		isOpen = $bindable(),
		title,
		templateEndpoint,
		uploadEndpoint,
		validateEndpoint,
		instructions = [],
		itemName = 'items',
		showDownload = true,
		customUploadHandler,
		httpMethod = 'POST'
	} = $props<{
		isOpen: boolean;
		title: string;
		templateEndpoint: string;
		uploadEndpoint: string;
		validateEndpoint?: string;
		instructions?: string[];
		itemName?: string;
		showDownload?: boolean;
		customUploadHandler?: (file: File) => Promise<{ success: boolean; error?: string }>;
		httpMethod?: string;
	}>();

	const dispatch = createEventDispatcher<{
		uploadSuccess: { filename: string };
		close: void;
	}>();

	let modalElement: HTMLDivElement | undefined = $state();
	let shouldCenter = $state(true);
	let fileInput: HTMLInputElement | undefined = $state();
	let selectedFile: File | null = $state(null);
	let isUploading = $state(false);
	let isValidating = $state(false);
	let uploadError: {
		message: string;
		details?: string[];
		errorGroups?: { error: string; details: string[] }[];
	} | null = $state(null);
	let uploadResult: {
		added_count: number;
		existing_count: number;
		total_processed: number;
		added_items?: string[];
		added_brands?: string[];
		failed_items?: { brand: string; model: string; reason: string }[];
		file_name?: string;
	} | null = $state(null);
	let validationData: any = $state(null);

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			const file = target.files[0];
			selectedFile = file;

			// Clear previous states when a new file is selected
			uploadError = null;
			uploadResult = null;
			validationData = null;

			if (validateEndpoint) {
				validateFile();
			}
		}
	}

	async function validateFile() {
		if (!selectedFile || !validateEndpoint) return;

		isValidating = true;
		uploadError = null;

		try {
			const formData = new FormData();
			formData.append('csv', selectedFile);

			const response = await fetch(validateEndpoint, {
				method: 'POST',
				body: formData
			});

			if (!response.ok) {
				const errorData = await response.json();
				uploadError = { message: errorData.error || 'Validation failed.' };
				return;
			}

			validationData = await response.json();
		} catch (err) {
			console.error('Validation error:', err);
			uploadError = { message: 'An unexpected error occurred during validation.' };
		} finally {
			isValidating = false;
		}
	}

	async function uploadFile() {
		if (!selectedFile) {
			uploadError = { message: 'Please select a file to upload.' };
			return;
		}

		uploadError = null;
		isUploading = true;

		try {
			// Use custom upload handler if provided
			if (customUploadHandler) {
				const result = await customUploadHandler(selectedFile);

				if (!result.success) {
					uploadError = {
						message: result.error || 'Upload failed. Please try again.',
						details: result.details || [],
						errorGroups: result.errorGroups || []
					};
					// Clear the file input after failed upload
					if (fileInput) {
						fileInput.value = '';
					}
					selectedFile = null;
					validationData = null;
					return;
				}

				// For custom handlers, we assume success and dispatch event
				dispatch('uploadSuccess', { filename: selectedFile.name });
			} else {
				// Original upload logic
				const formData = new FormData();
				formData.append('csv', selectedFile);

				const response = await fetch(uploadEndpoint, {
					method: httpMethod,
					body: formData
				});

				if (!response.ok) {
					const errorData = await response.json();
					const errorMessage =
						errorData.error || 'An unknown error occurred during upload. Please try again.';
					const errorDetails = errorData.details || [];
					uploadError = { message: errorMessage, details: errorDetails };

					// Clear the file input after failed upload
					if (fileInput) {
						fileInput.value = '';
					}
					selectedFile = null;
					validationData = null;
					return;
				}

				// Parse JSON response
				const responseData = await response.json();

				uploadResult = {
					added_count: responseData.added_count,
					existing_count: responseData.existing_count,
					total_processed: responseData.total_processed,
					added_items: responseData.added_items || [],
					added_brands: responseData.added_brands || [],
					failed_items: responseData.failed_items || [],
					file_name: selectedFile.name
				};

				// Handle CSV download if content is provided
				if (responseData.csv_content) {
					const blob = new Blob([responseData.csv_content], { type: 'text/csv' });
					const url = window.URL.createObjectURL(blob);
					const a = document.createElement('a');
					a.style.display = 'none';
					a.href = url;
					a.download = 'new_user_passwords.csv';
					document.body.appendChild(a);
					a.click();
					window.URL.revokeObjectURL(url);
					a.remove();

					dispatch('uploadSuccess', { filename: 'new_user_passwords.csv' });
				} else {
					dispatch('uploadSuccess', { filename: 'upload_completed' });
				}
			}

			// Clear the file input after successful upload
			if (fileInput) {
				fileInput.value = '';
			}
			selectedFile = null;
			validationData = null;
		} catch (err) {
			console.error('Upload error:', err);
			uploadError = { message: 'An unexpected client-side error occurred. Please try again.' };

			// Clear the file input after failed upload
			if (fileInput) {
				fileInput.value = '';
			}
			selectedFile = null;
			validationData = null;
		} finally {
			isUploading = false;
		}
	}

	function closeModal() {
		isOpen = false;
		selectedFile = null;
		uploadError = null; // Clear errors on close
		uploadResult = null; // Clear results on close
		validationData = null;
		dispatch('close');
	}

	function checkIfShouldCenter() {
		if (modalElement) {
			const modalHeight = modalElement.scrollHeight;
			const viewportHeight = window.innerHeight;
			shouldCenter = modalHeight + 160 < viewportHeight; // 160px = 5rem * 2 for margins
		}
	}

	$effect(() => {
		if (isOpen && modalElement) {
			checkIfShouldCenter();

			const resizeObserver = new ResizeObserver(() => {
				checkIfShouldCenter();
			});

			resizeObserver.observe(modalElement);

			const handleResize = () => checkIfShouldCenter();
			window.addEventListener('resize', handleResize);

			return () => {
				resizeObserver.disconnect();
				window.removeEventListener('resize', handleResize);
			};
		}
	});

	$effect(() => {
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		title;
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		instructions;
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		validationData;
		if (modalElement) {
			requestAnimationFrame(checkIfShouldCenter);
		}
	});
</script>

{#if isOpen}
	<div class="modal modal-open" class:modal-scrollable={!shouldCenter}>
		<div
			class="modal-box modal-smart bg-white dark:bg-base-100 text-gray-900 dark:text-base-content"
			style="max-width: 90vw;"
			bind:this={modalElement}
		>
			<h3 class="font-bold text-lg mb-2 text-gray-900 dark:text-white">{title}</h3>

			<div class="space-y-4">
				{#if showDownload}
					<div class="flex justify-center">
						<a
							href={templateEndpoint}
							class="btn btn-outline w-2/5 text-gray-700 dark:text-white"
							download
						>
							<Icon icon="mdi:download" class="mr-2" />
							{m['modal.download_template']()}
						</a>
					</div>
				{/if}

				<div class="flex justify-center">
					<div class="w-2/5">
						<div class="label">
							<span class="label-text text-gray-700 dark:text-gray-300"
								>{m['modal.select_csv']()}</span
							>
						</div>
						<input
							type="file"
							class="file-input file-input-bordered w-full"
							accept=".csv"
							bind:this={fileInput}
							onchange={handleFileSelect}
						/>
					</div>
				</div>
				{#if selectedFile}
					<div class="mt-2 text-sm text-gray-500 text-center">Selected: {selectedFile.name}</div>
				{/if}

				<!-- Validation Loading -->
				{#if isValidating}
					<div class="flex items-center justify-center pt-4">
						<span class="loading loading-spinner loading-lg"></span>
						<span class="ml-4">Validating file...</span>
					</div>
				{/if}

				<!-- Validation Preview Slot -->
				{#if validationData && !isValidating}
					<slot name="preview" {validationData}></slot>
				{/if}

				<!-- Error display area -->
				{#if uploadError}
					<div class="alert alert-error">
						<Icon icon="mdi:alert-circle-outline" class="h-6 w-6 flex-shrink-0" />
						<div>
							{#if uploadError.errorGroups && uploadError.errorGroups.length > 0}
								{#each uploadError.errorGroups as errorGroup}
									<h3 class="font-bold">{errorGroup.error}</h3>
									{#if errorGroup.details && errorGroup.details.length > 0}
										<ul class="list-disc pl-5 text-xs">
											{#each errorGroup.details as detail}
												<li>{detail}</li>
											{/each}
										</ul>
									{/if}
								{/each}
							{:else if uploadError.message}
								<h3 class="font-bold">{uploadError.message}</h3>
								{#if uploadError.details && uploadError.details.length > 0}
									<ul class="list-disc pl-5 text-xs">
										{#each uploadError.details as detail}
											<li>{detail}</li>
										{/each}
									</ul>
								{/if}
							{:else}
								<h3 class="font-bold">Upload failed. Please try again.</h3>
							{/if}
						</div>
					</div>
				{/if}

				{#if isUploading}
					<div class="flex items-center justify-center pt-4">
						<span class="loading loading-spinner loading-lg"></span>
						<span class="ml-4">Uploading, please wait...</span>
					</div>
				{/if}

				{#if uploadResult}
					<div class="alert alert-info dark:bg-blue-900 dark:border-blue-800 dark:text-blue-100">
						<Icon icon="mdi:information-outline" class="h-6 w-6 flex-shrink-0" />
						<div>
							<h3 class="font-bold">
								{m['camera.add.batch_add.upload_success']({
									filename: uploadResult.file_name || ''
								})}
							</h3>
							<div class="text-sm">
								{#if uploadResult.added_brands && uploadResult.added_brands.length > 0}
									<p>
										{m['camera.add.batch_add.added_brands']({
											count: uploadResult.added_brands.length
										})}
									</p>
									<ul class="list-disc pl-5 mt-1">
										{#each uploadResult.added_brands as brandName}
											<li>{brandName}</li>
										{/each}
									</ul>
								{/if}
								{#if uploadResult.added_count > 0}
									<p class="mt-2">
										{m['camera.add.batch_add.added_items']({ count: uploadResult.added_count })}
									</p>
									{#if uploadResult.added_items && uploadResult.added_items.length > 0}
										<ul class="list-disc pl-5 mt-1">
											{#each uploadResult.added_items as itemName}
												<li>{itemName}</li>
											{/each}
										</ul>
									{/if}
								{/if}
								{#if uploadResult.failed_items && uploadResult.failed_items.length > 0}
									<p class="mt-2 text-yellow-700 dark:text-yellow-600 font-medium">
										{m['camera.add.batch_add.failed_items']()}
									</p>
									<ul class="list-disc pl-5 mt-1 text-yellow-700 dark:text-yellow-600 font-medium">
										{#each uploadResult.failed_items as failedItem}
											<li>
												{failedItem.brand}
												{failedItem.model}
												<!-- @ts-ignore -->
												({(m as any)[`camera.add.batch_add.errors.${failedItem.reason}`]?.() ||
													failedItem.reason})
											</li>
										{/each}
									</ul>
								{/if}
							</div>
						</div>
					</div>
				{/if}
				<div class="flex justify-center gap-4 mt-4">
					<button class="btn" onclick={closeModal}>
						{uploadResult
							? m['camera.add.batch_add.buttons.done']()
							: m['camera.add.batch_add.buttons.cancel']()}
					</button>
					{#if !uploadResult}
						<button
							class="btn btn-primary"
							onclick={uploadFile}
							disabled={validateEndpoint && !validationData}
						>
							{m['camera.add.batch_add.buttons.upload']()}
						</button>
					{:else}
						<button
							class="btn btn-primary"
							onclick={() => {
								uploadResult = null;
								selectedFile = null;
								uploadError = null;
								validationData = null;
							}}
						>
							{m['camera.add.batch_add.buttons.upload_another']()}
						</button>
					{/if}
				</div>

				{#if instructions.length > 0}
					<div
						class="prose prose-sm max-w-none rounded-lg border bg-gray-50 dark:bg-base-200 p-4 text-gray-600 dark:text-gray-300"
					>
						<h4 class="font-bold text-gray-900 dark:text-white">{m['modal.instructions']()}</h4>
						<ul>
							{#each instructions as instruction}
								{@html `<li>${instruction}</li>`}
							{/each}
						</ul>
					</div>
				{/if}
			</div>
		</div>
		<form class="modal-backdrop">
			<button class="hover:cursor-auto" onclick={() => (isOpen = false)}>close</button>
		</form>
	</div>
{/if}

<style>
	/* Scrollable layout for large modals */
	.modal-scrollable {
		display: block;
		overflow-y: auto;
		align-items: flex-start;
	}

	.modal-scrollable .modal-smart {
		margin: 2.5rem auto;
		position: static;
		transform: none;
	}

	.modal-smart {
		max-height: none;
		width: 100%;
		max-width: 32rem;
	}
</style>
