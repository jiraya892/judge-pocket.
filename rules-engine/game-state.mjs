// Pocket Judge — Rules Engine Foundation (Module 1)
// Pure state primitives: no DOM, network, or application side effects.
// This is an initial model, NOT a complete implementation of MTG rules.
export const ZONES = Object.freeze(['library','hand','battlefield','graveyard','exile','stack','command','ante']);
export const CARD_TYPES = Object.freeze(['artifact','battle','creature','enchantment','instant','land','planeswalker','sorcery','kindred']);
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const copy = value => structuredClone(value);
export function createGame(playerIds) {
  assert(Array.isArray(playerIds) && playerIds.length >= 2, 'At least two players required');
  assert(playerIds.every(id => typeof id === 'string' && id.trim()), 'Player IDs must be nonempty strings');
  assert(new Set(playerIds).size === playerIds.length, 'Player IDs must be unique');
  return {version:1, players:Object.fromEntries(playerIds.map(id => [id,{id,life:20,poison:0,manaPool:[],lost:false}])),
    objects:{}, zones:Object.fromEntries(ZONES.map(zone => [zone,[]])), activePlayer:playerIds[0],
    turn:1, phase:'beginning', step:'untap', priorityPlayer:null, nextObjectId:1, events:[]};
}
export function addObject(state, spec) {
  assert(state && spec && typeof spec === 'object', 'State and object specification required');
  assert(state.players[spec.owner], 'Unknown owner');
  const controller=spec.controller ?? spec.owner;
  assert(state.players[controller], 'Unknown controller');
  const zone=spec.zone ?? 'library';
  assert(ZONES.includes(zone), 'Unknown zone');
  assert(typeof spec.name === 'string' && spec.name.trim(), 'Object name required');
  const next=copy(state), id='obj-'+next.nextObjectId++;
  next.objects[id]={id, name:spec.name, owner:spec.owner, controller, zone,
    cardId:spec.cardId ?? null, isToken:Boolean(spec.isToken), isCopy:Boolean(spec.isCopy),
    types:[...(spec.types??[])], subtypes:[...(spec.subtypes??[])],
    supertypes:[...(spec.supertypes??[])], colors:[...(spec.colors??[])],
    manaCost:spec.manaCost??null, basePower:spec.basePower??null, baseToughness:spec.baseToughness??null,
    tapped:Boolean(spec.tapped), counters:{...(spec.counters??{})}, abilities:[...(spec.abilities??[])]};
  next.zones[zone].push(id);
  return {state:next,id};
}
export function moveObject(state, id, toZone) {
  assert(ZONES.includes(toZone), 'Unknown destination zone');
  assert(state && state.objects, 'Invalid game state');
  const original=state.objects[id];
  assert(original, 'Unknown object');
  // Tokens cease to exist after leaving battlefield (state-based action).
  // This primitive only records the move; SBA handling belongs to a later module.
  assert(original.zone !== toZone, 'Source and destination must differ');
  const next=copy(state);
  next.zones[original.zone]=next.zones[original.zone].filter(x=>x!==id);
  next.zones[toZone].push(id);
  next.objects[id].zone=toZone;
  next.events.push({type:'zone-change',objectId:id,from:original.zone,to:toZone});
  return next;
}
export function validateGame(state) {
  const errors=[], seen=new Set();
  for(const zone of ZONES) for(const id of state.zones[zone]??[]) {
    if(seen.has(id)) errors.push('Duplicate object: '+id);
    seen.add(id);
    if(!state.objects[id]) errors.push('Missing object: '+id);
    else if(state.objects[id].zone!==zone) errors.push('Zone mismatch: '+id);
  }
  for(const id of Object.keys(state.objects)) if(!seen.has(id)) errors.push('Unzoned object: '+id);
  return {ok:errors.length===0,errors};
}
