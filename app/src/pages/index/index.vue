<template>
  <view class="page">
    <view class="zoo">
      <view v-for="a in animals" :key="a.id" class="zoo-item" @click="openViewer(a.id)">
        <image v-if="imgOf(a.id)" class="zoo-img" :src="imgOf(a.id)" mode="aspectFill" />
        <text v-else class="zoo-emoji">{{ a.emoji }}</text>
      </view>
    </view>
    <text class="h1">性格测试</text>
    <text class="h1">看看你是哪种萌兽</text>
    <text class="sub">三分钟、十道题，把你的性格测成一只毛茸茸的小动物</text>
    <button class="btn-primary" @click="start">开始测试</button>
    <text class="note">免登录 · 本地计分 · 仅供娱乐</text>

    <view class="guide">
      <text class="guide-title">萌兽图鉴 · 18 只（点开看 3D）</text>
      <view class="grid">
        <view v-for="a in animals" :key="a.id" class="cell" @click="openViewer(a.id)">
          <image v-if="imgOf(a.id)" class="cell-img" :src="imgOf(a.id)" mode="aspectFill" />
          <text v-else class="cell-emoji">{{ a.emoji }}</text>
          <text class="cell-name">{{ a.fullName }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import animalsJson from "@/common/data/animals.json";
import type { AnimalsData } from "@/common/scoring";
import { animalImage } from "@/common/animalImages";

const animals = (animalsJson as unknown as AnimalsData).animals;
const imgOf = animalImage;

function start() {
  uni.navigateTo({ url: "/pages/quiz/quiz" });
}

function openViewer(id: string) {
  uni.navigateTo({ url: `/pages/viewer/viewer?id=${id}` });
}
</script>

<style>
.page {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48rpx 36rpx 64rpx;
}
.zoo {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  margin-bottom: 28rpx;
}
.zoo-item {
  margin: 4rpx;
  display: flex;
}
.zoo-img {
  width: 68rpx;
  height: 68rpx;
  border-radius: 18rpx;
}
.zoo-emoji {
  font-size: 44rpx;
}
.h1 {
  font-size: 52rpx;
  font-weight: 800;
  line-height: 1.35;
  text-align: center;
}
.sub {
  margin-top: 20rpx;
  font-size: 28rpx;
  color: #8d6e63;
  text-align: center;
  line-height: 1.6;
}
.btn-primary {
  margin-top: 44rpx;
  width: 100%;
  border-radius: 999rpx;
  background: #ff8a65;
  color: #fff;
  font-size: 34rpx;
  font-weight: 700;
  padding: 12rpx 0;
}
.note {
  margin-top: 22rpx;
  font-size: 24rpx;
  color: #bcaaa4;
}
.guide {
  margin-top: 56rpx;
  width: 100%;
  background: #ffffff;
  border-radius: 32rpx;
  padding: 32rpx 24rpx;
}
.guide-title {
  font-size: 30rpx;
  font-weight: 700;
}
.grid {
  display: flex;
  flex-wrap: wrap;
  margin-top: 16rpx;
}
.cell {
  width: 33.33%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16rpx 0;
}
.cell-img {
  width: 124rpx;
  height: 124rpx;
  border-radius: 28rpx;
}
.cell-emoji {
  font-size: 56rpx;
}
.cell-name {
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #6d4c41;
}
</style>
