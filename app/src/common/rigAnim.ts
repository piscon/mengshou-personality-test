// 骨骼动画引擎（three.js，仅 H5 端调用）：给图生 3D + 自动绑骨（UniRig 等）产出的
// 带骨骼 GLB 提供程序化待机动作，不依赖预烘焙动画片段。
//
// 用法（stage3d.ts 已接入）：
//   const bones = discoverRigBones(gltf.scene);       // 发现 + 按名字分类骨骼
//   console.log(bones.names, bones);                  // 语义名对不上时先看全名单
//   const idle = createRigIdle(bones, SHIBA_IDLE_PRESET);
// 骨骼名无语义（如 UniRig 的 bone_0..bone_13）时改用显式映射：
//   const bones = createMappedRigBones(gltf.scene, SHIBA_RIG_BONE_SPEC);
//   // 每帧：const f = idle.update(clock.elapsedTime);
//   //        wrap.position.y = baseY + f.rootY; wrap.scale.set(f.scaleX, f.scaleY, f.scaleZ);
//   //        （骨骼姿态由 update 内部直接写到骨骼上，根节点偏移/缩放由调用方应用）
//   idle.triggerHop();                                // 点按时触发一次蹦跳（根运动，坐姿可用）
//
// 分类只认语义命名（head / tail / ear_l 等，不区分大小写）；UniRig 若产出
// joint_12、bone_3 这类无语义名，这里不硬猜位置，对应分类为空，
// 实际骨骼全名单在 RigBones.names 里，调用方据此再决定映射。
import * as THREE from "three";

// ================= 骨骼发现与分类 =================

export interface RigBones {
  /** 实际找到的全部骨骼（去重后，按遍历顺序） */
  all: THREE.Bone[];
  /** 全部骨骼名（与 all 一一对应，保留原始大小写） */
  names: string[];
  head: THREE.Bone | null;
  neck: THREE.Bone | null;
  /** 脊柱链最靠根部的一节（spine / torso / pelvis / hips 兜底） */
  spine: THREE.Bone | null;
  /** 胸腔一节（chest / 第二节 spine）；呼吸主要动它，没有则与 spine 相同或为 null */
  chest: THREE.Bone | null;
  /** 左耳骨链，根→尖排序；无侧别信息时为空，看 earAll */
  earL: THREE.Bone[];
  /** 右耳骨链，根→尖排序 */
  earR: THREE.Bone[];
  /** 全部耳朵骨（不分侧），链序为深度优先的根→尖 */
  earAll: THREE.Bone[];
  /** 尾巴骨链，根→尖排序 */
  tail: THREE.Bone[];
  armL: THREE.Bone | null;
  armR: THREE.Bone | null;
  legL: THREE.Bone | null;
  legR: THREE.Bone | null;
}

type Side = "L" | "R";

function depthOf(o: THREE.Object3D): number {
  let d = 0;
  let p = o.parent;
  while (p) {
    d++;
    p = p.parent;
  }
  return d;
}

function numSuffix(name: string): number {
  const m = name.match(/(\d+)\D*$/);
  return m ? parseInt(m[1], 10) : -1;
}

/** 骨链排序：先按层级深度（根在前），同深度按名字里的数字后缀 */
function chainSort(a: THREE.Bone, b: THREE.Bone): number {
  const dd = depthOf(a) - depthOf(b);
  if (dd !== 0) return dd;
  return numSuffix(a.name.toLowerCase()) - numSuffix(b.name.toLowerCase());
}

/** 从骨骼名判断左右：认 left/right 全词与 _l / .r / l_ 等分隔符令牌，不认尾随单字母（防 tail 误判） */
function sideOf(name: string): Side | null {
  if (/left/.test(name)) return "L";
  if (/right/.test(name)) return "R";
  const tokens = name.split(/[._\- ]+/);
  if (tokens.includes("l")) return "L";
  if (tokens.includes("r")) return "R";
  return null;
}

function pickRootMost(cands: THREE.Bone[]): THREE.Bone | null {
  if (!cands.length) return null;
  return [...cands].sort(chainSort)[0];
}

