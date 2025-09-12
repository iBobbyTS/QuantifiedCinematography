<script lang="ts">
import Icon from '@iconify/svelte';

export let isOpen: boolean;
export let imageUrl: string = '';
export let fileName: string = '';
export let onClose: () => void = () => {};

function handleDownload() {
	const link = document.createElement('a');
	link.href = imageUrl;
	link.download = fileName || 'image';
	link.target = '_blank';
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}
</script>

{#if isOpen}
  <div class="modal modal-open">
    <div class="modal-box relative flex flex-col items-center max-w-3xl w-full pt-4 pb-4 px-4">
      <!-- Top right button, placed at the top right of the modal, not overlapping the image -->
      <div class="absolute right-4 top-4 flex gap-2 z-10">
        <button type="button" class="btn btn-sm btn-ghost" title="Download" on:click={handleDownload}>
          <Icon icon="mdi:download" class="text-xl" />
        </button>
        <button type="button" class="btn btn-sm btn-ghost" title="Close" on:click={onClose}>
          <Icon icon="mdi:close" class="text-xl" />
        </button>
      </div>
      <!-- Image preview, leave space at the top to avoid overlapping with the button -->
      <img src={imageUrl} alt={fileName} class="max-h-[70vh] object-contain rounded mt-12" />
    </div>
    <form class="modal-backdrop">
      <button type="button" tabindex="-1" aria-label="Close" on:click={onClose}></button>
    </form>
  </div>
{/if} 