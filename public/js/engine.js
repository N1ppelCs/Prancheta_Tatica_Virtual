// Global State
let activeTeamA = null;
let activeTeamB = null;
let teamAPlayers = [];
let teamBPlayers = [];
let currentPlayId = null;
let globallyDraggedData = null;
let isDraggingFromPanel = false; // tracks when dragging from roster sidebar

// Timeline frames. Each frame: { tokens: [], lines: [] }
let frames = [{ tokens: [], lines: [] }];
let currentFrameIndex = 0;

// Canvas Drawing Settings
let activeTool = 'select'; // 'select', 'line-solid', 'line-dashed', 'line-wavy', 'eraser'
let activeColor = '#FFFFFF';
let anchorToPlayer = false;
let selectedToken = null;
let isDrawingLine = false;
let currentDrawingLine = null;

// Pitch Layout
let currentLayout = 'FULL'; // 'FULL', 'HALF_DEF', 'HALF_OFF', 'BOX'

// Animation State
let isPlaying = false;
let animationStartTime = null;
let animationFrameId = null;
let transitionDuration = 2.0; // seconds per frame transition
let playbackFrameIndex = 0;

// Image cache to hold avatars and crests loaded asynchronously
const imageCache = {};
function getCachedImage(src) {
  if (!src) return null;
  if (imageCache[src]) {
    return imageCache[src].loaded ? imageCache[src].img : null;
  }
  const img = new Image();
  img.src = src;
  imageCache[src] = { img, loaded: false };
  img.onload = () => {
    imageCache[src].loaded = true;
  };
  imageCache[src].onerror = () => {
    imageCache[src].failed = true;
  };
  return null;
}

// Coordinate mappings for formations (mapped to full pitch, scaled to halves on runtime)
const formations = {
  "4-3-3": [
    { role: 'GK', x: 0.08, y: 0.5 },
    { role: 'RB', x: 0.28, y: 0.18 },
    { role: 'CB1', x: 0.22, y: 0.38 },
    { role: 'CB2', x: 0.22, y: 0.62 },
    { role: 'LB', x: 0.28, y: 0.82 },
    { role: 'CDM', x: 0.42, y: 0.5 },
    { role: 'CM1', x: 0.58, y: 0.32 },
    { role: 'CM2', x: 0.58, y: 0.68 },
    { role: 'RW', x: 0.78, y: 0.22 },
    { role: 'ST', x: 0.88, y: 0.5 },
    { role: 'LW', x: 0.78, y: 0.78 }
  ],
  "4-4-2": [
    { role: 'GK', x: 0.08, y: 0.5 },
    { role: 'RB', x: 0.28, y: 0.18 },
    { role: 'CB1', x: 0.22, y: 0.38 },
    { role: 'CB2', x: 0.22, y: 0.62 },
    { role: 'LB', x: 0.28, y: 0.82 },
    { role: 'LM', x: 0.52, y: 0.2 },
    { role: 'CM1', x: 0.46, y: 0.4 },
    { role: 'CM2', x: 0.46, y: 0.6 },
    { role: 'RM', x: 0.52, y: 0.8 },
    { role: 'ST1', x: 0.85, y: 0.38 },
    { role: 'ST2', x: 0.85, y: 0.62 }
  ],
  "3-5-2": [
    { role: 'GK', x: 0.08, y: 0.5 },
    { role: 'CB1', x: 0.22, y: 0.28 },
    { role: 'CB2', x: 0.2, y: 0.5 },
    { role: 'CB3', x: 0.22, y: 0.72 },
    { role: 'LWB', x: 0.45, y: 0.15 },
    { role: 'RWB', x: 0.45, y: 0.85 },
    { role: 'CDM', x: 0.38, y: 0.5 },
    { role: 'CM1', x: 0.58, y: 0.35 },
    { role: 'CM2', x: 0.58, y: 0.65 },
    { role: 'ST1', x: 0.85, y: 0.38 },
    { role: 'ST2', x: 0.85, y: 0.62 }
  ]
};

// Canvas Setup
const canvas = document.getElementById('tacticalBoard');
const ctx = canvas.getContext('2d');
const container = document.getElementById('canvas-container');

// Elements
const teamASelect = document.getElementById('team-a-select');
const teamBSelect = document.getElementById('team-b-select');
const formationASelect = document.getElementById('formation-a-select');
const formationBSelect = document.getElementById('formation-b-select');
const teamARosterList = document.getElementById('team-a-roster-list');
const teamBRosterList = document.getElementById('team-b-roster-list');

const playTitleInput = document.getElementById('play-title-input');
const savedPlaysSelect = document.getElementById('saved-plays-select');
const keyframesTimeline = document.getElementById('keyframes-timeline');
const activeFrameNumLabel = document.getElementById('active-frame-num');
const animationSpeedInput = document.getElementById('animation-speed');
const speedDisplay = document.getElementById('speed-display');

window.addEventListener('DOMContentLoaded', () => {
  setupCanvasSize();
  loadTeamsDropdowns();
  loadLocalStoragePlays();
  setupEventListeners();
  updateTimelineUI();

  requestAnimationFrame(animationLoop);
});

function setupCanvasSize() {
  const rect = container.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  canvas.style.width = '100%';
  canvas.style.height = '100%';
}

window.addEventListener('resize', setupCanvasSize);

// Fetch and load teams in dropdown selectors A and B
async function loadTeamsDropdowns() {
  try {
    const res = await fetch('/api/teams');
    const teams = await res.json();

    // Fill Selector A
    teamASelect.innerHTML = '<option value="">-- Selecionar Equipe A --</option>';
    teams.forEach(team => {
      const opt = document.createElement('option');
      opt.value = team.id;
      opt.textContent = team.name;
      opt.dataset.primary = team.primary_color;
      opt.dataset.secondary = team.secondary_color;
      opt.dataset.crest = team.crest_url;
      teamASelect.appendChild(opt);
    });

    // Fill Selector B
    teamBSelect.innerHTML = '<option value="">-- Selecionar Equipe B --</option>';
    teams.forEach(team => {
      const opt = document.createElement('option');
      opt.value = team.id;
      opt.textContent = team.name;
      opt.dataset.primary = team.primary_color;
      opt.dataset.secondary = team.secondary_color;
      opt.dataset.crest = team.crest_url;
      teamBSelect.appendChild(opt);
    });
  } catch (err) {
    console.error('Error fetching teams:', err);
  }
}

