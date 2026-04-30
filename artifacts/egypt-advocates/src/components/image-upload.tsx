import { useRef, useCallback, useState } from "react";
import { Upload, X, Camera, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

/** Resize + convert a File to a JPEG base64 data URL. */
export function resizeToBase64(
  file: File,
  maxW = 400,
  maxH = 400,
  quality = 0.82,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > maxW || height > maxH) {
        const ratio = Math.min(maxW / width, maxH / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    img.src = objectUrl;
  });
}

/* ─── PhotoPicker (circle avatar — for person profiles) ─────────────── */

interface PhotoPickerProps {
  value: string | null | undefined;
  onChange: (val: string | null) => void;
  initials?: string;
  isRtl?: boolean;
}

export function PhotoPicker({ value, onChange, initials = "?", isRtl }: PhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        toast.error(isRtl ? "يرجى اختيار صورة فقط" : "Please select an image file");
        return;
      }
      setLoading(true);
      try {
        const base64 = await resizeToBase64(file, 400, 400);
        onChange(base64);
      } catch {
        toast.error(isRtl ? "فشل تحميل الصورة" : "Failed to load image");
      } finally {
        setLoading(false);
        e.target.value = "";
      }
    },
    [onChange, isRtl],
  );

  return (
    <div className="flex items-center gap-4">
      <div className="relative group">
        <Avatar className="h-20 w-20 border-2 border-border">
          {value ? <AvatarImage src={value} className="object-cover" /> : null}
          <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        >
          <Camera className="w-5 h-5 text-white" />
        </button>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2 h-8 text-xs"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
        >
          <Upload className="w-3.5 h-3.5" />
          {isRtl ? "رفع صورة" : "Upload Photo"}
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-2 h-8 text-xs text-destructive hover:text-destructive"
            onClick={() => onChange(null)}
          >
            <X className="w-3.5 h-3.5" />
            {isRtl ? "حذف الصورة" : "Remove"}
          </Button>
        )}
        <p className="text-[10px] text-muted-foreground">
          {isRtl ? "JPG, PNG, WEBP – بحد أقصى 5 ميجا" : "JPG, PNG, WEBP – max 5 MB"}
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}

/* ─── CoverImagePicker (wide banner — for blog / news posts) ─────────── */

interface CoverImagePickerProps {
  value: string | null | undefined;
  onChange: (val: string | null) => void;
  isRtl?: boolean;
}

export function CoverImagePicker({ value, onChange, isRtl }: CoverImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        toast.error(isRtl ? "يرجى اختيار صورة فقط" : "Please select an image file");
        return;
      }
      setLoading(true);
      try {
        const base64 = await resizeToBase64(file, 1200, 630, 0.85);
        onChange(base64);
      } catch {
        toast.error(isRtl ? "فشل تحميل الصورة" : "Failed to load image");
      } finally {
        setLoading(false);
        e.target.value = "";
      }
    },
    [onChange, isRtl],
  );

  return (
    <div className="space-y-2">
      {/* Preview area */}
      <div
        className="relative w-full rounded-xl border-2 border-dashed border-border bg-muted/30 overflow-hidden cursor-pointer group"
        style={{ aspectRatio: "16/6" }}
        onClick={() => inputRef.current?.click()}
      >
        {value ? (
          <img src={value} alt="cover" className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageIcon className="w-8 h-8 opacity-40" />
            <span className="text-xs">{isRtl ? "اضغط لرفع صورة الغلاف" : "Click to upload cover image"}</span>
          </div>
        )}

        {/* hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
          {loading ? (
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Camera className="w-7 h-7 text-white" />
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2 h-8 text-xs"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
        >
          <Upload className="w-3.5 h-3.5" />
          {isRtl ? "رفع صورة الغلاف" : "Upload Cover"}
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-2 h-8 text-xs text-destructive hover:text-destructive"
            onClick={() => onChange(null)}
          >
            <X className="w-3.5 h-3.5" />
            {isRtl ? "حذف" : "Remove"}
          </Button>
        )}
        <span className="text-[10px] text-muted-foreground ms-auto">
          {isRtl ? "JPG, PNG, WEBP – بحد أقصى 5 ميجا" : "JPG, PNG, WEBP – max 5 MB"}
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
