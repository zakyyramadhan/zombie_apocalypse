# AGENT.md

# Zombie Survival — Text-Based Survival RPG

## 1. Project Overview

Build a text-based survival RPG set during a zombie apocalypse.

The game should focus on:

- Survival
- Exploration
- Risk/reward decisions
- Melee combat
- Resource management
- Sanity
- Looting
- Equipment progression
- Weapon upgrades
- Random encounters
- NPC interactions
- Procedural exploration
- Day/night progression
- Replayability

The player is a survivor living in a small settlement after civilization has collapsed.

The player leaves the settlement to explore dangerous locations, search for supplies, fight zombies, discover survivors, complete quests, and return to improve their equipment.

The game should feel like a **roguelite survival adventure**, not simply a menu-based RPG.

The central design principle is:

> **Every meaningful decision should have a potential consequence.**

---

# 2. Core Gameplay Loop

The primary gameplay loop is:

```text
Settlement
    ↓
Prepare
    ↓
Choose Destination
    ↓
Journey
    ↓
Explore Location
    ↓
Make Decisions
    ↓
Random Events
    ↓
Combat / Loot / NPC / Discovery
    ↓
Manage Resources
    ↓
Return to Settlement
    ↓
Upgrade
    ↓
Prepare for Next Journey
```

The player should constantly decide:

- Do I continue?
- Do I return?
- Do I fight?
- Do I flee?
- Do I spend a healing item?
- Do I risk searching deeper?
- Do I carry this rare item or drop something else?
- Do I spend money on equipment or save it?
- Do I repair my weapon now or risk continuing?
- Do I enter a dangerous location despite low sanity?
- Do I help another survivor?

---

# 3. Design Philosophy

## 3.1 Decisions Must Matter

Avoid meaningless choices.

Bad:

```text
Go left → random loot
Go right → random zombie
```

Good:

```text
Go left
→ quieter
→ lower loot
→ survivor encounter possible

Go right
→ higher loot
→ higher zombie chance
→ rare item possible

Break door
→ guaranteed access
→ creates noise
→ attracts zombies

Search carefully
→ consumes time
→ better loot chance
→ increases chance of nightfall
```

Every choice should have a tradeoff whenever practical.

---

# 4. Player Character

The player has the following core statistics:

```text
HP
Sanity
Stamina
Hunger
Thirst
```

Optional progression statistics:

```text
XP
Level
Money
Reputation
```

Example:

```text
❤️ HP       86 / 100
🧠 Sanity   71 / 100
⚡ Stamina  64 / 100
🍖 Hunger   58 / 100
💧 Thirst   42 / 100
```

---

# 5. Sanity System

Sanity is one of the game's core mechanics.

Sanity should affect exploration, combat, events, and text descriptions.

## Sanity ranges

```text
80-100
Stable
Normal perception
No major penalties

50-79
Uneasy
Occasional disturbing events

20-49
Unstable
Combat penalties
Higher panic chance
Possible hallucinations

0-19
Critical
Severe penalties
Frequent hallucinations
Potential random panic behavior
```

The game should NOT always explicitly tell the player that something is a hallucination.

Example:

```text
You hear a child crying.

"Help me..."

You follow the sound.

The hallway is empty.

The crying continues.

You turn around.

Nothing.

...

Your hands are shaking.

🧠 Sanity -5
```

Low sanity may cause:

- False enemies
- False loot
- Fake sounds
- Altered descriptions
- Incorrect information
- Panic
- Increased combat difficulty
- Random events
- Temporary loss of control

Do not make hallucinations completely predictable.

---

# 6. Settlement

The settlement is the player's safe area.

Main menu:

```text
╔══════════════════════════════╗
          SURVIVOR CAMP
╚══════════════════════════════╝

🏪 Merchant
⚒️ Forge
⛪ Church
🛡️ Equipment
🗺️ Explore
🎒 Inventory
📊 Character
📜 Quests
💾 Save
```

The settlement is safe unless a future event specifically introduces danger.

---

# 7. Merchant

The Merchant sells consumable survival items.

Categories:

```text
Healing
Sanity
Food
Water
Utility
Crafting
```

Example:

```text
🏪 MERCHANT

1. Bandage          $15
2. Medkit           $45
3. Painkillers      $25
4. Sanity Kit       $30
5. Canned Food      $10
6. Water Bottle      $8
7. Lockpick         $20
8. Flashlight       $35
```

Merchant stock should eventually be dynamic.

Stock can:

- Change each day
- Sell out
- Have random rare items
- Have different prices
- Be affected by settlement events

Do not make all items permanently available.

---

# 8. Forge

The Forge upgrades existing weapons and equipment.

Initial weapons:

```text
Knife
Blunt weapons
Sword
```

There are NO firearms during the early game.

Firearms should be reserved for later progression.

## Weapon upgrade attributes

Weapons can have:

```text
Damage
Critical Chance
Durability
Stamina Cost
Attack Speed
Stun Chance
Armor Penetration
Special Effects
```

Example:

```text
🔪 KITCHEN KNIFE

Damage:       12
Critical:     15%
Durability:   38 / 40
Stamina Cost: 8

Upgrade:

1. Sharpen Blade
2. Reinforce Handle
3. Balance Weapon
4. Repair
```

Example upgrade:

```text
Sharpen Blade

Damage:
12 → 15

Cost:
Scrap x4
Metal x2
Money $25
```

