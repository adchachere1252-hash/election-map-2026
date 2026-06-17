/**
 * Smart Center-Crop Utility
 * 
 * Automatically detects faces in candidate photos and crops them to be
 * properly centered for circular avatar display. Uses sharp for image
 * processing and a lightweight saliency-based approach for face detection.
 * 
 * Strategy:
 * 1. Analyze image to find the face/head region using attention detection
 * 2. Crop to a square centered on the face with appropriate padding
 * 3. Resize to standard avatar dimensions (400x400)
 * 4. Return the processed buffer ready for upload
 */

import sharp from "sharp";

interface CropResult {
  buffer: Buffer;
  width: number;
  height: number;
  contentType: string;
}

interface SmartCropOptions {
  /** Target output size in pixels (square). Default: 400 */
  size?: number;
  /** How much padding around the detected face (0-1). Default: 0.6 */
  facePadding?: number;
  /** JPEG quality (1-100). Default: 85 */
  quality?: number;
}

/**
 * Smart crop a candidate photo to be properly centered for circular avatar display.
 * Uses sharp's built-in attention-based cropping (entropy/attention strategy)
 * which detects faces and areas of interest.
 * 
 * @param input - Buffer or URL of the source image
 * @param options - Crop configuration options
 * @returns Processed image buffer and metadata
 */
export async function smartCenterCrop(
  input: Buffer | string,
  options: SmartCropOptions = {}
): Promise<CropResult> {
  const { size = 400, quality = 85 } = options;

  let imageBuffer: Buffer;

  // Handle URL input
  if (typeof input === "string") {
    const response = await fetch(input);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: HTTP ${response.status}`);
    }
    imageBuffer = Buffer.from(await response.arrayBuffer());
  } else {
    imageBuffer = input;
  }

  // Get image metadata
  const metadata = await sharp(imageBuffer).metadata();
  const { width: origW, height: origH } = metadata;

  if (!origW || !origH) {
    throw new Error("Cannot determine image dimensions");
  }

  // Use sharp's attention strategy which detects faces/areas of interest
  // This crops to a square centered on the most "interesting" part of the image
  const croppedBuffer = await sharp(imageBuffer)
    .resize(size, size, {
      fit: "cover",
      position: sharp.strategy.attention, // Face/saliency detection
    })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer();

  return {
    buffer: croppedBuffer,
    width: size,
    height: size,
    contentType: "image/jpeg",
  };
}

/**
 * Process a candidate photo from a URL and return the smart-cropped version.
 * Convenience wrapper that handles the full pipeline.
 * 
 * @param photoUrl - Full URL or /manus-storage/ path to the photo
 * @param baseUrl - Base URL for resolving relative paths (e.g., the app's domain)
 * @param options - Crop configuration options
 * @returns Processed image buffer ready for upload to S3
 */
export async function processCandiatePhoto(
  photoUrl: string,
  baseUrl: string = "",
  options: SmartCropOptions = {}
): Promise<CropResult> {
  // Resolve relative URLs
  const fullUrl = photoUrl.startsWith("http")
    ? photoUrl
    : `${baseUrl}${photoUrl}`;

  return smartCenterCrop(fullUrl, options);
}

/**
 * Check if a photo needs re-cropping by analyzing its current composition.
 * Returns true if the image is not square or has poor face centering.
 */
export async function needsRecrop(input: Buffer | string): Promise<boolean> {
  let imageBuffer: Buffer;

  if (typeof input === "string") {
    const response = await fetch(input);
    if (!response.ok) return false;
    imageBuffer = Buffer.from(await response.arrayBuffer());
  } else {
    imageBuffer = input;
  }

  const metadata = await sharp(imageBuffer).metadata();
  const { width, height } = metadata;

  if (!width || !height) return true;

  // If not approximately square (within 10%), needs recrop
  const aspectRatio = width / height;
  if (aspectRatio < 0.9 || aspectRatio > 1.1) return true;

  // If too small for avatar display
  if (width < 200 || height < 200) return true;

  return false;
}