function pickSideRoot(cands: THREE.Bone[], side: Side): THREE.Bone | null {
  return pickRootMost(cands.filter((b) => sideOf(b.name.toLowerCase()) === side));
}

/** 收集场景里全部骨骼：所有 SkinnedMesh 的 skeleton + 场景图中的 Bone 节点，去重 */
function collectRigBones(root: THREE.Object3D): THREE.Bone[] {
  const byUuid = new Map<string, THREE.Bone>();
  const collect = (b: THREE.Bone) => {
    if (!byUuid.has(b.uuid)) byUuid.set(b.uuid, b);
  };
  root.traverse((o) => {
    const sm = o as THREE.SkinnedMesh;
    if (sm.isSkinnedMesh && sm.skeleton) sm.skeleton.bones.forEach(collect);
    if ((o as THREE.Bone).isBone) collect(o as THREE.Bone);
  });
  return [...byUuid.values()];
}

/**
 * 遍历 GLB 场景里所有 SkinnedMesh 的 skeleton（并兜底收集场景图中的 Bone 节点），
 * 去重后按骨骼名做模糊语义分类。分类规则（对小写名做正则，先匹配先得）：
 * ear → tail → fore/front leg(作 arm) → arm/shoulder/elbow/wrist/hand →
 * leg/thigh/shin/knee/ankle/foot → chest → spine/torso → pelvis/hips/root →
 * neck → head（跳过 headtop/end 类末端骨）。
 */
export function discoverRigBones(root: THREE.Object3D): RigBones {
  const all = collectRigBones(root);

  const ear: THREE.Bone[] = [];
  const tail: THREE.Bone[] = [];
  const arm: THREE.Bone[] = [];
  const leg: THREE.Bone[] = [];
  const chestC: THREE.Bone[] = [];
  const spineC: THREE.Bone[] = [];
  const pelvisC: THREE.Bone[] = [];
  const neckC: THREE.Bone[] = [];
  const headC: THREE.Bone[] = [];

  for (const b of all) {
    const n = b.name.toLowerCase();
    if (/ear/.test(n)) ear.push(b);
    else if (/tail/.test(n)) tail.push(b);
    else if (/fore_?leg|front_?leg|foreleg|frontleg/.test(n)) arm.push(b);
    else if (/arm|shoulder|elbow|wrist|hand|forearm/.test(n)) arm.push(b);
    else if (/leg|thigh|shin|knee|ankle|foot|toe|paw|hind/.test(n)) leg.push(b);
    else if (/chest/.test(n)) chestC.push(b);
    else if (/spine|torso/.test(n)) spineC.push(b);
    else if (/pelvis|hips?|root/.test(n)) pelvisC.push(b);
    else if (/neck/.test(n)) neckC.push(b);
    else if (/head/.test(n) && !/end|top|target/.test(n)) headC.push(b);
  }

  const spineChain = [...spineC].sort(chainSort);
  const spine = pickRootMost([...spineC, ...pelvisC]);
  const chest = chestC.length
    ? pickRootMost(chestC)
    : spineChain.length > 1
      ? spineChain[1]
      : spine;

  const earSorted = [...ear].sort(chainSort);
  const earL = earSorted.filter((b) => sideOf(b.name.toLowerCase()) === "L");
  const earR = earSorted.filter((b) => sideOf(b.name.toLowerCase()) === "R");

  return {
    all,
    names: all.map((b) => b.name),
    head: pickRootMost(headC),
    neck: pickRootMost(neckC),
    spine,
    chest,
    earL,
    earR,
    earAll: earSorted,
    tail: [...tail].sort(chainSort),
    armL: pickSideRoot(arm, "L"),
    armR: pickSideRoot(arm, "R"),
    legL: pickSideRoot(leg, "L"),
    legR: pickSideRoot(leg, "R"),
  };
}

// ================= 显式骨骼映射（骨骼名无语义时使用） =================

