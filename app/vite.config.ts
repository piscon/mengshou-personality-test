import { defineConfig } from "vite";
import uni from "@dcloudio/vite-plugin-uni";

// https://vitejs.dev/config/
export default defineConfig({
  // 相对路径 base：让 H5 产物能部署在子路径下（如 GitHub Pages 的 /<repo>/），小程序/App 构建不受影响
  base: "./",
  build: {
    // H5：图片全部内联为 data URI，保证部署产物只有文本文件（GitHub Pages 推送通道只支持文本）；
    // 小程序/App：保持默认阈值，图片作为独立文件打包，避免主包代码膨胀
    assetsInlineLimit: process.env.UNI_PLATFORM === "h5" ? 100_000_000 : 4096,
  },
  plugins: [uni()],
});
