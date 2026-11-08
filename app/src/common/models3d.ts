// 真 3D 萌兽模型（程序化建模，仅 H5 端调用）
// 用 three.js 几何体拼出立体模型：头、耳、鼻、尾、四肢都是独立部件，
// 招牌动作可以动真部件（摇尾巴、歪头、缩耳），不再是贴在卡片上的平面图。
// 目前提供 3 只样机：shiba / cat / panda；其余动物返回 null，走旧的立牌回退。
import * as THREE from "three";

export interface ProceduralModel {
  group: THREE.Group;
  head: THREE.Group;
  body: THREE.Mesh;
  tail: THREE.Group | null;
  earL: THREE.Object3D | null;
  earR: THREE.Object3D | null;
}

function mat(color: number, roughness = 0.62): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.02 });
}

function sph(
  r: number,
  color: number,
  x = 0,
  y = 0,
  z = 0,
  sx = 1,
  sy = 1,
  sz = 1,
  roughness = 0.62
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 24), mat(color, roughness));
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  return m;
}

function cone(
  r: number,
  h: number,
  color: number,
  x = 0,
  y = 0,
  z = 0,
  rz = 0
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 24), mat(color));
  m.position.set(x, y, z);
  m.rotation.z = rz;
  return m;
}

function capsule(
  r: number,
  len: number,
  color: number,
  x = 0,
  y = 0,
  z = 0,
  rz = 0,
  rx = 0
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 16), mat(color));
  m.position.set(x, y, z);
  m.rotation.z = rz;
  m.rotation.x = rx;
  return m;
}

function finish(
  group: THREE.Group,
  head: THREE.Group,
  body: THREE.Mesh,
  tail: THREE.Group | null = null,
  earL: THREE.Object3D | null = null,
  earR: THREE.Object3D | null = null
): ProceduralModel {
  return { group, head, body, tail, earL, earR };
}

const CREAM = 0xfff3e0;
const DARK = 0x3e2723;
const PINK = 0xf48fb1;

// ---- 元气柴犬：橘色身、奶油胸、卷尾、吐舌头 ----
function buildShiba(): ProceduralModel {
  const g = new THREE.Group();
  const orange = 0xe8913a;

  // 四肢
  for (const [x, z] of [[-0.28, 0.22], [0.28, 0.22], [-0.28, -0.22], [0.28, -0.22]] as const) {
    g.add(capsule(0.11, 0.16, CREAM, x, 0.18, z));
  }
  // 身体 + 奶油胸
  const body = sph(0.6, orange, 0, 0.72, 0, 1, 1.05, 0.92);
  g.add(body);
  g.add(sph(0.42, CREAM, 0, 0.62, 0.38, 0.85, 1, 0.55));

  // 头
  const head = new THREE.Group();
  head.position.set(0, 1.5, 0.05);
  head.add(sph(0.52, orange, 0, 0, 0, 1, 0.95, 0.95));
  const earL = cone(0.2, 0.42, orange, -0.3, 0.5, 0, 0.25);
  const earR = cone(0.2, 0.42, orange, 0.3, 0.5, 0, -0.25);
  head.add(earL, earR);
  head.add(cone(0.1, 0.2, PINK, -0.3, 0.48, 0.06, 0.25));
  head.add(cone(0.1, 0.2, PINK, 0.3, 0.48, 0.06, -0.25));
  head.add(sph(0.26, CREAM, 0, -0.08, 0.42, 1.15, 0.75, 0.9)); // 嘴筒
  head.add(sph(0.09, DARK, 0, 0.02, 0.62, 1.2, 0.8, 0.7)); // 鼻子
  head.add(sph(0.075, DARK, -0.2, 0.12, 0.45)); // 眼睛
  head.add(sph(0.075, DARK, 0.2, 0.12, 0.45));
  head.add(sph(0.09, PINK, 0, -0.28, 0.55, 1, 1.3, 0.4)); // 吐舌头
  head.add(sph(0.16, CREAM, 0, 0.3, 0.44, 0.55, 0.9, 0.3)); // 额头白斑
  g.add(head);

  // 卷尾：圆环一段，翘在背上
  const tail = new THREE.Group();
  tail.position.set(0, 0.98, -0.55);
  const curl = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.1, 12, 24, Math.PI * 1.4), mat(orange));
  curl.rotation.x = -0.5;
  curl.rotation.z = Math.PI * 0.75;
  tail.add(curl);
  g.add(tail);

  return finish(g, head, body, tail, earL, earR);
}

