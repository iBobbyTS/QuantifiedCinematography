import { env } from '$env/dynamic/public';

// Number of items per page options
// Remove 2 and 5 in production
export const ITEMS_PER_PAGE_OPTIONS = [2, 5, 10, 20, 50, 100, 200];

// List of cinema camera brands, used for automaic cinema camera selection in add camera page. 
export const CINEMA_CAMERA_BRANDS = ['ARRI', '阿莱', 'RED', 'Blackmagic', 'ZCAM'];

// List of cinema camera model keywords, used for automaic cinema camera selection in add camera page. 
export const CINEMA_CAMERA_MODEL_KEYWORDS = {
    'Canon': ['C'],
    'Sony': ['FX', 'FS', 'Venice', 'CineAlta'],
    'DJI': ['Inspire', 'Ronin']
};

// Whether the project is currently under development
// Read from environment variable PUBLIC_PRODUCTION_ENVIRONMENT: "1" = true, "0" = false, default = false (development mode)
export const PRODUCTION_ENVIRONMENT = env.PUBLIC_PRODUCTION_ENVIRONMENT === '1';

// List of completed development modules
// data-provider-camera: Camera data upload module
// camera: Camera module
// data-provider-lighting: Lighting data upload module
// lighting: Lighting module
export const COMPLETED_MODULES: string[] = ['data-provider-camera', 'camera'];

