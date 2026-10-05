// ALL game balance/content lives here. systems.js / ui.js must not hardcode numbers.
export const SAVE_VERSION = 4;

export const WEAPONS = {
  kitchen_knife: { id:'kitchen_knife', name:'Kitchen Knife', kind:'knife', damage:12, crit:0.15, stamina:8, durability:40, stun:0.05, ap:0, noise:5, price:0, desc:'Fast, high crit, low damage. Quiet.' },
  baseball_bat: { id:'baseball_bat', name:'Baseball Bat', kind:'blunt', damage:16, crit:0.10, stamina:12, durability:50, stun:0.28, ap:0, noise:15, price:40, desc:'Medium damage, high stun, knockback.' },
  crowbar:      { id:'crowbar', name:'Crowbar', kind:'tool', damage:14, crit:0.12, stamina:10, durability:70, stun:0.10, ap:0.5, noise:10, price:50, canOpen:true, desc:'Armor penetration. Opens locked containers.' },
  survival_sword:{ id:'survival_sword', name:'Survival Sword', kind:'blade', damage:20, crit:0.18, stamina:14, durability:60, stun:0.08, ap:0.2, noise:12, price:95, desc:'Balanced. Good damage, crit, durability.' },
};

// Tools ride on the belt, not in the hand: gathering bonus only, never fight.
export const TOOLS = {
  fire_axe: { id:'fire_axe', name:'Fire Axe', icon:'🪓', gather:'wood', price:60, desc:'+1 Wood whenever you loot wood.' },
  pickaxe:  { id:'pickaxe', name:'Pickaxe', icon:'⛏️', gather:'stone', price:50, desc:'+1 Stone whenever you loot stone.' },
};

export const ARMORS = {
  none:          { id:'none', name:'Torn Clothes', def:0, price:0, desc:'Barely protection.' },
  cloth_jacket:  { id:'cloth_jacket', name:'Cloth Jacket', def:2, price:20, desc:'Light protection.' },
  leather_jacket:{ id:'leather_jacket', name:'Leather Jacket', def:5, price:55, desc:'Solid early armor.' },
  police_vest:   { id:'police_vest', name:'Police Vest', def:8, price:110, desc:'Best early-game armor.' },
};

export const ACCESSORIES = {
  none:       { id:'none', name:'—', desc:'' },
  backpack:   { id:'backpack', name:'Hiking Backpack', price:40, capBonus:8, desc:'Inventory capacity +8.' },
  flashlight: { id:'flashlight', name:'Flashlight', price:25, desc:'Better loot at night. Reveals details.' },
  gas_mask:   { id:'gas_mask', name:'Gas Mask', price:50, desc:'Protects in toxic/rotten areas. -sanity events.' },
};

export const ITEMS = {
  bandage:     { id:'bandage', name:'Bandage', type:'heal', price:15, hp:25, desc:'+25 HP' },
  medkit:      { id:'medkit', name:'Medkit', type:'heal', price:45, hp:60, desc:'+60 HP' },
  painkillers: { id:'painkillers', name:'Painkillers', type:'heal', price:25, hp:15, sta:30, desc:'+15 HP, +30 Stamina' },
  sanity_kit:  { id:'sanity_kit', name:'Herbal Tea', type:'sanity', price:30, san:20, desc:'+20 Sanity' },
  canned_food: { id:'canned_food', name:'Canned Food', type:'food', price:10, hunger:30, desc:'+30 Hunger' },
  water_bottle:{ id:'water_bottle', name:'Water Bottle', type:'water', price:8, thirst:30, desc:'+30 Thirst' },
  lockpick:    { id:'lockpick', name:'Lockpick', type:'utility', price:20, desc:'Opens one locked container silently.' },
  scrap:       { id:'scrap', name:'Scrap', type:'craft', price:4, desc:'Forge material.' },
  metal:       { id:'metal', name:'Metal Parts', type:'craft', price:9, desc:'Forge material.' },
  battery:     { id:'battery', name:'Battery', type:'craft', price:12, desc:'Rare. Sells well.' },
  wood:        { id:'wood', name:'Wood', type:'craft', price:3, desc:'Base building. Forest & farm.' },
  stone:       { id:'stone', name:'Stone', type:'craft', price:3, desc:'Base building. Quarry & houses.' },
  cloth:       { id:'cloth', name:'Cloth', type:'craft', price:5, desc:'Shelter & repairs. Houses & supermarket.' },
  raw_meat:    { id:'raw_meat', name:'Raw Meat', type:'food', price:4, hunger:25, desc:'+25 Hunger raw. Risky. Cook it at a campfire.' },
  cooked_meat: { id:'cooked_meat', name:'Cooked Meat', type:'food', price:8, hunger:40, desc:'+40 Hunger. Safe.' },
  leather:     { id:'leather', name:'Leather', type:'craft', price:12, desc:'Tough hide. Sells well. Hunt deer & boar.' },
  seeds:       { id:'seeds', name:'Seeds', type:'craft', price:2, desc:'Plant in the garden. Food grows here.' },
};

