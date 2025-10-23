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
