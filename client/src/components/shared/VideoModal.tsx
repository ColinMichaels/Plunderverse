import React, { useEffect } from "react";
import { X } from "lucide-react";

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  title?: string;
}

export function VideoModal({
  isOpen,
  onClose,
  videoUrl,
  title,
}: VideoModalProps) {
  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Convert regular YouTube URL to embed URL if needed with autoplay
  const getEmbedUrl = (url: string) => {
    let embedUrl = "";

    // Handle different YouTube URL formats
    if (url.includes("youtube.com/watch?v=")) {
      const videoId = url.split("v=")[1]?.split("&")[0];
      embedUrl = `https://www.youtube.com/embed/${videoId}&rel=0`;
    } else if (url.includes("youtu.be/")) {
      const videoId = url.split("youtu.be/")[1]?.split("?")[0];
      embedUrl = `https://www.youtube.com/embed/${videoId}&rel=0`;
    } else {
      // Assume it's already an embed URL
      embedUrl = url;
    }

    // Add autoplay parameter (and mute to ensure autoplay works in all browsers)
    const separator = embedUrl.includes("?") ? "&" : "?";
    return `${embedUrl}${separator}autoplay=1&mute=0`;
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center animate-in fade-in duration-300"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/95 backdrop-blur-lg" />

      {/* Full Screen Video Container */}
      <div
        className="relative w-full h-full flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Close Button */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 via-black/40 to-transparent p-6">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            {title && (
              <h2 className="text-2xl font-bold text-cyan-400 drop-shadow-lg">
                {title}
              </h2>
            )}
            <button
              onClick={onClose}
              className="ml-auto p-3 bg-black/50 hover:bg-black/70 rounded-full transition-all duration-300 transform hover:scale-110 group"
              aria-label="Close video"
            >
              <X className="w-8 h-8 text-white/80 group-hover:text-cyan-400 transition-colors" />
            </button>
          </div>
        </div>

        {/* Full Screen Video */}
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="relative w-full h-full max-w-[177.77vh] max-h-[56.25vw]">
            {" "}
            {/* Maintain 16:9 aspect ratio */}
            <iframe
              src={getEmbedUrl(videoUrl)}
              title={title || "Video"}
              className="absolute top-0 left-0 w-full h-full"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
            />
          </div>
        </div>

        {/* Bottom Gradient for Better Visual */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
      </div>
    </div>
  );
}
