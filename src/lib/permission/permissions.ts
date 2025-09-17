import { USER_PERMISSIONS } from './bitmask.js';

// 权限选项配置
export interface PermissionOption {
	permission: number;
	labelKey: string;
	descriptionKey: string;
}

// 权限选项列表
export const PERMISSION_OPTIONS = [
	{
		permission: USER_PERMISSIONS.LIGHT,
		labelKey: 'administrator.manage_users.permission_modal.permission_options.light.label',
		descriptionKey: 'administrator.manage_users.permission_modal.permission_options.light.description'
	},
	{
		permission: USER_PERMISSIONS.CAMERA,
		labelKey: 'administrator.manage_users.permission_modal.permission_options.camera.label',
		descriptionKey: 'administrator.manage_users.permission_modal.permission_options.camera.description'
	},
	{
		permission: USER_PERMISSIONS.LENS,
		labelKey: 'administrator.manage_users.permission_modal.permission_options.lens.label',
		descriptionKey: 'administrator.manage_users.permission_modal.permission_options.lens.description'
	},
	{
		permission: USER_PERMISSIONS.ADMINISTRATOR,
		labelKey: 'administrator.manage_users.permission_modal.permission_options.administrator.label',
		descriptionKey: 'administrator.manage_users.permission_modal.permission_options.administrator.description'
	}
] as const;

// 权限相关的本地化键
export const PERMISSION_I18N_KEYS = {
	modal: {
		title: 'administrator.manage_users.permission_modal.title',
		userInfo: 'administrator.manage_users.permission_modal.user_info',
		buttons: {
			cancel: 'administrator.manage_users.permission_modal.buttons.cancel',
			update: 'administrator.manage_users.permission_modal.buttons.update',
			updating: 'administrator.manage_users.permission_modal.buttons.updating'
		},
		errors: {
			failedToUpdate: 'administrator.manage_users.permission_modal.errors.failed_to_update',
			networkError: 'administrator.manage_users.permission_modal.errors.network_error'
		},
		permissionOptions: {
			administrator: {
				cannotModifyOwn: 'administrator.manage_users.permission_modal.permission_options.administrator.cannot_modify_own'
			}
		}
	},
	permissions: {
		none: 'administrator.manage_users.permissions.none'
	}
} as const;