Upgrades should have meaningful differences.

---

# 9. Equipment Shop

The Equipment shop sells weapons, armor, and accessories.

## Weapons

Early game:

```text
Kitchen Knife
Wooden Stick
Baseball Bat
Pipe
Crowbar
Machete
Fire Axe
Police Baton
Military Knife
Heavy Hammer
Sword
```

## Armor

```text
Cloth Jacket
Leather Jacket
Police Vest
Tactical Vest
Military Armor
```

## Accessories

```text
Backpack
Gas Mask
Flashlight
Watch
Radio
Lucky Charm
```

Accessories can modify gameplay.

Example:

```text
Backpack
Inventory capacity:
12 → 20

Gas Mask
Protects against toxic environments.

Radio
Unlocks certain events and signals.

Flashlight
Improves exploration visibility.
```

---

# 10. Church

The Church is primarily used to recover Sanity.

It should not simply be a "restore sanity" button.

Example:

```text
⛪ CHURCH

The priest looks at you.

"You've seen too much again."

Your Sanity: 32

1. Pray
2. Confess
3. Rest
4. Leave
```

Possible effects:

### Pray

```text
Sanity +10
```

### Confess

```text
Sanity +25
Costs money or another resource.
```

### Rest

Restore:

```text
HP
Sanity
Stamina
```

But resting consumes time.

The Church should become strategically important when the player repeatedly returns with low sanity.

---

# 11. Map

The player can choose destinations.

Example:

```text
🗺️ MAP

1. Abandoned Supermarket
   Distance: 2
   Danger: ★★☆☆☆

2. Police Station
   Distance: 4
   Danger: ★★★★☆

3. Hospital
   Distance: 6
   Danger: ★★★★★

4. School
   Distance: 3
   Danger: ★★★☆☆

5. Gas Station
   Distance: 2
   Danger: ★★★☆☆
```

Locations should have:

```text
Distance
Danger
Loot tables
Enemy tables
Encounter tables
Environmental events
Special events
```

---

# 12. Journey System

Every journey should track:

```text
Destination
Distance
Time
Sanity
HP
Stamina
Hunger
Thirst
Noise
Current location node
```

Journey decisions consume time and resources.

The player should always have the possibility of deciding:

```text
Continue
Return
Rest
Use item
Explore
```

---

# 13. Location Exploration

Locations should be procedurally generated from predefined content.

Example:

```text
🏪 ABANDONED SUPERMARKET

The automatic doors are stuck halfway open.

Inside, the supermarket is dark.

You hear something moving somewhere near the shelves.

What do you do?

1. Enter through the front entrance
2. Go around the back
3. Search the parking lot
4. Leave
```

Different choices should lead to different exploration paths.

---

# 14. Example Supermarket

Front entrance:

```text
You enter the supermarket.

Rows of empty shelves surround you.

You notice:

→ Pharmacy
→ Grocery Aisle
→ Cashier
→ Storage Room
```

Options:

```text
1. Pharmacy
2. Grocery
3. Cashier
4. Storage
```

Pharmacy:

```text
You search the shelves.

Found:

💊 Painkillers x2
🩹 Bandage x1

But...

A noise comes from behind the counter.

🧟 Zombie detected.
```

The game should transition naturally into combat.

---

# 15. Random Encounter System

Every exploration node can produce an event.

Possible event types:

```text
Combat
Loot
Trap
NPC
Survivor
Environmental event
Choice event
Nothing
Rare event
Hallucination
Horde
```

Events should use weighted random chances.

Example:

```text
Normal area:

Combat        30%
Loot          25%
Environmental 15%
NPC            5%
Trap          10%
Nothing       10%
Rare event     5%
```

These probabilities should vary according to:

- Location
- Danger
- Time
- Weather
- Noise
- Player sanity
- Player equipment
- Previous events

---

# 16. Combat

Combat should be turn-based text combat.

Example:

```text
🧟 ROTTEN WALKER

HP: 38 / 38

PLAYER

❤️ HP: 82 / 100
⚡ Stamina: 64 / 100

🔪 Kitchen Knife

1. Quick Strike
2. Heavy Strike
3. Aim for Head
4. Dodge
5. Block
6. Flee
```

---

# 17. Combat Actions

## Quick Strike

Characteristics:

```text
Low stamina
Moderate damage
High attack speed
```

## Heavy Strike

Characteristics:

```text
High stamina
High damage
Lower speed
```

## Aim for Head

Characteristics:

```text
High critical chance
High damage
Higher risk
```

## Dodge

Characteristics:

```text
Avoid or reduce incoming damage
Consumes stamina
```

## Block

Characteristics:

```text
Reduce incoming damage
Consumes stamina
```

## Flee

Fleeing should not always succeed.

Success depends on:

```text
Enemy type
Player stamina
Environment
Player equipment
Number of enemies
```

---

# 18. Weapon Personality

Weapons should not only differ by damage.

## Knife

```text
Fast
High critical chance
Low damage
Low stamina cost
```

## Baseball Bat

```text
Medium damage
High stun chance
Knockback
Medium stamina cost
```

## Crowbar

```text
Armor penetration
Can open certain containers
Medium damage
```

## Axe

```text
Very high damage
High critical chance
High stamina cost
Slow
```

## Sword

```text
Balanced
Good damage
Good critical chance
Good durability
```

---

# 19. Zombie Types

Early game:

```text
Walker
Rotten
Runner
```

