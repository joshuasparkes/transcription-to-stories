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

  const cleanedTranscript = transcriptLines.join(' ').trim();
  console.log('✅ [VTT Parser] Extracted', transcriptLines.length, 'transcript lines');
  console.log('📊 [VTT Parser] Cleaned transcript length:', cleanedTranscript.length, 'characters');
  console.log('📝 [VTT Parser] First 200 chars:', cleanedTranscript.substring(0, 200));

  return cleanedTranscript;
}
