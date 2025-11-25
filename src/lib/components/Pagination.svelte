<!--
  @fileoverview Pagination Component
  
  Provides a reusable pagination component with customizable items per page,
  page navigation, and total item count display.
  
  @author Bobby Sun
  @version 1.0.0
-->

<script lang="ts">
	import Icon from '@iconify/svelte';
	import * as m from '$lib/paraglide/messages.js';
	import Dropdown from './Dropdown.svelte';
	import { ITEMS_PER_PAGE_OPTIONS } from '$lib/constants';

	interface PaginationProps {
		currentPage: number;
		totalItems: number;
		itemsPerPage: number;
		itemsPerPageOptions?: number[];
		dropdownPosition?: 'top' | 'bottom';
		storageKey?: string; // localStorage key for persisting itemsPerPage
		onPageChange?: (page: number) => void;
		onItemsPerPageChange?: (itemsPerPage: number) => void;
	}

	let {
		currentPage = $bindable(1),
		totalItems = 0,
		itemsPerPage = $bindable(5),
		itemsPerPageOptions = ITEMS_PER_PAGE_OPTIONS,
		dropdownPosition = 'bottom',
		storageKey,
		onPageChange = (page: number) => {},
		onItemsPerPageChange = (itemsPerPage: number) => {}
	}: PaginationProps = $props();

	$effect(() => {
		if (storageKey && typeof window !== 'undefined') {
			// 当每页显示个数改变时保存到 localStorage
			localStorage.setItem(storageKey, itemsPerPage.toString());
		}
	});

	// 计算总页数
	function getTotalPages(): number {
		return Math.ceil(totalItems / itemsPerPage);
	}

	// 页码相关函数
	function goToPage(page: number) {
		const total = getTotalPages();
		if (page >= 1 && page <= total) {
			currentPage = page;
			onPageChange(page);
		}
	}

	function previousPage() {
		if (currentPage > 1) {
			currentPage--;
			onPageChange(currentPage);
		}
	}

	function nextPage() {
		const total = getTotalPages();
		if (currentPage < total) {
			currentPage++;
			onPageChange(currentPage);
		}
	}

	// 生成页码数组用于显示
	function getPageNumbers(): number[] {
		const pages: number[] = [];
		const showPages = 5; // 显示5个页码按钮
		const total = getTotalPages();

		if (total <= showPages) {
			// 如果总页数少于等于显示页数，显示所有页码
			for (let i = 1; i <= total; i++) {
				pages.push(i);
			}
		} else {
			// 计算起始和结束页码
			let start = Math.max(1, currentPage - Math.floor(showPages / 2));
			let end = Math.min(total, start + showPages - 1);

			// 如果结束页码已经到最后一页，调整起始页码
			if (end - start < showPages - 1) {
				start = Math.max(1, end - showPages + 1);
			}

			for (let i = start; i <= end; i++) {
				pages.push(i);
			}
		}

		return pages;
	}

	// 处理每页数量变化
	function handleItemsPerPageChange(newItemsPerPage: string) {
		itemsPerPage = Number(newItemsPerPage);
		const total = getTotalPages();
		// 如果当前页超出范围，调整页码
		if (currentPage > total && total > 0) {
			currentPage = total;
		}
		onItemsPerPageChange(itemsPerPage);
	}

	// 为 Dropdown 准备选项
	let itemsPerPageDropdownOptions = $derived(
		itemsPerPageOptions.map((opt) => ({
			value: opt.toString(),
			label: opt.toString()
		}))
	);

	let itemsPerPageValue = $derived(itemsPerPage.toString());

	// 当总数变化时，调整页码
	$effect(() => {
		const total = getTotalPages();
		if (currentPage > total && total > 0) {
			currentPage = total;
		}
	});
</script>

{#if totalItems > 0}
	<!-- Pagination Controls -->
	<div
		class="flex items-center justify-center space-x-6 overflow-visible {dropdownPosition === 'top'
			? 'border-t border-gray-200 dark:border-gray-700 pt-4'
			: 'border-b border-gray-200 dark:border-gray-700 pb-4'}"
	>
		<!-- Pagination buttons -->
		{#if getTotalPages() > 1}
			<div class="flex items-center space-x-2">
				<!-- Previous button -->
				<button
					onclick={previousPage}
					disabled={currentPage === 1}
					class="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 hover:border-gray-400 dark:hover:bg-gray-700 dark:hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
					title={m['administrator.manage_users.pagination.previous']()}
				>
					<Icon icon="mdi:chevron-left" class="w-4 h-4" />
				</button>

				<!-- Page number buttons -->
				{#each getPageNumbers() as pageNum}
					<button
						onclick={() => goToPage(pageNum)}
						class="px-3 py-1.5 min-w-[40px] border rounded-md text-sm font-medium transition-colors duration-200 {currentPage ===
						pageNum
							? 'bg-blue-600 text-white border-blue-600 dark:bg-blue-500 dark:text-white dark:border-blue-500'
							: 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 hover:border-gray-400 dark:hover:bg-gray-700 dark:hover:border-gray-500'}"
					>
						{pageNum}
					</button>
				{/each}

				<!-- Next button -->
				<button
					onclick={nextPage}
					disabled={currentPage === getTotalPages()}
					class="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 hover:border-gray-400 dark:hover:bg-gray-700 dark:hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
					title={m['administrator.manage_users.pagination.next']()}
				>
					<Icon icon="mdi:chevron-right" class="w-4 h-4" />
				</button>
			</div>
		{/if}

		<!-- Items per page selector -->
		<div class="flex items-center space-x-2">
			<span class="text-sm text-gray-600 dark:text-gray-400">
				{m['administrator.manage_users.pagination.total']()}
				{totalItems}
				{m['administrator.manage_users.pagination.items']()}
			</span>
			<span class="text-sm text-gray-700 dark:text-gray-300">
				{m['administrator.manage_users.pagination.items_per_page']()}
			</span>
			<Dropdown
				value={itemsPerPageValue}
				options={itemsPerPageDropdownOptions}
				placeholder=""
				widthClass="w-20"
				{dropdownPosition}
				onchange={(v) => handleItemsPerPageChange(v)}
			/>
		</div>
	</div>
{/if}