Mid game:

```text
Screamer
Brute
Hunter
```

Special:

```text
Police Zombie
Soldier Zombie
Infected Doctor
Armored Zombie
```

Each enemy must have different behavior.

Example:

### Walker

Slow but predictable.

### Runner

Fast and dangerous.

### Screamer

Low direct damage but attracts additional zombies.

### Brute

High HP and damage.

### Hunter

Can dodge or counter certain attacks.

---

# 20. Zombie Horde

Rare events can create large-scale danger.

Example:

```text
You hear a distant roar.

Then another.

Then dozens.

Your radio crackles.

"Everyone... get out of the eastern district."

You look outside.

A HORDE IS APPROACHING.
```

Options:

```text
1. Hide
2. Run
3. Fight
4. Find another exit
```

Hordes should be extremely dangerous.

---

# 21. Noise System

Noise is an important survival mechanic.

Actions generate noise.

Example:

```text
Knife attack       +5
Bat attack        +15
Axe attack        +25
Breaking door     +30
Running           +10
Gun               +100
```

Track:

```text
🔊 Noise: 67 / 100
```

High noise increases the probability of additional encounters.

Example:

```text
You hear movement nearby.

Something has heard you.
```

Noise should decay over time.

---

# 22. Inventory

Inventory should have limited capacity.

Example:

```text
🎒 BACKPACK

8 / 12

Knife
Bandage x3
Water x2
Canned Food x4
Scrap x2
Battery x1
Painkiller x2
```

When the inventory is full:

```text
You found:

⚔️ RARE MACHETE

Weight: 4

Your backpack is full.

1. Drop Water
2. Drop Food
3. Drop Scrap
4. Drop Knife
5. Leave Machete
```

Inventory decisions should create meaningful tension.

---

# 23. Time System

The game should track time.

Example:

```text
DAY 7 — 16:42
```

Time progresses when:

- Traveling
- Searching
- Fighting
- Resting
- Exploring
- Performing certain actions

Night should be more dangerous.

Example:

```text
🌙 NIGHT

Zombie encounter chance: +40%
Loot chance: +10%
Escape chance: -20%
```

The player should have an incentive to return before night.

---

# 24. Weather

Weather affects exploration.

Possible weather:

```text
☀️ Clear
🌧️ Rain
⛈️ Storm
🌫️ Fog
🌙 Night
```

Example:

```text
🌫️ FOG

Visibility is severely reduced.

Zombie detection range reduced.

You hear something breathing nearby.
```

---

# 25. Hunger and Thirst

Hunger and thirst should gradually decrease during journeys.

Low hunger:

```text
Reduced stamina recovery
```

Low thirst:

```text
Reduced stamina
Reduced combat effectiveness
```

Critical hunger/thirst:

```text
HP loss
Severe stamina penalties
```

Food and water become meaningful survival resources.

---

# 26. Durability

Weapons and armor have durability.

Example:

```text
🔪 Knife
Durability: 18 / 40
```

Combat reduces durability.

At low durability:

```text
Damage reduced
Critical chance reduced
```

At zero durability:

```text
Weapon broken.
```

Weapons can be repaired at the Forge.

---

# 27. Loot System

Loot should depend on location.

Example:

## Supermarket

High probability:

```text
Food
Water
Medicine
Household items
Scrap
```

## Hospital

High probability:

```text
Medicine
Bandages
Painkillers
Medical supplies
```

## Police Station

High probability:

```text
Armor
Baton
Knife
Police equipment
Rare weapon parts
```

## Factory

High probability:

```text
Metal
Scrap
Tools
Weapon components
```

Do not guarantee rare items.

---

# 28. Moral Choices

Some encounters should involve survivors.

Example:

```text
You find a wounded survivor.

He is holding a backpack.

"I can pay you..."

Blood is leaking from his leg.

1. Help him
2. Take his supplies
3. Leave him
4. Ask what happened
```

Consequences can affect:

```text
Money
Items
Sanity
Reputation
NPC relationships
Future events
Quests
Settlement
```

Choices should sometimes have delayed consequences.

---

# 29. NPC System

NPCs should have names, roles, relationships, and benefits.

Example:

```text
👨‍🔧 JACK — Mechanic

Relationship: 32 / 100

"Bring me 10 scrap and I can fix that."

Unlocks:

→ Weapon repairs
→ Vehicle-related quests
→ Mechanical crafting
```

Example:

```text
👩‍⚕️ SARAH — Doctor

Unlocks:

→ Advanced healing
→ Medical crafting
→ Hospital quests
```

Example:

```text
👨‍✈️ MILLER — Former Police Officer

Unlocks:

→ Combat training
→ Police station missions
→ Advanced weapons
```

---

# 30. Quest System

Example:

```text
📜 QUEST

THE MISSING BROTHER

Sarah's brother disappeared near the hospital.

Objectives:

☐ Reach Hospital
☐ Search Emergency Room
☐ Find Evidence
☐ Return to Sarah
```

Quests should support multiple outcomes where possible.

---

# 31. Location Evolution

Locations should not remain static forever.

Example:

```text
DAY 3

🏪 Supermarket
Danger: ★★☆☆☆
```

Later:

```text
DAY 15

🏪 Supermarket
Danger: ★★★★☆

⚠️ Zombie Horde detected nearby.
```

World state should evolve.

Possible changes:

