/**
 * Utility to identify AI-generated content and obfuscate it
 * Compares original vs tailored resume to find new/modified content
 */

export interface ContentMapEntry {
  obfuscatedText: string;
  realText: string;
  position: { start: number; end: number };
  section: string;
  isFreeReveal: boolean;
}

export interface ObfuscationResult {
  obfuscatedResume: string;
  contentMap: ContentMapEntry[];
  freeReveal: {
    section: string;
    originalText: string;
    improvedText: string;
    position: { start: number; end: number };
  } | null;
}

/**
 * Generate random hash/character pattern for obfuscation
 */
function generateObfuscatedText(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#@$%&*';
  const label = '🔒 AI-optimized content locked — unlock to reveal';
  const minHashLength = 8;
  
  // If the text is shorter than the label, just use a short hash
  if (length < label.length + minHashLength) {
    let hash = '';
    for (let i = 0; i < Math.max(minHashLength, length - 5); i++) {
      hash += chars[Math.floor(Math.random() * chars.length)];
    }
    return hash;
  }
  
  // Generate hash to fill remaining space after label
  const hashLength = length - label.length - 1; // -1 for space
  let hash = '';
  for (let i = 0; i < hashLength; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  
  return `${label} ${hash}`;
}

/**
 * Extract section name from text (e.g., "## Experience" -> "Experience")
 */
function extractSectionName(text: string, position: number): string {
  const beforeText = text.substring(0, position);
  const lines = beforeText.split('\n').reverse();
  
  for (const line of lines) {
    // Check for markdown headers
    const headerMatch = line.match(/^#{1,3}\s+(.+)$/);
    if (headerMatch) {
      return headerMatch[1].trim();
    }
    // Check for plain text headers (all caps, short lines)
    if (line.trim().length > 0 && line.trim().length < 50 && line === line.toUpperCase()) {
      return line.trim();
    }
  }
  
  return 'General';
}

/**
 * Find differences between original and tailored resume
 * Returns array of { start, end, originalText, newText }
 * Uses a simpler approach: find sections that are significantly different
 */
function findDifferences(original: string, tailored: string): Array<{
  start: number;
  end: number;
  originalText: string;
  newText: string;
}> {
  const differences: Array<{
    start: number;
    end: number;
    originalText: string;
    newText: string;
  }> = [];
  
  // Split into sentences for better comparison
  const originalSentences = original.split(/([.!?]\s+)/).filter(s => s.trim().length > 0);
  const tailoredSentences = tailored.split(/([.!?]\s+)/).filter(s => s.trim().length > 0);
  
  let origPos = 0;
  let tailPos = 0;
  
  for (let i = 0; i < Math.max(originalSentences.length, tailoredSentences.length); i++) {
    const origSent = i < originalSentences.length ? originalSentences[i] : '';
    const tailSent = i < tailoredSentences.length ? tailoredSentences[i] : '';
    
    // Calculate similarity
    const similarity = calculateSimilarity(origSent.trim(), tailSent.trim());
    
    // If sentences are significantly different (less than 70% similar)
    if (similarity < 0.7 && tailSent.trim().length > 10) {
      // Find positions in original string
      const startInOriginal = original.indexOf(origSent, origPos);
      const endInOriginal = startInOriginal + origSent.length;
      
      // Find positions in tailored string
      const startInTailored = tailored.indexOf(tailSent, tailPos);
      const endInTailored = startInTailored + tailSent.length;
      
      if (startInOriginal >= 0 && startInTailored >= 0) {
        differences.push({
          start: startInTailored, // Use tailored position for replacement
          end: endInTailored,
          originalText: origSent,
          newText: tailSent
        });
      }
      
      origPos = endInOriginal;
      tailPos = endInTailored;
    } else {
      // Sentences are similar, just advance positions
      if (origSent) {
        const pos = original.indexOf(origSent, origPos);
        if (pos >= 0) origPos = pos + origSent.length;
      }
      if (tailSent) {
        const pos = tailored.indexOf(tailSent, tailPos);
        if (pos >= 0) tailPos = pos + tailSent.length;
      }
    }
  }
  
  // Also check for completely new sections (not in original)
  const originalLower = original.toLowerCase();
  const tailoredLower = tailored.toLowerCase();
  
  // Find new paragraphs/sections
  const tailoredParagraphs = tailored.split(/\n\n+/);
  for (const para of tailoredParagraphs) {
    if (para.trim().length > 50) {
      const paraLower = para.toLowerCase();
      // If this paragraph doesn't appear in original, it's new
      if (!originalLower.includes(paraLower.substring(0, Math.min(50, paraLower.length)))) {
        const start = tailored.indexOf(para);
        if (start >= 0) {
          differences.push({
            start,
            end: start + para.length,
            originalText: '',
            newText: para
          });
        }
      }
    }
  }
  
  // Sort by start position
  differences.sort((a, b) => a.start - b.start);
  
  return differences;
}

/**
 * Select best section for free reveal (highest impact improvement)
 */
function selectFreeReveal(
  contentMap: ContentMapEntry[],
  original: string,
  tailored: string
): ObfuscationResult['freeReveal'] {
  if (contentMap.length === 0) return null;
  
  // Score each entry based on:
  // 1. Length of improvement (longer = more impactful)
  // 2. Contains metrics/numbers
  // 3. Contains action verbs
  // 4. Position (earlier sections are more visible)
  
  const scored = contentMap.map((entry, index) => {
    let score = 0;
    
    // Length bonus
    score += Math.min(entry.realText.length / 100, 5);
    
    // Metrics bonus
    const hasMetrics = /\d+/.test(entry.realText);
    if (hasMetrics) score += 3;
    
    // Action verbs bonus
    const actionVerbs = ['led', 'managed', 'increased', 'improved', 'developed', 'created', 'achieved', 'delivered'];
    const hasActionVerb = actionVerbs.some(verb => 
      entry.realText.toLowerCase().includes(verb)
    );
    if (hasActionVerb) score += 2;
    
    // Position bonus (earlier = better)
    score += (contentMap.length - index) / contentMap.length;
    
    return { entry, score };
  });
  
  // Sort by score and pick the best one
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0].entry;
  
  // Extract the original text from the original resume at this position
  const originalText = original.substring(best.position.start, best.position.end);
  
  return {
    section: best.section,
    originalText: originalText || '',
    improvedText: best.realText,
    position: best.position
  };
}

/**
 * Main obfuscation function
 */
export function obfuscateResume(
  originalResume: string,
  tailoredResume: string
): ObfuscationResult {
  // Find all differences
  const differences = findDifferences(originalResume, tailoredResume);
  
  // Build obfuscated resume and content map
  let obfuscatedResume = tailoredResume;
  const contentMap: ContentMapEntry[] = [];
  
  // Process differences in reverse order to maintain positions
  const sortedDiffs = [...differences].sort((a, b) => b.start - a.start);
  
  for (const diff of sortedDiffs) {
    // Only obfuscate if the new text is significantly different
    // (more than 30% different or contains new content)
    const similarity = calculateSimilarity(diff.originalText, diff.newText);
    if (similarity < 0.7 && diff.newText.trim().length > 10) {
      const section = extractSectionName(tailoredResume, diff.start);
      const obfuscatedText = generateObfuscatedText(diff.newText.length);
      
      // Replace in obfuscated resume
      obfuscatedResume = 
        obfuscatedResume.substring(0, diff.start) +
        obfuscatedText +
        obfuscatedResume.substring(diff.end);
      
      // Add to content map
      contentMap.push({
        obfuscatedText,
        realText: diff.newText,
        position: { start: diff.start, end: diff.start + obfuscatedText.length },
        section,
        isFreeReveal: false // Will be set later
      });
    }
  }
  
  // Select best section for free reveal
  let freeReveal = selectFreeReveal(contentMap, originalResume, tailoredResume);

  // Sanitize: don't expose corrupted data (e.g. raw JSON) as free reveal
  if (freeReveal) {
    const text = freeReveal.improvedText;
    if (
      text.length > 2000 ||
      text.includes("improvementMetrics") ||
      text.includes('"atsKeywordsMatched"')
    ) {
      freeReveal = null;
    }
  }
  
  // Mark free reveal in content map
  if (freeReveal) {
    const freeRevealEntry = contentMap.find(
      entry => entry.position.start === freeReveal.position.start
    );
    if (freeRevealEntry) {
      freeRevealEntry.isFreeReveal = true;
      // Replace obfuscated text with real text for free reveal
      obfuscatedResume = 
        obfuscatedResume.substring(0, freeRevealEntry.position.start) +
        freeRevealEntry.realText +
        obfuscatedResume.substring(freeRevealEntry.position.end);
      // Update position
      freeRevealEntry.position.end = freeRevealEntry.position.start + freeRevealEntry.realText.length;
    }
  }
  
  return {
    obfuscatedResume,
    contentMap,
    freeReveal
  };
}

/**
 * Calculate similarity between two strings (0-1)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Reveal obfuscated content after payment
 */
export function revealContent(
  obfuscatedResume: string,
  contentMap: ContentMapEntry[]
): string {
  let revealedResume = obfuscatedResume;
  
  // Process in reverse order to maintain positions
  const sortedMap = [...contentMap]
    .filter(entry => !entry.isFreeReveal) // Skip free reveal (already revealed)
    .sort((a, b) => b.position.start - a.position.start);
  
  for (const entry of sortedMap) {
    revealedResume = 
      revealedResume.substring(0, entry.position.start) +
      entry.realText +
      revealedResume.substring(entry.position.end);
  }
  
  return revealedResume;
}

