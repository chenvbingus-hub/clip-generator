// 语音识别 Worker：把 Whisper 推理放到后台线程，避免页面卡死
let TF = null;
let pipe = null;
let pipeKey = '';

self.onmessage = async (e) => {
  const { pcm, model, lang, host, duration } = e.data;
  try {
    if (!TF) {
      self.postMessage({ type: 'status', text: '正在加载语音识别引擎...' });
      TF = await import('../vendor/transformers.min.js');
      TF.env.useBrowserCache = true;
      TF.env.localModelPath = new URL('../models/', import.meta.url).href;
      TF.env.backends.onnx.wasm.wasmPaths = new URL('../vendor/', import.meta.url).href;
      TF.env.backends.onnx.wasm.numThreads = 1;
    }
    const key = model + '|' + host;
    if (!pipe || pipeKey !== key) {
      TF.env.remoteHost = host;
      const modelId = 'Xenova/whisper-' + model;
      // 先探测 models/ 目录里有没有预下载的本地模型
      let hasLocal = false;
      try {
        const r = await fetch(new URL(`../models/${modelId}/config.json`, import.meta.url), { method: 'HEAD' });
        hasLocal = r.ok;
      } catch { /* 探测失败按无本地模型处理 */ }
      TF.env.allowLocalModels = hasLocal;
      if (hasLocal) {
        self.postMessage({ type: 'status', text: `检测到本地模型 ${modelId}，直接从本地加载（无需联网）...` });
      } else {
        self.postMessage({ type: 'status', text: `正在准备识别模型 ${modelId}（首次使用需下载，之后走浏览器缓存；` +
          `也可运行 python3 download_models.py 把模型下载到本地一劳永逸）...` });
      }
      const dlLogged = new Set();
      pipe = await TF.pipeline('automatic-speech-recognition', modelId, {
        quantized: true,
        progress_callback: (p) => {
          if (p.status === 'progress' && p.total) {
            const decile = Math.floor(p.progress / 10) * 10;
            const k = p.file + '@' + decile;
            if (!dlLogged.has(k)) { dlLogged.add(k); self.postMessage({ type: 'status', text: `  下载 ${p.file}: ${decile}%` }); }
          } else if (p.status === 'done') {
            self.postMessage({ type: 'status', text: `  ${p.file} 就绪` });
          }
        },
      });
      pipeKey = key;
      self.postMessage({ type: 'status', text: '识别模型加载完成' });
    }

    const totalChunks = Math.max(1, Math.ceil(duration / 25));
    let done = 0;
    const opts = {
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: 'word',
      task: 'transcribe',
      chunk_callback: () => {
        done++;
        self.postMessage({ type: 'progress', frac: Math.min(done / totalChunks, 1) });
      },
    };
    if (lang !== 'auto') opts.language = lang;
    const output = await pipe(pcm, opts);
    self.postMessage({ type: 'result', chunks: output.chunks || [] });
  } catch (err) {
    self.postMessage({ type: 'error', message: String((err && err.message) || err) });
  }
};
