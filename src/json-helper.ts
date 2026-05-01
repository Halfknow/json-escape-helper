let JSON = require("json-bigint");
export default class {
  /**
   * normalizeQuotes - convert single-quoted strings to double-quoted via
   * character-by-character parsing, properly escaping inner double quotes;
   * leave double-quoted strings untouched
   */
  private normalizeQuotes(text: string): string {
    let result = "";
    let i = 0;
    while (i < text.length) {
      if (text[i] === '"') {
        result += '"';
        i++;
        while (i < text.length && text[i] !== '"') {
          if (text[i] === '\\' && i + 1 < text.length) {
            result += text[i] + text[i + 1];
            i += 2;
          } else if (text[i] === '\n') {
            result += '\\n';
            i++;
          } else if (text[i] === '\r') {
            i++;
          } else if (text[i] === '\t') {
            result += '\\t';
            i++;
          } else {
            result += text[i];
            i++;
          }
        }
        if (i < text.length) { result += '"'; i++; }
      } else if (text[i] === "'") {
        result += '"';
        i++;
        while (i < text.length && text[i] !== "'") {
          if (text[i] === '\\' && i + 1 < text.length) {
            if (text[i + 1] === "'") {
              result += "'";
              i += 2;
            } else {
              result += text[i] + text[i + 1];
              i += 2;
            }
          } else if (text[i] === '"') {
            result += '\\"';
            i++;
          } else if (text[i] === '\n') {
            result += '\\n';
            i++;
          } else if (text[i] === '\r') {
            i++;
          } else if (text[i] === '\t') {
            result += '\\t';
            i++;
          } else {
            result += text[i];
            i++;
          }
        }
        if (i < text.length) { result += '"'; i++; }
      } else {
        result += text[i];
        i++;
      }
    }
    return result;
  }

  /**
   * normalizeLiterals - convert Python-style True/False/None to JSON
   * true/false/null, only when they appear outside of strings
   */
  private normalizeLiterals(text: string): string {
    let result = "";
    let i = 0;
    while (i < text.length) {
      if (text[i] === '"') {
        // Skip string content
        result += '"';
        i++;
        while (i < text.length && text[i] !== '"') {
          if (text[i] === '\\' && i + 1 < text.length) {
            result += text[i] + text[i + 1];
            i += 2;
          } else {
            result += text[i];
            i++;
          }
        }
        if (i < text.length) {
          result += '"';
          i++;
        }
      } else if (text.startsWith("True", i) && !this.isWordChar(text[i + 4])) {
        result += "true";
        i += 4;
      } else if (text.startsWith("False", i) && !this.isWordChar(text[i + 5])) {
        result += "false";
        i += 5;
      } else if (text.startsWith("None", i) && !this.isWordChar(text[i + 4])) {
        result += "null";
        i += 4;
      } else {
        result += text[i];
        i++;
      }
    }
    return result;
  }

  private isWordChar(ch: string | undefined): boolean {
    if (ch === undefined) return false;
    return /[a-zA-Z0-9_]/.test(ch);
  }

  /**
   * normalize - full normalization pipeline for non-standard JSON
   */
  private normalize(text: string): string {
    let normalized = this.normalizeQuotes(text);
    normalized = this.normalizeLiterals(normalized);
    // Remove trailing commas before } or ]
    normalized = normalized.replace(/,\s*([}\]])/g, "$1");
    return normalized;
  }

  /**
   * parse - try standard JSON first, then fall back to normalization
   */
  private parse(text: string): any {
    try {
      return JSON.parse(text);
    } catch {
      return JSON.parse(this.normalize(text));
    }
  }

  /**
   * validate - returns error message with position, or null if valid
   */
  public validate(text: string): string | null {
    // Try with native JSON first for better error messages
    let nativeError: string | null = null;
    try {
      const result = globalThis.JSON.parse(text);
      if (typeof result !== "object") {
        return "Not a JSON object or array";
      }
      // Valid with native parser, also validate with json-bigint for consistency
      try {
        this.parse(text);
      } catch {}
      return null;
    } catch (err: any) {
      nativeError = err.message || "Unknown error";
    }

    // Try normalized version
    let normalized: string;
    try {
      normalized = this.normalize(text);
    } catch {
      return nativeError;
    }

    try {
      const result = globalThis.JSON.parse(normalized);
      if (typeof result !== "object") {
        return "Not a JSON object or array";
      }
      return null;
    } catch (err: any) {
      // Use native parser error on normalized text for better messages
      let msg = err.message || nativeError;

      // Extract position and map to original text context
      const posMatch = msg.match(/position\s+(\d+)/i);
      if (posMatch) {
        const pos = parseInt(posMatch[1]);
        // Show context from normalized text (closer to what user sees)
        const lineInfo = this.getPositionInfo(normalized, pos);
        msg = msg + `\n${lineInfo}`;
      }
      return msg;
    }
  }

  /**
   * getPositionInfo - convert character position to line:column with context
   */
  private getPositionInfo(text: string, pos: number): string {
    let line = 1;
    let col = 1;
    let lastLineStart = 0;
    for (let i = 0; i < pos && i < text.length; i++) {
      if (text[i] === "\n") {
        line++;
        col = 1;
        lastLineStart = i + 1;
      } else {
        col++;
      }
    }
    const lineEnd = text.indexOf("\n", lastLineStart);
    const lineText = text.substring(lastLineStart, lineEnd === -1 ? text.length : lineEnd);
    const pointer = " ".repeat(col - 1) + "^";
    return `Line ${line}, Column ${col}\n${lineText}\n${pointer}`;
  }

  /**
   * escape
   * @param text
   */
  public escape(text: string): string {
    return JSON.stringify(text)
      .replace(/^"/g, "")
      .replace(/"$/g, "");
  }

  /**
   * unescape
   * @param text
   */
  public unescape(text: string): string {
    let formattedText = text;
    try {
      if (!text.startsWith('"')) {
        formattedText = '"'.concat(formattedText);
      }

      if (!text.endsWith('"')) {
        formattedText = formattedText.concat('"');
      }

      return JSON.parse(formattedText);
    } catch (err) {
      return text;
    }
  }

  /**
   * beautify
   * @param text
   * @param tabSize
   */
  public beautify(text: string, tabSize?: number | string): string {
    try {
      const parsed = this.parse(text);
      return typeof parsed === "object"
        ? JSON.stringify(parsed, null, tabSize)
        : text;
    } catch {
      return text;
    }
  }

  /**
   * uglify
   * @param text
   */
  public uglify(text: string): string {
    try {
      const parsed = this.parse(text);
      return typeof parsed === "object"
        ? JSON.stringify(parsed, null, 0)
        : text;
    } catch {
      return text;
    }
  }

  /**
   * dispose
   */
  dispose() {}
}
