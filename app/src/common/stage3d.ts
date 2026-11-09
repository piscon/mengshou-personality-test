// 3D 萌兽展示台（three.js，仅 H5 端调用；小程序端页面走静态图回退）
// 场景：有程序化真 3D 模型的动物（见 models3d.ts）直接立模型在主题色展台上；
// 其余动物仍用定版插画贴在带厚度的圆角立牌上回退。支持按住拖拽旋转/俯仰，
// 松手 2.5 秒后自动转台，带浮尘粒子和柔和投影。
import * as THREE from "three";
import { buildProceduralModel, animateModelParts, type ProceduralModel } from "./models3d";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { hasGlbModel, loadGlbBytes } from "./glbModels";

export interface StageOptions {
  image: string;
  color: string;
  animalId: string;
}

// ---- 每只萌兽的招牌动作：返回立牌在时刻 t 的姿态偏移（循环播放）----
interface CardOffset {
  y: number;
  rx: number;
  ry: number;
  rz: number;
  sx: number;
  sy: number;
}
const ID: CardOffset = { y: 0, rx: 0, ry: 0, rz: 0, sx: 1, sy: 1 };
function cyc(t: number, period: number): number {
  return ((t % period) + period) % period / period;
}
function bump(x: number): number {
  return Math.sin(Math.min(Math.max(x, 0), 1) * Math.PI);
}
function ease(x: number): number {
  const v = Math.min(Math.max(x, 0), 1);
  return v * v * (3 - 2 * v);
}

