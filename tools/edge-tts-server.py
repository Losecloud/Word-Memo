#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Edge 神经语音本地网关
用法:  pip install edge-tts && python tools/edge-tts-server.py
监听:  http://127.0.0.1:8890
  GET /ping                      -> {"ok":true}
  GET /tts?voice=en-GB-LibbyNeural&text=hello&rate=%2B0%25  -> mp3 音频
音频按 voice+text+rate 缓存到 tools/.tts-cache/，重复发音零网络开销。
"""
import asyncio
import hashlib
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.tts-cache')
PORT = int(os.environ.get('EDGE_TTS_PORT', '8890'))


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.send_header('Content-Length', '0')
        self.end_headers()

    def do_GET(self):
        try:
            u = urlparse(self.path)
            q = parse_qs(u.query)
            if u.path == '/ping':
                body = b'{"ok":true}'
                self.send_response(200)
                self._cors()
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return
            if u.path != '/tts':
                self.send_response(404)
                self._cors()
                self.send_header('Content-Length', '0')
                self.end_headers()
                return
            text = (q.get('text', [''])[0] or '').strip()
            voice = (q.get('voice', ['en-GB-LibbyNeural'])[0] or '').strip()
            rate = (q.get('rate', ['+0%'])[0] or '').strip()
            if not text:
                raise ValueError('empty text')
            key = hashlib.md5(('%s|%s|%s' % (voice, text, rate)).encode('utf-8')).hexdigest()
            os.makedirs(CACHE_DIR, exist_ok=True)
            path = os.path.join(CACHE_DIR, key + '.mp3')
            if not os.path.exists(path) or os.path.getsize(path) == 0:
                asyncio.run(self._synth(text, voice, rate, path))
            with open(path, 'rb') as f:
                data = f.read()
            self.send_response(200)
            self._cors()
            self.send_header('Content-Type', 'audio/mpeg')
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(data)
        except Exception as e:
            body = json.dumps({'error': str(e)}).encode('utf-8')
            self.send_response(500)
            self._cors()
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)

    async def _synth(self, text, voice, rate, path):
        import edge_tts
        com = edge_tts.Communicate(text, voice, rate=rate)
        await com.save(path)


if __name__ == '__main__':
    print('Edge TTS gateway listening on http://127.0.0.1:%d' % PORT, flush=True)
    ThreadingHTTPServer(('127.0.0.1', PORT), Handler).serve_forever()
