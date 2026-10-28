import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import '../styles/components/SmartMediaImage.css';

function SmartMediaImage({
  src,
  alt,
  className = '',
  frameClassName = '',
  imageClassName = '',
  size = 'card',
  showHint = true,
  loading = 'lazy',
  overlay = null,
  onError,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isBroken, setIsBroken] = useState(false);

  const sizeClass = useMemo(() => {
    if (size === 'detail') return 'smart-media-frame--detail';
    if (size === 'chat') return 'smart-media-frame--chat';
    if (size === 'thumb') return 'smart-media-frame--thumb';
    if (size === 'cover') return 'smart-media-frame--cover';
    return 'smart-media-frame--card';
  }, [size]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = originalOverflow || '';
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  if (!src || isBroken) return null;

  const handleError = (event) => {
    setIsBroken(true);
    if (typeof onError === 'function') onError(event);
  };

  return (
    <>
      <button
        type="button"
        className={`smart-media-trigger ${className}`.trim()}
        onClick={() => setIsOpen(true)}
        aria-label={`Open image: ${alt || 'uploaded media'}`}
      >
        <div className={`smart-media-frame ${sizeClass} ${frameClassName}`.trim()}>
          <img
            src={src}
            alt={alt}
            className={`smart-media-image ${imageClassName}`.trim()}
            loading={loading}
            onError={handleError}
          />
          {overlay ? <div className="smart-media-overlay">{overlay}</div> : null}
          {showHint ? <span className="smart-media-hint">View photo</span> : null}
        </div>
      </button>

      {isOpen ? (
        <div className="smart-media-viewer" role="dialog" aria-modal="true" aria-label={alt || 'Image preview'}>
          <button type="button" className="smart-media-viewer__backdrop" onClick={() => setIsOpen(false)} aria-label="Close image preview" />
          <div className="smart-media-viewer__topbar">
            <div>
              <strong>{alt || 'Photo'}</strong>
              <span>Tap outside or press Esc to close</span>
            </div>
            <button type="button" className="smart-media-viewer__close" onClick={() => setIsOpen(false)} aria-label="Close image preview">
              <X size={22} />
            </button>
          </div>
          <div className="smart-media-viewer__stage">
            <img src={src} alt={alt} className="smart-media-viewer__image" />
          </div>
        </div>
      ) : null}
    </>
  );
}

export default SmartMediaImage;
