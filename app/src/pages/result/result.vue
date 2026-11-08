<template>
  <view class="page" v-if="result">
    <text class="lead">你的灵魂里住着一只</text>
    <image v-if="imgOf(result.animal.id)" class="animal-img" :src="imgOf(result.animal.id)" mode="aspectFill" @click="openViewer" />
    <text v-else class="emoji-big">{{ result.animal.emoji }}</text>
    <text v-if="imgOf(result.animal.id)" class="view3d-hint">点开看 3D 视角</text>
    <text class="aname">{{ result.animal.fullName }}</text>
    <text class="atitle">{{ result.animal.title }}</text>
    <text class="match">匹配度 {{ result.matchPercent }}% · 只有约 {{ result.animal.rarity }}% 的人是{{ result.animal.name }}</text>
    <text class="desc">{{ result.animal.description }}</text>
    <view class="tags">
      <text v-for="t in result.animal.traits" :key="t" class="tag">{{ t }}</text>
    </view>

    <view class="dims">
      <view v-for="d in quiz.dimensions" :key="d.id" class="dim">
        <view class="dim-row">
          <text>{{ d.name }}：{{ result.dimensions[d.id].poleName }}</text>
          <text>{{ result.dimensions[d.id].percents[result.dimensions[d.id].pole] }}%</text>
        </view>
        <view class="track">
          <view class="fill" :style="{ width: result.dimensions[d.id].percents[result.dimensions[d.id].pole] + '%' }"></view>
        </view>
      </view>
    </view>

    <view class="extra">
      <text class="extra-line">座右铭：「{{ result.animal.motto }}」</text>
      <text class="extra-line">小缺点：{{ result.animal.flaw }}</text>
      <view class="extra-line partner-line" v-if="partner">
        <text>最佳拍档：</text>
        <image v-if="imgOf(partner.id)" class="partner-img" :src="imgOf(partner.id)" mode="aspectFill" />
        <text v-else>{{ partner.emoji }}</text>
        <text>{{ partner.fullName }}</text>
      </view>
    </view>

    <button class="btn-primary" @click="makePoster">生成分享海报</button>
    <!-- #ifdef MP-WEIXIN -->
    <button class="btn-ghost" open-type="share">喊朋友来测</button>
    <!-- #endif -->
    <!-- #ifndef MP-WEIXIN -->
    <button class="btn-ghost" @click="copyShare">复制结果，喊朋友来测</button>
    <!-- #endif -->
    <button class="btn-ghost" @click="again">再测一次</button>
    <text class="foot">性格测试 · 看看你是哪种萌兽｜仅供娱乐</text>

    <view v-if="posterPath" class="poster-mask" @click="posterPath = ''">
      <image class="poster-img" :src="posterPath" mode="widthFix" @click.stop />
      <text class="poster-tip">长按图片可保存 / 转发给朋友</text>
    </view>
    <canvas canvas-id="posterCanvas" class="poster-canvas" :style="{ width: posterW + 'px', height: posterH + 'px' }"></canvas>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad, onShareAppMessage } from "@dcloudio/uni-app";
import quizJson from "@/common/data/questions.json";
import animalsJson from "@/common/data/animals.json";
import type { AnimalsData, QuizData, QuizResult } from "@/common/scoring";
import { animalImage } from "@/common/animalImages";

const imgOf = animalImage;

const quiz = quizJson as unknown as QuizData;
const animalsData = animalsJson as unknown as AnimalsData;

const result = ref<QuizResult | null>(null);
const partner = computed(() =>
  result.value ? animalsData.animals.find((a) => a.id === result.value!.animal.bestPartner) : undefined
);

onLoad(() => {
  const saved = uni.getStorageSync("mengshou_last_result") as QuizResult | "";
  if (!saved) {
    uni.reLaunch({ url: "/pages/index/index" });
    return;
  }
  result.value = saved;
});

onShareAppMessage(() => {
  const a = result.value?.animal;
  return {
    title: a ? `我是${a.emoji}${a.fullName}，你是哪种萌兽？` : "性格测试，看看你是哪种萌兽",
    path: "/pages/index/index",
  };
});

function shareText() {
  const r = result.value!;
  const a = r.animal;
  return `我在「性格测试，看看你是哪种萌兽」测出了 ${a.emoji}${a.fullName}（匹配度 ${r.matchPercent}%）——${a.title}！你是哪种萌兽？快来测测看`;
}

function copyShare() {
  uni.setClipboardData({
    data: shareText(),
    success: () => uni.showToast({ title: "已复制，去喊朋友来测", icon: "none" }),
  });
}

function again() {
  uni.removeStorageSync("mengshou_last_result");
  uni.reLaunch({ url: "/pages/index/index" });
}

function openViewer() {
  const id = result.value?.animal.id;
  if (id) uni.navigateTo({ url: `/pages/viewer/viewer?id=${id}` });
}

// ---- 分享海报（Canvas 绘制，不依赖第三方库）----
const posterW = 600;
const posterH = 880;
const posterPath = ref("");

function getImageInfoAsync(src: string) {
  return new Promise<UniApp.GetImageInfoSuccessData>((resolve, reject) => {
    uni.getImageInfo({ src, success: resolve, fail: reject });
  });
}

