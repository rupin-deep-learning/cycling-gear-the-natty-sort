# cycling-gear-the-natty-sort

````markdown
# 🚴‍♂️ CyclePro Ascend

**CyclePro Ascend** is a cycling app MVP that simulates and tracks rides, provides real-time gear and power feedback, and displays post-ride analytics with interactive maps. Built for cyclists who want intelligent performance insights — even in a minimal setup.

---

## ✨ Features

### 🧭 Ride Modes
- **Simulated Ride**: Upload a `.gpx` file and simulate a ride based on elevation and gradient.
- **Real Ride**: Use your device’s GPS and optional cadence sensor for real-world tracking.

### ⚙️ Real-Time Metrics
- Speed, power, cadence, and slope updates per second
- Gear suggestions based on input configuration and cadence targets
- Physics-based power estimation using rider/bike input parameters

### 📊 Post-Ride Summary
- Ride stats: average/max speed, power, cadence
- Clickable map: inspect data point-by-point
- One-click CSV export of ride log

---

## 💻 Tech Stack

- HTML5, CSS3, JavaScript (no frameworks)
- [Leaflet.js](https://leafletjs.com/) for mapping
- Web APIs: FileReader, Geolocation, Bluetooth, DOMParser

---

## 🚀 Getting Started

### 🔧 Clone the Repo

```bash
git clone https://github.com/yourusername/cyclepro-ascend.git
cd cyclepro-ascend
````

### 🌐 Run the App

Just open `index.html` in Chrome (Bluetooth support required for cadence sensor).

---

## 📂 Project Structure

```
cyclepro-ascend/
├── index.html         # App interface
├── style.css          # Mobile-optimized styles
├── app.js             # Core app logic
├── assets/
│   └── bike.png       # Branding image
├── sample/
│   └── Route1.gpx     # Example route
```

---

## 🛠 Usage Guide

1. Choose **Simulate** or **Real** mode.
2. Fill in your bike, rider, and cadence settings.
3. (Simulate only) Upload a `.gpx` route file.
4. Start the ride — track progress, pause, resume, or stop.
5. After stopping, view ride analytics and export data.
6. Use the **Reset** button to start a new ride.

---

## 🔐 Permissions

* **Geolocation**: Required in Real mode for tracking.
* **Bluetooth**: (Optional) Connect to a cadence sensor via Web Bluetooth API.

---

## ⚠️ Known Limitations

* No ride data storage across sessions
* No error checking for invalid/malformed GPX files
* Bluetooth sensors supported only in Chrome
* No PWA/offline support yet

---

## 🧭 Roadmap

* Visual climb profiles
* Power zone overlay
* Wind resistance modeling
* Ride history and syncing
* Strava integration
* PWA / Mobile deployment

---

## 📄 License

[MIT License](LICENSE)

© 2025 **CyclePro Ascend**

---

## 🤝 Contributing

Pull requests are welcome! Open an issue for bugs or feature ideas.

```
