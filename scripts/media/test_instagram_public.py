"""Offline parser tests; a successful fixture is not evidence of network access."""
import json
import unittest
from instagram_public import parse_profile_embed, PublicProfileError


def post(code, owner='rippullrepeat', video=True):
    return {'shortcode_media': {'shortcode': code, 'is_video': video,
            'owner': {'username': owner, 'is_private': False},
            'edge_media_to_caption': {'edges': [{'node': {'text': 'MTG ruling'}}]}}}


class PublicEmbedTests(unittest.TestCase):
    def test_json_in_js_string_is_read_without_executing_js(self):
        document = '<script>doNotExecute(' + json.dumps(json.dumps(post('ABC_123'))) + ');</script>'
        result = parse_profile_embed(document, 'rippullrepeat')
        self.assertEqual(result['public_reels'], ['https://www.instagram.com/reel/ABC_123/'])
        self.assertFalse(result['complete_account_index'])

    def test_unrelated_creators_photos_and_private_data_are_excluded(self):
        private = post('PRIVATE');private['shortcode_media']['owner']['is_private'] = True
        document = '<script type="application/json">' + json.dumps([post('ABC_123'), post('OTHER', 'other'), post('PHOTO', video=False), private]) + '</script>'
        self.assertEqual(len(parse_profile_embed(document, 'rippullrepeat')['public_reels']), 1)

    def test_duplicate_posts_and_listing_limit(self):
        document = '<script>' + json.dumps([post('ABC_123'), post('ABC_123'), post('DEF_456')]) + '</script>'
        self.assertEqual(len(parse_profile_embed(document, 'rippullrepeat', 1)['public_reels']), 1)

    def test_invalid_shortcodes_do_not_create_links(self):
        with self.assertRaises(PublicProfileError):
            parse_profile_embed('<script>' + json.dumps(post('../../accounts/login')) + '</script>', 'rippullrepeat')

    def test_empty_or_changed_embed_is_explicitly_unavailable(self):
        for document in ['', '<script>loginRequired()</script>', '<script>{not_json}</script>']:
            with self.subTest(document=document), self.assertRaises(PublicProfileError):
                parse_profile_embed(document, 'rippullrepeat')

    def test_input_and_response_limits(self):
        for profile, limit in [('bad/name', 5), ('rippullrepeat', 21), ('rippullrepeat', 0)]:
            with self.subTest(profile=profile, limit=limit), self.assertRaises(PublicProfileError):
                parse_profile_embed('', profile, limit)
        with self.assertRaises(PublicProfileError):
            parse_profile_embed('x' * (4 * 1024 * 1024 + 1), 'rippullrepeat')


if __name__ == '__main__':
    unittest.main()
