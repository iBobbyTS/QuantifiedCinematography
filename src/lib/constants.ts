// Number of items per page options
export const ITEMS_PER_PAGE_OPTIONS = [2, 5, 10, 20, 50];

// List of cinema camera brands, used for automaic cinema camera selection in add camera page. 
export const CINEMA_CAMERA_BRANDS = ['ARRI', '阿莱', 'RED', 'Blackmagic', 'ZCAM'];

// List of cinema camera model keywords, used for automaic cinema camera selection in add camera page. 
export const CINEMA_CAMERA_MODEL_KEYWORDS = {
    'Canon': ['C'],
    'Sony': ['FX', 'FS', 'Venice', 'CineAlta'],
    'DJI': ['Inspire', 'Ronin']
};

// Whether the project is currently under development
export const IS_DEVELOPING = false;

// List of completed development modules
// data-provider-camera: Camera data upload module
// camera: Camera module
// data-provider-lighting: Lighting data upload module
// lighting: Lighting module
export const COMPLETED_MODULES: string[] = ['data-provider-camera', 'camera'];