// Load Roster list for Team A
async function loadTeamARoster(teamId) {
  try {
    const res = await fetch(`/api/teams/${teamId}/players`);
    teamAPlayers = await res.json();
    teamARosterList.innerHTML = '';

    if (teamAPlayers.length === 0) {
      teamARosterList.innerHTML = '<div class="text-xs text-slate-500 italic text-center py-4">Nenhum jogador ativo nesta equipe.</div>';
      return;
    }

    teamAPlayers.forEach(p => {
      const item = document.createElement('div');
      item.className = 'flex items-center justify-between bg-slate-900/50 p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 transition shrink-0';

      item.innerHTML = `
        <div class="flex items-center gap-2">
          ${p.photo_url
          ? `<img src="${p.photo_url}" class="w-6 h-6 rounded-full object-cover border border-slate-700 bg-slate-800" />`
          : `<div class="w-6 h-6 rounded-full border border-slate-700 bg-slate-800 text-[9px] flex items-center justify-center font-bold" style="color: ${activeTeamA.secondary_color}; background-color: ${activeTeamA.primary_color};">${p.number}</div>`
        }
          <div>
            <span class="text-[11px] font-semibold text-slate-300 block leading-tight">${p.number}. ${p.name}</span>
            <span class="text-[8px] text-slate-500 block leading-none">${p.position}</span>
          </div>
        </div>
        <div class="player-spawn w-6 h-6 rounded-full text-white font-bold text-[10px] flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-105 transition"
             draggable="true" 
             data-id="${p.id}"
             data-name="${p.number}"
             data-fullname="${p.name}"
             data-photo="${p.photo_url || ''}"
             data-type="player"
             style="background-color: ${activeTeamA.primary_color}; border: 1.5px solid ${activeTeamA.secondary_color};">
          ${p.number}
        </div>
      `;

      const spawnBtn = item.querySelector('.player-spawn');
      spawnBtn.addEventListener('dragstart', (e) => {
        isDraggingFromPanel = true;
        globallyDraggedData = {
          type: 'player',
          id: p.id,
          name: p.number.toString(),
          fullname: p.name,
          photo: p.photo_url,
          color: activeTeamA.primary_color,
          secondaryColor: activeTeamA.secondary_color
        };
        e.dataTransfer.setData('text/plain', JSON.stringify(globallyDraggedData));
      });

      teamARosterList.appendChild(item);
    });
  } catch (err) {
    console.error('Error fetching Team A roster:', err);
  }
}

// Load Roster list for Team B
async function loadTeamBRoster(teamId) {
  try {
    const res = await fetch(`/api/teams/${teamId}/players`);
    teamBPlayers = await res.json();
    teamBRosterList.innerHTML = '';

    if (teamBPlayers.length === 0) {
      teamBRosterList.innerHTML = '<div class="text-xs text-slate-500 italic text-center py-4">Nenhum jogador ativo nesta equipe.</div>';
      return;
    }

    teamBPlayers.forEach(p => {
      const item = document.createElement('div');
      item.className = 'flex items-center justify-between bg-slate-900/50 p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 transition shrink-0';

      item.innerHTML = `
        <div class="flex items-center gap-2">
          ${p.photo_url
          ? `<img src="${p.photo_url}" class="w-6 h-6 rounded-full object-cover border border-slate-700 bg-slate-800" />`
          : `<div class="w-6 h-6 rounded-full border border-slate-700 bg-slate-800 text-[9px] flex items-center justify-center font-bold" style="color: ${activeTeamB.secondary_color}; background-color: ${activeTeamB.primary_color};">${p.number}</div>`
        }
          <div>
            <span class="text-[11px] font-semibold text-slate-300 block leading-tight">${p.number}. ${p.name}</span>
            <span class="text-[8px] text-slate-500 block leading-none">${p.position}</span>
          </div>
        </div>
        <div class="player-spawn w-6 h-6 rounded-full text-white font-bold text-[10px] flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-105 transition"
             draggable="true" 
             data-id="${p.id}"
             data-name="${p.number}"
             data-fullname="${p.name}"
             data-photo="${p.photo_url || ''}"
             data-type="player"
             style="background-color: ${activeTeamB.primary_color}; border: 1.5px solid ${activeTeamB.secondary_color};">
          ${p.number}
        </div>
      `;

      const spawnBtn = item.querySelector('.player-spawn');
      spawnBtn.addEventListener('dragstart', (e) => {
        isDraggingFromPanel = true;
        globallyDraggedData = {
          type: 'player',
          id: p.id,
          name: p.number.toString(),
          fullname: p.name,
          photo: p.photo_url,
          color: activeTeamB.primary_color,
          secondaryColor: activeTeamB.secondary_color
        };
        e.dataTransfer.setData('text/plain', JSON.stringify(globallyDraggedData));
      });

      teamBRosterList.appendChild(item);
    });
  } catch (err) {
    console.error('Error fetching Team B roster:', err);
  }
}

// Load saved plays from Local Storage
function loadLocalStoragePlays() {
  const plays = window.StorageManager.getPlays();
  savedPlaysSelect.innerHTML = '<option value="">-- Carregar Jogada --</option>';

  Object.keys(plays).forEach(key => {
    const play = plays[key];
    const opt = document.createElement('option');
    opt.value = play.id;
    opt.textContent = `${play.title} (${new Date(play.last_modified).toLocaleDateString()})`;
    savedPlaysSelect.appendChild(opt);
  });
}

