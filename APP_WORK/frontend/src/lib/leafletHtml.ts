export type LMarker = { lat: number; lng: number; color: string; r?: number; title: string; sub?: string };

export function leafletHtml(
  markers: LMarker[],
  opts: { center?: [number, number]; zoom?: number; dark?: boolean } = {},
): string {
  const center = opts.center || [22.9, 79.5];
  const zoom = opts.zoom ?? 5;
  const dark = !!opts.dark;
  const tiles = dark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
  const bg = dark ? "#0D1420" : "#F7F9FC";
  return `<!DOCTYPE html><html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{height:100%;width:100%;margin:0;padding:0;background:${bg};} .leaflet-popup-content{font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:13px;}</style>
</head><body><div id="map"></div><script>
var map=L.map('map',{zoomControl:true,attributionControl:false}).setView([${center[0]},${center[1]}],${zoom});
L.tileLayer('${tiles}',{maxZoom:19,subdomains:'abcd'}).addTo(map);
var data=${JSON.stringify(markers)};
data.forEach(function(m){
  L.circleMarker([m.lat,m.lng],{radius:m.r||9,weight:3,color:'#ffffff',fillColor:m.color,fillOpacity:0.95})
   .addTo(map).bindPopup('<b>'+m.title+'</b>'+(m.sub?'<br/>'+m.sub:''));
});
</script></body></html>`;
}
