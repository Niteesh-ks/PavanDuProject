import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export function MapRadar({ userLocation, radiusKm, events = [], colleges = [], onSelectEvent }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const radiusCircleRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const centerLat = userLocation?.lat || 12.9716;
    const centerLon = userLocation?.lon || 77.5946;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLon],
        zoom: 12,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    } else {
      mapInstanceRef.current.setView([centerLat, centerLon], radiusKm <= 5 ? 13 : radiusKm <= 15 ? 12 : 11);
    }

    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    markersLayer.clearLayers();

    // 1. User Location Marker & Radius Circle (UNFOLD Acid Yellow & Forest Green)
    if (userLocation?.lat && userLocation?.lon) {
      const userIcon = L.divIcon({
        className: 'user-marker-icon',
        html: `
          <div style="width: 22px; height: 22px; background-color: #E2FF54; border: 3px solid #151B17; border-radius: 50%; box-shadow: 0 0 16px rgba(226,255,84,0.8);"></div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      L.marker([userLocation.lat, userLocation.lon], { icon: userIcon })
        .bindPopup('<strong>Your Location Anchor</strong>')
        .addTo(markersLayer);

      if (radiusCircleRef.current) {
        map.removeLayer(radiusCircleRef.current);
      }
      radiusCircleRef.current = L.circle([userLocation.lat, userLocation.lon], {
        radius: (radiusKm || 10) * 1000,
        color: '#294C38',
        fillColor: '#B8D8A5',
        fillOpacity: 0.12,
        weight: 2,
        dashArray: '5, 8',
      }).addTo(map);
    }

    // 2. Event & Collegiate Nodes Markers
    events.forEach((evt) => {
      if (!evt.latitude || !evt.longitude) return;

      const eventMarkerIcon = L.divIcon({
        className: 'unfold-pin-icon',
        html: `
          <div style="background: #294C38; color: #E2FF54; padding: 4px 9px; border-radius: 12px; font-size: 11px; font-weight: 800; font-family: 'Manrope', sans-serif; box-shadow: 0 3px 10px rgba(0,0,0,0.4); border: 2px solid #E2FF54; white-space: nowrap; cursor: pointer;">
            ${evt.collegeCode || 'UNFOLD'}
          </div>
        `,
        iconSize: [44, 26],
        iconAnchor: [22, 13],
      });

      const marker = L.marker([evt.latitude, evt.longitude], { icon: eventMarkerIcon }).addTo(markersLayer);

      const popupContent = document.createElement('div');
      popupContent.style.fontFamily = "'Manrope', sans-serif";
      popupContent.style.padding = '6px';
      popupContent.innerHTML = `
        <div style="font-size: 10px; color: #56675B; text-transform: uppercase; font-weight: 800;">${evt.collegeName || ''}</div>
        <div style="font-weight: 800; font-size: 13px; margin: 3px 0 5px; color: #151B17;">${evt.title}</div>
        <div style="font-size: 11px; color: #294C38; margin-bottom: 8px;">${evt.venue || ''}</div>
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #DFD7C4; padding-top: 6px;">
          <span style="font-weight: 800; font-size: 11px; color: #294C38;">${evt.isPaid ? '₹' + evt.feeInr : 'FREE PASS'}</span>
          <button id="btn-view-${evt.id}" style="background: #E2FF54; color: #151B17; border: 1.5px solid #151B17; padding: 3px 9px; border-radius: 4px; font-size: 10px; font-weight: 800; cursor: pointer;">View Event</button>
        </div>
      `;

      popupContent.querySelector(`#btn-view-${evt.id}`)?.addEventListener('click', () => {
        if (onSelectEvent) onSelectEvent(evt);
      });

      marker.bindPopup(popupContent);
    });
  }, [userLocation, radiusKm, events, colleges, onSelectEvent]);

  return (
    <div
      ref={mapContainerRef}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '480px',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        border: '1.5px solid var(--border-subtle)',
        zIndex: 1,
      }}
    />
  );
}
