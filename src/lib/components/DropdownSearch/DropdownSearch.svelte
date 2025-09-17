<!--
  @fileoverview Advanced dropdown search component
  
  Provides an advanced search dropdown with validation, selection events,
  and add functionality. Supports custom search and validation functions.
  
  @author Bobby Sun
  @version 1.0.0
-->

<script context="module" lang="ts">
export interface DropdownItem {
  id: string | number;
  title: string;
  sub1?: string;
  sub2?: string;
}
</script>

<script lang="ts">
	import Icon from '@iconify/svelte';

import { createEventDispatcher, type Component } from 'svelte';

export let searchFn: (query: string) => Promise<DropdownItem[]>;
export let validateFn: (query: string) => Promise<{ valid: boolean, id?: string | number, title?: string, sub1?: string, sub2?: string }>;
export let placeholder: string = '';
export let debounce: number = 400;
export let showAddButton: boolean = false;
export let addButtonIcon = "mdi:plus";
export let addButtonText: string = 'Add';
export let addModalInputValue: string = '';
export let disabled: boolean = false;

const dispatch = createEventDispatcher();

let inputValue = '';
let results: DropdownItem[] = [];
let showDropdown = false;
let loading = false;
let timer: any;
let validateTimer: any;
let validated = false;
let valid = false;
let selectedId: string | number | null = null;
let inputClass = 'input input-bordered w-full';
let showAddModal = false;
let inputEl: HTMLInputElement;

async function doSearch() {
  if (!inputValue.trim()) {
    results = [];
    showDropdown = false;
    return;
  }
  loading = true;
  results = await searchFn(inputValue.trim());
  loading = false;
  showDropdown = true;
}

async function doValidate(val: string) {
  if (!val.trim()) {
    validated = false;
    valid = false;
    selectedId = null;
    inputClass = 'input input-bordered w-full';
    // Dispatch validation event for empty value
    dispatch('validation', { valid: false, result: { valid: false } });
    return;
  }
  const res = await validateFn(val.trim());
  validated = true;
  valid = res.valid;
  
  // Dispatch validation event
  dispatch('validation', { valid: res.valid, result: res });
  
  if (valid && res.id !== undefined) {
    selectedId = res.id;
    inputClass = 'input input-bordered w-full border-emerald-600 focus:border-emerald-600';
    inputValue = res.title || inputValue;
    dispatch('select', selectedId);
  } else {
    selectedId = null;
    inputClass = 'input input-bordered w-full border-red-600 focus:border-red-600';
  }
}

function handleInput(e: Event) {
  if (disabled) return;
  
  inputValue = (e.target as HTMLInputElement).value;
  if (timer) clearTimeout(timer);
  timer = setTimeout(doSearch, debounce);
  // validate
  if (validateTimer) clearTimeout(validateTimer);
  validateTimer = setTimeout(() => doValidate(inputValue), debounce);
}

function handleSelect(item: DropdownItem) {
  inputValue = item.title;
  showDropdown = false;
  valid = true;
  validated = true;
  selectedId = item.id;
  inputClass = 'input input-bordered w-full border-emerald-600 focus:border-emerald-600';
  
  // Dispatch validation event for dropdown selection
  dispatch('validation', { valid: true, result: { valid: true, id: item.id, title: item.title } });
  dispatch('select', item.id);
}

function handleAddClick() {
  addModalInputValue = inputValue;
  showAddModal = true;
  // showDropdown = false; // Don't close dropdown menu anymore
}

function handleAddModalClose() {
  showAddModal = false;
  // Optional: refresh search to update dropdown
  if (inputValue.trim()) {
    doSearch();
  }
}

// Expose methods to parent component
export function closeAddModal() {
  handleAddModalClose();
}

export function refreshSearch() {
  if (inputValue.trim()) {
    doSearch();
  }
}

export function setInputValue(val: string) {
  inputValue = val;
}

export function revalidate() {
  if (inputValue.trim()) {
    doValidate(inputValue);
  }
}
</script>

<div class="relative w-full">
  <input
    bind:this={inputEl}
    class={inputClass}
    bind:value={inputValue}
    {placeholder}
    {disabled}
    oninput={handleInput}
    onfocus={() => { if (!disabled && (results.length || showAddButton)) showDropdown = true; }}
    onblur={() => setTimeout(() => showDropdown = false, 200)}
  />
  {#if showDropdown && (results.length > 0 || showAddButton || !loading)}
    <ul class="absolute left-0 right-0 bg-base-100 shadow-lg rounded-b z-50 max-h-80 overflow-auto border border-base-200">
      {#each results as item (item)}
        <button
          type="button"
          class="w-full text-left px-4 py-2 cursor-pointer hover:bg-base-200"
          onclick={() => handleSelect(item)}
        >
          <div class="font-bold text-base">{item.title}</div>
          <div class="flex text-xs text-gray-500 mt-1">
            <div class="flex-1 text-left">{item.sub1}</div>
            <div class="flex-1 text-left">{item.sub2}</div>
          </div>
        </button>
      {/each}
      {#if showAddButton}
        <button
          type="button"
          class="flex items-center w-full text-left px-4 py-2 cursor-pointer hover:bg-base-200 text-primary font-bold border-t border-base-200"
          onclick={handleAddClick}
        >
          {#if addButtonIcon !== ""}
            <Icon icon={addButtonIcon} class="text-xl"/>
          {/if}
          {addButtonText}
        </button>
      {/if}
    </ul>
  {/if}
</div>

{#if showAddModal}
  <slot name="add-modal" {showAddModal} {addModalInputValue} />
{/if} 
