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
      TF.env.allowLocalModels = false;
      TF.env.useBrowserCache = true;
      TF.env.backends.onnx.wasm.wasmPaths = new URL('../vendor/', import.meta.url).href;
      TF.env.backends.onnx.wasm.numThreads = 1;
    }
    const key = model + '|' + host;
    if (!pipe || pipeKey !== key) {
      TF.env.remoteHost = host;
      const modelId = 'Xenova/whisper-' + model;
      self.postMessage({ type: 'status', text: `正在准备识别模型 ${modelId}（首次使用需下载，之后走浏览器缓存）...` });
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