export const ZOMBIES = {
  walker: { id:'walker', name:'Walker', hp:38, damage:8, speed:2, fleeMod:-0.05, behavior:'Slow but predictable. Shambling.', color:0x6a8f5f },
  rotten: { id:'rotten', name:'Rotten', hp:28, damage:6, speed:2, fleeMod:0.05, behavior:'Decayed and weak, but its smell shakes your mind.', color:0x7d8f4f, sanityHit:4 },
  runner: { id:'runner', name:'Runner', hp:30, damage:12, speed:5, fleeMod:-0.25, behavior:'Fast and dangerous. Fleeing is hard.', color:0x9f5f5f },
  boar: { id:'boar', name:'Wild Boar', hp:34, damage:10, speed:4, fleeMod:-0.15, behavior:'Territorial and angry. It charges.', color:0x7a5a4a },
};

export const LOCATIONS = {
  supermarket: {
    id:'supermarket', name:'Abandoned Supermarket', icon:'🏪', distance:2, danger:2,
    loot:['food','food','medicine','general'], enemies:['walker','walker','rotten','runner'],
    desc:'The automatic doors are stuck halfway open. Inside, the supermarket is dark. Something moves between the shelves.',
    rooms:[
      { id:'pharmacy', name:'Pharmacy', loot:'medicine', dangerMod:1, text:'White shelves, scattered pill bottles. A noise comes from behind the counter…' },
      { id:'grocery', name:'Grocery Aisle', loot:'food', dangerMod:0, text:'Rows of empty shelves. A few cans glint in the dark.' },
      { id:'cashier', name:'Cashier', loot:'food', dangerMod:0, text:'Abandoned registers and picked-over snack racks. Someone left in a hurry.' },
      { id:'storage', name:'Storage Room (locked)', loot:'general', dangerMod:2, locked:true, text:'A chained door. Something valuable — and something hungry — is inside.' },
    ]
  },
  residential: {
    id:'residential', name:'Residential Area', icon:'🏘️', distance:3, danger:3,
    loot:['general','general','food','medicine'], enemies:['walker','rotten','rotten','runner'],
    desc:'Silent houses with open doors. Curtains move though there is no wind.',
    rooms:[
      { id:'house1', name:'Blue House', loot:'general', dangerMod:0, text:'Family photos on the wall. The kitchen was searched in a hurry.' },
      { id:'house2', name:'Burned House', loot:'general', dangerMod:1, text:'Charred walls. The smell of smoke still lingers.' },
      { id:'garage', name:'Garage (locked)', loot:'general', dangerMod:1, locked:true, text:'Tools behind a padlocked shutter. Metal clinks inside.' },
      { id:'garden', name:'Overgrown Garden', loot:'food', dangerMod:0, text:'Vegetable patches gone wild. Quiet… too quiet.' },
    ]
  },
  gas_station: {
    id:'gas_station', name:'Gas Station', icon:'⛽', distance:2, danger:3,
    loot:['general','general','craft'], enemies:['walker','runner','runner','rotten'],
    desc:'A rusted sign creaks. The shop windows are smashed. Fuel stains darken the concrete.',
    rooms:[
      { id:'shop', name:'Station Shop', loot:'food', dangerMod:1, text:'Shelves knocked over. The fridge hums — impossibly — then stops.' },
      { id:'pumps', name:'Fuel Pumps', loot:'craft', dangerMod:1, text:'The air reeks of gasoline. Every sound echoes.' },
      { id:'locker', name:'Locker Room (locked)', loot:'medicine', dangerMod:2, locked:true, text:'An employee locker room, door jammed. Scratching sounds inside.' },
      { id:'car', name:'Abandoned Car', loot:'general', dangerMod:0, text:'Doors open, engine cold. The trunk might hold something.' },
    ]
  },
  forest: {
    id:'forest', name:'Whispering Forest', icon:'🌲', distance:2, danger:2,
    loot:['wood','wood','general'], enemies:['walker','walker','rotten','rotten'],
    desc:'Pines press close. Deadfall timber lies everywhere — exactly what a new camp needs. Something moves between the trunks.',
    rooms:[
      { id:'grove', name:'Dense Grove', loot:'wood', dangerMod:0, text:'Fallen trunks, dry branches. Good timber, poor visibility.' },
      { id:'cabin', name:'Ranger Cabin (locked)', loot:'general', dangerMod:1, locked:true, text:'A ranger cabin, door barred from inside. Axes and tools within — if you get in.' },
      { id:'stand', name:'Hunter Stand', loot:'wood', dangerMod:1, text:'A wooden platform in the branches. Someone watched the treeline from here.' },
      { id:'clearing', name:'Berry Clearing', loot:'food', dangerMod:0, text:'Wild berries and quiet. For a moment the world feels almost normal.' },
      { id:'oldgrowth', name:'Old-Growth Pine', gather:'wood', icon:'🌲', dangerMod:1, text:'A massive dead pine, perfect timber. An axe sings here — bare hands merely survive.' },
    ]
  },
  quarry: {
    id:'quarry', name:'Collapsed Quarry', icon:'⛰️', distance:4, danger:3,
    loot:['stone','stone','craft'], enemies:['walker','rotten','runner'],
    desc:'Terraced rock walls and crushed machinery. Stone for walls, scrap for tools. The echoes here carry far.',
    rooms:[
      { id:'pit', name:'Crusher Pit', loot:'stone', dangerMod:1, text:'Broken rock heaps under a rusted crusher. Every footstep echoes.' },
      { id:'office', name:'Foreman Office (locked)', loot:'craft', dangerMod:1, locked:true, text:'The office safe and tool lockers survived the collapse. So did something else.' },
      { id:'slope', name:'Rubble Slope', loot:'stone', dangerMod:0, text:'Loose scree — easy stone, treacherous footing.' },
      { id:'containers', name:'Tool Containers', loot:'craft', dangerMod:1, text:'Shipping containers of picks, cable and spare parts.' },
      { id:'rockface', name:'Rock Face', gather:'stone', icon:'🪨', dangerMod:1, text:'A clean seam of building stone. A pickaxe sings here; bare hands merely survive.' },
    ]
  },
  factory: {
    id:'factory', name:'Abandoned Factory', icon:'🏭', distance:5, danger:4,
    loot:['craft','craft','general'], enemies:['walker','runner','runner','rotten'],
    desc:'Silent assembly lines under a soot-stained roof. Metal, parts, everything a workshop dreams of — guarded by the old shift.',
    rooms:[
      { id:'assembly', name:'Assembly Line', loot:'craft', dangerMod:1, text:'Half-built machines. Wrenches, brackets, blessed scrap.' },
      { id:'furnace', name:'Furnace Room', loot:'craft', dangerMod:2, text:'Cold furnaces, slag heaps. It smells of rust and old fire.' },
      { id:'vault', name:'Parts Vault (locked)', loot:'craft', dangerMod:2, locked:true, text:'A caged parts vault. High-value components behind thick mesh.' },
      { id:'dock', name:'Loading Dock', loot:'craft', dangerMod:1, text:'Toppled pallets and a forklift. Crates half-unloaded forever.' },
    ]
  },
  farm: {
    id:'farm', name:'Overgrown Farm', icon:'🌾', distance:3, danger:2,
    loot:['food','food','wood'], enemies:['walker','walker','rotten'],
    desc:'Fences swallowed by weeds, a barn leaning tiredly. Food in the fields, timber in the fences, quiet in the farmhouse.',
    rooms:[
      { id:'farmhouse', name:'Farmhouse', loot:'food', dangerMod:0, text:'Preserves still line the pantry. The owners left in a hurry.' },
      { id:'barn', name:'Barn (locked)', loot:'wood', dangerMod:1, locked:true, text:'Firewood and tools stacked to the rafters behind a chained door.' },
      { id:'fields', name:'Fields', loot:'food', dangerMod:0, text:'Potatoes and squash gone wild. Slow work, safe work.' },
      { id:'windmill', name:'Windmill Base', loot:'stone', dangerMod:1, text:'Fallen masonry and a dry well. Stone and scrap.' },
    ]
  },
};

