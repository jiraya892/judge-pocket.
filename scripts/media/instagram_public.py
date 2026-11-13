"""Read a bounded public profile embed; never execute its JavaScript or log in."""
import json
import re
import urllib.parse
import urllib.request
from html.parser import HTMLParser


class PublicProfileError(RuntimeError):
    pass


class _Scripts(HTMLParser):
    def __init__(self):
        super().__init__()
        self.active = False
        self.buffer = []
        self.scripts = []

    def handle_starttag(self, tag, attrs):
        if tag == 'script':
            self.active = True
            self.buffer = []

    def handle_data(self, data):
        if self.active:
            self.buffer.append(data)

    def handle_endtag(self, tag):
        if tag == 'script' and self.active:
            self.scripts.append(''.join(self.buffer))
            self.active = False


def parse_profile_embed(document, profile, limit=5):
    if not re.fullmatch(r'[A-Za-z0-9._]{1,30}', profile) or not 1 <= limit <= 20:
        raise PublicProfileError('Invalid public username or listing limit')
    if len(document.encode('utf-8')) > 4 * 1024 * 1024:
        raise PublicProfileError('Public profile response is too large')
    parser = _Scripts()
    parser.feed(document)
    posts = {}
    visited = 0

    def walk(value, depth=0):
        nonlocal visited
        visited += 1
        if depth > 50 or visited > 100000:
            raise PublicProfileError('Public profile data exceeds the parsing limit')
        if isinstance(value, dict):
            media = value.get('shortcode_media')
            if isinstance(media, dict):
                owner = media.get('owner') or {}
                code = media.get('shortcode')
                if (owner.get('username', '').lower() == profile.lower()
                        and owner.get('is_private') is not True
                        and media.get('is_video') is True and isinstance(code, str)
                        and re.fullmatch(r'[A-Za-z0-9_-]{3,80}', code)):
                    caption = '\n'.join(e.get('node', {}).get('text', '') for e in
                                        media.get('edge_media_to_caption', {}).get('edges', []))
                    posts.setdefault(code, {'url': 'https://www.instagram.com/reel/' + code + '/',
                                            'creator': owner['username'], 'description': caption})
            for child in value.values():
                walk(child, depth + 1)
        elif isinstance(value, list):
            for child in value:
                walk(child, depth + 1)
        elif isinstance(value, str) and value.lstrip().startswith(('{', '[')):
            try:
                decoded = json.loads(value)
            except ValueError:
                return
            walk(decoded, depth + 1)

    for script in parser.scripts:
        try:
            decoded = json.loads(script)
        except ValueError:
            decoded = None
        if decoded is not None:
            walk(decoded)
        # The public embed also puts JSON inside a JS string literal. Decode
        # JSON strings only: eval, browser sessions and injected code are unused.
        for match in re.finditer(r'"(?:[^"\\]|\\.)*"', script):
            try:
                value = json.loads(match.group())
            except ValueError:
                continue
            if isinstance(value, str) and 'shortcode_media' in value:
                walk(value)
    if not posts:
        raise PublicProfileError('No public video listing could be confirmed in the embed')
    selected = list(posts.values())[:limit]
    return {'profile_url': 'https://www.instagram.com/' + profile + '/',
            'public_reels': [post['url'] for post in selected], 'posts': selected,
            'limit': limit, 'complete_account_index': False,
            'listing_source': 'public_profile_embed'}


def public_profile_embed(profile, limit):
    if not re.fullmatch(r'[A-Za-z0-9._]{1,30}', profile):
        raise PublicProfileError('Invalid public username')
    url = 'https://www.instagram.com/' + profile + '/embed/'
    with urllib.request.urlopen(url, timeout=25) as response:
        final = urllib.parse.urlsplit(response.url)
        if final.scheme != 'https' or final.hostname not in {'instagram.com', 'www.instagram.com'} or '/accounts/' in final.path:
            raise PublicProfileError('The public embed did not remain accessible without login')
        data = response.read(4 * 1024 * 1024 + 1)
    if len(data) > 4 * 1024 * 1024:
        raise PublicProfileError('Public profile response is too large')
    return parse_profile_embed(data.decode('utf-8'), profile, limit)