async function makePoster() {
  const r = result.value;
  if (!r) return;
  const a = r.animal;
  // 优先用伪 3D 素材图绘制海报；取图失败时回退到 emoji
  let imgPath: string | null = null;
  const src = animalImage(a.id);
  if (src) {
    try {
      imgPath = (await getImageInfoAsync(src)).path;
    } catch {
      imgPath = null;
    }
  }
  const ctx = uni.createCanvasContext("posterCanvas");
  ctx.setFillStyle("#FFF3E0");
  ctx.fillRect(0, 0, posterW, posterH);
  ctx.setFillStyle(a.color);
  ctx.fillRect(0, 0, posterW, 180);
  ctx.setFillStyle("#FFFFFF");
  ctx.setFontSize(34);
  ctx.setTextAlign("center");
  ctx.fillText("性格测试 · 看看你是哪种萌兽", posterW / 2, 78);
  ctx.setFontSize(26);
  ctx.fillText("三分钟 · 十道题 · 测出你的灵魂萌兽", posterW / 2, 128);
  ctx.setTextAlign("center");
  if (imgPath) {
    ctx.drawImage(imgPath, 160, 204, 280, 280);
  } else {
    ctx.setFontSize(150);
    ctx.fillText(a.emoji, posterW / 2, 420);
  }
  ctx.setFillStyle("#3E2723");
  ctx.setFontSize(52);
  ctx.fillText(a.fullName, posterW / 2, 566);
  ctx.setFillStyle("#FF7043");
  ctx.setFontSize(32);
  ctx.fillText(a.title, posterW / 2, 622);
  ctx.setFillStyle("#8D6E63");
  ctx.setFontSize(27);
  ctx.fillText(`匹配度 ${r.matchPercent}% · 只有约 ${a.rarity}% 的人是${a.name}`, posterW / 2, 676);
  ctx.setFillStyle("#5D4037");
  ctx.setFontSize(29);
  ctx.fillText(`「${a.motto}」`, posterW / 2, 750);
  ctx.setFillStyle("#BCAAA4");
  ctx.setFontSize(23);
  ctx.fillText("仅供娱乐 · 快喊朋友来测测 TA 是哪只", posterW / 2, 822);
  ctx.draw(false, () => {
    setTimeout(() => {
      uni.canvasToTempFilePath({
        canvasId: "posterCanvas",
        success: (res) => {
          posterPath.value = res.tempFilePath;
        },
        fail: () => uni.showToast({ title: "海报生成失败，请截图分享", icon: "none" }),
      });
    }, 120);
  });
}
</script>

<style>
.page {
  padding: 36rpx 36rpx 64rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.lead {
  font-size: 28rpx;
  color: #8d6e63;
}
.emoji-big {
  font-size: 170rpx;
  margin-top: 10rpx;
}
.animal-img {
  width: 320rpx;
  height: 320rpx;
  border-radius: 48rpx;
  margin-top: 16rpx;
}
.view3d-hint {
  margin-top: 10rpx;
  font-size: 23rpx;
  color: #bcaaa4;
}
.partner-line {
  display: flex;
  align-items: center;
}
.partner-img {
  width: 46rpx;
  height: 46rpx;
  border-radius: 12rpx;
  margin: 0 10rpx;
}
.aname {
  font-size: 54rpx;
  font-weight: 800;
}
.atitle {
  margin-top: 6rpx;
  font-size: 32rpx;
  font-weight: 700;
  color: #ff7043;
}
.match {
  margin-top: 10rpx;
  font-size: 25rpx;
  color: #8d6e63;
}
.desc {
  margin-top: 26rpx;
  font-size: 29rpx;
  line-height: 1.8;
}
.tags {
  margin-top: 18rpx;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
}
.tag {
  background: #f3e5f5;
  color: #6a1b9a;
  border-radius: 999rpx;
  padding: 6rpx 22rpx;
  font-size: 25rpx;
  margin: 6rpx;
}
.dims {
  width: 100%;
  margin-top: 26rpx;
}
.dim {
  margin-top: 16rpx;
}
.dim-row {
  display: flex;
  justify-content: space-between;
  font-size: 26rpx;
  color: #6d4c41;
}
.track {
  height: 16rpx;
  background: #efebe9;
  border-radius: 99rpx;
  overflow: hidden;
  margin-top: 6rpx;
}
.fill {
  height: 100%;
  background: linear-gradient(90deg, #ba68c8, #ff8a65);
}
.extra {
  width: 100%;
  margin-top: 28rpx;
  background: #ffffff;
  border-radius: 24rpx;
  padding: 24rpx 26rpx;
  display: flex;
  flex-direction: column;
}
.extra-line {
  font-size: 27rpx;
  line-height: 1.75;
  color: #5d4037;
}
.btn-primary {
  margin-top: 36rpx;
  width: 100%;
  border-radius: 999rpx;
  background: #ff8a65;
  color: #fff;
  font-size: 33rpx;
  font-weight: 700;
  padding: 10rpx 0;
}
.btn-ghost {
  margin-top: 20rpx;
  width: 100%;
  border-radius: 999rpx;
  background: #fff3e0;
  color: #6d4c41;
  font-size: 31rpx;
  padding: 8rpx 0;
}
.foot {
  margin-top: 30rpx;
  font-size: 23rpx;
  color: #bcaaa4;
}
.poster-canvas {
  position: absolute;
  left: -9999px;
  top: 0;
}
.poster-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 99;
}
.poster-img {
  width: 72%;
  border-radius: 20rpx;
}
.poster-tip {
  margin-top: 22rpx;
  color: #fff;
  font-size: 27rpx;
}
</style>