const SIGNATURES: Record<string, (t: number) => CardOffset> = {
  // 元气柴犬：不停小蹦跳，落地微微压扁
  shiba: (t) => {
    const hop = Math.pow(Math.abs(Math.sin(t * 2.4)), 1.4);
    const squash = Math.pow(Math.abs(Math.cos(t * 2.4)), 6);
    return { ...ID, y: hop * 0.17, rz: Math.sin(t * 2.4) * 0.03, sx: 1 + squash * 0.03, sy: 1 - squash * 0.05 };
  },
  // 高冷猫咪：几乎不动，慢摇尾巴似的轻晃，偶尔不屑地一歪头
  cat: (t) => {
    const ph = cyc(t, 7);
    const glance = ph > 0.5 && ph < 0.62 ? bump((ph - 0.5) / 0.12) * 0.13 : 0;
    return { ...ID, rz: Math.sin(t * 0.5) * 0.045 + glance, rx: Math.sin(t * 0.33) * 0.03, y: Math.sin(t * 0.8) * 0.012 };
  },
  // 温柔兔子：轻轻连跳两下再歇一歇
  rabbit: (t) => {
    const ph = cyc(t, 2.6);
    let y = 0;
    if (ph < 0.18) y = bump(ph / 0.18) * 0.1;
    else if (ph > 0.24 && ph < 0.42) y = bump((ph - 0.24) / 0.18) * 0.1;
    return { ...ID, y, rz: Math.sin(t * 1.2) * 0.015 };
  },
  // 快乐水獭：每 5 秒开心地原地转一圈
  otter: (t) => {
    const ph = cyc(t, 5);
    const spin = ph < 0.22 ? ease(ph / 0.22) * Math.PI * 2 : 0;
    const y = ph < 0.22 ? bump(ph / 0.22) * 0.09 : Math.sin(t * 1.4) * 0.02;
    return { ...ID, y, ry: spin };
  },
  // 佛系熊猫：只有呼吸和慢悠悠点头
  panda: (t) => {
    const s = 1 + Math.sin(t * 0.8) * 0.02;
    return { ...ID, sx: s, sy: s, rx: Math.sin(t * 0.4) * 0.045, y: Math.sin(t * 0.8) * 0.01 };
  },
  // 机灵狐狸：左右探头探脑，坏笑式摇晃
  fox: (t) => ({ ...ID, rz: Math.sin(t * 1.1) * 0.085, ry: Math.sin(t * 0.9) * 0.2, y: Math.sin(t * 2.2) * 0.015 }),
  // 囤囤仓鼠：一阵一阵快速啃东西，腮帮子鼓鼓
  hamster: (t) => {
    const gate = cyc(t, 3) < 0.45 ? 1 : 0.25;
    return {
      ...ID,
      rx: Math.sin(t * 22) * 0.028 * gate,
      sx: 1 + (0.018 + 0.014 * Math.sin(t * 7)) * gate,
      sy: 1 + Math.sin(t * 1.8) * 0.008,
    };
  },
  // 灵气小鹿：左右轮流歪头杀，脚步轻轻
  deer: (t) => {
    const ph = cyc(t, 6);
    let rz = 0;
    if (ph < 0.3) rz = bump(ph / 0.3) * 0.15;
    else if (ph > 0.5 && ph < 0.8) rz = -bump((ph - 0.5) / 0.3) * 0.15;
    return { ...ID, rz, y: Math.abs(Math.sin(t * 1.4)) * 0.03 };
  },
  // 小老虎：先压低蓄势，再猛地扑起来
  tiger: (t) => {
    const ph = cyc(t, 3.4);
    if (ph < 0.4) {
      const b = bump(ph / 0.4);
      return { ...ID, sy: 1 - b * 0.1, sx: 1 + b * 0.04, rx: b * 0.1, y: -b * 0.03 };
    }
    if (ph < 0.62) {
      const b = bump((ph - 0.4) / 0.22);
      return { ...ID, y: b * 0.3, rx: -b * 0.13 };
    }
    return { ...ID, y: Math.sin(t * 2) * 0.012 };
  },
  // 快乐小猪：左右扭扭，开心小跳
  pig: (t) => ({ ...ID, rz: Math.sin(t * 5.2) * 0.07, y: Math.abs(Math.sin(t * 2.6)) * 0.06, sx: 1 + Math.sin(t * 5.2) * 0.015 }),
  // 稳稳小象：慢而沉地左右摇摆
  elephant: (t) => ({ ...ID, rz: Math.sin(t * 0.55) * 0.07, y: Math.abs(Math.sin(t * 0.55)) * 0.015, rx: Math.sin(t * 0.275) * 0.02 }),
  // 聪明海豚：周期性跃出水面画一道弧线
  dolphin: (t) => {
    const ph = cyc(t, 3.2);
    if (ph < 0.5) {
      const x = ph / 0.5;
      return { ...ID, y: bump(x) * 0.34, rx: -Math.sin(x * Math.PI) * 0.45 + 0.08 };
    }
    return { ...ID, y: Math.sin(t * 1.5) * 0.02 };
  },
  // 机灵小猴：上蹿下跳，偶尔翻个跟头（转圈）
  monkey: (t) => {
    const ph = cyc(t, 6.5);
    const spin = ph < 0.16 ? ease(ph / 0.16) * Math.PI * 2 : 0;
    return { ...ID, y: Math.abs(Math.sin(t * 3.1)) * 0.2, rz: Math.sin(t * 3.1) * 0.11, ry: spin };
  },
  // 软乎乎刺猬：害羞地缩成一团，过会儿又探出来
  hedgehog: (t) => {
    const ph = cyc(t, 4.5);
    const b = ph > 0.45 && ph < 0.75 ? bump((ph - 0.45) / 0.3) : 0;
    const s = 1 - b * 0.13;
    return { ...ID, sx: s, sy: s, rx: b * 0.16, y: -b * 0.05 };
  },
  // 夜行猫头鹰：阶梯式歪头打量，目光锁定
  owl: (t) => ({
    ...ID,
    rz: Math.tanh(Math.sin(t * 1.256) * 2.2) * 0.16,
    ry: Math.tanh(Math.sin(t * 0.628 + 1) * 2) * 0.2,
    y: Math.sin(t * 0.9) * 0.01,
  }),
  // 慢悠悠乌龟：一切动作都放慢四倍
  turtle: (t) => ({ ...ID, rz: Math.sin(t * 0.32) * 0.05, rx: Math.sin(t * 0.21) * 0.045, y: Math.sin(t * 0.32) * 0.012 }),
  // 团团企鹅：经典企鹅摇摆步
  penguin: (t) => ({ ...ID, rz: Math.sin(t * 2.6) * 0.13, y: Math.abs(Math.sin(t * 2.6)) * 0.045, ry: Math.sin(t * 1.3) * 0.08 }),
  // 抱树考拉：呼吸都带着睡意，周期性打盹点头
  koala: (t) => {
    const s = 1 + Math.sin(t * 0.9) * 0.015;
    const ph = cyc(t, 5.5);
    const nod = ph > 0.55 && ph < 0.8 ? bump((ph - 0.55) / 0.25) * 0.22 : 0;
    return { ...ID, sx: s, sy: s, rx: nod + Math.sin(t * 0.45) * 0.015 };
  },
  // 兜底：普通漂浮
  default: (t) => ({ ...ID, y: Math.sin(t * 1.25) * 0.05, rz: Math.sin(t * 0.6) * 0.02 }),
};

export interface StageHandle {
  dispose: () => void;
}

function roundedRectShape(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r);
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h);
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

function shadowTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(128, 128, 10, 128, 128, 128);
  grad.addColorStop(0, "rgba(62,39,35,0.35)");
  grad.addColorStop(0.6, "rgba(62,39,35,0.14)");
  grad.addColorStop(1, "rgba(62,39,35,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  return tex;
}

