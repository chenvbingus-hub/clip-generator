# 🎬 音视频按句切分工具（MP3 / MP4）

英语听写训练辅助工具：把整段音频**或视频**自动转写、按语义分句，每个句子导出为独立的
MP3 音频 / MP4 视频片段，支持批量处理、ZIP 打包下载。文件全程在浏览器本机处理，不上传外网。

## 功能

- **音频按句切分**（mp3 / wav / m4a / flac / ogg 等）→ 每句一个 MP3
- **视频按句切分**（mp4 / mov / webm / mkv 等）→ 每句一个视频片段
  - 精确模式：重编码（H.264 + AAC），切点精确到句子边界（默认）
  - 快速模式：按关键帧直接拷贝流，速度快但切点可能有偏差
  - 可选同时导出每句的 MP3 音频
- Whisper 语音识别（tiny / base / small 模型可选），词级时间戳
- 语义校正：自动合并被标点/停顿误切的句子（缩写、小数点、小写开头、停顿等规则）
- 听写模式：隐藏原文，点击句子显示
- 多文件排队批量处理；单文件 ZIP / 全部打包 ZIP（内含 transcript.txt 时间轴文本）

## 使用方法

1. **启动本地服务**（必须，直接双击 index.html 无法运行）：
   - Mac：双击 `start_mac.command`
   - Windows：双击 `start_win.bat`（需已安装 Python）
   - 或手动：在本目录执行 `python3 -m http.server 8137`，然后打开 <http://localhost:8137>
2. 把 MP3 / MP4 文件拖进页面，等待处理完成
3. 逐句试听 / 下载，或点「ZIP」打包下载

## 说明

- FFmpeg、识别引擎等运行库已内置在 `vendor/` 目录，**无需联网加载**。
  只有 Whisper 模型首次使用时需要下载（之后走浏览器缓存）：
  tiny ≈ 40MB · base ≈ 75MB · small ≈ 250MB。
  国内网络访问 HuggingFace 困难时，把「模型下载源」切换为 **hf-mirror 国内镜像**。
- 视频切割使用浏览器内的 FFmpeg (WebAssembly)，精确模式重编码速度约为
  实时的几分之一，长视频请耐心等待；文件建议不超过 ~900MB（受浏览器内存限制）。
- 推荐使用最新版 Chrome / Edge。

## 目录结构

```
index.html          页面 + 处理流水线
js/segmenter.js     分句与语义校正逻辑（可用 Node 单测）
test/               单元测试（node test/segmenter.test.js）
vendor/             内置运行库（ffmpeg.wasm、transformers.js、onnxruntime、JSZip）
start_mac.command   Mac 一键启动
start_win.bat       Windows 一键启动
```
