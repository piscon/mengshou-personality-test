<script setup lang="ts">
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";
onLaunch(() => {
  console.log("App Launch");
});
onShow(() => {
  console.log("App Show");
});
onHide(() => {
  console.log("App Hide");
});
</script>
<style>
page {
  background-color: #fff8e1;
  font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
  color: #3e2723;
}
</style>
