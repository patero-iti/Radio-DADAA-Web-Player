# 📖 Radio DADAA Web Player — Code Bible & Version Register

---

## 📻 1. Project Overview

**Radio DADAA** is an online radio station created by **DADAA** (Western Australia) that broadcasts artistic and alternative stories from a disability perspective. The station streams continuous music, audio dramas, cultural discussions, and community-driven content.

This codebase contains the standalone, mobile-first **Progressive Web App (PWA) Web Player** built for seamless playback across iOS (iPhone/iPad), Android smartphones, tablets, and desktop browsers.

* **Station Website**: [dadaa.org.au/radiodadaa-landing/](https://www.dadaa.org.au/radiodadaa-landing/)
* **Contact**: [radioinfo@dadaa.org.au](mailto:radioinfo@dadaa.org.au)
* **Streaming Platform**: Myriad Cloud / Broadcast Radio (Station ID: `8222`)

---

## 🎨 2. Brand Identity & Style Guide Implementation

The player strictly follows the **Radio DADAA Graphics Style Guide (August 2025)**:

### 2.1 Color Palette
| Name | Hex Code | RGB | CMYK | Role / Usage in Player |
| :--- | :--- | :--- | :--- | :--- |
| **Hot Pink (Primary)** | `#e83bb2` | `232, 59, 178` | `13, 85, 0, 0` | Hero play button, active navigation, ON AIR badge, visualizer bars, highlights |
| **Soft Pink (Secondary)** | `#fcebf7` | `252, 235, 247` | `0, 9, 0, 0` | Secondary backgrounds, subtle typography contrasts |
| **Black / Deep Plum** | `#231218` | `35, 18, 24` | `0, 20, 0, 100` | Main canvas background, header blur backdrop, tagline container |
| **Pure White** | `#ffffff` | `255, 255, 255` | `0, 0, 0, 0` | Primary headings, icons, high-contrast readable text |
| **Accent Dark Pink** | `#c702b6` | `199, 2, 182` | — | Button borders and gradients |

### 2.2 Typography
* **Headlines / Display**: Heavy bold geometric sans (`Montserrat` 800/900 weight, matching the brand font *Youth Bold*).
* **Body / Metadata**: Clean humanist sans (`Inter` / system-ui, matching *Neue Haas Grotesk Text*).

### 2.3 Visual Brand Motifs
* **Contained Logo**: `RadioDADAA-Logo-Primary-DarkPink.png` (used in top app bar and fallback artwork).
* **Single-line Logo**: `RadioDADAA-Logo01.png` (available for alternate views).
* **Station Tagline**: `R_RadioDADAA-Tagline-LightPink-DarkPinkBG.jpg` (featured as the hero sign-off banner).
* **Strike-Through Ribbon**: `~~MAINSTREAM~~ ✕ ~~CONVENTIONAL~~ ✕ ~~NORMAL~~` banner below the header.

---

## ⚡ 3. Architecture & Technical Endpoints

```
[ Radio DADAA PWA Frontend ]
         │
         ├──► Live Audio Stream ──► [ Myriad Cloud Audio Server ] (uksoutha.streaming.broadcast.radio)
         │
         ├──► Polling (every 12s) ──► [ Broadcast Radio REST API ] (player.broadcast.radio/api/nowplaying/8222)
         │
         ├──► MediaSession API ──► [ iOS Control Center / Android Lock Screen ]
         │
         └──► Service Worker (sw.js) ──► [ Local Cache Storage ] (Offline App Shell)
```

### 3.1 Streaming Endpoint
* **Live MP3 Stream**: `https://uksoutha.streaming.broadcast.radio/radio-dadaa`
* **Format**: `audio/mpeg` with icy metadata support.
* **Auto-Recovery**: Automatic cache-busting reload (`?nocache=timestamp`) on stream dropouts or network switches.

### 3.2 Metadata & Schedule API
* **Now Playing Endpoint**: `https://player.broadcast.radio/api/nowplaying/8222/?scheduleLength=7`
* **Poll Interval**: 12,000 ms (12 seconds).
* **Payload Fields Consumed**:
  * `now_playing.title`: Current track title
  * `now_playing.artist`: Current artist name
  * `now_playing.artworkUrl`: Album cover image URL
  * `schedule[]`: 7-day show schedule array with start/end timestamps, show titles, and descriptions
  * `recently_played[]`: Last 5 played tracks with timestamps and cover art

---

## 🚀 4. App Feature Matrix

| Feature | Description | File(s) |
| :--- | :--- | :--- |
| **Live Audio Streaming** | Low-latency live stream with play/pause, tactile button states, and loading spinner. | `app.js`, `style.css` |
| **Realtime Track & Show Info** | Dynamic track title, artist, album art, and current show name synced automatically. | `app.js`, `index.html` |
| **Animated Audio Visualizer** | 5-band CSS visualizer that pulses and bounces dynamically during live playback. | `style.css`, `index.html` |
| **Lock Screen & Media Session** | Full iOS/Android lock screen integration showing title, artist, album, and artwork with play/pause buttons. | `app.js` |
| **Interactive Show Schedule** | Weekly 7-day show guide (Sunday to Saturday) with current ON AIR badge on the active show. | `app.js`, `index.html` |
| **Recently Played History** | List of recently broadcast tracks with relative timestamps (*"5m ago"*, *"1h ago"*) and cover thumbnails. | `app.js`, `index.html` |
| **Volume Control & Memory** | Volume slider with mute toggle and volume preference persistence in `localStorage`. | `app.js` |
| **About & Community Tab** | Station overview, presenter recruitment guidelines, direct email contact button, and link to main site. | `index.html`, `style.css` |
| **Myriad Cloud Embed Tab** | Full embedded iframe view of the official Broadcast Radio player for desktop/fallback use. | `index.html` |
| **PWA Install Engine** | Native install banner for Android Chrome and iOS Safari Home Screen support with standalone display. | `manifest.json`, `sw.js` |
| **Safe Area Insets** | Responsive padding for iPhone notch, Dynamic Island, and bottom home bar (`env(safe-area-inset-*)`). | `style.css` |
| **Quick Sharing** | Native Web Share API integration (or fallback clipboard copy) to share the station. | `app.js` |

---

## 📁 5. File Manifest

```
RadioDADAA-Player/
├── codeBible.md                                # This documentation & version register
├── index.html                                  # Main HTML5 application shell & view templates
├── style.css                                   # Brand styling, responsive layout, animations, safe areas
├── app.js                                      # Audio player controller, API sync, MediaSession, state
├── manifest.json                               # PWA manifest (app name, theme color, standalone mode)
├── sw.js                                       # Service worker for offline shell caching
├── apple-touch-icon.png                        # iOS home screen icon (180x180)
├── icon-192.png                                # Android / PWA standard icon (192x192)
├── icon-512.png                                # Android / PWA high-res splash icon (512x512)
├── RadioDADAA-Logo-Primary-DarkPink.png        # Primary badge logo asset
├── RadioDADAA-Logo01.png                       # Secondary single-line logo asset
├── R_RadioDADAA-Tagline-LightPink-DarkPinkBG.jpg # Official station tagline graphic
└── RadioDADAA_StyleGuide_August_2025.pdf       # Reference brand guide PDF
```

---

## 📝 6. Version History & Changelog

### Version 1.0.0 — Initial Release (September 2026)
* **Initial Release Date**: 2026-09-05
* **Features Included**:
  * Complete custom Progressive Web App (PWA) architecture with vanilla zero-dependency stack.
  * Direct integration with Myriad Cloud audio stream (`https://uksoutha.streaming.broadcast.radio/radio-dadaa`).
  * Live polling of Broadcast Radio REST API (`/api/nowplaying/8222/`) for metadata and album art.
  * 5-Tab mobile interface: **Listen Live**, **Weekly Schedule**, **Recently Played**, **About / Community**, and **Myriad Embed**.
  * Full MediaSession API integration for iOS Lock Screen / Dynamic Island and Android notification controls.
  * Tactile volume slider with mute toggle and persistent `localStorage` memory.
  * Full adherence to August 2025 Brand Style Guide (Hot Pink `#e83bb2`, Soft Pink `#fcebf7`, Deep Plum `#231218`).
  * iOS safe-area inset support and native PWA installation banner.
  * Service worker (`sw.js`) and Web Manifest (`manifest.json`) for instant loading and home-screen app mode.
  * Created project `codeBible.md` for architecture and version tracking.

---

## 🛠️ 7. Maintenance & Versioning Guidelines

When modifying this application in the future:
1. **Semantic Versioning**: Increment version number (`MAJOR.MINOR.PATCH`):
   * `MAJOR`: Redesign or major architectural change (e.g. `2.0.0`).
   * `MINOR`: New features or tabs added (e.g. `1.1.0`).
   * `PATCH`: Bug fixes, styling adjustments, or API tweaks (e.g. `1.0.1`).
2. **Version Update Checklist**:
   * Update version string in `app.js` (`CONFIG.version = 'x.y.z'`).
   * Update version string in `sw.js` cache name (`CACHE_NAME = 'radiodadaa-vx.y.z'`).
   * Update the badge in `index.html` (in the About tab).
   * Record the changes in Section 6 of this `codeBible.md`.
