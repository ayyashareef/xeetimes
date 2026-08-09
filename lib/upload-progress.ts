'use client';

// Uploading with progress needs XMLHttpRequest: fetch gives no visibility into
// how many bytes have gone out, and a video large enough to be worth a bar is
// exactly the case fetch cannot report on.
//
// Two phases are reported separately because they feel different to whoever is
// waiting. `sending` is the upload itself and has a real percentage. `working`
// is the server processing the file afterwards — for video that is an ffmpeg
// re-encode taking roughly 0.4x the clip's duration — and has no percentage to
// give, so the UI should show it as indeterminate rather than a stuck 100%.
export type UploadPhase = 'sending' | 'working';

export type UploadResult = { url?: string; mediaId?: string; kind?: string; error?: string };

export function uploadWithProgress(
  url: string,
  body: FormData,
  onProgress?: (percent: number, phase: UploadPhase) => void,
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);

    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      const pct = Math.round((e.loaded / e.total) * 100);
      // Hold at 99 until the response lands: the last byte being sent is not
      // the same as the job being done, and jumping to 100 while the server is
      // still encoding reads as a hang.
      onProgress?.(Math.min(99, pct), 'sending');
    };
    // Upload finished, response not yet in — the server is doing its work.
    xhr.upload.onload = () => onProgress?.(100, 'working');

    xhr.onload = () => {
      let data: UploadResult = {};
      try { data = JSON.parse(xhr.responseText); } catch { /* non-JSON error page */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      // 413 comes from nginx, not the app, so it has no JSON body to explain.
      else reject(new Error(data.error || (xhr.status === 413 ? 'File too large' : `Upload failed (${xhr.status})`)));
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.ontimeout = () => reject(new Error('Upload timed out'));
    // Watermarking a clip re-encodes it; nginx allows 300s for this route.
    xhr.timeout = 300_000;

    xhr.send(body);
  });
}
