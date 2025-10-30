// Auto-detect environment
const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

const geojsonUrl = isLocal
  ? "http://localhost:3000/amenities"
  : "https://amenities-api.onrender.com/amenities";

console.log(`Running in ${isLocal ? "LOCAL" : "LIVE"} mode`);
console.log(`Fetching GeoJSON from: ${geojsonUrl}`);

require([
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/GeoJSONLayer"
], function (Map, MapView, GeoJSONLayer) {

  const map = new Map({ basemap: "streets-vector" });

  const view = new MapView({
    container: "viewDiv",
    map: map,
    center: [54.37, 24.47], // Abu Dhabi
    zoom: 10
  });

  let baseLayer = new GeoJSONLayer({
    url: geojsonUrl,
    renderer: {
      type: "simple",
      symbol: {
        type: "simple-marker",
        color: "red",
        size: 8,
        outline: { color: "white", width: 1 }
      }
    },
    popupTemplate: { title: "{name}", content: "Category: {category}<br>Type: {type}" }
  });
  map.add(baseLayer);

  let filteredLayer = null;
  let nearbyLayer = null;

  const searchInput = document.getElementById("searchInput");
  const resultsList = document.getElementById("resultsList");

  async function fetchAmenities() {
    const res = await fetch(geojsonUrl);
    const data = await res.json();
    return data.features;
  }

  async function updateResults() {
    const query = searchInput.value.trim().toLowerCase();
    const features = await fetchAmenities();

    const matches = features.filter(f =>
      f.properties.name?.toLowerCase().includes(query) ||
      f.properties.type?.toLowerCase().includes(query) ||
      f.properties.category?.toLowerCase().includes(query)
    );

    resultsList.innerHTML = "";

    if (query === "") {
      if (filteredLayer) map.remove(filteredLayer);
      if (nearbyLayer) map.remove(nearbyLayer);
      if (!map.layers.includes(baseLayer)) map.add(baseLayer);
      return;
    }

    matches.forEach(f => {
      const div = document.createElement("div");
      div.textContent = `${f.properties.name} (${f.properties.type})`;

      div.addEventListener("click", async () => {
        // Clear input and results
        searchInput.value = "";
        resultsList.innerHTML = "";

        if (filteredLayer) map.remove(filteredLayer);
        if (nearbyLayer) map.remove(nearbyLayer);
        map.remove(baseLayer);

        // Highlight selected feature
        filteredLayer = new GeoJSONLayer({
          url: "data:application/json," + encodeURIComponent(JSON.stringify({
            type: "FeatureCollection",
            features: [f]
          })),
          renderer: {
            type: "simple",
            symbol: { type: "simple-marker", color: "blue", size: 12, outline: { color: "white", width: 2 } }
          },
          popupTemplate: { title: "{name}", content: "Category: {category}<br>Type: {type}" }
        });
        map.add(filteredLayer);

        const coords = f.geometry.coordinates;
        view.goTo({ center: coords, zoom: 15 });

        // Find nearby (~1km)
        const allFeatures = await fetchAmenities();
        const nearby = allFeatures.filter(f2 => {
          if (!f2.geometry?.coordinates) return false;
          const dx = coords[0] - f2.geometry.coordinates[0];
          const dy = coords[1] - f2.geometry.coordinates[1];
          const dist = Math.sqrt(dx * dx + dy * dy);
          return dist < 0.01 && f2.properties.name !== f.properties.name;
        });

        // Add nearby features (green)
        if (nearby.length > 0) {
          nearbyLayer = new GeoJSONLayer({
            url: "data:application/json," + encodeURIComponent(JSON.stringify({
              type: "FeatureCollection",
              features: nearby
            })),
            renderer: {
              type: "simple",
              symbol: { type: "simple-marker", color: "green", size: 10, outline: { color: "white", width: 1 } }
            },
            popupTemplate: { title: "{name}", content: "Nearby place<br>Category: {category}<br>Type: {type}" }
          });
          map.add(nearbyLayer);
        }
      });

      resultsList.appendChild(div);
    });
  }

  searchInput.addEventListener("input", updateResults);
});
