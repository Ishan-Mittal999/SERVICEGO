import dynamic from 'next/dynamic';
import React from 'react';

// Lazy load the Leaflet map component only when needed
// This prevents loading the entire Leaflet library unless the map is actually used
const LeafletMap = dynamic(
  () => import('./LeafletMapContent'),
  {
    loading: () => <div className="map-loading">Loading map...</div>,
    ssr: false, // Disable server-side rendering for Leaflet
  }
);

interface LazyMapProps {
  containerRef: React.RefObject<HTMLDivElement>;
  lat: number;
  lng: number;
  onMoveEnd?: (lat: number, lng: number) => void;
}

export const LazyMap: React.FC<LazyMapProps> = ({
  containerRef,
  lat,
  lng,
  onMoveEnd,
}) => {
  return <LeafletMap containerRef={containerRef} lat={lat} lng={lng} onMoveEnd={onMoveEnd} />;
};

export default LazyMap;
