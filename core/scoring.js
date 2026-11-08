// 萌兽性格测试 — 计分引擎 v2（框架无关纯函数，浏览器 / uni-app / Node 通用）
// 两层计分：
//   1) 维度层：选项给四维（社交/决策/节奏/行动）两极记分，得出用户画像与每只萌兽的对齐度（占 80 分）
//   2) 分支亲和层：每个选项携带 affinity，把选择导向具体萌兽（占 20 分，上限 5 点计分）
//      —— 同维度签名的萌兽（如柴犬/企鹅、熊猫/考拉）靠亲和层分流，这就是「分支选项」
// 输入: quiz(questions.json), animals(animals.json), answers: 选项 id 数组，如 ["A","C",...]
// 输出: { animal, matchPercent, dimensions, ranking }
export function computeResult(quiz, animals, answers) {
  if (!Array.isArray(answers) || answers.length !== quiz.questions.length) {
    throw new Error("answers length must equal number of questions");
  }
  const counts = {};   // dim -> pole -> 分数
  const lastPole = {}; // dim -> 最后一个触及该维度的选项极（平局裁定）
  const affinity = {}; // animalId -> 亲和点
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
  const dimensions = {};
  const userPoles = {};
  for (const d of quiz.dimensions) {
    const poles = Object.keys(d.poles);
    const total = poles.reduce((s, p) => s + (counts[d.id][p] || 0), 0);
    const percents = {};
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
  scored.sort((x, y) =>
    y.matchPercent - x.matchPercent || y.affinity - x.affinity || x.hamming - y.hamming || x.idx - y.idx
  );
  const top = scored[0];
  return {
    animal: top.animal,
    matchPercent: top.matchPercent,
    dimensions,
    ranking: scored.map((s) => ({ id: s.animal.id, matchPercent: s.matchPercent, affinity: s.affinity }))
  };
}
