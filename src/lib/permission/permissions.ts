import { USER_PERMISSIONS } from './bitmask.js';

// 权限选项配置
export interface PermissionOption {
	permission: number;
	labelKey: string;
	descriptionKey: string;
}

// 权限选项列表
export const PERMISSION_OPTIONS: PermissionOption[] = [
	{
		permission: USER_PERMISSIONS.LIGHT,
		labelKey: 'testing.administrator.manage_users.permission_modal.permission_options.light.label',
		descriptionKey: 'testing.administrator.manage_users.permission_modal.permission_options.light.description'
	},
	{
		permission: USER_PERMISSIONS.CAMERA,
		labelKey: 'testing.administrator.manage_users.permission_modal.permission_options.camera.label',
		descriptionKey: 'testing.administrator.manage_users.permission_modal.permission_options.camera.description'
	},
	{
		permission: USER_PERMISSIONS.LENS,
		labelKey: 'testing.administrator.manage_users.permission_modal.permission_options.lens.label',
		descriptionKey: 'testing.administrator.manage_users.permission_modal.permission_options.lens.description'
	},
	{
		permission: USER_PERMISSIONS.ADMINISTRATOR,
		labelKey: 'testing.administrator.manage_users.permission_modal.permission_options.administrator.label',
		descriptionKey: 'testing.administrator.manage_users.permission_modal.permission_options.administrator.description'
	}
];

// 权限相关的本地化键
export const PERMISSION_I18N_KEYS = {
	modal: {
		title: 'testing.administrator.manage_users.permission_modal.title',
		userInfo: 'testing.administrator.manage_users.permission_modal.user_info',
		buttons: {
			cancel: 'testing.administrator.manage_users.permission_modal.buttons.cancel',
			update: 'testing.administrator.manage_users.permission_modal.buttons.update',
			updating: 'testing.administrator.manage_users.permission_modal.buttons.updating'
		},
		errors: {
			failedToUpdate: 'testing.administrator.manage_users.permission_modal.errors.failed_to_update',
			networkError: 'testing.administrator.manage_users.permission_modal.errors.network_error'
		},
		permissionOptions: {
			administrator: {
				cannotModifyOwn: 'testing.administrator.manage_users.permission_modal.permission_options.administrator.cannot_modify_own'
			}
		}
	},
	permissions: {
		none: 'testing.administrator.manage_users.permissions.none'
	}
} as const;