```text
Zombie migration
Horde movement
Fire
Loot depletion
Survivor occupation
Enemy occupation
Weather damage
Quest-related changes
```

---

# 32. Character Progression

Use XP and levels.

Example:

```text
LEVEL 7

XP:
1420 / 1800
```

Leveling grants skill points.

Skill categories:

```text
COMBAT
├── Melee Damage
├── Critical
├── Dodge
└── Stamina

SURVIVAL
├── Looting
├── Inventory
├── Hunger
└── Scavenging

MENTAL
├── Sanity
├── Fear Resistance
├── Hallucination Resistance
└── Focus
```

Allow different builds.

---

# 33. Firearms Progression

There are no guns at the beginning of the game.

Firearms must be discovered later.

The player should eventually unlock firearms through:

```text
Police Station
Military Checkpoint
Special NPC
Rare Quest
Military Cache
```

Firearms should introduce the Noise system as an important balancing mechanic.

Example:

```text
Pistol
Damage: High
Noise: Very High
Ammo: Rare
```

A gun should be powerful but not automatically superior to melee.

---

# 34. Death

Death should feel meaningful.

Example:

```text
══════════════════════════════
          ☠️ YOU DIED
══════════════════════════════

Day: 18

Cause:
Severe blood loss

Zombies killed:
143

Locations explored:
21

Items recovered:
87

Final weapon:
Reinforced Machete

Survival Score:
7,842
```

If using roguelite progression, some meta-progression can persist:

```text
Achievements
Discovered Locations
Unlocked Items
Known Recipes
Lore
```

---

# 35. Save System

The game should support saving.

Save state should include:

```text
Player
Stats
Inventory
Equipment
Weapons
Armor
Money
XP
Level
Sanity
Hunger
Thirst
Time
Day
Weather
Location state
Quest state
NPC relationships
Merchant stock
World events
Unlocked content
```

The save system must be robust against corrupted or partially written saves.

Use versioned save data.

Example:

```json
{
  "save_version": 1,
  "day": 8,
  "player": {},
  "inventory": {},
  "equipment": {},
  "world": {},
  "quests": {}
}
```

---

# 36. Data-Driven Architecture

Do NOT hard-code every item, enemy, location, and event into the game engine.

Game content should be data-driven.

Example location:

```json
{
  "id": "abandoned_supermarket",
  "name": "Abandoned Supermarket",
  "danger": 2,
  "loot_tables": [
    "food",
    "medicine",
    "general"
  ],
  "events": [
    "zombie_ambush",
    "locked_storage",
    "survivor",
    "strange_noise",
    "hallucination"
  ]
}
```

Example weapon:

```json
{
  "id": "kitchen_knife",
  "name": "Kitchen Knife",
  "type": "knife",
  "damage": 12,
  "critical_chance": 0.15,
  "stamina_cost": 8,
  "durability": 40
}
```

Example zombie:

```json
{
  "id": "walker",
  "name": "Walker",
  "hp": 38,
  "damage": 8,
  "speed": 2,
  "behavior": "slow"
}
```

---

# 37. Recommended Game Modules

Keep systems separated.

```text
/game

    player
    combat
    inventory
    equipment
    weapons
    armor

    forge
    merchant
    church

    map
    locations
    journeys

    encounters
    zombies
    loot
    events

    quests
    npc

    sanity
    hunger
    thirst
    stamina

    time
    weather
    noise

    progression
    save
```

Avoid creating one giant game file.

---

# 38. Randomness

Randomness must be controlled and reproducible where possible.

Use weighted random tables.

Do not use pure randomness for everything.

Example:

```text
Location danger
+ current noise
+ current time
+ player sanity
+ previous encounters
= encounter probability
```

The player should feel that their decisions influence the outcome.

Randomness creates uncertainty.

It should NOT replace game design.

---

# 39. Event Generation

Each exploration node should follow approximately:

```text
1. Determine current environment
2. Determine available actions
3. Calculate encounter probabilities
4. Generate event
5. Present narrative
6. Accept player choice
7. Apply consequences
8. Update world state
9. Continue exploration
```

Events should be composable.

For example:

```text
Location
→ Locked Door
→ Player chooses Lockpick
→ Lockpick succeeds
→ Loot generated
→ Rare item found
→ Noise generated
→ Zombie encounter
```

---

# 40. Text Presentation

The game is text-based.

Prioritize:

- Clear formatting
- Short atmospheric descriptions
- Useful status information
- Meaningful choices
- Consistent terminology
- Strong feedback after actions

Example:

```text
══════════════════════════════
🏪 ABANDONED SUPERMARKET
══════════════════════════════

Day 8 — 14:27
Weather: 🌧️ Rain

❤️ 86/100
🧠 71/100
⚡ 64/100
🍖 58/100
💧 42/100

🔊 Noise: 12
🎒 Inventory: 8/12

The automatic doors are stuck halfway open.

Something moves between the shelves.

What do you do?

1. Enter through the front
2. Search the parking lot
3. Go around the back
4. Leave
```

---

# 41. Core Rules

The implementation must follow these rules:

