export const USER_LOCATION_MARKER_CSS = `
  .user-marker-shell {
    width: 44px;
    height: 44px;
    position: relative;
  }
  .user-marker-rotate {
    position: absolute;
    inset: 0;
    transition: transform 0.25s ease;
  }
  .user-marker-beam {
    position: absolute;
    left: 50%;
    top: 4px;
    width: 24px;
    height: 24px;
    margin-left: -12px;
    background: linear-gradient(180deg, rgba(37, 99, 235, 0.55) 0%, rgba(37, 99, 235, 0) 100%);
    clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
    transform-origin: 50% 100%;
  }
  .user-marker-dot {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 14px;
    height: 14px;
    margin: -7px 0 0 -7px;
    border-radius: 50%;
    background: rgb(37, 99, 235);
    border: 2px solid rgb(255, 255, 255);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.22);
    z-index: 2;
  }
`

export const USER_LOCATION_MARKER_SCRIPT = `
  var userMarker = null;

  function createUserLocationIcon(heading) {
    var hasHeading = heading != null && heading >= 0;
    var rotation = hasHeading ? Number(heading) : 0;
    var beamHtml = hasHeading
      ? '<div class="user-marker-beam"></div>'
      : '';
    return L.divIcon({
      className: '',
      html:
        '<div class="user-marker-shell">' +
          '<div class="user-marker-rotate" style="transform:rotate(' + rotation + 'deg)">' +
            beamHtml +
          '</div>' +
          '<div class="user-marker-dot"></div>' +
        '</div>',
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });
  }

  window.updateUserLocation = function(payload) {
    var user = payload && payload.user;
    if (!user || user.latitude == null || user.longitude == null) {
      if (userMarker) {
        map.removeLayer(userMarker);
        userMarker = null;
      }
      return;
    }

    var latlng = [Number(user.latitude), Number(user.longitude)];
    var icon = createUserLocationIcon(user.heading);
    if (!userMarker) {
      userMarker = L.marker(latlng, { icon: icon, zIndexOffset: 1000 }).addTo(map);
    } else {
      userMarker.setLatLng(latlng);
      userMarker.setIcon(icon);
    }
  };
`

export function resolveDeviceHeading(heading) {
  if (!heading) return null
  if (typeof heading.trueHeading === 'number' && heading.trueHeading >= 0) {
    return heading.trueHeading
  }
  if (typeof heading.magHeading === 'number' && heading.magHeading >= 0) {
    return heading.magHeading
  }
  return null
}
