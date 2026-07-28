/**
 * VDJ Skin DOM Renderer
 * Renders parsed VDJ skin elements into HTML/CSS DOM
 */
class VdjRenderer {
  constructor(container, options = {}) {
    this.container = container;
    this.imagePath = options.imagePath || '';
    this.scale = options.scale || 1;
    this.skinWidth = options.skinWidth || 1920;
    this.skinHeight = options.skinHeight || 1080;
  }

  /**
   * Render the parsed skin
   */
  render(skin) {
    this.container.innerHTML = '';

    // Create the skin wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'vdj-skin';
    wrapper.style.cssText = `
      position: relative;
      width: ${this.skinWidth * this.scale}px;
      height: ${this.skinHeight * this.scale}px;
      transform-origin: 0 0;
      transform: scale(${this.scale});
      background-color: #1b1c1d;
      overflow: hidden;
    `;

    // Render all elements
    for (const el of skin.elements) {
      const domEl = this._renderElement(el);
      if (domEl) {
        wrapper.appendChild(domEl);
      }
    }

    this.container.appendChild(wrapper);
    return wrapper;
  }

  /**
   * Create a positioned div
   */
  _createBase(el, extraStyle = '') {
    const div = document.createElement('div');
    div.className = `vdj-${el.type}`;
    div.style.cssText = `
      position: absolute;
      left: ${el.x}px;
      top: ${el.y}px;
      width: ${el.width}px;
      height: ${el.height}px;
      box-sizing: border-box;
      ${extraStyle}
    `;
    div.title = el.tooltip || el.action || '';
    return div;
  }

  /**
   * Apply graphic state styling to a div (image-based or vector-based)
   */
  _applyStateStyle(div, state, elWidth, elHeight) {
    if (!state) return;

    // Image-based graphics (has x, y coordinates)
    if (state.x !== undefined && state.y !== undefined && !state.shape) {
      div.style.backgroundImage = `url(${this.imagePath})`;
      div.style.backgroundPosition = `-${state.x}px -${state.y}px`;
      div.style.backgroundRepeat = 'no-repeat';
      if (state.width) div.style.width = `${state.width}px`;
      if (state.height) div.style.height = `${state.height}px`;
    }
    // Vector-based graphics (has shape)
    else if (state.shape) {
      if (state.shape === 'square') {
        this._applySquareStyle(div, state);
      } else if (state.shape === 'circle') {
        div.style.borderRadius = '50%';
        if (state.color) div.style.backgroundColor = state.color;
        if (state.borderColor && state.border) {
          div.style.border = `${state.border}px solid ${state.borderColor}`;
        }
      }
    }
  }

  /**
   * Apply square/rectangle style
   */
  _applySquareStyle(div, state) {
    if (state.color) {
      if (state.gradient && state.color2) {
        const dir = state.gradient === 'horizontal' ? 'to right' :
                    state.gradient === 'circular' ? 'radial' : 'to bottom';
        div.style.background = `linear-gradient(${dir}, ${state.color}, ${state.color2})`;
      } else {
        div.style.backgroundColor = state.color;
      }
    }
    if (state.radius && state.radius > 0) {
      div.style.borderRadius = `${state.radius}px`;
    }
    if (state.borderColor && state.border) {
      div.style.border = `${state.border}px solid ${state.borderColor}`;
    } else if (state.border && !state.borderColor) {
      div.style.border = `${state.border}px solid transparent`;
    }
    if (state.highlight && state.highlightSize) {
      div.style.boxShadow = `inset 0 ${state.highlightSize}px 0 ${state.highlight}`;
    }
  }

