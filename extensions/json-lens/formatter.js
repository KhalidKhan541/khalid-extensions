const JSONFormatter = {
  parse(json) {
    if (typeof json === 'object' && json !== null) return json;
    if (typeof json !== 'string') {
      throw new Error('Input must be a string or object');
    }

    const trimmed = json.trim();
    if (!trimmed) throw new Error('Empty input');

    try {
      return JSON.parse(trimmed);
    } catch (e) {
      const match = e.message.match(/position\s+(\d+)/i);
      if (match) {
        const pos = parseInt(match[1]);
        const lines = trimmed.substring(0, pos).split('\n');
        const line = lines.length;
        const col = lines[lines.length - 1].length + 1;
        throw new Error(`Invalid JSON at line ${line}, column ${col}: ${e.message}`);
      }
      throw new Error(e.message);
    }
  },

  format(obj, indent = 4) {
    if (typeof obj === 'string') {
      obj = this.parse(obj);
    }
    return JSON.stringify(obj, null, indent);
  },

  minify(obj) {
    if (typeof obj === 'string') {
      obj = this.parse(obj);
    }
    return JSON.stringify(obj);
  },

  sortKeys(obj, indent = 4) {
    if (typeof obj === 'string') {
      obj = this.parse(obj);
    }
    return JSON.stringify(obj, this._sortReplacer, indent);
  },

  _sortReplacer(key, value) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const sorted = {};
      Object.keys(value).sort().forEach(k => {
        sorted[k] = value[k];
      });
      return sorted;
    }
    return value;
  },

  getStats(obj) {
    const stats = { keyCount: 0, depth: 0, types: {} };
    this._walkStats(obj, 0, stats);
    return stats;
  },

  _walkStats(obj, depth, stats) {
    if (depth > stats.depth) stats.depth = depth;

    if (obj === null) {
      stats.types['null'] = (stats.types['null'] || 0) + 1;
    } else if (Array.isArray(obj)) {
      stats.types['array'] = (stats.types['array'] || 0) + 1;
      obj.forEach(item => this._walkStats(item, depth + 1, stats));
    } else if (typeof obj === 'object') {
      stats.types['object'] = (stats.types['object'] || 0) + 1;
      const keys = Object.keys(obj);
      stats.keyCount += keys.length;
      keys.forEach(k => {
        stats.types['key'] = (stats.types['key'] || 0) + 1;
        this._walkStats(obj[k], depth + 1, stats);
      });
    } else {
      const t = typeof obj;
      stats.types[t] = (stats.types[t] || 0) + 1;
    }
  },

  toCSV(obj) {
    if (!Array.isArray(obj)) {
      if (typeof obj === 'object' && obj !== null) {
        const keys = Object.keys(obj);
        const firstVal = obj[keys[0]];
        if (Array.isArray(firstVal)) {
          obj = firstVal;
        } else {
          obj = [obj];
        }
      } else {
        return null;
      }
    }

    if (obj.length === 0) return '';
    if (typeof obj[0] !== 'object' || obj[0] === null) {
      return obj.map(v => this._csvEscape(String(v))).join('\n');
    }

    const headers = [...new Set(obj.flatMap(o => Object.keys(o)))];
    const rows = [headers.map(h => this._csvEscape(h)).join(',')];

    obj.forEach(row => {
      const cells = headers.map(h => {
        const val = row[h];
        if (val === undefined || val === null) return '';
        return this._csvEscape(typeof val === 'object' ? JSON.stringify(val) : String(val));
      });
      rows.push(cells.join(','));
    });

    return rows.join('\n');
  },

  _csvEscape(str) {
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  },

  toYAML(obj, indent = 0) {
    if (typeof obj === 'string') {
      obj = this.parse(obj);
    }
    return this._yamlValue(obj, indent);
  },

  _yamlValue(val, indent) {
    const pad = ' '.repeat(indent);

    if (val === null) return pad + 'null';
    if (typeof val === 'boolean') return pad + val;
    if (typeof val === 'number') return pad + val;
    if (typeof val === 'string') {
      if (val.includes('\n') || val.includes(':') || val.includes('#') ||
          val.startsWith(' ') || val.startsWith('{') || val.startsWith('[') ||
          val === 'true' || val === 'false' || val === 'null' ||
          /^[\d.e+-]+$/i.test(val)) {
        return pad + '"' + val.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
      }
      return pad + val;
    }

    if (Array.isArray(val)) {
      if (val.length === 0) return pad + '[]';
      return val.map(item => {
        if (typeof item === 'object' && item !== null) {
          const inner = this._yamlObject(item, indent + 2);
          const lines = inner.split('\n');
          return pad + '- ' + lines[0].trim() + '\n' + lines.slice(1).map(l => '  ' + l).join('\n');
        }
        return pad + '- ' + this._yamlValue(item, 0).trim();
      }).join('\n');
    }

    if (typeof val === 'object') {
      return this._yamlObject(val, indent);
    }

    return pad + String(val);
  },

  _yamlObject(obj, indent) {
    const keys = Object.keys(obj);
    if (keys.length === 0) return ' '.repeat(indent) + '{}';

    return keys.map(key => {
      const val = obj[key];
      const pad = ' '.repeat(indent);

      if (val === null || typeof val !== 'object') {
        return pad + key + ': ' + this._yamlValue(val, 0).trim();
      }

      if (Array.isArray(val) && val.length === 0) {
        return pad + key + ': []';
      }

      if (typeof val === 'object' && Object.keys(val).length === 0) {
        return pad + key + ': {}';
      }

      return pad + key + ':\n' + this._yamlValue(val, indent + 2);
    }).join('\n');
  },

  jsonPath(obj, expression) {
    if (typeof obj === 'string') obj = this.parse(obj);
    if (!expression) throw new Error('Empty JSONPath expression');

    const path = this._parseJSONPath(expression);
    return this._resolveJSONPath(obj, path);
  },

  _parseJSONPath(expr) {
    const parts = [];
    const tokens = expr.replace(/^\$\.?/, '').split(/\.(?!\[)|\[/g);

    for (const token of tokens) {
      if (token.endsWith(']')) {
        const inner = token.slice(0, -1);
        if (inner === '*') {
          parts.push({ type: 'wildcard' });
        } else if (inner.includes(':')) {
          const [start, end] = inner.split(':').map(Number);
          parts.push({ type: 'slice', start: start || 0, end: end || Infinity });
        } else if (/^\d+$/.test(inner)) {
          parts.push({ type: 'index', value: parseInt(inner) });
        } else {
          parts.push({ type: 'filter', expr: inner });
        }
      } else if (token === '*') {
        parts.push({ type: 'wildcard' });
      } else {
        parts.push({ type: 'key', value: token });
      }
    }
    return parts;
  },

  _resolveJSONPath(obj, parts) {
    if (parts.length === 0) return obj;

    const [head, ...rest] = parts;
    const results = [];

    const process = (current, remaining) => {
      if (remaining.length === 0) {
        results.push(current);
        return;
      }

      const next = remaining[0];
      const restParts = remaining.slice(1);

      switch (next.type) {
        case 'key':
          if (current && typeof current === 'object' && next.value in current) {
            process(current[next.value], restParts);
          }
          break;

        case 'wildcard':
          if (Array.isArray(current)) {
            current.forEach(item => process(item, restParts));
          } else if (current && typeof current === 'object') {
            Object.values(current).forEach(val => process(val, restParts));
          }
          break;

        case 'index':
          if (Array.isArray(current) && next.value < current.length) {
            process(current[next.value], restParts);
          }
          break;

        case 'slice':
          if (Array.isArray(current)) {
            const start = next.start || 0;
            const end = Math.min(next.end || current.length, current.length);
            for (let i = start; i < end; i++) {
              process(current[i], restParts);
            }
          }
          break;

        case 'filter':
          if (Array.isArray(current)) {
            current.forEach(item => {
              if (item && typeof item === 'object') {
                try {
                  const fn = new Function('item', `return item.${next.expr}`);
                  if (fn(item)) process(item, restParts);
                } catch (e) {}
              }
            });
          }
          break;
      }
    };

    process(obj, parts);
    return results.length === 1 ? results[0] : results;
  },

  validateSchema(obj, schema) {
    const errors = [];
    this._validateNode(obj, schema, '', errors);
    return { valid: errors.length === 0, errors };
  },

  _validateNode(obj, schema, path, errors) {
    if (schema.type) {
      const actualType = this._getJsonType(obj);
      if (actualType !== schema.type) {
        errors.push({
          path: path || '$',
          message: `Expected type "${schema.type}", got "${actualType}"`
        });
        return;
      }
    }

    if (schema.required && typeof schema.required === 'object') {
      for (const key of schema.required) {
        if (!(key in (obj || {}))) {
          errors.push({
            path: path ? `${path}.${key}` : key,
            message: `Required property "${key}" is missing`
          });
        }
      }
    }

    if (schema.properties && typeof obj === 'object' && !Array.isArray(obj)) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (key in obj) {
          this._validateNode(obj[key], propSchema, path ? `${path}.${key}` : key, errors);
        }
      }
    }

    if (schema.items && Array.isArray(obj)) {
      obj.forEach((item, i) => {
        this._validateNode(item, schema.items, `${path}[${i}]`, errors);
      });
    }

    if (schema.minimum !== undefined && typeof obj === 'number' && obj < schema.minimum) {
      errors.push({ path, message: `Value ${obj} is less than minimum ${schema.minimum}` });
    }
    if (schema.maximum !== undefined && typeof obj === 'number' && obj > schema.maximum) {
      errors.push({ path, message: `Value ${obj} is greater than maximum ${schema.maximum}` });
    }
    if (schema.minLength !== undefined && typeof obj === 'string' && obj.length < schema.minLength) {
      errors.push({ path, message: `String length ${obj.length} is less than minLength ${schema.minLength}` });
    }
    if (schema.maxLength !== undefined && typeof obj === 'string' && obj.length > schema.maxLength) {
      errors.push({ path, message: `String length ${obj.length} is greater than maxLength ${schema.maxLength}` });
    }
    if (schema.pattern && typeof obj === 'string' && !new RegExp(schema.pattern).test(obj)) {
      errors.push({ path, message: `String does not match pattern "${schema.pattern}"` });
    }
    if (schema.enum && !schema.enum.includes(obj)) {
      errors.push({ path, message: `Value must be one of: ${schema.enum.join(', ')}` });
    }
    if (schema.minItems !== undefined && Array.isArray(obj) && obj.length < schema.minItems) {
      errors.push({ path, message: `Array has ${obj.length} items, minimum is ${schema.minItems}` });
    }
    if (schema.maxItems !== undefined && Array.isArray(obj) && obj.length > schema.maxItems) {
      errors.push({ path, message: `Array has ${obj.length} items, maximum is ${schema.maxItems}` });
    }
  },

  _getJsonType(val) {
    if (val === null) return 'null';
    if (Array.isArray(val)) return 'array';
    return typeof val;
  },

  merge(base, patch) {
    if (typeof base === 'string') base = this.parse(base);
    if (typeof patch === 'string') patch = this.parse(patch);
    return this._deepMerge(base, patch);
  },

  _deepMerge(target, source) {
    const result = { ...target };
    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) &&
          result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])) {
        result[key] = this._deepMerge(result[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  },

  patch(obj, operations) {
    if (typeof obj === 'string') obj = this.parse(obj);
    if (!Array.isArray(operations)) operations = [operations];

    const result = JSON.parse(JSON.stringify(obj));

    for (const op of operations) {
      switch (op.op) {
        case 'add': {
          const parts = this._parsePointer(op.path);
          this._setByPath(result, parts, op.value);
          break;
        }
        case 'remove': {
          const parts = this._parsePointer(op.path);
          this._removeByPath(result, parts);
          break;
        }
        case 'replace': {
          const parts = this._parsePointer(op.path);
          this._setByPath(result, parts, op.value);
          break;
        }
        case 'move': {
          const fromParts = this._parsePointer(op.from);
          const val = this._getByPath(result, fromParts);
          this._removeByPath(result, fromParts);
          const toParts = this._parsePointer(op.path);
          this._setByPath(result, toParts, val);
          break;
        }
        case 'copy': {
          const fromParts = this._parsePointer(op.from);
          const val = this._getByPath(result, fromParts);
          const toParts = this._parsePointer(op.path);
          this._setByPath(result, toParts, JSON.parse(JSON.stringify(val)));
          break;
        }
        case 'test': {
          const parts = this._parsePointer(op.path);
          const current = this._getByPath(result, parts);
          if (JSON.stringify(current) !== JSON.stringify(op.value)) {
            throw new Error(`Test failed at ${op.path}: expected ${JSON.stringify(op.value)}, got ${JSON.stringify(current)}`);
          }
          break;
        }
      }
    }

    return result;
  },

  _parsePointer(pointer) {
    if (!pointer || pointer === '/') return [];
    return pointer.split('/').slice(1).map(p =>
      p.replace(/~1/g, '/').replace(/~0/g, '~')
    );
  },

  _getByPath(obj, parts) {
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) {
        throw new Error(`Cannot traverse path: ${parts.join('/')}`);
      }
      if (/^\d+$/.test(part)) {
        current = current[parseInt(part)];
      } else {
        current = current[part];
      }
    }
    return current;
  },

  _setByPath(obj, parts, value) {
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const next = parts[i + 1];
      if (/^\d+$/.test(next)) {
        if (!Array.isArray(current[part])) current[part] = [];
        current = current[part];
      } else {
        if (typeof current[part] !== 'object' || current[part] === null) {
          current[part] = {};
        }
        current = current[part];
      }
    }
    const lastPart = parts[parts.length - 1];
    if (/^\d+$/.test(lastPart)) {
      if (!Array.isArray(current)) throw new Error('Cannot set index on non-array');
      current[parseInt(lastPart)] = value;
    } else {
      current[lastPart] = value;
    }
  },

  _removeByPath(obj, parts) {
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (current === null || current === undefined) return;
      current = current[part];
    }
    const lastPart = parts[parts.length - 1];
    if (Array.isArray(current)) {
      current.splice(parseInt(lastPart), 1);
    } else if (current && typeof current === 'object') {
      delete current[lastPart];
    }
  },

  diff(a, b) {
    if (typeof a === 'string') a = this.parse(a);
    if (typeof b === 'string') b = this.parse(b);
    return this._diffNodes(a, b, '$');
  },

  _diffNodes(a, b, path) {
    const changes = [];

    if (JSON.stringify(a) === JSON.stringify(b)) return changes;

    const typeA = this._getJsonType(a);
    const typeB = this._getJsonType(b);

    if (typeA !== typeB) {
      changes.push({ type: 'changed', path, oldValue: a, newValue: b });
      return changes;
    }

    if (typeA === 'object') {
      const allKeys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
      for (const key of allKeys) {
        const childPath = `${path}.${key}`;
        if (!(key in (a || {}))) {
          changes.push({ type: 'added', path: childPath, value: b[key] });
        } else if (!(key in (b || {}))) {
          changes.push({ type: 'removed', path: childPath, value: a[key] });
        } else {
          changes.push(...this._diffNodes(a[key], b[key], childPath));
        }
      }
    } else if (typeA === 'array') {
      const maxLen = Math.max(a.length, b.length);
      for (let i = 0; i < maxLen; i++) {
        const childPath = `${path}[${i}]`;
        if (i >= a.length) {
          changes.push({ type: 'added', path: childPath, value: b[i] });
        } else if (i >= b.length) {
          changes.push({ type: 'removed', path: childPath, value: a[i] });
        } else {
          changes.push(...this._diffNodes(a[i], b[i], childPath));
        }
      }
    } else if (a !== b) {
      changes.push({ type: 'changed', path, oldValue: a, newValue: b });
    }

    return changes;
  }
};
