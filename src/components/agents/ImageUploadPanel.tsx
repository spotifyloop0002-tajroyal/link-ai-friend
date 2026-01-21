import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  ImagePlus, 
  X, 
  Loader2, 
  AlertCircle,
  Upload 
} from "lucide-react";
import { UploadedImage } from "@/hooks/useImageUpload";

interface ImageUploadPanelProps {
  images: UploadedImage[];
  isUploading: boolean;
  remainingSlots: number;
  maxImages: number;
  onAddImages: (files: FileList | File[]) => void;
  onRemoveImage: (imageId: string) => void;
  disabled?: boolean;
}

export function ImageUploadPanel({
  images,
  isUploading,
  remainingSlots,
  maxImages,
  onAddImages,
  onRemoveImage,
  disabled,
}: ImageUploadPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddImages(e.target.files);
      // Reset input so same file can be selected again
      e.target.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled || isUploading) return;
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onAddImages(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="space-y-3">
      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={`border-2 border-dashed rounded-lg p-3 transition-colors ${
          disabled || isUploading
            ? "border-muted bg-muted/50 cursor-not-allowed"
            : "border-border hover:border-primary/50 cursor-pointer"
        }`}
        onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || isUploading}
        />
        
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              <span>Drop images or click to upload</span>
              <span className="text-xs">({remainingSlots}/{maxImages} remaining)</span>
            </>
          )}
        </div>
      </div>

      {/* Image Thumbnails */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <AnimatePresence mode="popLayout">
            {images.map((image) => (
              <motion.div
                key={image.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative group"
              >
                <div className="w-16 h-16 rounded-lg overflow-hidden border border-border bg-muted">
                  <img
                    src={image.url}
                    alt="Upload preview"
                    className={`w-full h-full object-cover ${
                      image.uploading ? "opacity-50" : ""
                    }`}
                  />
                  
                  {/* Loading Overlay */}
                  {image.uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    </div>
                  )}
                  
                  {/* Error Overlay */}
                  {image.error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-destructive/20">
                      <AlertCircle className="w-4 h-4 text-destructive" />
                    </div>
                  )}
                </div>
                
                {/* Remove Button */}
                {!image.uploading && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveImage(image.id);
                    }}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