function setupEventListeners() {
  // Team A dropdown selection listener
  teamASelect.addEventListener('change', (e) => {
    const opt = e.target.selectedOptions[0];
    if (opt && opt.value) {
      activeTeamA = {
        id: opt.value,
        name: opt.textContent,
        primary_color: opt.dataset.primary,
        secondary_color: opt.dataset.secondary,
        crest_url: opt.dataset.crest
      };
      document.getElementById('team-a-badge').style.backgroundColor = activeTeamA.primary_color;
      loadTeamARoster(activeTeamA.id);
    } else {
      activeTeamA = null;
      teamAPlayers = [];
      teamARosterList.innerHTML = '<div class="text-xs text-slate-500 italic text-center py-4">Selecione a equipe A acima.</div>';
    }
  });

  // Team B dropdown selection listener
  teamBSelect.addEventListener('change', (e) => {
    const opt = e.target.selectedOptions[0];
    if (opt && opt.value) {
      activeTeamB = {
        id: opt.value,
        name: opt.textContent,
        primary_color: opt.dataset.primary,
        secondary_color: opt.dataset.secondary,
        crest_url: opt.dataset.crest
      };
      document.getElementById('team-b-badge').style.backgroundColor = activeTeamB.primary_color;
      loadTeamBRoster(activeTeamB.id);
    } else {
      activeTeamB = null;
      teamBPlayers = [];
      teamBRosterList.innerHTML = '<div class="text-xs text-slate-500 italic text-center py-4">Selecione a equipe B acima.</div>';
    }
  });

  // Auto-distribute formation A (Left Half)
  formationASelect.addEventListener('change', (e) => {
    const formationKey = e.target.value;
    if (!formationKey || !activeTeamA || teamAPlayers.length === 0) return;

    const coords = formations[formationKey];
    if (!coords) return;

    const frame = frames[currentFrameIndex];
    // Remove previous Team A players from field
    frame.tokens = frame.tokens.filter(t => t.type !== 'player' || t.color !== activeTeamA.primary_color);

    const titulars = teamAPlayers.slice(0, 11);
    titulars.forEach((p, idx) => {
      if (idx < coords.length) {
        const coord = coords[idx];
        const internalId = 'tpl_A_' + p.id + '_' + Date.now() + Math.random().toString(36).substr(2, 5);

        // Remap to left half: x -> 0.02 + coord.x * 0.44 (which is range [0.02, 0.46])
        const remappedX = 0.02 + coord.x * 0.44;

        frame.tokens.push({
          id: internalId,
          dbId: p.id,
          type: 'player',
          name: p.number.toString(),
          fullname: p.name,
          photo: p.photo_url,
          color: activeTeamA.primary_color,
          secondaryColor: activeTeamA.secondary_color,
          x: remappedX,
          y: coord.y,
          attachedTo: null
        });
      }
    });

    showToast(`Time A auto-distribuído no esquema ${formationKey}!`);
    e.target.value = '';
  });

  // Auto-distribute formation B (Right Half, Mirrored)
  formationBSelect.addEventListener('change', (e) => {
    const formationKey = e.target.value;
    if (!formationKey || !activeTeamB || teamBPlayers.length === 0) return;

    const coords = formations[formationKey];
    if (!coords) return;

    const frame = frames[currentFrameIndex];
    // Remove previous Team B players from field
    frame.tokens = frame.tokens.filter(t => t.type !== 'player' || t.color !== activeTeamB.primary_color);

    const titulars = teamBPlayers.slice(0, 11);
    titulars.forEach((p, idx) => {
      if (idx < coords.length) {
        const coord = coords[idx];
        const internalId = 'tpl_B_' + p.id + '_' + Date.now() + Math.random().toString(36).substr(2, 5);

        // Remap to right half (mirrored): x -> 0.98 - coord.x * 0.44 (which is range [0.54, 0.98])
        const remappedX = 0.98 - coord.x * 0.44;

        frame.tokens.push({
          id: internalId,
          dbId: p.id,
          type: 'player',
          name: p.number.toString(),
          fullname: p.name,
          photo: p.photo_url,
          color: activeTeamB.primary_color,
          secondaryColor: activeTeamB.secondary_color,
          x: remappedX,
          y: coord.y,
          attachedTo: null
        });
      }
    });

    showToast(`Time B auto-distribuído no esquema ${formationKey}!`);
    e.target.value = '';
  });

  // Left resizer
  const resizerLeft = document.getElementById('sidebar-resizer-left');
  const sidebarLeft = document.getElementById('sidebar-left');
  if (resizerLeft && sidebarLeft) {
    resizerLeft.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      const onMove = (mv) => {
        const w = mv.clientX;
        if (w >= 220 && w <= 500) {
          sidebarLeft.style.width = w + 'px';
          setupCanvasSize();
        }
      };
      const onUp = () => {
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    });
  }

  // Right resizer
  const resizerRight = document.getElementById('sidebar-resizer-right');
  const sidebarRight = document.getElementById('sidebar-right');
  if (resizerRight && sidebarRight) {
    resizerRight.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      const onMove = (mv) => {
        const w = window.innerWidth - mv.clientX;
        if (w >= 220 && w <= 500) {
          sidebarRight.style.width = w + 'px';
          setupCanvasSize();
        }
      };
      const onUp = () => {
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    });
  }

  // Bottom resizer
  const resizerBottom = document.getElementById('timeline-resizer');
  const footerBottom = document.getElementById('timeline-footer');
  if (resizerBottom && footerBottom) {
    resizerBottom.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
      const onMove = (mv) => {
        const h = window.innerHeight - mv.clientY;
        if (h >= 100 && h <= 300) {
          footerBottom.style.height = h + 'px';
          setupCanvasSize();
        }
      };
      const onUp = () => {
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    });
  }

  // Drag source setup for neutrals and ball
  const ballSpawn = document.getElementById('ball-spawn');
  ballSpawn.addEventListener('dragstart', (e) => {
    globallyDraggedData = {
      type: 'ball',
      name: 'BOLA',
      color: '#FFFFFF'
    };
    e.dataTransfer.setData('text/plain', JSON.stringify(globallyDraggedData));
  });

  document.querySelectorAll('.generic-spawn').forEach(el => {
    el.addEventListener('dragstart', (e) => {
      globallyDraggedData = {
        type: el.dataset.type,
        name: el.dataset.name,
        color: el.dataset.color
      };
      e.dataTransfer.setData('text/plain', JSON.stringify(globallyDraggedData));
    });
  });

  window.addEventListener('dragend', () => {
    globallyDraggedData = null;
    isDraggingFromPanel = false;
  });

  // Drop on Canvas
  canvas.addEventListener('dragover', (e) => e.preventDefault());
  canvas.addEventListener('drop', (e) => {
    e.preventDefault();
    isDraggingFromPanel = false;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    try {
      let data = globallyDraggedData;

      if (!data) {
        const rawData = e.dataTransfer.getData('text/plain');
        if (!rawData) return;

        try {
          data = JSON.parse(rawData);
        } catch (jsonErr) {
          // Fallback if data is not JSON (some browsers send element text)
          const cleanText = rawData.trim();
          if (cleanText === 'REF' || cleanText.includes('REF')) {
            data = { type: 'referee', name: 'REF', color: '#eab308' };
          } else if (cleanText === '▲' || cleanText.includes('CONE')) {
            data = { type: 'cone', name: 'CONE', color: '#f97316' };
          } else if (cleanText === 'BOLA') {
            data = { type: 'ball', name: 'BOLA', color: '#FFFFFF' };
          } else {
            console.warn('Unknown drag data text:', cleanText);
            return;
          }
        }
      }

      const frame = frames[currentFrameIndex];

      // Check 11 active players rule
      if (data.type === 'player') {
        const currentLineCount = frame.tokens.filter(t => t.type === 'player' && t.color === data.color).length;
        if (currentLineCount >= 11) {
          showToast('Limite máximo de 11 jogadores por equipe no campo atingido!');
          return;
        }
      }

      const internalId = Date.now() + Math.random().toString(36).substr(2, 9);
      frame.tokens.push({
        id: internalId,
        dbId: data.id || null,
        type: data.type,
        name: data.name,
        fullname: data.fullname || '',
        photo: data.photo || null,
        color: data.color,
        secondaryColor: data.secondaryColor || '#FFFFFF',
        x: x,
        y: y,
        attachedTo: null
      });
    } catch (err) {
      console.error('Canvas drop error:', err);
    }
  });

  // Tools selector
  const tools = [
    { id: 'tool-select', name: 'select' },
    { id: 'tool-line-solid', name: 'line-solid' },
    { id: 'tool-line-dashed', name: 'line-dashed' },
    { id: 'tool-line-wavy', name: 'line-wavy' },
    { id: 'tool-eraser', name: 'eraser' }
  ];

  tools.forEach(tool => {
    document.getElementById(tool.id).addEventListener('click', () => {
      tools.forEach(t => document.getElementById(t.id).classList.remove('active-tool'));
      document.getElementById(tool.id).classList.add('active-tool');
      activeTool = tool.name;
    });
  });

  // Color Pickers
  document.querySelectorAll('.color-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      activeColor = dot.dataset.color;
      document.getElementById('custom-color-picker').value = activeColor;
    });
  });

  document.getElementById('custom-color-picker').addEventListener('input', (e) => {
    activeColor = e.target.value;
  });

  document.getElementById('anchor-origin').addEventListener('change', (e) => {
    anchorToPlayer = e.target.checked;
  });

  document.getElementById('btn-clear-canvas').addEventListener('click', () => {
    frames[currentFrameIndex].lines = [];
    showToast('Desenhos e rotas limpos!');
  });

  // Field backgrounds
  document.querySelectorAll('.layout-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.layout-btn').forEach(b => b.classList.remove('active-layout'));
      btn.classList.add('active-layout');
      currentLayout = btn.dataset.layout;
      showToast(`Layout alterado para: ${btn.textContent.trim()}`);
    });
  });

  // Playback Control Buttons
  document.getElementById('btn-prev-frame').addEventListener('click', () => {
    if (currentFrameIndex > 0) selectFrame(currentFrameIndex - 1);
  });

  document.getElementById('btn-next-frame').addEventListener('click', () => {
    if (currentFrameIndex < frames.length - 1) selectFrame(currentFrameIndex + 1);
  });

  document.getElementById('btn-play-pause').addEventListener('click', togglePlay);

  animationSpeedInput.addEventListener('input', (e) => {
    transitionDuration = parseFloat(e.target.value);
    speedDisplay.textContent = `${transitionDuration.toFixed(1)}s`;
  });

  // Frame manipulation
  document.getElementById('btn-add-frame').addEventListener('click', () => {
    const currentFrame = frames[currentFrameIndex];
    const newFrame = JSON.parse(JSON.stringify(currentFrame));
    frames.splice(currentFrameIndex + 1, 0, newFrame);
    currentFrameIndex++;
    updateTimelineUI();
    showToast('Frame adicionado!');
  });

  document.getElementById('btn-delete-frame').addEventListener('click', () => {
    if (frames.length <= 1) {
      showToast('Você deve manter pelo menos um frame!');
      return;
    }
    frames.splice(currentFrameIndex, 1);
    currentFrameIndex = Math.max(0, currentFrameIndex - 1);
    updateTimelineUI();
    showToast('Frame removido!');
  });

  // Local Storage Save trigger
  document.getElementById('btn-save-play').addEventListener('click', () => {
    const title = playTitleInput.value.trim();
    if (!title) {
      showToast('Insira um título para a jogada!');
      return;
    }

    const payload = {
      title,
      team_a_id: activeTeamA ? activeTeamA.id : null,
      team_b_id: activeTeamB ? activeTeamB.id : null,
      background: currentLayout,
      frames
    };

    currentPlayId = window.StorageManager.savePlay(currentPlayId, payload);
    loadLocalStoragePlays();
    showToast('Jogada salva no LocalStorage com sucesso!');
  });

  // Local Storage Load trigger
  savedPlaysSelect.addEventListener('change', (e) => {
    const id = e.target.value;
    if (!id) return;

    const play = window.StorageManager.getPlay(id);
    if (play) {
      currentPlayId = play.id;
      playTitleInput.value = play.title;
      currentLayout = play.background;
      frames = play.frames;
      currentFrameIndex = 0;

      // Select layout button
      document.querySelectorAll('.layout-btn').forEach(btn => {
        if (btn.dataset.layout === currentLayout) {
          btn.classList.add('active-layout');
        } else {
          btn.classList.remove('active-layout');
        }
      });

      // Reset team dropdown filters if play references them
      if (play.team_a_id) {
        teamASelect.value = play.team_a_id;
        teamASelect.dispatchEvent(new Event('change'));
      }
      if (play.team_b_id) {
        teamBSelect.value = play.team_b_id;
        teamBSelect.dispatchEvent(new Event('change'));
      }

      updateTimelineUI();
      showToast('Jogada carregada do LocalStorage!');
    }
  });

  // Export buttons
  document.getElementById('btn-export-img').addEventListener('click', exportPNG);
  document.getElementById('btn-export-vid').addEventListener('click', exportVideo);

  // Pointer Canvas Drag/Drawing triggers
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);

  // Trash bin click to remove
  const trashBin = document.getElementById('board-trash');
  trashBin.addEventListener('click', () => {
    if (selectedToken) {
      const frame = frames[currentFrameIndex];
      frame.tokens = frame.tokens.filter(t => t.id !== selectedToken.id);
      selectedToken = null;
      showToast('Elemento removido do campo');
    } else {
      showToast('Selecione um elemento no campo e clique aqui para remover.');
    }
  });

  // Dynamic Panel visibility toggles (Minimizers)
  const toggleLeftBtn = document.getElementById('toggle-panel-left');
  const sidebarLeftEl = document.getElementById('sidebar-left');
  const resizerLeftEl = document.getElementById('sidebar-resizer-left');

  toggleLeftBtn.addEventListener('click', () => {
    const isHidden = sidebarLeftEl.classList.toggle('hidden');
    if (resizerLeftEl) resizerLeftEl.classList.toggle('hidden', isHidden);
    toggleLeftBtn.classList.toggle('active-tool', !isHidden);
    setupCanvasSize();
  });

  const toggleRightBtn = document.getElementById('toggle-panel-right');
  const sidebarRightEl = document.getElementById('sidebar-right');
  const resizerRightEl = document.getElementById('sidebar-resizer-right');

  toggleRightBtn.addEventListener('click', () => {
    const isHidden = sidebarRightEl.classList.toggle('hidden');
    if (resizerRightEl) resizerRightEl.classList.toggle('hidden', isHidden);
    toggleRightBtn.classList.toggle('active-tool', !isHidden);
    setupCanvasSize();
  });

  const toggleTimelineBtn = document.getElementById('toggle-panel-timeline');
  const timelineFooterEl = document.getElementById('timeline-footer');
  const resizerBottomEl = document.getElementById('timeline-resizer');

  toggleTimelineBtn.addEventListener('click', () => {
    const isHidden = timelineFooterEl.classList.toggle('hidden');
    if (resizerBottomEl) resizerBottomEl.classList.toggle('hidden', isHidden);
    toggleTimelineBtn.classList.toggle('active-tool', !isHidden);
    setupCanvasSize();
  });

  const toggleToolsBtn = document.getElementById('toggle-panel-tools');
  const floatingToolsEl = document.getElementById('floating-game-elements');

  toggleToolsBtn.addEventListener('click', () => {
    const isHidden = floatingToolsEl.classList.toggle('hidden');
    toggleToolsBtn.classList.toggle('active-tool', !isHidden);
  });
}