export interface RigBoneSpec {
  spine?: string;
  chest?: string;
  neck?: string;
  head?: string;
  /** 尾巴骨链的骨骼名列表（根→尖） */
  tail?: string[];
  /** 一对耳朵的骨骼名：左右不写死，按加载后骨骼世界坐标 x 符号运行时判定 */
  earPair?: [string, string];
  /** 显式左右耳链（给了就不用 earPair） */
  earL?: string[];
  earR?: string[];
  earAll?: string[];
}

/**
 * 柴犬 UniRig 骨骼映射（本地解析 shiba_rigged_web.glb 实测）：
 * bone_0=脊柱根，bone_5=头骨，bone_6/bone_8=左右耳，bone_7=尾巴（单根）；
 * bone_1-4 后腿、bone_9-12 前腿本期不驱动，bone_13 疑似冗余骨——都不映射，保持静止。
 */
export const SHIBA_RIG_BONE_SPEC: RigBoneSpec = {
  spine: "bone_0",
  head: "bone_5",
  tail: ["bone_7"],
  earPair: ["bone_6", "bone_8"],
};

/**
 * 按骨骼名规格显式构建 RigBones（给 bone_0 这类无语义命名的骨架用）。
 * earPair 的左右判定：更新世界矩阵后取两根耳骨的世界坐标 x，
 * 模型正面朝 +Z 时角色自身左侧位于 +X，故 x 大者记为左耳（仅影响两侧摆动的镜像方向）。
 * 规格里找不到的骨骼一律留空，绝不猜测。
 */
export function createMappedRigBones(root: THREE.Object3D, spec: RigBoneSpec): RigBones {
  const all = collectRigBones(root);
  const byName = new Map<string, THREE.Bone>();
  for (const b of all) if (!byName.has(b.name)) byName.set(b.name, b);
  const find = (name?: string): THREE.Bone | null => (name ? (byName.get(name) ?? null) : null);
  const chain = (names?: string[]): THREE.Bone[] =>
    (names ?? []).map((n) => byName.get(n)).filter((b): b is THREE.Bone => !!b);

  const spine = find(spec.spine);
  const chest = find(spec.chest) ?? spine;

  let earL = chain(spec.earL);
  let earR = chain(spec.earR);
  let earAll = chain(spec.earAll);
  if (spec.earPair && earL.length === 0 && earR.length === 0 && earAll.length === 0) {
    const pair = chain(spec.earPair);
    if (pair.length === 2) {
      root.updateWorldMatrix(true, true);
      const xa = pair[0].getWorldPosition(new THREE.Vector3()).x;
      const xb = pair[1].getWorldPosition(new THREE.Vector3()).x;
      if (xa >= xb) {
        earL = [pair[0]];
        earR = [pair[1]];
      } else {
        earL = [pair[1]];
        earR = [pair[0]];
      }
    } else if (pair.length === 1) {
      earAll = pair; // 只找到一根就不分侧
    }
  }
  if (earAll.length === 0) earAll = [...earL, ...earR].sort(chainSort);

  return {
    all,
    names: all.map((b) => b.name),
    head: find(spec.head),
    neck: find(spec.neck),
    spine,
    chest,
    earL,
    earR,
    earAll,
    tail: chain(spec.tail),
    armL: null,
    armR: null,
    legL: null,
    legR: null,
  };
}

// ================= 程序化待机动画 =================

