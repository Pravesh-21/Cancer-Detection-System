export const SUPPORTED_FILE_EXTENSIONS = [
  ".dcm",
  ".jpg",
  ".jpeg",
  ".png",
  ".tiff",
  ".tif",
] as const;

export const SUPPORTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/tiff",
  "application/dicom",
] as const;

export const ACCEPT_FILE_ATTR = SUPPORTED_FILE_EXTENSIONS.join(",");

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export const DEFAULT_VIEWPORT_SETTINGS = {
  brightness: 100,
  contrast: 100,
  zoom: 1,
  invert: false,
};