export const LOOT_TABLES = {
  food:     ['canned_food','canned_food','water_bottle','canned_food','seeds','sanity_kit'],
  medicine: ['bandage','bandage','painkillers','sanity_kit','medkit','bandage'],
  general:  ['scrap','scrap','metal','lockpick','battery','painkillers','canned_food','cloth'],
  craft:    ['scrap','metal','metal','scrap','battery','lockpick'],
  wood:     ['wood','wood','wood','wood','wood','scrap'],
  stone:    ['stone','stone','stone','stone','stone','metal'],
};

export const MERCHANT_BASE = [
  { id:'bandage', qty:5 }, { id:'painkillers', qty:3 }, { id:'canned_food', qty:6 },
  { id:'water_bottle', qty:6 }, { id:'lockpick', qty:2 }, { id:'sanity_kit', qty:2 },
  { id:'medkit', qty:1 },
];

export const ENCOUNTER_WEIGHTS = { combat:30, loot:30, environmental:15, npc:5, trap:10, nothing:5, rare:5, animal:12 };

// Wildlife: neutral encounters. Hunt for meat & leather, or leave be.
// (Boar fights — see ZOMBIES.boar. Dog is a moral choice.)
export const ANIMALS = {
  rabbit: { name:'Rabbit', icon:'🐇', meat:1, leather:0, leatherC:0.3, chase:0.65, sneak:0.85, sta:15, mins:15, text:'A rabbit freezes between the roots, ears high. Meat on legs — if your legs are faster.' },
  deer:   { name:'Deer', icon:'🦌', meat:2, leather:1, leatherC:1, chase:0.45, sneak:0.7, sta:25, mins:30, text:'A deer lifts its head. Lean, alert. Enough meat for days — if you can take it without spooking it.' },
  rat:    { name:'Rat', icon:'🐀', meat:1, leather:0, leatherC:0, chase:0.7, sneak:0.9, sta:10, mins:10, text:'A fat rat waddles along a pipe, bold as rent day. Beggars, choosers…' },
};
export const ANIMAL_POOL = {
  forest:['rabbit','rabbit','deer','deer','boar','dog','crow'],
  farm:['rabbit','rabbit','boar','dog','crow','deer'],
  residential:['rabbit','dog','dog','crow','rat'],
  supermarket:['rat','rat','crow'],
  gas_station:['dog','crow','rat'],
  quarry:['crow','rat','rat'],
  factory:['rat','rat','crow'],
};
// merchant buy-back for surplus goods (animals → money → gear)
export const SELL_PRICES = { wood:1, stone:1, scrap:2, cloth:2, metal:4, leather:6, battery:6 };

