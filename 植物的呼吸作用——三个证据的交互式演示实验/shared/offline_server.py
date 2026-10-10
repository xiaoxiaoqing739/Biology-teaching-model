#!/usr/bin/env python3
"""植物呼吸作用演示实验的本地离线服务。"""

from __future__ import annotations

import functools
import http.server
import json
import os
import signal
import socketserver
import sys
import tempfile
import threading
import time
import webbrowser
from pathlib import Path


APP_ID = "plant-respiration-three-evidence-lab"


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript; charset=utf-8",
        ".mjs": "text/javascript; charset=utf-8",
        ".json": "application/json; charset=utf-8",
    }

    def log_message(self, _format: str, *_args: object) -> None:
        return

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()


class ReusableThreadingServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def runtime_file() -> Path:
    return Path(tempfile.gettempdir()) / f"{APP_ID}-{os.getuid()}.json"


def process_alive(pid: int) -> bool:
    try:
        os.kill(pid, 0)
        return True
    except (OSError, ProcessLookupError):
        return False


def reuse_running_server(project: Path) -> bool:
    state_file = runtime_file()
    if not state_file.exists():
        return False
    try:
        state = json.loads(state_file.read_text(encoding="utf-8"))
        pid = int(state["pid"])
        port = int(state["port"])
        same_project = Path(state["project"]).resolve() == project
    except (OSError, ValueError, KeyError, json.JSONDecodeError):
        return False
    if not same_project or not process_alive(pid):
        return False
    url = f"http://127.0.0.1:{port}/index.html"
    print(f"已复用正在运行的离线服务：{url}")
    if os.environ.get("OFFLINE_LAB_NO_BROWSER") != "1":
        webbrowser.open(url, new=2)
    return True


def main() -> int:
    project = Path(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).parents[1]).resolve()
    index = project / "index.html"
    if not index.is_file():
        print(f"启动失败：找不到 {index}")
        return 1
    if reuse_running_server(project):
        return 0

    handler = functools.partial(QuietHandler, directory=str(project))
    server = ReusableThreadingServer(("127.0.0.1", 0), handler)
    port = int(server.server_address[1])
    state_file = runtime_file()
    state_file.write_text(
        json.dumps({"pid": os.getpid(), "port": port, "project": str(project)}, ensure_ascii=False),
        encoding="utf-8",
    )

    stopped = False

    def stop_server(_signum: int, _frame: object) -> None:
        nonlocal stopped
        if stopped:
            return
        stopped = True
        threading.Thread(target=server.shutdown, daemon=True).start()

    signal.signal(signal.SIGTERM, stop_server)
    signal.signal(signal.SIGINT, stop_server)
    url = f"http://127.0.0.1:{port}/index.html"
    print("植物的呼吸作用——三个证据的交互式演示实验")
    print(f"离线地址：{url}")
    print("请保持此窗口运行；按 Control+C 或双击“停止离线服务.command”即可停止。")
    time.sleep(0.25)
    if os.environ.get("OFFLINE_LAB_NO_BROWSER") != "1":
        webbrowser.open(url, new=2)
    try:
        server.serve_forever(poll_interval=0.25)
    finally:
        server.server_close()
        try:
            current = json.loads(state_file.read_text(encoding="utf-8"))
            if int(current.get("pid", -1)) == os.getpid():
                state_file.unlink(missing_ok=True)
        except (OSError, ValueError, json.JSONDecodeError):
            pass
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
