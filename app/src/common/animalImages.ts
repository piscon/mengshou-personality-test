// 萌兽伪 3D 素材：app/src/assets/animals/<动物id>.jpg（2026-11-09 生成定版，共 18 只）
// H5 构建时图片会内联进 JS（见 vite.config.ts 的 assetsInlineLimit），
// 小程序/App 构建时作为独立文件打包。取不到图片时页面自动回退到 emoji。
// 注意：jpg 是二进制文件，无法经 GitHub 快照通道推送；图片原件保存在工作区，
// 线上 H5 的 JS 产物里有内联副本。重新生成时按柴犬图做风格参照、柔光哑面口径。
const modules = import.meta.glob("../assets/animals/*.jpg", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const byId: Record<string, string> = {};
for (const [path, url] of Object.entries(modules)) {
  const m = /([\w-]+)\.jpg$/.exec(path);
  if (m) byId[m[1]] = url;
}

export function animalImage(id: string): string | undefined {
  return byId[id];
}