function showToast(message) {
  const alertEl = document.getElementById('floating-alert');
  document.getElementById('floating-alert-text').textContent = message;
  alertEl.classList.remove('opacity-0', 'pointer-events-none');
  setTimeout(() => {
    alertEl.classList.add('opacity-0', 'pointer-events-none');
  }, 2500);
}

function selectFrame(index) {
  currentFrameIndex = index;
  updateTimelineUI();
}

function updateTimelineUI() {
  keyframesTimeline.innerHTML = '';

  if (frames.length === 0) {
    keyframesTimeline.innerHTML = '<div class="text-xs text-slate-500 italic mx-auto">Adicione frames para criar uma animação.</div>';
    return;
  }

  frames.forEach((frame, idx) => {
    const card = document.createElement('div');
    card.className = `frame-card shrink-0 w-24 h-16 bg-slate-900 border border-slate-800 rounded-lg p-1.5 flex flex-col justify-between cursor-pointer select-none relative ${idx === currentFrameIndex ? 'active-frame-card' : ''}`;

    card.innerHTML = `
      <div class="text-[9px] text-slate-400 font-bold">Quadro ${idx + 1}</div>
      <div class="text-[10px] text-slate-300 font-medium truncate flex items-center justify-between">
        <span>${frame.tokens.length} elems</span>
        <button class="btn-delete-timeline-card text-red-500 hover:text-red-400 font-bold text-[9px] hidden" data-idx="${idx}">✕</button>
      </div>
    `;

    card.addEventListener('mouseenter', () => {
      card.querySelector('.btn-delete-timeline-card').classList.remove('hidden');
    });
    card.addEventListener('mouseleave', () => {
      card.querySelector('.btn-delete-timeline-card').classList.add('hidden');
    });

    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-delete-timeline-card')) {
        e.stopPropagation();
        const deleteIdx = parseInt(e.target.dataset.idx);
        if (frames.length <= 1) {
          showToast('Você deve manter pelo menos um frame!');
          return;
        }
        frames.splice(deleteIdx, 1);
        currentFrameIndex = Math.max(0, currentFrameIndex - 1);
        updateTimelineUI();
        return;
      }
      selectFrame(idx);
    });

    keyframesTimeline.appendChild(card);
  });

  activeFrameNumLabel.textContent = `${currentFrameIndex + 1}/${frames.length}`;
}

