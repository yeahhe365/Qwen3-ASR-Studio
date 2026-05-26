export const downloadFile = (source: Blob | string, fileName: string) => {
  const isObjectUrl = typeof source !== 'string';
  const url = isObjectUrl ? URL.createObjectURL(source) : source;
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  if (isObjectUrl) {
    URL.revokeObjectURL(url);
  }
};
