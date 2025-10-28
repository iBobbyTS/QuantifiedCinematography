<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import Icon from '@iconify/svelte';

  // Props
  export let value: string = '';
  export let options: Array<{ value: string; label: string; icon?: string }> = [];
  export let placeholder: string = '';
  export let widthClass: string = 'w-32';
  export let disabled: boolean = false;
  export let dropdownPosition: 'top' | 'bottom' = 'bottom';

  const dispatch = createEventDispatcher();

  let isOpen = false;
  let containerEl: HTMLElement | null = null;
  const dropdownId = `dd-${Math.random().toString(36).slice(2)}-${Date.now()}`;

  function toggleOpen() {
    if (disabled) return;
    isOpen = !isOpen;
  }

  function close() {
    isOpen = false;
  }

  function selectOption(v: string) {
    if (disabled) return;
    dispatch('change', v);
    close();
  }

  function handleDocumentClick(event: MouseEvent) {
    if (!isOpen) return;
    if (containerEl && !containerEl.contains(event.target as Node)) {
      close();
    }
  }

  onMount(() => {
    if (typeof document !== 'undefined') {
      document.addEventListener('click', handleDocumentClick);
    }
  });

  onDestroy(() => {
    if (typeof document !== 'undefined') {
      document.removeEventListener('click', handleDocumentClick);
    }
  });

  $: selectedLabel = options.find(o => o.value === value)?.label || placeholder;
</script>

<div class={"relative " + widthClass} bind:this={containerEl}>
  <button
    class="w-full px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
    onclick={toggleOpen}
    disabled={disabled}
    aria-haspopup="listbox"
    aria-expanded={isOpen}
  >
    <span class="text-left truncate">{selectedLabel}</span>
    <Icon icon="mdi:chevron-down" class="w-4 h-4" />
  </button>

  {#if isOpen}
    <div
      id={dropdownId}
      class="absolute right-0 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 {dropdownPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}"
      role="listbox"
    >
      {#each options as opt}
        <button
          type="button"
          class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 transition-colors duration-200"
          role="option"
          aria-selected={opt.value === value}
          onclick={() => selectOption(opt.value)}
        >
          {#if opt.icon}
            <Icon icon={opt.icon} class="w-4 h-4" />
          {/if}
          <span class="truncate">{opt.label}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>