function togglePlay() {
  if (isPlaying) {
    isPlaying = false;
    document.getElementById('btn-play-pause').innerHTML = '<i class="fa-solid fa-play text-xs"></i> <span>Play</span>';
  } else {
    if (frames.length < 2) {
      showToast('Crie pelo menos 2 frames para animar!');
      return;
    }
    isPlaying = true;
    playbackFrameIndex = 0;
    currentFrameIndex = 0;
    animationStartTime = null;
    document.getElementById('btn-play-pause').innerHTML = '<i class="fa-solid fa-pause text-xs"></i> <span>Pausar</span>';
  }
}

function getRelativeCoords(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) / rect.width,
    y: (e.clientY - rect.top) / rect.height
  };
}

function getDistance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function getTokenAt(rx, ry) {
  const frame = frames[currentFrameIndex];
  const rect = canvas.getBoundingClientRect();
  const playerRadiusRel = 16 / rect.width;
  const ballRadiusRel = 10 / rect.width;

  for (let i = frame.tokens.length - 1; i >= 0; i--) {
    const token = frame.tokens[i];
    const r = token.type === 'ball' ? ballRadiusRel : playerRadiusRel;
    if (getDistance(rx, ry, token.x, token.y) < r * 1.5) {
      return token;
    }
  }
  return null;
}

