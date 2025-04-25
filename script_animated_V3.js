
let map = L.map('map').setView([35.1796, 129.0756], 4);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// 전체 경로 확대
let bounds = L.latLngBounds(routeCoordinates);
map.fitBounds(bounds);

const shipIcon = L.icon({
  iconUrl: 'container_ship.png',
  iconSize: [32, 32]
});

L.polyline(routeCoordinates, { color: "blue" }).addTo(map);
let ship = L.marker(routeCoordinates[0], { icon: shipIcon }).addTo(map);
let direction = 'forward';
let activeRoute = routeCoordinates;
let currentIndex = 0;
let animationId = null;
let paused = false;

let visualDurations = {
  13: 240000, // Slow: 4분
  17: 180000, // Normal: 3분
  20: 120000  // Fast: 2분
};

let speed = 17;

function setSpeed(knots) {
  speed = knots;
  updateDistanceInfo();
}

function startRoute(dir) {
  direction = dir;
  activeRoute = direction === 'forward' ? routeCoordinates : [...routeCoordinates].reverse();
  currentIndex = 0;
  ship.setLatLng(activeRoute[0]);
  paused = false;
  updateDistanceInfo();
  animateRoute();
}

function pauseShip() {
  paused = true;
  if (animationId) cancelAnimationFrame(animationId);
}

function resumeShip() {
  if (!paused) return;
  paused = false;
  animateRoute();
}

// 거리 계산
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = x => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function updateDistanceInfo() {
  let total = 0;
  for (let i = 0; i < routeCoordinates.length - 1; i++) {
    const [lat1, lon1] = routeCoordinates[i];
    const [lat2, lon2] = routeCoordinates[i + 1];
    total += haversine(lat1, lon1, lat2, lon2);
  }
  const days = total / (speed * 1.852 * 24);
  document.getElementById("infoBar").innerText =
    `Distance: ${total.toFixed(1)} km\nEstimated Duration: ${days.toFixed(1)} days @ ${speed} Kn`;
}

// 애니메이션 보간 이동
function animateRoute() {
  const totalDuration = visualDurations[speed];
  const totalDistance = calculateTotalDistance(activeRoute);
  let segmentStart = currentIndex;

  function moveSegment() {
    if (segmentStart >= activeRoute.length - 1 || paused) return;

    const from = L.latLng(activeRoute[segmentStart]);
    const to = L.latLng(activeRoute[segmentStart + 1]);
    const segmentDistance = haversine(from.lat, from.lng, to.lat, to.lng);
    const segmentDuration = totalDuration * (segmentDistance / totalDistance);
    const startTime = performance.now();

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / segmentDuration, 1);
      const lat = from.lat + (to.lat - from.lat) * progress;
      const lng = from.lng + (to.lng - from.lng) * progress;
      ship.setLatLng([lat, lng]);

      if (progress < 1 && !paused) {
        animationId = requestAnimationFrame(step);
      } else {
        segmentStart++;
        currentIndex = segmentStart;
        if (!paused) moveSegment();
      }
    }

    requestAnimationFrame(step);
  }

  moveSegment();
}

function calculateTotalDistance(coords) {
  let d = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    d += haversine(coords[i][0], coords[i][1], coords[i + 1][0], coords[i + 1][1]);
  }
  return d;
}

// 국기 마커 표시
flagMarkers.forEach(flag => {
  let icon = L.icon({
    iconUrl: 'flag/' + flag.file,
    iconSize: [16, 11]
  });
  L.marker([flag.lat, flag.lng], { icon }).addTo(map)
    .bindTooltip(flag.country, { permanent: false, direction: 'top' });
});
