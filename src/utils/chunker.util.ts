export class ChunkerUtil {
  static splitText(text: string, chunkSize: number = 1000, overlap: number = 100): string[] {
    const chunks: string[] = [];
    let i = 0;

    while (i < text.length) {
      let end = Math.min(i + chunkSize, text.length);

      if (end < text.length) {
        let potentialBreak = text.lastIndexOf('.', end);
        if (potentialBreak > i + chunkSize - overlap && potentialBreak > i) {
          end = potentialBreak + 1;
        } else {
          potentialBreak = text.lastIndexOf('\n', end);
          if (potentialBreak > i + chunkSize - overlap && potentialBreak > i) {
            end = potentialBreak + 1;
          }
        }
      }

      const chunkContent = text.substring(i, end).trim();
      if (chunkContent.length > 0) {
        chunks.push(chunkContent);
      }

      i = end - overlap;
      if (i < 0) i = 0;
    }

    return chunks.filter(chunk => chunk.length > 0);
  }
}