// Pointer down
function onPointerDown(e) {
  // If currently dragging an element from sidebar, skip canvas pointer handling
  if (isDraggingFromPanel) return;

  const coords = getRelativeCoords(e);

  if (activeTool === 'select') {
    selectedToken = getTokenAt(coords.x, coords.y);
    if (selectedToken) {
      canvas.style.cursor = 'grabbing';
    }
  } else if (['line-solid', 'line-dashed', 'line-wavy'].includes(activeTool)) {
    isDrawingLine = true;
    let originId = null;
    let startX = coords.x;
    let startY = coords.y;

    if (anchorToPlayer) {
      const clickedPlayer = getTokenAt(coords.x, coords.y);
      if (clickedPlayer && clickedPlayer.type !== 'ball') {
        originId = clickedPlayer.id;
        startX = clickedPlayer.x;
        startY = clickedPlayer.y;
      }
    }

    currentDrawingLine = {
      type: activeTool.replace('line-', ''),
      originId,
      originX: startX,
      originY: startY,
      targetX: coords.x,
      targetY: coords.y,
      color: activeColor
    };
  } else if (activeTool === 'eraser') {
    eraseNear(coords.x, coords.y);
  }
}

// Pointer Move
function onPointerMove(e) {
  // If currently dragging an element from sidebar, skip
  if (isDraggingFromPanel) return;

  const coords = getRelativeCoords(e);

  if (activeTool === 'select' && selectedToken) {
    selectedToken.x = Math.max(0, Math.min(1, coords.x));
    selectedToken.y = Math.max(0, Math.min(1, coords.y));

    const frame = frames[currentFrameIndex];
    const attachedBall = frame.tokens.find(t => t.type === 'ball' && t.attachedTo === selectedToken.id);
    if (attachedBall) {
      attachedBall.x = selectedToken.x + 0.02;
      attachedBall.y = selectedToken.y;
    }

    if (selectedToken.type === 'ball' && selectedToken.attachedTo) {
      const owner = frame.tokens.find(t => t.id === selectedToken.attachedTo);
      if (owner && getDistance(selectedToken.x, selectedToken.y, owner.x, owner.y) > 0.08) {
        selectedToken.attachedTo = null;
      }
    }
  } else if (isDrawingLine && currentDrawingLine) {
    currentDrawingLine.targetX = coords.x;
    currentDrawingLine.targetY = coords.y;
  }
}

// Pointer Up
function onPointerUp() {
  canvas.style.cursor = 'default';

  if (activeTool === 'select' && selectedToken) {
    const frame = frames[currentFrameIndex];

    if (selectedToken.type === 'ball') {
      const nearestPlayer = frame.tokens
        .filter(t => t.type === 'player')
        .find(p => getDistance(selectedToken.x, selectedToken.y, p.x, p.y) < 0.05);

      if (nearestPlayer) {
        selectedToken.attachedTo = nearestPlayer.id;
        selectedToken.x = nearestPlayer.x + 0.02;
        selectedToken.y = nearestPlayer.y;
        showToast(`Posse de bola: ${nearestPlayer.fullname || nearestPlayer.name}`);
      }
    } else if (selectedToken.type === 'player') {
      const ball = frame.tokens.find(t => t.type === 'ball');
      if (ball && !ball.attachedTo) {
        if (getDistance(selectedToken.x, selectedToken.y, ball.x, ball.y) < 0.05) {
          ball.attachedTo = selectedToken.id;
          ball.x = selectedToken.x + 0.02;
          ball.y = selectedToken.y;
          showToast(`Posse de bola: ${selectedToken.fullname || selectedToken.name}`);
        }
      }
    }
    selectedToken = null;
  } else if (isDrawingLine && currentDrawingLine) {
    frames[currentFrameIndex].lines.push(currentDrawingLine);
    isDrawingLine = false;
    currentDrawingLine = null;
  }
}

