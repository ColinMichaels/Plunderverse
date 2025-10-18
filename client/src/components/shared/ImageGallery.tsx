import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

export interface GalleryImage {
  src: string;
  alt: string;
  caption?: string;
}

interface ImageGalleryProps {
  images: GalleryImage[];
  columns?: number;
  showCaptions?: boolean;
}

export function ImageGallery({ images, columns = 3, showCaptions = true }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  
  const openLightbox = (index: number) => {
    setSelectedIndex(index);
    document.body.style.overflow = 'hidden';
  };
  
  const closeLightbox = () => {
    setSelectedIndex(null);
    document.body.style.overflow = 'unset';
  };
  
  const navigateImage = (direction: 'prev' | 'next') => {
    if (selectedIndex === null) return;
    
    const newIndex = direction === 'next'
      ? (selectedIndex + 1) % images.length
      : (selectedIndex - 1 + images.length) % images.length;
    
    setSelectedIndex(newIndex);
  };
  
  // Keyboard navigation
  React.useEffect(() => {
    if (selectedIndex === null) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') navigateImage('next');
      if (e.key === 'ArrowLeft') navigateImage('prev');
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex]);
  
  return (
    <>
      {/* Gallery Grid */}
      <div 
        className={`grid gap-4`}
        style={{
          gridTemplateColumns: `repeat(${columns}, 1fr)`
        }}
      >
        {images.map((image, index) => (
          <div 
            key={index}
            className="group relative cursor-pointer overflow-hidden rounded-lg bg-slate-800 transition-all duration-300 hover:scale-105 hover:shadow-2xl"
            onClick={() => openLightbox(index)}
          >
            {/* Thumbnail Image */}
            <img
              src={image.src}
              alt={image.alt}
              className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-110"
            />
            
            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <div className="absolute bottom-4 left-4 right-4">
                {showCaptions && image.caption && (
                  <p className="text-sm text-white/90 line-clamp-2">
                    {image.caption}
                  </p>
                )}
                <p className="text-xs text-cyan-400 mt-2 uppercase tracking-wider">
                  Click to expand
                </p>
              </div>
            </div>
            
            {/* Border Effect */}
            <div className="absolute inset-0 border-2 border-cyan-400/0 rounded-lg transition-all duration-300 group-hover:border-cyan-400/50" />
          </div>
        ))}
      </div>
      
      {/* Lightbox */}
      {selectedIndex !== null && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md"
          onClick={closeLightbox}
        >
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-10 p-2 bg-slate-900/80 hover:bg-slate-800 rounded-lg transition-all group"
            aria-label="Close gallery"
          >
            <X className="w-6 h-6 text-slate-400 group-hover:text-cyan-400" />
          </button>
          
          {/* Previous Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigateImage('prev');
            }}
            className="absolute left-4 z-10 p-3 bg-slate-900/80 hover:bg-slate-800 rounded-lg transition-all group"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-6 h-6 text-slate-400 group-hover:text-cyan-400" />
          </button>
          
          {/* Next Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigateImage('next');
            }}
            className="absolute right-4 z-10 p-3 bg-slate-900/80 hover:bg-slate-800 rounded-lg transition-all group"
            aria-label="Next image"
          >
            <ChevronRight className="w-6 h-6 text-slate-400 group-hover:text-cyan-400" />
          </button>
          
          {/* Image Container */}
          <div 
            className="relative max-w-[90vw] max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Full Size Image */}
            <img
              src={images[selectedIndex].src}
              alt={images[selectedIndex].alt}
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
            />
            
            {/* Caption */}
            {showCaptions && images[selectedIndex].caption && (
              <div className="mt-4 max-w-2xl text-center bg-slate-900/90 px-6 py-3 rounded-lg">
                <p className="text-white/90">
                  {images[selectedIndex].caption}
                </p>
              </div>
            )}
            
            {/* Image Counter */}
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-sm text-slate-400">
              {selectedIndex + 1} / {images.length}
            </div>
          </div>
        </div>
      )}
    </>
  );
}