export function createAnimalStage(container: HTMLElement, opts: StageOptions): StageHandle | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  let disposedFlag = false;
  renderer.domElement.style.display = "block";
  renderer.domElement.style.touchAction = "none";
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0.3, 7);

  // 柔和影棚环境光（IBL）：给标准材质补足侧面/背面的漫反射，避免 GLB 模型背光面发暗发灰
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  scene.add(new THREE.HemisphereLight(0xffffff, 0xffe2b8, 0.5));
  const key = new THREE.DirectionalLight(0xffffff, 1.8);
  key.position.set(3.5, 5, 4.5);
  scene.add(key);
  // 正面补光：从相机方向打光，把脸部和胸口提亮（用户默认看到的就是正面）
  const fill = new THREE.DirectionalLight(0xfff4e0, 0.65);
  fill.position.set(0, 1.2, 6);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffe0b2, 0.9);
  rim.position.set(-4, 2.5, -3.5);
  scene.add(rim);

  const root = new THREE.Group();
  scene.add(root);

  const theme = new THREE.Color(opts.color || "#FFAB91");

  // ---- 展台 ----
  const pedestal = new THREE.Group();
  const baseMat = new THREE.MeshStandardMaterial({ color: theme, roughness: 0.45, metalness: 0.05, envMapIntensity: 0.55 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.62, 0.2, 56), baseMat);
  pedestal.add(base);
  const topMat = new THREE.MeshStandardMaterial({ color: theme.clone().lerp(new THREE.Color("#ffffff"), 0.35), roughness: 0.35, envMapIntensity: 0.55 });
  const topDisc = new THREE.Mesh(new THREE.CylinderGeometry(1.28, 1.28, 0.07, 56), topMat);
  topDisc.position.y = 0.13;
  pedestal.add(topDisc);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.56, 0.028, 12, 90),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.02;
  pedestal.add(ring);
  pedestal.position.y = -1.62;
  root.add(pedestal);

  // ---- 柔和投影 ----
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(5.4, 5.4),
    new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.78;
  root.add(shadow);

  // ---- 展示主体：有真 3D 模型的动物用模型，没有的仍用旧立牌回退 ----
  const model: ProceduralModel | null = buildProceduralModel(opts.animalId);
  const card = new THREE.Group();
  let subject: THREE.Group;
  if (model) {
    subject = model.group;
    subject.position.y = -1.45; // 脚踩在展台顶面上
    root.add(subject);
  } else {
    // ---- 立牌（正面贴图 + 背板厚度）----
    const shape = roundedRectShape(2.6, 2.6, 0.3);
    const backGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.09, bevelEnabled: false });
    const back = new THREE.Mesh(backGeo, new THREE.MeshStandardMaterial({ color: 0xfff6e8, roughness: 0.55, envMapIntensity: 0.5 }));
    back.position.z = -0.09;
    card.add(back);

    const frontGeo = new THREE.ShapeGeometry(shape, 24);
    frontGeo.computeBoundingBox();
    {
      const bb = frontGeo.boundingBox!;
      const size = new THREE.Vector3();
      bb.getSize(size);
      const uv = frontGeo.attributes.uv as THREE.BufferAttribute;
      const pos = frontGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) {
        uv.setXY(i, (pos.getX(i) - bb.min.x) / size.x, (pos.getY(i) - bb.min.y) / size.y);
      }
    }
    const frontMat = new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.0, envMapIntensity: 0.35 });
    const front = new THREE.Mesh(frontGeo, frontMat);
    front.position.z = 0.004;
    card.add(front);
    card.position.y = 0.12;
    root.add(card);
    subject = card;

    const texLoader = new THREE.TextureLoader();
    texLoader.load(opts.image, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      frontMat.map = tex;
      frontMat.needsUpdate = true;
    });
  }

  // ---- 图生 3D 的 GLB 模型：有的话异步加载，解码完成就替换当前主体 ----
  let glbActive = false;
  function disposeObject(obj: THREE.Object3D) {
    obj.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const m = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(m)) m.forEach((x) => { (x as THREE.MeshStandardMaterial).map?.dispose(); x.dispose(); });
      else if (m) { (m as THREE.MeshStandardMaterial).map?.dispose(); m.dispose(); }
    });
  }
  if (hasGlbModel(opts.animalId)) {
    loadGlbBytes(opts.animalId)
      .then(async (buf) => {
        if (!buf || disposedFlag) return;
        try {
          await MeshoptDecoder.ready;
          const loader = new GLTFLoader();
          loader.setMeshoptDecoder(MeshoptDecoder);
          const gltf = await loader.parseAsync(buf, "");
          if (disposedFlag) return;
          const sceneObj = gltf.scene;
          sceneObj.traverse((o) => {
            const mesh = o as THREE.Mesh;
            if (mesh.geometry && !mesh.geometry.getAttribute("normal")) {
              mesh.geometry.computeVertexNormals();
            }
            // GLB 打磨：原材质 roughness≈0.9、无环境反射时显暗显脏；
            // 降粗糙度并提高环境光强度，让手办呈柔光缎面质感
            const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
            mats.forEach((m) => {
              const std = m as THREE.MeshStandardMaterial;
              if (typeof std.roughness === "number") std.roughness = Math.min(std.roughness, 0.62);
              if (typeof std.envMapIntensity === "number") std.envMapIntensity = 1.25;
            });
          });
          const bbox = new THREE.Box3().setFromObject(sceneObj);
          const size = bbox.getSize(new THREE.Vector3());
          const center = bbox.getCenter(new THREE.Vector3());
          const s = 2.6 / Math.max(size.y, 0.0001);
          sceneObj.scale.setScalar(s);
          sceneObj.position.set(-center.x * s, -bbox.min.y * s, -center.z * s);
          const wrap = new THREE.Group();
          wrap.add(sceneObj);
          const old = subject;
          subject = wrap;
          subject.position.y = -1.45;
          root.add(subject);
          root.remove(old);
          disposeObject(old);
          glbActive = true;
        } catch {
          // GLB 加载失败就保留原主体（程序化模型/立牌）
        }
      })
      .catch(() => undefined);
  }

  // ---- 浮尘粒子 ----
  const pCount = 150;
  const pPos = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    const r = 2.7 + Math.random() * 2.1;
    const th = Math.random() * Math.PI * 2;
    pPos[i * 3] = Math.cos(th) * r;
    pPos[i * 3 + 1] = -1.9 + Math.random() * 4.3;
    pPos[i * 3 + 2] = Math.sin(th) * r;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  const particles = new THREE.Points(
    pGeo,
    new THREE.PointsMaterial({ color: 0xffc490, size: 0.055, transparent: true, opacity: 0.75, depthWrite: false })
  );
  scene.add(particles);

  // ---- 尺寸与相机自适应 ----
  function resize() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    const fitH = 5.6; // 纵向需容纳约 3.8 个单位
    const fitW = 5.6 / Math.max(camera.aspect, 0.01); // 横向需容纳约 3.4 个单位
    camera.position.z = Math.min(11, Math.max(fitH, fitW) * 1.45);
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);

  // ---- 拖拽旋转 + 惯性 + 自动转台 ----
  let targetRotY = 0.5;
  let targetRotX = 0.08;
  let rotY = targetRotY;
  let rotX = targetRotX;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let lastInteract = performance.now();
  const el = renderer.domElement;
  function onDown(e: PointerEvent) {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    lastInteract = performance.now();
    el.setPointerCapture(e.pointerId);
  }
  function onMove(e: PointerEvent) {
    if (!dragging) return;
    targetRotY += (e.clientX - lastX) * 0.008;
    targetRotX = THREE.MathUtils.clamp(targetRotX + (e.clientY - lastY) * 0.004, -0.28, 0.38);
    lastX = e.clientX;
    lastY = e.clientY;
    lastInteract = performance.now();
  }
  function onUp() {
    dragging = false;
    lastInteract = performance.now();
  }
  el.addEventListener("pointerdown", onDown);
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerup", onUp);
  el.addEventListener("pointercancel", onUp);

  // ---- 主循环 ----
  const clock = new THREE.Clock();
  let raf = 0;
  let disposed = false;
  function tick() {
    if (disposed) return;
    raf = requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    if (!dragging && performance.now() - lastInteract > 2500) {
      targetRotY += dt * 0.45;
    }
    const k = 1 - Math.exp(-dt * 7);
    rotY += (targetRotY - rotY) * k;
    rotX += (targetRotX - rotX) * k;
    root.rotation.y = rotY;
    root.rotation.x = rotX;
    const off = (SIGNATURES[opts.animalId] ?? SIGNATURES.default)(t);
    subject.position.y = (model ? -1.45 : 0.12) + off.y;
    subject.rotation.set(off.rx, off.ry, off.rz);
    subject.scale.set(off.sx, off.sy, 1);
    if (model && !glbActive) animateModelParts(model, opts.animalId, t);
    particles.rotation.y = t * 0.03;
    renderer.render(scene, camera);
  }
  tick();

  return {
    dispose() {
      disposed = true;
      disposedFlag = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = (mesh as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((m) => { (m as THREE.MeshStandardMaterial).map?.dispose(); m.dispose(); });
        else if (mat) { (mat as THREE.MeshStandardMaterial).map?.dispose(); mat.dispose(); }
      });
      (scene.environment as THREE.Texture | null)?.dispose();
      renderer.dispose();
      if (el.parentElement === container) container.removeChild(el);
    },
  };
}