function eraseNear(rx, ry) {
  const frame = frames[currentFrameIndex];

  const initialLineCount = frame.lines.length;
  frame.lines = frame.lines.filter(line => {
    const midX = (line.originX + line.targetX) / 2;
    const midY = (line.originY + line.targetY) / 2;
    return getDistance(rx, ry, midX, midY) > 0.06;
  });

  if (frame.lines.length < initialLineCount) {
    showToast('Linha removida');
    return;
  }

  const clickedToken = getTokenAt(rx, ry);
  if (clickedToken) {
    frame.tokens = frame.tokens.filter(t => t.id !== clickedToken.id);
    showToast('Elemento removido');
  }
}

function lerp(start, end, amt) {
  return (1 - amt) * start + amt * end;
}

// Animation loops
function animationLoop(timestamp) {
  try {
    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);
    ctx.clearRect(0, 0, width, height);

    drawPitchBackground(width, height);

    let renderTokens = [];
    let renderLines = [];

    if (isPlaying) {
      if (!animationStartTime) animationStartTime = timestamp;
      const elapsed = (timestamp - animationStartTime) / 1000;
      const progress = Math.min(1, elapsed / transitionDuration);

      const startFrame = frames[playbackFrameIndex];
      const endFrame = frames[playbackFrameIndex + 1];

      if (startFrame && endFrame) {
        startFrame.tokens.forEach(startToken => {
          const endToken = endFrame.tokens.find(t => t.id === startToken.id) ||
            endFrame.tokens.find(t => t.type === startToken.type && t.name === startToken.name);

          if (endToken) {
            renderTokens.push({
              ...startToken,
              x: lerp(startToken.x, endToken.x, progress),
              y: lerp(startToken.y, endToken.y, progress)
            });
          } else {
            renderTokens.push(startToken);
          }
        });

        endFrame.tokens.forEach(endToken => {
          const exists = renderTokens.some(t => t.id === endToken.id);
          if (!exists) renderTokens.push(endToken);
        });

        startFrame.lines.forEach((startLine, index) => {
          const endLine = endFrame.lines[index];
          if (endLine) {
            renderLines.push({
              ...startLine,
              originX: lerp(startLine.originX, endLine.originX, progress),
              originY: lerp(startLine.originY, endLine.originY, progress),
              targetX: lerp(startLine.targetX, endLine.targetX, progress),
              targetY: lerp(startLine.targetY, endLine.targetY, progress)
            });
          } else {
            renderLines.push(startLine);
          }
        });
      }

      if (progress >= 1) {
        playbackFrameIndex++;
        animationStartTime = timestamp;
        if (playbackFrameIndex >= frames.length - 1) {
          isPlaying = false;
          currentFrameIndex = frames.length - 1;
          updateTimelineUI();
          document.getElementById('btn-play-pause').innerHTML = '<i class="fa-solid fa-play text-xs"></i> <span>Play</span>';
          showToast('Reprodução concluída!');
        } else {
          currentFrameIndex = playbackFrameIndex;
          updateTimelineUI();
        }
      }
    } else {
      const currentFrame = frames[currentFrameIndex];
      if (currentFrame) {
        renderTokens = currentFrame.tokens;
        renderLines = currentFrame.lines;
      }
    }

    // Draw lines & players
    renderLines.forEach(line => drawVectorLine(line, renderTokens, width, height));
    if (isDrawingLine && currentDrawingLine) {
      drawVectorLine(currentDrawingLine, renderTokens, width, height);
    }
    renderTokens.forEach(token => drawToken(token, width, height));
  } catch (err) {
    console.error("Error in animationLoop:", err);
  } finally {
    requestAnimationFrame(animationLoop);
  }
}

function drawPitchBackground(w, h) {
  ctx.fillStyle = '#064e3b';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 2;

  if (currentLayout === 'FULL') {
    ctx.strokeRect(20, 20, w - 40, h - 40);
    ctx.beginPath();
    ctx.moveTo(w / 2, 20);
    ctx.lineTo(w / 2, h - 20);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.15, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 3, 0, 2 * Math.PI);
    ctx.fill();

    const boxH = h * 0.5;
    const boxW = w * 0.16;
    ctx.strokeRect(20, (h - boxH) / 2, boxW, boxH);
    ctx.strokeRect(20, (h - boxH / 2.5) / 2, boxW / 3, boxH / 2.5);
    ctx.strokeRect(w - 20 - boxW, (h - boxH) / 2, boxW, boxH);
    ctx.strokeRect(w - 20 - (boxW / 3), (h - boxH / 2.5) / 2, boxW / 3, boxH / 2.5);
    ctx.beginPath();
    ctx.arc(20 + boxW * 0.7, h / 2, 2, 0, 2 * Math.PI);
    ctx.arc(w - 20 - boxW * 0.7, h / 2, 2, 0, 2 * Math.PI);
    ctx.fill();
  } else if (currentLayout === 'HALF_DEF') {
    ctx.strokeRect(20, 20, w - 40, h - 40);
    ctx.beginPath();
    ctx.moveTo(w - 20, 20);
    ctx.lineTo(w - 20, h - 20);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w - 20, h / 2, Math.min(w, h) * 0.25, 0.5 * Math.PI, 1.5 * Math.PI);
    ctx.stroke();
    const boxH = h * 0.6;
    const boxW = w * 0.35;
    ctx.strokeRect(20, (h - boxH) / 2, boxW, boxH);
    ctx.strokeRect(20, (h - boxH / 2.5) / 2, boxW / 3, boxH / 2.5);
  } else if (currentLayout === 'HALF_OFF') {
    ctx.strokeRect(20, 20, w - 40, h - 40);
    ctx.beginPath();
    ctx.moveTo(20, 20);
    ctx.lineTo(20, h - 20);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(20, h / 2, Math.min(w, h) * 0.25, 1.5 * Math.PI, 0.5 * Math.PI);
    ctx.stroke();
    const boxH = h * 0.6;
    const boxW = w * 0.35;
    ctx.strokeRect(w - 20 - boxW, (h - boxH) / 2, boxW, boxH);
    ctx.strokeRect(w - 20 - (boxW / 3), (h - boxH / 2.5) / 2, boxW / 3, boxH / 2.5);
  } else if (currentLayout === 'BOX') {
    ctx.strokeRect(20, 20, w - 40, h - 40);
    ctx.beginPath();
    ctx.moveTo(w / 2 - 120, 20);
    ctx.lineTo(w / 2 + 120, 20);
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeRect(w * 0.15, 20, w * 0.7, h * 0.7);
    ctx.strokeRect(w * 0.3, 20, w * 0.4, h * 0.25);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.45, 3, 0, 2 * Math.PI);
    ctx.fill();
  }
}

