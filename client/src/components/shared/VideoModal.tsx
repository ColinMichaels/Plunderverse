import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  title?: string;
}

export function VideoModal({ isOpen, onClose, videoUrl, title }: VideoModalProps) {
  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);
  
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  // Convert regular YouTube URL to embed URL if needed
  const getEmbedUrl = (url: string) => {
    // Handle different YouTube URL formats
    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    } else if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    // Assume it's already an embed URL
    return url;
  };
  
  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" />
      
      {/* Modal Content */}
      <div 
        className="relative w-full max-w-6xl mx-4 md:mx-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900/95 border border-cyan-400/30 border-b-0 rounded-t-lg p-4 flex items-center justify-between">
          {title && (
            <h2 className="text-xl font-bold text-cyan-400">
              {title}
            </h2>
          )}
          <button
            onClick={onClose}
            className="ml-auto p-2 hover:bg-slate-800 rounded-lg transition-colors group"
            aria-label="Close video"
          >
            <X className="w-6 h-6 text-slate-400 group-hover:text-cyan-400 transition-colors" />
          </button>
        </div>
        
        {/* Video Container */}
        <div className="relative bg-slate-900 border border-cyan-400/30 border-t-0 rounded-b-lg overflow-hidden">
          <div className="relative pt-[56.25%]"> {/* 16:9 Aspect Ratio */}
            <iframe
              src={getEmbedUrl(videoUrl)}
              title={title || 'Video'}
              className="absolute top-0 left-0 w-full h-full"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      </div>
    </div>
  );
}