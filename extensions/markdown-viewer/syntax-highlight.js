/**
 * SyntaxHighlighter - Token-based code syntax highlighting
 * Supports 20+ languages with beautiful coloring.
 */
window.SyntaxHighlighter = (function () {
  'use strict';

  const LANGUAGES = {
    javascript: {
      keywords: /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|delete|typeof|instanceof|in|of|class|extends|super|this|import|export|default|from|async|await|try|catch|finally|throw|yield|static|get|set|void|null|undefined|true|false)\b/g,
      strings: /(["'`])(?:(?!\1|\\).|\\.)*\1/g,
      comments: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
      numbers: /\b(\d+\.?\d*([eE][+-]?\d+)?|0[xX][0-9a-fA-F]+|0[bB][01]+|0[oO][0-7]+)\b/g,
      functions: /\b([a-zA-Z_$][\w$]*)\s*(?=\()/g,
      regex: /\/(?!\/)(?:[^/\\]|\\.)+\/[gimsuy]*/g,
      operators: /([+\-*/%=!<>&|^~?:]+|\.{3})/g,
      punctuation: /[{}[\]();,]/g,
      property: /\.([a-zA-Z_$][\w$]*)/g,
      builtin: /\b(console|window|document|Math|JSON|Promise|Array|Object|String|Number|Boolean|Map|Set|RegExp|Date|Error|Symbol|Proxy|Reflect|WeakMap|WeakSet|parseInt|parseFloat|isNaN|isFinite|encodeURI|decodeURI|setTimeout|setInterval|clearTimeout|clearInterval|fetch|require|module|exports)\b/g
    },
    typescript: {
      keywords: /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|delete|typeof|instanceof|in|of|class|extends|super|this|import|export|default|from|async|await|try|catch|finally|throw|yield|static|get|set|void|null|undefined|true|false|type|interface|enum|namespace|module|declare|abstract|implements|readonly|private|protected|public|as|is|keyof|infer|never|unknown|any|void|string|number|boolean|symbol|bigint|object|Array|Record|Partial|Required|Readonly|Pick|Omit|Exclude|Extract|NonNullable|ReturnType|InstanceType|Promise|Map|Set)\b/g,
      strings: /(["'`])(?:(?!\1|\\).|\\.)*\1/g,
      comments: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
      numbers: /\b(\d+\.?\d*([eE][+-]?\d+)?|0[xX][0-9a-fA-F]+|0[bB][01]+|0[oO][0-7]+)\b/g,
      functions: /\b([a-zA-Z_$][\w$]*)\s*(?=\()/g,
      operators: /([+\-*/%=!<>&|^~?:]+|\.{3})/g,
      punctuation: /[{}[\]();,<>]/g,
      property: /\.([a-zA-Z_$][\w$]*)/g,
      type: /\b([A-Z][\w]*)\b/g
    },
    python: {
      keywords: /\b(def|class|return|if|elif|else|for|while|break|continue|pass|import|from|as|try|except|finally|raise|with|yield|lambda|global|nonlocal|assert|del|in|not|and|or|is|None|True|False|self|async|await)\b/g,
      strings: /("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|f"(?:[^"\\]|\\.)*"|f'(?:[^'\\]|\\.)*')/g,
      comments: /(#.*$)/gm,
      numbers: /\b(\d+\.?\d*([eE][+-]?\d+)?j?|0[xX][0-9a-fA-F]+|0[bB][01]+|0[oO][0-7]+)\b/g,
      decorators: /@(\w+(?:\.\w+)*)/g,
      functions: /\b([a-zA-Z_][\w]*)\s*(?=\()/g,
      builtin: /\b(print|len|range|int|str|float|list|dict|set|tuple|bool|type|isinstance|issubclass|super|property|staticmethod|classmethod|enumerate|zip|map|filter|sorted|reversed|any|all|min|max|sum|abs|round|open|input|format|hash|id|dir|vars|globals|locals|hasattr|getattr|setattr|delattr|callable|iter|next|slice|object|Exception|ValueError|TypeError|KeyError|IndexError|AttributeError|RuntimeError|StopIteration|IOError|OSError|FileNotFoundError|ImportError|SyntaxError|NameError|ZeroDivisionError)\b/g,
      operators: /([+\-*/%=!<>&|^~@:]+|->|\.\.)/g,
      punctuation: /[{}[\]();,.]/g
    },
    html: {
      tags: /(<\/?)([\w-]+)([\s>])/g,
      attributes: /\s([\w-]+)(?:=(?:"[^"]*"|'[^']*'|[\w-]+))?/g,
      strings: /(["'])(?:(?!\1).)*\1/g,
      comments: /(<!--[\s\S]*?-->)/g,
      doctypes: /(<!DOCTYPE[^>]*>)/gi,
      entities: /(&[\w#]+;)/g
    },
    css: {
      keywords: /\b(important|inherit|initial|unset|revert|none|auto|normal)\b/g,
      selectors: /([.#]?[\w-]+(?:\s*[.#][\w-]+)*(?:\s*[>+~]\s*[.#]?[\w-]+)*(?:\s*\[[\w-]+(?:[~|^$*]?=['"][^'"]*['"])?\])*(?:\s*:\s*[\w-]+(?:\([^)]*\))?)*)\s*(?={)/g,
      properties: /([\w-]+)\s*(?=:)/g,
      values: /:\s*([^;{}]+)/g,
      strings: /(["'])(?:(?!\1).)*\1/g,
      comments: /(\/\*[\s\S]*?\*\/)/g,
      numbers: /\b(\d+\.?\d*(px|em|rem|%|vh|vw|vmin|vmax|deg|rad|turn|s|ms|fr|ch|ex|pt|cm|mm|in|pc)?)\b/g,
      functions: /\b([\w-]+)\s*(?=\()/g,
      atRules: /(@[\w-]+(?:\([^)]*\))?)\b/g,
      units: /(\d+)(px|em|rem|%|vh|vw|vmin|vmax|deg|rad|turn|s|ms|fr|ch|ex|pt|cm|mm|in|pc)\b/g,
      hexColors: /(#[0-9a-fA-F]{3,8})\b/g,
      punctuation: /[{}();:,]/g
    },
    json: {
      strings: /"(?:[^"\\]|\\.)*"(?=\s*:)/g,
      values: /"(?:[^"\\]|\\.)*"|true|false|null|\b\d+\.?\d*\b/g,
      punctuation: /[{}[\],:]/g,
      property: /"(?:[^"\\]|\\.)*"(?=\s*:)/g
    },
    sql: {
      keywords: /\b(SELECT|FROM|WHERE|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|ALTER|DROP|INDEX|VIEW|JOIN|INNER|LEFT|RIGHT|OUTER|ON|AND|OR|NOT|IN|EXISTS|BETWEEN|LIKE|ORDER|BY|GROUP|HAVING|LIMIT|OFFSET|UNION|ALL|DISTINCT|AS|COUNT|SUM|AVG|MIN|MAX|CASE|WHEN|THEN|ELSE|END|NULL|IS|PRIMARY|KEY|FOREIGN|REFERENCES|CONSTRAINT|DEFAULT|CHECK|UNIQUE|AUTO_INCREMENT|INT|INTEGER|BIGINT|SMALLINT|TINYINT|FLOAT|DOUBLE|DECIMAL|VARCHAR|CHAR|TEXT|BLOB|DATE|DATETIME|TIMESTAMP|BOOLEAN|BOOL|TRIGGER|PROCEDURE|FUNCTION|BEGIN|COMMIT|ROLLBACK|GRANT|REVOKE|DENY|WITH|RECURSIVE|OVER|PARTITION|ROW_NUMBER|RANK|DENSE_RANK|LAG|LEAD|FIRST_VALUE|LAST_VALUE|NTH_VALUE|FETCH|NEXT|ROWS|ONLY|OFFSET|FETCH|ROW|ROWS|ONLY|MERGE|USING|MATCHED|WHEN|MATCHED|THEN|INSERT|UPDATE|DELETE|SOURCE|TARGET|PIVOT|UNPIVOT|CROSS|APPLY|OUTER|APPLY|LATERAL|EXCEPT|INTERSECT|MINUS)\b/gi,
      strings: /('(?:[^'\\]|\\.)*')/g,
      comments: /(\/\*[\s\S]*?\*\/|--.*$)/gm,
      numbers: /\b(\d+\.?\d*)\b/g,
      operators: /(=|<>|!=|>|<|>=|<=|AND|OR|NOT|IN|BETWEEN|LIKE|IS|NULL|EXISTS|ANY|ALL|SOME|\+|-|\*|\/|%)/gi,
      functions: /\b(COUNT|SUM|AVG|MIN|MAX|ABS|ROUND|CEILING|FLOOR|COALESCE|NULLIF|IFNULL|CAST|CONVERT|SUBSTRING|TRIM|UPPER|LOWER|LEN|LENGTH|REPLACE|CONCAT|LEFT|RIGHT|REVERSE|SPACE|REPLICATE|CHAR|ASCII|DATEADD|DATEDIFF|DATEPART|GETDATE|NOW|CURRENT_TIMESTAMP|FORMAT|PARSE|TRY_PARSE|ROW_NUMBER|RANK|DENSE_RANK|LAG|LEAD|FIRST_VALUE|LAST_VALUE|NTH_VALUE|NTILE|PERCENT_RANK|CUME_DIST|EXTRACT|INTERVAL)\b/gi,
      types: /\b(INT|INTEGER|BIGINT|SMALLINT|TINYINT|FLOAT|DOUBLE|DECIMAL|NUMERIC|VARCHAR|NVARCHAR|CHAR|NCHAR|TEXT|NTEXT|BLOB|CLOB|DATE|DATETIME|DATETIME2|DATETIMEOFFSET|TIME|TIMESTAMP|BOOLEAN|BOOL|BIT|BINARY|VARBINARY|UNIQUEIDENTIFIER|XML|CURSOR|TABLE|ROWVERSION|IMAGE)\b/gi,
      punctuation: /[();,.\[\]]/g
    },
    go: {
      keywords: /\b(package|import|func|return|if|else|for|range|switch|case|default|break|continue|go|defer|select|chan|var|const|type|struct|interface|map|make|new|len|cap|append|copy|delete|close|panic|recover|error|nil|true|false|iota)\b/g,
      strings: /("(?:[^"\\]|\\.)*"|`[\s\S]*?`)/g,
      comments: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
      numbers: /\b(\d+\.?\d*([eE][+-]?\d+)?i?|0[xX][0-9a-fA-F]+|0[oO][0-7]+|0[bB][01]+)\b/g,
      functions: /\b([a-zA-Z_][\w]*)\s*(?=\()/g,
      types: /\b(int|int8|int16|int32|int64|uint|uint8|uint16|uint32|uint64|float32|float64|complex64|complex128|bool|string|byte|rune|error|any)\b/g,
      operators: /(:=|&&|\|\||[+\-*/%=!<>&|^~]+|<-)/g,
      punctuation: /[{}[\]();,.]/g
    },
    rust: {
      keywords: /\b(fn|let|mut|const|static|struct|enum|impl|trait|pub|use|mod|crate|self|super|where|as|match|if|else|for|while|loop|break|continue|return|move|ref|unsafe|async|await|dyn|type|extern|in|ref|box|yield|true|false|Some|None|Ok|Err|Self)\b/g,
      strings: /("(?:[^"\\]|\\.)*"|r#?"[\s\S]*?"#?)/g,
      comments: /(\/\/.*$|\/\*[\s\S]*?\*\/|\/\/\/.*$)/gm,
      numbers: /\b(\d+\.?\d*([eE][+-]?\d+)?[fFdDiIuU]?\w?|0[xX][0-9a-fA-F_]+[uUiI]?\w?|0[bB][01_]+[uUiI]?\w?|0[oO][0-7_]+[uUiI]?\w?)\b/g,
      macros: /\b([a-zA-Z_][\w]*)!/g,
      functions: /\b([a-zA-Z_][\w]*)\s*(?=\()/g,
      types: /\b(i8|i16|i32|i64|i128|u8|u16|u32|u64|u128|f32|f64|bool|char|str|String|Vec|Box|Rc|Arc|Cell|RefCell|HashMap|HashSet|Option|Result|Self|usize|isize)\b/g,
      operators: /(->|=>|::|\.\.|\.\.=?|[+\-*/%=!<>&|^~?]+|@[a-zA-Z_]+)/g,
      punctuation: /[{}[\]();,.]/g,
      lifetimes: /'[a-zA-Z_][\w]*/g
    },
    java: {
      keywords: /\b(public|private|protected|static|final|abstract|class|interface|enum|extends|implements|new|this|super|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|throws|import|package|void|null|true|false|instanceof|synchronized|volatile|transient|native|strictfp|assert|yield|record|sealed|permits|var)\b/g,
      strings: /("(?:[^"\\]|\\.)*")/g,
      comments: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
      numbers: /\b(\d+\.?\d*[fFdDlL]?|0[xX][0-9a-fA-F]+[lL]?)\b/g,
      functions: /\b([a-zA-Z_][\w]*)\s*(?=\()/g,
      types: /\b(int|long|short|byte|float|double|boolean|char|String|Integer|Long|Short|Byte|Float|Double|Boolean|Character|Object|Class|System|Math|List|ArrayList|Map|HashMap|Set|HashSet|Queue|LinkedList|Stack|Vector|Collections|Arrays|Stream|Optional|CompletableFuture|Future|Thread|Runnable|Exception|Error|Throwable|Override|Deprecated|SuppressWarnings)\b/g,
      annotations: /@(\w+)/g,
      operators: /([+\-*/%=!<>&|^~?:]+|->)/g,
      punctuation: /[{}[\]();,.]/g
    },
    cpp: {
      keywords: /\b(auto|break|case|char|class|const|continue|default|delete|do|double|else|enum|extern|float|for|goto|if|inline|int|long|namespace|new|operator|private|protected|public|register|return|short|signed|sizeof|static|struct|switch|template|this|throw|try|catch|typedef|typename|union|unsigned|using|virtual|void|volatile|while|constexpr|consteval|constinit|nullptr|concept|requires|co_await|co_return|co_yield|module|import|export|alignas|alignof|char8_t|char16_t|char32_t|decltype|noexcept|static_assert|thread_local|override|final|explicit)\b/g,
      strings: /("(?:[^"\\]|\\.)*"|R"[^(]*\([\s\S]*?\)[^"]*")/g,
      comments: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
      numbers: /\b(\d+\.?\d*([eE][+-]?\d+)?[fFlLuU]*|0[xX][0-9a-fA-F]+[uUlL]*|0[bB][01]+[uUlL]*)\b/g,
      preprocessor: /(#\s*\w+)/g,
      functions: /\b([a-zA-Z_][\w]*)\s*(?=\()/g,
      types: /\b(int|long|short|char|float|double|bool|void|string|vector|map|set|pair|tuple|shared_ptr|unique_ptr|weak_ptr|array|list|deque|queue|stack|priority_queue|unordered_map|unordered_set|size_t|ptrdiff_t|nullptr_t|wchar_t|char8_t|char16_t|char32_t|FILE|ostream|istream|iostream)\b/g,
      operators: /(->|::|\.\.|\*|[+\-*/%=!<>&|^~?:]+)/g,
      punctuation: /[{}[\]();,.]/g,
      includes: /(#\s*include\s*[<"][^>"]*[>"])/g
    },
    ruby: {
      keywords: /\b(def|end|class|module|if|elsif|else|unless|while|until|for|in|do|break|next|redo|retry|return|raise|rescue|ensure|begin|begin|rescue|end|yield|super|self|nil|true|false|and|or|not|alias|undef|defined\?|require|require_relative|load|include|extend|attr_accessor|attr_reader|attr_writer|public|private|protected|initialize|new|puts|print|gets|p|pp|lambda|proc|block_given\?|method|send|respond_to\?|is_a\?|kind_of\?|instance_of\?|freeze|dup|clone|tap|then|yield_self|map|select|reject|reduce|each|each_with_index|each_with_object|find|find_index|any\?|all\?|none\?|count|sum|min|max|sort|sort_by|flat_map|compact|flatten|uniq|group_by|partition|zip|to_a|to_h|to_s|to_i|to_f|to_sym|to_proc)\b/g,
      strings: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|%[qQwWiI][(\/\[{<][^)\/\]}>]+[)\/\]}>]|%r[(\/\[{<][^)\/\]}>]+[)\/\]}>][imosx]*)/g,
      comments: /(#.*$)/gm,
      numbers: /\b(\d+\.?\d*([eE][+-]?\d+)?i?|0[xX][0-9a-fA-F]+|0[bB][01]+|0[oO][0-7]+)\b/g,
      symbols: /(:[\w!?]+)/g,
      instanceVars: /(@[\w]+)/g,
      functions: /\b([a-zA-Z_][\w]*)\s*(?=[{])/g,
      operators: /(<=?>?|[!=<>]=?|[+\-*\/%&|^~]+|<<|>>|\.\.?|::)/g,
      punctuation: /[{}[\]();,.]/g
    },
    php: {
      keywords: /\b(abstract|and|array|as|break|callable|case|catch|class|clone|const|continue|declare|default|die|do|echo|else|elseif|empty|enddeclare|endfor|endforeach|endif|endswitch|endwhile|eval|exit|extends|final|finally|fn|for|foreach|function|global|goto|if|implements|include|include_once|instanceof|insteadof|interface|isset|list|match|namespace|new|or|print|private|protected|public|readonly|require|require_once|return|static|switch|throw|trait|try|unset|use|var|while|xor|yield|yield from|true|false|null|self|parent|class|static)\b/g,
      strings: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g,
      comments: /(\/\/.*$|#.*$|\/\*[\s\S]*?\*\/)/gm,
      variables: /(\$[\w]+)/g,
      numbers: /\b(\d+\.?\d*([eE][+-]?\d+)?[fFlL]?|0[xX][0-9a-fA-F]+|0[bB][01]+|0[oO][0-7]+)\b/g,
      functions: /\b([a-zA-Z_][\w]*)\s*(?=\()/g,
      operators: /(=>|->|[+\-*/%=!<>&|^~@?:]+|\.{3})/g,
      punctuation: /[{}[\]();,.]/g,
      tags: /(<\?php|\?>)/g
    },
    swift: {
      keywords: /\b(class|deinit|enum|extension|func|guard|if|import|init|inout|let|nil|operator|private|protocol|public|static|struct|subscript|super|self|Self|typealias|var|as|break|case|continue|default|defer|do|else|fallthrough|for|guard|in|repeat|return|switch|where|while|catch|throw|throws|try|await|async|actor|associatedtype|convenience|dynamic|final|indirect|lazy|mutating|nonmutating|optional|override|postfix|precedencegroup|prefix|required|some|unowned|weak|willSet|didSet|true|false|get|set|didSet|willSet|Any|AnyObject|AnyHashable|Error|Codable|Decodable|Encodable|Sendable|Hashable|Equatable|Comparable|Identifiable|CustomStringConvertible)\b/g,
      strings: /("(?:[^"\\]|\\.)*"|"""[\s\S]*?"""|'(?:[^'\\]|\\.)*')/g,
      comments: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
      numbers: /\b(\d+\.?\d*([eE][+-]?\d+)?|0[xX][0-9a-fA-F]+|0[bB][01]+|0[oO][0-7]+)\b/g,
      functions: /\b([a-zA-Z_][\w]*)\s*(?=\()/g,
      types: /\b(Int|Int8|Int16|Int32|Int64|UInt|UInt8|UInt16|UInt32|UInt64|Float|Float16|Float32|Float64|Double|Bool|String|Character|Array|Dictionary|Set|Optional|Result|Any|AnyObject|Void|Never|Range|ClosedRange|PartialRangeFrom|PartialRangeThrough|CountableRange|CountableClosedRange|Data|URL|URLSession|URLRequest|HTTPURLResponse|NotificationCenter|UserDefaults|DispatchQueue|DispatchGroup|OperationQueue|Thread|Error|Codable|Decodable|Encodable|Hashable|Equatable|Comparable|Identifiable|CustomStringConvertible|Optional|Unwrap)\b/g,
      operators: /(->|=>|::|[+\-*/%=!<>&|^~?]+|\.\.\.?)/g,
      punctuation: /[{}[\]();,.]/g,
      attributes: /(@\w+)/g
    },
    kotlin: {
      keywords: /\b(fun|val|var|class|object|interface|enum|data|sealed|abstract|open|inner|inline|noinline|crossinline|reified|private|protected|public|internal|override|final|const|lateinit|by|lazy|companion|annotation|typealias|constructor|init|get|set|field|delegate|if|else|when|for|while|do|break|continue|return|throw|try|catch|finally|is|as|in|!in|!is|as\?|import|package|this|super|true|false|null|it|typeof|typeOf|::|..|until|downTo|step|repeat|suspend|async|operator|infix|tailrec|external|actual|expect|value|crossinline|noinline|reified|data|sealed|inner|companion|object|enum|annotation|interface|abstract|open|final|lateinit|by|lazy|vararg|out|nothing|Any|Array|List|MutableList|Map|MutableMap|Set|MutableSet|Pair|Triple|Sequence|Iterable|Collection|Boolean|Byte|Short|Int|Long|Float|Double|Char|String|Unit|Nothing)\b/g,
      strings: /("""[\s\S]*?"""|"(?:[^"\\]|\\.)*"|'[^']*')/g,
      comments: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
      numbers: /\b(\d+\.?\d*[fFDdLl]?|0[xX][0-9a-fA-F]+[lL]?|0[bB][01]+[lL]?)\b/g,
      functions: /\b([a-zA-Z_][\w]*)\s*(?=\()/g,
      annotations: /@(\w+)/g,
      operators: /(->|=>|\.\.?|[+\-*/%=!<>&|^~?]+|::)/g,
      punctuation: /[{}[\]();,.]/g
    },
    bash: {
      keywords: /\b(if|then|else|elif|fi|for|while|until|do|done|case|esac|in|function|select|time|coproc|return|exit|break|continue|declare|typeset|local|export|readonly|unset|shift|source|trap|exec|eval|set|shopt|echo|printf|read|mapfile|readarray|true|false|test)\b/g,
      strings: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g,
      comments: /(#.*$)/gm,
      variables: /(\$[{(]?[\w]+[})]?|\$\d+|\$[*@#?$!_-]+)/g,
      commands: /\b(\w+)\s/g,
      numbers: /\b(\d+)\b/g,
      operators: /(\|\|?|&&?|;|&|>>?|<<?|\$\(|`[^`]*`|\(\(|\)\)|[+\-*/%=!<>&|^~]+)/g,
      interpolation: /(\$\([\s\S]*?\))/g,
      punctuation: /[{}[\]();,.|&]/g
    },
    yaml: {
      keywords: /\b(true|false|null|yes|no|on|off)\b/gi,
      strings: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g,
      comments: /(#.*$)/gm,
      numbers: /\b(\d+\.?\d*([eE][+-]?\d+)?|0[xX][0-9a-fA-F]+|0[bB][01]+)\b/g,
      keys: /^(\s*)([\w.-]+)\s*:/gm,
      documentMarkers: /^(---|\.\.\.)\s*$/gm,
      anchors: /([&*][\w]+)/g,
      tags: /(![\w.]+)/g,
      operators: /(:|>|>|<<)/g,
      punctuation: /[[\]{}:,]/g
    },
    xml: {
      tags: /(<\/?)([\w:-]+)([\s>])/g,
      attributes: /\s([\w:-]+)(?:=(?:"[^"]*"|'[^']*'|[\w-]+))?/g,
      strings: /(["'])(?:(?!\1).)*\1/g,
      comments: /(<!--[\s\S]*?-->)/g,
      cdata: /(<!\[CDATA\[[\s\S]*?\]\]>)/g,
      doctypes: /(<!DOCTYPE[^>]*>)/gi,
      entities: /(&[\w#]+;)/g,
      processingInstructions: /(<\?[\s\S]*?\?>)/g
    },
    markdown: {
      headings: /^(#{1,6}\s.+)$/gm,
      bold: /(\*\*|__)(.+?)\1/g,
      italic: /(\*|_)(.+?)\1/g,
      code: /(`[^`]+`)/g,
      links: /(\[.+?\]\(.+?\))/g,
      images: /(!\[.*?\]\(.+?\))/g,
      lists: /^(\s*[-*+]\s|^\s*\d+\.\s)/gm,
      blockquotes: /^(\s*>)/gm,
      horizontalRules: /^([-*_]{3,})$/gm,
      inlineCode: /`([^`]+)`/g
    }
  };

  function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function highlightToken(text, className) {
    return `<span class="token ${className}">${escapeHtml(text)}</span>`;
  }

  function highlightCode(code, lang) {
    if (!code) return '';

    const langKey = normalizeLanguage(lang);
    const rules = LANGUAGES[langKey];

    if (!rules) {
      return escapeHtml(code);
    }

    let escaped = code;

    const tokens = [];
    let tokenIdx = 0;

    function replaceWithToken(match, className) {
      const placeholder = `\x00T${tokenIdx}\x00`;
      tokens.push({ placeholder, highlighted: `<span class="token ${className}">${escapeHtml(match)}</span>` });
      tokenIdx++;
      return placeholder;
    }

    if (rules.comments) {
      escaped = escaped.replace(rules.comments, (m) => replaceWithToken(m, 'comment'));
    }
    if (rules.strings) {
      escaped = escaped.replace(rules.strings, (m) => replaceWithToken(m, 'string'));
    }
    if (rules.keywords) {
      escaped = escaped.replace(rules.keywords, (m) => replaceWithToken(m, 'keyword'));
    }
    if (rules.numbers) {
      escaped = escaped.replace(rules.numbers, (m) => replaceWithToken(m, 'number'));
    }
    if (rules.builtin) {
      escaped = escaped.replace(rules.builtin, (m) => replaceWithToken(m, 'builtin'));
    }
    if (rules.types) {
      escaped = escaped.replace(rules.types, (m) => replaceWithToken(m, 'type'));
    }
    if (rules.functions) {
      escaped = escaped.replace(rules.functions, (m) => replaceWithToken(m, 'function'));
    }
    if (rules.decorators || rules.annotations) {
      const r = rules.decorators || rules.annotations;
      escaped = escaped.replace(r, (m) => replaceWithToken(m, 'decorator'));
    }
    if (rules.operators) {
      escaped = escaped.replace(rules.operators, (m) => replaceWithToken(m, 'operator'));
    }
    if (rules.punctuation) {
      escaped = escaped.replace(rules.punctuation, (m) => replaceWithToken(m, 'punctuation'));
    }

    for (let j = tokens.length - 1; j >= 0; j--) {
      escaped = escaped.split(tokens[j].placeholder).join(tokens[j].highlighted);
    }

    return escaped;
  }

  function normalizeLanguage(lang) {
    if (!lang) return '';
    const map = {
      js: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      jsx: 'javascript',
      py: 'python',
      rb: 'ruby',
      sh: 'bash',
      shell: 'bash',
      zsh: 'bash',
      zshrc: 'bash',
      bashrc: 'bash',
      htm: 'html',
      vue: 'html',
      svelte: 'html',
      yml: 'yaml',
      md: 'markdown',
      kt: 'kotlin',
      kts: 'kotlin',
      rs: 'rust',
      go: 'go',
      swift: 'swift',
      c: 'cpp',
      h: 'cpp',
      hpp: 'cpp',
      cc: 'cpp',
      cxx: 'cpp',
      'c++': 'cpp',
      cs: 'javascript',
      php: 'php',
      css: 'css',
      scss: 'css',
      less: 'css',
      sass: 'css',
      json5: 'json',
      jsonc: 'json',
      xml: 'xml',
      svg: 'xml',
      sql: 'sql',
      graphql: 'sql',
      gql: 'sql'
    };
    return map[lang.toLowerCase()] || lang.toLowerCase();
  }

  function highlight(code, lang) {
    const escaped = escapeHtml(code);
    if (!lang || !LANGUAGES[normalizeLanguage(lang)]) {
      return escaped;
    }
    return highlightCode(code, lang);
  }

  function highlightWithLineNumbers(code, lang) {
    const highlighted = highlight(code, lang);
    const lines = highlighted.split('\n');
    return lines
      .map((line, idx) => `<span class="line-number">${idx + 1}</span><span class="line-content">${line}</span>`)
      .join('\n');
  }

  return {
    highlight,
    highlightWithLineNumbers,
    normalizeLanguage,
    escapeHtml,
    LANGUAGES
  };
})();