1. No firearms during the initial game progression.
2. Melee combat must be viable.
3. Weapons must have different characteristics, not only different damage.
4. Sanity must affect gameplay.
5. The Church must provide a meaningful sanity recovery system.
6. The Merchant must provide consumable survival resources.
7. The Forge must provide equipment upgrades and repairs.
8. The Equipment shop must provide new equipment.
9. Journeys must consume resources.
10. Locations must contain random encounters.
11. Exploration must provide meaningful choices.
12. Inventory must be limited.
13. Time must progress.
14. Night should be more dangerous.
15. Noise must affect zombie encounters.
16. Loot must depend on location.
17. Rare items must remain rare.
18. NPCs should eventually affect gameplay.
19. The world should evolve over time.
20. Death should be meaningful.
21. Content should be data-driven.
22. Avoid excessive randomness that makes player decisions meaningless.

---

# 42. MVP Scope

Do NOT implement everything at once.

The first playable version should contain only:

### Player

```text
HP
Sanity
Stamina
Hunger
Thirst
Money
Inventory
```

### Settlement

```text
Merchant
Forge
Church
Equipment
Explore
```

### Weapons

```text
Knife
Baseball Bat
Crowbar
Sword
```

### Armor

```text
Cloth Jacket
Leather Jacket
Police Vest
```

### Zombies

```text
Walker
Rotten
Runner
```

### Locations

```text
Supermarket
Residential Area
Gas Station
```

### Systems

```text
Combat
Loot
Inventory
Sanity
Journey
Random Events
Time
Durability
Save/Load
```

Do not implement guns, complex NPC relationships, large quest chains, or advanced crafting until the core gameplay loop is fun.

---

# 43. MVP Gameplay Example

The minimum complete loop should be:

```text
Start Game
    ↓
Settlement
    ↓
Buy Bandage
    ↓
Equip Knife
    ↓
Go to Supermarket
    ↓
Explore
    ↓
Choose Front Entrance
    ↓
Search Pharmacy
    ↓
Find Bandage
    ↓
Zombie Appears
    ↓
Combat
    ↓
Kill Zombie
    ↓
Weapon Durability Decreases
    ↓
Continue Exploring
    ↓
Find Rare Item
    ↓
Inventory Full
    ↓
Choose What To Drop
    ↓
Sanity Event
    ↓
Player Decides To Return
    ↓
Settlement
    ↓
Repair Knife
    ↓
Visit Church
    ↓
Recover Sanity
    ↓
Prepare Next Journey
```

This loop must be enjoyable before expanding the game.

---

# 44. Desired Player Experience

The player should frequently think:

> "I could probably search one more room..."

Then:

> "But my sanity is getting low."

Then:

> "I only have 20% durability left."

Then:

> "There might be medicine in the pharmacy."

Then:

> "If I stay longer, it might become night."

Then:

> "Fine. I'm going in."

That tension is the heart of the game.

The goal is not to make every encounter difficult.

The goal is to make the player **uncertain whether continuing is worth the risk**.

---

# 45. Future Expansion

Potential future systems:

```text
Firearms
Ammunition
Crafting
Base building
Settlement upgrades
Vehicles
Fuel
Zombie hordes
Boss zombies
NPC factions
Trading
Survivor recruitment
Relationships
Advanced quests
Random maps
Multiple endings
Weather disasters
Disease
Infection
PvE faction conflicts
Radio communication
Underground locations
Military zones
```

These should be added only after the core survival loop is stable.

---

# 46. Final Development Principle

Build the game as a system of interacting mechanics:

```text
Sanity
   ↓
Decision Quality

Time
   ↓
Night / Weather

Noise
   ↓
Zombie Encounters

Inventory
   ↓
Loot Decisions

Durability
   ↓
Forge

HP / Sanity
   ↓
Church / Items

Location
   ↓
Loot / Enemy / Events

NPC
   ↓
Quests / Rewards

World State
   ↓
Changing Locations
```

The game should feel like a living survival world rather than a sequence of disconnected random encounters.

When adding new content, prefer **interactions between existing systems** over simply adding more numbers.

Example:

Bad:

```text
Add Zombie #15
```

Better:

```text
Add Screamer Zombie

Screamer:
→ weak individually
→ generates massive noise
→ attracts nearby zombies
→ creates difficult escape decisions
```

Every new mechanic should create new decisions.

**The player should survive because they made good decisions, not because they got lucky.**

---

# 47. Web Adaptation (Three.js) — CURRENT TARGET

The game is web-based. Text gameplay from §40 stays authoritative.
Three.js is a **visualization layer**, never the game logic.

## 47.1 Architecture

```text
index.html (shell: canvas + log + stats + actions)
  ├── css/style.css (responsive, touch-first)
  ├── js/data.js (ALL content: items/weapons/armor/zombies/locations/events/npcs/quests)
  ├── js/state.js (player/world state + versioned save in localStorage)
  ├── js/systems.js (pure logic: time/weather/noise/sanity/loot/encounter/combat math)
  ├── js/three-scene.js (Three.js only: scene/day-night/weather/locations/actors)
  ├── js/ui.js (render panels + bind input, calls systems, drives three-scene)
  └── js/main.js (bootstrap, no logic)
```

Rules:
1. `systems.js` must have ZERO Three.js imports (testable headlessly via node).
2. `three-scene.js` must have ZERO game-balance numbers (only visuals).
3. `data.js` owns ALL balance numbers. No hardcoded damage/prices elsewhere.
4. Game must remain fully playable if WebGL fails (text fallback).

## 47.2 Three.js scene contract