  /**
   * Render an individual element to DOM
   */
  _renderElement(el) {
    switch (el.type) {
      case 'button': return this._renderButton(el);
      case 'textzone': return this._renderTextzone(el);
      case 'visual': return this._renderVisual(el);
      case 'slider': return this._renderSlider(el);
      case 'square': return this._renderSquare(el);
      case 'circle': return this._renderCircle(el);
      case 'line': return this._renderLine(el);
      case 'video': return this._renderVideo(el);
      case 'scratch': return this._renderScratch(el);
      case 'songpos': return this._renderSongpos(el);
      case 'browser': return this._renderBrowser(el);
      case 'cover': return this._renderCover(el);
      case 'logo': return this._renderLogo(el);
      default: return null;
    }
  }

  _renderButton(el) {
    const div = this._createBase(el, 'cursor: pointer;');
    div.setAttribute('data-action', el.action);

    // Apply the "up" state
    const upState = el.states.up || el.states.off;
    if (upState) {
      this._applyStateStyle(div, upState, el.width, el.height);
    }

    // Hover effect
    const overState = el.states.over || upState;
    div.addEventListener('mouseenter', () => {
      if (overState && overState.shape) {
        if (overState.shape === 'square') this._applySquareStyle(div, overState);
        else if (overState.shape === 'circle') {
          div.style.backgroundColor = overState.color || '';
        }
      }
    });
    div.addEventListener('mouseleave', () => {
      if (upState && upState.shape) {
        if (upState.shape === 'square') this._applySquareStyle(div, upState);
        else if (upState.shape === 'circle') {
          div.style.backgroundColor = upState.color || '';
        }
      }
    });

    // Click effect
    const downState = el.states.down || el.states.on;
    div.addEventListener('mousedown', () => {
      if (downState && downState.shape) {
        if (downState.shape === 'square') this._applySquareStyle(div, downState);
        else if (downState.shape === 'circle') {
          div.style.backgroundColor = downState.color || '';
        }
      }
    });
    div.addEventListener('mouseup', () => {
      if (overState && overState.shape) {
        if (overState.shape === 'square') this._applySquareStyle(div, overState);
        else if (overState.shape === 'circle') {
          div.style.backgroundColor = overState.color || '';
        }
      } else if (upState && upState.shape) {
        if (upState.shape === 'square') this._applySquareStyle(div, upState);
        else if (upState.shape === 'circle') {
          div.style.backgroundColor = upState.color || '';
        }
      }
    });

    // Text overlay
    if (el.text) {
      const textSpan = this._createTextElement(el.text, el.width, el.height);
      div.appendChild(textSpan);
    }

    // Icon overlay (simplified)
    if (el.icon && el.icon.text) {
      const iconSpan = document.createElement('span');
      iconSpan.className = 'vdj-icon';
      iconSpan.textContent = el.icon.text;
      iconSpan.style.cssText = `
        position: absolute;
        left: ${el.icon.dx}px;
        top: ${el.icon.dy}px;
        width: ${el.icon.width}px;
        height: ${el.icon.height}px;
        color: ${el.icon.color || '#FFFFFF'};
      `;
      div.appendChild(iconSpan);
    }

    return div;
  }

