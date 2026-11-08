<template>
  <view class="page">
    <view class="progress">
      <view class="bar" :style="{ width: progressPercent + '%' }"></view>
    </view>
    <text class="qmeta">第 {{ answers.length + 1 }} / {{ questions.length }} 题</text>
    <text class="qtext">{{ current.text }}</text>
    <view class="opts">
      <button v-for="opt in current.options" :key="opt.id" class="opt" @click="choose(opt.id)">
        {{ opt.text }}
      </button>
    </view>
    <button v-if="answers.length > 0" class="btn-ghost" @click="back">← 上一题</button>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import quizJson from "@/common/data/questions.json";
import animalsJson from "@/common/data/animals.json";
import { computeResult, type AnimalsData, type QuizData } from "@/common/scoring";

const quiz = quizJson as unknown as QuizData;
const animals = animalsJson as unknown as AnimalsData;
const questions = quiz.questions;

const answers = ref<string[]>([]);
const current = computed(() => questions[Math.min(answers.value.length, questions.length - 1)]);
const progressPercent = computed(() => Math.round((answers.value.length / questions.length) * 100));

function choose(id: string) {
  answers.value.push(id);
  if (answers.value.length === questions.length) {
    const result = computeResult(quiz, animals, answers.value);
    uni.setStorageSync("mengshou_last_result", result);
    uni.redirectTo({ url: "/pages/result/result" });
  }
}

function back() {
  answers.value.pop();
}
</script>

<style>
.page {
  padding: 40rpx 36rpx 64rpx;
  display: flex;
  flex-direction: column;
}
.progress {
  height: 14rpx;
  background: #f1e4dc;
  border-radius: 99rpx;
  overflow: hidden;
}
.bar {
  height: 100%;
  background: linear-gradient(90deg, #ffb74d, #ff8a65);
  transition: width 0.3s;
}
.qmeta {
  margin-top: 16rpx;
  font-size: 26rpx;
  color: #a1887f;
  text-align: right;
}
.qtext {
  margin-top: 22rpx;
  font-size: 38rpx;
  font-weight: 700;
  line-height: 1.55;
}
.opts {
  margin-top: 20rpx;
}
.opt {
  width: 100%;
  text-align: left;
  border: 2rpx solid #ffe0b2;
  background: #fff8e1;
  border-radius: 28rpx;
  padding: 26rpx 28rpx;
  font-size: 31rpx;
  line-height: 1.5;
  margin-top: 20rpx;
  color: #3e2723;
}
.btn-ghost {
  margin-top: 32rpx;
  width: 100%;
  border-radius: 999rpx;
  background: #fff3e0;
  color: #6d4c41;
  font-size: 30rpx;
  padding: 8rpx 0;
}
</style>
