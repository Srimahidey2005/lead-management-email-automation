/** Triggers a browser download of text content (client-side only). */
export function downloadTextFile(filename: string, content: string, mime = 'text/csv;charset=utf-8'): void {
  // BOM so Excel opens UTF-8 CSVs correctly.
  const blob = new Blob(['\uFEFF', content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
