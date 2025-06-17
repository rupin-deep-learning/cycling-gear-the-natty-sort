// Updated app.js with preserved summary data, button state management, and safe summary rendering
let map, polyline, currentMarker;
let points = [];
let intervalId = null;
let currentIndex = 0;
let rideData = [];
let isPaused = false;
let elapsedSeconds = 0;
let windData = { speed: 0, direction: 0 };
let riderMarker;
let latestPos = null;
let latestCadence = 85; // Default cadence
let watchId = null;

const summaryDiv = document.getElementById('summary');
const cadenceStatus = document.createElement('p');
cadenceStatus.textContent = "Using default cadence (85 rpm)";
summaryDiv.parentNode.insertBefore(cadenceStatus, summaryDiv);

const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resumeBtn = document.getElementById('resumeBtn');
const stopBtn = document.getElementById('stopBtn');
const resetBtn = document.getElementById('resetBtn');

startBtn.addEventListener('click', startRide);
pauseBtn.addEventListener('click', pauseRide);
resumeBtn.addEventListener('click', resumeRide);
stopBtn.addEventListener('click', stopRide);
resetBtn.addEventListener('click', resetApp);

document.getElementById('gpxFile').addEventListener('change', handleFileUpload);
document.getElementById('mode').addEventListener('change', resetApp);

function updateButtonStates(state) {
  startBtn.disabled = true;
  pauseBtn.disabled = true;
  resumeBtn.disabled = true;
  stopBtn.disabled = true;
  resetBtn.disabled = true;

  if (state === 'idle') {
    startBtn.disabled = false;
  } else if (state === 'riding') {
    pauseBtn.disabled = false;
    stopBtn.disabled = false;
  } else if (state === 'paused') {
    resumeBtn.disabled = false;
    stopBtn.disabled = false;
  } else if (state === 'stopped') {
    resetBtn.disabled = false;
  }
}
updateButtonStates('idle');

function simulateStep() {
  if (currentIndex >= points.length - 1) {
    stopRide();
    return;
  }
  const params = getInputs();
  const pt1 = points[currentIndex];
  const gradient = smoothGradient(currentIndex);
  const speed = 10 + (gradient * 0.3);
  const power = Math.max(0, calculatePower(params, speed, gradient));
  const cadence = latestCadence;
  const gearInfo = calculateGear(params, speed, cadence);
  const timestamp = new Date().toISOString();

  updateUI(speed, power, gradient, cadence, gearInfo);
  updateRiderMarker(pt1);

  rideData.push({ timestamp, lat: pt1.lat, lon: pt1.lon, speed, power, gradient, cadence, currentGear: gearInfo.current, suggestedGear: gearInfo.suggested });
  currentIndex++;
  elapsedSeconds++;
}

function validateInputs() {
  const cadenceRange = document.getElementById("targetCadence").value;
  const [min, max] = cadenceRange.split('-').map(Number);
  if (isNaN(min) || isNaN(max) || min >= max) return false;
  const ids = ["riderWeight", "bikeWeight", "cda", "crr", "airDensity", "targetPower"];
  return ids.every(id => !isNaN(parseFloat(document.getElementById(id).value)));
}

function handleFileUpload(e) {
  const file = e.target.files[0];
  const reader = new FileReader();
  reader.onload = function (event) {
    const xml = new DOMParser().parseFromString(event.target.result, "application/xml");
    const trkpts = xml.getElementsByTagName("trkpt");
    points = Array.from(trkpts).map(p => ({
      lat: parseFloat(p.getAttribute("lat")),
      lon: parseFloat(p.getAttribute("lon")),
      ele: parseFloat(p.getElementsByTagName("ele")[0]?.textContent || 0)
    }));

    if (!map) {
      map = L.map('map').setView([points[0].lat, points[0].lon], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    }

    if (polyline) map.removeLayer(polyline);
    polyline = L.polyline(points.map(p => [p.lat, p.lon]), { color: 'blue' }).addTo(map);
    map.fitBounds(polyline.getBounds());
  };
  reader.readAsText(file);
}

function startRide() {
  if (!validateInputs()) return alert("Please fill in all fields correctly.");
  isPaused = false;
  elapsedSeconds = 0;
  currentIndex = 0;
  rideData = [];
  summaryDiv.classList.add('hidden');
  cadenceStatus.textContent = "Using default cadence (85 rpm)";
  updateButtonStates('riding');

  const mode = document.getElementById("mode").value;
  if (mode === "simulate") {
    if (points.length === 0) return alert("Please upload a valid GPX file.");
    fetchWindData();
    intervalId = setInterval(simulateStep, 1000);
  } else {
    startRealTracking();
    intervalId = setInterval(logRealTimeData, 1000);
    connectCadenceSensor();
  }
}

function pauseRide() {
  clearInterval(intervalId);
  isPaused = true;
  updateButtonStates('paused');
}

function resumeRide() {
  if (!isPaused) return;
  isPaused = false;
  const mode = document.getElementById("mode").value;
  intervalId = setInterval(mode === "simulate" ? simulateStep : logRealTimeData, 1000);
  updateButtonStates('riding');
}

function stopRide() {
  updateButtonStates('stopped');
  clearInterval(intervalId);
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }

  const preservedPoints = [...points];
  const preservedData = [...rideData];

  displaySummary(preservedPoints, preservedData);
  downloadCSV(); // ✅ This was missing
  resetApp();
}


