/*
 * 分句逻辑：把 Whisper 词级时间戳切成句子片段，并做语义校正（合并被误切的句子）。
 * UMD 风格导出，浏览器里挂到 window.Segmenter，Node 里可 require 做单元测试。
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.Segmenter = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // 句末标点（可跟右引号/右括号）
  var TERMINAL_RE = /[.!?。！？…]["'”’»)\]]*\s*$/;
  // 常见缩写：句点不代表句子结束
  var ABBREV_RE = /\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|Mt|vs|etc|Inc|Ltd|Co|No|Fig|Gen|Sen|Rep|Gov|Capt|Col|Sgt|Hon|Rev|approx|[A-Z])\.$/;

  function endsTerminal(text) {
    return TERMINAL_RE.test(text);
  }

  // 把 whisper 输出的 word chunks 规整为 {text,start,end}，补全缺失时间戳
  function wordsFromChunks(chunks, totalDuration) {
    var words = [];
    for (var i = 0; i < chunks.length; i++) {
      var c = chunks[i];
      if (!c || !c.text || !c.text.trim()) continue;
      var ts = c.timestamp || [null, null];
      var s = ts[0], e = ts[1];
      if (s == null) s = words.length ? words[words.length - 1].end : 0;
      if (e == null) e = Math.min(s + 1.0, totalDuration || s + 1.0);
      if (e < s) e = s;
      words.push({ text: c.text, start: s, end: e });
    }
    return words;
  }

  function makeSegment(ws) {
    return {
      text: ws.map(function (w) { return w.text; }).join('').replace(/\s+/g, ' ').trim(),
      start: ws[0].start,
      end: ws[ws.length - 1].end,
      nwords: ws.length,
    };
  }

  // 第一步：按句末标点 + 长停顿初步切分
  function splitByPunctuation(words, opts) {
    opts = opts || {};
    var pauseGap = opts.pauseGap != null ? opts.pauseGap : 1.1;
    var segs = [];
    var cur = [];
    for (var i = 0; i < words.length; i++) {
      cur.push(words[i]);
      var t = words[i].text.trim();
      var terminal = TERMINAL_RE.test(t);
      var nextGap = i + 1 < words.length ? words[i + 1].start - words[i].end : 0;
      if (terminal || nextGap > pauseGap) {
        segs.push(makeSegment(cur));
        cur = [];
      }
    }
    if (cur.length) segs.push(makeSegment(cur));
    return segs;
  }

  function joinText(a, b) {
    if (!a) return b;
    if (!b) return a;
    // 中日文之间不加空格
    var cjkEnd = /[一-鿿぀-ヿ＀-￯]$/.test(a);
    var cjkStart = /^[一-鿿぀-ヿ＀-￯]/.test(b);
    return a + (cjkEnd || cjkStart ? '' : ' ') + b;
  }

  function shouldMerge(prev, cur) {
    var gap = cur.start - prev.end;
    var pt = prev.text, ct = cur.text;
    // 前一段没有以句末标点结束（多半是被停顿误切）
    if (!endsTerminal(pt)) return gap < 1.6;
    // 下一段以小写字母开头：句子没结束
    if (/^[a-z]/.test(ct)) return true;
    // 前一段以缩写结尾（Mr. / U.S. 等）
    if (ABBREV_RE.test(pt)) return true;
    // 数字里的小数点被当成句号（"3." + "5 percent"）
    if (/\d\.$/.test(pt) && /^\d/.test(ct)) return true;
    // 极短碎片（"Okay." 之类）且紧跟下一句
    if (prev.nwords <= 2 && gap < 0.5) return true;
    return false;
  }

  // 第二步：语义校正——把被误切的相邻片段合并成完整句子
  function semanticMerge(segs, opts) {
    opts = opts || {};
    var maxDur = opts.maxDur != null ? opts.maxDur : 30;
    var maxWords = opts.maxWords != null ? opts.maxWords : 80;
    var out = [];
    for (var i = 0; i < segs.length; i++) {
      var s = segs[i];
      var prev = out[out.length - 1];
      if (prev && shouldMerge(prev, s) &&
          (s.end - prev.start) <= maxDur &&
          (prev.nwords + s.nwords) <= maxWords) {
        prev.text = joinText(prev.text, s.text);
        prev.end = s.end;
        prev.nwords += s.nwords;
      } else {
        out.push({ text: s.text, start: s.start, end: s.end, nwords: s.nwords });
      }
    }
    return out;
  }

  return {
    wordsFromChunks: wordsFromChunks,
    splitByPunctuation: splitByPunctuation,
    semanticMerge: semanticMerge,
    endsTerminal: endsTerminal,
  };
});
