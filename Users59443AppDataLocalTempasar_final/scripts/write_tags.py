#!/usr/bin/env python3
"""
MusicDL 音频标签写入工具（基于 mutagen）
支持格式：MP3, M4A, FLAC, OGG, WAV, WMA
用法：python write_tags.py <filepath> <json_metadata>

json_metadata 格式：
{
  "title": "歌曲名",
  "artist": "歌手",
  "album": "专辑",
  "cover_url": "http://..."  或 "",
  "lrc": "[00:00.00]歌词..."
}
"""

import json
import sys
import os
import urllib.request
import tempfile


def write_tags(filepath: str, meta: dict) -> dict:
    """写入音频标签，返回 {success, error?, format}"""
    from mutagen import File as MutagenFile
    from mutagen.id3 import ID3, APIC, USLT, TIT2, TPE1, TALB, TDRC, TCON
    from mutagen.flac import FLAC, Picture
    from mutagen.mp4 import MP4, MP4Cover

    ext = os.path.splitext(filepath)[1].lower()
    result = {"success": False, "format": ext, "error": None}

    try:
        # 下载封面到临时文件
        cover_data = None
        cover_mime = 'image/jpeg'
        
        # 本地封面路径（从 localLibrary.js writeAudioCover 传入）
        if meta.get('cover_path'):
            with open(meta['cover_path'], 'rb') as f:
                cover_data = f.read()
            # 根据文件扩展名判断 mime
            cp = meta['cover_path'].lower()
            if cp.endswith('.png'): cover_mime = 'image/png'
            elif cp.endswith('.webp'): cover_mime = 'image/webp'
            elif cp.endswith('.gif'): cover_mime = 'image/gif'
        
        # 远程封面 URL
        elif meta.get('cover_url'):
            try:
                req = urllib.request.Request(
                    meta['cover_url'],
                    headers={'User-Agent': 'MusicDL/1.0'}
                )
                with urllib.request.urlopen(req, timeout=15) as resp:
                    cover_data = resp.read()
                    ct = resp.headers.get('Content-Type', '')
                    if ct in ('image/jpeg', 'image/png', 'image/webp', 'image/gif'):
                        cover_mime = ct
            except Exception as e:
                print(f"[warn] 封面下载失败: {e}", file=sys.stderr)

        # === MP3: 使用 ID3v2.4 ===
        if ext == '.mp3':
            try:
                audio = ID3(filepath)
            except Exception:
                audio = ID3()

            if meta.get('title'):
                audio['TIT2'] = TIT2(encoding=3, text=meta['title'])
            if meta.get('artist'):
                audio['TPE1'] = TPE1(encoding=3, text=meta['artist'])
            if meta.get('album'):
                audio['TALB'] = TALB(encoding=3, text=meta['album'])

            if meta.get('lrc'):
                audio['USLT'] = USLT(
                    encoding=3, lang='chi', desc='', text=meta['lrc']
                )

            if cover_data:
                audio['APIC'] = APIC(
                    encoding=3, mime=cover_mime, type=3, desc='Cover',
                    data=cover_data
                )

            audio.save(filepath)
            result['success'] = True

        # === M4A: 使用 MP4 标签 ===
        elif ext in ('.m4a', '.mp4'):
            audio = MP4(filepath)
            if meta.get('title'):
                audio['\xa9nam'] = [meta['title']]
            if meta.get('artist'):
                audio['\xa9ART'] = [meta['artist']]
            if meta.get('album'):
                audio['\xa9alb'] = [meta['album']]
            if meta.get('lrc'):
                audio['\xa9lyr'] = [meta['lrc']]

            if cover_data:
                cover_format = MP4Cover.FORMAT_JPEG
                if cover_mime == 'image/png':
                    cover_format = MP4Cover.FORMAT_PNG
                audio['covr'] = [MP4Cover(cover_data, cover_format)]

            audio.save()
            result['success'] = True

        # === FLAC: 使用 Vorbis Comments ===
        elif ext == '.flac':
            audio = FLAC(filepath)
            if meta.get('title'):
                audio['TITLE'] = meta['title']
            if meta.get('artist'):
                audio['ARTIST'] = meta['artist']
            if meta.get('album'):
                audio['ALBUM'] = meta['album']
            if meta.get('lrc'):
                audio['LYRICS'] = meta['lrc']

            if cover_data:
                pic = Picture()
                pic.type = 3
                pic.mime = cover_mime
                pic.desc = 'Cover'
                pic.data = cover_data
                pic.width = 0
                pic.height = 0
                pic.depth = 0
                audio.add_picture(pic)

            audio.save()
            result['success'] = True

        # === OGG / WAV / WMA: 通用写入（试用） ===
        else:
            audio = MutagenFile(filepath, easy=True)
            if audio is None:
                result['error'] = f'不支持的格式: {ext}'
                return result

            if meta.get('title'):
                audio['title'] = meta['title']
            if meta.get('artist'):
                audio['artist'] = meta['artist']
            if meta.get('album'):
                audio['album'] = meta['album']

            audio.save()
            result['success'] = True
            result['format'] = ext
            result['note'] = 'easy mode (no cover/lyrics for this format)'

    except Exception as e:
        result['error'] = str(e)
        print(f"[error] mutagen 写入失败: {e}", file=sys.stderr)

    return result


def main():
    if len(sys.argv) < 3:
        print(json.dumps({"success": False, "error": "参数不足: filepath json_metadata"}))
        sys.exit(1)

    filepath = sys.argv[1]
    meta = json.loads(sys.argv[2])
    result = write_tags(filepath, meta)
    print(json.dumps(result, ensure_ascii=False))


if __name__ == '__main__':
    main()
