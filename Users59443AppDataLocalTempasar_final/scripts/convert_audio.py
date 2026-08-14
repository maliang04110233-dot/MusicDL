#!/usr/bin/env python3
"""
MusicDL 音频格式转换脚本（直接调用 FFmpeg 命令行）
支持格式：mp3, flac, aac, m4a, ogg, wav
用法：python convert_audio.py <input_path> <output_format> <bitrate>
  output_format: mp3 | flac | aac | m4a | ogg | wav
  bitrate:       如 320k / 256k / 192k（mp3/aac/ogg 用）
返回 JSON: {success, output_path?, error?, original_size?, converted_size?}
"""

import json
import sys
import os
import shutil
import subprocess
import tempfile

# ── FFmpeg 路径探测（Windows）───────────────────────────────────────────────
def find_ffmpeg():
    """查找 FFmpeg 可执行文件路径"""
    # 1. 环境变量
    for env_name in ['FFMPEG_BINARY', 'FFMPEG_PATH']:
        val = os.environ.get(env_name, '')
        if val:
            if os.path.isfile(val) and os.access(val, os.X_OK):
                return val
            which = shutil.which(val)
            if which:
                return which

    # 2. 系统 PATH
    found = shutil.which('ffmpeg')
    if found:
        return found

    # 3. Windows 常见安装路径（Essentials Build 最常见）
    win_paths = [
        r'C:\\ffmpeg\\ffmpeg-8.1-essentials_build\\bin\\ffmpeg.exe',
        r'C:\\ffmpeg\\bin\\ffmpeg.exe',
        r'C:\\ffmpeg\\ffmpeg.exe',
        r'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
        r'C:\\Program Files (x86)\\ffmpeg\\bin\\ffmpeg.exe',
    ]
    for p in win_paths:
        if os.path.isfile(p) and os.access(p, os.X_OK):
            return p

    return None


# ── FFmpeg 转码参数映射────────────────────────────────────────────────────
def build_ffmpeg_args(ffmpeg_bin: str, input_path: str, output_path: str,
                      output_format: str, bitrate: str) -> list:
    """构建 FFmpeg 命令行参数"""
    args = [ffmpeg_bin, '-y', '-hide_banner', '-i', input_path]

    fmt = output_format.lower()

    if fmt == 'mp3':
        args += ['-codec:a', 'libmp3lame', '-b:a', bitrate]
    elif fmt in ('aac', 'm4a'):
        args += ['-codec:a', 'aac', '-b:a', bitrate]
    elif fmt == 'flac':
        args += ['-codec:a', 'flac']
    elif fmt == 'ogg':
        args += ['-codec:a', 'libvorbis', '-q:a', '4']
    elif fmt == 'wav':
        args += ['-codec:a', 'pcm_s16le']
    else:
        # 通用：尝试 copy 或自动选择
        args += ['-codec:a', 'copy']

    args.append(output_path)
    return args


def convert_audio(input_path: str, output_format: str, bitrate: str = '320k') -> dict:
    """执行音频格式转换，返回 {success, output_path, error?, original_size?, converted_size?}"""

    ffmpeg_bin = find_ffmpeg()
    if not ffmpeg_bin:
        return {'success': False, 'error': '找不到 FFmpeg，请安装 FFmpeg 后重试'}

    if not os.path.isfile(input_path):
        return {'success': False, 'error': f'文件不存在: {input_path}'}

    original_size = os.path.getsize(input_path)
    result = {'success': False, 'original_size': original_size}

    # 构建输出路径（在同目录下换扩展名）
    base = os.path.splitext(input_path)[0]
    output_path = base + '.' + output_format.lower()

    # 临时文件（避免转换失败时覆盖原文件）
    tmp_fd, tmp_path = tempfile.mkstemp(suffix='.' + output_format.lower())
    os.close(tmp_fd)

    try:
        args = build_ffmpeg_args(ffmpeg_bin, input_path, tmp_path, output_format, bitrate)
        proc = subprocess.run(
            args,
            capture_output=True,
            timeout=300,   # 最多 5 分钟
        )

        if proc.returncode != 0:
            stderr = proc.stderr.decode('utf-8', errors='replace').strip()
            raise RuntimeError(f'FFmpeg 转换失败 (code={proc.returncode}):\n{stderr[-500:]}')

        # 验证输出文件
        if not os.path.exists(tmp_path) or os.path.getsize(tmp_path) == 0:
            raise RuntimeError('FFmpeg 未生成输出文件')

        # 成功 → 移动到目标路径
        if os.path.exists(output_path):
            os.remove(output_path)
        shutil.move(tmp_path, output_path)

        converted_size = os.path.getsize(output_path)
        result['success'] = True
        result['output_path'] = output_path
        result['converted_size'] = converted_size

    except subprocess.TimeoutExpired:
        result['error'] = '转换超时（超过 5 分钟），文件可能过大'
        if os.path.exists(tmp_path):
            try: os.remove(tmp_path)
            except: pass

    except Exception as e:
        result['error'] = str(e)
        if os.path.exists(tmp_path):
            try: os.remove(tmp_path)
            except: pass

    return result


def main():
    if len(sys.argv) < 4:
        print(json.dumps({
            'success': False,
            'error': f'参数不足，用法: convert_audio.py <input_path> <output_format> <bitrate>'
        }, ensure_ascii=False))
        sys.exit(1)

    input_path = sys.argv[1]
    output_format = sys.argv[2]
    bitrate = sys.argv[3]

    result = convert_audio(input_path, output_format, bitrate)
    print(json.dumps(result, ensure_ascii=False))


if __name__ == '__main__':
    main()
