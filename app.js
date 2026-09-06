/**
 * Radio DADAA Progressive Web App Audio Player
 * Connects to Myriad Cloud / Broadcast Radio Live Stream and Realtime APIs
 */

const CONFIG = {
  version: '1.2.0',
  stationId: 8222,
  streamUrl: 'https://uksoutha.streaming.broadcast.radio/radio-dadaa',
  apiNowPlaying: 'https://player.broadcast.radio/api/nowplaying/8222/?scheduleLength=7',
  pollIntervalMs: 12000,
  defaultArtwork: 'RadioDADAA-Logo-Primary-DarkPink.png',
  days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
};

class RadioPlayer {
  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'none';
    this.isPlaying = false;
    this.isLoading = false;
    this.isMuted = false;
    this.currentVolume = parseFloat(localStorage.getItem('radiodadaa_vol') || '0.9');
    this.nowPlayingData = null;
    this.scheduleData = [];
    this.recentlyPlayedData = [];
    this.selectedDayIndex = new Date().getDay();
    this.pollTimer = null;
    this.deferredPrompt = null;

    this.initElements();
    this.initAudio();
    this.initEventListeners();
    this.initMediaSession();
    this.registerServiceWorker();

    // Start initial metadata fetch & polling
    this.fetchNowPlaying();
    this.startPolling();
  }

  initElements() {
    // Player elements
    this.btnPlay = document.getElementById('btnPlay');
    this.playIcon = document.getElementById('playIcon');
    this.pauseIcon = document.getElementById('pauseIcon');
    this.spinner = document.getElementById('spinner');
    this.streamStatus = document.getElementById('streamStatus');
    this.artworkImg = document.getElementById('artworkImg');
    this.artworkContainer = document.getElementById('artworkContainer');
    this.trackTitle = document.getElementById('trackTitle');
    this.trackArtist = document.getElementById('trackArtist');
    this.currentShowTitle = document.getElementById('currentShowTitle');
    
    // Volume elements
    this.volumeSlider = document.getElementById('volumeSlider');
    this.btnMute = document.getElementById('btnMute');
    this.volIcon = document.getElementById('volIcon');
    this.muteIcon = document.getElementById('muteIcon');

    // Navigation & Tabs
    this.navItems = document.querySelectorAll('.nav-item');
    this.tabContents = document.querySelectorAll('.tab-content');

    // Schedule & History
    this.daySelector = document.getElementById('daySelector');
    this.scheduleList = document.getElementById('scheduleList');
    this.historyList = document.getElementById('historyList');

    // Install banner
    this.installBanner = document.getElementById('installBanner');
    this.btnInstall = document.getElementById('btnInstall');
    this.btnCloseBanner = document.getElementById('btnCloseBanner');

    // Share & Reload
    this.btnShare = document.getElementById('btnShare');
    this.btnRefresh = document.getElementById('btnRefresh');

    // Setup initial volume slider
    if (this.volumeSlider) {
      this.volumeSlider.value = this.currentVolume;
      this.audio.volume = this.currentVolume;
    }
  }

  initAudio() {
    this.audio.addEventListener('playing', () => {
      this.isLoading = false;
      this.isPlaying = true;
      this.updatePlayStateUI();
      this.updateMediaSessionState('playing');
    });

    this.audio.addEventListener('pause', () => {
      this.isLoading = false;
      this.isPlaying = false;
      this.updatePlayStateUI();
      this.updateMediaSessionState('paused');
    });

    this.audio.addEventListener('waiting', () => {
      this.isLoading = true;
      this.updatePlayStateUI();
    });

    this.audio.addEventListener('error', (e) => {
      console.warn('Audio stream error occurred, attempting reconnection...', e);
      this.handleStreamError();
    });
  }

  initEventListeners() {
    // Play / Pause
    this.btnPlay.addEventListener('click', () => this.togglePlay());

    // Volume & Mute
    if (this.volumeSlider) {
      this.volumeSlider.addEventListener('input', (e) => {
        this.currentVolume = parseFloat(e.target.value);
        this.audio.volume = this.currentVolume;
        this.audio.muted = (this.currentVolume === 0);
        localStorage.setItem('radiodadaa_vol', this.currentVolume.toString());
        this.updateVolumeIcons();
      });
    }

    if (this.btnMute) {
      this.btnMute.addEventListener('click', () => {
        this.audio.muted = !this.audio.muted;
        this.updateVolumeIcons();
      });
    }

    // Tab Navigation
    this.navItems.forEach((btn) => {
      btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        this.switchTab(tabId);
      });
    });

    // Share button
    if (this.btnShare) {
      this.btnShare.addEventListener('click', () => this.shareStation());
    }

    // Refresh now playing metadata
    if (this.btnRefresh) {
      this.btnRefresh.addEventListener('click', () => {
        this.fetchNowPlaying();
        this.btnRefresh.style.transform = 'rotate(360deg)';
        setTimeout(() => this.btnRefresh.style.transform = '', 400);
      });
    }

    // PWA Install Prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      if (this.installBanner) {
        this.installBanner.classList.add('show');
      }
    });

    if (this.btnInstall) {
      this.btnInstall.addEventListener('click', async () => {
        if (this.deferredPrompt) {
          this.deferredPrompt.prompt();
          const { outcome } = await this.deferredPrompt.userChoice;
          if (outcome === 'accepted') {
            if (this.installBanner) this.installBanner.classList.remove('show');
          }
          this.deferredPrompt = null;
        }
      });
    }

    if (this.btnCloseBanner) {
      this.btnCloseBanner.addEventListener('click', () => {
        if (this.installBanner) this.installBanner.classList.remove('show');
      });
    }
  }

  togglePlay() {
    if (this.isPlaying) {
      this.audio.pause();
      this.audio.src = ''; // Release network connection for live stream
    } else {
      this.isLoading = true;
      this.updatePlayStateUI();
      // Add timestamp cache-buster for fresh live buffer
      this.audio.src = `${CONFIG.streamUrl}?nocache=${Date.now()}`;
      this.audio.load();
      this.audio.play().catch((err) => {
        console.error('Playback error:', err);
        this.isLoading = false;
        this.isPlaying = false;
        this.updatePlayStateUI();
      });
    }
  }

  handleStreamError() {
    this.isLoading = true;
    this.updatePlayStateUI();
    this.streamStatus.textContent = 'RECONNECTING...';
    setTimeout(() => {
      if (this.isPlaying) {
        this.audio.src = `${CONFIG.streamUrl}?nocache=${Date.now()}`;
        this.audio.load();
        this.audio.play().catch(() => {});
      }
    }, 2500);
  }

  updatePlayStateUI() {
    if (this.isLoading) {
      this.playIcon.style.display = 'none';
      this.pauseIcon.style.display = 'none';
      this.spinner.style.display = 'block';
      this.btnPlay.classList.add('loading');
      this.streamStatus.textContent = 'CONNECTING...';
      this.streamStatus.classList.remove('live');
    } else if (this.isPlaying) {
      this.spinner.style.display = 'none';
      this.playIcon.style.display = 'none';
      this.pauseIcon.style.display = 'block';
      this.btnPlay.classList.remove('loading');
      this.artworkContainer.classList.add('playing');
      this.streamStatus.textContent = 'LIVE BROADCAST';
      this.streamStatus.classList.add('live');
    } else {
      this.spinner.style.display = 'none';
      this.playIcon.style.display = 'block';
      this.pauseIcon.style.display = 'none';
      this.btnPlay.classList.remove('loading');
      this.artworkContainer.classList.remove('playing');
      this.streamStatus.textContent = 'READY TO PLAY';
      this.streamStatus.classList.remove('live');
    }
  }

  updateVolumeIcons() {
    const isMuted = this.audio.muted || this.audio.volume === 0;
    if (isMuted) {
      this.volIcon.style.display = 'none';
      this.muteIcon.style.display = 'block';
    } else {
      this.volIcon.style.display = 'block';
      this.muteIcon.style.display = 'none';
    }
  }

  switchTab(tabId) {
    this.navItems.forEach((item) => {
      item.classList.toggle('active', item.getAttribute('data-tab') === tabId);
    });
    this.tabContents.forEach((tab) => {
      tab.classList.toggle('active', tab.id === `tab-${tabId}`);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Parse schedule item content array to extract Show Info, Presenter, and Show Tile Graphic.
   * Myriad Cloud schedule items contain an array of objects:
   *  - Show object (contentTypeId: 8) -> display_title, excerpt
   *  - FeaturedImage object (contentTypeId: 7) -> cms-blob_image
   *  - Presenter object (contentTypeId: 9) -> presenter display_title
   */
  parseShowInfo(contentList) {
    if (!contentList || !Array.isArray(contentList) || contentList.length === 0) {
      return {
        title: 'Radio DADAA Continuous Broadcast',
        excerpt: 'Alternative stories, genres and music curated from a disability perspective.',
        presenter: null,
        imageUrl: null
      };
    }

    // 1. Find Show object
    const showObj = contentList.find(c => c.contentTypeId === 8 || (c.contentType && c.contentType.slug === 'show'))
      || contentList.find(c => c.contentTypeId !== 7 && c.contentTypeId !== 9)
      || contentList[0];

    // 2. Find Featured Image object or blob in any object
    const imgObj = contentList.find(c => c.contentTypeId === 7 || (c.contentType && c.contentType.slug === 'featuredImage'))
      || contentList.find(c => (c.body && c.body.includes('cms-blob_image')) || (c.display_title && c.display_title.includes('cms-blob_image')));

    // 3. Find Presenter object
    const presenterObj = contentList.find(c => c.contentTypeId === 9 || (c.contentType && c.contentType.slug === 'presenter'));

    // Extract Show Title & Excerpt
    let title = (showObj && showObj.display_title ? showObj.display_title : '').trim();
    let excerpt = (showObj && showObj.excerpt ? showObj.excerpt : '').trim();
    let presenter = (presenterObj && presenterObj.display_title ? presenterObj.display_title : '').trim();

    // If title is an image filename (e.g. from a raw upload), sanitize it
    if (/\.(png|jpg|jpeg|webp|gif)$/i.test(title)) {
      if (/^screenshot/i.test(title)) {
        title = excerpt ? excerpt.split('.')[0] : 'Radio DADAA Feature Show';
      } else {
        title = title
          .replace(/\.(png|jpg|jpeg|webp|gif)$/i, '')
          .replace(/\s+(banner|tile|logo|header|cover)$/i, '')
          .replace(/[_-]/g, ' ')
          .trim();
      }
    }

    // Extract Image URL if present
    let imageUrl = null;
    const bodyStr = ((imgObj && imgObj.body ? imgObj.body : '') + ' ' + (imgObj && imgObj.display_title ? imgObj.display_title : ''));
    const blobMatch = bodyStr.match(/cms-blob_image\/([a-zA-Z0-9]+):([a-f0-9\-]+)/i);
    if (blobMatch) {
      const ext = blobMatch[1] || 'png';
      const guid = blobMatch[2];
      imageUrl = `https://api.broadcast.radio/api/image/${guid}.${ext}?g=center&w=600&h=340&c=true`;
    }

    return {
      title: title || 'Radio DADAA Broadcast',
      excerpt: (excerpt && excerpt !== 'None') ? excerpt : '',
      presenter: presenter || null,
      imageUrl: imageUrl
    };
  }

  async fetchNowPlaying() {
    try {
      const res = await fetch(CONFIG.apiNowPlaying);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      
      if (data && data.success && data.body) {
        this.nowPlayingData = data.body.now_playing;
        this.scheduleData = data.body.schedule || [];
        this.recentlyPlayedData = data.body.recently_played || [];

        this.renderNowPlaying();
        this.renderSchedule();
        this.renderRecentlyPlayed();
      }
    } catch (err) {
      console.warn('Could not fetch now playing data:', err);
    }
  }

  startPolling() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = setInterval(() => this.fetchNowPlaying(), CONFIG.pollIntervalMs);
  }

  renderNowPlaying() {
    if (!this.nowPlayingData) return;

    const title = this.nowPlayingData.title || 'Radio DADAA Live';
    const artist = this.nowPlayingData.artist || 'Listen Differently';
    let artwork = CONFIG.defaultArtwork;

    if (this.nowPlayingData.artworkUrl) {
      artwork = this.nowPlayingData.artworkUrl.startsWith('http')
        ? this.nowPlayingData.artworkUrl
        : `https://player.broadcast.radio${this.nowPlayingData.artworkUrl}`;
    }

    this.trackTitle.textContent = title;
    this.trackArtist.textContent = artist;

    // Find current show in schedule
    const now = Date.now();
    const currentShowItem = this.scheduleData.find((s) => s.current || (s.start_time_in_station_tz <= now && s.end_time_in_station_tz >= now));
    
    if (currentShowItem && currentShowItem.content) {
      const showInfo = this.parseShowInfo(currentShowItem.content);
      let showLabel = showInfo.title;
      if (showInfo.presenter) {
        showLabel += ` • with ${showInfo.presenter}`;
      }
      this.currentShowTitle.textContent = showLabel;
      
      // If no track artwork is present but show has a tile image, use the show tile as hero artwork
      if ((!this.nowPlayingData.artworkUrl || this.nowPlayingData.artworkUrl.length === 0) && showInfo.imageUrl) {
        artwork = showInfo.imageUrl;
      }
    } else {
      this.currentShowTitle.textContent = 'Radio DADAA Broadcast';
    }

    this.artworkImg.src = artwork;
    this.artworkImg.alt = `${title} by ${artist}`;

    this.updateMediaSessionMetadata(title, artist, artwork);
  }

  renderSchedule() {
    if (!this.scheduleList) return;

    // Render day selector buttons
    this.renderDaySelector();

    // Filter schedule by selected day
    const showsForDay = this.scheduleData.filter((item) => {
      const showDate = new Date(item.start_time_in_station_tz || item.start_tza);
      return showDate.getDay() === this.selectedDayIndex;
    });

    if (showsForDay.length === 0) {
      this.scheduleList.innerHTML = `
        <div class="schedule-card">
          <div class="show-title-text">Radio DADAA Continuous Broadcast</div>
          <div class="show-excerpt-text">Alternative stories, genres and music curated from a disability perspective.</div>
        </div>
      `;
      return;
    }

    this.scheduleList.innerHTML = showsForDay.map((item) => {
      const showInfo = this.parseShowInfo(item.content);
      
      const startTime = new Date(item.start_time_in_station_tz || item.start_tza);
      const endTime = new Date(item.end_time_in_station_tz || item.end_tza);
      const timeStr = `${this.formatTime(startTime)} – ${this.formatTime(endTime)}`;
      const isCurrent = item.current;

      return `
        <article class="schedule-card ${isCurrent ? 'current-show' : ''}">
          <div class="schedule-card-header">
            <span class="schedule-time">${timeStr}</span>
            ${isCurrent ? '<span class="onair-badge"><span class="onair-dot"></span> ON AIR</span>' : ''}
          </div>

          ${showInfo.imageUrl ? `
            <div class="schedule-show-tile">
              <img class="schedule-show-tile-img" src="${showInfo.imageUrl}" alt="${this.escapeHtml(showInfo.title)}" loading="lazy" onerror="this.parentElement.style.display='none'" />
            </div>
          ` : ''}

          <div class="schedule-body">
            <div class="show-title-row">
              <h3 class="show-title-text">${this.escapeHtml(showInfo.title)}</h3>
              ${showInfo.presenter ? `
                <span class="presenter-tag">
                  <svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                  ${this.escapeHtml(showInfo.presenter)}
                </span>
              ` : ''}
            </div>
            ${showInfo.excerpt ? `<p class="show-excerpt-text">${this.escapeHtml(showInfo.excerpt)}</p>` : ''}
          </div>
        </article>
      `;
    }).join('');
  }

  renderDaySelector() {
    if (!this.daySelector || this.daySelector.children.length > 0) return;

    CONFIG.days.forEach((dayName, idx) => {
      const btn = document.createElement('button');
      btn.className = `day-btn ${idx === this.selectedDayIndex ? 'active' : ''}`;
      btn.textContent = dayName.slice(0, 3);
      btn.addEventListener('click', () => {
        this.selectedDayIndex = idx;
        document.querySelectorAll('.day-btn').forEach((b, i) => b.classList.toggle('active', i === idx));
        this.renderSchedule();
      });
      this.daySelector.appendChild(btn);
    });
  }

  renderRecentlyPlayed() {
    if (!this.historyList || !this.recentlyPlayedData) return;

    if (this.recentlyPlayedData.length === 0) {
      this.historyList.innerHTML = `
        <div class="history-card">
          <div class="history-meta">
            <div class="history-title">Recently Played History</div>
            <div class="history-artist">Tracks will appear here as they broadcast</div>
          </div>
        </div>
      `;
      return;
    }

    this.historyList.innerHTML = this.recentlyPlayedData.map((item) => {
      const title = item.title || 'Broadcast Track';
      const artist = item.artist || 'Radio DADAA';
      let artwork = CONFIG.defaultArtwork;

      if (item.artworkUrl) {
        artwork = item.artworkUrl.startsWith('http')
          ? item.artworkUrl
          : `https://player.broadcast.radio${item.artworkUrl}`;
      }

      const timeAgo = this.formatTimeAgo(item.startDate);

      return `
        <div class="history-card">
          <img class="history-art" src="${artwork}" alt="${this.escapeHtml(title)}" onerror="this.src='${CONFIG.defaultArtwork}'" />
          <div class="history-meta">
            <div class="history-title">${this.escapeHtml(title)}</div>
            <div class="history-artist">${this.escapeHtml(artist)}</div>
          </div>
          <div class="history-time">${timeAgo}</div>
        </div>
      `;
    }).join('');
  }

  formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  formatTimeAgo(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    return `${diffHours}h ago`;
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    })[m]);
  }

  // ================= MediaSession API =================
  initMediaSession() {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.setActionHandler('play', () => this.togglePlay());
    navigator.mediaSession.setActionHandler('pause', () => this.togglePlay());
    navigator.mediaSession.setActionHandler('stop', () => {
      this.audio.pause();
      this.audio.src = '';
    });
  }

  updateMediaSessionMetadata(title, artist, artworkUrl) {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: title,
      artist: artist,
      album: 'Radio DADAA - Listen Differently',
      artwork: [
        { src: artworkUrl, sizes: '96x96', type: 'image/png' },
        { src: artworkUrl, sizes: '192x192', type: 'image/png' },
        { src: artworkUrl, sizes: '512x512', type: 'image/png' }
      ]
    });
  }

  updateMediaSessionState(state) {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = state;
  }

  async shareStation() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Radio DADAA',
          text: 'Listen to Radio DADAA — Art and alternative stories from a disability perspective.',
          url: window.location.href
        });
      } catch (err) {}
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Radio DADAA link copied to clipboard!');
    }
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch((err) => {
          console.log('Service Worker registration skipped:', err);
        });
      });
    }
  }
}

// Initialize player on DOM readiness
document.addEventListener('DOMContentLoaded', () => {
  window.radioPlayer = new RadioPlayer();
});
