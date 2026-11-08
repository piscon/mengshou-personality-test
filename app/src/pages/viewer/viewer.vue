<template>
  <view class="page" v-if="animal" :style="{ background: bg }">
    <view class="stage-box">
      <!-- #ifdef H5 -->
      <view id="stage3d-wrap" class="stage"></view>
      <image v-if="!stageOk" class="big-img" :src="imgOf(animal.id)" mode="aspectFill" />
      <!-- #endif -->
      <!-- #ifndef H5 -->
      <image class="big-img" :src="imgOf(animal.id)" mode="aspectFill" />
      <!-- #endif -->
    </view>
    <!-- #ifdef H5 -->
    <text class="hint">按住拖动 · 换个角度看看它，它还会做自己的招牌动作</text>
    <!-- #endif -->
    <!-- #ifndef H5 -->
    <text class="hint">3D 视角请在网页版体验</text>
    <!-- #endif -->

    <view class="card">
      <view class="card-head">
        <text class="aname">{{ animal.emoji }} {{ animal.fullName }}</text>
        <text class="atitle">{{ animal.title }}</text>
      </view>
      <text class="desc">{{ animal.description }}</text>
      <view class="tags">
        <text v-for="t in animal.traits" :key="t" class="tag">{{ t }}</text>
      </view>
      <text class="line">座右铭：「{{ animal.motto }}」</text>
      <text class="line">小缺点：{{ animal.flaw }}</text>
      <text class="line">稀有度：只有约 {{ animal.rarity }}% 的人是{{ animal.name }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad, onReady, onUnload } from "@dcloudio/uni-app";
import animalsJson from "@/common/data/animals.json";
import type { AnimalsData } from "@/common/scoring";
import { animalImage } from "@/common/animalImages";
// #ifdef H5
import { createAnimalStage, type StageHandle } from "@/common/stage3d";
// #endif

type AnimalItem = AnimalsData["animals"][number];
const animals = (animalsJson as unknown as AnimalsData).animals;
const imgOf = animalImage;

const animal = ref<AnimalItem | null>(null);
const stageOk = ref(true);
const bg = computed(() =>
  animal.value
    ? `linear-gradient(180deg, ${animal.value.color}55 0%, #FFF8E1 70%)`
    : "#FFF8E1"
);

// #ifdef H5
let handle: StageHandle | null = null;
// #endif

onLoad((q) => {
  const id = typeof q?.id === "string" ? q.id : "shiba";
  animal.value = animals.find((a) => a.id === id) ?? animals[0];
});

// #ifdef H5
onReady(() => {
  const a = animal.value;
  const el = document.getElementById("stage3d-wrap");
  const src = a ? animalImage(a.id) : undefined;
  if (!a || !el || !src) {
    stageOk.value = false;
    return;
  }
  handle = createAnimalStage(el, { image: src, color: a.color, animalId: a.id });
  if (!handle) stageOk.value = false;
});

onUnload(() => {
  handle?.dispose();
  handle = null;
});
// #endif
</script>

<style>
.page {
  min-height: 100vh;
  padding: 24rpx 36rpx 64rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.stage-box {
  width: 100%;
  height: 56vh;
  position: relative;
}
.stage {
  width: 100%;
  height: 100%;
}
.big-img {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 480rpx;
  height: 480rpx;
  border-radius: 48rpx;
}
.hint {
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #a1887f;
}
.card {
  margin-top: 30rpx;
  width: 100%;
  background: #ffffff;
  border-radius: 32rpx;
  padding: 34rpx 30rpx;
  box-sizing: border-box;
}
.card-head {
  display: flex;
  flex-direction: column;
}
.aname {
  font-size: 44rpx;
  font-weight: 800;
}
.atitle {
  margin-top: 6rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #ff7043;
}
.desc {
  margin-top: 20rpx;
  font-size: 29rpx;
  line-height: 1.8;
  color: #4e342e;
}
.tags {
  margin-top: 16rpx;
  display: flex;
  flex-wrap: wrap;
}
.tag {
  background: #f3e5f5;
  color: #6a1b9a;
  border-radius: 999rpx;
  padding: 6rpx 22rpx;
  font-size: 25rpx;
  margin: 6rpx;
}
.line {
  display: block;
  margin-top: 14rpx;
  font-size: 27rpx;
  line-height: 1.7;
  color: #5d4037;
}
</style>