function drawVectorLine(line, tokens, w, h) {
  let startX = line.originX * w;
  let startY = line.originY * h;

  if (line.originId) {
    const p = tokens.find(t => t.id === line.originId);
    if (p) {
      startX = p.x * w;
      startY = p.y * h;
    }
  }

  const endX = line.targetX * w;
  const endY = line.targetY * h;

  ctx.strokeStyle = line.color;
  ctx.fillStyle = line.color;
  ctx.lineWidth = 3;

  if (line.type === 'solid') {
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  } else if (line.type === 'dashed') {
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.setLineDash([]);
  } else if (line.type === 'wavy') {
    ctx.setLineDash([]);
    ctx.beginPath();
    const steps = 30;
    const waveFreq = 0.15;
    const waveAmp = 5;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const currX = lerp(startX, endX, t);
      const currY = lerp(startY, endY, t);

      const dx = endX - startX;
      const dy = endY - startY;
      const len = Math.sqrt(dx * dx + dy * dy);
      const nx = -dy / len;
      const ny = dx / len;
      const offset = Math.sin(t * Math.PI * 2 * (len * waveFreq / 10)) * waveAmp;

      if (i === 0) {
        ctx.moveTo(currX + nx * offset, currY + ny * offset);
      } else {
        ctx.lineTo(currX + nx * offset, currY + ny * offset);
      }
    }
    ctx.stroke();
  }

  // Arrowhead
  const angle = Math.atan2(endY - startY, endX - startX);
  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(endX - 12 * Math.cos(angle - Math.PI / 6), endY - 12 * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(endX - 12 * Math.cos(angle + Math.PI / 6), endY - 12 * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}

function drawToken(token, w, h) {
  const tx = token.x * w;
  const ty = token.y * h;

  if (token.type === 'ball') {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(tx, ty, 8, 0, 2 * Math.PI);
    ctx.fill();

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI) / 5;
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx + 8 * Math.cos(angle), ty + 8 * Math.sin(angle));
    }
    ctx.stroke();
    ctx.restore();
  } else if (token.type === 'cone') {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = token.color || '#f97316';
    ctx.beginPath();
    ctx.moveTo(tx, ty - 12);
    ctx.lineTo(tx - 10, ty + 10);
    ctx.lineTo(tx + 10, ty + 10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  } else if (token.type === 'referee') {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;

    const radius = 14;
    ctx.beginPath();
    ctx.arc(tx, ty, radius, 0, Math.PI * 2);
    ctx.fillStyle = token.color || '#eab308';
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 9px Outfit, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('REF', tx, ty);
    ctx.restore();
  } else {
    // Player rendering
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;

    const radius = 15;

    // Draw boundary circle
    ctx.beginPath();
    ctx.arc(tx, ty, radius, 0, Math.PI * 2);
    ctx.fillStyle = token.secondaryColor || '#FFFFFF';
    ctx.fill();

    const photoImg = token.photo ? getCachedImage(token.photo) : null;
    if (photoImg) {
      ctx.beginPath();
      ctx.arc(tx, ty, radius - 1.5, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(photoImg, tx - radius, ty - radius, radius * 2, radius * 2);
    } else {
      ctx.beginPath();
      ctx.arc(tx, ty, radius - 1.5, 0, Math.PI * 2);
      ctx.fillStyle = token.color || '#3b82f6';
      ctx.fill();

      ctx.fillStyle = token.secondaryColor || '#FFFFFF';
      ctx.font = 'bold 11px Outfit, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(token.name, tx, ty);
    }

    ctx.restore();
  }
}

function exportPNG() {
  const link = document.createElement('a');
  link.download = `${playTitleInput.value.trim() || 'jogada-tatica'}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  showToast('Imagem PNG exportada!');
}

function exportVideo() {
  if (frames.length < 2) {
    showToast('Crie pelo menos 2 frames para gravar um vídeo!');
    return;
  }

  showToast('Gravando animação em vídeo...');

  isPlaying = true;
  playbackFrameIndex = 0;
  currentFrameIndex = 0;
  animationStartTime = null;

  const stream = canvas.captureStream(60);
  let options = { mimeType: 'video/webm;codecs=vp9' };
  if (!MediaRecorder.isTypeSupported(options.mimeType)) {
    options = { mimeType: 'video/webm;codecs=vp8' };
  }
  if (!MediaRecorder.isTypeSupported(options.mimeType)) {
    options = { mimeType: 'video/webm' };
  }

  const mediaRecorder = new MediaRecorder(stream, options);
  const chunks = [];

  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  mediaRecorder.onstop = () => {
    const blob = new Blob(chunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${playTitleInput.value.trim() || 'jogada-tatica'}.webm`;
    a.click();
    window.URL.revokeObjectURL(url);
    showToast('Vídeo WebM exportado!');
  };

  mediaRecorder.start();

  const checker = setInterval(() => {
    if (!isPlaying) {
      clearInterval(checker);
      mediaRecorder.stop();
    }
  }, 100);
}
