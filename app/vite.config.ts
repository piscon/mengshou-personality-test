import { defineConfig } from "vite";
import uni from "@dcloudio/vite-plugin-uni";

// https://vitejs.dev/config/
export default defineConfig({
  // 相对路径 base：让 H5 产物能部署在子路径下（如 GitHub Pages 的 /<repo>/），小程序/App 构建不受影响
  base: "./",
  plugins: [uni()],
});
