'use client';
/**
 * ─── ImageUploader Component ──────────────────────────────────────────────────
 * A reusable drag-and-drop image upload component for vendors.
 *
 * Features:
 *   - Drag-and-drop or click-to-browse file selection
 *   - Client-side validation: JPEG/PNG/WebP/AVIF/GIF, max 50 MB per file
 *   - Shows live preview thumbnails with remove option
 *   - Uploads to /api/upload/image via multipart/form-data
 *   - Returns uploaded image URLs to parent via onUpload callback
 *
 * Usage:
 *   <ImageUploader
 *     token={token}
 *     productId={product.id}        // optional – links images to product
 *     onUpload={(urls) => ...}       // called with array of /uploads/<file> paths
 *     initialImages={product.images} // pre-populate with existing images
 *   />
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import toast from 'react-hot-toast';
import { Upload, X, Image as ImageIcon, CheckCircle2, Loader } from 'lucide-react';

/* ── Constants ──────────────────────────────────────────────────────────────── */
const MAX_SIZE_MB    = 50;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const ALLOWED_TYPES  = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
const MAX_FILES      = 10;

interface UploadedImage {
  url:           string;
  original_name: string;
  size_mb:       number;
  uploading?:    boolean;
  error?:        string;
  localPreview?: string;  // blob URL for instant preview
}

interface Props {
  /** JWT token for Authorization header */
  token:          string;
  /** Optional product ID to link uploaded images */
  productId?:     string;
  /** Called with the final list of server /uploads/… URLs */
  onUpload:       (urls: string[]) => void;
  /** Pre-populate with already-uploaded image URLs */
  initialImages?: string[];
}