export const NPCS = [
  { id:'jack', name:'Jack — Mechanic', text:'"Bring me 6 scrap and I\'ll reinforce your weapon. Keeps you alive out there."', quest:{ need:'scrap', qty:6, reward:{ money:40 } } },
  { id:'sarah', name:'Sarah — Doctor', text:'"My brother vanished near the residential area. If you find his medkit… please bring it back."', quest:{ need:'medkit', qty:1, reward:{ money:60, san:15 } } },
  { id:'miller', name:'Miller — Ex-Cop', text:'"You fight like a civilian. Take this tip: aim for the head when it charges. Free lesson."', quest:null },
];

export const FORGE_UPGRADES = {
  sharpen:   { name:'Sharpen Blade', desc:'Damage +3', cost:{ scrap:4, metal:2, money:25 }, apply:{ damage:3 } },
  reinforce: { name:'Reinforce Handle', desc:'Max durability +10 & repair full', cost:{ scrap:5, metal:3, money:30 }, apply:{ maxDura:10, repair:true } },
  balance:   { name:'Balance Weapon', desc:'Crit +4%, Stamina cost -2', cost:{ scrap:3, metal:3, money:35 }, apply:{ crit:0.04, stamina:-2 } },
  repair:    { name:'Repair', desc:'Restore durability to full', cost:{ scrap:2, money:10 }, apply:{ repair:true } },
};

// forge-craftable tools: no money, just hauled materials (workshop required)
export const FORGE_CRAFTS = {
  fire_axe: { cost:{ wood:3, metal:2 }, desc:'Chops +1 wood.' },
  pickaxe:  { cost:{ wood:2, metal:2, scrap:2 }, desc:'Breaks +1 stone.' },
};

// field dressings: consumable recipes, rendered automatically (workshop required)
export const FIELD_RECIPES = {
  bandage: { cost:{ cloth:2 }, out:{ bandage:1 }, mins:15, desc:'Tear and fold. 2 cloth → 1 bandage.' },
};

