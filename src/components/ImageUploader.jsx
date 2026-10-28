import React, { useEffect, useRef, useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { CLOUDINARY_FOLDERS, uploadImageToCloudinary } from "../services/cloudinaryService";
import { getImageUrl } from "../utils/postImages";
import "../styles/components/ImageUploader.css";

function ImageUploader({
  onImageSelect,
  multiple = false,
  maxSize = 5242880,
  initialImages = [],
  cloudinaryFolder = CLOUDINARY_FOLDERS.UPLOADS,
  onUploadStateChange,
  deferUpload = false,
}) {
  const fileInputRef = useRef(null);
  // useState: Naglalaman ng uploaded/pending image previews bago i-save sa form/database.
  const [previews, setPreviews] = useState([]);
  // useState: Naglalaman ng validation/upload error message para sa image upload.
  const [error, setError] = useState("");
  // useState: Loading state habang pinoproseso ang image.
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const normalized = Array.isArray(initialImages)
      ? initialImages
          .filter(Boolean)
          .map((image, index) => ({
            id: `initial-${index}`,
            url: getImageUrl(image) || image?.previewUrl || "",
            publicId: image?.publicId || image?.public_id || "",
            file: image?.file || null,
            isPendingUpload: Boolean(image?.isPendingUpload),
          }))
          .filter((item) => item.url || item.file)
      : initialImages
        ? [
            {
              id: "initial-0",
              url: getImageUrl(initialImages) || initialImages?.previewUrl || "",
              publicId: initialImages?.publicId || initialImages?.public_id || "",
              file: initialImages?.file || null,
              isPendingUpload: Boolean(initialImages?.isPendingUpload),
            },
          ].filter((item) => item.url || item.file)
        : [];
    setPreviews(normalized);
  }, [initialImages]);

  const emitValue = (nextPreviews) => {
    const values = nextPreviews
      .map((item) => {
        if (item.isPendingUpload && item.file) {
          return {
            file: item.file,
            previewUrl: item.url,
            isPendingUpload: true,
            name: item.file.name,
            size: item.file.size,
            type: item.file.type,
          };
        }
        const url = getImageUrl(item);
        return url ? { url, publicId: item.publicId || "" } : "";
      })
      .filter(Boolean);

    onImageSelect(multiple ? values : values[0] || "");
  };

  const validateFiles = (filesInput) => {
    const files = Array.from(filesInput || []);
    setError("");

    if (!multiple && files.length > 1) {
      setError("Please select only one image");
      return [];
    }

    return files.filter((file) => {
      if (!file.type.startsWith("image/")) {
        setError("Please select only image files");
        return false;
      }
      if (file.size > maxSize) {
        setError("Image size must be less than 5MB");
        return false;
      }
      return true;
    });
  };

  const handleFiles = async (filesInput) => {
    const validFiles = validateFiles(filesInput);
    if (!validFiles.length) return;

    if (deferUpload) {
      const pending = validFiles.map((file) => ({
        id: `pending-${Date.now()}-${Math.random()}`,
        url: URL.createObjectURL(file),
        file,
        isPendingUpload: true,
      }));
      const nextPreviews = multiple ? [...previews, ...pending] : pending;
      setPreviews(nextPreviews);
      emitValue(nextPreviews);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsUploading(true);
    onUploadStateChange?.(true);

    try {
      const uploaded = await Promise.all(
        validFiles.map(async (file) => {
          const image = await uploadImageToCloudinary(file, cloudinaryFolder);
          return {
            id: image.publicId || `${Date.now()}-${Math.random()}`,
            url: image.url,
            publicId: image.publicId,
          };
        }),
      );

      const nextPreviews = multiple ? [...previews, ...uploaded] : uploaded;
      setPreviews(nextPreviews);
      emitValue(nextPreviews);
    } catch (uploadError) {
      setError(uploadError?.message || "Image upload failed. Please try again.");
    } finally {
      setIsUploading(false);
      onUploadStateChange?.(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileSelect = async (e) => {
    await handleFiles(e.target.files);
  };

  const handleRemove = (id) => {
    const removed = previews.find((preview) => preview.id === id);
    if (removed?.isPendingUpload && removed.url?.startsWith("blob:")) {
      URL.revokeObjectURL(removed.url);
    }
    const nextPreviews = previews.filter((preview) => preview.id !== id);
    setPreviews(nextPreviews);
    emitValue(nextPreviews);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add("drag-over");
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove("drag-over");
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove("drag-over");
    if (isUploading) return;
    await handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="image-uploader">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />

      <div
        className={`upload-zone ${isUploading ? "is-uploading" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        onKeyDown={(event) => {
          if ((event.key === "Enter" || event.key === " ") && !isUploading) {
            event.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
      >
        {isUploading ? <Loader2 size={32} className="upload-spinner" /> : <Upload size={32} />}
        <div className="upload-text">
          <p className="upload-main">{isUploading ? "Preparing photo..." : "Click to attach or drag and drop"}</p>
          <p className="upload-sub">PNG, JPG, WEBP up to 5MB</p>
          {previews.length > 0 && <p className="upload-sub upload-success">{previews.length} photo{previews.length > 1 ? "s" : ""} ready</p>}
        </div>
      </div>

      {error && <p className="error-message">{error}</p>}

      {previews.length > 0 && (
        <div className="preview-grid">
          {previews.map((preview) => (
            <div key={preview.id} className="preview-item">
              <img src={preview.url} alt="Preview" />
              <button
                className="remove-btn"
                onClick={() => handleRemove(preview.id)}
                type="button"
                disabled={isUploading}
              >
                <X size={20} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ImageUploader;
