/**
 * Image Validation Utility
 * 
 * Validates uploaded files are genuine images by checking:
 * 1. Magic bytes (file signature) — rejects non-image files regardless of extension
 * 2. Minimum dimensions — rejects tiny/placeholder images
 * 3. Maximum file size — prevents oversized uploads
 * 4. Decodability — ensures the image can actually be processed by sharp
 */

import sharp from "sharp";

/** Supported image formats and their magic byte signatures */
const IMAGE_SIGNATURES: Array<{ format: string; bytes: number[]; offset?: number }> = [
  // JPEG: FF D8 FF
  { format: "jpeg", bytes: [0xFF, 0xD8, 0xFF] },
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  { format: "png", bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] },
  // WebP: RIFF....WEBP (bytes 0-3 = RIFF, bytes 8-11 = WEBP)
  { format: "webp", bytes: [0x52, 0x49, 0x46, 0x46] },
  // GIF: GIF87a or GIF89a
  { format: "gif", bytes: [0x47, 0x49, 0x46, 0x38] },
  // BMP: BM
  { format: "bmp", bytes: [0x42, 0x4D] },
  // TIFF (little-endian): II
  { format: "tiff", bytes: [0x49, 0x49, 0x2A, 0x00] },
  // TIFF (big-endian): MM
  { format: "tiff", bytes: [0x4D, 0x4D, 0x00, 0x2A] },
];

export interface ValidationResult {
  valid: boolean;
  format?: string;
  width?: number;
  height?: number;
  error?: string;
  fileSize?: number;
}

export interface ValidationOptions {
  /** Minimum width in pixels. Default: 100 */
  minWidth?: number;
  /** Minimum height in pixels. Default: 100 */
  minHeight?: number;
  /** Maximum file size in bytes. Default: 10MB */
  maxFileSize?: number;
  /** Allowed formats. Default: ["jpeg", "png", "webp"] */
  allowedFormats?: string[];
}

const DEFAULT_OPTIONS: Required<ValidationOptions> = {
  minWidth: 100,
  minHeight: 100,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedFormats: ["jpeg", "png", "webp"],
};

/**
 * Check if a buffer starts with known image magic bytes.
 * This is the first line of defense against non-image files.
 */
function checkMagicBytes(buffer: Buffer): { isImage: boolean; format: string | null } {
  for (const sig of IMAGE_SIGNATURES) {
    const offset = sig.offset ?? 0;
    if (buffer.length < offset + sig.bytes.length) continue;

    let matches = true;
    for (let i = 0; i < sig.bytes.length; i++) {
      if (buffer[offset + i] !== sig.bytes[i]) {
        matches = false;
        break;
      }
    }
    if (matches) {
      // Additional check for WebP: verify bytes 8-11 are "WEBP"
      if (sig.format === "webp") {
        if (buffer.length >= 12 &&
            buffer[8] === 0x57 && buffer[9] === 0x45 &&
            buffer[10] === 0x42 && buffer[11] === 0x50) {
          return { isImage: true, format: "webp" };
        }
        continue; // RIFF but not WebP
      }
      return { isImage: true, format: sig.format };
    }
  }
  return { isImage: false, format: null };
}

/**
 * Fully validate an image buffer before upload.
 * Checks magic bytes, file size, dimensions, and decodability.
 */
export async function validateImage(
  buffer: Buffer,
  options: ValidationOptions = {}
): Promise<ValidationResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // 1. Check file size
  if (buffer.length > opts.maxFileSize) {
    return {
      valid: false,
      fileSize: buffer.length,
      error: `File too large: ${(buffer.length / 1024 / 1024).toFixed(1)}MB exceeds ${(opts.maxFileSize / 1024 / 1024).toFixed(0)}MB limit`,
    };
  }

  if (buffer.length < 100) {
    return {
      valid: false,
      fileSize: buffer.length,
      error: "File too small to be a valid image (< 100 bytes)",
    };
  }

  // 2. Check magic bytes
  const { isImage, format } = checkMagicBytes(buffer);
  if (!isImage || !format) {
    // Show first few bytes for debugging
    const hex = buffer.slice(0, 8).toString("hex").match(/.{2}/g)?.join(" ") ?? "";
    return {
      valid: false,
      fileSize: buffer.length,
      error: `Not a valid image file. Magic bytes: [${hex}]. Expected JPEG (FF D8 FF), PNG (89 50 4E 47), or WebP (52 49 46 46...57 45 42 50).`,
    };
  }

  // 3. Check allowed formats
  if (!opts.allowedFormats.includes(format)) {
    return {
      valid: false,
      format,
      fileSize: buffer.length,
      error: `Format "${format}" not allowed. Accepted: ${opts.allowedFormats.join(", ")}`,
    };
  }

  // 4. Try to decode with sharp and check dimensions
  try {
    const metadata = await sharp(buffer).metadata();
    const { width, height } = metadata;

    if (!width || !height) {
      return {
        valid: false,
        format,
        fileSize: buffer.length,
        error: "Cannot determine image dimensions — file may be corrupted",
      };
    }

    if (width < opts.minWidth || height < opts.minHeight) {
      return {
        valid: false,
        format,
        width,
        height,
        fileSize: buffer.length,
        error: `Image too small: ${width}x${height}px. Minimum: ${opts.minWidth}x${opts.minHeight}px`,
      };
    }

    return {
      valid: true,
      format,
      width,
      height,
      fileSize: buffer.length,
    };
  } catch (err: any) {
    return {
      valid: false,
      format,
      fileSize: buffer.length,
      error: `Image is corrupted or unreadable: ${err.message || "decode failed"}`,
    };
  }
}

/**
 * Validate an image from a URL (fetches and checks).
 * Used in the processPhoto flow before smart-cropping.
 */
export async function validateImageUrl(
  url: string,
  options: ValidationOptions = {}
): Promise<ValidationResult> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) {
      return {
        valid: false,
        error: `Failed to fetch image: HTTP ${response.status} ${response.statusText}`,
      };
    }

    const contentType = response.headers.get("content-type") || "";
    // Quick pre-check: reject obviously non-image content types
    if (contentType && !contentType.startsWith("image/") && !contentType.includes("octet-stream")) {
      return {
        valid: false,
        error: `URL returned non-image content type: ${contentType}`,
      };
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    return validateImage(buffer, options);
  } catch (err: any) {
    return {
      valid: false,
      error: `Failed to fetch/validate image: ${err.message || "unknown error"}`,
    };
  }
}