export const CHURCH_ACTIONS = {
  pray:    { name:'Pray', desc:'Sanity +10. Free, but time passes.', san:10, cost:0, time:30 },
  confess: { name:'Confess', desc:'Sanity +25. Costs $20.', san:25, cost:20, time:45 },
  rest:    { name:'Rest', desc:'HP +30, Sanity +10, Stamina full. +2h, hunger/thirst drain.', hp:30, san:10, time:120 },
};

// (No XP curve — survival, not RPG. Progression = equipment + base. See §50.)

export const RES_ICON = { wood:'🪵', stone:'🪨', scrap:'⚙️', metal:'🔩', cloth:'🧵', money:'💵' };

export const ITEM_ICON = {
  bandage:'🩹', medkit:'⛑️', painkillers:'💊', sanity_kit:'🍵',
  canned_food:'🥫', water_bottle:'💧', lockpick:'🗝️',
  scrap:'⚙️', metal:'🔩', battery:'🔋', wood:'🪵', stone:'🪨', cloth:'🧵',
  raw_meat:'🥩', cooked_meat:'🍗', leather:'🟫', seeds:'🌰',
};

// Base building. Every structure unlocks a service or passive. Costs reference
// loot sources so players always know where to gather.
export const STRUCTURES = {
  campfire:     { name:'Campfire', icon:'🔥', cost:{ wood:4 }, desc:'Warmth & cooking. Unlocks safe rest. (Wood ← forest, farm)' },
  supply_stash: { name:'Supply Stash', icon:'🗃️', cost:{ wood:2 }, desc:'A buried cache at camp. Deposit and take items freely.' },
  lean_to:      { name:'Lean-to Shelter', icon:'⛺', cost:{ wood:6, cloth:2 }, desc:'A real roof. Full-HP sleep. (Cloth ← houses, supermarket)' },
  workshop:     { name:'Workshop', icon:'⚒️', cost:{ wood:8, metal:2 }, desc:'Unlocks the FORGE. (Metal ← factory, gas station)' },
  trading_post: { name:'Trading Post', icon:'🏪', cost:{ wood:6, scrap:4 }, desc:'Unlocks the MERCHANT. (Scrap ← factory, station, houses)' },
  shrine:       { name:'Shrine', icon:'⛪', cost:{ stone:6, cloth:2 }, desc:'Unlocks the CHURCH. (Stone ← quarry, farm)' },
  garden:       { name:'Garden', icon:'🌱', cost:{ wood:4 }, desc:'Plant seeds, harvest 3 food next day.' },
  rain_collector:{ name:'Rain Collector', icon:'🛢️', cost:{ wood:3, scrap:2 }, desc:'Collect 2 water per day.' },
  storage_shed: { name:'Storage Shed', icon:'📦', cost:{ wood:8, stone:2 }, desc:'Backpack capacity +12.' },
  palisade:     { name:'Palisade Wall', icon:'🛡️', cost:{ wood:16, stone:6 }, desc:'Stops night raids & most road ambushes.' },
  watchtower:   { name:'Watchtower', icon:'🗼', cost:{ wood:14, stone:8 }, desc:'+10% flee chance. Early horde warning.' },
};
export const BUILD_ORDER = ['campfire','supply_stash','lean_to','workshop','trading_post','shrine','garden','rain_collector','storage_shed','palisade','watchtower'];

// supply stash capacity tiers, upgraded at the Forge (workshop required)
export const STASH_LEVELS = [
  { cap: 12, cost: null },                                  // dug-in cache, free with the structure
  { cap: 24, cost: { scrap: 4, metal: 2 } },                // reinforced crate
  { cap: 40, cost: { scrap: 6, metal: 4, money: 30 } },    // locked store-room
];

// Starting site choice: nowhere → scout → pick one. Each has a real passive.
export const SITES = {
  forest_edge:    { name:'Forest Edge', icon:'🌲', desc:'Deadfall everywhere. +1 Wood whenever you loot wood.', bonus:'wood' },
  quarry_overlook:{ name:'Quarry Overlook', icon:'⛰️', desc:'Stone at your feet. +1 Stone whenever you loot stone.', bonus:'stone' },
  riverside:      { name:'Riverside Camp', icon:'🌊', desc:'Clean water. Thirst drains 25% slower. Start +2 water.', bonus:'water' },
};