function resetApp() {
  isPaused = false;
  intervalId = null;
  currentIndex = 0;
  elapsedSeconds = 0;
  latestPos = null;
  points = [];
  rideData = [];
  updateButtonStates('idle');

  if (riderMarker) {
    map.removeLayer(riderMarker);
    riderMarker = null;
  }
  if (polyline) {
    map.removeLayer(polyline);
    polyline = null;
  }
  document.getElementById("gpxFile").value = "";
  updateUI(0, 0, 0, 0, { current: '-', suggested: '-' });
}

function displaySummary(points, rideData) {
  const speeds = rideData.map(d => d.speed);
  const powers = rideData.map(d => d.power);
  const cadences = rideData.map(d => d.cadence);
  const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;

  summaryDiv.innerHTML = `
    <h2>Ride Summary</h2>
    <p>Average Speed: ${avg(speeds).toFixed(1)} km/h</p>
    <p>Max Speed: ${Math.max(...speeds).toFixed(1)} km/h</p>
    <p>Average Power: ${avg(powers).toFixed(0)} W</p>
    <p>Max Power: ${Math.max(...powers).toFixed(0)} W</p>
    <p>Average Cadence: ${avg(cadences).toFixed(0)} rpm</p>
  `;
  summaryDiv.classList.remove('hidden');

  const summaryMapDiv = document.getElementById('summaryMap');
  summaryMapDiv.innerHTML = "";
  const mapContainer = document.createElement('div');
  mapContainer.style.height = '300px';
  summaryMapDiv.appendChild(mapContainer);

  const summaryMap = L.map(mapContainer).setView([points[0].lat, points[0].lon], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(summaryMap);

  L.polyline(points.map(p => [p.lat, p.lon]), { color: 'blue' }).addTo(summaryMap);
  summaryMap.fitBounds(L.polyline(points.map(p => [p.lat, p.lon])).getBounds());

  points.forEach((p, i) => {
    if (!rideData[i]) return;
    L.circleMarker([p.lat, p.lon], { radius: 3 }).on('click', () => {
      const d = rideData[i];
      alert(`Time: ${d.timestamp}\nSpeed: ${d.speed} km/h\nPower: ${d.power} W\nCadence: ${d.cadence} rpm`);
    }).addTo(summaryMap);
  });
}



function logRealTimeData() {
  if (!latestPos) return;
  const { latitude, longitude, altitude, speed } = latestPos.coords;
  const elevation = altitude || 0;
  const gradient = 0;
  const kph = speed ? speed * 3.6 : 15;
  const cadence = latestCadence;
  const params = getInputs();
  const power = Math.max(0, calculatePower(params, kph, gradient));
  const gearInfo = calculateGear(params, kph, cadence);

  updateUI(kph, power, gradient, cadence, gearInfo);
  updateRiderMarker({ lat: latitude, lon: longitude });
  rideData.push({ timestamp: new Date().toISOString(), lat: latitude, lon: longitude, speed: kph, power, gradient, cadence, currentGear: gearInfo.current, suggestedGear: gearInfo.suggested });
  elapsedSeconds++;
}

function startRealTracking() {
  if (!navigator.geolocation) return alert("Geolocation not available.");
  if (!map) {
    map = L.map('map').setView([0, 0], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
  }
  watchId = navigator.geolocation.watchPosition(pos => {
    latestPos = pos;
  }, err => console.error("Geolocation error", err), {
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 5000
  });
}

async function connectCadenceSensor() {
  try {
    const device = await navigator.bluetooth.requestDevice({ filters: [{ services: ['cycling_speed_and_cadence'] }] });
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService('cycling_speed_and_cadence');
    const char = await service.getCharacteristic('csc_measurement');
    await char.startNotifications();
    char.addEventListener('characteristicvaluechanged', event => {
      latestCadence = event.target.value.getUint8(2);
      cadenceStatus.textContent = "Cadence sensor connected";
    });
  } catch (err) {
    console.warn("Cadence sensor connection failed. Using default cadence.", err);
  }
}




function calculatePower(params, speedKph, gradient) {
  const g = 9.81;
  const speed = speedKph / 3.6;
  const totalMass = params.riderWeight + params.bikeWeight;
  const drag = 0.5 * params.airDensity * params.cda * speed * speed;
  const rolling = totalMass * g * params.crr;
  const climb = totalMass * g * Math.sin(Math.atan(gradient / 100));
  return speed * (drag + rolling + climb);
}

function calculateGear(params, speedKph, cadence) {
  const speed = speedKph * 1000 / 60; // m/min
  const minCadence = params.minCadence;
  const maxCadence = params.maxCadence;
  const frontGears = params.frontGears;
  const rearGears = params.rearGears;

  let best = null;
  for (let f of frontGears) {
    for (let r of rearGears) {
      const ratio = f / r;
      const thisCadence = (speed * 60) / (2 * Math.PI * 0.34 * ratio);
      if (thisCadence >= minCadence && thisCadence <= maxCadence) {
        best = { front: f, rear: r };
        break;
      }
    }
    if (best) break;
  }

  const current = { front: frontGears[0], rear: rearGears[0] }; // placeholder
  return {
    current: `${current.front}/${current.rear}`,
    suggested: best ? `${best.front}/${best.rear}` : 'N/A'
  };
}

function updateUI(speed, power, gradient, cadence, gearInfo) {
  document.getElementById("speed").textContent = speed.toFixed(1);
  document.getElementById("power").textContent = power.toFixed(0);
  document.getElementById("gradient").textContent = gradient.toFixed(1);
  document.getElementById("cadence").textContent = cadence.toFixed(0);
  document.getElementById("currentGear").textContent = gearInfo.current;
  document.getElementById("suggestedGear").textContent = gearInfo.suggested;
}

function updateRiderMarker(point) {
  if (riderMarker) {
    riderMarker.setLatLng([point.lat, point.lon]);
  } else {
    riderMarker = L.marker([point.lat, point.lon]).addTo(map);
  }
}

function smoothGradient(index) {
  const windowSize = 5;
  const validIndices = points.slice(index, index + windowSize + 1);
  if (validIndices.length < 2) return 0;
  const start = validIndices[0];
  const end = validIndices[validIndices.length - 1];
  const elevationChange = end.ele - start.ele;
  const dist = haversine(start, end) * 1000;
  return (elevationChange / dist) * 100;
}

function getInputs() {
  const minMax = document.getElementById("targetCadence").value.split('-');
  return {
    riderWeight: parseFloat(document.getElementById("riderWeight").value),
    bikeWeight: parseFloat(document.getElementById("bikeWeight").value),
    cda: parseFloat(document.getElementById("cda").value),
    crr: parseFloat(document.getElementById("crr").value),
    airDensity: parseFloat(document.getElementById("airDensity").value),
    frontGears: document.getElementById("frontGears").value.split(',').map(Number),
    rearGears: document.getElementById("rearGears").value.split(',').map(Number),
    minCadence: parseInt(minMax[0]),
    maxCadence: parseInt(minMax[1]),
    targetPower: parseFloat(document.getElementById("targetPower").value)
  };
}

function haversine(p1, p2) {
  const R = 6371;
  const dLat = toRad(p2.lat - p1.lat);
  const dLon = toRad(p2.lon - p1.lon);
  const lat1 = toRad(p1.lat);
  const lat2 = toRad(p2.lat);

  const a = Math.sin(dLat/2)**2 + Math.sin(dLon/2)**2 * Math.cos(lat1) * Math.cos(lat2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg) {
  return deg * Math.PI / 180;
}

function downloadCSV() {
  let csv = 'timestamp,lat,lon,speed,power,gradient,cadence,currentGear,suggestedGear\n';
  rideData.forEach(r => {
    csv += `${r.timestamp},${r.lat},${r.lon},${r.speed},${r.power},${r.gradient},${r.cadence},${r.currentGear},${r.suggestedGear}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'ride_data.csv';
  a.click();
}


function fetchWindData() {
  if (points.length === 0) return;
  const { lat, lon } = points[currentIndex];
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=windspeed_10m,winddirection_10m`;

  fetch(url).then(r => r.json()).then(data => {
    const hourIndex = 0;
    windData.speed = data.hourly.windspeed_10m[hourIndex];
    windData.direction = data.hourly.winddirection_10m[hourIndex];
  }).catch(err => console.error("Wind fetch failed", err));
}

function startRealTracking() {
  if (!navigator.geolocation) {
    alert("Geolocation not available.");
    return;
  }

  navigator.geolocation.watchPosition(pos => {
    const { latitude, longitude } = pos.coords;
    const elevation = 0;
    const gradient = 0;
    const speed = pos.coords.speed ? pos.coords.speed * 3.6 : 15;
    const cadence = 85;
    const params = getInputs();
    const power = Math.max(0, calculatePower(params, speed, gradient));
    const gearInfo = calculateGear(params, speed, cadence);

    updateUI(speed, power, gradient, cadence, gearInfo);
    updateRiderMarker({ lat: latitude, lon: longitude });

    rideData.push({
      timestamp: new Date().toISOString(),
      lat: latitude,
      lon: longitude,
      speed,
      power,
      gradient,
      cadence,
      currentGear: gearInfo.current,
      suggestedGear: gearInfo.suggested
    });

    elapsedSeconds++;
  }, err => {
    console.error("Geolocation error", err);
  }, {
    enableHighAccuracy: true,
    maximumAge: 1000,
    timeout: 5000
  });
}