`window.ZScene` exposes:
```text
init(canvas) -> bool (false if WebGL unavailable)
setMode('settlement' | 'explore' | 'combat')
buildLocation(locationId)   // procedural diorama per location
setDayTime(hourFloat)       // lerps sun/moon, sky, fog, lamps
setWeather('clear'|'rain'|'storm'|'fog')
spawnZombies([{id, hp, maxHp}]) // shambling tokens facing player
damageZombie(index, flash)  // hit flash
killZombie(index)           // fall + fade
spawnLoot(n)                // sparkle markers
addNoiseRing(level)         // expanding ring scaled by noise
lookAt / orbit via drag, zoom via wheel/pinch
```

Visual style: low-poly diorama, fog-heavy, dark. Settlement = tents +
campfire + church + forge huts. Locations = 1 landmark building + cover
props + perimeter. Player = blue capsule + flashlight SpotLight at night.
Zombies = green/grey capsules + glowing eyes. Day/night + rain via Points.

## 47.3 UI contract (mobile-first, APK-ready)

- Layout: header stats → 3D canvas (35vh mobile / flex left desktop) →
  narrative log → contextual action buttons (min 44px targets).
- All time advancement, costs, and RNG go through systems.js.
- Touch: buttons + drag-orbit canvas. No hover-dependent mechanics.
- Static files only (no build step). Three.js via CDN importmap.
  Run via local server (`npx serve .`), NOT file:// (ES modules + CDN).
- PWA manifest included for installability.

## 47.4 MVP acceptance (web)

Minimum loop from §43 must work in browser:
Buy Bandage → Equip Knife → Supermarket → Pharmacy loot → zombie combat →
durability loss → rare find → inventory-full choice → sanity event → return →
repair → church → next journey. Save/Load via localStorage. Death screen
with score + roguelite meta (best score/kills/days in localStorage).

---

# 48. Android APK Path (LATER — do not build now)

When web MVP is fun, wrap — do NOT rewrite:

1. `npm i @capacitor/core @capacitor/cli && npx cap init zombie-survival com.camp.survival`
2. `npx cap add android` (uses same `index.html` + `js/` + `css/` as web root).
3. Bundle Three.js locally (download `three.module.js` into `js/vendor/`)
   because WebView may be offline; swap importmap to local file.
4. Capacitor plugins: App (back-button → confirm), Haptics (hit feedback),
   StatusBar (immersive), Filesystem or Preferences (replace/augment
   localStorage save if quota issues).
5. Touch already handled. Target 720p WebView perf: cap pixelRatio at 2,
   rain particle count < 1500, shadows OFF on mobile (use blob shadows).
6. Build: `npx cap sync && npx cap open android` → Assemble APK in Android Studio.

No native game logic. Web build = APK build.

---

# 49. Base-Building Expansion (IMPLEMENTED)

The player starts from **nowhere** — no camp, no services — and must earn
every wall. This sits on top of the MVP loop; all §41 core rules still hold.

## 49.1 Flow

```text
Wake in nowhere
  → Gather nearby (bootstrap wood) / Scavenge afar (nomad loot)
  → Scout for shelter site (40 min, one-time reveal)
  → Choose 1 of 3 sites (PERMANENT):
      🌲 Forest Edge    +1 Wood whenever looting wood
      ⛰️ Quarry Overlook +1 Stone whenever looting stone
      🌊 Riverside Camp  thirst drains 25% slower, start +2 water
  → Claim site (starter kit: +2 wood, +1 scrap)
  → BUILD structures with hauled resources
```

## 49.2 Structures (data-driven in STRUCTURES, rendered by three-scene)

```text
🔥 Campfire      4 wood            safe rest
⛺ Lean-to       6 wood 2 cloth    full sleep (else rough: poor HP, sanity risk)
⚒️ Workshop      8 wood 2 metal    UNLOCKS Forge
🏪 Trading Post  6 wood 4 scrap    UNLOCKS Merchant
⛪ Shrine        6 stone 2 cloth    UNLOCKS Church
🌱 Garden        4 wood            harvest 2 food / day
🛢️ Rain Collector 3 wood 2 scrap  collect 2 water / day
📦 Storage Shed  8 wood 2 stone    backpack +8
🛡️ Palisade      12 wood 4 stone   stops night raids & most road ambushes
🗼 Watchtower    10 wood 6 stone    +10% flee
```

Rule: services are 🔒-locked until their structure is built. Sleeping without
a lean-to is "rough" (HP +8 only, sanity −5 without fire). Sleeping without a
palisade risks a night raid (25% camp / 35% nowhere: lose resources, −5 HP).

## 49.3 Gathering map (every build resource has ≥2 sources)

```text
🪵 Wood   forest (grove/stand), farm (barn), gather-nearby, ranger cabin
🪨 Stone  quarry (pit/slope), farm (windmill), shrine-relevant houses
⚙️ Scrap  factory, gas station, houses, containers
🔩 Metal  factory (assembly/furnace), gas station locker, tool containers
🧵 Cloth  residential houses, supermarket shelves
```

New locations: 🌲 Whispering Forest (2★), 🌾 Overgrown Farm (2★),
⛰️ Collapsed Quarry (3★), 🏭 Abandoned Factory (4★).

## 49.4 Asset direction (three-scene.js)

Low-poly diorama, upgraded: characters with eyes/backpack/weapon, zombies
with reaching animated arms, trees/rocks/grass, buildings with windows that
glow at night, stars + moon, chimney/campfire smoke particles, per-biome
location sets, camp structures that appear as built (empty clearing → palisade
ring + watchtower). Shadows on desktop, off on mobile. Rain count halved on
mobile. Text remains authoritative; 3D failure never blocks play.
Character bodies are swappable: procedural capsules by default, external GLB
skins when present — see §49.12.

