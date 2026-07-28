/**
 * VDJ Skin XML Parser
 * Parses VirtualDJ skin XML, resolves defines, placeholders, colors, and math expressions.
 */

// Cross-environment DOMParser
const getDOMParser = () => {
  if (typeof DOMParser !== 'undefined') return new DOMParser();
  // Node.js fallback
  try {
    const xmldom = require('@xmldom/xmldom');
    return new xmldom.DOMParser();
  } catch (_) {
    throw new Error('DOMParser not available. In Node.js, install @xmldom/xmldom');
  }
};

class VdjParser {
  constructor() {
    this.colorDefines = {};   // colorName -> { value, deck }
    this.classDefines = {};   // className -> { element, classdeck, placeholders }
  }

  /**
 * Parse skin XML string into a flat render tree
   */
  parse(xmlString) {
    // Pre-process: remove duplicate attributes (VDJ XML allows them, strict parsers don't)
    xmlString = this._sanitizeXML(xmlString);

    const parser = getDOMParser();
    const doc = parser.parseFromString(xmlString, 'text/xml');
    const skinEl = doc.documentElement;

    // Check for parse errors
    const parseErrors = doc.getElementsByTagName('parsererror');
    if (parseErrors.length > 0) {
      throw new Error('XML Parse error: ' + parseErrors[0].textContent);
    }

    if (!skinEl || skinEl.tagName !== 'skin') {
      throw new Error('Invalid skin XML: missing <skin> root element');
    }

    // Extract skin metadata
    const meta = {
      name: skinEl.getAttribute('name') || '',
      version: skinEl.getAttribute('version') || '',
      width: parseInt(skinEl.getAttribute('width')) || 1920,
      height: parseInt(skinEl.getAttribute('height')) || 1080,
      image: skinEl.getAttribute('image') || '',
      author: skinEl.getAttribute('author') || '',
      breakline: skinEl.getAttribute('breakline') || '',
    };

    // First pass: collect all defines
    this._collectDefines(skinEl);

    // Second pass: render element tree with position context
    const elements = [];
    for (const child of skinEl.children) {
      if (child.tagName === 'define' || child.tagName === 'font' ||
          child.tagName === 'customicons' || child.tagName === 'oninit' ||
          child.tagName === 'copyright' || child.tagName === 'background' ||
          child.tagName === 'nbdecks') {
        continue; // Skip non-visual elements
      }
      const rendered = this._renderElement(child, { x: 0, y: 0 });
      if (Array.isArray(rendered)) {
        elements.push(...rendered);
      } else if (rendered) {
        elements.push(rendered);
      }
    }

    return { meta, elements };
  }

