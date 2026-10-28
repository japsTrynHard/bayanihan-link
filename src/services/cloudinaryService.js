const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const CLOUDINARY_FOLDERS = {
  PROFILES: "bayanihan-link/profiles",
  POSTS: "bayanihan-link/posts",
  EMERGENCIES: "bayanihan-link/emergencies",
  CHATS: "bayanihan-link/chats",
  REPORTS: "bayanihan-link/reports",
  UPLOADS: "bayanihan-link/uploads",
};

export const validateImageFile = (file) => {
  if (!file) {
    throw new Error("No image file selected.");
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Invalid image type. Please upload JPG, PNG, or WEBP only.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Image is too large. Maximum file size is 5MB.");
  }

  return true;
};

export const uploadImageToCloudinary = async (
  file,
  folder = CLOUDINARY_FOLDERS.UPLOADS
) => {
  validateImageFile(file);

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error(
      "Cloudinary environment variables are missing. Check VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET."
    );
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", folder);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "Cloudinary image upload failed.");
  }

  return {
    url: data.secure_url,
    publicId: data.public_id,
    width: data.width,
    height: data.height,
    format: data.format,
    bytes: data.bytes,
    originalFilename: data.original_filename,
  };
};