// ---- 高冷猫咪：橘猫、尖耳、半眯眼、长尾巴贴地 ----
function buildCat(): ProceduralModel {
  const g = new THREE.Group();
  const orange = 0xf0a13c;

  for (const [x, z] of [[-0.26, 0.2], [0.26, 0.2], [-0.26, -0.2], [0.26, -0.2]] as const) {
    g.add(capsule(0.1, 0.14, CREAM, x, 0.16, z));
  }
  const body = sph(0.55, orange, 0, 0.7, 0, 0.95, 1.1, 0.9);
  g.add(body);
  g.add(sph(0.38, CREAM, 0, 0.6, 0.36, 0.85, 1, 0.55));

  const head = new THREE.Group();
  head.position.set(0, 1.45, 0.05);
  head.add(sph(0.5, orange, 0, 0, 0, 1, 0.95, 0.95));
  const earL = cone(0.17, 0.55, orange, -0.28, 0.5, 0, 0.18);
  const earR = cone(0.17, 0.55, orange, 0.28, 0.5, 0, -0.18);
  head.add(earL, earR);
  head.add(cone(0.09, 0.28, PINK, -0.28, 0.48, 0.05, 0.18));
  head.add(cone(0.09, 0.28, PINK, 0.28, 0.48, 0.05, -0.18));
  // 额头三道虎斑
  for (const x of [-0.14, 0, 0.14]) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.03), mat(0xd97c1e, 0.7));
    stripe.position.set(x, 0.32, 0.42);
    stripe.rotation.x = -0.25;
    head.add(stripe);
  }
  head.add(sph(0.22, CREAM, 0, -0.12, 0.42, 1.2, 0.7, 0.85)); // 嘴筒
  head.add(sph(0.07, PINK, 0, -0.02, 0.6, 1.3, 0.8, 0.6)); // 粉鼻子
  // 半眯眼：压扁的黑眼睛，高冷感
  head.add(sph(0.08, DARK, -0.19, 0.1, 0.44, 1, 0.45, 0.6));
  head.add(sph(0.08, DARK, 0.19, 0.1, 0.44, 1, 0.45, 0.6));
  // 胡须：每侧三根细白线
  for (const side of [-1, 1] as const) {
    for (let i = 0; i < 3; i++) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.5, 6), mat(0xffffff, 0.4));
      w.position.set(side * 0.42, -0.06 + (i - 1) * 0.07, 0.45);
      w.rotation.z = Math.PI / 2 + side * (0.25 - i * 0.25);
      head.add(w);
    }
  }
  g.add(head);

  // 长尾巴：贴地弯向一侧，尾尖翘起
  const tail = new THREE.Group();
  tail.position.set(0, 0.3, -0.5);
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.2, 0.02, -0.12),
    new THREE.Vector3(0.48, 0.12, -0.18),
    new THREE.Vector3(0.62, 0.42, -0.1),
  ]);
  tail.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.08, 10), mat(orange)));
  g.add(tail);

  return finish(g, head, body, tail, earL, earR);
}