## 49.12 External character models (GLB swap)

- Files (developer-provided, `assets/` may be empty): `assets/player.glb`
  (survivor), `assets/zombie.glb` (single zombie, tinted per type in code).
- Contract per file: embedded animations, Y-up, feet at origin, ~1.8 m,
  ≤150k tris. Clip names configured in the `MODELS` manifest in
  `three-scene.js` (defaults `Idle/Walk/Attack/Die`); engine code never
  hardcodes clip names.
- Loading is async and non-blocking (`ZScene.loadModels()` from boot):
  the game starts on procedural models and hot-swaps each GLB on arrival.
  Missing/corrupt files → console warning + procedural stays. The game can
  never break on bad assets. Zombies spawned before the GLB arrives stay
  procedural until the next spawn.
- Engine normalizes scale to target height and grounds feet at y=0;
  `-z` forward convention matches the capsules (flip in manifest if a
  model faces away). Tints clone materials per spawn (textured skins get
  a 25% multiply, flat skins take the type color); hit-flash walks every
  emissive material; `Die` clip plays when present, else the classic
  fall-over. Idle/Walk follow explore/combat mode; Attack one-shots then
  resumes the base loop.
- No balance lives here (§47.1 stands): models are pure presentation.

## 49.5 Room depletion (no infinite farming)

- A room fully resolved (searched, survived, or cleared of zombies) is marked
  ✓ picked clean for the rest of the visit. Cleared rooms can't be re-entered.
- Fleeing does NOT consume the room — you left before resolving it.
- When every room is dry, the only way forward is 🕳️ Push deeper:
  repeatable, but each push raises encounter danger (+depth). Risk replaces
  repetition. Leaving and returning starts a fresh visit (§31).

## 49.6 Anti-spam: location cooldown + visible loot + backpack

- Each location visit stamps `world.cooldown`. The same area can't be
  re-entered until the next day — rotate across areas or sleep. The map shows
  ♻️ restocking with the return day, plus distance (+ horde signs when they
  appear). NO danger stars anywhere: you don't know which area hides zombies
  until you're inside. Suspense over spreadsheets.
- Room buttons preview their loot table as icons (`may yield 🩹💊🍵`).
  IMPORTANT: icons show what the table CAN yield — actual drops stay random
  (1–2 items per search, rares rarer). No hazard pips on rooms either.
  Every icon carries a hover description (desktop `title=`); backpack slots
  do too. Phones have no hover — tapping reveals everything anyway.
- The MAP shows the same may-yield icons per area (union of its room
  tables): you know what an area *can* hold, never what *will* be there.
- Inventory renders as a backpack grid: one cell per stack, empty slots
  visible, tap a supply to use it (stays open). Combat keeps a fast text list.
- Full backpack? Use a supply on the spot (frees a slot), drop something, or
  walk away. Loot lines use a highlighted `.loot` style so finds never get
  lost in the scroll; combat exchanges are single lines
  (`⚔️ QUICK STRIKE — 💥12!`, `🧟 Walker — 💥8 to you!`).

## 49.8 Tools: Fire Axe & Pickaxe (belt slot, never fight)

- 🪓 Fire Axe: +1 Wood whenever looting wood. ⛏️ Pickaxe: +1 Stone
  whenever looting stone. They live in a dedicated tool slot (`toolId` +
  owned `tools` set) — gathering power and combat power no longer compete.
- Two ways to get one: buy in Equipment ($60 / $50) OR **forge it at the
  Forge (needs Workshop)** — axe {3 wood, 2 metal}, pickaxe
  {2 wood, 2 metal, 2 scrap}: no money, just hauled materials + 40 min.
  Crafting/buying equips it; owned tools are switchable in Equipment.
- Bonus stacks with site bonuses (Forest Edge / Quarry Overlook).
- Saves: v4 migration moves axe/pickaxe from `weaponId` to the tool belt
  (falls back to kitchen knife); `weaponOf()` guards unknown ids.
- 🩹 Field Dressing section (same screen, workshop required): consumable
  recipes from data-driven `FIELD_RECIPES` (bandage: 2 cloth → 1, 15 min).
  No merchant cloth/buy-bandage loop exists, so crafted meds can only be
  used, never monetized. Removing 2 to add 1 means crafting never hits
  the full-pack screen.

## 49.7 Wildlife (hunt or leave be)

- New encounter type `animal` (weight 12; +8 forest/farm, −8 factory/night):
  🐇 rabbit, 🦌 deer, 🐀 rat (chase = stamina vs odds, stalk = time vs better
  odds), 🐗 boar (real fight via the combat system, butchered for 2 meat +
  leather on faint), 🐕 stray dog (share food → cache + sanity/rep, hunt it →
  meat + leather but −rep −sanity), 🐦 crow (omen or small hunt).
- Drops: 🥩 raw meat (eat raw = 25% sick −8 HP; cook at campfire → 🍗 safe
  +40 hunger), 🟫 leather + 🧵 cloth as trade goods.
- Merchant buys AND sells (SELL_PRICES): hunt surplus → money → gear.
  No companion/pet system — the dog is a one-scene moral choice (§28).

## 49.9 Loot generosity + lethal hunger/thirst