export interface RigIdleOptions {
  /** 呼吸频率 Hz，默认 0.25 */
  breathRate?: number;
  /** 呼吸时胸腔骨俯仰幅度（弧度），默认约 2° */
  breathAngle?: number;
  /** 呼吸时整体缩放幅度，默认 0.015（即 1±0.015） */
  breathScale?: number;
  /** 头部歪头（roll）幅度（弧度），默认约 8° */
  headTiltAngle?: number;
  /** 头部环顾（yaw）幅度（弧度），默认约 10° */
  headYawAngle?: number;
  /** 耳朵慢摆幅度（弧度），默认约 8° */
  earWagAngle?: number;
  /** 耳朵慢摆角速度（rad/s），默认 1.6 */
  earWagSpeed?: number;
  /** 耳朵颤动间隔下限/上限（秒），默认 3–7 秒随机一次 */
  earTwitchMinGap?: number;
  earTwitchMaxGap?: number;
  /** 尾巴每节摇摆幅度（弧度），默认约 12° */
  tailWagAngle?: number;
  /** 尾巴摇摆角速度（rad/s），越大摇得越欢，默认 5.0 */
  tailWagSpeed?: number;
  /** 尾链逐节相位延迟（弧度），默认 0.55 */
  tailPhaseStep?: number;
  /** 尾巴摇摆轴："x" | "y" | "z"，默认 "y"（左右摆） */
  tailAxis?: "x" | "y" | "z";
  /** 蹦跳高度（模型根节点单位），默认 0.18 */
  hopHeight?: number;
  /** 一次蹦跳时长（秒），默认 0.55 */
  hopDuration?: number;
  /**
   * 尾巴根头部补偿：当尾巴根的父链包含头骨时，每帧把头骨增量旋转的逆
   * 施加到尾巴根（朝向与位置都补），抵消头动时尾巴被连带甩动。默认 false。
   */
  enableTailHeadCompensation?: boolean;
}

/** 柴犬预设：卷尾慢摇、耳朵机灵、呼吸平稳 */
export const SHIBA_IDLE_PRESET: RigIdleOptions = {
  breathRate: 0.25,
  breathAngle: 0.035,
  breathScale: 0.015,
  headTiltAngle: 0.14,
  headYawAngle: 0.17,
  earWagAngle: 0.14,
  earWagSpeed: 1.6,
  earTwitchMinGap: 3,
  earTwitchMaxGap: 7,
  tailWagAngle: 0.16,
  tailWagSpeed: 4.2,
  tailPhaseStep: 0.55,
  tailAxis: "y",
  hopHeight: 0.18,
  hopDuration: 0.55,
  // 柴犬骨架中尾巴根 bone_7 的父骨正是头骨 bone_5，必须开补偿
  enableTailHeadCompensation: true,
};

export interface RigFrame {
  /** 调用方应叠加到模型根节点的 y 偏移（蹦跳根运动） */
  rootY: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  hopping: boolean;
}

export interface RigIdle {
  readonly bones: RigBones;
  /** 每帧调用：骨骼姿态直接写好，返回根节点偏移/缩放给调用方应用 */
  update: (elapsedSec: number) => RigFrame;
  /** 触发一次蹦跳（进行中重复调用会被忽略） */
  triggerHop: () => void;
  /** 把所有受控骨骼恢复到静止姿态并清掉蹦跳状态 */
  reset: () => void;
}

/** 多正弦叠加的伪噪声，输出约 [-1, 1]，比单一正弦更不机械 */
function wobble(t: number, seed: number): number {
  return (
    (Math.sin(t * 0.37 + seed) +
      0.6 * Math.sin(t * 0.83 + seed * 1.7 + 1.3) +
      0.4 * Math.sin(t * 1.97 + seed * 3.1 + 4.1)) /
    2
  );
}