  _createTextElement(textDef, parentWidth, parentHeight) {
    const span = document.createElement('span');
    span.className = 'vdj-text';

    let content = textDef.text || textDef.content || '';
    if (textDef.format && !textDef.text) {
      if (textDef.format === "--:--") content = "3:45";
      else if (textDef.format === "%title" || textDef.format === "title") content = "Song Title";
      else if (textDef.format === "%author" || textDef.format === "%artist" || textDef.format === "artist") content = "Artist";
      else if (textDef.format === "%bpm") content = "128";
      else if (textDef.format === "%key") content = "4A";
      else 
      content = textDef.format
        .replace(/%title/g, 'Title')
        .replace(/%author/g, 'Artist')
        .replace(/%bpm/g, '128')
        .replace(/%time/g, '--:--')
        .replace(/%loop/g, '')
        .replace(/%pitch/g, '+0.0%')
        .replace(/%key/g, '')
        .replace(/%name/g, '');
    }
    if (textDef.action && !textDef.text) {
      // Mock common VDJ actions
      if (textDef.action === "get_clock") content = new Date().toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
      else if (textDef.action === "get_time") content = "3:45";
      else if (textDef.action === "get_title") content = "Summer Vibes";
      else if (textDef.action === "get_author") content = "DJ Artist";
      else if (textDef.action === "get_bpm" || textDef.action === "bpm_label") content = "128";
      else if (textDef.action === "get_key") content = "4A";
      else if (textDef.action === "get_loop") content = "8";
      else if (textDef.action === "get_pitch") content = "+0.0%";
      else if (textDef.action === "high_label") content = "HI";
      else if (textDef.action === "mid_label") content = "MID";
      else if (textDef.action === "low_label") content = "LOW";
      else if (textDef.action === "filter_label") content = "FLT";
      else if (textDef.action === "gain_label") content = "GN";
      else if (textDef.action === "get_username & param_uppercase") content = "USER";
      else if (textDef.action === "get_username") content = "DJ";
      else if (textDef.action === "get_playlist") content = "Current Playlist";
      else if (textDef.action === "get_playlist_info") content = "42 tracks, 3:24:15";
      else if (textDef.action === "get_effect_name" || textDef.action === "effect_mixfx & param_uppercase") content = "EFFECT";
      else if (textDef.action === "get_videofx_name") content = "FX";
      else if (textDef.action === "get_videotrans_name") content = "XFADE";
      else if (textDef.action === "get_text '%videosource'") content = "SOURCE";
      else if (textDef.action === "get_song_title") content = "Summer Vibes";
      else if (textDef.action === "get_song_author") content = "DJ Artist";
      else if (textDef.action === "get_song_bpm") content = "128";
      else if (textDef.action === "get_song_key") content = "4A";
      else if (textDef.action === "get_song_artist") content = "DJ Artist";
      else if (textDef.action === "get_folder_name") content = "Music";
      else if (textDef.action === "get_file_name") content = "Track 01.mp3";
      else if (textDef.action === "get_file_size") content = "8.4 MB";
      else if (textDef.action === "get_file_length") content = "4:32";
      else if (textDef.action === "get_rating") content = "★★★★";
      else if (textDef.action === "get_comment") content = "Great track";
      else if (textDef.action === "get_genre") content = "House";
      else if (textDef.action === "get_year") content = "2024";
      else content = textDef.action.replace(/get_/g, '').replace(/_/g, ' ');
    }

    // Floor text: if it matches a common action pattern, show a label
    const actionMap = {
      'play_pause': '▶/⏸', 'cue': 'CUE', 'play': '▶',
      'sync': 'SYNC', 'loop': 'LOOP', 'hot_cue': 'HOT',
      'vinyl_mode': 'VINYL', 'quantize': 'Q', 'key_lock': '🔑',
      'pitch': 'PITCH', 'master_volume': 'MASTER', 'headphone_volume': 'CUE VOL',
      'volume': 'VOL', 'crossfader': '', 'eq_high': 'HI', 'eq_mid': 'MID',
      'eq_low': 'LOW', 'filter': 'FILTER', 'gain': 'GAIN',
    };

    span.style.cssText = `
      position: absolute;
      left: ${textDef.dx || 0}px;
      top: ${textDef.dy || 0}px;
      width: ${textDef.width - (textDef.dx || 0) * 2 || parentWidth}px;
      height: ${parentHeight - (textDef.dy || 0) * 2}px;
      display: flex;
      align-items: ${textDef.valign === 'top' ? 'flex-start' : textDef.valign === 'bottom' ? 'flex-end' : 'center'};
      justify-content: ${textDef.align === 'right' ? 'flex-end' : textDef.align === 'center' ? 'center' : 'flex-start'};
      font-size: ${textDef.fontSize}px;
      font-weight: ${textDef.weight};
      color: ${textDef.color && textDef.color !== 'black' && textDef.color !== '#000000' ? textDef.color : '#CCCCCC'};
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      pointer-events: none;
      user-select: none;
      line-height: 1.2;
      ${textDef.multiline === 'yes' ? 'white-space: normal; word-wrap: break-word;' : ''}
    `;
    // Mock common VDJ actions
    if (textDef.action === "get_clock") content = new Date().toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
    span.textContent = content;
    return span;
  }

