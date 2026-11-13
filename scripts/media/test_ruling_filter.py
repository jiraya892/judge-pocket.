"""Authored topic fixtures, not claims of successful speech/video extraction."""
import json
import tempfile
import unittest
from pathlib import Path
from ruling_filter import create_candidate_draft, screen_ruling_content
from intake import card_candidates


def segments(*texts):
    return [{'id': i, 'text': text, 'start_seconds': i, 'end_seconds': i + 1}
            for i, text in enumerate(texts)]


class RulingFilterTests(unittest.TestCase):
    def test_english_rules_clip_is_shortlisted_with_spoken_evidence(self):
        result = screen_ruling_content(segments('An MTG ruling: rule 613.8 determines dependencies.'), {})
        self.assertEqual(result['decision'], 'ruling_candidate')
        self.assertEqual(result['evidence'][0]['segment_id'], 0)
        self.assertFalse(result['ruling_verified'])
        self.assertFalse(result['engine_probe_allowed'])

    def test_italian_rules_clip_does_not_need_the_english_word_ruling(self):
        result = screen_ruling_content(segments('In Magic queste abilità innescate seguono le regole della pila.'), {})
        self.assertEqual(result['decision'], 'ruling_candidate')

    def test_interaction_without_literal_rule_word_is_a_candidate(self):
        result = screen_ruling_content(segments('In MTG can I target a creature with protection from red?'), {})
        self.assertEqual(result['decision'], 'ruling_candidate')

    def test_real_observed_topics_can_be_shortlisted_without_the_word_mtg(self):
        result = screen_ruling_content(segments('Dr. Beverly Crusher: whenever you gain life, this triggered ability triggers an additional time.'), {},
                                       [{'name': 'Dr. Beverly Crusher', 'evidence_segments': [0]}])
        self.assertEqual(result['decision'], 'ruling_candidate')

    def test_game_cue_can_precede_rule_explanation(self):
        result = screen_ruling_content(segments('Welcome back to Magic.', 'Today a ruling about triggered abilities.'), {})
        self.assertEqual(result['decision'], 'ruling_candidate')

    def test_unconfirmed_multiword_card_is_only_a_domain_clue(self):
        result = screen_ruling_content(segments('Silver Knight has protection from red. Can I target it?'), {},
                                       [{'name': 'Silver Knight', 'evidence_segments': [0], 'confirmed': False}])
        self.assertEqual(result['decision'], 'ruling_candidate')
        self.assertFalse(result['topic_confirmed'])

    def test_pack_opening_with_channel_hashtags_is_ignored(self):
        result = screen_ruling_content(segments('Welcome to this MTG pack opening. We are opening these boosters and hoping for valuable cards today.'),
                                       {'description': '#mtg #rules #ruling'})
        self.assertEqual(result['decision'], 'excluded')

    def test_promotion_without_rules_is_ignored(self):
        result = screen_ruling_content(segments('Usa il codice sconto per comprare queste carte Magic nel negozio e partecipare al giveaway di oggi.'), {})
        self.assertEqual(result['decision'], 'excluded')

    def test_rule_explained_during_opening_is_kept(self):
        result = screen_ruling_content(segments('Welcome to this MTG pack opening.', 'This ruling explains how triggered abilities use the stack.'), {})
        self.assertEqual(result['decision'], 'ruling_candidate')

    def test_giveaway_rules_are_not_magic_rulings(self):
        result = screen_ruling_content(segments('Here are the rules of our giveaway for these Magic cards. Enter today and win this prize.'), {})
        self.assertEqual(result['decision'], 'excluded')

    def test_caption_alone_cannot_confirm_or_exclude_a_rule_video(self):
        result = screen_ruling_content([], {'description': 'MTG ruling: Blood Moon and Ashaya'})
        self.assertEqual(result['decision'], 'needs_review')

    def test_mtg_names_alone_and_generic_rules_remain_ambiguous(self):
        for text in ['Magic has many wonderful new cards.', 'The rules of the giveaway are simple.', 'Shock! These rules surprised me.']:
            with self.subTest(text=text):
                result = screen_ruling_content(segments(text), {}, [{'name': 'Shock', 'evidence_segments': [0]}])
                self.assertEqual(result['decision'], 'needs_review')

    def test_disagreement_with_description_requires_review(self):
        result = screen_ruling_content(segments('Welcome to this MTG pack opening. We will open some boosters and show all the cards inside today.'),
                                       {'description': 'In questo video spiego le regole di Magic.'})
        self.assertEqual(result['decision'], 'needs_review')

    def test_only_rule_candidates_receive_a_case_draft(self):
        fixtures = [
            ('MTG ruling: Shock targets Silver Knight, which has protection from red.', True, 'needs_review'),
            ('Welcome to this Magic pack opening. Today we will open many boosters and look for valuable new cards.', False, 'ignored_non_ruling'),
            ('These are my favourite Magic cards.', False, 'needs_topic_review'),
        ]
        for text, expected_draft, status in fixtures:
            with self.subTest(text=text), tempfile.TemporaryDirectory() as directory:
                folder = Path(directory)
                result = create_candidate_draft(folder, {}, segments(text),
                                                card_candidates(segments(text),
                                                    {'cards': [['Shock', '01'], ['Silver Knight', '02']]}))
                self.assertEqual(result['case_status'], status)
                self.assertEqual((folder / 'case-draft.json').exists(), expected_draft)
                self.assertFalse(json.loads((folder / 'relevance.json').read_text())['engine_probe_allowed'])
                if expected_draft:
                    draft = json.loads((folder / 'case-draft.json').read_text())
                    self.assertFalse(draft['creator_claim_verified'])
                    self.assertTrue(all(not card['confirmed'] for card in draft['candidate_cards']))


if __name__ == '__main__':
    unittest.main()
