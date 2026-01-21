import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface UploadedImage {
  id: string;
  file: File;
  url: string;
  uploading: boolean;
  error?: string;
}

const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function useImageUpload() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Invalid file type: ${file.type}. Allowed: JPG, PNG, WebP, GIF`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: 5MB`;
    }
    return null;
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please log in to upload images");
      return null;
    }

    const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error } = await supabase.storage
      .from("post-images")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Upload error:", error);
      throw new Error(error.message);
    }

    const { data: { publicUrl } } = supabase.storage
      .from("post-images")
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const addImages = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    // Check max limit
    const currentCount = images.length;
    const availableSlots = MAX_IMAGES - currentCount;
    
    if (availableSlots <= 0) {
      toast.error(`Maximum ${MAX_IMAGES} images allowed`);
      return;
    }

    if (fileArray.length > availableSlots) {
      toast.warning(`Only adding ${availableSlots} image(s). Max ${MAX_IMAGES} allowed.`);
    }

    const filesToAdd = fileArray.slice(0, availableSlots);
    
    // Validate all files first
    const validFiles: File[] = [];
    for (const file of filesToAdd) {
      const error = validateFile(file);
      if (error) {
        toast.error(error);
      } else {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) return;

    setIsUploading(true);
    
    // Add placeholder images with uploading state
    const placeholders: UploadedImage[] = validFiles.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      file,
      url: URL.createObjectURL(file),
      uploading: true,
    }));

    setImages(prev => [...prev, ...placeholders]);

    // Upload each file
    for (const placeholder of placeholders) {
      try {
        const publicUrl = await uploadImage(placeholder.file);
        
        if (publicUrl) {
          setImages(prev =>
            prev.map(img =>
              img.id === placeholder.id
                ? { ...img, url: publicUrl, uploading: false }
                : img
            )
          );
        } else {
          // Remove failed upload
          setImages(prev => prev.filter(img => img.id !== placeholder.id));
        }
      } catch (error: any) {
        console.error("Upload failed:", error);
        setImages(prev =>
          prev.map(img =>
            img.id === placeholder.id
              ? { ...img, uploading: false, error: error.message }
              : img
          )
        );
        toast.error(`Failed to upload ${placeholder.file.name}`);
      }
    }

    setIsUploading(false);
    toast.success(`${validFiles.length} image(s) uploaded`);
  }, [images.length]);

  const removeImage = useCallback((imageId: string) => {
    setImages(prev => {
      const image = prev.find(img => img.id === imageId);
      if (image && image.url.startsWith("blob:")) {
        URL.revokeObjectURL(image.url);
      }
      return prev.filter(img => img.id !== imageId);
    });
  }, []);

  const clearImages = useCallback(() => {
    images.forEach(img => {
      if (img.url.startsWith("blob:")) {
        URL.revokeObjectURL(img.url);
      }
    });
    setImages([]);
  }, [images]);

  const getImageUrls = useCallback((): string[] => {
    return images
      .filter(img => !img.uploading && !img.error)
      .map(img => img.url);
  }, [images]);

  return {
    images,
    isUploading,
    addImages,
    removeImage,
    clearImages,
    getImageUrls,
    maxImages: MAX_IMAGES,
    remainingSlots: MAX_IMAGES - images.length,
  };
}
