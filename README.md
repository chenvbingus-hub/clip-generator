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

1. **启动本地服务**（必须，直接双击 index.html 无法运行——浏览器会禁止 file:// 页面加载处理引擎）：
   - **Mac**：打开「终端」Terminal，执行

     ```bash
     cd 本工具所在文件夹 && python3 -m http.server 8137
     ```

     或双击 `start_mac.command`（首次可能被 macOS 拦截，见下方“常见问题”）
   - **Windows**：双击 `start_win.bat`（需已安装 Python），或在命令提示符执行 `python -m http.server 8137`
2. 浏览器打开 <http://localhost:8137>，把 MP3 / MP4 文件拖进页面，等待处理完成
3. 逐句试听 / 下载，或点「ZIP」打包下载

> 如果不小心双击打开了 index.html，页面顶部会显示一条**包含你实际文件夹路径、可直接复制**的启动命令，照做即可。

## 常见问题

- **Mac 双击 start_mac.command 提示“Apple 无法验证……是否安全”**：
  这是 macOS 对浏览器下载文件的隔离机制（Gatekeeper），不是脚本有问题。任选其一：
  - 在终端执行 `xattr -d com.apple.quarantine start_mac.command` 解除隔离，之后即可双击运行；
  - 或到「系统设置 → 隐私与安全性」底部点「仍要打开」；
  - 或干脆不用脚本，直接在终端运行上面的 `python3 -m http.server 8137` 命令；
  - 用 `git clone` 获取本仓库（而不是下载 ZIP）则完全不会有此问题。
- **首次处理时提示模型下载失败**：把页面上的「模型下载源」切换为 **hf-mirror 国内镜像** 后重试。

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