export function createRigIdle(bones: RigBones, opts: RigIdleOptions = {}): RigIdle {
  const o: Required<RigIdleOptions> = {
    breathRate: opts.breathRate ?? 0.25,
    breathAngle: opts.breathAngle ?? 0.035,
    breathScale: opts.breathScale ?? 0.015,
    headTiltAngle: opts.headTiltAngle ?? 0.14,
    headYawAngle: opts.headYawAngle ?? 0.17,
    earWagAngle: opts.earWagAngle ?? 0.14,
    earWagSpeed: opts.earWagSpeed ?? 1.6,
    earTwitchMinGap: opts.earTwitchMinGap ?? 3,
    earTwitchMaxGap: opts.earTwitchMaxGap ?? 7,
    tailWagAngle: opts.tailWagAngle ?? 0.21,
    tailWagSpeed: opts.tailWagSpeed ?? 5.0,
    tailPhaseStep: opts.tailPhaseStep ?? 0.55,
    tailAxis: opts.tailAxis ?? "y",
    hopHeight: opts.hopHeight ?? 0.18,
    hopDuration: opts.hopDuration ?? 0.55,
    enableTailHeadCompensation: opts.enableTailHeadCompensation ?? false,
  };

  // 受控骨骼集合：去重后保存各自的静止姿态
  const managed = new Map<string, { bone: THREE.Bone; rest: THREE.Quaternion }>();
  const manage = (b: THREE.Bone | null | undefined) => {
    if (b && !managed.has(b.uuid)) {
      managed.set(b.uuid, { bone: b, rest: b.quaternion.clone() });
    }
  };
  manage(bones.head);
  manage(bones.neck);
  manage(bones.spine);
  manage(bones.chest);
  bones.earAll.forEach(manage);
  bones.tail.forEach(manage);

  const tmpE = new THREE.Euler();
  const tmpQ = new THREE.Quaternion();
  function applyDelta(bone: THREE.Bone, rx: number, ry: number, rz: number) {
    const m = managed.get(bone.uuid);
    if (!m) return;
    tmpE.set(rx, ry, rz);
    tmpQ.setFromEuler(tmpE);
    bone.quaternion.copy(m.rest).multiply(tmpQ);
  }

  // ---- 尾巴根头部补偿的准备 ----
  // UniRig 柴犬骨架里尾巴根（bone_7）的父骨是头骨（bone_5）：头骨转一点，
  // 尾巴根的位置和朝向都会被连带甩动。补偿做法：每帧取头骨本帧增量旋转 d，
  // 尾巴根姿态改为 q = d⁻¹·rest·(摇尾增量)、位置改为 p = d⁻¹·(静止位置)，
  // 这样尾巴根的世界姿态恰好与「头没动过」时一致，再叠加它自己的摇尾。
  const tailRoot = bones.tail.length ? bones.tail[0] : null;
  let tailHeadComp = false;
  let tailRestPos: THREE.Vector3 | null = null;
  if (o.enableTailHeadCompensation && tailRoot && bones.head) {
    let p: THREE.Object3D | null = tailRoot.parent;
    while (p) {
      if (p === bones.head) {
        tailHeadComp = true;
        break;
      }
      p = p.parent;
    }
    if (tailHeadComp) tailRestPos = tailRoot.position.clone();
  }
  const headDeltaQ = new THREE.Quaternion();
  const headDeltaInv = new THREE.Quaternion();
  const headEuler = new THREE.Euler();

  // 耳朵颤动状态：nextTwitch 是下一次触发的时刻，twitchStart 是本次开始时刻（-1 表示未在颤动）
  let twitchStart = -1;
  let nextTwitch = 2 + Math.random() * 3;
  const TWITCH_DUR = 0.5;
  // 蹦跳状态
  let hopStart: number | null = null;
  let hopPending = false;

  function update(t: number): RigFrame {
    headDeltaQ.identity();
    // ---- 呼吸 ----
    const breath = Math.sin(t * Math.PI * 2 * o.breathRate);
    const breathBone = bones.chest ?? bones.spine;
    if (breathBone) applyDelta(breathBone, o.breathAngle * breath, 0, 0);
    if (bones.neck && bones.neck !== breathBone) {
      applyDelta(bones.neck, -o.breathAngle * 0.4 * breath, 0, 0);
    }

    // ---- 头部：缓慢歪头 + 环顾（伪噪声驱动），脖子跟随四成 ----
    if (bones.head) {
      const tilt = o.headTiltAngle * wobble(t, 0.7);
      const yaw = o.headYawAngle * wobble(t, 2.9);
      const pitch = o.headTiltAngle * 0.45 * wobble(t, 5.3);
      applyDelta(bones.head, pitch, yaw, tilt);
      // 记录本帧头骨增量旋转，供尾巴根补偿用（与 applyDelta 内部构造的增量一致）
      headEuler.set(pitch, yaw, tilt);
      headDeltaQ.setFromEuler(headEuler);
      if (bones.neck && bones.neck !== breathBone) {
        const prev = bones.neck;
        // 在呼吸姿态之上再叠加头部跟随：直接以当前四元数为基准追加
        tmpE.set(pitch * 0.4, yaw * 0.4, tilt * 0.4);
        tmpQ.setFromEuler(tmpE);
        prev.quaternion.multiply(tmpQ);
      }
    }

    // ---- 耳朵：基底慢摆 + 随机短促颤动 ----
    if (t >= nextTwitch) {
      twitchStart = t;
      nextTwitch = t + o.earTwitchMinGap + Math.random() * Math.max(0.1, o.earTwitchMaxGap - o.earTwitchMinGap);
    }
    let flutter = 0;
    if (twitchStart >= 0) {
      const p = (t - twitchStart) / TWITCH_DUR;
      if (p >= 1) twitchStart = -1;
      else flutter = Math.sin(p * Math.PI) * Math.sin((t - twitchStart) * Math.PI * 2 * 16) * o.earWagAngle * 1.6;
    }
    const earGroups: THREE.Bone[][] = [];
    if (bones.earL.length || bones.earR.length) {
      if (bones.earL.length) earGroups.push(bones.earL);
      if (bones.earR.length) earGroups.push(bones.earR);
    } else if (bones.earAll.length) {
      earGroups.push(bones.earAll);
    }
    earGroups.forEach((chain, gi) => {
      const dirSign = gi === 0 ? 1 : -1; // 两侧耳朵外张方向相反
      chain.forEach((bone, i) => {
        const wag = Math.sin(t * o.earWagSpeed - i * 0.6) * o.earWagAngle * (1 - i * 0.18);
        applyDelta(bone, 0, 0, dirSign * wag + (i === 0 ? dirSign * flutter : 0));
      });
    });

    // ---- 尾巴：逐节相位延迟的正弦摇摆 ----
    bones.tail.forEach((bone, i) => {
      const ang = o.tailWagAngle * Math.sin(t * o.tailWagSpeed - i * o.tailPhaseStep) * (1 + i * 0.12);
      if (o.tailAxis === "x") applyDelta(bone, ang, 0, 0);
      else if (o.tailAxis === "z") applyDelta(bone, 0, 0, ang);
      else applyDelta(bone, 0, ang, 0);
      if (tailHeadComp && i === 0 && tailRestPos) {
        // applyDelta 已写好 q = rest·摇尾增量；再左乘头增量的逆（q = d⁻¹·rest·摇尾增量），
        // 并把静止位置按同一逆旋转，尾巴根的世界位置与朝向即不再被头骨连带。
        headDeltaInv.copy(headDeltaQ).invert();
        bone.quaternion.premultiply(headDeltaInv);
        bone.position.copy(tailRestPos).applyQuaternion(headDeltaInv);
      }
    });

    // ---- 蹦跳（根运动）+ 呼吸缩放合成 ----
    if (hopPending && hopStart === null) {
      hopStart = t;
      hopPending = false;
    }
    let rootY = 0;
    let hopSX = 1;
    let hopSY = 1;
    let hopping = false;
    if (hopStart !== null) {
      const p = (t - hopStart) / o.hopDuration;
      if (p >= 1) {
        hopStart = null;
      } else {
        hopping = true;
        rootY = o.hopHeight * Math.sin(p * Math.PI);
        // 起跳/落地瞬间压扁（cos 的两端），腾空时拉长
        hopSY = 1 - 0.05 * Math.cos(p * Math.PI * 2);
        hopSX = 1 + 0.03 * Math.cos(p * Math.PI * 2);
      }
    }
    const bs = 1 + o.breathScale * breath;
    return {
      rootY,
      scaleX: bs * hopSX,
      scaleY: bs * hopSY,
      scaleZ: bs * hopSX,
      hopping,
    };
  }

  return {
    bones,
    update,
    triggerHop() {
      if (hopStart === null) hopPending = true;
    },
    reset() {
      managed.forEach(({ bone, rest }) => bone.quaternion.copy(rest));
      if (tailHeadComp && tailRoot && tailRestPos) tailRoot.position.copy(tailRestPos);
      hopStart = null;
      hopPending = false;
      twitchStart = -1;
    },
  };
}
