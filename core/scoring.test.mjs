import { readFileSync } from "node:fs";
import { computeResult } from "./scoring.js";
const quiz = JSON.parse(readFileSync(new URL("../data/questions.json", import.meta.url)));
const animals = JSON.parse(readFileSync(new URL("../data/animals.json", import.meta.url)));

// 为某只萌兽生成「最像它」的答案：维度极匹配 +2，亲和命中 +3/点
function archetypeAnswers(target) {
  return quiz.questions.map((q) => {
    let best = null, bestScore = -Infinity;
    for (const opt of q.options) {
      let s = 0;
      for (const [dim, pole] of Object.entries(opt.scores)) {
        if (target.signature[dim] === pole) s += 2;
      }
      if (opt.affinity && opt.affinity[target.id]) s += 3 * opt.affinity[target.id];
      if (s > bestScore) { bestScore = s; best = opt; }
    }
    return best.id;
  });
}

// 1) 全画像测试：每一只萌兽的典型答案都必须测出它自己
let failed = 0;
for (const a of animals.animals) {
  const got = computeResult(quiz, animals, archetypeAnswers(a)).animal.id;
  if (got !== a.id) { failed++; console.log(`ARCHETYPE FAIL: target=${a.id} got=${got}`); }
}
console.assert(failed === 0, failed + " archetype cases failed");
console.log(`archetype cases: ${animals.animals.length - failed}/${animals.animals.length} passed`);

// 2) 极端答案健壮性（全 A / 全 B / 全 C / 全 D 不崩溃）
for (const letter of ["A", "B", "C", "D"]) {
  computeResult(quiz, animals, Array(quiz.questions.length).fill(letter));
}

// 3) 随机分布：2000 次随机作答，可达萌兽种类与百分比合法性
const seen = {};
for (let i = 0; i < 2000; i++) {
  const ans = quiz.questions.map((q) => q.options[Math.floor(Math.random() * q.options.length)].id);
  const r = computeResult(quiz, animals, ans);
  if (!(r.matchPercent >= 0 && r.matchPercent <= 100)) throw new Error("bad percent");
  seen[r.animal.id] = (seen[r.animal.id] || 0) + 1;
}
console.log("distribution over 2000 random runs:", JSON.stringify(seen));
console.assert(Object.keys(seen).length >= 12, "too few animals reachable: " + Object.keys(seen).length);
console.log("ALL SCORING TESTS PASSED");
