import http.server
import socketserver
import urllib.request
import urllib.parse
import json
import re
import os

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

def search_youtube(query):
    try:
        encoded = urllib.parse.quote(query)
        url = f"https://www.youtube.com/results?search_query={encoded}"
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'th,en-US;q=0.9,en;q=0.8'
        })
        html = urllib.request.urlopen(req, timeout=6).read().decode('utf-8', errors='ignore')
        
        # Extract ytInitialData
        pattern = r'var ytInitialData = ({.*?});</script>'
        match = re.search(pattern, html)
        results = []
        
        if match:
            data = json.loads(match.group(1))
            contents = data.get('contents', {}).get('twoColumnSearchResultsRenderer', {}).get('primaryContents', {}).get('sectionListRenderer', {}).get('contents', [])
            for section in contents:
                item_section = section.get('itemSectionRenderer', {}).get('contents', [])
                for item in item_section:
                    vr = item.get('videoRenderer')
                    if vr:
                        vid_id = vr.get('videoId')
                        title_runs = vr.get('title', {}).get('runs', [])
                        title = title_runs[0].get('text', '') if title_runs else ''
                        channel_runs = vr.get('ownerText', {}).get('runs', [])
                        channel = channel_runs[0].get('text', '') if channel_runs else ''
                        views = vr.get('viewCountText', {}).get('simpleText', '')
                        published = vr.get('publishedTimeText', {}).get('simpleText', '')
                        length = vr.get('lengthText', {}).get('simpleText', '')
                        thumbnails = vr.get('thumbnail', {}).get('thumbnails', [])
                        thumb = thumbnails[-1]['url'] if thumbnails else f"https://i.ytimg.com/vi/{vid_id}/hqdefault.jpg"
                        
                        if vid_id and title:
                            results.append({
                                'id': vid_id,
                                'title': title,
                                'channel': channel,
                                'views': views,
                                'published': published,
                                'duration': length,
                                'thumbnail': thumb
                            })
        return results
    except Exception as e:
        print(f"Search error: {e}")
        return []

class AppHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/api/search':
            params = urllib.parse.parse_qs(parsed.query)
            query = params.get('q', [''])[0]
            results = search_youtube(query) if query else []
            
            response_bytes = json.dumps(results, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Length', str(len(response_bytes)))
            self.end_headers()
            self.wfile.write(response_bytes)
        else:
            super().do_GET()

if __name__ == "__main__":
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), AppHandler) as httpd:
        print(f"BossGuard 3000 Server running at http://localhost:{PORT}")
        httpd.serve_forever()
