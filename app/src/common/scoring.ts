// 萌兽性格测试 — 计分引擎 v2（TypeScript 版，与 core/scoring.js 同一算法）
// 两层计分：维度层（80 分）+ 分支亲和层（20 分，上限 5 点计分）
export interface DimensionDef {
  id: string;
  name: string;
  poles: Record<string, string>;
}
export interface QuizOption {
  id: string;
  text: string;
  scores: Record<string, string>;
  affinity?: Record<string, number>;
}
export interface QuizQuestion {
  id: number;
  text: string;
  options: QuizOption[];
}
export interface QuizData {
  version: string;
  title: string;
  subtitle: string;
  dimensions: DimensionDef[];
  questions: QuizQuestion[];
}
export interface Animal {
  id: string;
  name: string;
  fullName: string;
  emoji: string;
  color: string;
  signature: Record<string, string>;
  title: string;
  description: string;
  traits: string[];
  motto: string;
  flaw: string;
  bestPartner: string;
  rarity: number;
}
export interface AnimalsData {
  version: string;
  animals: Animal[];
}
export interface DimensionResult {
  name: string;
  pole: string;
  poleName: string;
  percents: Record<string, number>;
  total: number;
}
export interface RankedItem {
  id: string;
  matchPercent: number;
  affinity: number;
}
export interface QuizResult {
  animal: Animal;
  matchPercent: number;
  dimensions: Record<string, DimensionResult>;
  ranking: RankedItem[];
}

export function computeResult(quiz: QuizData, animals: AnimalsData, answers: string[]): QuizResult {
  if (!Array.isArray(answers) || answers.length !== quiz.questions.length) {
    throw new Error("answers length must equal number of questions");
  }
  const counts: Record<string, Record<string, number>> = {};
  const lastPole: Record<string, string> = {};
  const affinity: Record<string, number> = {};
  for (const d of quiz.dimensions) counts[d.id] = {};
  for (const a of animals.animals) affinity[a.id] = 0;
  quiz.questions.forEach((q, i) => {
    const opt = q.options.find((o) => o.id === answers[i]);
    if (!opt) throw new Error("invalid answer at question " + (i + 1));
    for (const [dim, pole] of Object.entries(opt.scores)) {
      counts[dim][pole] = (counts[dim][pole] || 0) + 1;
      lastPole[dim] = pole;
    }
    for (const [aid, pts] of Object.entries(opt.affinity || {})) {
      affinity[aid] = (affinity[aid] || 0) + pts;
    }
  });
  const dimensions: Record<string, DimensionResult> = {};
  const userPoles: Record<string, string> = {};
  for (const d of quiz.dimensions) {
    const poles = Object.keys(d.poles);
    const total = poles.reduce((s, p) => s + (counts[d.id][p] || 0), 0);
    const percents: Record<string, number> = {};
    for (const p of poles) percents[p] = total ? Math.round(((counts[d.id][p] || 0) / total) * 100) : 50;
    let pole = poles[0];
    if ((counts[d.id][poles[1]] || 0) > (counts[d.id][poles[0]] || 0)) pole = poles[1];
    else if ((counts[d.id][poles[1]] || 0) === (counts[d.id][poles[0]] || 0)) pole = lastPole[d.id] || poles[0];
    userPoles[d.id] = pole;
    dimensions[d.id] = { name: d.name, pole, poleName: d.poles[pole], percents, total };
  }
  const scored = animals.animals.map((a, idx) => {
    let align = 0;
    let hamming = 0;
    for (const d of quiz.dimensions) {
      const poles = Object.keys(d.poles);
      const total = poles.reduce((s, p) => s + (counts[d.id][p] || 0), 0);
      const dominantShare = total ? (counts[d.id][userPoles[d.id]] || 0) / total : 0.5;
      align += a.signature[d.id] === userPoles[d.id] ? dominantShare : 1 - dominantShare;
      if (a.signature[d.id] !== userPoles[d.id]) hamming += 1;
    }
    const alignShare = align / quiz.dimensions.length;
    const aff = affinity[a.id] || 0;
    const matchPercent = Math.round(alignShare * 80 + Math.min(aff, 5) * 4);
    return { animal: a, matchPercent, affinity: aff, hamming, idx };
  });
  scored.sort(
    (x, y) => y.matchPercent - x.matchPercent || y.affinity - x.affinity || x.hamming - y.hamming || x.idx - y.idx
  );
  const top = scored[0];
  return {
    animal: top.animal,
    matchPercent: top.matchPercent,
    dimensions,
    ranking: scored.map((s) => ({ id: s.animal.id, matchPercent: s.matchPercent, affinity: s.affinity })),
  };
}
