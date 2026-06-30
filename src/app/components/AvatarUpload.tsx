'use client';

import { useRef, useState } from 'react';

interface AvatarUploadProps {
  currentUrl: string | null;
  initial: string;
  onFileSelected: (file: File) => void;
}

export function AvatarUpload({ currentUrl, initial, onFileSelected }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    onFileSelected(file);
    // Reset zodat hetzelfde bestand opnieuw gekozen kan worden.
    e.target.value = '';
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="group relative h-24 w-24 overflow-hidden rounded-full border-2 border-line bg-ahBlueSoft transition-colors hover:border-ahBlue"
        aria-label="Profielfoto kiezen"
      >
        {preview ? (
          <img src={preview} alt="Profielfoto" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-ahBlue">
            {initial}
          </span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-navy/40 opacity-0 transition-opacity group-hover:opacity-100">
          <i className="ph-fill ph-camera text-2xl text-onNavy" aria-hidden="true" />
        </span>
      </button>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="text-sm font-medium text-ahBlue hover:underline"
      >
        {preview ? 'Andere foto kiezen' : 'Foto kiezen'}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
