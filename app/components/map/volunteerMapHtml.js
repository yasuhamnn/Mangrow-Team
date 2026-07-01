import {
  USER_LOCATION_MARKER_CSS,
  USER_LOCATION_MARKER_SCRIPT,
} from '../../utils/mapUserLocationMarker'

export function buildVolunteerMapHtml(reports, mapType) {
  const reportsJson = JSON.stringify(reports || [])
  const safeMapType = ['standard', 'satellite'].includes(mapType) ? mapType : 'standard'
  const isSatellite = safeMapType === 'satellite'

  return `
  <!DOCTYPE html>
  <html>
  <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
      <style>
          html, body, #map { height: 100%; margin: 0; padding: 0; }
          .leaflet-container { background: rgb(232, 239, 227); }
          .leaflet-control-zoom { display: none !important; }
          .leaflet-tile-pane { transition: opacity 0.35s ease; }
          .custom-marker { width: 12px; height: 12px; border-radius: 50%; background: rgb(239, 68, 68); }
          .custom-marker-green { width: 12px; height: 12px; border-radius: 50%; background: rgb(45, 160, 49); }
          .popup-wrap { min-width: 180px; font-family: sans-serif; }
          .popup-title { font-size: 13px; font-weight: 700; color: rgb(16, 32, 15); margin-bottom: 4px; }
          .popup-address { font-size: 12px; color: rgb(85, 85, 85); line-height: 1.4; margin-bottom: 8px; }
          .popup-link {
            display: inline-block; font-size: 12px; font-weight: 700; color: rgb(61, 170, 43);
            text-decoration: none; padding: 6px 0; border-top: 1px solid rgb(232, 236, 221); width: 100%;
          }
          ${USER_LOCATION_MARKER_CSS}
      </style>
  </head>
  <body>
      <div id="map"></div>
      <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
      <script>
          var volunteerReports = ${reportsJson};
          var map = L.map('map', { zoomControl: false, minZoom: 10, maxZoom: 19, attributionControl: false });

          var defaultCenter = [11.0519, 124.0055];
          var center = defaultCenter;
          if (volunteerReports && volunteerReports.length > 0) {
            var first = volunteerReports.find(function(r) { return r && r.latitude != null && r.longitude != null; });
            if (first) center = [Number(first.latitude), Number(first.longitude)];
          }
          map.setView(center, 14);

          var tileUrls = {
            standard: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          };

          var standardLayer = L.tileLayer(tileUrls.standard, { maxZoom: 19 }).addTo(map);
          var satelliteLayer = null;
          var mapReadySent = false;

          function notifyMapReady() {
            if (mapReadySent) return;
            mapReadySent = true;
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' }));
            }
          }

          if (${isSatellite}) {
            satelliteLayer = L.tileLayer(tileUrls.satellite, { maxZoom: 19, opacity: 0 }).addTo(map);
            satelliteLayer.on('load', function() {
              satelliteLayer.setOpacity(1);
              notifyMapReady();
            });
            setTimeout(notifyMapReady, 12000);
          } else {
            map.whenReady(notifyMapReady);
          }

          var redIcon = L.divIcon({
            className: '',
            html: '<div class="custom-marker"></div>',
            iconSize: [12, 12],
            iconAnchor: [6, 6]
          });
          var greenIcon = L.divIcon({
            className: '',
            html: '<div class="custom-marker-green"></div>',
            iconSize: [12, 12],
            iconAnchor: [6, 6]
          });

          var markerGroup = L.layerGroup().addTo(map);

          function escapeHtml(str) {
            return String(str || '')
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;');
          }

          function openReport(id) {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'openReport', id: id }));
            }
          }

          function renderMarkers(reports) {
            markerGroup.clearLayers();
            (reports || []).forEach(function(r) {
              if (!r || r.latitude == null || r.longitude == null) return;
              var coords = [Number(r.latitude), Number(r.longitude)];
              var isHealthy = String(r.health_status || '').toLowerCase() === 'healthy';
              var icon = isHealthy ? greenIcon : redIcon;
              var address = r.formatted_address || r.location_text || (r.latitude + ', ' + r.longitude);
              var species = r.species || 'Mangrove Report';

              var popupHtml =
                '<div class="popup-wrap">' +
                  '<div class="popup-title">' + escapeHtml(species) + '</div>' +
                  '<div class="popup-address">' + escapeHtml(address) + '</div>' +
                  '<a class="popup-link" href="#" onclick="openReport(\\'' + r.id + '\\'); return false;">' +
                    'View report details →' +
                  '</a>' +
                '</div>';

              L.marker(coords, { icon: icon })
                .addTo(markerGroup)
                .bindPopup(popupHtml, { closeButton: true, maxWidth: 260 });
            });
          }

          window.updateMapMarkers = function(reports) {
            volunteerReports = reports || [];
            renderMarkers(volunteerReports);
          };

          ${USER_LOCATION_MARKER_SCRIPT}

          renderMarkers(volunteerReports);
      </script>
  </body>
  </html>
  `
}