export default function ImageUploader({ token, productId, onUpload, initialImages = [] }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [images,     setImages]     = useState<UploadedImage[]>(
    initialImages.map(url => ({ url, original_name: url.split('/').pop() || url, size_mb: 0 }))
  );

  /* ── Validate file list ─────────────────────────────────────────────────── */
  const validateFiles = (files: File[]): File[] => {
    const valid: File[] = [];
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`"${file.name}" is not a supported image type (JPEG, PNG, WebP, AVIF, GIF)`);
        continue;
      }
      if (file.size > MAX_SIZE_BYTES) {
        toast.error(`"${file.name}" exceeds the 50 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB)`);
        continue;
      }
      valid.push(file);
    }
    if (images.length + valid.length > MAX_FILES) {
      toast.error(`You can upload at most ${MAX_FILES} images per product`);
      return valid.slice(0, MAX_FILES - images.length);
    }
    return valid;
  };

  /* ── Upload files to backend ────────────────────────────────────────────── */
  const uploadFiles = async (files: File[]) => {
    const valid = validateFiles(files);
    if (!valid.length) return;

    /* Add placeholder entries immediately (with local preview) */
    const newEntries: UploadedImage[] = valid.map(file => ({
      url:           '',
      original_name: file.name,
      size_mb:       parseFloat((file.size / 1024 / 1024).toFixed(2)),
      uploading:     true,
      localPreview:  URL.createObjectURL(file),
    }));
    setImages(prev => {
      const next = [...prev, ...newEntries];
      return next;
    });

    /* Build multipart form */
    const formData = new FormData();
    valid.forEach(f => formData.append('images', f));
    if (productId) formData.append('product_id', productId);

    try {
      const res  = await fetch('/api/upload/image', {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
        body:    formData,
      });
      const data = await res.json();

      if (data.success) {
        /* Replace uploading placeholders with real records */
        setImages(prev => {
          const kept     = prev.filter(i => !i.uploading);
          const uploaded = (data.data as any[]).map((r: any) => ({
            url:           r.url,
            original_name: r.original_name,
            size_mb:       r.size_mb,
          }));
          const next = [...kept, ...uploaded];
          onUpload(next.map(i => i.url));
          return next;
        });
        toast.success(`${data.data.length} image${data.data.length > 1 ? 's' : ''} uploaded`);
      } else {
        /* Mark placeholders as failed */
        setImages(prev => prev.map(i => i.uploading ? { ...i, uploading: false, error: data.error } : i));
        toast.error(data.error || 'Upload failed');
      }
    } catch (e: any) {
      setImages(prev => prev.map(i => i.uploading ? { ...i, uploading: false, error: 'Network error' } : i));
      toast.error('Upload failed: ' + e.message);
    }
  };

  /* ── Remove an image ────────────────────────────────────────────────────── */
  const removeImage = (index: number) => {
    setImages(prev => {
      const next = prev.filter((_, i) => i !== index);
      onUpload(next.filter(i => i.url && !i.uploading).map(i => i.url));
      return next;
    });
  };

  /* ── Drag & drop handlers ───────────────────────────────────────────────── */
  const onDragOver = (e: DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    uploadFiles(files);
  };

  /* ── File input change ──────────────────────────────────────────────────── */
  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    uploadFiles(files);
    /* Reset input so the same file can be re-selected if needed */
    e.target.value = '';
  };

  return (
    <div className="space-y-3">
      {/* ── Drop zone ─────────────────────────────────────────────────────── */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer
          transition-all duration-200 select-none
          ${isDragging
            ? 'border-orange-400 bg-orange-50 scale-[1.01]'
            : 'border-gray-200 bg-gray-50 hover:border-orange-300 hover:bg-orange-50/50'}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          multiple
          onChange={onFileChange}
          className="hidden"
          aria-label="Upload product images"
        />
        <div className="flex flex-col items-center gap-2">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center
            ${isDragging ? 'bg-orange-200 text-orange-600' : 'bg-white text-gray-400 shadow-sm'}`}>
            <Upload size={22} />
          </div>
          <p className="text-sm font-medium text-gray-700">
            {isDragging ? 'Drop images here' : 'Drag & drop images or click to browse'}
          </p>
          <p className="text-xs text-gray-400">
            JPEG, PNG, WebP, AVIF, GIF · Max {MAX_SIZE_MB} MB each · Up to {MAX_FILES} images
          </p>
        </div>
      </div>

      {/* ── Image grid preview ────────────────────────────────────────────── */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {images.map((img, i) => (
            <div key={i} className="relative group aspect-square">
              <div className={`w-full h-full rounded-xl overflow-hidden border-2
                ${img.error ? 'border-red-300 bg-red-50' :
                  img.uploading ? 'border-orange-300 bg-orange-50 animate-pulse' :
                  'border-gray-100 bg-gray-100'}`}>
                {/* Image thumbnail */}
                {(img.localPreview || img.url) && !img.error && (
                  <img
                    src={img.localPreview || img.url}
                    alt={img.original_name}
                    className={`w-full h-full object-cover transition-opacity ${img.uploading ? 'opacity-50' : 'opacity-100'}`}
                  />
                )}

                {/* Error state */}
                {img.error && (
                  <div className="w-full h-full flex flex-col items-center justify-center p-1">
                    <X size={16} className="text-red-400" />
                    <span className="text-red-400 text-[10px] text-center mt-0.5 leading-tight">Failed</span>
                  </div>
                )}

                {/* Uploading spinner */}
                {img.uploading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader size={18} className="text-orange-500 animate-spin" />
                  </div>
                )}

                {/* Uploaded badge */}
                {!img.uploading && !img.error && img.url && (
                  <div className="absolute bottom-1 right-1">
                    <CheckCircle2 size={14} className="text-green-500 bg-white rounded-full" />
                  </div>
                )}
              </div>

              {/* Remove button */}
              <button
                onClick={e => { e.stopPropagation(); removeImage(i); }}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full
                  flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity
                  hover:bg-red-600 shadow-sm"
                title="Remove image"
                aria-label="Remove image"
              >
                <X size={10} />
              </button>

              {/* Size label */}
              {img.size_mb > 0 && !img.uploading && (
                <span className="absolute bottom-1 left-1 text-[9px] bg-black/50 text-white rounded px-1 py-0.5 leading-none">
                  {img.size_mb}MB
                </span>
              )}
            </div>
          ))}

          {/* Add more placeholder */}
          {images.length < MAX_FILES && (
            <button
              onClick={() => inputRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-gray-200
                flex flex-col items-center justify-center text-gray-400 hover:border-orange-300
                hover:text-orange-400 transition-colors bg-gray-50"
              aria-label="Add more images"
            >
              <Upload size={18} />
              <span className="text-[10px] mt-1">Add more</span>
            </button>
          )}
        </div>
      )}

      {/* Counter */}
      <p className="text-xs text-gray-400">
        {images.filter(i => !i.uploading && !i.error && i.url).length} / {MAX_FILES} images uploaded
      </p>
    </div>
  );
}
