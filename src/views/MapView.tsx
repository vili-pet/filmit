import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useApp } from "../hooks/useApp";
import { formatCardDateEN, formatTime } from "../lib/dates";
import type { Clip, Coord, Place } from "../lib/types";
import type { Route } from "../lib/route";

const DEFAULT_CENTER: Coord = { lat: 60.1699, lng: 24.9384 };
const MAX_MARKERS = 400;

/**
 * Resolves where a clip is drawn. Exact fixes stay private unless the user
 * opted in or the clip has no place to snap to.
 */
function clipPosition(clip: Clip, placesById: Map<string, Place>, exactAllowed: boolean): Coord | null {
  const place = clip.placeId ? placesById.get(clip.placeId) : undefined;
  if (clip.coord && (exactAllowed || !place)) return clip.coord;
  if (place) return { lat: place.lat, lng: place.lng };
  return null;
}

export function MapView({ onNavigate }: { onNavigate: (route: Route) => void }) {
  const { clips, places, settings } = useApp();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);
  const hasFittedRef = useRef(false);
  const navigateRef = useRef(onNavigate);
  navigateRef.current = onNavigate;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng],
      zoom: 13,
      zoomControl: true,
    });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    layersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    // Android WebView measures the flex container before layout settles;
    // without this the map renders half grey until the next interaction.
    requestAnimationFrame(() => map.invalidateSize());
    return () => {
      mapRef.current = null;
      layersRef.current = null;
      map.remove();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layers = layersRef.current;
    if (!map || !layers) return;

    const placesById = new Map(places.map((place) => [place.id, place]));
    layers.clearLayers();

    for (const place of places) {
      L.circle([place.lat, place.lng], {
        radius: place.radiusM,
        className: "map-place-ring",
      })
        .bindTooltip(place.name)
        .addTo(layers);
      L.circleMarker([place.lat, place.lng], { radius: 5, className: "map-place-dot" }).addTo(layers);
    }

    const drawn = clips.slice(0, MAX_MARKERS);
    let visible = 0;
    for (const clip of drawn) {
      const position = clipPosition(clip, placesById, settings.showExactLocation);
      if (!position) continue;
      visible += 1;
      const marker = L.circleMarker([position.lat, position.lng], {
        radius: 7,
        className: clip.isDemo ? "map-clip-dot is-demo" : "map-clip-dot",
      });
      const content = document.createElement("div");
      content.className = "map-popup";
      const when = document.createElement("p");
      when.textContent = `${formatCardDateEN(clip.dateKey)} · ${formatTime(clip.createdAt)}`;
      const where = document.createElement("p");
      where.className = "map-popup-place";
      where.textContent = clip.placeLabel ?? "No place";
      const open = document.createElement("button");
      open.type = "button";
      open.textContent = "Avaa päivä";
      open.addEventListener("click", () => {
        navigateRef.current({ view: "memories", mode: "list", dateKey: clip.dateKey });
      });
      content.append(when, where, open);
      marker.bindPopup(content);
      marker.addTo(layers);
    }

    if (!hasFittedRef.current && (places.length > 0 || visible > 0)) {
      hasFittedRef.current = true;
      const bounds = L.latLngBounds(
        places.map((place) => [place.lat, place.lng] as [number, number]),
      );
      for (const clip of drawn) {
        const position = clipPosition(clip, placesById, true);
        if (position) bounds.extend([position.lat, position.lng]);
      }
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [32, 32], maxZoom: 15 });
    }

    const summary = containerRef.current?.querySelector<HTMLElement>("[data-map-summary]");
    if (summary) {
      summary.textContent = `${places.length} paikkaa · ${visible} filmiä kartalla (yhteensä ${clips.length})`;
    }
  }, [clips, places, settings.showExactLocation]);

  return (
    <section className="view map-view">
      <header className="map-header">
        <h1>Your map</h1>
        <p className="lede">
          Places, their reach and every captured moment — drawn only from this device.
        </p>
      </header>
      <div className="map-canvas" ref={containerRef} />
      <p className="map-summary" data-map-summary>
        {places.length} paikkaa · 0 filmiä kartalla (yhteensä {clips.length})
      </p>
    </section>
  );
}
