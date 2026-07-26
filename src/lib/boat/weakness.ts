export type WeaknessItem = {
  key: string;
  label: string;
  attempts: number;
  wrong: number;
  wrongRate: number;
  recentWrong: boolean;
  message: string;
};

export type WeaknessAnalysis = {
  status: "ready" | "pending";
  message: string;
  items: WeaknessItem[];
};

export function analyzeWeaknessByTags(): WeaknessAnalysis {
  return {
    status: "pending",
    message: "기존 태그 기반 약점 분석은 비활성화되었습니다.",
    items: []
  };
}

export function analyzeWeaknessByCategory(): WeaknessAnalysis {
  return {
    status: "pending",
    message: "기존 카테고리 기반 약점 분석은 비활성화되었습니다.",
    items: []
  };
}

export function getTopWeakTags(): WeaknessAnalysis {
  return analyzeWeaknessByTags();
}

export function getTopWeakCategories(): WeaknessAnalysis {
  return analyzeWeaknessByCategory();
}

export function getRecommendedReviewQuestions() {
  return [];
}
