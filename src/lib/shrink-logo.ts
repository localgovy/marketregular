const MAX_EDGE = 512;

/** Shrink a logo in the browser before upload. The server still checks type and size. */
export async function shrinkLogoFile(file: File) {
  if (!file.type.startsWith("image/") || typeof createImageBitmap !== "function") return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return file;
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], "logo.webp", { type: "image/webp" });
}

export async function shrinkLogoInput(input: HTMLInputElement) {
  const file = input.files?.[0];
  if (!file) return;
  const shrunk = await shrinkLogoFile(file);
  if (shrunk === file) return;
  const transfer = new DataTransfer();
  transfer.items.add(shrunk);
  input.files = transfer.files;
}
