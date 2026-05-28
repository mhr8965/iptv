# StreamVault — Premium Web IPTV Player

![StreamVault Banner](https://img.shields.io/badge/StreamVault-Premium%20IPTV%20Player-00d4ff?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik04IDV2MTRsMTEtN3oiLz48L3N2Zz4=)
![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Ready-4CAF50?style=for-the-badge&logo=github)
![License](https://img.shields.io/badge/License-MIT-7b2ff7?style=for-the-badge)

A **highly premium, production-ready Web IPTV Player** built with a stunning dark glassmorphism UI. Features include smart channel status monitoring, live analytics, multi-source M3U loading with CORS bypass, and a seamless HLS.js + Video.js powered player.

## ✨ Features

- 🎨 **Premium Dark UI** — Glassmorphism, animated backgrounds, cyan/purple accent system
- 📡 **Smart CORS Handling** — Multi-proxy fallback chain ensures playlist loads reliably
- 🟢 **Channel Status Monitoring** — Live async HLS probing shows Working/Down per channel
- 📊 **Live Analytics Dashboard** — Total channels, verified working, live viewers, country count
- 🔍 **Instant Search** — Fuzzy search across names, categories, countries
- 🗂️ **Smart Categorization** — Sports, News, Movies, Entertainment + country tabs
- 📱 **Fully Responsive** — Mobile-first, sidebar collapses on small screens
- 🎬 **HLS.js + Video.js Player** — Seamless HLS streaming with custom controls
- 🔔 **Toast Notifications** — Elegant slide-in alerts for errors and status
- 📄 **Paginated Grid/List View** — 48 channels per page with smooth pagination

## 🚀 Deploy to GitHub Pages

1. Fork or clone this repository
2. Go to **Settings → Pages**
3. Set source to **main branch → / (root)**
4. Visit `https://yourusername.github.io/your-repo-name`

## 📁 File Structure

```
├── index.html    — Main HTML structure
├── style.css     — Premium CSS (glassmorphism + animations)
├── app.js        — Application logic (M3U parsing, HLS player, analytics)
└── README.md     — This file
```

## 🔧 Custom Playlist

To add your own M3U playlist:
1. Click the **Refresh** button in the top bar
2. For programmatic loading, edit `CONFIG.PLAYLIST_SOURCES` in `app.js`

## 📡 CORS Proxy Chain

The app tries sources in this priority order:
1. Direct fetch (no proxy)
2. `corsproxy.io`
3. `api.allorigins.win`
4. `cors-anywhere.herokuapp.com`
5. `thingproxy.freeboard.io`
6. Built-in fallback playlist (always works)

## 📜 License

MIT — Free to use, modify, and distribute.
