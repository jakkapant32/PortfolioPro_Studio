const MAX_EDGE = 1600;
const MAX_BYTES = 1.2 * 1024 * 1024;

export async function compressSlipImage(file) {
  if (!file || !file.type.startsWith('image/')) return file;
  if (file.size <= MAX_BYTES && file.type === 'image/jpeg') return file;

  const bitmap = await blobToImage(file);
  let width = bitmap.width;
  let height = bitmap.height;
  if (width > MAX_EDGE || height > MAX_EDGE) {
    const scale = MAX_EDGE / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  if (typeof bitmap.close === 'function') bitmap.close();

  let quality = 0.86;
  let blob = await canvasToBlob(canvas, quality);
  while (blob && blob.size > MAX_BYTES && quality > 0.5) {
    quality -= 0.12;
    blob = await canvasToBlob(canvas, quality);
  }
  if (!blob) return file;

  const name = (file.name || 'slip').replace(/\.[^.]+$/, '') + '.jpg';
  return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() });
}

function blobToImage(file) {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file);
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('ไม่สามารถอ่านไฟล์รูปได้'));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
  });
}
