export interface RankedResult {
  id: string;
  rank: number;
  score?: number;
}

export interface FusedResult {
  id: string;
  score: number;
  originalScores?: { [key: string]: number };
}

export class RRFUtil {
  static fuseRanks(rankedLists: RankedResult[][], k: number = 60): FusedResult[] {
    const fusedScores: { [id: string]: { score: number; originalScores: Record<string, any> } } = {};

    rankedLists.forEach((list, listIndex) => {
      list.forEach((item, itemIndex) => {
        const rank = itemIndex + 1;
        const rrfScoreComponent = 1 / (k + rank);

        if (!fusedScores[item.id]) {
          fusedScores[item.id] = { score: 0, originalScores: {} };
        }
        fusedScores[item.id].score += rrfScoreComponent;

        if (item.score !== undefined) {
          fusedScores[item.id].originalScores[`list_${listIndex}`] = item.score;
        }
      });
    });

    const finalResults: FusedResult[] = Object.entries(fusedScores)
      .map(([id, data]) => ({
        id,
        score: data.score,
        originalScores: data.originalScores,
      }))
      .sort((a, b) => b.score - a.score);

    return finalResults;
  }
}