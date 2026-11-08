import React, { useState, useRef } from 'react';
import { ImageCropperModal, AspectRatioPreset } from './ImageCropperModal';
import { uploadInvoiceAsset } from '../../lib/invoiceApi';

interface Props {
  label: string;
  sublabel?: string;
  value: string;
  onChange: (url: string) => void;
  vendorId?: string;
  preset?: AspectRatioPreset;
  placeholder?: string;
}

export function BrandingAssetUploader({
  label,
  sublabel,
  value,
  onChange,
  vendorId,
  preset = 'free',
  placeholder = 'https://res.cloudinary.com/...',
}: Props) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setSelectedFile(file);
    setCropperOpen(true);

    // Reset input so re-selecting the same file triggers change
    e.target.value = '';
  };

  const handleCropComplete = async (croppedBlob: Blob, croppedDataUrl: string) => {
    if (!vendorId) {
      // If no vendorId, fallback to local dataURL directly
      onChange(croppedDataUrl);
      return;
    }

    setUploading(true);
    setErrorMsg(null);

    try {
      const ext = 'png';
      const filename = `${label.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}.${ext}`;
      const res = await uploadInvoiceAsset(vendorId, croppedBlob, filename);
      onChange(res.url);
    } catch (err: any) {
      // Fallback: If upload endpoint fails, apply base64 dataUrl directly so user is never blocked
      console.warn('Asset upload fallback to inline dataURL', err);
      onChange(croppedDataUrl);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    onChange('');
    setSelectedFile(null);
  };

  return (
    <div className="space-y-2">
      {/* Label & Type Pills */}
      <div className="flex items-center justify-between">
        <label className="block font-semibold text-slate-700 text-xs">
          {label}
        </label>
        <span className="text-[10px] text-slate-400 font-medium">
          PNG, JPG, PDF, WEBP
        </span>
      </div>

      {sublabel && (
        <p className="text-[11px] text-slate-500">{sublabel}</p>
      )}

      {/* Hidden File Picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/jpg,application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Main Asset Box: Either Preview or Upload Zone */}
      {value ? (
        <div className="relative group border border-slate-200 rounded-xl p-3 bg-slate-50/70 hover:bg-slate-50 transition flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-14 h-14 rounded-lg bg-white border border-slate-200 shadow-2xs flex items-center justify-center p-1 overflow-hidden shrink-0">
              <img
                src={value}
                alt={label}
                className="max-h-full max-w-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-800 block truncate">
                Asset Configured
              </span>
              <span className="text-[10px] font-mono text-slate-500 block truncate max-w-[200px] sm:max-w-[280px]">
                {value}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setSelectedFile(null);
                setCropperOpen(true);
              }}
              className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold shadow-2xs transition flex items-center gap-1"
              title="Re-crop current asset"
            >
              <span>✂️</span> Crop
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold shadow-2xs transition flex items-center gap-1"
            >
              <span>🔄</span> Replace
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="px-2 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold transition"
              title="Remove asset"
            >
              ✕
            </button>
          </div>
        </div>
      ) : (
        /* Empty Upload Dropzone Button */
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/40 rounded-xl p-4 text-center cursor-pointer transition group"
        >
          <div className="flex flex-col items-center justify-center gap-1">
            <div className="w-8 h-8 rounded-full bg-blue-100 group-hover:bg-blue-200 text-blue-600 flex items-center justify-center text-sm font-bold transition">
              ⬆
            </div>
            <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition">
              Upload {label} from Local Drive
            </span>
            <span className="text-[11px] text-slate-500">
              Pick Image (.png, .jpg) or PDF Document to crop
            </span>
          </div>
        </div>
      )}

      {/* Optional Direct URL Toggle / Input */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-[10px] font-semibold text-slate-500 hover:text-blue-600 transition flex items-center gap-1"
        >
          <span>{showUrlInput ? '▼' : '▶'}</span>
          <span>Or enter image URL directly</span>
        </button>

        {showUrlInput && (
          <div className="mt-1.5 animate-in slide-in-from-top-1 duration-150">
            <input
              type="url"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="w-full border rounded-lg p-2 text-xs font-mono text-slate-700 bg-white"
            />
          </div>
        )}
      </div>

      {errorMsg && (
        <p className="text-[11px] text-rose-600 font-semibold">{errorMsg}</p>
      )}

      {/* Cropper Modal */}
      <ImageCropperModal
        isOpen={cropperOpen}
        onClose={() => setCropperOpen(false)}
        sourceFile={selectedFile}
        initialImageSrc={value || null}
        title={`Crop ${label}`}
        defaultPreset={preset}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
}
