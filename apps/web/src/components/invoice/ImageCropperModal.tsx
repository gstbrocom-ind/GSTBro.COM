import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export type AspectRatioPreset = 'free' | '1:1' | '3:1' | '4:1';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  // Either an image src or a File (PDF or Image)
  sourceFile?: File | null;
  initialImageSrc?: string | null;
  title?: string;
  defaultPreset?: AspectRatioPreset;
  onCropComplete: (croppedBlob: Blob, croppedDataUrl: string) => void | Promise<void>;
}

export function ImageCropperModal({
  isOpen,
  onClose,
  sourceFile,
  initialImageSrc,
  title = 'Crop & Position Asset',
  defaultPreset = 'free',
  onCropComplete,
}: Props) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('Loading document...');
  const [applying, setApplying] = useState(false);

  // PDF Multi-page support
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  // Aspect ratio preset
  const [preset, setPreset] = useState<AspectRatioPreset>(defaultPreset);

  // Natural image dimensions
  const [naturalDim, setNaturalDim] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Zoom slider (1x to 3x)
  const [zoom, setZoom] = useState(1);

  // Crop rectangle in normalized image coordinates (0 to 1)
  const [crop, setCrop] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 0.1,
    y: 0.1,
    width: 0.8,
    height: 0.8,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const isDraggingRef = useRef(false);
  const dragHandleRef = useRef<'move' | 'nw' | 'ne' | 'se' | 'sw' | null>(null);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; crop: typeof crop }>({
    mouseX: 0,
    mouseY: 0,
    crop: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 },
  });

  // Load and convert file or initial image
  useEffect(() => {
    if (!isOpen) return;

    if (sourceFile) {
      loadFile(sourceFile);
    } else if (initialImageSrc) {
      setImageSrc(initialImageSrc);
    }
  }, [isOpen, sourceFile, initialImageSrc]);

  async function loadFile(file: File) {
    setLoading(true);
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      setLoadingMsg('Rendering PDF page to high-res canvas...');
      try {
        const buffer = await file.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setCurrentPage(1);
        await renderPdfPage(doc, 1);
      } catch (err: any) {
        alert(`Failed to read PDF document: ${err.message || 'Unknown error'}`);
        onClose();
      } finally {
        setLoading(false);
      }
    } else {
      // Standard image
      setLoadingMsg('Loading image...');
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result as string);
        setLoading(false);
      };
      reader.onerror = () => {
        alert('Failed to read image file');
        setLoading(false);
        onClose();
      };
      reader.readAsDataURL(file);
    }
  }

  async function renderPdfPage(doc: any, pageNum: number) {
    try {
      const page = await doc.getPage(pageNum);
      // High-DPI scale for crystal-clear signatures and logos
      const viewport = page.getViewport({ scale: 2.5 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d')!;

      await page.render({ canvasContext: ctx, viewport }).promise;
      const dataUrl = canvas.toDataURL('image/png');
      setImageSrc(dataUrl);
    } catch (err) {
      console.error('Error rendering PDF page', err);
    }
  }

  async function handlePageChange(newPage: number) {
    if (!pdfDoc || newPage < 1 || newPage > numPages) return;
    setCurrentPage(newPage);
    setLoading(true);
    setLoadingMsg(`Rendering page ${newPage} of ${numPages}...`);
    await renderPdfPage(pdfDoc, newPage);
    setLoading(false);
  }

  // When image loads, compute natural dimensions & reset crop
  function onImageLoaded(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    const nw = img.naturalWidth || 800;
    const nh = img.naturalHeight || 600;
    setNaturalDim({ width: nw, height: nh });

    // Initialize crop to a sensible central box respecting preset
    applyPresetCrop(preset, nw, nh);
  }

  function applyPresetCrop(targetPreset: AspectRatioPreset, nw = naturalDim.width, nh = naturalDim.height) {
    setPreset(targetPreset);
    if (!nw || !nh) return;

    if (targetPreset === '1:1') {
      const minSide = Math.min(nw, nh) * 0.7;
      const wNorm = minSide / nw;
      const hNorm = minSide / nh;
      setCrop({
        x: (1 - wNorm) / 2,
        y: (1 - hNorm) / 2,
        width: wNorm,
        height: hNorm,
      });
    } else if (targetPreset === '3:1') {
      const baseW = nw * 0.8;
      const baseH = (baseW / 3);
      const hNorm = Math.min(0.8, baseH / nh);
      const wNorm = (hNorm * nh * 3) / nw;
      setCrop({
        x: (1 - wNorm) / 2,
        y: (1 - hNorm) / 2,
        width: wNorm,
        height: hNorm,
      });
    } else if (targetPreset === '4:1') {
      const baseW = nw * 0.85;
      const baseH = (baseW / 4);
      const hNorm = Math.min(0.8, baseH / nh);
      const wNorm = (hNorm * nh * 4) / nw;
      setCrop({
        x: (1 - wNorm) / 2,
        y: (1 - hNorm) / 2,
        width: wNorm,
        height: hNorm,
      });
    } else {
      // Free form
      setCrop({
        x: 0.15,
        y: 0.15,
        width: 0.7,
        height: 0.7,
      });
    }
  }

  // Pointer drag handling for moving crop box or resizing handles
  const handlePointerDown = (
    e: React.PointerEvent,
    handle: 'move' | 'nw' | 'ne' | 'se' | 'sw'
  ) => {
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

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !containerRef.current) return;
    e.preventDefault();

    const rect = containerRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const dx = (e.clientX - dragStartRef.current.mouseX) / (rect.width * zoom);
    const dy = (e.clientY - dragStartRef.current.mouseY) / (rect.height * zoom);

    const init = dragStartRef.current.crop;
    const handle = dragHandleRef.current;

    let newX = crop.x;
    let newY = crop.y;
    let newW = crop.width;
    let newH = crop.height;

    if (handle === 'move') {
      newX = Math.max(0, Math.min(1 - init.width, init.x + dx));
      newY = Math.max(0, Math.min(1 - init.height, init.y + dy));
      newW = init.width;
      newH = init.height;
    } else if (handle === 'se') {
      newW = Math.max(0.05, Math.min(1 - init.x, init.width + dx));
      if (preset === '1:1') {
        newH = (newW * naturalDim.width) / naturalDim.height;
      } else if (preset === '3:1') {
        newH = (newW * naturalDim.width) / (3 * naturalDim.height);
      } else if (preset === '4:1') {
        newH = (newW * naturalDim.width) / (4 * naturalDim.height);
      } else {
        newH = Math.max(0.05, Math.min(1 - init.y, init.height + dy));
      }
    } else if (handle === 'nw') {
      const maxDx = init.width - 0.05;
      const appliedDx = Math.min(maxDx, Math.max(-init.x, dx));
      newX = init.x + appliedDx;
      newW = init.width - appliedDx;

      if (preset === '1:1') {
        newH = (newW * naturalDim.width) / naturalDim.height;
        newY = init.y + init.height - newH;
      } else if (preset === '3:1') {
        newH = (newW * naturalDim.width) / (3 * naturalDim.height);
        newY = init.y + init.height - newH;
      } else {
        const maxDy = init.height - 0.05;
        const appliedDy = Math.min(maxDy, Math.max(-init.y, dy));
        newY = init.y + appliedDy;
        newH = init.height - appliedDy;
      }
    } else if (handle === 'ne') {
      newW = Math.max(0.05, Math.min(1 - init.x, init.width + dx));
      if (preset === '1:1') {
        newH = (newW * naturalDim.width) / naturalDim.height;
        newY = init.y + init.height - newH;
      } else {
        const maxDy = init.height - 0.05;
        const appliedDy = Math.min(maxDy, Math.max(-init.y, dy));
        newY = init.y + appliedDy;
        newH = init.height - appliedDy;
      }
    } else if (handle === 'sw') {
      const maxDx = init.width - 0.05;
      const appliedDx = Math.min(maxDx, Math.max(-init.x, dx));
      newX = init.x + appliedDx;
      newW = init.width - appliedDx;
      if (preset === '1:1') {
        newH = (newW * naturalDim.width) / naturalDim.height;
      } else {
        newH = Math.max(0.05, Math.min(1 - init.y, init.height + dy));
      }
    }

    // Boundary constraints
    newX = Math.max(0, Math.min(1 - 0.05, newX));
    newY = Math.max(0, Math.min(1 - 0.05, newY));
    newW = Math.min(1 - newX, Math.max(0.05, newW));
    newH = Math.min(1 - newY, Math.max(0.05, newH));

    setCrop({ x: newX, y: newY, width: newW, height: newH });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      dragHandleRef.current = null;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Perform the high-resolution crop export
  async function handleApplyCrop() {
    if (!imageRef.current || !naturalDim.width || !naturalDim.height) return;
    setApplying(true);

    try {
      const sourceImg = imageRef.current;
      const exportCanvas = document.createElement('canvas');

      const cropPxX = Math.round(crop.x * naturalDim.width);
      const cropPxY = Math.round(crop.y * naturalDim.height);
      const cropPxW = Math.round(crop.width * naturalDim.width);
      const cropPxH = Math.round(crop.height * naturalDim.height);

      exportCanvas.width = cropPxW;
      exportCanvas.height = cropPxH;
      const ctx = exportCanvas.getContext('2d')!;

      // Draw cropped slice
      ctx.drawImage(
        sourceImg,
        cropPxX,
        cropPxY,
        cropPxW,
        cropPxH,
        0,
        0,
        cropPxW,
        cropPxH
      );

      const croppedDataUrl = exportCanvas.toDataURL('image/png', 0.95);

      // Convert to blob
      const blob = await new Promise<Blob>((resolve) => {
        exportCanvas.toBlob((b) => resolve(b || new Blob()), 'image/png', 0.95);
      });

      await onCropComplete(blob, croppedDataUrl);
      onClose();
    } catch (err: any) {
      alert(`Error applying crop: ${err.message || 'Unknown error'}`);
    } finally {
      setApplying(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full flex flex-col max-h-[92vh] overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>✂️</span> {title}
            </h3>
            <p className="text-[11px] text-slate-500">
              Drag the rectangle to position and resize the corners to crop your logo or signature.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-sm transition"
          >
            ✕
          </button>
        </div>

        {/* Toolbar: Aspect Ratio Presets & Zoom */}
        <div className="px-5 py-2.5 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-600 mr-1">Preset:</span>
            <button
              type="button"
              onClick={() => applyPresetCrop('free')}
              className={`px-2.5 py-1 rounded-lg font-bold transition text-xs ${
                preset === 'free' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-200'
              }`}
            >
              Free
            </button>
            <button
              type="button"
              onClick={() => applyPresetCrop('1:1')}
              className={`px-2.5 py-1 rounded-lg font-bold transition text-xs ${
                preset === '1:1' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-200'
              }`}
            >
              1:1 Square (Logo)
            </button>
            <button
              type="button"
              onClick={() => applyPresetCrop('3:1')}
              className={`px-2.5 py-1 rounded-lg font-bold transition text-xs ${
                preset === '3:1' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-200'
              }`}
            >
              3:1 Wide (Signature)
            </button>
            <button
              type="button"
              onClick={() => applyPresetCrop('4:1')}
              className={`px-2.5 py-1 rounded-lg font-bold transition text-xs ${
                preset === '4:1' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-200'
              }`}
            >
              4:1 Banner
            </button>
          </div>

          {/* Zoom Slider */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-600">Zoom:</span>
            <input
              type="range"
              min="1"
              max="2.5"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-24 accent-blue-600"
            />
            <span className="text-[10px] font-mono text-slate-500 w-8">{Math.round(zoom * 100)}%</span>
          </div>
        </div>

        {/* Multi-page PDF page switcher banner if PDF */}
        {numPages > 1 && (
          <div className="px-5 py-2 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-center justify-between">
            <span className="font-semibold">
              PDF has {numPages} pages. Choose page with your logo/signature:
            </span>
            <div className="flex items-center gap-1.5 font-bold">
              <button
                type="button"
                disabled={currentPage <= 1 || loading}
                onClick={() => handlePageChange(currentPage - 1)}
                className="px-2 py-0.5 rounded bg-white border border-amber-300 disabled:opacity-40"
              >
                ◀ Prev
              </button>
              <span className="px-2 font-mono text-xs">
                Page {currentPage} of {numPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= numPages || loading}
                onClick={() => handlePageChange(currentPage + 1)}
                className="px-2 py-0.5 rounded bg-white border border-amber-300 disabled:opacity-40"
              >
                Next ▶
              </button>
            </div>
          </div>
        )}

        {/* Main Workspace Canvas Area */}
        <div className="flex-1 overflow-auto p-4 bg-slate-900/90 flex items-center justify-center min-h-[340px] relative select-none">
          {loading ? (
            <div className="text-center text-white py-12 space-y-2">
              <div className="w-8 h-8 border-3 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold">{loadingMsg}</p>
            </div>
          ) : imageSrc ? (
            <div
              ref={containerRef}
              className="relative inline-block touch-none"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'center center',
                transition: 'transform 0.1s ease-out',
              }}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              {/* Underlying Image */}
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Source preview"
                onLoad={onImageLoaded}
                draggable={false}
                className="max-h-[50vh] max-w-full block rounded object-contain shadow-lg pointer-events-none"
              />

              {/* Darkened overlay outside the crop box */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'rgba(0, 0, 0, 0.55)',
                  clipPath: `polygon(
                    0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%,
                    ${crop.x * 100}% ${crop.y * 100}%,
                    ${(crop.x + crop.width) * 100}% ${crop.y * 100}%,
                    ${(crop.x + crop.width) * 100}% ${(crop.y + crop.height) * 100}%,
                    ${crop.x * 100}% ${(crop.y + crop.height) * 100}%,
                    ${crop.x * 100}% ${crop.y * 100}%
                  )`,
                }}
              />

              {/* The Active Crop Box */}
              <div
                className="absolute border-2 border-white shadow-2xl cursor-move touch-none"
                style={{
                  left: `${crop.x * 100}%`,
                  top: `${crop.y * 100}%`,
                  width: `${crop.width * 100}%`,
                  height: `${crop.height * 100}%`,
                  boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.4), inset 0 0 0 1px rgba(255, 255, 255, 0.3)',
                }}
                onPointerDown={(e) => handlePointerDown(e, 'move')}
              >
                {/* Rule of Thirds Grid Guidelines */}
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

                {/* 4 Corner Resize Handles */}
                <div
                  className="absolute -top-2 -left-2 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-nwse-resize shadow"
                  onPointerDown={(e) => handlePointerDown(e, 'nw')}
                />
                <div
                  className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-nesw-resize shadow"
                  onPointerDown={(e) => handlePointerDown(e, 'ne')}
                />
                <div
                  className="absolute -bottom-2 -left-2 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-nesw-resize shadow"
                  onPointerDown={(e) => handlePointerDown(e, 'sw')}
                />
                <div
                  className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-nwse-resize shadow"
                  onPointerDown={(e) => handlePointerDown(e, 'se')}
                />
              </div>
            </div>
          ) : (
            <div className="text-slate-400 text-xs">No image loaded</div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            {naturalDim.width > 0 && (
              <span>Original: {naturalDim.width} × {naturalDim.height} px</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={applying}
              className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold rounded-xl text-xs hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading || applying || !imageSrc}
              onClick={handleApplyCrop}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center gap-1.5"
            >
              {applying ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Cropping &amp; Uploading...
                </>
              ) : (
                <>
                  <span>✓</span> Crop &amp; Apply Asset
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
