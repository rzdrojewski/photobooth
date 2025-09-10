import React, { useMemo, useState } from 'react';

type State = 'Idle' | 'Camera' | 'Select' | 'Review' | 'Uploading' | 'QR';

export default function App() {
  const [state, setState] = useState<State>('Idle');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [camError, setCamError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  const apiBase = (import.meta.env.VITE_SERVER_BASE_URL as string | undefined) || '';
  const publicBase =
    (import.meta.env.VITE_PUBLIC_BASE_URL as string | undefined) ||
    (import.meta.env.VITE_SERVER_BASE_URL as string | undefined) ||
    'http://localhost:3000';
  const eventId = (import.meta.env.VITE_EVENT_ID as string | undefined) || 'default-event';
  const overlayUrl = (import.meta.env.VITE_OVERLAY_URL as string | undefined) || '';

  function start() {
    setState('Select');
    setFile(null);
    setPreview(null);
    setSlug(null);
  }

  async function startCamera() {
    setCamError(null);
    setState('Camera');
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
      setStream(s);
      const v = videoRef.current;
      if (v) {
        v.srcObject = s;
        await v.play().catch(() => {});
      }
    } catch (e: any) {
      console.error(e);
      setCamError(e?.message || 'Accès caméra refusé');
    }
  }

  function stopCamera() {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setState('Review');
  }

  async function snapFromCamera() {
    if (!videoRef.current) return;
    // Optional countdown 3..2..1
    for (let i = 3; i >= 1; i--) {
      setCountdown(i);
      await new Promise(r => setTimeout(r, 700));
    }
    setCountdown(null);
    const blob = await captureVideoFrame(videoRef.current);
    const f = new File([blob], `webcam_${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });
    setFile(f);
    setPreview(URL.createObjectURL(f));
    stopCamera();
    setState('Review');
  }

  async function snapFromDSLR() {
    // Optional countdown 3..2..1
    for (let i = 3; i >= 1; i--) {
      setCountdown(i);
      await new Promise(r => setTimeout(r, 700));
    }
    setCountdown(null);
    try {
      const r = await fetch(`${apiBase}/api/capture-gphoto` || '/api/capture-gphoto', { method: 'POST' });
      if (!r.ok) throw new Error('capture failed');
      const blob = await r.blob();
      const f = new File([blob], `dslr_${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });
      setFile(f);
      setPreview(URL.createObjectURL(f));
      setState('Review');
    } catch (e) {
      console.error(e);
      alert('Capture reflex échouée');
    }
  }

  async function upload() {
    if (!file) return;
    setState('Uploading');
    try {
      // Optionnel: appliquer overlay en canvas si overlayUrl défini
      const toUpload = overlayUrl ? await applyOverlayCanvas(preview!, overlayUrl) : file;
      const filename = `photo_${Date.now()}.${toUpload.type.includes('png') ? 'png' : 'jpg'}`;
      const mimeType = toUpload.type || 'image/jpeg';

      const presignRes = await fetch(`${apiBase}/api/presign` || '/api/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, mimeType, eventId })
      }).then(r => r.json());

      if (presignRes.mode === 's3') {
        await fetch(presignRes.url, { method: 'PUT', headers: { 'Content-Type': mimeType }, body: toUpload });
      } else {
        const form = new FormData();
        form.append('uploadToken', presignRes.uploadToken);
        form.append('file', toUpload, filename);
        const r = await fetch(`${apiBase}/api/upload-local` || '/api/upload-local', { method: 'POST', body: form });
        if (!r.ok) throw new Error('upload-local failed');
      }

      await fetch(`${apiBase}/api/photo/commit` || '/api/photo/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, filename, mimeType, storageKey: presignRes.key, qrSlug: presignRes.qrSlug })
      });

      setSlug(presignRes.qrSlug);
      setState('QR');
    } catch (e) {
      console.error(e);
      alert('Echec upload');
      setState('Review');
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', fontFamily: 'system-ui' }}>
      {state === 'Idle' && (
        <div style={{ textAlign: 'center' }}>
          <h1>Photobooth Client</h1>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={start} style={btn}>Choisir une image</button>
            <button onClick={startCamera} style={btn}>Ouvrir la caméra</button>
            <button onClick={snapFromDSLR} style={btn}>Prendre avec reflex</button>
          </div>
        </div>
      )}
      {state === 'Camera' && (
        <div style={{ textAlign: 'center' }}>
          <h2>Caméra</h2>
          {camError && <p style={{ color: 'crimson' }}>{camError}</p>}
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <video ref={videoRef} autoPlay playsInline muted style={{ maxWidth: '90vw', maxHeight: '70vh', background: '#000', borderRadius: 8 }} />
            {countdown !== null && (
              <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 96, background: 'rgba(0,0,0,0.2)' }}>{countdown}</div>
            )}
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={snapFromCamera} style={btn}>Prendre la photo</button>
            <button onClick={() => { stopCamera(); setState('Idle'); }} style={btn}>Retour</button>
          </div>
        </div>
      )}
      {state === 'Select' && (
        <div style={{ textAlign: 'center' }}>
          <h2>Choisissez une photo</h2>
          <input type="file" accept="image/*" onChange={onPick} />
        </div>
      )}
      {state === 'Review' && (
        <div style={{ textAlign: 'center' }}>
          {preview && <img src={preview} style={{ maxWidth: '90vw', maxHeight: '70vh', borderRadius: 8 }} />}
          <div style={{ marginTop: 16, display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={upload} style={btn}>Uploader</button>
            <button onClick={() => setState('Select')} style={btn}>Reprendre</button>
          </div>
        </div>
      )}
      {state === 'Uploading' && <h2>Upload…</h2>}
      {state === 'QR' && (
        <div style={{ textAlign: 'center' }}>
          <h2>QR de téléchargement</h2>
          {slug && <img src={`${apiBase}/api/qr/${slug}` || `/api/qr/${slug}`} style={{ background: '#fff', padding: 8 }} />}
          <div style={{ marginTop: 12 }}>
            {slug && (<a href={`${publicBase}/p/${slug}`} target="_blank" rel="noreferrer">Ouvrir la page</a>)}
          </div>
          <div style={{ marginTop: 16 }}>
            <button onClick={() => setState('Idle')} style={btn}>Terminer</button>
          </div>
        </div>
      )}
    </div>
  );
}

const btn: React.CSSProperties = { fontSize: 18, padding: '10px 16px', cursor: 'pointer' };

async function applyOverlayCanvas(imageUrl: string, overlayUrl: string): Promise<Blob> {
  const img = await loadImage(imageUrl);
  const overlay = await loadImage(overlayUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  ctx.drawImage(overlay, 0, 0, canvas.width, canvas.height);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', 0.9);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = src;
  });
}

async function captureVideoFrame(video: HTMLVideoElement): Promise<Blob> {
  const w = video.videoWidth || 1280;
  const h = video.videoHeight || 720;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(video, 0, 0, w, h);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', 0.92);
  });
}
