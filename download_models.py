#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 Whisper 识别模型下载到本地 models/ 目录，之后工具直接本地加载、无需联网。

用法（在本工具目录下运行）:
    python3 download_models.py            # 下载 small 模型（默认）
    python3 download_models.py tiny       # 下载 tiny 模型
    python3 download_models.py --mirror   # 国内网络：改用 hf-mirror 镜像下载
    python3 download_models.py tiny base small   # 一次下载多个
"""
import argparse
import pathlib
import sys
import urllib.error
import urllib.request

FILES = [
    "config.json",
    "preprocessor_config.json",
    "tokenizer.json",
    "tokenizer_config.json",
    "generation_config.json",
    "onnx/encoder_model_quantized.onnx",
    "onnx/decoder_model_merged_quantized.onnx",
]
MODELS = ("tiny", "base", "small")
HERE = pathlib.Path(__file__).resolve().parent


def download(url: str, dest: pathlib.Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_name(dest.name + ".part")
    req = urllib.request.Request(url, headers={"User-Agent": "clip-generator/1.0"})
    with urllib.request.urlopen(req) as resp, open(tmp, "wb") as f:
        total = int(resp.headers.get("Content-Length") or 0)
        got = 0
        while True:
            block = resp.read(256 * 1024)
            if not block:
                break
            f.write(block)
            got += len(block)
            if total:
                print(f"\r  {dest.name}: {got * 100 // total}% "
                      f"({got // 1048576}MB / {total // 1048576}MB)", end="", flush=True)
    print()
    tmp.replace(dest)  # 完整下载成功才落盘为正式文件


def main() -> int:
    ap = argparse.ArgumentParser(description="下载 Whisper 模型到本地 models/ 目录")
    ap.add_argument("models", nargs="*", default=["small"], choices=MODELS,
                    help="要下载的模型（默认 small）")
    ap.add_argument("--mirror", action="store_true",
                    help="使用国内镜像 hf-mirror.com（HuggingFace 访问困难时用）")
    ap.add_argument("--base-url", default=None, help=argparse.SUPPRESS)
    args = ap.parse_args()

    host = args.base_url or ("https://hf-mirror.com" if args.mirror else "https://huggingface.co")
    models = args.models or ["small"]

    for model in models:
        repo = f"Xenova/whisper-{model}"
        out_dir = HERE / "models" / repo
        print(f"\n=== 下载 {repo} 到 {out_dir} ===")
        for fname in FILES:
            dest = out_dir / fname
            if dest.exists():
                print(f"  {dest.name}: 已存在，跳过")
                continue
            url = f"{host}/{repo}/resolve/main/{fname}"
            try:
                download(url, dest)
            except (urllib.error.URLError, OSError) as e:
                print(f"\n下载失败: {url}\n{e}", file=sys.stderr)
                if not args.mirror and not args.base_url:
                    print("提示：国内网络请加 --mirror 重试，例如：\n"
                          f"  python3 download_models.py {model} --mirror", file=sys.stderr)
                return 1
        print(f"=== {repo} 完成 ===")

    print("\n全部完成！重新打开工具页面即可本地加载模型（页面日志会显示“检测到本地模型”）。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
