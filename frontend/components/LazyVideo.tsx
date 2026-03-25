"use client";

import { useState, useEffect, useRef } from "react";

interface LazyVideoProps {
  src: string;
  poster?: string;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  playsInline?: boolean;
  onReady?: () => void;
  onError?: () => void;
}

export default function LazyVideo({
  src,
  poster,
  className = "",
  autoPlay = true,
  muted = true,
  loop = true,
  playsInline = true,
  onReady,
  onError,
}: LazyVideoProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    // Intersection Observer to load video when it's near viewport
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isLoaded && !hasError) {
            // Start loading the video
            videoElement.load();
            setIsLoaded(true);
          }
        });
      },
      {
        rootMargin: "200px", // Start loading 200px before entering viewport
        threshold: 0.1,
      }
    );

    observerRef.current.observe(videoElement);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isLoaded, hasError]);

  const handleLoadedData = () => {
    if (onReady) onReady();
  };

  const handleError = () => {
    setHasError(true);
    if (onError) onError();
  };

  return (
    <video
      ref={videoRef}
      className={`${className} ${isLoaded ? "is-loaded" : "is-loading"}`}
      poster={poster}
      autoPlay={autoPlay && isLoaded}
      muted={muted}
      loop={loop}
      playsInline={playsInline}
      preload="none"
      onLoadedData={handleLoadedData}
      onError={handleError}
    >
      <source src={src} type="video/webm" />
      Your browser does not support the video tag.
    </video>
  );
}