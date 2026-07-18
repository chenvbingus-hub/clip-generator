// 分句逻辑单元测试: node test/segmenter.test.js
const assert = require('assert');
const Segmenter = require('../js/segmenter.js');

let passed = 0;
function t(name, fn) {
  fn();
  passed++;
  console.log('  ✓ ' + name);
}

// 帮助函数：把 "word|start|end" 列表转成 whisper 风格 chunks
function chunks(list) {
  return list.map(([text, start, end]) => ({ text, timestamp: [start, end] }));
}

t('wordsFromChunks 补全缺失时间戳并跳过空词', () => {
  const w = Segmenter.wordsFromChunks(chunks([
    [' Hello', 0, 0.5], ['  ', 0.5, 0.6], [' world.', 0.6, null],
  ]), 10);
  assert.strictEqual(w.length, 2);
  assert.strictEqual(w[1].end, 1.6); // start + 1.0
});

t('splitByPunctuation 按句末标点切分', () => {
  const w = Segmenter.wordsFromChunks(chunks([
    [' Hello', 0, 0.4], [' world.', 0.4, 0.9], [' How', 1.1, 1.4], [' are', 1.4, 1.6], [' you?', 1.6, 2.0],
  ]), 5);
  const segs = Segmenter.splitByPunctuation(w);
  assert.strictEqual(segs.length, 2);
  assert.strictEqual(segs[0].text, 'Hello world.');
  assert.strictEqual(segs[1].text, 'How are you?');
  assert.strictEqual(segs[0].start, 0);
  assert.strictEqual(segs[1].end, 2.0);
});

t('splitByPunctuation 长停顿也会切分', () => {
  const w = Segmenter.wordsFromChunks(chunks([
    [' one', 0, 0.4], [' two', 0.4, 0.8], [' three', 3.0, 3.4], [' four.', 3.4, 3.8],
  ]), 5);
  const segs = Segmenter.splitByPunctuation(w);
  assert.strictEqual(segs.length, 2);
  assert.strictEqual(segs[0].text, 'one two');
});

t('semanticMerge 合并未以句末标点结束的片段', () => {
  const segs = [
    { text: 'Last year 54 billion,', start: 0, end: 2, nwords: 4 },
    { text: 'a total order book of $300 billion.', start: 2.3, end: 5, nwords: 7 },
  ];
  const m = Segmenter.semanticMerge(segs);
  assert.strictEqual(m.length, 1);
  assert.strictEqual(m[0].text, 'Last year 54 billion, a total order book of $300 billion.');
  assert.strictEqual(m[0].start, 0);
  assert.strictEqual(m[0].end, 5);
});

t('semanticMerge 合并小写开头的片段', () => {
  const segs = [
    { text: 'He went to the U.S.', start: 0, end: 2, nwords: 5 },
    { text: 'and stayed there.', start: 2.1, end: 4, nwords: 3 },
  ];
  const m = Segmenter.semanticMerge(segs);
  assert.strictEqual(m.length, 1);
});

t('semanticMerge 合并缩写误切 (Mr.)', () => {
  const segs = [
    { text: 'I spoke with Mr.', start: 0, end: 1.5, nwords: 4 },
    { text: 'Smith yesterday.', start: 1.6, end: 3, nwords: 2 },
  ];
  const m = Segmenter.semanticMerge(segs);
  assert.strictEqual(m.length, 1);
  assert.strictEqual(m[0].text, 'I spoke with Mr. Smith yesterday.');
});

t('semanticMerge 合并小数点误切', () => {
  const segs = [
    { text: 'It grew by 3.', start: 0, end: 1.5, nwords: 4 },
    { text: '5 percent this year.', start: 1.5, end: 3, nwords: 4 },
  ];
  const m = Segmenter.semanticMerge(segs);
  assert.strictEqual(m.length, 1);
});

t('semanticMerge 不合并正常的独立句子（大写开头）', () => {
  const segs = [
    { text: 'This chart is about the Trump trillion.', start: 0, end: 3, nwords: 7 },
    { text: 'And I start with this chart.', start: 3.5, end: 6, nwords: 6 },
  ];
  const m = Segmenter.semanticMerge(segs);
  assert.strictEqual(m.length, 2);
});

t('semanticMerge 遵守最大时长限制', () => {
  const segs = [
    { text: 'A very long segment,', start: 0, end: 29, nwords: 4 },
    { text: 'still going on.', start: 29.2, end: 35, nwords: 3 },
  ];
  const m = Segmenter.semanticMerge(segs, { maxDur: 30 });
  assert.strictEqual(m.length, 2); // 合并后 35s > 30s，不合并
});

t('semanticMerge 中文合并不加空格', () => {
  const segs = [
    { text: '今天天气很好，', start: 0, end: 2, nwords: 4 },
    { text: '我们出去玩吧。', start: 2.1, end: 4, nwords: 4 },
  ];
  const m = Segmenter.semanticMerge(segs);
  assert.strictEqual(m.length, 1);
  assert.strictEqual(m[0].text, '今天天气很好，我们出去玩吧。');
});

t('中文按句号切分', () => {
  const w = Segmenter.wordsFromChunks(chunks([
    ['今天', 0, 0.5], ['天气很好。', 0.5, 1.2], ['我们', 1.4, 1.8], ['出去玩。', 1.8, 2.5],
  ]), 5);
  const segs = Segmenter.splitByPunctuation(w);
  assert.strictEqual(segs.length, 2);
  assert.strictEqual(segs[0].text, '今天天气很好。');
});

console.log(`\n全部通过 (${passed} 项)`);
