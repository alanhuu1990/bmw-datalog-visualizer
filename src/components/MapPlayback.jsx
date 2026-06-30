import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const ROUTE_STYLE = { color: '#4ade80', weight: 4, opacity: 0.85 };
const GHOST_STYLE = { color: '#374151', weight: 3, opacity: 0.45, dashArray: '6 8' };

function toLatLngs(points) {
  return points.map(p => [p.lat, p.lon]);
}

export default function MapPlayback({
  points,
  currentPosition,
  revealPath,
  height = 280,
  emptyHint,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef({ full: null, reveal: null, marker: null });

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
    });
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
      layersRef.current = { full: null, reveal: null, marker: null };
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !points?.length) return;

    const { full, reveal, marker } = layersRef.current;
    if (full) full.remove();
    if (reveal) reveal.remove();
    if (marker) marker.remove();

    const bounds = L.latLngBounds(toLatLngs(points));
    map.fitBounds(bounds, { padding: [24, 24] });

    layersRef.current.full = L.polyline(toLatLngs(points), GHOST_STYLE).addTo(map);
    layersRef.current.reveal = null;
    layersRef.current.marker = null;
  }, [points]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !points?.length) return;

    const { full, reveal, marker } = layersRef.current;

    if (reveal) reveal.remove();
    if (marker) marker.remove();

    if (revealPath?.length >= 2) {
      layersRef.current.reveal = L.polyline(toLatLngs(revealPath), ROUTE_STYLE).addTo(map);
    } else {
      layersRef.current.reveal = null;
    }

    if (currentPosition) {
      const icon = L.divIcon({
        className: '',
        html: '<div style="width:14px;height:14px;background:#f8fafc;border:2px solid #4ade80;border-radius:50%;box-shadow:0 0 8px #4ade8088;margin:-7px 0 0 -7px"></div>',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      layersRef.current.marker = L.marker(
        [currentPosition.lat, currentPosition.lon],
        { icon, zIndexOffset: 1000 },
      ).addTo(map);
    } else {
      layersRef.current.marker = null;
    }

    if (full) {
      full.bringToBack();
    }
  }, [points, currentPosition, revealPath]);

  if (!points?.length) {
    return (
      <div style={{
        height,
        background: '#0d1117',
        border: '1px solid #1f2937',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#6b7280',
        fontSize: 11,
      }}>
        {emptyHint || 'No GPS track loaded'}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        height,
        borderRadius: 8,
        overflow: 'hidden',
        border: '1px solid #1f2937',
        background: '#0d1117',
      }}
    />
  );
}
