// Command parser for natural language understanding

export interface ParsedCommand {
  type: 'command' | 'content' | 'unclear';
  command?: string;
  intent?: string;
  confidence: number;
  parameters?: Record<string, any>;
}

export interface CommandContext {
  lastAction?: string;
  hasResume: boolean;
  hasJobDescription: boolean;
  hasTailoredResume: boolean;
  lastMessage?: string;
  lastClassification?: string;
}

const commandPatterns = {
  reanalyze: [
    /^(reanalyze|re-analyze|analyze again|check again|run again)$/i,
    /^(redo|retry|try again|do it again)$/i,
    /^(refresh|update|recheck)$/i
  ],
  tailor: [
    /^(tailor|optimize|improve|enhance)$/i,
    /^(update resume|make it better|fix resume)$/i
  ],
  showOptions: [
    /^(what can you do|what are my options|help|commands|what can i do)$/i,
    /^(show options|list commands|available actions)$/i,
    /^(what's next|what should i do)$/i
  ],
  showComparison: [
    /^(show comparison|compare|view changes|see differences)$/i,
    /^(before and after|show diff)$/i
  ],
  detectAI: [
    /^(detect ai|check ai|ai score|is this ai)$/i,
    /^(human or ai|ai detection)$/i
  ],
  relevancy: [
    /^(relevancy|relevance|score|match)$/i,
    /^(how well|how good|match score)$/i
  ],
  clear: [
    /^(clear|reset|start over|new session)$/i,
    /^(forget|remove all)$/i
  ],
  export: [
    /^(export|download|save|get file)$/i,
    /^(download resume|save resume)$/i
  ]
};

export function parseCommand(text: string, context: CommandContext): ParsedCommand {
  const lowerText = text.toLowerCase().trim();
  const trimmedText = text.trim();
  
  // FIRST: Check if it's clearly content (resume/job description)
  // Content is usually long or has multiple content indicators
  const contentIndicators = [
    /experience|education|skills|work history|employment/i,
    /requirements|qualifications|responsibilities|job description|position/i,
    /@|email|phone|address|contact/i,
    /years of experience|proficient in|bachelor|master|degree/i,
    /\d{4}\s*-\s*\d{4}|\d+\s+years|\d+\s+months/i, // dates, years
    /company|employer|organization/i,
    /summary|objective|profile|background/i
  ];
  
  const contentScore = contentIndicators.filter(pattern => pattern.test(text)).length;
  
  // If it's long OR has multiple content indicators, it's content
  if (trimmedText.length > 150 || contentScore >= 2) {
    return {
      type: 'content',
      confidence: 0.9,
      parameters: { length: text.length, indicators: contentScore }
    };
  }
  
  // SECOND: Check for commands (only if text is short, like a command would be)
  // Commands are typically short phrases (under 100 chars) and don't have content indicators
  if (trimmedText.length <= 100 && contentScore === 0) {
    // Check for exact command matches (patterns already have ^ and $ anchors)
    for (const [command, patterns] of Object.entries(commandPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(lowerText)) {
          return {
            type: 'command',
            command,
            intent: command,
            confidence: 0.95,
            parameters: extractParameters(text, command, context)
          };
        }
      }
    }
    
    // Check for contextual commands (e.g., "again" means redo last action)
    // Only match if it's a standalone word/phrase
    if (/^(again|redo|retry|once more)$/i.test(lowerText) && context.lastAction && trimmedText.length < 30) {
      return {
        type: 'command',
        command: context.lastAction,
        intent: 'repeat',
        confidence: 0.9,
        parameters: { repeat: true }
      };
    }
  }
  
  // If short but unclear, might be a command attempt
  if (trimmedText.length < 50 && contentScore === 0) {
    return {
      type: 'unclear',
      confidence: 0.3,
      parameters: { text, length: trimmedText.length }
    };
  }
  
  // Default: treat as content if we're not sure
  return {
    type: 'content',
    confidence: 0.6,
    parameters: { length: text.length }
  };
}

function extractParameters(text: string, command: string, context: CommandContext): Record<string, any> {
  const params: Record<string, any> = {};
  
  switch (command) {
    case 'reanalyze':
      // Determine what to reanalyze based on context
      if (context.hasTailoredResume) {
        params.target = 'tailored';
      } else if (context.hasResume) {
        params.target = 'resume';
      } else if (context.hasJobDescription) {
        params.target = 'job_description';
      }
      break;
      
    case 'tailor':
      if (context.hasResume && context.hasJobDescription) {
        params.ready = true;
      } else {
        params.ready = false;
        params.missing = !context.hasResume ? 'resume' : 'job_description';
      }
      break;
      
    case 'showOptions':
      params.context = {
        hasResume: context.hasResume,
        hasJobDescription: context.hasJobDescription,
        hasTailoredResume: context.hasTailoredResume
      };
      break;
  }
  
  return params;
}

export function getAvailableCommands(context: CommandContext): string[] {
  const commands: string[] = [];
  
  if (context.hasResume || context.hasJobDescription || context.hasTailoredResume) {
    commands.push('reanalyze');
  }
  
  if (context.hasResume && context.hasJobDescription) {
    commands.push('tailor');
    commands.push('showComparison');
  }
  
  if (context.hasResume || context.hasTailoredResume) {
    commands.push('detectAI');
    commands.push('relevancy');
  }
  
  commands.push('showOptions');
  commands.push('export');
  commands.push('clear');
  
  return commands;
}

export function formatCommandSuggestions(commands: string[], context: CommandContext): string {
  const suggestions: string[] = [];
  
  if (commands.includes('tailor') && context.hasResume && context.hasJobDescription) {
    suggestions.push('💡 Type "tailor" or "optimize" to tailor your resume');
  }
  
  if (commands.includes('reanalyze')) {
    suggestions.push('💡 Type "reanalyze" to check your content again');
  }
  
  if (commands.includes('showComparison') && context.hasTailoredResume) {
    suggestions.push('💡 Type "show comparison" to see before/after');
  }
  
  if (commands.includes('detectAI')) {
    suggestions.push('💡 Type "detect ai" to check AI content score');
  }
  
  suggestions.push('💡 Type "help" to see all available commands');
  
  return suggestions.join('\n');
}

