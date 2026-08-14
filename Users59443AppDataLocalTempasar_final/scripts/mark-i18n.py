#!/usr/bin/env python3
"""
自动给 HTML 添加 data-i18n 标记。
策略：扫描 HTML 中的文本节点，精确匹配 zh.json 的 value，
在父元素上添加 data-i18n="key" 属性。

用法：python3 scripts/mark-i18n.py <html-file>
"""
import json
import re
import sys

# ── 配置 ────────────────────────────────────────────────
PROJECT = r"C:\Users\59443\WorkBuddy\2026-06-06-19-21-10\music-downloader_backup_20260623"

with open(f"{PROJECT}/src/renderer/js/lang/zh.json", 'r', encoding='utf-8') as f:
    zh = json.load(f)

# 反向索引：value → key
value_to_key = {v: k for k, v in zh.items()}

# 需要跳过的元素（已有 data-i18n，或包含动态内容）
SKIP_TAGS = {'script', 'style', 'template'}
SKIP_ATTRS = {'data-i18n'}


def should_skip_element(tag, attrs):
    """跳过已标记或包含动态内容的元素"""
    if tag.lower() in SKIP_TAGS:
        return True
    for attr in SKIP_ATTRS:
        if attr in attrs:
            return True
    return False


def is_exact_match(text):
    """检查文本是否精确匹配某个 zh value"""
    text = text.strip()
    if not text or len(text) < 2:
        return None
    return value_to_key.get(text)


def process_html(html):
    """用正则扫描 HTML，找到匹配的文本节点并添加 data-i18n"""
    # 策略：找 <tag ...>TEXT</tag> 形式的行
    # 对每个匹配尝试添加 data-i18n 到父元素
    result = html
    applied = []

    # 匹配标签内的纯文本内容
    for tag_name in ['span', 'button', 'a', 'label', 'option', 'h1', 'h2', 'h3', 'h4', 'p', 'div', 'li', 'td', 'th']:
        pattern = re.compile(
            rf'<({tag_name})([^>]*?)>([^<{{}}]*)\</{tag_name}>',
            re.IGNORECASE | re.DOTALL
        )
        for match in pattern.finditer(result):
            full_match = match.group(0)
            opening_tag = match.group(1)
            attrs = match.group(2)
            text = match.group(3).strip()

            # 跳过已有 data-i18n 的
            if 'data-i18n' in attrs:
                continue

            key = is_exact_match(text)
            if key:
                # 构建新标签
                new_attrs = attrs.rstrip() + f' data-i18n="{key}"'
                new_tag = f'<{opening_tag}{new_attrs}>{match.group(3)}</{tag_name}>'
                result = result.replace(full_match, new_tag, 1)
                applied.append(key)

    return result, applied


def main():
    if len(sys.argv) < 2:
        print("用法: mark-i18n.py <html-file>")
        sys.exit(1)

    html_path = sys.argv[1]

    with open(html_path, 'r', encoding='utf-8') as f:
        html = f.read()

    result, applied = process_html(html)

    print(f"已标记 {len(applied)} 处 data-i18n")
    for k in applied:
        print(f"  + {k}")

    # 显示未匹配的 key（可能有文本格式差异）
    matched_keys = set(applied)
    unmatched = [k for k in zh.keys() if k not in matched_keys]
    if unmatched:
        print(f"\n未匹配 {len(unmatched)} 个 key（可能是 HTML 结构复杂或文本不精确）")

    # 覆盖原文件
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(result)
    print(f"\n已更新: {html_path}")


if __name__ == '__main__':
    main()
