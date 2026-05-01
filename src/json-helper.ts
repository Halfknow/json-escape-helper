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
          } else if (text[i] === '\r') {
            // Skip raw \r inside double-quoted strings
            i++;
          } else {
            result += text[i];
            i++;
          }
        }
        if (i < text.length) {
          result += '"';
          i++;
        }
      } else if (text[i] === "'") {
        result += '"';
        i++;
        while (i < text.length && text[i] !== "'") {
          if (text[i] === '\\' && i + 1 < text.length) {
            if (text[i + 1] === "'") {
              // \' → ' (un-escape single quote)
              result += "'";
              i += 2;
            } else {
              result += text[i] + text[i + 1];
              i += 2;
            }
          } else if (text[i] === '"') {
            // Escape inner double quote for JSON
            result += '\\"';
            i++;
          } else if (text[i] === '\r') {
            // Skip raw \r inside single-quoted strings
            i++;
          } else {
            result += text[i];
            i++;
          }
        }
        if (i < text.length) {
          result += '"';
          i++;
        }
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
   * isValid
   * @param text
   */
  public isValid(text: string): boolean {
    try {
      return typeof this.parse(text) === "object";
    } catch (err) {
      return false;
    }
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
