<div align="center">
  <img src="https://img.shields.io/badge/StreamVault-Premium%20IPTV%20Player-00d4ff?style=for-the-badge&logo=appletv&logoColor=white" alt="StreamVault Banner">
  <br>
  <h1>📺 StreamVault — Premium Web IPTV Player</h1>
  <p><strong>A highly premium, production-ready Web IPTV Player built with a stunning dark glassmorphism UI.</strong></p>
  
  [![Live Demo](https://img.shields.io/badge/Live_Demo-Play_Now-FF4500?style=for-the-badge&logo=youtube&logoColor=white)](https://mhr8965.github.io/iptv/)
  [![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Ready-4CAF50?style=for-the-badge&logo=github)](https://mhr8965.github.io/iptv/)
  [![License](https://img.shields.io/badge/License-MIT-7b2ff7?style=for-the-badge)](LICENSE)

  <p>
    <a href="#-live-demo">Live Demo</a> • 
    <a href="#-features">Features</a> • 
    <a href="#-how-to-use">How to Use</a> • 
    <a href="#-deployment">Deployment</a> • 
    <a href="#-technology-stack">Tech Stack</a>
  </p>
</div>

---

## 🚀 Live Demo

Experience the premium IPTV player live right now!

👉 **[Launch StreamVault Live Demo](https://mhr8965.github.io/iptv/)** 👈

---

## ✨ Features

StreamVault isn't just another IPTV player. It's built for performance, aesthetics, and reliability.

*   🎨 **Premium Dark UI** — Gorgeous glassmorphism design, animated backgrounds, and a vibrant cyan/purple accent system.
*   📡 **Smart CORS Handling** — Employs a multi-proxy fallback chain ensuring playlists load reliably across different environments.
*   🟢 **Smart Channel Status Monitoring** — Live async HLS probing automatically detects and shows if a channel is *Working* or *Down*.
*   📊 **Live Analytics Dashboard** — Real-time stats showing Total Channels, Verified Working Streams, Live Viewers, and Country Count.
*   🔍 **Instant & Smart Search** — Blazing fast fuzzy search across channel names, categories, and countries (`Cmd/Ctrl + K` to focus).
*   🗂️ **Intelligent Categorization** — Automatically groups channels into Sports, News, Movies, Entertainment, Kids, and organizes them by Country tabs (BD, IN, US, etc.).
*   📱 **Fully Responsive & Mobile Optimized** — A mobile-first approach with a smooth collapsing sidebar and touch-friendly controls.
*   🎬 **HLS.js + Video.js Player** — Powerful, seamless HLS streaming with robust custom controls, including Picture-in-Picture (PiP) and Fullscreen support.
*   🔔 **Elegant Toast Notifications** — Non-intrusive slide-in alerts for network statuses, loading events, and playback errors.
*   📄 **Paginated Grid/List View** — Beautifully renders 48 channels per page with smooth transitions and an optional list layout.
*   📂 **Local & Remote Playlists** — Supports loading local `.m3u` files directly and fetching external remote sources seamlessly.

---

## 💡 How to Use

1. **Open the Player:** Navigate to the [Live Demo](https://mhr8965.github.io/iptv/).
2. **Browse Channels:** Use the sidebar to filter by category (Sports, Movies, News) or by Region (Bangladesh, India, USA).
3. **Search:** Hit `Ctrl + K` (or `Cmd + K` on Mac) to quickly search for a specific channel.
4. **Play:** Click on any working channel card to start streaming instantly.
5. **Custom Playlist:** 
   * To add a custom `.m3u` playlist URL, open the developer console or modify the local configuration if hosting yourself. (Currently custom URLs can be added programmatically or via a UI modal if enabled).
6. **Edit Metadata:** Hover over a channel card and click the edit (pencil) icon to override the channel name, category, or country code locally (saves to browser storage).

---

## 🛠️ Deployment (Host Your Own)

Deploying your own instance of StreamVault on GitHub Pages is incredibly simple.

### Quick Deploy via GitHub Pages

1. **Fork** or clone this repository to your GitHub account.
2. Navigate to your repository's **Settings**.
3. Select **Pages** from the left sidebar.
4. Under the **Build and deployment** section, select **Deploy from a branch**.
5. Set the branch to **`main`** and the folder to **`/ (root)`**, then click **Save**.
6. Wait a minute or two, and your site will be live at `https://<yourusername>.github.io/<your-repo-name>/`.

---

## 🗂️ File Structure

```text
📦 iptv/
 ┣ 📜 index.html         # Main HTML structure & Layout
 ┣ 📜 style.css          # Premium CSS styling (glassmorphism, animations, responsive design)
 ┣ 📜 app.js             # Core App Logic (M3U parser, HLS engine, UI interactions)
 ┣ 📜 aynaott.m3u        # Local default playlist source
 ┣ 📜 Sports-138.m3u     # Local sports playlist source
 ┗ 📜 README.md          # Project documentation
```

---

## 📡 Advanced Configuration & CORS

### CORS Proxy Chain
M3U files hosted on external servers often block direct fetching via CORS. StreamVault handles this gracefully using a fallback proxy chain. In `app.js`, the app attempts to load remote sources in this order:

1. Direct fetch (No Proxy)
2. `https://corsproxy.io/?`
3. `https://api.allorigins.win/raw?url=`
4. `https://cors-anywhere.herokuapp.com/`

*If all external sources fail, the app intelligently falls back to a curated, built-in fallback playlist ensuring there is always content available to watch.*

---

## 🛠️ Technology Stack

*   **HTML5 / CSS3** (Vanilla, No bulky frameworks)
*   **Vanilla JavaScript (ES6+)**
*   **[Video.js](https://videojs.com/)** (HTML5 Video Player)
*   **[HLS.js](https://github.com/video-dev/hls.js/)** (HTTP Live Streaming client)

---

## 📜 License

This project is licensed under the **MIT License**. Free to use, modify, and distribute.
