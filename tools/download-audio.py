#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""离线发音批量下载脚本（edge-tts → static/audio/<首字母>/<word>.mp3）

用法:
  python tools/download-audio.py                 # 下载基础词典全部词（断点续传）
  python tools/download-audio.py --limit 1000    # 仅下载前 1000 词（按字母序）
  python tools/download-audio.py --workers 4     # 并发数（默认 4）

特性:
  - 断点续传：已存在且非空的 mp3 自动跳过，可随时中断重启
  - 失败重试 3 次，失败词写入 static/audio/_failed.txt
  - 按首字母分目录（a/…、b/…、数字/符号归 misc/），避免单目录海量文件
"""
import argparse
import asyncio
import os
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, 'static', 'audio')
FAIL_FILE = os.path.join(OUT_DIR, '_failed.txt')

ILLEGAL = re.compile(r'[\\/:*?"<>|]')


def word_key(word):
    """单词首字母 → 子目录；非字母归 misc"""
    c = word[0].lower()
    return c if ('a' <= c <= 'z') else 'misc'


def file_name(word):
    return ILLEGAL.sub('_', word)


def load_source_dict(words, source):
    """返回去重后的待下载词表（保持传入顺序）"""
    if source == 'cefr':
        txt = open(os.path.join(ROOT, 'data', 'internal', 'cefr-data.js'), encoding='utf-8').read()
        for lv in ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']:
            m = re.search(lv + r'\":\s*\[(.*?)\]', txt, re.S)
            if not m:
                continue
            for w in re.findall(r'"([^"]+)"', m.group(1)):
                w = w.strip().lower()
                if w and re.match(r'^[a-z][a-z\'-]*$', w):
                    words.add(w)
        return
    if source == 'both':
        load_source_dict(words, 'cefr')
        load_source_dict(words, 'dict')
        return
    # source == 'dict'：基础词典全部键
    txt = open(os.path.join(ROOT, 'data', 'englishwords-dict.json'), encoding='utf-8').read()
    for w in re.findall(r'"([a-zA-Z][a-zA-Z\'-]*)"\s*:', txt):
        w = w.strip().lower()
        if w:
            words.add(w)


def synth_word(word, voice, rate):
    """单词合成（同步包装），失败自动重试"""
    import edge_tts
    target = os.path.join(OUT_DIR, word_key(word), file_name(word) + '.mp3')
    if os.path.exists(target) and os.path.getsize(target) > 0:
        return 'skip'
    com = edge_tts.Communicate(word, voice, rate=rate)
    tmp = target + '.part'
    os.makedirs(os.path.dirname(target), exist_ok=True)
    last_err = None
    for attempt in range(3):
        try:
            asyncio.run(com.save(tmp))
            if os.path.getsize(tmp) <= 0:
                raise IOError('empty audio')
            os.replace(tmp, target)
            return 'ok'
        except Exception as e:
            last_err = e
            if os.path.exists(tmp):
                try:
                    os.remove(tmp)
                except OSError:
                    pass
            time.sleep(0.5 * (attempt + 1))
    print('  !! 失败 %r: %s' % (word, last_err), flush=True)
    return 'fail'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--source', choices=['dict', 'cefr', 'both'], default='dict',
                    help='词表来源：dict=基础词典(10万词), cefr=CEFR等级词, both=两者并集')
    ap.add_argument('--limit', type=int, default=0, help='最多下载词数，0=全部')
    ap.add_argument('--workers', type=int, default=4, help='并发数')
    ap.add_argument('--voice', default='en-GB-LibbyNeural', help='Edge 语音名')
    args = ap.parse_args()

    os.makedirs(OUT_DIR, exist_ok=True)
    words = set()
    load_source_dict(words, args.source)
    # 按字母排序，优先 a/b/c 开头常用词
    ordered = sorted(words)
    if args.limit:
        ordered = ordered[:args.limit]
    print('[下载] 词表=%s 待下载词数=%d 并发=%d 语音=%s' % (args.source, len(ordered), args.workers, args.voice), flush=True)

    done = 0
    skipped = 0
    failed = []
    t0 = time.time()
    idx = 0
    last_print = time.time()
    pending = {}
    ex = ThreadPoolExecutor(max_workers=args.workers)
    try:
        while idx < len(ordered) or pending:
            while len(pending) < args.workers * 2 and idx < len(ordered):
                w = ordered[idx]
                idx += 1
                pending[ex.submit(synth_word, w, args.voice, '+0%')] = w
            if not pending:
                break
            fut, w = next(iter(pending.items()))
            try:
                r = fut.result()
                if r == 'ok':
                    done += 1
                elif r == 'skip':
                    skipped += 1
                elif r == 'fail':
                    failed.append(w)
            except Exception as e:
                failed.append(w)
            del pending[fut]
            now = time.time()
            if now - last_print >= 5:
                el = now - t0
                total = done + skipped + len(failed)
                print('[进度] %d/%d 成功=%d 跳过=%d 失败=%d 用时%.0fs' %
                      (total, len(ordered), done, skipped, len(failed), el), flush=True)
                last_print = now
    finally:
        ex.shutdown(wait=True)

    if failed:
        with open(FAIL_FILE, 'w', encoding='utf-8') as f:
            f.write('\n'.join(failed))
    el = time.time() - t0
    print('[完成] 成功=%d 失败=%d 用时%.0fs' % (done, len(failed), el), flush=True)


if __name__ == '__main__':
    main()
