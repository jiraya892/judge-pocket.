"""Source-grounded proposal validation; never a Magic ruling evaluator."""
import json
from pathlib import Path
import re

ROOT=Path(__file__).resolve().parent.parent
SCHEMA=json.loads((ROOT/'data/ai/scene-schema.json').read_text())
PHASES={'beginning','precombatMain','combat','postcombatMain','ending','main','unknown'}
STEPS={'untap','upkeep','draw','beginCombat','declareAttackers','declareBlockers','firstStrikeDamage','combatDamage','endCombat','endStep','cleanup','unknown'}

class InvalidProposal(ValueError): pass

def strict_json(text):
    def pairs(items):
        result={}
        for key,value in items:
            if key in result: raise InvalidProposal('Duplicate JSON key')
            result[key]=value
        return result
    return json.loads(text,object_pairs_hook=pairs,parse_constant=lambda value:(_ for _ in ()).throw(InvalidProposal('Non-finite number')))

def schema_check(value,schema,path='$'):
    if 'anyOf' in schema:
        if any(not schema_check(value,s,path) for s in schema['anyOf']): return []
        return [path+': invalid type']
    kind='null' if value is None else 'boolean' if isinstance(value,bool) else 'integer' if isinstance(value,int) else 'string' if isinstance(value,str) else 'array' if isinstance(value,list) else 'object' if isinstance(value,dict) else 'unknown'
    if schema.get('type')!=kind: return [path+': invalid type']
    if 'enum' in schema and value not in schema['enum']: return [path+': invalid enum']
    if kind=='string' and (len(value)<schema.get('minLength',0) or len(value)>schema.get('maxLength',10**9) or 'pattern' in schema and not re.search(schema['pattern'],value)): return [path+': invalid string']
    if kind=='integer' and not schema.get('minimum',-9007199254740991)<=value<=schema.get('maximum',9007199254740991): return [path+': invalid number']
    if kind=='array':
        if not schema.get('minItems',0)<=len(value)<=schema.get('maxItems',10**9): return [path+': invalid item count']
        return [error for i,item in enumerate(value) for error in schema_check(item,schema['items'],f'{path}[{i}]')]
    if kind=='object':
        properties=schema.get('properties',{})
        if any(k not in value for k in schema.get('required',[])) or schema.get('additionalProperties') is False and any(k not in properties for k in value):return [path+': missing or unexpected field']
        return [error for key,item in value.items() if key in properties for error in schema_check(item,properties[key],path+'.'+key)]
    return []

def validate(proposal,text):
    errors=schema_check(proposal,SCHEMA)
    if errors: raise InvalidProposal('; '.join(errors[:5]))
    ids={c['id'] for c in proposal['cards']}
    if len(ids)!=len(proposal['cards']):errors.append('Duplicate card identifiers')
    quotes=[c['quote'] for c in proposal['cards']]+[f['quote'] for f in proposal['facts']]+[u['quote'] for u in proposal['unresolved']]+[proposal['event']['quote'],proposal['question']]
    covered=[False]*len(text)
    for quote in filter(None,quotes):
        positions=[m.start() for m in re.finditer(re.escape(quote),text)]
        if not positions:errors.append('Evidence not in original text');continue
        for at in positions:covered[at:at+len(quote)]=[True]*len(quote)
    if any(char.isalnum() and not covered[i] for i,char in enumerate(text)):errors.append('Unrepresented source content')
    for card in proposal['cards']:
        if card['mention'] not in card['quote'] or card['mention'] not in text:errors.append('Card mention not grounded')
    for fact in proposal['facts']:
        if fact['card'] is not None and fact['card'] not in ids:errors.append('Unknown fact entity')
        if fact['kind'] in {'controller','owner','active_player','event_player'} and fact['value'] not in {None,'self','opponent','unknown'}:errors.append('Invalid player')
        if fact['kind']=='zone' and fact['value'] not in {None,'unknown','battlefield','stack','hand','graveyard','exile','library','command'}:errors.append('Invalid zone')
        if fact['kind']=='phase' and fact['value'] not in PHASES:errors.append('Invalid phase')
        if fact['kind']=='step' and fact['value'] not in STEPS:errors.append('Invalid step')
        if fact['kind'] in {'damage','counter_plus1','counter_minus1','life_gained_this_turn','stack_position','copies'} and (type(fact['value']) is not int or fact['value']<0):errors.append('Invalid quantity')
        if fact['kind']=='tapped' and not isinstance(fact['value'],bool):errors.append('Invalid tapped state')
        if fact['kind'] in {'controller','owner','zone','damage','counter_plus1','counter_minus1','tapped','stack_position','copies','previous_cast'} and fact['card'] is None:errors.append('Missing card for fact')
        if fact['kind']=='controller' and fact['value'] not in {None,'unknown'} and not fact['negated'] and re.search(r'\b(non controllo|non controlla|do not control|don.t control|does not control)\b',fact['quote'],re.I):errors.append('Negation changed into positive control')
    event=proposal['event']
    if any(ref is not None and ref not in ids for ref in [event['actor'],event['target']]):errors.append('Unknown event entity')
    if event['type'] in {'enter','cast','combat','block','attack','resolve'} and event['actor'] is None:errors.append('Missing event actor')
    if event['type'] in {'combat','block'} and (event['target'] is None or event['target']==event['actor']):errors.append('Invalid blocker')
    if event['type']!='unknown' and not event['quote']:errors.append('Missing event evidence')
    for match in re.finditer(r'\b(\d+)\s*(danni|segnalini|punti vita|vite|damage|counters|life)\b',text,re.I):
        if match.start() and text[match.start()-1] in '/+−-':continue
        phrase=match.group(0)
        if not any(phrase in c['mention'] for c in proposal['cards']) and not any(type(f['value']) is int and f['value']==int(match[1]) and phrase in f['quote'] for f in proposal['facts']) and not any(phrase in u['quote'] for u in proposal['unresolved']):errors.append('Unrepresented quantity')
    if errors:raise InvalidProposal('; '.join(errors[:5]))
    return proposal
