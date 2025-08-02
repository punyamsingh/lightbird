"use client";

export class SubtitleConverter {
  static async convertSrtToVtt(srtContent: string): Promise<string> {
    // Basic SRT to VTT conversion
    let vttContent = "WEBVTT\n\n";
    
    // Split by double newlines to get subtitle blocks
    const blocks = srtContent.split(/\n\s*\n/);
    
    for (const block of blocks) {
      const lines = block.trim().split('\n');
      if (lines.length >= 3) {
        // Skip the sequence number (first line)
        const timecodeLine = lines[1];
        const textLines = lines.slice(2);
        
        // Convert SRT timecode format to VTT format
        // SRT: 00:00:20,000 --> 00:00:24,400
        // VTT: 00:00:20.000 --> 00:00:24.400
        const vttTimecode = timecodeLine.replace(/,/g, '.');
        
        vttContent += `${vttTimecode}\n`;
        vttContent += `${textLines.join('\n')}\n\n`;
      }
    }
    
    return vttContent;
  }
  
  static async convertFileToVtt(file: File): Promise<File> {
    const fileName = file.name.toLowerCase();
    
    // If already VTT, return as is
    if (fileName.endsWith('.vtt')) {
      return file;
    }
    
    // Convert SRT to VTT
    if (fileName.endsWith('.srt')) {
      const srtContent = await file.text();
      const vttContent = await this.convertSrtToVtt(srtContent);
      
      // Create new VTT file
      const vttBlob = new Blob([vttContent], { type: 'text/vtt' });
      const vttFileName = file.name.replace(/\.srt$/i, '.vtt');
      
      return new File([vttBlob], vttFileName, { type: 'text/vtt' });
    }
    
    // For other formats (ASS, SSA), return original and let browser handle it
    return file;
  }
}
