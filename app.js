const geojsonUrl = "https://amenities-api.onrender.com/amenities";

require([
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/GeoJSONLayer"
], function(Map, MapView, GeoJSONLayer) {

  const map = new Map({ basemap: "streets-vector" });
  const view = new MapView({
    container: "viewDiv",
    map: map,
    center: [54.37, 24.47],
    zoom: 12
  });

  // Base layer (all points)
  let baseLayer = new GeoJSONLayer({
    url: geojsonUrl,
    renderer: {
      type: "simple",
      symbol: { type: "simple-marker", color: "red", size: 8, outline: { color: "white", width: 1 } }
    },
    popupTemplate: { title: "{name}", content: "Category: {category}<br>Type: {type}" }
  });
  map.add(baseLayer);

  const searchInput = document.getElementById("searchInput");
  const resultsList = document.getElementById("resultsList");

  let filteredLayer = null;

  async function fetchAmenities() {
    const res = await fetch(geojsonUrl);
    const data = await res.json();
    return data.features;
  }

  async function updateResults() {
    const query = searchInput.value.toLowerCase();
    const features = await fetchAmenities();

    const matches = features.filter(f =>
      f.properties.name.toLowerCase().includes(query) ||
      f.properties.type.toLowerCase().includes(query) ||
      f.properties.category.toLowerCase().includes(query)
    );

    resultsList.innerHTML = "";
    matches.forEach(f => {
      const div = document.createElement("div");
      div.textContent = `${f.properties.name} (${f.properties.type})`;
      div.addEventListener("click", () => {
        if (filteredLayer) map.remove(filteredLayer);
        map.remove(baseLayer);

        filteredLayer = new GeoJSONLayer({
          url: "data:application/json," + encodeURIComponent(JSON.stringify({type:"FeatureCollection", features:[f]})),
          renderer: {
            type: "simple",
            symbol: { type: "simple-marker", color: "blue", size: 12, outline: { color: "white", width: 2 } }
          },
          popupTemplate: { title: "{name}", content: "Category: {category}<br>Type: {type}" }
        });
        map.add(filteredLayer);

        const coords = f.geometry.coordinates;
        view.goTo({ center: coords, zoom: 15 });
      });
      resultsList.appendChild(div);
    });

    if (query === "") {
      if (filteredLayer) map.remove(filteredLayer);
      map.add(baseLayer);
      resultsList.innerHTML = "";
    }
  }

  searchInput.addEventListener("input", updateResults);
});