// ---- 佛系熊猫：白身黑耳黑眼圈，抱着一根竹子 ----
function buildPanda(): ProceduralModel {
  const g = new THREE.Group();
  const black = 0x212121;
  const white = 0xfafafa;

  // 腿 + 胳膊（黑）
  g.add(capsule(0.14, 0.14, black, -0.28, 0.16, 0.12));
  g.add(capsule(0.14, 0.14, black, 0.28, 0.16, 0.12));
  g.add(capsule(0.12, 0.3, black, -0.58, 0.72, 0.08, 0.5));
  g.add(capsule(0.12, 0.3, black, 0.58, 0.72, 0.08, -0.5));

  const body = sph(0.62, white, 0, 0.72, 0, 1, 1.05, 0.9);
  g.add(body);

  const head = new THREE.Group();
  head.position.set(0, 1.5, 0.05);
  head.add(sph(0.54, white, 0, 0, 0, 1, 0.95, 0.95));
  const earL = sph(0.2, black, -0.38, 0.38, -0.05, 1, 1, 0.6);
  const earR = sph(0.2, black, 0.38, 0.38, -0.05, 1, 1, 0.6);
  head.add(earL, earR);
  // 黑眼圈
  const patchL = sph(0.16, black, -0.2, 0.05, 0.42, 1, 1.35, 0.5);
  const patchR = sph(0.16, black, 0.2, 0.05, 0.42, 1, 1.35, 0.5);
  patchL.rotation.z = 0.25;
  patchR.rotation.z = -0.25;
  head.add(patchL, patchR);
  head.add(sph(0.06, DARK, -0.2, 0.08, 0.55));
  head.add(sph(0.06, DARK, 0.2, 0.08, 0.55));
  head.add(sph(0.08, DARK, 0, -0.12, 0.5, 1.3, 0.9, 0.7)); // 鼻子
  g.add(head);

  // 一根小竹子抱在身前
  const bamboo = new THREE.Group();
  bamboo.position.set(0.42, 0.72, 0.38);
  bamboo.rotation.z = -0.35;
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.85, 12), mat(0x43a047, 0.55));
  bamboo.add(stalk);
  bamboo.add(sph(0.12, 0x66bb6a, 0, 0.45, 0.03, 1.6, 0.5, 0.4));
  bamboo.add(sph(0.1, 0x66bb6a, 0, 0.3, -0.04, 1.4, 0.5, 0.4));
  g.add(bamboo);

  return finish(g, head, body, null, earL, earR);
}

export function buildProceduralModel(animalId: string): ProceduralModel | null {
  switch (animalId) {
    case "shiba":
      return buildShiba();
    case "cat":
      return buildCat();
    case "panda":
      return buildPanda();
    default:
      return null;
  }
}

// ---- 部件级招牌动作：整体位移仍由 stage3d 的 SIGNATURES 表驱动，
// 这里只动真部件（尾巴摇、头歪、耳朵动、身体呼吸）----
export function animateModelParts(model: ProceduralModel, animalId: string, t: number): void {
  if (animalId === "shiba") {
    if (model.tail) model.tail.rotation.y = Math.sin(t * 3.2) * 0.35;
    if (model.earL) model.earL.rotation.x = Math.sin(t * 2.4) * 0.08;
    if (model.earR) model.earR.rotation.x = Math.sin(t * 2.4 + 0.6) * 0.08;
    model.head.rotation.z = Math.sin(t * 1.1) * 0.04;
  } else if (animalId === "cat") {
    // 偶尔不屑歪头 + 尾巴慢摇
    const ph = ((t % 7) + 7) % 7 / 7;
    const glance = ph > 0.5 && ph < 0.62 ? Math.sin(((ph - 0.5) / 0.12) * Math.PI) * 0.13 : 0;
    model.head.rotation.z = Math.sin(t * 0.5) * 0.045 + glance;
    if (model.tail) model.tail.rotation.y = Math.sin(t * 0.9) * 0.25;
  } else if (animalId === "panda") {
    // 呼吸 + 慢点头
    const s = 1 + Math.sin(t * 0.8) * 0.02;
    model.body.scale.set(s, s, 1);
    model.head.rotation.x = Math.sin(t * 0.4) * 0.05;
    if (model.earL) model.earL.rotation.z = Math.sin(t * 0.8) * 0.06;
    if (model.earR) model.earR.rotation.z = -Math.sin(t * 0.8) * 0.06;
  }
}