- Searches yield 1 item + 35% second (battery still 6%); loot event weight
  30, nothing 5. Lean on purpose — nodes and themed bonuses carry weight.
- Zero hunger: −8 HP/hr, −10 sta/hr, −4 san/hr, ×0.85 accuracy.
  Zero thirst: −10 HP/hr, −12 sta/hr, −6 san/hr, ×0.8 accuracy.
  Both empty kills a healthy survivor in ~6 hrs. One-time crash warnings;
  every time advance is death-checked (death is idempotent — one per run).
- 🪵 Gather Nearby + Gather Around Camp: see §49.10 (1 item a go,
  3 charges/day, site yield).

## 49.10 Area-true loot, dearer walls, cheaper gear, seeds

- Themed rooms pay their theme from pure tables (wood 5/6, stone 5/6,
  food has no battery — rares live in medicine/general/craft): ≈2 theme
  items per search, ≈3 with the matching belt tool equipped. No flat theme
  bonus on top — the roll plus tool/site bonuses are the whole yield.
  Food rooms keep their +1 canned guarantee.
- Palisade {16 wood, 6 stone}, Watchtower {14 wood, 8 stone}. Shop gear
  ~35% cheaper across weapons/armor/accessories.
- Gathering: see §49.11 (nodes + charges; nowhere trickle stays 1 wood).
- Garden: needs 🌰 Seeds (food tables, farms) → plant (15m) → ready next
  day → harvest 3 → bed empty, replant. No more free daily food.

## 49.11 Gather nodes (trees & rock faces)

- Forest holds an Old-Growth Pine room and the quarry a Rock Face room.
  These are work, not loot rolls: **+6 with the matching belt tool
  equipped, +2 by bare hands** (axe→wood, pick→stone), 20 min like Gather
  Nearby, chopping noise +8. (Camp had its own timber/stone buttons once;
  removed — home is for storing and building, gathering happens out there.)
- Area nodes cost one daily gather charge each and go dry for the visit
  (✓ like searched rooms); nowhere deadfall shares the same 3/day pool
  (`gatherLeft`/`gatherDay`), regrows tomorrow, flat 1 wood. Full pack
  refunds the charge. Partial fits open the same drop/use-or-leave choice
  as loot rooms, so the remainder is recoverable on the spot.
- Buttons state the deal upfront (`+6 axe · +2 hands`); bare-hand logs hint
  which tool triples the yield. Refusals name the shared pool out loud
  (`3 charges/day across nearby & area nodes`) so an empty pool never
  reads as a bug; the node stays enabled for tomorrow.

## 49.12 Supply stash tiers (forge-upgraded, never unlimited)

- 🗃️ Supply Stash structure {wood: 2} unlocks deposit/take at camp
  (Put whole stacks, Take whole-or-what-fits; header shows `n/total`
  stored plus `types/slots` used).
- Slot tiers, raised at the **Forge** (workshop required): 10 types ×10
  (dug-in, free) → 16×10 {scrap: 4, metal: 2} → 24×10 {scrap: 6, metal: 4,
  $30}. Full stack or full slots refuse deposits and point at the Forge.
  Save data carries `base.stash` + `base.stashLv` (defaulted on old saves,
  no version bump).
- One shared pool: building, crafting, cooking, eating, healing, selling,
  quests and dog-sharing all read pack + stash (`stockOf`) and deduct
  pack-first (`takeStock`). Loot intake, drops, traps and raids stay
  pack-only. Headers show pooled counts with a `(pack + stash)` note.

# 50. Amendment — Survival, Not RPG (SUPERSEDES §32, §42 XP refs)

No XP, no levels, no skill points, no stat-boost items. A survivor does not
"level up" — they eat, drink, sleep, repair, and build, or they die.

- §32 skill tree: REMOVED. Character screen is a plain survivor record
  (days, kills, searched, standing, kit). Nothing to allocate, ever.
- §42 "XP Level" MVP line: REMOVED. Progression = better weapons/armor via
  shops and forge + camp structures + reputation with NPCs.
- Combat math has no hidden growth numbers: damage comes from the weapon in
  your hands, crit from the weapon + Headshot risk, dodge/flee from stamina
  and the watchtower — never from spent points.
- Survival Score = kills + searched + hauls + days + reputation. Deeds, not levels.
- Lucky Charm (pure +crit item): REMOVED. Every remaining item either keeps
  you alive (food/water/medicine), builds something (wood/stone/scrap/metal/
  cloth), or opens something (lockpick, crowbar, flashlight, gas mask, pack).

# 51. Wild-Encounter Combat Presentation

Fights play like a wild encounter, but the math stays pure survival (§16–17):

```text
"⚔️ Wild RUNNER appeared!" → zombies slide in from the dark (staggered)
Camera swoops low to a side face-off view
"SURVIVOR used QUICK STRIKE!" → attacker lunges, hit flash, screen shake,
  floating damage number, foe HP bar drains (green→yellow→red)
"Wild RUNNER fainted!" → falls, +cash/scrap, next foe slides in
"Wild WALKER attacks!" → zombie lunges, ally bar drains, EVADED/MISS floats
Buttons lock during each ~0.4–0.7s animation beat (no double-turns)
```

Stun = "The foe flinched and can't move!" (free move). Panic = enemy strikes
first. Flee = "Got away safely!". All numbers still come from systems.js —
the presentation layer (three-scene tweens + battle HUD) owns zero balance.
