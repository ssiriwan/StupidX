"""Serve this checkout, binding before optionally opening the browser."""
import argparse
import functools
import http.server
import pathlib
import sys
import webbrowser


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--open", action="store_true")
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error("port must be between 1 and 65535")
    directory = pathlib.Path(__file__).resolve().parent.parent
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(directory))
    try:
        server = http.server.ThreadingHTTPServer(("127.0.0.1", args.port), handler)
    except OSError as error:
        print(f"Cannot start port {args.port}: {error}\nClose the previous server or choose --port 8001.")
        return 1
    url = f"http://localhost:{args.port}"
    print(f"Totally Working: {url}\nServing {directory}\nPress Ctrl+C to stop.", flush=True)
    if args.open:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
