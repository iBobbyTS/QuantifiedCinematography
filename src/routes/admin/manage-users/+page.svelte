<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import * as m from '$lib/paraglide/messages.js';
	import Icon from '@iconify/svelte';
	import type { PageData } from './$types';
	import Navbar from '$lib/components/Navbar.svelte';
	import { USER_PERMISSIONS, UserPermissions } from '$lib/permission/bitmask.js';
	import { PERMISSION_OPTIONS, PERMISSION_I18N_KEYS } from '$lib/permission/permissions.js';
	import ConfirmModal from '$lib/components/Modal/ConfirmModal.svelte';
	import ToastManager from '$lib/components/Toast/ToastManager.svelte';
	import Pagination from '$lib/components/Pagination.svelte';
	import CheckboxFilter from '$lib/components/Filter/CheckboxFilter.svelte';

	let { data }: { data: PageData } = $props();

	// 用户数据 - 创建可修改的本地副本
	let users = $state(data.users);
	let totalUsers = $state(data.users.length); // 总用户数，用于分页组件
	
	// localStorage key for this page
	const STORAGE_KEY = 'manage-users-items-per-page';
	
	// 初始化时从 localStorage 读取每页显示个数
	let initialItemsPerPage = 5;
	if (typeof window !== 'undefined') {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved) {
			const savedValue = parseInt(saved);
			if ([2, 5, 10].includes(savedValue)) {
				initialItemsPerPage = savedValue;
			}
		}
	}
	
	// 分页状态
	let currentPage = $state(1);
	let itemsPerPage = $state(initialItemsPerPage);
	const itemsPerPageOptions = [2, 5, 10];
	
	// 排序状态
	let sortField = $state('status'); // 默认按状态排序
	let sortDirection = $state<'asc' | 'desc'>('asc'); // 默认升序
	
	// 过滤状态
	let searchQuery = $state('');
	let selectedStatuses = $state(['enabled', 'disabled']); // 默认全选
	let selectedPermissions = $state<string[]>([]); // 默认全不选
	let permissionMatchMode = $state<'any' | 'all'>('any'); // 权限匹配模式：'any' 或 'all'
	let searchTimeout: ReturnType<typeof setTimeout> | null = null;

	// 过滤选项数据
	const statusOptions = [
		{ value: 'enabled', label: m['administrator.manage_users.table.enabled']() },
		{ value: 'disabled', label: m['administrator.manage_users.table.disabled']() }
	];

	const permissionOptions = [
		{ value: 'none', label: '无权限' },
		{ value: 'light', label: '灯光' },
		{ value: 'camera', label: '相机' },
		{ value: 'lens', label: '镜头' },
		{ value: 'admin', label: '管理员' }
	];

	// 搜索防抖函数
	function handleSearchInput(event: Event) {
		const target = event.target as HTMLInputElement;
		searchQuery = target.value;
		
		// 清除之前的定时器
		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}
		
		// 设置新的定时器，0.5秒后触发搜索
		searchTimeout = setTimeout(() => {
			triggerFilter();
		}, 500);
	}

	// 状态过滤器变化处理
	function handleStatusChange(event: CustomEvent<(string | number)[]>) {
		selectedStatuses = event.detail as string[];
		triggerFilter();
	}

	// 权限过滤器变化处理
	function handlePermissionChange(event: CustomEvent<(string | number)[]>) {
		const newPermissions = event.detail as string[];
		
		// 处理互斥逻辑：无权限不能与其他权限同时选择
		if (newPermissions.includes('none')) {
			// 如果选择了"无权限"，清除其他权限选择
			selectedPermissions = ['none'];
		} else {
			// 如果选择了其他权限，清除"无权限"选择
			selectedPermissions = newPermissions.filter(p => p !== 'none');
		}
		
		triggerFilter();
	}

	// 权限匹配模式变化处理
	function handlePermissionMatchModeChange(event: CustomEvent<'any' | 'all'>) {
		permissionMatchMode = event.detail;
		triggerFilter();
	}

	// 排序处理函数
	function handleSort(field: string) {
		if (sortField === field) {
			// 如果点击的是当前排序字段，切换排序方向
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			// 如果点击的是新字段，设置为升序
			sortField = field;
			sortDirection = 'asc';
		}
		
		// 排序后切换到第一页
		currentPage = 1;
		
		// 触发过滤（包含排序）
		triggerFilter();
	}

	// 获取排序后的用户数据
	function getSortedUsers() {
		const sortedUsers = [...users].sort((a, b) => {
			let aValue: any;
			let bValue: any;
			
			switch (sortField) {
				case 'status':
					// 状态排序：enabled < disabled
					aValue = a.disabled ? 1 : 0;
					bValue = b.disabled ? 1 : 0;
					break;
				case 'permission':
					// 权限排序：按权限值排序
					aValue = a.permission;
					bValue = b.permission;
					break;
				case 'username':
					aValue = a.username.toLowerCase();
					bValue = b.username.toLowerCase();
					break;
				case 'nickname':
					aValue = (a.nickname || '').toLowerCase();
					bValue = (b.nickname || '').toLowerCase();
					break;
				case 'email':
					aValue = (a.email || '').toLowerCase();
					bValue = (b.email || '').toLowerCase();
					break;
				default:
					return 0;
			}
			
			if (aValue < bValue) {
				return sortDirection === 'asc' ? -1 : 1;
			}
			if (aValue > bValue) {
				return sortDirection === 'asc' ? 1 : -1;
			}
			return 0;
		});
		
		return sortedUsers;
	}

	// 收集所有过滤条件并准备API请求数据
	function collectFilterData() {
		const filterData = {
			search: searchQuery.trim() || null, // 空字符串时不包含此条件
			status: selectedStatuses.length > 0 ? selectedStatuses : null, // 空数组时不包含此条件
			permissions: selectedPermissions.length > 0 ? selectedPermissions : null, // 空数组时不包含此条件
			permissionMatchMode: permissionMatchMode, // 权限匹配模式
			sort: {
				field: sortField,
				direction: sortDirection
			},
			pagination: {
				page: currentPage,
				limit: itemsPerPage
			}
		};

		// 移除null值，减少请求数据量
		const cleanedFilterData = Object.fromEntries(
			Object.entries(filterData).filter(([_, value]) => value !== null)
		);

		return cleanedFilterData;
	}

	// 统一的过滤触发函数
	async function triggerFilter() {
		const filterData = collectFilterData();
		console.log('Filter data:', filterData);
		
		try {
			const response = await fetch('/api/admin/users/filter', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(filterData)
			});
			
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			
			const result = await response.json();
			
			if (result.success) {
				users = result.users;
				// 更新分页信息
				if (result.pagination) {
					totalUsers = result.pagination.total;
					console.log('Pagination info:', result.pagination);
				}
			} else {
				console.error('Filter request failed:', result.error);
			}
		} catch (error) {
			console.error('Filter request failed:', error);
		}
	}
	
	// 计算分页后的用户列表
	let paginatedUsers = $derived(() => {
		const startIndex = (currentPage - 1) * itemsPerPage;
		const endIndex = startIndex + itemsPerPage;
		return users.slice(startIndex, endIndex);
	});
	
	// 当 data.users 变化时更新本地副本
	$effect(() => {
		users = [...data.users];
	});

	// 弹窗状态
	let showPermissionModal = $state(false);
	let selectedUser: any = $state(null);
	let originalPermissions: number = $state(0);
	let currentPermissions: number = $state(0);
	let isPermissionModalLoading = $state(false);
	let permissionModalErrorMessage = $state('');
	let isPermissionModalInitialized = $state(false);

	// 删除确认弹窗状态
	let showDeleteConfirm = $state(false);
	let userToDelete: any = $state(null);
	let isDeleting = $state(false);
	
	// 重置密码确认弹窗状态
	let showResetPasswordConfirm = $state(false);
	let userToResetPassword: any = $state(null);
	let isResettingPassword = $state(false);
	
	// 密码显示弹窗状态
	let showPasswordModal = $state(false);
	let generatedPassword = $state('');
	let resetUsername = $state('');
	
	// Toast 管理器引用
	let toastManager: ToastManager;

	// 检查编辑对象是否是当前用户
	let isEditingCurrentUser = $derived(selectedUser && $page.data.user && selectedUser.id === $page.data.user.id);

	// 检查指定用户是否是当前用户
	function isCurrentUser(userId: string): boolean {
		return $page.data.user && userId === $page.data.user.id;
	}

	// 响应式声明：当 originalPermissions 变化时重新初始化
	$effect(() => {
		if (originalPermissions !== undefined && !isPermissionModalInitialized) {
			currentPermissions = originalPermissions;
			isPermissionModalInitialized = true;
		}
	});

	// 检查权限是否有变化
	let hasPermissionChanges = $derived(currentPermissions !== originalPermissions);

	// 权限显示函数 - 使用国际化函数，响应语言变化
	function getPermissionText(permission: number): string {
		const permissionNames: string[] = [];
		
		if (UserPermissions.hasLightPermission(permission)) {
			permissionNames.push(m[PERMISSION_OPTIONS[0].labelKey]());
		}
		if (UserPermissions.hasCameraPermission(permission)) {
			permissionNames.push(m[PERMISSION_OPTIONS[1].labelKey]());
		}
		if (UserPermissions.hasLensPermission(permission)) {
			permissionNames.push(m[PERMISSION_OPTIONS[2].labelKey]());
		}
		if (UserPermissions.hasAdministratorPermission(permission)) {
			permissionNames.push(m[PERMISSION_OPTIONS[3].labelKey]());
		}
		
		return permissionNames.length > 0 ? permissionNames.join(', ') : m[PERMISSION_I18N_KEYS.permissions.none]();
	}

	// 添加用户
	function addUser() {
		goto('/admin/add-user');
	}

	// 打开权限修改弹窗
	function openPermissionModal(user: any) {
		selectedUser = user;
		originalPermissions = user.permission;
		currentPermissions = user.permission;
		isPermissionModalInitialized = false;
		permissionModalErrorMessage = '';
		showPermissionModal = true;
	}

	// 关闭权限修改弹窗
	function closePermissionModal() {
		showPermissionModal = false;
		selectedUser = null;
		originalPermissions = 0;
		currentPermissions = 0;
		isPermissionModalInitialized = false;
		permissionModalErrorMessage = '';
	}

	// 检查权限是否被选中
	function isPermissionSelected(permission: number): boolean {
		return (currentPermissions & permission) !== 0;
	}

	// 切换权限选择
	function togglePermission(permission: number) {
		let newPermissions: number;
		
		if (permission === USER_PERMISSIONS.ADMINISTRATOR) {
			// Administrator 权限可以与其他权限组合
			if (isPermissionSelected(permission)) {
				newPermissions = currentPermissions & ~permission;
			} else {
				newPermissions = currentPermissions | permission;
			}
		} else {
			// 其他权限可以组合
			if (isPermissionSelected(permission)) {
				newPermissions = currentPermissions & ~permission;
			} else {
				newPermissions = currentPermissions | permission;
			}
		}
		
		// 更新权限并立即计算变化状态
		currentPermissions = newPermissions;
	}

	// 提交权限修改
	async function submitPermissions() {
		if (!hasPermissionChanges) return;

		isPermissionModalLoading = true;
		permissionModalErrorMessage = '';

		try {
			const formData = new FormData();
			formData.set('userId', selectedUser.id);
			formData.set('permissions', currentPermissions.toString());

			const response = await fetch('?/changePermission', {
				method: 'POST',
				body: formData
			});

			if (response.ok) {
				// 解析 action envelope
				let success = false;
				let errorMessage = 'Failed to update permissions';
				try {
					const envelope = await response.json();
					console.log('Change permission response:', envelope);
					
					if (envelope?.type === 'failure') {
						success = false;
						// 处理错误消息
						if (envelope.data && typeof envelope.data === 'object' && envelope.data.message) {
							errorMessage = envelope.data.message;
						} else if (Array.isArray(envelope.data) && envelope.data.length > 0) {
							errorMessage = envelope.data[envelope.data.length - 1];
						} else if (typeof envelope.data === 'string') {
							try {
								const parsedData = JSON.parse(envelope.data);
								if (Array.isArray(parsedData) && parsedData.length > 0) {
									errorMessage = parsedData[parsedData.length - 1];
								}
							} catch (e) {
								errorMessage = envelope.data;
							}
						}
					} else if (envelope?.type === 'success') {
						success = true;
					}
				} catch (e) {
					console.error('Error parsing response:', e);
				}

				if (success) {
					// 更新 users 数组中对应的用户权限
					const userIndex = users.findIndex(u => u.id === selectedUser.id);
					if (userIndex !== -1) {
						users[userIndex].permission = currentPermissions;
					}
					closePermissionModal();
				} else {
					permissionModalErrorMessage = errorMessage;
				}
			} else {
				// 非 2xx 响应
				let msg = 'Failed to update permissions';
				try {
					const data = await response.json();
					msg = data?.message || msg;
				} catch {}
				permissionModalErrorMessage = msg;
			}
		} catch (error) {
			console.error('Error updating permissions:', error);
			permissionModalErrorMessage = m[PERMISSION_I18N_KEYS.modal.errors.networkError]();
		} finally {
			isPermissionModalLoading = false;
		}
	}

	// 关闭权限弹窗
	function handlePermissionModalClose() {
		if (!isPermissionModalLoading) {
			closePermissionModal();
		}
	}

	// 点击背景关闭弹窗
	function handlePermissionModalBackgroundClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			handlePermissionModalClose();
		}
	}

	// 权限修改成功后的回调（保留兼容性）
	function onPermissionChanged(newPermissions: number) {
		if (selectedUser) {
			// 更新 users 数组中对应的用户权限
			const userIndex = users.findIndex(u => u.id === selectedUser.id);
			if (userIndex !== -1) {
				users[userIndex].permission = newPermissions;
			}
		}
		closePermissionModal();
	}

	// 禁用用户
	async function disableUser(user: any) {
		const isCurrentlyDisabled = user.disabled === 1;
		const actionText = isCurrentlyDisabled ? 'enable' : 'disable';
		
		if (confirm(m['administrator.manage_users.confirmations.disable_user']())) {
			try {
				const fd = new FormData();
				fd.set('userId', user.id);
				fd.set('disabled', (!isCurrentlyDisabled).toString());
				
				const response = await fetch('?/disableUser', {
					method: 'POST',
					body: fd
				});

				if (response.ok) {
					// 解析 action envelope
					let ok = true;
					let errorMessage = `Failed to ${actionText} user`;
					try {
						const envelope = await response.json();
						if (envelope?.type === 'failure') {
							ok = false;
							// SvelteKit fail() 返回的错误消息在 data 字段中
							if (envelope.data && typeof envelope.data === 'object' && envelope.data.message) {
								errorMessage = envelope.data.message;
							} else if (Array.isArray(envelope.data) && envelope.data.length > 0) {
								// 处理数组格式的错误消息
								errorMessage = envelope.data[envelope.data.length - 1];
							} else if (typeof envelope.data === 'string') {
								// 处理字符串化的JSON数组格式
								try {
									const parsedData = JSON.parse(envelope.data);
									if (Array.isArray(parsedData) && parsedData.length > 0) {
										errorMessage = parsedData[parsedData.length - 1];
									}
								} catch (e) {
									// 如果解析失败，使用原始字符串
									errorMessage = envelope.data;
								}
							}
						} else if (envelope?.type === 'success') {
							ok = true;
						}
					} catch {}
					
					if (ok) {
						// 更新本地用户状态
						const userIndex = users.findIndex(u => u.id === user.id);
						if (userIndex !== -1) {
							users[userIndex].disabled = isCurrentlyDisabled ? 0 : 1;
						}
						
						// 显示成功 Toast
						toastManager.showToast({
							title: m['administrator.manage_users.notifications.disable_success.title'](),
							message: m['administrator.manage_users.notifications.disable_success.message']({ 
								username: user.username,
								action: isCurrentlyDisabled ? 'enabled' : 'disabled'
							}),
							iconName: 'mdi:check-circle',
							iconColor: 'text-green-500',
							duration: 3000,
							showCountdown: true
						});
						return;
					} else {
						// 处理 SvelteKit 服务器动作失败
						toastManager.showToast({
							title: m['administrator.manage_users.notifications.disable_failure.title'](),
							message: m['administrator.manage_users.notifications.disable_failure.message']({ 
								username: user.username, 
								error: errorMessage 
							}),
							iconName: 'mdi:alert-circle',
							iconColor: 'text-red-500',
							duration: 5000,
							showCountdown: true
						});
						return;
					}
				}
				// 非 2xx 响应
				let msg = `Failed to ${actionText} user`;
				try {
					const data = await response.json();
					msg = data?.message || msg;
				} catch {}
				// 显示错误 Toast
				toastManager.showToast({
					title: m['administrator.manage_users.notifications.disable_failure.title'](),
					message: m['administrator.manage_users.notifications.disable_failure.message']({ 
						username: user.username, 
						error: msg 
					}),
					iconName: 'mdi:alert-circle',
					iconColor: 'text-red-500',
					duration: 5000,
					showCountdown: true
				});
			} catch (error) {
				console.error('Error updating user disable status:', error);
				// 显示网络错误 Toast
				toastManager.showToast({
					title: m['administrator.manage_users.notifications.disable_failure.title'](),
					message: m['administrator.manage_users.notifications.disable_failure.message']({ 
						username: user.username, 
						error: 'Network error occurred while updating user status' 
					}),
					iconName: 'mdi:alert-circle',
					iconColor: 'text-red-500',
					duration: 5000,
					showCountdown: true
				});
			}
		}
	}

	// 打开删除确认弹窗
	function openDeleteConfirm(user: any) {
		userToDelete = user;
		showDeleteConfirm = true;
	}

	// 关闭删除确认弹窗
	function closeDeleteConfirm() {
		showDeleteConfirm = false;
		userToDelete = null;
	}

	// 打开重置密码确认弹窗
	function openResetPasswordConfirm(user: any) {
		userToResetPassword = user;
		showResetPasswordConfirm = true;
	}

	// 关闭重置密码确认弹窗
	function closeResetPasswordConfirm() {
		showResetPasswordConfirm = false;
		userToResetPassword = null;
	}

	// 关闭密码显示弹窗
	function closePasswordModal() {
		showPasswordModal = false;
		generatedPassword = '';
		resetUsername = '';
	}

	// 复制密码
	function copyPassword() {
		navigator.clipboard.writeText(generatedPassword);
	}

	// 确认重置密码
	async function confirmResetPassword() {
		if (!userToResetPassword) return;

		isResettingPassword = true;

		try {
			const response = await fetch('/api/admin/user/reset-password', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					userId: userToResetPassword.id
				})
			});

			if (response.ok) {
				const data = await response.json();
				generatedPassword = data.password;
				resetUsername = userToResetPassword.username;
				
				// 关闭确认弹窗，打开密码显示弹窗
				closeResetPasswordConfirm();
				showPasswordModal = true;
			} else {
				const errorData = await response.json();
				const errorMessage = errorData.message || 'Failed to reset password';
				
				// 显示错误 Toast
				toastManager.showToast({
					title: m['administrator.manage_users.notifications.reset_password_failure.title'](),
					message: m['administrator.manage_users.notifications.reset_password_failure.message']({ 
						username: userToResetPassword.username, 
						error: errorMessage 
					}),
					iconName: 'mdi:alert-circle',
					iconColor: 'text-red-500',
					duration: 5000,
					showCountdown: true
				});
			}
		} catch (error) {
			console.error('Error resetting password:', error);
			// 显示网络错误 Toast
			toastManager.showToast({
				title: m['administrator.manage_users.notifications.reset_password_failure.title'](),
				message: m['administrator.manage_users.notifications.reset_password_failure.message']({ 
					username: userToResetPassword.username, 
					error: 'Network error occurred while resetting password' 
				}),
				iconName: 'mdi:alert-circle',
				iconColor: 'text-red-500',
				duration: 5000,
				showCountdown: true
			});
		} finally {
			isResettingPassword = false;
		}
	}

	// 确认删除用户
	async function confirmDeleteUser() {
		if (!userToDelete) return;

		isDeleting = true;

		try {
			const fd = new FormData();
			fd.set('userId', String(userToDelete.id));
			const response = await fetch('?/deleteUser', {
				method: 'POST',
				body: fd
			});

			if (response.ok) {
				// 解析 action envelope
				let ok = true;
				let errorMessage = 'Failed to delete user';
				try {
					const envelope = await response.json();
					if (envelope?.type === 'failure') {
						ok = false;
						// SvelteKit fail() 返回的错误消息在 data 字段中
						if (envelope.data && typeof envelope.data === 'object' && envelope.data.message) {
							errorMessage = envelope.data.message;
						} else if (Array.isArray(envelope.data) && envelope.data.length > 0) {
							// 处理数组格式的错误消息
							errorMessage = envelope.data[envelope.data.length - 1];
						} else if (typeof envelope.data === 'string') {
							// 处理字符串化的JSON数组格式
							try {
								const parsedData = JSON.parse(envelope.data);
								if (Array.isArray(parsedData) && parsedData.length > 0) {
									errorMessage = parsedData[parsedData.length - 1];
								}
							} catch (e) {
								// 如果解析失败，使用原始字符串
								errorMessage = envelope.data;
							}
						}
					} else if (envelope?.type === 'success') {
						ok = true;
					}
				} catch {}
				
				if (ok) {
					const userIndex = users.findIndex(u => u.id === userToDelete.id);
					if (userIndex !== -1) {
						users.splice(userIndex, 1);
					}
					
					// 在关闭确认弹窗前保存用户名
					const deletedUsername = userToDelete.username;
					closeDeleteConfirm();
					
					// 显示成功 Toast
					toastManager.showToast({
						title: m['administrator.manage_users.notifications.delete_success.title'](),
						message: m['administrator.manage_users.notifications.delete_success.message']({ username: deletedUsername }),
						iconName: 'mdi:check-circle',
						iconColor: 'text-green-500',
						duration: 3000,
						showCountdown: true
					});
					return;
				} else {
					// 处理 SvelteKit 服务器动作失败
					const failedUsername = userToDelete?.username || 'Unknown';
					toastManager.showToast({
						title: m['administrator.manage_users.notifications.delete_failure.title'](),
						message: m['administrator.manage_users.notifications.delete_failure.message']({ 
							username: failedUsername, 
							error: errorMessage 
						}),
						iconName: 'mdi:alert-circle',
						iconColor: 'text-red-500',
						duration: 5000,
						showCountdown: true
					});
					return;
				}
			}
			// 非 2xx 响应
			let msg = 'Failed to delete user';
			try {
				const data = await response.json();
				msg = data?.message || msg;
			} catch {}
			// 显示错误 Toast 而不是 alert
			const failedUsername = userToDelete?.username || 'Unknown';
			toastManager.showToast({
				title: m['administrator.manage_users.notifications.delete_failure.title'](),
				message: m['administrator.manage_users.notifications.delete_failure.message']({ 
					username: failedUsername, 
					error: msg 
				}),
				iconName: 'mdi:alert-circle',
				iconColor: 'text-red-500',
				duration: 5000,
				showCountdown: true
			});
		} catch (error) {
			console.error('Error deleting user:', error);
			// 显示网络错误 Toast 而不是 alert
			const networkFailedUsername = userToDelete?.username || 'Unknown';
			toastManager.showToast({
				title: m['administrator.manage_users.notifications.delete_failure.title'](),
				message: m['administrator.manage_users.notifications.delete_failure.message']({ 
					username: networkFailedUsername, 
					error: 'Network error occurred while deleting user' 
				}),
				iconName: 'mdi:alert-circle',
				iconColor: 'text-red-500',
				duration: 5000,
				showCountdown: true
			});
		} finally {
			isDeleting = false;
		}
	}