  /**
   * Sanitize XML: fix non-standard VDJ XML issues
   * - Unescaped & in attribute values (VDJ Script uses & for command chaining)
   * - Duplicate attributes (keep first occurrence)
   */
  _sanitizeXML(xml) {
    // Step 1: Fix unescaped & in attribute values
    // Replace & that isn't already part of an XML entity
    xml = xml.replace(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#[xX][0-9a-fA-F]+;)/g, '&amp;');

    // Step 2: Remove duplicate attributes within each opening tag
    xml = xml.replace(/<(\w+)([^>]*?)>/gs, (match, tagName, attrs) => {
      const selfClose = attrs.endsWith('/') ? '/' : '';
      if (selfClose) attrs = attrs.slice(0, -1);
      const seen = new Set();
      let cleanAttrs = '';
      const attrRegex = /\s+(\w[\w-]*)(\s*=\s*("[^"]*"|'[^']*'))?/g;
      let m;
      while ((m = attrRegex.exec(attrs)) !== null) {
        const attrName = m[1].toLowerCase();
        if (!seen.has(attrName)) {
          seen.add(attrName);
          cleanAttrs += m[0];
        }
      }
      return '<' + tagName + cleanAttrs + selfClose + '>';
    });

    return xml;
  }

  /**
   * Collect all define elements (class defines and color defines)
   */
  _collectDefines(skinEl) {
    for (const child of skinEl.children) {
      if (child.tagName !== 'define') continue;

      const className = child.getAttribute('class');
      const colorName = child.getAttribute('color');

      if (colorName) {
        // Color define
        this.colorDefines[colorName.toLowerCase()] = {
          value: child.getAttribute('value') || '',
          deck: child.getAttribute('deck') || '',
        };
      } else if (className) {
        // Class define
        this.classDefines[className] = {
          element: child,
          classdeck: child.getAttribute('classdeck') || '',
          placeholders: this._parsePlaceholders(child.getAttribute('placeholders') || ''),
        };
      }
    }
  }

  /**
   * Parse placeholders string: "width=62,height=30,taction" -> { WIDTH: '62', HEIGHT: '30', TACTION: '' }
   */
  _parsePlaceholders(str) {
    const result = {};
    if (!str) return result;
    for (const part of str.split(',')) {
      const [key, ...valParts] = part.trim().split('=');
      if (key) {
        result[key.toUpperCase()] = valParts.join('=') || '';
      }
    }
    return result;
  }

  /**
   * Resolve a color name to its hex value
   */
  resolveColor(colorName) {
    if (!colorName) return null;
    colorName = colorName.trim();

    // Already a hex/RGB value
    if (colorName.startsWith('#') || colorName.startsWith('rgb')) {
      return colorName;
    }

    // Check custom defines
    const lower = colorName.toLowerCase();
    if (this.colorDefines[lower]) {
      return this.colorDefines[lower].value;
    }

    // Pre-defined colors from SDK
    const PREDEFINED = {
      red: '#FF0000', green: '#00FF00', blue: '#0000FF',
      white: '#FFFFFF', black: '#000000', yellow: '#FFFF00',
      cyan: '#00FFFF', magenta: '#FF00FF', gray: '#7F7F7F',
      orange: '#FF7F00', darkred: '#7F0000', darkgreen: '#007F00',
      darkblue: '#00007F', darkyellow: '#7F7F00', darkcyan: '#007F7F',
      darkmagenta: '#7F007F', darkorange: '#7F3F00', darkgray: '#646464',
      lightgray: '#D8D8D8', pink: '#E69696', beige: '#FFFFC8',
      marine: '#4A86E6', violet: '#9600FF',
      transparent: 'transparent', none: 'transparent', reset: 'transparent',
      textoff: '#A0A0A0', textoff2: '#808080', texton: '#FFFFFF',
      textover: '#E0E0E0', textdarker: '#606060', textbrowser: '#A0A0A0',
      textdark: '#404040', textbright: '#FFFFFF',
      darker: '#121314', dark: '#1b1c1d',
    };

    return PREDEFINED[lower] || null;
  }

  /**
   * Evaluate a simple math expression like "100-10" or "150-30" or "85+85-10-10-30"
   * Operators are evaluated left-to-right without priority
   */
  evalMath(expr, context = {}) {
    if (expr === null || expr === undefined || expr === '') return 0;
    expr = String(expr).trim();

    // Resolve placeholders [WIDTH], [HEIGHT], etc.
    expr = expr.replace(/\[([A-Z_]+)\]/gi, (_, key) => {
      return context[key] !== undefined ? String(context[key]) : '0';
    });

    // If it's a pure number, return it
    if (/^-?\d+(\.\d+)?$/.test(expr)) {
      return parseFloat(expr);
    }

    // Handle relative positions (+ or - prefix)
    let relativeX = 0, relativeY = 0;
    if (expr.startsWith('+') || expr.startsWith('-')) {
      // Will be resolved by caller with parent position
    }

    // Evaluate left-to-right math
    // Pattern: number operator number operator number ...
    const tokens = expr.match(/(-?\d+(?:\.\d+)?|[+\-*/])/g);
    if (!tokens || tokens.length === 0) return 0;

    let result = parseFloat(tokens[0]);
    for (let i = 1; i < tokens.length; i += 2) {
      const op = tokens[i];
      const num = parseFloat(tokens[i + 1]);
      if (isNaN(num)) break;
      switch (op) {
        case '+': result += num; break;
        case '-': result -= num; break;
        case '*': result *= num; break;
        case '/': result /= num; break;
      }
    }
    return result;
  }

  /**
   * Get x, y position from an element, resolving relative positions and math
   */
  _getPosition(el, parentCtx = { x: 0, y: 0 }) {
    let x = 0, y = 0;
    let width = 0, height = 0;

    // Check for direct attributes on the element
    const elX = el.getAttribute('x');
    const elY = el.getAttribute('y');

    // Check <pos> child
    const posEl = this._getChild(el, 'pos');

    if (posEl) {
      x = this.evalMath(posEl.getAttribute('x') || '0', {});
      y = this.evalMath(posEl.getAttribute('y') || '0', {});
      width = this.evalMath(posEl.getAttribute('width') || '0', {});
      height = this.evalMath(posEl.getAttribute('height') || '0', {});
    } else if (elX !== null || elY !== null) {
      x = this.evalMath(elX || '0', {});
      y = this.evalMath(elY || '0', {});
    }

    // Size: check <size> child, then <pos> width/height, then direct attributes
    const sizeEl = this._getChild(el, 'size');
    if (sizeEl) {
      if (!width) width = this.evalMath(sizeEl.getAttribute('width') || '0', {});
      if (!height) height = this.evalMath(sizeEl.getAttribute('height') || '0', {});
    }
    if (!width) width = this.evalMath(el.getAttribute('width') || '0', {});
    if (!height) height = this.evalMath(el.getAttribute('height') || '0', {});

    // Handle relative positioning: + prefix means add to parent position
    const xStr = posEl ? posEl.getAttribute('x') || '0' : (elX || '0');
    const yStr = posEl ? posEl.getAttribute('y') || '0' : (elY || '0');

    if (xStr && (xStr.trim().startsWith('+') || xStr.trim().startsWith('-'))) {
      x = parentCtx.x + this.evalMath(xStr.trim(), {});
    }
    if (yStr && (yStr.trim().startsWith('+') || yStr.trim().startsWith('-'))) {
      y = parentCtx.y + this.evalMath(yStr.trim(), {});
    }

    return { x, y, width, height };
  }

  /**
   * Get a child element by tag name (case-insensitive)
   */
  _getChild(el, tagName) {
    const children = el.getElementsByTagName(tagName);
    // Only direct children with correct parent
    for (const c of children) {
      if (c.parentElement === el) return c;
    }
    return null;
  }

  /**
   * Get all direct children by tag name
   */
  _getChildren(el, tagName) {
    const result = [];
    for (const c of el.children) {
      if (c.tagName === tagName) result.push(c);
    }
    return result;
  }

  /**
   * Resolve a class-defined element: merge class definition with actual element
   */
  _resolveClass(el) {
    const className = el.getAttribute('class');
    if (!className || !this.classDefines[className]) return el;

    const classDef = this.classDefines[className];
    const placeholders = classDef.placeholders;

    // Build placeholder values from element attributes
    const ctx = { ...placeholders };
    for (const attr of el.attributes) {
      ctx[attr.name.toUpperCase()] = attr.value;
    }

    // Clone the define element
    const merged = classDef.element.cloneNode(true);

    // Merge attributes from the actual element (width, action, etc.)
    for (const attr of el.attributes) {
      if (attr.name !== 'class') {
        merged.setAttribute(attr.name, attr.value);
      }
    }

    // Resolve placeholders in text content and attributes
    this._resolvePlaceholdersInElement(merged, ctx);

    return merged;
  }

  /**
   * Recursively resolve [PLACEHOLDER] in attributes and text content
   */
  _resolvePlaceholdersInElement(el, ctx) {
    for (const attr of el.attributes) {
      let val = attr.value;
      let changed = false;
      val = val.replace(/\[([A-Z_]+)\]/gi, (_, key) => {
        changed = true;
        return ctx[key] !== undefined ? String(ctx[key]) : key;
      });
      if (changed) attr.value = val;
    }
    for (const child of el.children) {
      this._resolvePlaceholdersInElement(child, ctx);
    }
  }

  /**
   * Render a single element and its subtree into flat render nodes
   */
  _renderElement(el, parentCtx) {
    const tag = el.tagName ? el.tagName.toLowerCase() : '';

    // Resolve class if present
    if (el.getAttribute('class')) {
      el = this._resolveClass(el);
    }

    switch (tag) {
      case 'group':
        return this._renderGroup(el, parentCtx);
      case 'panel':
        return this._renderPanel(el, parentCtx);
      case 'deck':
        return this._renderContainer(el, parentCtx);
      case 'button':
        return this._renderButton(el, parentCtx);
      case 'textzone':
        return this._renderTextzone(el, parentCtx);
      case 'visual':
        return this._renderVisual(el, parentCtx);
      case 'slider':
        return this._renderSlider(el, parentCtx);
      case 'square':
      case 'circle':
      case 'line':
        return this._renderShape(el, parentCtx, tag);
      case 'video':
        return this._renderVideo(el, parentCtx);
      case 'scratch':
        return this._renderScratch(el, parentCtx);
      case 'songpos':
        return this._renderSongpos(el, parentCtx);
      case 'browser':
        return this._renderBrowser(el, parentCtx);
      case 'cover':
        return this._renderCover(el, parentCtx);
      case 'logo':
        return this._renderLogo(el, parentCtx);
      case 'grabzone':
      case 'resizezone':
        return null; // Not visually rendered
      default:
        return null;
    }
  }

  /**
   * Render container elements (group, panel, deck)
   */
  _renderGroup(el, parentCtx) {
    const pos = this._getPosition(el, parentCtx);
    const ctx = { x: pos.x, y: pos.y };

    const children = [];
    for (const child of el.children) {
      const rendered = this._renderElement(child, ctx);
      if (Array.isArray(rendered)) {
        children.push(...rendered);
      } else if (rendered) {
        children.push(rendered);
      }
    }
    return children;
  }

  _renderPanel(el, parentCtx) {
    const pos = this._getPosition(el, parentCtx);
    const ctx = { x: pos.x, y: pos.y };

    const children = [];
    for (const child of el.children) {
      if (child.tagName === 'pos' || child.tagName === 'size' ||
          child.tagName === 'up' || child.tagName === 'down' ||
          child.tagName === 'clipmask') continue;
      const rendered = this._renderElement(child, ctx);
      if (Array.isArray(rendered)) {
        children.push(...rendered);
      } else if (rendered) {
        children.push(rendered);
      }
    }
    return children;
  }

  _renderContainer(el, parentCtx) {
    const pos = this._getPosition(el, parentCtx);
    const ctx = { x: pos.x, y: pos.y };

    const children = [];
    for (const child of el.children) {
      if (child.tagName === 'pos' || child.tagName === 'size') continue;
      const rendered = this._renderElement(child, ctx);
      if (Array.isArray(rendered)) {
        children.push(...rendered);
      } else if (rendered) {
        children.push(rendered);
      }
    }
    return children;
  }

  /**
   * Extract graphic state info from button children: up/down/over/selected/off/on
   */
  _getGraphicState(el) {
    const states = {};
    for (const state of ['up', 'down', 'over', 'selected', 'off', 'on', 'overselected', 'downselected']) {
      const stateEl = this._getChild(el, state);
      if (stateEl) {
        states[state] = {
          x: this.evalMath(stateEl.getAttribute('x') || ''),
          y: this.evalMath(stateEl.getAttribute('y') || ''),
          width: this.evalMath(stateEl.getAttribute('width') || ''),
          height: this.evalMath(stateEl.getAttribute('height') || ''),
          shape: stateEl.getAttribute('shape') || '',
          color: this.resolveColor(stateEl.getAttribute('color') || ''),
          color2: this.resolveColor(stateEl.getAttribute('color2') || ''),
          gradient: stateEl.getAttribute('gradient') || '',
          border: this.evalMath(stateEl.getAttribute('border') || stateEl.getAttribute('border_size') || '0'),
          borderColor: this.resolveColor(stateEl.getAttribute('border_color') || stateEl.getAttribute('border') === '0' ? '' : stateEl.getAttribute('border') || ''),
          radius: this.evalMath(stateEl.getAttribute('radius') || '0'),
          highlight: this.resolveColor(stateEl.getAttribute('highlight') || ''),
          highlightSize: this.evalMath(stateEl.getAttribute('highlight_size') || '0'),
          condition: stateEl.getAttribute('condition') || '',
        };
        // Fix: border attribute can be a color string, not just number
        if (stateEl.getAttribute('border') && isNaN(parseInt(stateEl.getAttribute('border')))) {
          states[state].borderColor = this.resolveColor(stateEl.getAttribute('border'));
          states[state].border = 1;
        }
      }
    }

    // Normalize: 'off' is same as 'up', 'on' is same as 'down'
    if (!states.up && states.off) states.up = states.off;
    if (!states.off && states.up) states.off = states.up;
    if (!states.down && states.on) states.down = states.on;
    if (!states.on && states.down) states.on = states.down;

    return states;
  }

  /**
   * Render a button element
   */
  _renderButton(el, parentCtx) {
    const pos = this._getPosition(el, parentCtx);
    if (pos.width <= 0 || pos.height <= 0) return null;

    const action = el.getAttribute('action') || '';
    const query = el.getAttribute('query') || '';
    const states = this._getGraphicState(el);

    // Get text children
    const textEl = this._getChild(el, 'text');
    const textOverEl = this._getChild(el, 'textover');
    const textDownEl = this._getChild(el, 'textdown');
    const textSelectedEl = this._getChild(el, 'textselected');

    // Get icon children
    const iconEl = this._getChild(el, 'icon');
    const tooltipEl = this._getChild(el, 'tooltip');

    let text = null;
    if (textEl) {
      text = {
        content: textEl.textContent || '',
        format: textEl.getAttribute('format') || '',
        action: textEl.getAttribute('action') || '',
        text: textEl.getAttribute('text') || '',
        fontSize: this.evalMath(textEl.getAttribute('fontsize') || textEl.getAttribute('size') || '12'),
        color: this.resolveColor(textEl.getAttribute('color') || ''),
        colorOver: this.resolveColor(textEl.getAttribute('colorover') || ''),
        colorDown: this.resolveColor(textEl.getAttribute('colordown') || ''),
        colorSelected: this.resolveColor(textEl.getAttribute('colorselected') || ''),
        align: textEl.getAttribute('align') || 'center',
        weight: textEl.getAttribute('weight') || 'normal',
        dx: this.evalMath(textEl.getAttribute('dx') || '0'),
        dy: this.evalMath(textEl.getAttribute('dy') || '0'),
      };
    }

    let icon = null;
    if (iconEl) {
      icon = {
        sysicon: iconEl.getAttribute('sysicon') || '',
        x: this.evalMath(iconEl.getAttribute('x') || '0'),
        y: this.evalMath(iconEl.getAttribute('y') || '0'),
        width: this.evalMath(iconEl.getAttribute('width') || '16'),
        height: this.evalMath(iconEl.getAttribute('height') || '16'),
        dx: this.evalMath(iconEl.getAttribute('dx') || '0'),
        dy: this.evalMath(iconEl.getAttribute('dy') || '0'),
        color: this.resolveColor(iconEl.getAttribute('color') || iconEl.getAttribute('coloroff') || ''),
        colorOver: this.resolveColor(iconEl.getAttribute('colorover') || ''),
        colorDown: this.resolveColor(iconEl.getAttribute('colordown') || ''),
        colorSelected: this.resolveColor(iconEl.getAttribute('colorselected') || ''),
      };
    }

    return {
      type: 'button',
      x: pos.x,
      y: pos.y,
      width: pos.width,
      height: pos.height,
      action,
      query,
      states,
      text,
      icon,
      tooltip: tooltipEl ? tooltipEl.textContent : '',
    };
  }

  /**
   * Render a textzone
   */
  _renderTextzone(el, parentCtx) {
    const pos = this._getPosition(el, parentCtx);
    if (pos.width <= 0 || pos.height <= 0) return null;

    const group = el.getAttribute('group') || '';
    const action = el.getAttribute('action') || '';

    const texts = [];
    for (const textEl of this._getChildren(el, 'text')) {
      texts.push({
        content: textEl.textContent || '',
        format: textEl.getAttribute('format') || '--:--',
        action: textEl.getAttribute('action') || '',
        text: textEl.getAttribute('text') || '',
        fontSize: this.evalMath(textEl.getAttribute('fontsize') || textEl.getAttribute('size') || '12'),
        color: this.resolveColor(textEl.getAttribute('color') || '#FFFFFF'),
        colorOver: this.resolveColor(textEl.getAttribute('colorover') || ''),
        colorDown: this.resolveColor(textEl.getAttribute('colordown') || ''),
        align: textEl.getAttribute('align') || 'left',
        valign: textEl.getAttribute('valign') || 'center',
        weight: textEl.getAttribute('weight') || 'normal',
        dx: this.evalMath(textEl.getAttribute('dx') || '0'),
        dy: this.evalMath(textEl.getAttribute('dy') || '0'),
        width: this.evalMath(textEl.getAttribute('width') || pos.width),
        multiline: textEl.getAttribute('multiline') || '',
        scroll: textEl.getAttribute('scroll') || '',
        important: textEl.getAttribute('important') || '',
      });
    }

    return {
      type: 'textzone',
      x: pos.x,
      y: pos.y,
      width: pos.width,
      height: pos.height,
      group,
      action,
      texts,
    };
  }

  /**
   * Render a visual element
   */
  _renderVisual(el, parentCtx) {
    const pos = this._getPosition(el, parentCtx);
    if (pos.width <= 0 || pos.height <= 0) return null;

    const source = el.getAttribute('source') || '';
    const visualType = el.getAttribute('type') || '';
    const orientation = el.getAttribute('orientation') || '';

    // Get graphic states
    const states = {};
    for (const state of ['off', 'on', 'up', 'down', 'selected', 'volume', 'volumeselected', 'upselected']) {
      const stateEl = this._getChild(el, state);
      if (stateEl) {
        states[state] = {
          x: this.evalMath(stateEl.getAttribute('x') || '0'),
          y: this.evalMath(stateEl.getAttribute('y') || '0'),
          width: this.evalMath(stateEl.getAttribute('width') || String(pos.width)),
          height: this.evalMath(stateEl.getAttribute('height') || String(pos.height)),
          shape: stateEl.getAttribute('shape') || '',
          color: this.resolveColor(stateEl.getAttribute('color') || ''),
          color2: this.resolveColor(stateEl.getAttribute('color2') || ''),
          gradient: stateEl.getAttribute('gradient') || '',
          border: this.evalMath(stateEl.getAttribute('border') || stateEl.getAttribute('border_size') || '0'),
          borderColor: this.resolveColor(stateEl.getAttribute('border_color') || stateEl.getAttribute('border') || ''),
          radius: this.evalMath(stateEl.getAttribute('radius') || '0'),
          condition: stateEl.getAttribute('condition') || '',
        };
      }
    }

    return {
      type: 'visual',
      x: pos.x,
      y: pos.y,
      width: pos.width,
      height: pos.height,
      source,
      visualType,
      orientation,
      states,
    };
  }

  /**
   * Render a slider
   */
  _renderSlider(el, parentCtx) {
    const pos = this._getPosition(el, parentCtx);
    if (pos.width <= 0 || pos.height <= 0) return null;

    const action = el.getAttribute('action') || '';
    const orientation = el.getAttribute('orientation') || 'horizontal';
    const direction = el.getAttribute('direction') || 'up';
    const frommiddle = el.getAttribute('frommiddle') || '';

    // Get graphic states
    const states = {};
    for (const state of ['off', 'on', 'up', 'down', 'selected']) {
      const stateEl = this._getChild(el, state);
      if (stateEl) {
        states[state] = {
          x: this.evalMath(stateEl.getAttribute('x') || '0'),
          y: this.evalMath(stateEl.getAttribute('y') || '0'),
          width: this.evalMath(stateEl.getAttribute('width') || String(pos.width)),
          height: this.evalMath(stateEl.getAttribute('height') || String(pos.height)),
          shape: stateEl.getAttribute('shape') || '',
          color: this.resolveColor(stateEl.getAttribute('color') || ''),
          color2: this.resolveColor(stateEl.getAttribute('color2') || ''),
          gradient: stateEl.getAttribute('gradient') || '',
          border: this.evalMath(stateEl.getAttribute('border') || stateEl.getAttribute('border_size') || '0'),
          borderColor: this.resolveColor(stateEl.getAttribute('border_color') || ''),
          radius: this.evalMath(stateEl.getAttribute('radius') || '0'),
        };
      }
    }

    // Fader element
    const faderEl = this._getChild(el, 'fader');
    let fader = null;
    if (faderEl) {
      const faderPos = this._getPosition(faderEl, { x: 0, y: 0 });
      const faderStates = {};
      for (const state of ['off', 'on', 'up', 'down', 'over']) {
        const stateEl = this._getChild(faderEl, state);
        if (stateEl) {
          faderStates[state] = {
            x: this.evalMath(stateEl.getAttribute('x') || '0'),
            y: this.evalMath(stateEl.getAttribute('y') || '0'),
            width: this.evalMath(stateEl.getAttribute('width') || ''),
            height: this.evalMath(stateEl.getAttribute('height') || ''),
            shape: stateEl.getAttribute('shape') || faderEl.getAttribute('shape') || '',
            color: this.resolveColor(stateEl.getAttribute('color') || faderEl.getAttribute('color') || ''),
            radius: this.evalMath(stateEl.getAttribute('radius') || ''),
            border: this.evalMath(stateEl.getAttribute('border') || ''),
          };
        }
      }
      fader = {
        width: faderPos.width || this.evalMath(faderEl.getAttribute('width') || '0'),
        height: faderPos.height || this.evalMath(faderEl.getAttribute('height') || '0'),
        color: this.resolveColor(faderEl.getAttribute('color') || ''),
        radius: this.evalMath(faderEl.getAttribute('radius') || ''),
        anglemin: this.evalMath(faderEl.getAttribute('anglemin') || '-150'),
        anglemax: this.evalMath(faderEl.getAttribute('anglemax') || '150'),
        states: faderStates,
      };
    }

    // Fill element (for round knobs)
    const fillEl = this._getChild(el, 'fill');
    let fill = null;
    if (fillEl) {
      const fillOffEl = this._getChild(fillEl, 'off');
      const fillOnEl = this._getChild(fillEl, 'on');
      fill = {
        width: this.evalMath(fillEl.getAttribute('width') || '0'),
        height: this.evalMath(fillEl.getAttribute('height') || '0'),
        radius: this.evalMath(fillEl.getAttribute('radius') || '0'),
        color: this.resolveColor(fillEl.getAttribute('color') || ''),
        backcolor: this.resolveColor(fillEl.getAttribute('backcolor') || ''),
      };
    }

    return {
      type: 'slider',
      x: pos.x,
      y: pos.y,
      width: pos.width,
      height: pos.height,
      action,
      orientation,
      direction,
      frommiddle,
      states,
      fader,
      fill,
    };
  }

  /**
   * Render square, circle, line shapes
   */
  _renderShape(el, parentCtx, shapeType) {
    const pos = this._getPosition(el, parentCtx);
    if (shapeType === 'line') {
      // Lines just use width/height as one dimension
      pos.width = pos.width || 1;
      pos.height = pos.height || 1;
    }
    if (pos.width <= 0 && shapeType !== 'line') return null;

    const color = this.resolveColor(el.getAttribute('color') || '');
    const border = this.evalMath(el.getAttribute('border') || '0');
    const borderColor = this.resolveColor(el.getAttribute('border_color') || el.getAttribute('border') || '');
    const radius = this.evalMath(el.getAttribute('radius') || '0');
    const highlight = this.resolveColor(el.getAttribute('highlight') || '');
    const shadow = this.resolveColor(el.getAttribute('shadow') || '');

    // Gradient child
    const gradEl = this._getChild(el, 'gradient');
    let gradient = null;
    if (gradEl) {
      gradient = {
        type: gradEl.getAttribute('type') || '',
        color1: this.resolveColor(gradEl.getAttribute('color1') || ''),
        color2: this.resolveColor(gradEl.getAttribute('color2') || ''),
      };
    }

    return {
      type: shapeType,
      x: pos.x,
      y: pos.y,
      width: pos.width,
      height: pos.height,
      color,
      border,
      borderColor,
      radius,
      highlight,
      shadow,
      gradient,
    };
  }

  _renderVideo(el, parentCtx) {
    const pos = this._getPosition(el, parentCtx);
    if (pos.width <= 0 || pos.height <= 0) return null;

    const bgEl = this._getChild(el, 'background');
    return {
      type: 'video',
      x: pos.x,
      y: pos.y,
      width: pos.width,
      height: pos.height,
      source: el.getAttribute('source') || 'deck',
      deck: el.getAttribute('deck') || '',
      backgroundColor: bgEl ? this.resolveColor(bgEl.getAttribute('color') || 'black') : 'black',
    };
  }

  _renderScratch(el, parentCtx) {
    const pos = this._getPosition(el, parentCtx);
    if (pos.width <= 0 || pos.height <= 0) return null;
    return {
      type: 'scratch',
      x: pos.x,
      y: pos.y,
      width: pos.width,
      height: pos.height,
      deck: el.getAttribute('deck') || '',
    };
  }

  _renderSongpos(el, parentCtx) {
    const pos = this._getPosition(el, parentCtx);
    if (pos.width <= 0 || pos.height <= 0) return null;
    return {
      type: 'songpos',
      x: pos.x,
      y: pos.y,
      width: pos.width,
      height: pos.height,
      deck: el.getAttribute('deck') || '',
      orientation: el.getAttribute('orientation') || 'horizontal',
      colorPlayed: this.resolveColor(el.getAttribute('colorPlayed') || ''),
      colorBass: this.resolveColor(el.getAttribute('colorBass') || ''),
      colorMed: this.resolveColor(el.getAttribute('colorMed') || ''),
      colorHigh: this.resolveColor(el.getAttribute('colorHigh') || ''),
    };
  }

  _renderBrowser(el, parentCtx) {
    const pos = this._getPosition(el, parentCtx);
    if (pos.width <= 0 || pos.height <= 0) return null;
    return {
      type: 'browser',
      x: pos.x,
      y: pos.y,
      width: pos.width,
      height: pos.height,
    };
  }

  _renderCover(el, parentCtx) {
    const pos = this._getPosition(el, parentCtx);
    if (pos.width <= 0 || pos.height <= 0) return null;
    return {
      type: 'cover',
      x: pos.x,
      y: pos.y,
      width: pos.width,
      height: pos.height,
    };
  }

  _renderLogo(el, parentCtx) {
    const pos = this._getPosition(el, parentCtx);
    if (pos.width <= 0 || pos.height <= 0) return null;
    return {
      type: 'logo',
      x: pos.x,
      y: pos.y,
      width: pos.width,
      height: pos.height,
      circle: el.getAttribute('circle') || 'false',
    };
  }
}

// Export for Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { VdjParser };
}
