export interface ParsedCommand {
  type: 'structured' | 'natural';
  target: {
    type: 'all' | 'index' | 'active' | 'match';
    value?: string | number;
  };
  action: string;
  args: string[];
  raw: string;
}

export class TerminalParser {
  /**
   * Parse a terminal input string
   */
  parse(input: string): ParsedCommand {
    const trimmed = input.trim();
    
    // Check for structured command patterns
    // Examples: 
    // @all extract links
    // @tab[0] click "button"
    // @active navigate "url"
    if (trimmed.startsWith('@')) {
      return this.parseStructured(trimmed);
    }
    
    // Fallback to natural language
    return {
      type: 'natural',
      target: { type: 'active' },
      action: 'process',
      args: [trimmed],
      raw: trimmed
    };
  }

  private parseStructured(input: string): ParsedCommand {
    const parts = input.split(/\s+/);
    const targetPart = parts[0];
    const action = parts[1] || 'observe';
    const args = parts.slice(2);

    let target: ParsedCommand['target'] = { type: 'active' };

    if (targetPart === '@all') {
      target = { type: 'all' };
    } else if (targetPart === '@active') {
      target = { type: 'active' };
    } else if (targetPart.startsWith('@tab[')) {
      const match = targetPart.match(/@tab\[(.*?)\]/);
      if (match) {
        const val = match[1];
        if (/^\d+$/.test(val)) {
          target = { type: 'index', value: parseInt(val, 10) };
        } else {
          target = { type: 'match', value: val };
        }
      }
    }

    return {
      type: 'structured',
      target,
      action,
      args,
      raw: input
    };
  }
}

export const terminalParser = new TerminalParser();
