import React, { useState, useEffect, useRef, useCallback } from 'react';

export type AspectRatioType = '1:1' | 'free' | 'landscape';

interface ImageCropperModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string | null;
  title?: string;
  aspectRatio?: AspectRatioType;
  targetType?: 'favicon' | 'logo';
  onCropComplete: (blob: Blob, dataUrl: string) => Promise<void>;
}

export function ImageCropperModal({
  isOpen,
  onClose,
  imageSrc,
  title = 'Crop & Position Favicon',
  aspectRatio = '1:1',
  targetType = 'favicon',
  onCropComplete,
}: ImageCropperModalProps) {
  const [naturalDim, setNaturalDim] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [saving, setSaving] = useState<boolean>(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');

  // Crop box in normalized [0, 1] coordinates
  const [crop, setCrop] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 0.1,
    y: 0.1,
    width: 0.8,
    height: 0.8,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const isDraggingRef = useRef<boolean>(false);
  const dragHandleRef = useRef<'move' | 'nw' | 'ne' | 'se' | 'sw' | null>(null);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; crop: typeof crop }>({
    mouseX: 0,
    mouseY: 0,
    crop: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 },
  });

  // Reset and initialize crop box when new image is loaded
  useEffect(() => {
    if (!isOpen || !imageSrc) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    img.onload = () => {
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      setNaturalDim({ width: nw, height: nh });
      setZoom(1);

      if (aspectRatio === '1:1') {
        const minDim = Math.min(nw, nh);
        const wNorm = (minDim * 0.85) / nw;
        const hNorm = (minDim * 0.85) / nh;
        setCrop({
          x: (1 - wNorm) / 2,
          y: (1 - hNorm) / 2,
          width: wNorm,
          height: hNorm,
        });
      } else {
        setCrop({ x: 0.05, y: 0.1, width: 0.9, height: 0.8 });
      }
    };
  }, [isOpen, imageSrc, aspectRatio]);

  // Update live preview whenever crop coordinates or image changes
  const updatePreview = useCallback(() => {
    if (!imageRef.current || naturalDim.width === 0) return;
    const img = imageRef.current;

    const cropPxX = Math.round(crop.x * naturalDim.width);
    const cropPxY = Math.round(crop.y * naturalDim.height);
    const cropPxW = Math.max(1, Math.round(crop.width * naturalDim.width));
    const cropPxH = Math.max(1, Math.round(crop.height * naturalDim.height));

    const previewCanvas = document.createElement('canvas');
    previewCanvas.width = 128;
    previewCanvas.height = 128;
    const ctx = previewCanvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, cropPxX, cropPxY, cropPxW, cropPxH, 0, 0, 128, 128);
      setPreviewDataUrl(previewCanvas.toDataURL('image/png'));
    }
  }, [crop, naturalDim]);

  useEffect(() => {
    updatePreview();
  }, [updatePreview]);

  // Pointer drag start
  const handlePointerDown = (e: React.PointerEvent, handle: 'move' | 'nw' | 'ne' | 'se' | 'sw') => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = true;
    dragHandleRef.current = handle;
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      crop: { ...crop },
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  // Pointer drag move
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !containerRef.current || !imageRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    if (containerRect.width === 0 || containerRect.height === 0) return;

    const deltaNormX = (e.clientX - dragStartRef.current.mouseX) / containerRect.width;
    const deltaNormY = (e.clientY - dragStartRef.current.mouseY) / containerRect.height;
    const init = dragStartRef.current.crop;
    const handle = dragHandleRef.current;

    let newX = init.x;
    let newY = init.y;
    let newW = init.width;
    let newH = init.height;

    if (handle === 'move') {
      newX = Math.max(0, Math.min(1 - init.width, init.x + deltaNormX));
      newY = Math.max(0, Math.min(1 - init.height, init.y + deltaNormY));
    } else if (handle === 'se') {
      const delta = Math.max(deltaNormX, deltaNormY);
      if (aspectRatio === '1:1') {
        const aspectAdjust = naturalDim.width / naturalDim.height;
        newW = Math.max(0.1, Math.min(1 - init.x, init.width + delta));
        newH = Math.max(0.1, Math.min(1 - init.y, newW * aspectAdjust));
      } else {
        newW = Math.max(0.1, Math.min(1 - init.x, init.width + deltaNormX));
        newH = Math.max(0.1, Math.min(1 - init.y, init.height + deltaNormY));
      }
    } else if (handle === 'sw') {
      newX = Math.max(0, Math.min(init.x + init.width - 0.1, init.x + deltaNormX));
      newW = init.width - (newX - init.x);
      if (aspectRatio === '1:1') {
        const aspectAdjust = naturalDim.width / naturalDim.height;
        newH = Math.max(0.1, Math.min(1 - init.y, newW * aspectAdjust));
      } else {
        newH = Math.max(0.1, Math.min(1 - init.y, init.height + deltaNormY));
      }
    } else if (handle === 'ne') {
      newY = Math.max(0, Math.min(init.y + init.height - 0.1, init.y + deltaNormY));
      newH = init.height - (newY - init.y);
      if (aspectRatio === '1:1') {
        const aspectAdjust = naturalDim.height / naturalDim.width;
        newW = Math.max(0.1, Math.min(1 - init.x, newH * aspectAdjust));
      } else {
        newW = Math.max(0.1, Math.min(1 - init.x, init.width + deltaNormX));
      }
    } else if (handle === 'nw') {
      newX = Math.max(0, Math.min(init.x + init.width - 0.1, init.x + deltaNormX));
      newY = Math.max(0, Math.min(init.y + init.height - 0.1, init.y + deltaNormY));
      newW = init.width - (newX - init.x);
      newH = init.height - (newY - init.y);
      if (aspectRatio === '1:1') {
        const aspectAdjust = naturalDim.width / naturalDim.height;
        newH = newW * aspectAdjust;
      }
    }

    setCrop({
      x: Math.max(0, Math.min(1 - newW, newX)),
      y: Math.max(0, Math.min(1 - newH, newY)),
      width: Math.min(1, Math.max(0.05, newW)),
      height: Math.min(1, Math.max(0.05, newH)),
    });
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
    dragHandleRef.current = null;
  };

  // Center crop helper
  const handleCenter = () => {
    if (naturalDim.width === 0) return;
    const minDim = Math.min(naturalDim.width, naturalDim.height);
    const wNorm = (minDim * 0.8) / naturalDim.width;
    const hNorm = (minDim * 0.8) / naturalDim.height;
    setCrop({
      x: (1 - wNorm) / 2,
      y: (1 - hNorm) / 2,
      width: wNorm,
      height: hNorm,
    });
  };

  // Export cropped canvas
  const handleSaveCrop = async () => {
    if (!imageRef.current || naturalDim.width === 0) return;
    setSaving(true);
    try {
      const img = imageRef.current;
      const cropPxX = Math.round(crop.x * naturalDim.width);
      const cropPxY = Math.round(crop.y * naturalDim.height);
      const cropPxW = Math.max(1, Math.round(crop.width * naturalDim.width));
      const cropPxH = Math.max(1, Math.round(crop.height * naturalDim.height));

      // Favicons should ideally be exported at 512x512 for crispness
      const exportDim = targetType === 'favicon' ? Math.max(192, Math.min(512, cropPxW)) : cropPxW;
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = exportDim;
      exportCanvas.height = targetType === 'favicon' ? exportDim : cropPxH;

      const ctx = exportCanvas.getContext('2d');
      if (!ctx) throw new Error('Could not initialize canvas context');

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(
        img,
        cropPxX,
        cropPxY,
        cropPxW,
        cropPxH,
        0,
        0,
        exportCanvas.width,
        exportCanvas.height
      );

      const blob = await new Promise<Blob | null>((resolve) =>
        exportCanvas.toBlob((b) => resolve(b), 'image/png', 0.95)
      );

      if (!blob) throw new Error('Failed to generate image blob');

      const dataUrl = exportCanvas.toDataURL('image/png');
      await onCropComplete(blob, dataUrl);
      onClose();
    } catch (err: any) {
      alert(`Error saving cropped image: ${err.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !imageSrc) return null;

  const currentPxSize = Math.round(crop.width * naturalDim.width);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <span>✂️</span> {title}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Drag the crop box to center your icon. Previews update in real time.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 font-bold text-sm transition"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Cropper Stage (Left 7 cols) */}
          <div className="lg:col-span-7 flex flex-col items-center">
            <div
              ref={containerRef}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="relative w-full max-w-md aspect-square bg-slate-900 rounded-xl overflow-hidden shadow-inner flex items-center justify-center border-2 border-slate-200 select-none touch-none"
              style={{
                backgroundImage:
                  'radial-gradient(#1e293b 1px, transparent 1px), radial-gradient(#1e293b 1px, #0f172a 1px)',
                backgroundSize: '16px 16px',
              }}
            >
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Source to crop"
                crossOrigin="anonymous"
                className="w-full h-full object-contain pointer-events-none select-none transition-transform"
                style={{ transform: `scale(${zoom})` }}
              />

              {/* Darkened Mask outside crop box */}
              <div
                className="absolute inset-0 pointer-events-none bg-black/55"
                style={{
                  clipPath: `polygon(
                    0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
                    ${crop.x * 100}% ${crop.y * 100}%,
                    ${crop.x * 100}% ${(crop.y + crop.height) * 100}%,
                    ${(crop.x + crop.width) * 100}% ${(crop.y + crop.height) * 100}%,
                    ${(crop.x + crop.width) * 100}% ${crop.y * 100}%,
                    ${crop.x * 100}% ${crop.y * 100}%
                  )`,
                }}
              />

              {/* The Interactive Crop Box */}
              <div
                onPointerDown={(e) => handlePointerDown(e, 'move')}
                className="absolute border-2 border-blue-500 cursor-move shadow-[0_0_0_1px_rgba(255,255,255,0.8)]"
                style={{
                  left: `${crop.x * 100}%`,
                  top: `${crop.y * 100}%`,
                  width: `${crop.width * 100}%`,
                  height: `${crop.height * 100}%`,
                }}
              >
                {/* 3x3 Grid Lines */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-30">
                  <div className="border-r border-b border-white" />
                  <div className="border-r border-b border-white" />
                  <div className="border-b border-white" />
                  <div className="border-r border-b border-white" />
                  <div className="border-r border-b border-white" />
                  <div className="border-b border-white" />
                  <div className="border-r border-white" />
                  <div className="border-r border-white" />
                  <div />
                </div>

                {/* Corner Resize Handles */}
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'nw')}
                  className="absolute -top-2 -left-2 w-4 h-4 bg-blue-600 border-2 border-white rounded-full cursor-nwse-resize shadow-md"
                />
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'ne')}
                  className="absolute -top-2 -right-2 w-4 h-4 bg-blue-600 border-2 border-white rounded-full cursor-nesw-resize shadow-md"
                />
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'se')}
                  className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-600 border-2 border-white rounded-full cursor-nwse-resize shadow-md"
                />
                <div
                  onPointerDown={(e) => handlePointerDown(e, 'sw')}
                  className="absolute -bottom-2 -left-2 w-4 h-4 bg-blue-600 border-2 border-white rounded-full cursor-nesw-resize shadow-md"
                />
              </div>
            </div>

            {/* Quick Controls Under Image */}
            <div className="w-full max-w-md mt-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-xs text-slate-500 font-semibold shrink-0">🔍 Zoom:</span>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <span className="text-xs font-mono text-slate-600 w-10 text-right">{zoom.toFixed(1)}x</span>
              </div>
              <button
                type="button"
                onClick={handleCenter}
                className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                Center Box
              </button>
            </div>
          </div>

          {/* Real-time Previews & Requirements (Right 5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Live Preview in Real Environments
              </h4>

              {/* 1. Chrome Browser Tab Simulation */}
              <div className="bg-slate-100 rounded-xl p-3 border border-slate-200 mb-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Desktop Browser Tab
                </span>
                <div className="bg-slate-200/80 rounded-t-lg pt-1 px-2 flex items-center gap-2 border-b border-slate-300">
                  <div className="bg-white rounded-t-md px-3 py-1.5 flex items-center gap-2 shadow-sm max-w-[220px]">
                    {previewDataUrl ? (
                      <img src={previewDataUrl} alt="Favicon" className="w-4 h-4 object-contain rounded-sm shrink-0" />
                    ) : (
                      <div className="w-4 h-4 bg-slate-300 rounded-sm" />
                    )}
                    <span className="text-[11px] font-semibold text-slate-700 truncate">
                      GSTBro — GST Services
                    </span>
                    <span className="text-[10px] text-slate-400 ml-auto">✕</span>
                  </div>
                </div>
              </div>

              {/* 2. Google Search Result Snippet Simulation */}
              <div className="bg-slate-100 rounded-xl p-3 border border-slate-200 mb-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Google Search Snippet (Mobile &amp; Desktop)
                </span>
                <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm space-y-1">
                  <div className="flex items-center gap-2.5">
                    {previewDataUrl ? (
                      <img
                        src={previewDataUrl}
                        alt="Favicon"
                        className="w-7 h-7 rounded-full bg-slate-50 border border-slate-200 object-contain p-0.5 shrink-0"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-slate-200 shrink-0" />
                    )}
                    <div>
                      <span className="text-xs font-bold text-slate-900 block leading-tight">GSTBro</span>
                      <span className="text-[10px] text-slate-500 font-mono block leading-tight">
                        https://gstbro.com
                      </span>
                    </div>
                  </div>
                  <div className="text-xs font-medium text-blue-700 hover:underline pt-0.5">
                    GSTBro — Chartered Accountant GST Services India
                  </div>
                </div>
              </div>

              {/* 3. Multi-resolution Icon Grid */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex items-center justify-around">
                <div className="text-center">
                  <div className="w-12 h-12 bg-white rounded-lg border border-slate-200 flex items-center justify-center p-1 shadow-sm mx-auto mb-1">
                    {previewDataUrl && <img src={previewDataUrl} alt="48x48" className="w-full h-full object-contain" />}
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 font-semibold">48×48px</span>
                </div>
                <div className="text-center">
                  <div className="w-8 h-8 bg-white rounded-lg border border-slate-200 flex items-center justify-center p-0.5 shadow-sm mx-auto mb-1">
                    {previewDataUrl && <img src={previewDataUrl} alt="32x32" className="w-full h-full object-contain" />}
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 font-semibold">32×32px</span>
                </div>
                <div className="text-center">
                  <div className="w-6 h-6 bg-white rounded-md border border-slate-200 flex items-center justify-center p-0.5 shadow-sm mx-auto mb-1">
                    {previewDataUrl && <img src={previewDataUrl} alt="16x16" className="w-full h-full object-contain" />}
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 font-semibold">16×16px</span>
                </div>
              </div>
            </div>

            {/* Resolution Check Banner */}
            <div
              className={`rounded-xl p-3 text-[11px] border ${
                currentPxSize >= 48
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              <div className="font-bold flex items-center gap-1.5">
                <span>{currentPxSize >= 48 ? '✓' : '⚠️'}</span>
                Crop Resolution: {currentPxSize} × {currentPxSize} px
              </div>
              <p className="mt-0.5">
                {currentPxSize >= 48
                  ? 'Meets Google Search requirements (minimum 48×48px).'
                  : 'Warning: Google requires at least 48×48px. Please expand your crop box or use a higher-resolution image.'}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveCrop}
            disabled={saving || !previewDataUrl}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            {saving ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Cropping &amp; Saving...</span>
              </>
            ) : (
              <>
                <span>✂️</span>
                <span>Crop &amp; Save {targetType === 'favicon' ? 'Favicon' : 'Logo'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
