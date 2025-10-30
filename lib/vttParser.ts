/**
 * Parses VTT (WebVTT) file content and extracts clean transcript text
 * Removes timestamps, IDs, and metadata, keeping only the actual dialogue
 */
export function parseVTT(vttContent: string): string {
  console.log('🔍 [VTT Parser] Starting to parse VTT content');
  console.log('📄 [VTT Parser] Original content length:', vttContent.length, 'characters');

  const lines = vttContent.split('\n');
  console.log('📝 [VTT Parser] Total lines in VTT:', lines.length);

  const transcriptLines: string[] = [];

  let skipNext = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip header
    if (line === 'WEBVTT' || line === '') {
      continue;
    }

    // Skip UUID/ID lines
    if (line.includes('-') && line.split('-').length >= 4) {
      skipNext = true;
      continue;
    }

    // Skip timestamp lines (format: 00:00:04.264 --> 00:00:04.824)
    if (line.includes('-->')) {
      skipNext = true;
      continue;
    }

    // Skip voice tags but extract content
    if (line.startsWith('<v ')) {
      const match = line.match(/<v[^>]*>(.*?)<\/v>/);
      if (match && match[1]) {
        transcriptLines.push(match[1]);
      }
      skipNext = false;
      continue;
    }

    // Add actual transcript text
    if (!skipNext && line !== '') {
      transcriptLines.push(line);
    }

    skipNext = false;
  }

  // Join lines with spaces
  let cleanedTranscript = transcriptLines.join(' ').trim();
  console.log('📊 [VTT Parser] Initial cleaned transcript length:', cleanedTranscript.length, 'characters');

  // Apply post-processing improvements
  cleanedTranscript = enhanceTranscript(cleanedTranscript);

  console.log('✅ [VTT Parser] Extracted', transcriptLines.length, 'transcript lines');
  console.log('📊 [VTT Parser] Final cleaned transcript length:', cleanedTranscript.length, 'characters');
  console.log('📝 [VTT Parser] First 300 chars:', cleanedTranscript.substring(0, 300));

  return cleanedTranscript;
}

/**
 * Enhances transcript by cleaning up common speech-to-text artifacts
 */
function enhanceTranscript(text: string): string {
  let enhanced = text;

  // Remove any remaining VTT tags (voice tags, etc.)
  enhanced = enhanced.replace(/<v[^>]*>/gi, ''); // Remove opening voice tags
  enhanced = enhanced.replace(/<\/v>/gi, ''); // Remove closing voice tags
  enhanced = enhanced.replace(/<[^>]+>/g, ''); // Remove any other HTML-like tags

  // Remove common filler words (optional - uncomment to enable)
  // enhanced = enhanced.replace(/\b(um|uh|like|you know|I mean|sort of|kind of)\b/gi, '');

  // Fix multiple spaces
  enhanced = enhanced.replace(/\s+/g, ' ');

  // Fix spacing before punctuation
  enhanced = enhanced.replace(/\s+([.,!?;:])/g, '$1');

  // Fix spacing after punctuation (ensure one space)
  enhanced = enhanced.replace(/([.,!?;:])(\S)/g, '$1 $2');

  // Remove repeated words that are common in transcriptions (e.g., "the the", "and and")
  enhanced = enhanced.replace(/\b(\w+)\s+\1\b/gi, '$1');

  // Capitalize first letter of sentences
  enhanced = enhanced.replace(/(^\w|\.\s+\w)/g, (match) => match.toUpperCase());

  // Remove extra spaces again after all replacements
  enhanced = enhanced.replace(/\s+/g, ' ').trim();

  return enhanced;
}