  _renderTextzone(el) {
    const div = this._createBase(el);
    div.className += ' vdj-textzone';

    for (const textDef of el.texts) {
      const textSpan = this._createTextElement(textDef, el.width, el.height);
      if (textDef.important === 'true') {
        textSpan.className += ' vdj-text-important';
      }
      div.appendChild(textSpan);
    }
    return div;
  }

  _renderVisual(el) {
    const div = this._createBase(el);

    // Use 'off' graphic or the first available state
    const state = el.states.off || el.states.on || el.states.up || el.states.down;
    if (state) {
      this._applyStateStyle(div, state, el.width, el.height);
    }

    return div;
  }

  _renderSlider(el) {
    const div = this._createBase(el);

    // Render the slider background
    const upState = el.states.off || el.states.up;
    if (upState) {
      this._applyStateStyle(div, upState, el.width, el.height);
    }

    // Render the fader knob
    if (el.fader) {
      const fader = document.createElement('div');
      fader.className = 'vdj-fader';
      fader.style.cssText = `
        position: absolute;
        left: ${el.orientation === 'vertical' ? '0' : '50%'};
        top: ${el.orientation === 'vertical' ? '50%' : '0'};
        width: ${el.orientation === 'vertical' ? el.width : el.fader.width || 12}px;
        height: ${el.orientation === 'vertical' ? el.fader.height || 12 : el.height}px;
        transform: translate(-50%, -50%);
        border-radius: ${el.fader.radius || 2}px;
        background-color: ${el.fader.color || '#808080'};
      `;
      div.appendChild(fader);
    }

    // Render fill for round knobs
    if (el.fill) {
      const fillDiv = document.createElement('div');
      fillDiv.className = 'vdj-fill';
      fillDiv.style.cssText = `
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        width: ${el.fill.width || el.width}px;
        height: ${el.fill.height || el.height}px;
        border-radius: 50%;
        background: ${el.fill.backcolor || 'transparent'};
      `;
      div.appendChild(fillDiv);
    }

    return div;
  }

  _renderSquare(el) {
    const div = this._createBase(el);

    if (el.gradient) {
      const dir = el.gradient.type === 'horizontal' ? 'to right' :
                  el.gradient.type === 'circular' ? 'radial' : 'to bottom';
      div.style.background = `linear-gradient(${dir}, ${el.gradient.color1}, ${el.gradient.color2})`;
    } else if (el.color) {
      div.style.backgroundColor = el.color;
    }
    if (el.radius && el.radius > 0) {
      div.style.borderRadius = `${el.radius}px`;
    }
    if (el.borderColor && el.border) {
      div.style.border = `${el.border}px solid ${el.borderColor}`;
    }
    if (el.highlight) {
      div.style.boxShadow = `inset 0 1px 0 ${el.highlight}`;
    }
    if (el.shadow) {
      div.style.boxShadow = (div.style.boxShadow ? div.style.boxShadow + ', ' : '') + `0 1px 0 ${el.shadow}`;
    }

    return div;
  }

  _renderCircle(el) {
    const div = this._createBase(el, 'border-radius: 50%;');
    if (el.color) div.style.backgroundColor = el.color;
    if (el.borderColor && el.border) {
      div.style.border = `${el.border}px solid ${el.borderColor}`;
    }
    return div;
  }

  _renderLine(el) {
    const div = this._createBase(el);
    if (el.color) div.style.backgroundColor = el.color;
    if (el.highlight) div.style.boxShadow = `0 -1px 0 ${el.highlight}`;
    if (el.shadow) div.style.boxShadow = (div.style.boxShadow ? div.style.boxShadow + ', ' : '') + `0 1px 0 ${el.shadow}`;
    return div;
  }