</script>

<svelte:head>
	<title>{m['administrator.manage_users.title']()} - {m['app.title']()}</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16">
	<!-- Navbar -->
	<Navbar centerTitle="app.title" showBackButton={true} />
	
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<!-- Header -->
		<div class="mb-8">
			<div class="flex items-center justify-between">
				<div>
					<h1 class="text-3xl font-bold text-gray-900 dark:text-white">
						{m['administrator.manage_users.title']()}
					</h1>
					<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
						{m['administrator.manage_users.subtitle']()}
					</p>
				</div>
				<button
					onclick={addUser}
					class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-500 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400 dark:hover:border-blue-500"
				>
					<Icon icon="mdi:plus" class="w-4 h-4 mr-2" />
					{m['administrator.manage_users.add_user']()}
				</button>
			</div>
		</div>

		<!-- Filter Table -->
		<div class="bg-white dark:bg-gray-800 shadow sm:rounded-md mb-4">
			<div class="px-4 py-5 sm:p-6">
				<!-- 过滤条件表格 -->
				<div class="overflow-hidden">
					<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
						<tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
							<!-- 第一行：模糊搜索 -->
							<tr>
								<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white w-20">
									模糊搜索
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<input
										id="search-input"
										type="text"
										placeholder="用户名、昵称、邮箱"
										class="w-1/2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
										oninput={handleSearchInput}
									/>
								</td>
							</tr>
							
							<!-- 第二行：状态过滤 -->
							<tr>
								<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white w-20">
									状态
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="flex flex-wrap gap-3">
										{#each statusOptions as option}
											<label class="flex items-center gap-2 cursor-pointer">
												<input
													type="checkbox"
													class="checkbox checkbox-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
													bind:group={selectedStatuses}
													value={option.value}
													onchange={() => handleStatusChange({ detail: selectedStatuses } as CustomEvent)}
												/>
												<span class="text-sm text-gray-700 dark:text-gray-300">{option.label}</span>
											</label>
										{/each}
									</div>
								</td>
							</tr>
							
							<!-- 第三行：权限过滤 -->
							<tr>
								<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white w-20">
									权限
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="space-y-3">
										<!-- All/Any 切换 -->
										<div class="flex items-center gap-3">
											<div class="btn-group">
												<button
													type="button"
													class="btn btn-sm {permissionMatchMode === 'any' 
														? 'btn-active bg-blue-600 dark:bg-blue-500 text-white dark:text-white border-blue-600 dark:border-blue-500 shadow-md dark:shadow-blue-500/25' 
														: 'btn-outline text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300'} transition-all duration-200"
													onclick={() => { permissionMatchMode = 'any'; handlePermissionMatchModeChange({ detail: 'any' } as CustomEvent); }}
												>
													{m['administrator.manage_users.permission_modal.filter.any']()}
												</button>
												<button
													type="button"
													class="btn btn-sm {permissionMatchMode === 'all' 
														? 'btn-active bg-blue-600 dark:bg-blue-500 text-white dark:text-white border-blue-600 dark:border-blue-500 shadow-md dark:shadow-blue-500/25' 
														: 'btn-outline text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300'} transition-all duration-200"
													onclick={() => { permissionMatchMode = 'all'; handlePermissionMatchModeChange({ detail: 'all' } as CustomEvent); }}
												>
													{m['administrator.manage_users.permission_modal.filter.all']()}
												</button>
											</div>
										</div>
										
										<!-- 权限选项 -->
										<div class="flex flex-wrap gap-3">
											{#each permissionOptions as option}
												<label class="flex items-center gap-2 cursor-pointer">
													<input
														type="checkbox"
														class="checkbox checkbox-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
														bind:group={selectedPermissions}
														value={option.value}
														onchange={() => handlePermissionChange({ detail: selectedPermissions } as CustomEvent)}
													/>
													<span class="text-sm text-gray-700 dark:text-gray-300">{option.label}</span>
												</label>
											{/each}
										</div>
									</div>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</div>

		<!-- Top Pagination Component -->
		{#if totalUsers > 0}
			<Pagination
				bind:currentPage={currentPage}
				bind:itemsPerPage={itemsPerPage}
				totalItems={totalUsers}
				storageKey={STORAGE_KEY}
				itemsPerPageOptions={itemsPerPageOptions}
				dropdownPosition="bottom"
			/>
		{/if}

		<!-- Users Table -->
		<div class="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
			<div class="px-4 py-5 sm:p-6">
				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
						<thead class="bg-gray-50 dark:bg-gray-700">
							<tr>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors" onclick={() => handleSort('username')}>
									<div class="flex items-center gap-1">
										{m['administrator.manage_users.table.username']()}
										{#if sortField === 'username'}
											<Icon icon={sortDirection === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'} class="w-3 h-3" />
										{:else}
											<Icon icon="mdi:unfold-more-horizontal" class="w-3 h-3 opacity-50" />
										{/if}
									</div>
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors" onclick={() => handleSort('nickname')}>
									<div class="flex items-center gap-1">
										{m['administrator.manage_users.table.nickname']()}
										{#if sortField === 'nickname'}
											<Icon icon={sortDirection === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'} class="w-3 h-3" />
										{:else}
											<Icon icon="mdi:unfold-more-horizontal" class="w-3 h-3 opacity-50" />
										{/if}
									</div>
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors" onclick={() => handleSort('email')}>
									<div class="flex items-center gap-1">
										{m['administrator.manage_users.table.email']()}
										{#if sortField === 'email'}
											<Icon icon={sortDirection === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'} class="w-3 h-3" />
										{:else}
											<Icon icon="mdi:unfold-more-horizontal" class="w-3 h-3 opacity-50" />
										{/if}
									</div>
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors" onclick={() => handleSort('permission')}>
									<div class="flex items-center gap-1">
										{m['administrator.manage_users.table.permissions']()}
										{#if sortField === 'permission'}
											<Icon icon={sortDirection === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'} class="w-3 h-3" />
										{:else}
											<Icon icon="mdi:unfold-more-horizontal" class="w-3 h-3 opacity-50" />
										{/if}
									</div>
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors" onclick={() => handleSort('status')}>
									<div class="flex items-center gap-1">
										{m['administrator.manage_users.table.status']()}
										{#if sortField === 'status'}
											<Icon icon={sortDirection === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'} class="w-3 h-3" />
										{:else}
											<Icon icon="mdi:unfold-more-horizontal" class="w-3 h-3 opacity-50" />
										{/if}
									</div>
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
									{m['administrator.manage_users.table.actions']()}
								</th>
							</tr>
						</thead>
						<tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
							{#each paginatedUsers() as user}
								<tr>
									<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
										{user.username}
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
										{user.nickname}
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
										{user.email}
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
										<button
											onclick={() => openPermissionModal(user)}
											class="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors duration-200 cursor-pointer"
										>
											{getPermissionText(user.permission)}
											<Icon icon="mdi:pencil" class="w-3 h-3 ml-1" />
										</button>
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
										<button
											onclick={() => disableUser(user)}
											disabled={isCurrentUser(user.id)}
											class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 {user.disabled === 1 ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800'}"
											title={isCurrentUser(user.id) ? m['administrator.manage_users.actions.cannot_disable_self']() : (user.disabled === 1 ? m['administrator.manage_users.actions.enable_user']() : m['administrator.manage_users.actions.disable_user']())}
										>
											<Icon icon={user.disabled === 1 ? "mdi:account-off" : "mdi:account-check"} class="w-3 h-3 mr-1" />
											{user.disabled === 1 ? m['administrator.manage_users.table.disabled']() : m['administrator.manage_users.table.enabled']()}
										</button>
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700 dark:text-gray-200">
										<div class="flex space-x-2">
											<button
												onclick={() => openResetPasswordConfirm(user)}
												class="p-2 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20"
												title={m['administrator.manage_users.actions.reset_password']()}
											>
												<Icon icon="mdi:key" class="w-5 h-5" />
											</button>
											<button
												onclick={() => openDeleteConfirm(user)}
												disabled={isCurrentUser(user.id)}
												class="p-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-200 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-red-600 dark:disabled:hover:text-red-400"
												title={isCurrentUser(user.id) ? m['administrator.manage_users.actions.cannot_delete_self']() : m['administrator.manage_users.actions.delete_user']()}
											>
												<Icon icon="mdi:delete" class="w-5 h-5" />
											</button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				{#if users.length === 0}
					<div class="text-center py-12">
						<Icon icon="mdi:account-group" class="mx-auto h-12 w-12 text-gray-400" />
					<h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">{m['administrator.manage_users.empty_state.title']()}</h3>
						<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
						{m['administrator.manage_users.empty_state.description']()}
						</p>
						<div class="mt-6">
							<button
								onclick={addUser}
								class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-500 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400 dark:hover:border-blue-500"
							>
								<Icon icon="mdi:plus" class="w-4 h-4 mr-2" />
							{m['administrator.manage_users.add_user']()}
							</button>
						</div>
					</div>
				{/if}
			</div>
		</div>
		
		<!-- Pagination Component - Outside table container to allow dropdown to show -->
		{#if totalUsers > 0}
			<Pagination
				bind:currentPage={currentPage}
				bind:itemsPerPage={itemsPerPage}
				totalItems={totalUsers}
				storageKey={STORAGE_KEY}
				itemsPerPageOptions={itemsPerPageOptions}
				dropdownPosition="top"
			/>
		{/if}
	</div>
</div>

<!-- Permission Modal -->
{#if showPermissionModal && selectedUser}
	<!-- Modal Backdrop -->
	<div 
		class="fixed inset-0 bg-gray-900/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
		onclick={handlePermissionModalBackgroundClick}
		onkeydown={(e) => e.key === 'Escape' && handlePermissionModalClose()}
		role="dialog"
		aria-modal="true"
		aria-labelledby="permission-modal-title"
		tabindex="-1"
	>
		<!-- Modal Content -->
		<div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
			<!-- Header -->
			<div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
				<div class="flex items-center justify-between">
					<h3 id="permission-modal-title" class="text-lg font-medium text-gray-900 dark:text-white">
						{m[PERMISSION_I18N_KEYS.modal.title]()}
					</h3>
					<button
						onclick={handlePermissionModalClose}
						disabled={isPermissionModalLoading}
						class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
					>
						<Icon icon="mdi:close" class="w-5 h-5" />
					</button>
				</div>
				<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
					{m[PERMISSION_I18N_KEYS.modal.userInfo]({ nickname: selectedUser.nickname, username: selectedUser.username })}
				</p>
			</div>

			<!-- Body -->
			<div class="px-6 py-4">
				{#if permissionModalErrorMessage}
					<div class="mb-4 rounded-md bg-red-50 dark:bg-red-900/20 p-3">
						<div class="flex">
							<Icon icon="mdi:alert-circle" class="h-5 w-5 text-red-400" />
							<p class="ml-2 text-sm text-red-800 dark:text-red-200">
								{permissionModalErrorMessage}
							</p>
						</div>
					</div>
				{/if}

				<div class="space-y-3">
					{#each PERMISSION_OPTIONS as option}
						<label class="flex items-start space-x-3 cursor-pointer">
							<input
								type="checkbox"
								checked={isPermissionSelected(option.permission)}
								onchange={() => togglePermission(option.permission)}
								disabled={isPermissionModalLoading || (isEditingCurrentUser && option.permission === USER_PERMISSIONS.ADMINISTRATOR)}
								class="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
							/>
							<div class="flex-1">
								<div class="text-sm font-medium text-gray-900 dark:text-white">
									{m[option.labelKey]()}
									{#if isEditingCurrentUser && option.permission === USER_PERMISSIONS.ADMINISTRATOR}
										<span class="text-xs text-gray-500 dark:text-gray-400 ml-1">{m[PERMISSION_I18N_KEYS.modal.permissionOptions.administrator.cannotModifyOwn]()}</span>
									{/if}
								</div>
								<div class="text-xs text-gray-500 dark:text-gray-400">
									{m[option.descriptionKey]()}
								</div>
							</div>
						</label>
					{/each}
				</div>
			</div>

			<!-- Footer -->
			<div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
				<button
					onclick={handlePermissionModalClose}
					disabled={isPermissionModalLoading}
					class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 hover:border-gray-200 dark:hover:bg-gray-600 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
				>
					{m[PERMISSION_I18N_KEYS.modal.buttons.cancel]()}
				</button>
				<button
					onclick={submitPermissions}
					disabled={!hasPermissionChanges || isPermissionModalLoading}
					class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-400 dark:hover:border-blue-500"
				>
					{#if isPermissionModalLoading}
						<Icon icon="mdi:loading" class="animate-spin -ml-1 mr-2 h-4 w-4" />
						{m[PERMISSION_I18N_KEYS.modal.buttons.updating]()}
					{:else}
						{m[PERMISSION_I18N_KEYS.modal.buttons.update]()}
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Delete Confirmation Modal -->
<ConfirmModal
	bind:isOpen={showDeleteConfirm}
	title={m['administrator.manage_users.confirmations.delete_user_title']()}
	message={userToDelete ? m['administrator.manage_users.confirmations.delete_user_message']({ username: userToDelete.username, nickname: userToDelete.nickname }) : ''}
	confirmText={m['administrator.manage_users.confirmations.delete_confirm']()}
	cancelText={m['administrator.manage_users.confirmations.delete_cancel']()}
	confirmButtonColor="bg-red-600 hover:bg-red-700"
	iconName="mdi:delete-alert"
	iconColor="text-red-500"
	on:confirm={confirmDeleteUser}
	on:cancel={closeDeleteConfirm}
/>

<!-- Reset Password Confirmation Modal -->
{#if showResetPasswordConfirm && userToResetPassword}
	<!-- Modal Backdrop -->
	<div 
		class="fixed inset-0 bg-gray-900/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
		onclick={(e) => e.target === e.currentTarget && closeResetPasswordConfirm()}
		onkeydown={(e) => e.key === 'Escape' && closeResetPasswordConfirm()}
		role="dialog"
		aria-modal="true"
		aria-labelledby="reset-password-modal-title"
		tabindex="-1"
	>
		<!-- Modal Content -->
		<div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-700">
			<!-- Header -->
			<div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
				<div class="flex items-center space-x-3">
					<Icon icon="mdi:key" class="w-6 h-6 text-blue-500" />
					<h3 id="reset-password-modal-title" class="text-lg font-medium text-gray-900 dark:text-white">
						{m['administrator.manage_users.confirmations.reset_password_title']()}
					</h3>
				</div>
			</div>

			<!-- Body -->
			<div class="px-6 py-4">
				<p class="text-sm text-gray-600 dark:text-gray-400">
					{m['administrator.manage_users.confirmations.reset_password_message']({ username: userToResetPassword.username, nickname: userToResetPassword.nickname })}
				</p>
			</div>

			<!-- Footer -->
			<div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
				<button
					onclick={closeResetPasswordConfirm}
					disabled={isResettingPassword}
					class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 hover:border-gray-200 dark:hover:bg-gray-600 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
				>
					{m['administrator.manage_users.confirmations.reset_password_cancel']()}
				</button>
				<button
					onclick={confirmResetPassword}
					disabled={isResettingPassword}
					class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-400 dark:hover:border-blue-500"
				>
					{#if isResettingPassword}
						<Icon icon="mdi:loading" class="animate-spin -ml-1 mr-2 h-4 w-4" />
						{m['administrator.manage_users.confirmations.reset_password_confirm_loading']()}
					{:else}
						{m['administrator.manage_users.confirmations.reset_password_confirm']()}
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Password Display Modal -->
{#if showPasswordModal}
	<!-- Modal Backdrop -->
	<div 
		class="fixed inset-0 bg-gray-900/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
		onclick={(e) => e.target === e.currentTarget && closePasswordModal()}
		onkeydown={(e) => e.key === 'Escape' && closePasswordModal()}
		role="dialog"
		aria-modal="true"
		aria-labelledby="password-modal-title"
		tabindex="-1"
	>
		<!-- Modal Content -->
		<div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-700">
			<!-- Header -->
			<div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
				<h3 id="password-modal-title" class="text-lg font-medium text-gray-900 dark:text-white">
					{m['administrator.manage_users.password_modal.title']()}
				</h3>
			</div>

			<!-- Body -->
			<div class="px-6 py-4">
				<div class="mb-4">
					<p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
						{m['administrator.manage_users.password_modal.description']({ username: resetUsername })}
					</p>
					<p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
						{m['administrator.manage_users.password_modal.password_warning']()}
					</p>
				</div>

				<div class="mb-4">
					<label for="generated-password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
						{m['administrator.manage_users.password_modal.password_label']()}
					</label>
					<div class="flex">
						<input
							id="generated-password"
							type="text"
							value={generatedPassword}
							readonly
							class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm font-mono"
						/>
						<button
							type="button"
							onclick={copyPassword}
							class="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-500 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium dark:bg-blue-500 dark:hover:bg-blue-400 dark:hover:border-blue-500"
						>
							{m['app.copy']()}
						</button>
					</div>
				</div>

				<div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
					<div class="flex">
						<Icon icon="mdi:alert" class="h-5 w-5 text-yellow-400" />
						<p class="ml-2 text-sm text-yellow-800 dark:text-yellow-200">
							{m['administrator.manage_users.password_modal.password_warning']()}
						</p>
					</div>
				</div>
			</div>

			<!-- Footer -->
			<div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
				<button
					onclick={closePasswordModal}
					class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400 dark:hover:border-blue-500"
				>
					{m['administrator.manage_users.password_modal.buttons.close']()}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Toast Manager -->
<ToastManager bind:this={toastManager} />
