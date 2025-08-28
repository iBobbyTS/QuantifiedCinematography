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

	let {
		isOpen = $bindable(),
		title,
		templateEndpoint,
		uploadEndpoint,
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
	let uploadError: { message: string; details?: string[]; errorGroups?: { error: string; details: string[] }[] } | null = $state(null);
	let uploadResult: { added_count: number; existing_count: number; total_processed: number; added_items?: string[]; file_name?: string } | null = $state(null);

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			const file = target.files[0];
			selectedFile = file;
			
			// Clear previous states when a new file is selected
			uploadError = null; // Clear previous errors
			uploadResult = null; // Clear previous upload results
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
					const errorMessage = errorData.error || 'An unknown error occurred during upload. Please try again.';
					const errorDetails = errorData.details || [];
					uploadError = { message: errorMessage, details: errorDetails };
					
					// Clear the file input after failed upload
					if (fileInput) {
						fileInput.value = '';
					}
					selectedFile = null;
					return;
				}

				// Parse JSON response
				const responseData = await response.json();
				
				uploadResult = {
					added_count: responseData.added_count,
					existing_count: responseData.existing_count,
					total_processed: responseData.total_processed,
					added_items: responseData.added_items || [],
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
		} catch (err) {
			console.error('Upload error:', err);
			uploadError = { message: 'An unexpected client-side error occurred. Please try again.' };
			
			// Clear the file input after failed upload
			if (fileInput) {
				fileInput.value = '';
			}
			selectedFile = null;
		} finally {
			isUploading = false;
		}
	}

	function closeModal() {
		isOpen = false;
		selectedFile = null;
		uploadError = null; // Clear errors on close
		uploadResult = null; // Clear results on close
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
		if (modalElement) {
			requestAnimationFrame(checkIfShouldCenter);
		}
	});
</script>

{#if isOpen}
	<div class="modal modal-open" class:modal-scrollable={!shouldCenter}>
		<div
			class="modal-box modal-smart"
			style="max-width: 90vw;"
			bind:this={modalElement}
		>
			<h3 class="font-bold text-lg mb-2">{title}</h3>
			
			<div class="space-y-4">
				{#if showDownload}
					<div class="flex justify-center">
						<a href={templateEndpoint} class="btn btn-outline w-2/5" download>
							<Icon icon="mdi:download" class="mr-2" />
							Download CSV Template
						</a>
					</div>
				{/if}

				<div class="flex justify-center">
					<div class="w-2/5">
						<div class="label">
							<span class="label-text">Select CSV File</span>
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
					<div class="alert alert-info">
						<Icon icon="mdi:information-outline" class="h-6 w-6 flex-shrink-0" />
						<div>
							<h3 class="font-bold">{uploadResult.file_name} uploaded completed.</h3>
							<div class="text-sm">
								{#if uploadResult.added_count > 0}
									<p>Added {uploadResult.added_count} new {itemName}:</p>
									{#if uploadResult.added_items && uploadResult.added_items.length > 0}
										<ul class="list-disc pl-5 mt-1">
											{#each uploadResult.added_items as itemName}
												<li>{itemName}</li>
											{/each}
										</ul>
									{/if}
								{/if}
								{#if uploadResult.existing_count > 0}
									<p class="mt-2">• Skipped {uploadResult.existing_count} existing items</p>
								{/if}
							</div>
						</div>
					</div>
				{/if}
				<div class="flex justify-center gap-4 mt-4">
					<button class="btn" onclick={closeModal}>
						Cancel
					</button>
					{#if !uploadResult}
						<button class="btn btn-primary" onclick={uploadFile}>
							Upload
						</button>
					{:else}
						<button class="btn btn-primary" onclick={() => { uploadResult = null; selectedFile = null; uploadError = null; }}>
							Upload Another File
						</button>
					{/if}
				</div>
				
				{#if instructions.length > 0}
					<div class="prose prose-sm max-w-none rounded-lg border bg-base-200 p-4">
						<h4 class="font-bold">Instructions</h4>
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