const imageKeys = [
  'images',
  'image',
  'imageUrl',
  'photo',
  'photoUrl',
  'picture',
  'pictureUrl',
  'coverImage',
  'coverImageUrl',
  'uploadedImages',
  'itemImages',
  'jobImages',
  'attachments',
  'media',
];

export const getImageUrl = (image) => {
  if (!image) return '';

  if (typeof image === 'string') return image.trim();

  if (Array.isArray(image)) {
    return getImageUrl(image[0]);
  }

  if (typeof image === 'object') {
    return (
      image.url ||
      image.secure_url ||
      image.secureUrl ||
      image.src ||
      image.preview ||
      image.downloadURL ||
      image.imageUrl ||
      image.photoUrl ||
      ''
    ).trim?.() || '';
  }

  return '';
};

const flattenImages = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap((item) => flattenImages(item));
  return [value];
};

export const getPostImages = (post = {}) => {
  const candidates = imageKeys.flatMap((key) => flattenImages(post?.[key]));
  const urls = candidates.map(getImageUrl).filter(Boolean);
  return [...new Set(urls)];
};

export const getPostCoverImage = (post = {}) => getPostImages(post)[0] || '';

export const normalizeImageList = (images) => {
  const urls = flattenImages(images).map(getImageUrl).filter(Boolean);
  return [...new Set(urls)];
};