  _renderVideo(el) {
    const div = this._createBase(el);
    div.style.backgroundColor = el.backgroundColor || '#000';
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.justifyContent = 'center';
    div.style.color = '#555';
    div.style.fontSize = '12px';
    div.textContent = '▶ VIDEO';
    return div;
  }

  _renderScratch(el) {
    const div = this._createBase(el);
    div.style.cursor = 'grab';
    div.title = `Scratch zone (deck ${el.deck})`;
    return div;
  }

  _renderSongpos(el) {
    const div = this._createBase(el);
    div.style.backgroundColor = '#121314';
    div.style.borderRadius = '2px';

    // Draw fake waveform lines
    const canvas = document.createElement('canvas');
    canvas.width = el.width;
    canvas.height = el.height;
    canvas.style.cssText = 'position: absolute; left: 0; top: 0; width: 100%; height: 100%;';
    const ctx = canvas.getContext('2d');

    // Played part marker
    ctx.fillStyle = el.colorPlayed || '#157794';
    ctx.fillRect(0, 0, el.width * 0.3, el.height);

    // Waveform
    for (let i = 0; i < el.width; i += 2) {
      const h = Math.random() * (el.height * 0.7) + el.height * 0.15;
      ctx.fillStyle = i < el.width * 0.3 ? '#1e7b96' : '#505050';
      ctx.fillRect(i, (el.height - h) / 2, 1, h);
    }
    div.appendChild(canvas);

    return div;
  }

