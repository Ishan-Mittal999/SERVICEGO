import React, { useEffect, useRef } from 'react';

interface LeafletMapContentProps {
  containerRef: React.RefObject<HTMLDivElement>;
  lat: number;
  lng: number;
  onMoveEnd?: (lat: number, lng: number) => void;
}

export const LeafletMapContent: React.FC<LeafletMapContentProps> = ({
  containerRef,
  lat,
  lng,
  onMoveEnd,
}) => {
  const mapRef = useRef<any>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    if (!containerRef.current) return;

    // Only import Leaflet when component mounts
    (async () => {
      try {
        const L = await import('leaflet');

        if (!isMountedRef.current || !containerRef.current) return;

        // Initialize map only once
        if (!mapRef.current) {
          const map = L.map(containerRef.current, {
            zoomControl: false,
          }).setView([lat, lng], 16);

          // Add tile layer
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19,
          }).addTo(map);

          // Handle map events
          if (onMoveEnd) {
            map.on('moveend', () => {
              const center = map.getCenter();
              onMoveEnd(center.lat, center.lng);
            });
          }

          mapRef.current = map;

          // Invalidate size after initialization
          setTimeout(() => {
            mapRef.current?.invalidateSize();
          }, 100);
        }
      } catch (error) {
        console.error('Failed to load Leaflet:', error);
      }
    })();

    return () => {
      isMountedRef.current = false;
    };
  }, [containerRef, onMoveEnd]);

  // Update map view when coordinates change
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView([lat, lng], mapRef.current.getZoom());
    }
  }, [lat, lng]);

  return null;
};

export default LeafletMapContent;
