export const downloadPng = (pngDataUrl: string, fileName: string): void => {
  try {
    const a = document.createElement('a');
    a.href = pngDataUrl;
    a.download = `${fileName}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (error) {
    console.error('Error downloading PNG:', error);
    alert('Failed to download PNG.');
  }
};

export const copyPngToClipboard = async (pngDataUrl: string): Promise<void> => {
  try {
    const response = await fetch(pngDataUrl);
    const blob = await response.blob();
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ]);
    alert('Icon copied to clipboard as PNG!');
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    alert('Failed to copy image to clipboard.');
  }
};

/**
 * Creates a .zip file from a list of files and initiates a download.
 * @param {Array<{name: string, dataUrl: string}>} files - The files to include in the zip.
 * @param {string} zipFileName - The name of the zip file to be downloaded.
 */
export const downloadZip = async (files: { name: string; dataUrl: string }[], zipFileName: string = 'archive.zip'): Promise<void> => {
  if (!window.JSZip) {
    throw new Error('JSZip library is not loaded. Cannot create zip file.');
  }

  const zip = new window.JSZip();

  files.forEach(file => {
    // Extract base64 data from the data URL (e.g., 'data:image/png;base64,iVBORw...')
    const base64Data = file.dataUrl.split(',')[1];
    // Sanitize the filename to be filesystem-friendly
    const safeName = file.name.replace(/[^a-z0-9-._]/gi, '_').toLowerCase();
    zip.file(`${safeName}.png`, base64Data, { base64: true });
  });

  const content = await zip.generateAsync({ type: 'blob' });

  const a = document.createElement('a');
  a.href = URL.createObjectURL(content);
  a.download = zipFileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
};