  _renderBrowser(el) {
    const div = this._createBase(el);
    div.style.backgroundColor = '#161718';
    div.style.border = '1px solid #2a2a2a';
    div.style.borderRadius = '3px';
    div.style.overflow = 'hidden';

    // Folder tree (left sidebar)
    const folderList = document.createElement('div');
    folderList.style.cssText =
      'position:absolute;left:0;top:0;width:22%;height:100%;border-right:1px solid #2a2a2a;padding:6px 4px;overflow:hidden;font-family:Arial,sans-serif;';
    const folders = [
      { name: 'Desktop', indent: 0, icon: '💻' },
      { name: 'Music', indent: 1, icon: '🎵' },
      { name: 'Playlists', indent: 1, icon: '📋', active: true },
      { name: '  House Mix', indent: 2, icon: '' },
      { name: '  Hip Hop Set', indent: 2, icon: '' },
      { name: '  Throwback', indent: 2, icon: '' },
      { name: 'Sampler', indent: 1, icon: '🔊' },
      { name: 'History', indent: 1, icon: '🕐' },
      { name: 'Online Music', indent: 1, icon: '🌐' },
    ];
    folders.forEach((f) => {
      const item = document.createElement('div');
      item.style.cssText = [
        'color:' + (f.active ? '#fff' : '#888') + ';',
        'font-size:11px;',
        'padding:3px 4px 3px ' + (6 + f.indent * 12) + 'px;',
        'background:' + (f.active ? '#343536' : 'transparent') + ';',
        'border-radius:2px;',
        'margin-bottom:1px;',
        'white-space:nowrap;',
        'overflow:hidden;',
        'text-overflow:ellipsis;',
      ].join('');
      item.textContent = (f.icon ? f.icon + ' ' : '') + f.name;
      folderList.appendChild(item);
    });
    div.appendChild(folderList);

    // File list (center)
    const fileList = document.createElement('div');
    fileList.style.cssText =
      'position:absolute;left:22%;top:0;width:52%;height:100%;border-right:1px solid #2a2a2a;overflow:hidden;';
    const tracks = [
      { title: 'Summer Vibes', artist: 'DJ Sunshine', bpm: '128', key: '4A', time: '4:32', playing: true },
      { title: 'Bass Drop Anthem', artist: 'Club Kingz', bpm: '140', key: '7A', time: '3:58' },
      { title: 'Midnight Groove', artist: 'Luna Beats', bpm: '124', key: '2A', time: '5:11' },
      { title: 'Electro Storm', artist: 'Volt Rush', bpm: '132', key: '9A', time: '3:45' },
      { title: 'Funky Disco House', artist: 'RetroFlow', bpm: '126', key: '5A', time: '6:02' },
      { title: 'Deep Techno', artist: 'SubZero Wave', bpm: '135', key: '1A', time: '4:19' },
      { title: 'Latin Heat', artist: 'Ritmo Fuego', bpm: '118', key: '11B', time: '3:52' },
    ];
    const cols = [
      { w: '6%', label: '#' },
      { w: '40%', label: 'Title' },
      { w: '26%', label: 'Artist' },
      { w: '10%', label: 'BPM' },
      { w: '8%', label: 'Key' },
      { w: '10%', label: 'Time' },
    ];
    // Header
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;padding:4px 6px;border-bottom:1px solid #333;background:#1e1e1f;font-size:10px;color:#888;font-weight:bold;';
    cols.forEach(c => {
      const h = document.createElement('span');
      h.style.cssText = 'width:' + c.w + ';';
      h.textContent = c.label;
      header.appendChild(h);
    });
    fileList.appendChild(header);
    // Tracks
    tracks.forEach((t, i) => {
      const row = document.createElement('div');
      row.style.cssText = [
        'display:flex;',
        'padding:3px 6px;',
        'font-size:11px;',
        'color:' + (t.playing ? '#fff' : '#bbb') + ';',
        'background:' + (t.playing ? '#252525' : (i % 2 === 0 ? '#1e1e1f' : 'transparent')) + ';',
        'border-bottom:1px solid #1a1a1a;',
      ].join('');
      [
        '' + (i + 1),
        t.title,
        t.artist,
        t.bpm,
        t.key,
        t.time,
      ].forEach((val, j) => {
        const cell = document.createElement('span');
        cell.style.cssText = 'width:' + cols[j].w + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
        cell.textContent = val;
        row.appendChild(cell);
      });
      fileList.appendChild(row);
    });
    div.appendChild(fileList);

    // Sideview (right)
    const sideview = document.createElement('div');
    sideview.style.cssText =
      'position:absolute;right:0;top:0;width:26%;height:100%;padding:6px;overflow:hidden;font-family:Arial,sans-serif;';
    sideview.innerHTML = [
      '<div style="color:#888;font-size:10px;font-weight:bold;margin-bottom:6px;">▶ NOW PLAYING</div>',
      '<div style="color:#fff;font-size:12px;font-weight:bold;">Summer Vibes</div>',
      '<div style="color:#aaa;font-size:11px;">DJ Sunshine</div>',
      '<div style="color:#666;font-size:10px;margin-top:8px;">BPM: 128 | Key: 4A</div>',
      '<div style="color:#666;font-size:10px;">Time: 4:32</div>',
      '<hr style="border-color:#333;margin:8px 0;">',
      '<div style="color:#888;font-size:10px;font-weight:bold;">🎚 SAMPLER</div>',
      '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:2px;margin-top:4px;">',
      ...[...Array(8)].map(() => '<div style="background:#252525;border-radius:2px;aspect-ratio:1;"></div>').join(''),
      '</div>',
    ].join('');
    div.appendChild(sideview);

    return div;
  }

  _renderCover(el) {
    const div = this._createBase(el);
    div.style.backgroundColor = '#1a1a1a';
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.justifyContent = 'center';
    div.style.border = '1px solid #333';
    div.style.color = '#555';
    div.style.fontSize = '10px';
    div.textContent = 'COVER';
    return div;
  }

  _renderLogo(el) {
    const div = this._createBase(el);
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.justifyContent = 'center';
    div.style.fontWeight = 'bold';
    div.style.fontSize = `${Math.min(el.width, el.height) * 0.4}px`;
    div.style.color = '#ff0045';

    if (el.circle === 'true') {
      div.style.borderRadius = '50%';
      div.style.backgroundColor = '#ff0045';
      div.style.color = '#fff';
    }
    div.textContent = 'VDJ';
    return div;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { VdjRenderer };
}
