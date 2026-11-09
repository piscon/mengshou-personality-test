// 图生 3D 的 GLB 模型注册表（Hunyuan3D-2 在 Kaggle 上生成、gltf-transform 优化后）
// GLB 是二进制、无法经 GitHub 文本通道推送，故以 base64 文本形式随包分发，
// 进入 3D 页时按需动态加载对应动物的分片，解码后交给 GLTFLoader。
const LOADERS: Record<string, () => Promise<string>> = {
  shiba: () =>
    import("../assets/models3d/shiba.b64.txt?raw").then(
      (m) => (m as unknown as { default: string }).default
    ),
};

export function hasGlbModel(id: string): boolean {
  return id in LOADERS;
}

export async function loadGlbBytes(id: string): Promise<ArrayBuffer | null> {
  const loader = LOADERS[id];
  if (!loader) return null;
  try {
    const b64 = (await loader()).trim();
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer as ArrayBuffer;
  } catch {
    return null;
  }
}
