import { describe, it, expect } from "vitest";
import { validateImage } from "./imageValidation";

describe("imageValidation", () => {
  it("rejects non-image data (plain text)", async () => {
    // Create a buffer > 100 bytes to bypass size check and hit magic bytes check
    const textBuffer = Buffer.alloc(200, 0x41); // 200 bytes of 'A'
    const result = await validateImage(textBuffer);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Not a valid image");
  });

  it("rejects XML/HTML data (like S3 error responses)", async () => {
    // S3 error responses are typically > 100 bytes
    const xmlBuffer = Buffer.from('<?xml version="1.0" encoding="UTF-8"?><Error><Code>AccessDenied</Code><Message>Access Denied for this resource request</Message></Error>');
    const result = await validateImage(xmlBuffer);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Not a valid image");
  });

  it("rejects files that are too small", async () => {
    const tinyBuffer = Buffer.from("tiny");
    const result = await validateImage(tinyBuffer);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("too small");
  });

  it("rejects oversized files", async () => {
    // Create a buffer that's larger than 10MB
    const result = await validateImage(Buffer.alloc(100), { maxFileSize: 50 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("too large");
  });

  it("accepts valid JPEG magic bytes with proper dimensions", async () => {
    // Create a minimal valid JPEG using sharp
    const sharp = (await import("sharp")).default;
    const validJpeg = await sharp({
      create: { width: 200, height: 200, channels: 3, background: { r: 128, g: 128, b: 128 } }
    }).jpeg().toBuffer();
    
    const result = await validateImage(validJpeg);
    expect(result.valid).toBe(true);
    expect(result.format).toBe("jpeg");
    expect(result.width).toBe(200);
    expect(result.height).toBe(200);
  });

  it("accepts valid PNG with proper dimensions", async () => {
    const sharp = (await import("sharp")).default;
    const validPng = await sharp({
      create: { width: 300, height: 300, channels: 4, background: { r: 0, g: 0, b: 255, alpha: 1 } }
    }).png().toBuffer();
    
    const result = await validateImage(validPng);
    expect(result.valid).toBe(true);
    expect(result.format).toBe("png");
  });

  it("rejects images below minimum dimensions", async () => {
    const sharp = (await import("sharp")).default;
    const tinyImage = await sharp({
      create: { width: 50, height: 50, channels: 3, background: { r: 128, g: 128, b: 128 } }
    }).jpeg().toBuffer();
    
    const result = await validateImage(tinyImage, { minWidth: 100, minHeight: 100 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("too small");
  });

  it("rejects disallowed formats", async () => {
    const sharp = (await import("sharp")).default;
    const gifBuffer = await sharp({
      create: { width: 200, height: 200, channels: 3, background: { r: 128, g: 128, b: 128 } }
    }).gif().toBuffer();
    
    const result = await validateImage(gifBuffer, { allowedFormats: ["jpeg", "png"] });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("not allowed");
  });
});
