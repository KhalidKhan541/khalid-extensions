class SyntaxHighlighter {
  constructor() {
    this.rules = {
      javascript: [
        { pattern: /(\/\/.*$)/gm, class: 'highlight-comment' },
        { pattern: /(\/\*[\s\S]*?\*\/)/g, class: 'highlight-comment' },
        { pattern: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, class: 'highlight-string' },
        { pattern: /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|delete|typeof|instanceof|in|of|class|extends|super|import|from|export|default|async|await|try|catch|finally|throw|yield|this|null|undefined|true|false|void|with|debugger)\b/g, class: 'highlight-keyword' },
        { pattern: /\b(\d+\.?\d*([eE][+-]?\d+)?)\b/g, class: 'highlight-number' },
        { pattern: /\b([A-Z]\w*)\b/g, class: 'highlight-type' },
        { pattern: /(\w+)\s*(?=\()/g, class: 'highlight-function' }
      ],
      python: [
        { pattern: /(#.*$)/gm, class: 'highlight-comment' },
        { pattern: /("""[\s\S]*?"""|'''[\s\S]*?''')/g, class: 'highlight-string' },
        { pattern: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, class: 'highlight-string' },
        { pattern: /\b(def|class|import|from|return|if|elif|else|for|while|break|continue|pass|raise|try|except|finally|with|as|lambda|yield|global|nonlocal|assert|del|in|not|and|or|is|None|True|False|self|print|async|await)\b/g, class: 'highlight-keyword' },
        { pattern: /\b(\d+\.?\d*([eE][+-]?\d+)?j?)\b/g, class: 'highlight-number' },
        { pattern: /(\w+)\s*(?=\()/g, class: 'highlight-function' }
      ],
      html: [
        { pattern: /(<!--[\s\S]*?-->)/g, class: 'highlight-comment' },
        { pattern: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, class: 'highlight-string' },
        { pattern: /(&lt;\/?)([\w-]+)/g, class: 'highlight-tag' },
        { pattern: /\b([\w-]+)(?==)/g, class: 'highlight-attr' }
      ],
      css: [
        { pattern: /(\/\*[\s\S]*?\*\/)/g, class: 'highlight-comment' },
        { pattern: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, class: 'highlight-string' },
        { pattern: /(#[0-9a-fA-F]{3,8})\b/g, class: 'highlight-number' },
        { pattern: /\b(\d+\.?\d*(px|em|rem|%|vh|vw|s|ms)?)\b/g, class: 'highlight-number' },
        { pattern: /(@\w+|!important)/g, class: 'highlight-keyword' },
        { pattern: /([\.\#][\w-]+)(?=\s*[\{,])/g, class: 'highlight-function' }
      ],
      json: [
        { pattern: /("(?:[^"\\]|\\.)*")\s*:/g, class: 'highlight-attr' },
        { pattern: /:\s*("(?:[^"\\]|\\.)*")/g, class: 'highlight-string' },
        { pattern: /\b(\d+\.?\d*([eE][+-]?\d+)?)\b/g, class: 'highlight-number' },
        { pattern: /\b(true|false|null)\b/g, class: 'highlight-keyword' }
      ],
      sql: [
        { pattern: /(--.*$)/gm, class: 'highlight-comment' },
        { pattern: /(\/\*[\s\S]*?\*\/)/g, class: 'highlight-comment' },
        { pattern: /('(?:[^'\\]|\\.)*')/g, class: 'highlight-string' },
        { pattern: /\b(SELECT|FROM|WHERE|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|ALTER|DROP|INDEX|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AND|OR|NOT|IN|IS|NULL|LIKE|BETWEEN|EXISTS|GROUP|BY|ORDER|ASC|DESC|HAVING|LIMIT|OFFSET|UNION|ALL|DISTINCT|AS|CASE|WHEN|THEN|ELSE|END|PRIMARY|KEY|FOREIGN|REFERENCES|CONSTRAINT|DEFAULT|CHECK|UNIQUE|CASCADE|RESTRICT|IF|REPLACE|PROCEDURE|FUNCTION|TRIGGER|VIEW|GRANT|REVOKE|COMMIT|ROLLBACK|BEGIN|TRANSACTION|SAVEPOINT)\b/gi, class: 'highlight-keyword' },
        { pattern: /\b(INT|INTEGER|BIGINT|SMALLINT|TINYINT|FLOAT|DOUBLE|DECIMAL|NUMERIC|VARCHAR|CHAR|TEXT|BLOB|DATE|DATETIME|TIMESTAMP|BOOLEAN|BOOL|BIT)\b/gi, class: 'highlight-type' },
        { pattern: /\b(\d+\.?\d*)\b/g, class: 'highlight-number' }
      ],
      go: [
        { pattern: /(\/\/.*$)/gm, class: 'highlight-comment' },
        { pattern: /(\/\*[\s\S]*?\*\/)/g, class: 'highlight-comment' },
        { pattern: /("(?:[^"\\]|\\.)*"|`[^`]*`)/g, class: 'highlight-string' },
        { pattern: /\b(package|import|func|return|if|else|for|range|switch|case|default|break|continue|go|defer|select|chan|map|struct|interface|type|var|const|nil|true|false|iota|make|new|len|cap|append|copy|delete|panic|recover|print|println|fmt|error|string|int|bool|float32|float64|byte|rune)\b/g, class: 'highlight-keyword' },
        { pattern: /\b(\d+\.?\d*)\b/g, class: 'highlight-number' },
        { pattern: /(\w+)\s*(?=\()/g, class: 'highlight-function' }
      ],
      rust: [
        { pattern: /(\/\/.*$)/gm, class: 'highlight-comment' },
        { pattern: /(\/\*[\s\S]*?\*\/)/g, class: 'highlight-comment' },
        { pattern: /("(?:[^"\\]|\\.)*")/g, class: 'highlight-string' },
        { pattern: /\b(fn|let|mut|pub|struct|enum|impl|trait|use|mod|crate|self|super|return|if|else|for|while|loop|match|break|continue|move|ref|as|where|async|await|dyn|static|const|type|unsafe|extern|true|false|Some|None|Ok|Err|Self|Box|Vec|String|Option|Result|i8|i16|i32|i64|i128|u8|u16|u32|u64|u128|f32|f64|bool|char|str|usize|isize)\b/g, class: 'highlight-keyword' },
        { pattern: /\b(\d+\.?\d*)\b/g, class: 'highlight-number' },
        { pattern: /(\w+)\s*(?=\()/g, class: 'highlight-function' }
      ],
      java: [
        { pattern: /(\/\/.*$)/gm, class: 'highlight-comment' },
        { pattern: /(\/\*[\s\S]*?\*\/)/g, class: 'highlight-comment' },
        { pattern: /("(?:[^"\\]|\\.)*")/g, class: 'highlight-string' },
        { pattern: /\b(public|private|protected|static|final|abstract|class|interface|extends|implements|new|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|throws|void|int|long|short|byte|float|double|char|boolean|String|Object|System|null|true|false|this|super|import|package|instanceof|synchronized|volatile|transient|native|strictfp|enum|assert|instanceof)\b/g, class: 'highlight-keyword' },
        { pattern: /\b(\d+\.?\d*[LlFfDd]?)\b/g, class: 'highlight-number' },
        { pattern: /(\w+)\s*(?=\()/g, class: 'highlight-function' }
      ],
      cpp: [
        { pattern: /(\/\/.*$)/gm, class: 'highlight-comment' },
        { pattern: /(\/\*[\s\S]*?\*\/)/g, class: 'highlight-comment' },
        { pattern: /(#(?:include|define|ifdef|ifndef|endif|if|else|elif|undef|pragma|error|warning)[\s\S]*$)/gm, class: 'highlight-keyword' },
        { pattern: /("(?:[^"\\]|\\.)*")/g, class: 'highlight-string' },
        { pattern: /\b(using|namespace|class|struct|union|enum|typedef|template|typename|virtual|override|explicit|return|if|else|for|while|do|switch|case|break|continue|try|catch|throw|new|delete|this|nullptr|true|false|void|int|long|short|char|float|double|bool|auto|const|static|extern|register|volatile|mutable|inline|constexpr|std|string|vector|map|set|cout|cin|endl|null)\b/g, class: 'highlight-keyword' },
        { pattern: /\b(\d+\.?\d*[UuLl]*)\b/g, class: 'highlight-number' },
        { pattern: /(\w+)\s*(?=\()/g, class: 'highlight-function' }
      ],
      text: []
    };
  }

  highlight(code, language = 'text') {
    if (!code || language === 'text') return this.escapeHtml(code);
    const rules = this.rules[language] || this.rules.text;
    let result = this.escapeHtml(code);
    const replacements = [];
    for (const rule of rules) {
      const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
      let match;
      while ((match = regex.exec(code)) !== null) {
        const escaped = this.escapeHtml(match[0]);
        const placeholder = `\x00${replacements.length}\x00`;
        replacements.push({ escaped, class: rule.class });
        result = result.replace(escaped, placeholder);
      }
    }
    for (let i = replacements.length - 1; i >= 0; i--) {
      const r = replacements[i];
      result = result.replace(
        `\x00${i}\x00`,
        `<span class="${r.class}">${r.escaped}</span>`
      );
    }
    return result;
  }

  escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, c => map[c]);
  }

  renderCodeBlock(code, language) {
    const lines = code.split('\n');
    const lineNumbers = lines.map((_, i) => i + 1).join('\n');
    const highlighted = this.highlight(code, language);
    return `
      <div class="code-block-wrapper">
        <div class="code-header">
          <span class="code-lang">${language}</span>
          <button class="code-copy-btn" onclick="navigator.clipboard.writeText(this.closest('.code-block-wrapper').querySelector('pre').textContent)">Copy</button>
        </div>
        <pre><code><span class="line-numbers">${lineNumbers}</span>${highlighted}</code></pre>
      </div>
    `;
  }
}

window.SyntaxHighlighter = SyntaxHighlighter;