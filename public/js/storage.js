const STORAGE_KEY = 'taticas_saved_plays';

class StorageManager {
  static getPlays() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (err) {
      console.error('Error reading localStorage plays:', err);
      return {};
    }
  }

  static savePlay(id, { title, team_id, background, frames }) {
    const plays = this.getPlays();
    const playId = id || 'play_' + Date.now();
    
    plays[playId] = {
      id: playId,
      title: title,
      team_id: team_id,
      background: background,
      frames: frames,
      last_modified: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(plays));
    return playId;
  }

  static getPlay(id) {
    const plays = this.getPlays();
    return plays[id] || null;
  }

  static deletePlay(id) {
    const plays = this.getPlays();
    if (plays[id]) {
      delete plays[id];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plays));
      return true;
    }
    return false;
  }
}

// Attach to global window object
window.StorageManager = StorageManager;
