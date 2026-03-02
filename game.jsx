const { useState, useEffect, useRef, useMemo, useCallback } = React;
// Tone.js loaded via CDN

// ═══════════════════════════════════════════════════════════════
// NINTH LIFE v44 - THE RECORD
// "The complete package"
//
// v38 THE LENS:    Breed passives visible, screen declutter, scoring skip,
//                  den cascade, adaptive animation timing
// v39 THE VOICE:   Tone.js audio (20 procedural sounds), mute toggle,
//                  scoring cascade audio, den sounds
// v40 THE WELCOME: Tutorial removed, guided first hand (4 steps),
//                  inline How to Play, season passive toast
// v41 THE MARKET:  Tab-based shop (Cats/Wards/Colony),
//                  fixed bottom bar, release in Colony tab
// v42 THE THUMB:   10px font floor, 44px touch targets, mobile layout,
//                  sticky action bar, scroll snap
// v43 THE SWEEP:   Clutch celebration, grouped den results,
//                  strength meter factor icons
// v44 THE RECORD:  Enhanced constellation memorial, stats summary,
//                  performance memoization, timeout cleanup
//                  BALANCE: Bond pairs ×1.5→×1.35, Black Mirror ×2→×1.75,
//                  Summer passive +1C→+2C/cat, Nerve curve 3.0→2.2 max,
//                  Stray rubber-banding (draft quality inversely affects strays),
//                  Fixed: grudge tooltip 70/30→75/25, discard "2 Nerve"→"1 Nerve",
//                  Phoenix desc "Injured"→"Scarred"
//                  DEN: Nerve→den (high nerve = +fight, −breed),
//                  same-breed territorial crowding (+4% fight per extra above 2),
//                  same-breed base +5% fight, fight cap 60→70
// v45 THE SEASONS: Breeds renamed to birth seasons
//                  Shadow→Autumn 🍂, Ember→Summer ☀️, Frost→Winter ❄️, Bloom→Spring 🌱
//                  Autumn passive redesigned: "Lone Hunter" (+2M sole) → "Harvest" (+1M/scarred)
//                  Creates Autumn↔Winter tension (scars vs unscarred)
//                  Save migration for existing players (old breed names auto-convert)
//                  Seasonal icons, lore, quirks, titles, stray origins updated
//                  UI declutter: 10+ screens trimmed, factor pills removed from strength meter
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// AUDIO ENGINE — procedural sounds via Tone.js
// ═══════════════════════════════════════════════════════════════
const Audio={
  ready:false,muted:false,
  async init(){
    if(this.ready)return;
    try{
      await Tone.start();
      this.syn=new Tone.PolySynth(Tone.Synth,{oscillator:{type:"triangle"},envelope:{attack:0.02,decay:0.2,sustain:0.08,release:0.6},volume:-8}).toDestination();
      this.bass=new Tone.Synth({oscillator:{type:"sine"},envelope:{attack:0.05,decay:0.4,sustain:0.2,release:0.8},volume:-6}).toDestination();
      this.perc=new Tone.NoiseSynth({envelope:{attack:0.005,decay:0.06,sustain:0,release:0.04},volume:-18}).toDestination();
      this.ready=true;
    }catch(e){console.warn("Audio init failed:",e);}
  },
  p(fn){if(!this.ready||this.muted)return;try{fn();}catch(e){}},
  // Notes for scaling
  noteAt(base,n){const notes=["C","D","E","F","G","A","B"];return notes[Math.min(6,Math.max(0,n))]+(base||4);},
  // ── Scoring sounds (★ DOPAMINE: ascending pitch tracks progress toward target) ──
  chipUp(v,progress=0){this.p(()=>{const baseN=Math.min(6,Math.floor(v/2));const progN=Math.min(6,Math.floor(Math.min(1.2,progress)*6));const n=Math.max(baseN,progN);this.syn.triggerAttackRelease(this.noteAt(4,n),"16n",Tone.now(),0.25+Math.min(0.25,progress*0.2));});},
  multHit(v,progress=0){this.p(()=>{const baseN=Math.min(6,Math.floor(v/3));const progN=Math.min(6,Math.floor(Math.min(1.2,progress)*6));const n=Math.max(baseN,progN);this.syn.triggerAttackRelease(this.noteAt(5,n),"32n",Tone.now(),0.4+Math.min(0.2,progress*0.15));});},
  xMultSlam(x){this.p(()=>{const t=Tone.now();this.bass.triggerAttackRelease("C2","8n",t,0.7);this.syn.triggerAttackRelease(["E4","G4","B4"],"8n",t+0.05,0.4);if(x>=2)this.syn.triggerAttackRelease("C5","16n",t+0.1,0.3);});},
  // ★ DOPAMINE: Threshold crossing celebration — the moment you KNOW you made it
  thresholdCross(){this.p(()=>{const t=Tone.now();this.bass.triggerAttackRelease("C2","4n",t,0.5);["E4","G4","C5"].forEach((n,i)=>this.syn.triggerAttackRelease(n,"16n",t+0.04+i*0.06,0.35));this.perc.triggerAttackRelease("16n",t+0.02,0.4);});},
  // ★ DOPAMINE: Big cat fires — when a loaded cat drops a huge combined hit
  bigCatHit(progress=0){this.p(()=>{const t=Tone.now();const n=Math.min(6,Math.floor(Math.min(1.2,progress)*6));this.syn.triggerAttackRelease(this.noteAt(4,n),"16n",t,0.35);this.syn.triggerAttackRelease(this.noteAt(5,Math.min(6,n+1)),"32n",t+0.04,0.3);this.perc.triggerAttackRelease("32n",t,0.25);});},
  handType(tier){this.p(()=>{const t=Tone.now();const n=["C4","E4","G4","C5"][Math.min(3,tier)];this.syn.triggerAttackRelease(n,"8n",t,0.25);});},
  grudgeTense(){this.p(()=>{const t=Tone.now();this.syn.triggerAttackRelease(["Db4","D4"],"16n",t,0.35);});},
  grudgeProve(){this.p(()=>{const t=Tone.now();this.syn.triggerAttackRelease(["C4","E4","G4"],"8n",t,0.4);this.syn.triggerAttackRelease("C5","16n",t+0.12,0.3);});},
  bondChime(){this.p(()=>{const t=Tone.now();this.syn.triggerAttackRelease("E5","16n",t,0.25);this.syn.triggerAttackRelease("G5","16n",t+0.1,0.25);});},
  nerveUp(){this.p(()=>{const t=Tone.now();["C4","E4","G4"].forEach((n,i)=>this.syn.triggerAttackRelease(n,"32n",t+i*0.06,0.2));});},
  nerveDown(){this.p(()=>{const t=Tone.now();["G4","E4","C4"].forEach((n,i)=>this.syn.triggerAttackRelease(n,"32n",t+i*0.06,0.15));});},
  tierReveal(tier){this.p(()=>{const t=Tone.now();const chords=[["C4"],["C4","E4"],["C4","E4","G4"],["C4","E4","G4","B4"],["C4","E4","G4","B4","D5"],["C4","E4","G4","B4","D5","F#5"]];
    const ch=chords[Math.min(5,tier)]||chords[0];this.syn.triggerAttackRelease(ch,"4n",t,0.3+tier*0.05);if(tier>=4)this.bass.triggerAttackRelease("C2","4n",t,0.5);});},
  passiveHit(){this.p(()=>{this.syn.triggerAttackRelease("A4","32n",Tone.now(),0.15);});},
  // ── UI sounds ──
  cardSelect(){this.p(()=>{this.perc.triggerAttackRelease("32n",Tone.now(),0.4);});},
  cardPlay(){this.p(()=>{const t=Tone.now();this.perc.triggerAttackRelease("16n",t,0.3);this.syn.triggerAttackRelease("G4","32n",t+0.02,0.1);});},
  buy(){this.p(()=>{const t=Tone.now();this.syn.triggerAttackRelease("E5","32n",t,0.2);this.syn.triggerAttackRelease("G5","32n",t+0.05,0.15);});},
  // ── Phase sounds ──
  bossIntro(){this.p(()=>{const t=Tone.now();this.bass.triggerAttackRelease("D2","2n",t,0.6);this.syn.triggerAttackRelease(["Eb4","Gb4"],"4n",t+0.2,0.15);});},
  victory(){this.p(()=>{const t=Tone.now();["C4","E4","G4","C5","E5"].forEach((n,i)=>this.syn.triggerAttackRelease(n,"8n",t+i*0.12,0.35));});},
  defeat(){this.p(()=>{const t=Tone.now();["E4","D4","C4","B3","A3"].forEach((n,i)=>this.syn.triggerAttackRelease(n,"4n",t+i*0.25,0.2));});},
  clutchWin(){this.p(()=>{const t=Tone.now();this.bass.triggerAttackRelease("C2","2n",t,0.6);["C4","E4","G4","C5","E5","G5"].forEach((n,i)=>this.syn.triggerAttackRelease(n,"8n",t+0.1+i*0.1,0.4));});},
  // ── Den sounds ──
  denBirth(){this.p(()=>{const t=Tone.now();this.syn.triggerAttackRelease("C5","16n",t,0.25);this.syn.triggerAttackRelease("E5","16n",t+0.08,0.25);this.syn.triggerAttackRelease("G5","16n",t+0.16,0.2);});},
  denFight(){this.p(()=>{const t=Tone.now();this.perc.triggerAttackRelease("8n",t,0.6);this.syn.triggerAttackRelease("Eb4","16n",t+0.03,0.3);});},
  denDeath(){this.p(()=>{const t=Tone.now();this.bass.triggerAttackRelease("D2","1n",t,0.5);this.syn.triggerAttackRelease(["Eb4","Ab4"],"2n",t+0.1,0.15);});},
  denBond(){this.p(()=>{const t=Tone.now();this.syn.triggerAttackRelease("E5","16n",t,0.2);this.syn.triggerAttackRelease("A5","16n",t+0.1,0.2);});},
  denGrudge(){this.p(()=>{this.syn.triggerAttackRelease(["D4","Ab4"],"16n",Tone.now(),0.25);});},
  denGrowth(){this.p(()=>{this.syn.triggerAttackRelease("F5","32n",Tone.now(),0.2);});},
};

const BREEDS={
  Autumn:{color:"#9a8672",glow:"#7a6652",bg:"#1f1a14",icon:"🍂",name:"Autumn",lore:"Born when the leaves fell. They know what it means to let go."},
  Summer:{color:"#fb923c",glow:"#f97316",bg:"#4e2a1b",icon:"☀️",name:"Summer",lore:"Born in the longest light. They burn like they know it won't last."},
  Winter:{color:"#67e8f9",glow:"#06b6d4",bg:"#1b3a4e",icon:"❄️",name:"Winter",lore:"Born in the cold. The cold never left them."},
  Spring:{color:"#4ade80",glow:"#22c55e",bg:"#1b4e2d",icon:"🌱",name:"Spring",lore:"Born when the world tried again. They carry that stubbornness."},
};
const BK=Object.keys(BREEDS);

// ════════════════════════════════════════════════════
// SEASON PASSIVES - each season scores differently
// ════════════════════════════════════════════════════
// Autumn: harvest wounds. Summer: fury in numbers. Winter: endurance. Spring: colony bonds.
// ★ v46: All passives have base +1 so they ALWAYS fire a visible step (casino: more beats = more engagement)
const BREED_PASSIVE={
  Autumn:{name:"Harvest",desc:"+1 mult, +1 per scarred cat",icon:"🍂"},
  Summer:{name:"Fury",desc:"+2 chips, +1 per ally",icon:"☀️"},
  Winter:{name:"Guardian",desc:"+1 mult, +1 per healthy cat",icon:"❄️"},
  Spring:{name:"Roots",desc:"+1 chips +1 mult, +1 per bonded cat",icon:"🌱"},
};


// ═══════════════════════════════════════════════════════════════
// ★ BREED CHEMISTRY - The relationship web
// ═══════════════════════════════════════════════════════════════
// Autumn+Winter = BOND (the fading seasons — cold and letting go)
// Summer+Spring  = BOND (the growing seasons — warmth and renewal)
// ★ v31: Rivalries are now PERSONAL (grudges from den fights), not breed-based
// ★ v31→v33: GRUDGES — personal rivalries from den fights (now array-based — accumulate over run)
function hasGrudge(c1,c2){return(c1.grudgedWith||[]).includes(c2.id)||(c2.grudgedWith||[]).includes(c1.id);}
function addGrudge(c,targetId){if(!(c.grudgedWith||[]).includes(targetId)){c.grudgedWith=[...(c.grudgedWith||[]),targetId];}return c;}
function removeGrudge(c,targetId){c.grudgedWith=(c.grudgedWith||[]).filter(id=>id!==targetId);return c;}
function getGrudges(cats){
  const grudges=[];
  for(let i=0;i<cats.length;i++)for(let j=i+1;j<cats.length;j++){
    if(hasGrudge(cats[i],cats[j])){
      grudges.push([cats[i],cats[j]]);
    }
  }
  return grudges;
}
// Grudge resolution: 75% Tension (−2M), 25% Something to Prove (+4M). Grudge Wisdom upgrade → 30%.
// Resolution is inline in calcScore() — see proveChance variable

// ═══════════════════════════════════════════════════════════════
// ★ EXPANDED TRAIT SYSTEM
// ═══════════════════════════════════════════════════════════════
// Tier: common (normal drop), negative (shop discount, build-around),
//       rare (breeding only)
const PLAIN={name:"Plain",icon:"",desc:"No special ability yet",tier:"plain"};
const TRAIT_DETAIL={
  Plain:"No special ability yet. This cat can earn a trait through den events, breeding, or the shop.",
  Hefty:"A sturdy cat. Adds 5 chips to your score, or 8 chips if played first in the hand. Discarding this cat gives you an extra play.",
  Provider:"A resourceful scavenger. Earns 1 extra ration when played. If you have 15 or more rations, also boosts your Nerve by 1.",
  Wild:"A cat between seasons. Counts as every season at once, making it easy to form matching hands. Fits into any combo.",
  Feral:"Strength in numbers. Gains 1 chip for every cat in your entire deck. The bigger your colony, the stronger this cat gets.",
  Seer:"A cat with foresight. Adds 4 mult when played. Discarding this cat lets you peek at the next 3 cards you'll draw.",
  Devoted:"Loyal to their bonded mate. Adds 4 mult when their mate is in the same hand. Discarding this cat gives their mate extra power.",
  Scrapper:"Tough and battle-tested. Adds 3 mult, or 5 mult if scarred. Discarding this cat boosts your Nerve.",
  Cursed:"A dark presence. Normally subtracts 3 mult. But if this cat is the only one of their season in the hand, adds 8 mult instead.",
  Fragile:"Delicate but powerful in groups. Adds no chips on their own, but gains 2 mult for each ally played alongside them. Full hand of 5: multiplied by 1.5.",
  Swift:"Quick and elusive. Gains 3 chips for each empty slot in your hand. Playing fewer cats makes this one shine.",
  Guardian:"Protector of the wounded. Gains 2 mult for each injured or scarred ally in the hand. Discarding this cat heals one injured cat.",
  Echo:"Scores twice. The second time at half power. One of the strongest traits in the game.",
  Chimera:"A cat that belongs to all four seasons at once. If 3 or more cats are played together, the entire hand is multiplied by 1.5.",
  Alpha:"The leader of the pack. If this cat has the highest power in the hand, the entire hand is multiplied by 1.3.",
  Nocturnal:"Feeds on desperation. Gains 2 mult for each level of Nerve your colony has. At maximum Nerve, that's 18 extra mult.",
  Eternal:"A living myth. Multiplies the hand by 3 and scores twice at full power. The rarest trait in the game.",
  Phoenix:"Burns brightest near death. Multiplies by 2.5, or by 4 if scarred. If this cat dies, it revives once and becomes Eternal.",
};
// ★ v47: DRAFT PERSONALITY — each cat speaks one line. Sell the vibe, not the stats.
const DRAFT_VOICE={
  // Trait-based (priority)
  // COMMON (C tier)
  Hefty:["I'm bigger than I look.","First in, last out.","You want someone solid? Here.","I don't move fast. I don't need to."],
  Provider:["I always find something.","Nobody goes hungry on my watch.","I know where the good stuff hides.","Fortune finds me. Always has."],
  Wild:["I belong everywhere. And nowhere.","Don't try to categorize me.","I'm whatever you need me to be.","Seasons? I make my own."],
  Feral:["More of us means more of me.","I know every cat here by smell.","Crowds don't scare me. Silence does.","I thrive in numbers."],
  Seer:["I see what's coming.","The future whispers to me.","I know which cards are next.","Close your eyes. I'll watch."],
  Devoted:["Where they go, I go.","My heart belongs to someone.","Together we're unstoppable.","Love isn't weakness. It's fuel."],
  // RARE (B tier)
  Scrapper:["I fight dirty. That a problem?","Scars? I've got a collection.","Hit me. I dare you.","Pain's just information."],
  Cursed:["Don't get close. Trust me.","I bring bad luck. Mostly to others.","Something's wrong with me. Use it.","Alone, I'm dangerous. Together… worse."],
  Fragile:["I break easy. But I'm not nothing.","Protect me and I'll surprise you.","I'm more useful than I look.","Surround me. Please."],
  Swift:["Gone before you blink.","I work better with space.","Don't crowd me.","Less is more. Trust me."],
  Guardian:["I watch the ones who hurt.","Someone has to protect them.","Every scar I see makes me stronger.","The wounded need a shield."],
  // LEGENDARY (A tier)
  Echo:["You'll see me twice.","I linger.","Once is never enough.","Everything I do, I do again."],
  Chimera:["I'm all of them at once.","Every season runs through me.","I don't fit. That's the point.","More than the sum of my parts."],
  Alpha:["I lead. That's not a request.","Strongest in the room. Always.","Follow me or get out of the way.","Power recognizes power."],
  Nocturnal:["The darker it gets, the brighter I burn.","I come alive when hope dies.","Desperation is my element.","You'll need me at the end."],
  // MYTHIC (S tier)
  Eternal:["You won't find another like me.","I've been waiting for this colony.","The stories about me? All true.","This changes everything. You'll see."],
  Phoenix:["I don't stay dead.","Burn me. I'll come back hotter.","Scars make me legendary.","You can't kill what I am."],
  // Breed fallbacks for Plain cats
  _Autumn:["I know when to let go.","The leaves taught me patience.","I've seen things end. I'm still here.","Quiet. Watching. Ready."],
  _Summer:["I'm loud. Deal with it.","Born running. Haven't stopped.","I'll burn for this colony.","You want energy? I'm your cat."],
  _Winter:["I don't talk much.","Cold doesn't bother me.","I've survived worse than this.","Still. Steady. Enough."],
  _Spring:["I grow things. Bonds, mostly.","Everything heals if you let it.","I'm here for the others.","New beginnings. That's my whole thing."],
};
function getDraftVoice(cat){
  const tr=cat.trait||PLAIN;
  if(tr.name!=="Plain"&&DRAFT_VOICE[tr.name])return pk(DRAFT_VOICE[tr.name]);
  return pk(DRAFT_VOICE["_"+cat.breed]||DRAFT_VOICE._Autumn);
}
const TRAITS=[
  // ★ v48: 17 TRAITS — 4-tier system (Mythic/Legendary/Rare/Common)
  // --- COMMON (C tier): utility, economy, enablers ---
  {name:"Hefty",icon:"💪",desc:"+5 chips, +8 if played first",tier:"common"},
  {name:"Provider",icon:"🍀",desc:"+1 ration. Full bellies: +1 Nerve",tier:"common"},
  {name:"Wild",icon:"🌀",desc:"Counts as any season",tier:"common"},
  {name:"Feral",icon:"🐾",desc:"+1 chip per cat in deck",tier:"common"},
  {name:"Seer",icon:"🔮",desc:"+4 mult. Discard to peek next 3",tier:"common"},
  {name:"Devoted",icon:"🫀",desc:"+4 mult if mate in hand",tier:"common"},
  // --- RARE (B tier): solid contributors with conditions ---
  {name:"Scrapper",icon:"🥊",desc:"+3 mult, +5 if scarred",tier:"rare"},
  {name:"Cursed",icon:"💀",desc:"−3 mult. Only season in hand: +8",tier:"rare_neg"},
  {name:"Fragile",icon:"🩻",desc:"No chips, +2 mult per ally. Full hand: ×1.5",tier:"rare_neg"},
  {name:"Swift",icon:"🪶",desc:"+3 chips per empty hand slot",tier:"rare"},
  {name:"Guardian",icon:"🛡️",desc:"+2 mult per hurt ally",tier:"rare"},
  // --- LEGENDARY (A tier): build-defining ---
  {name:"Echo",icon:"🔁",desc:"Scores twice, half power on second",tier:"legendary"},
  {name:"Chimera",icon:"🧬",desc:"Counts as all seasons. 3+ cats: ×1.5",tier:"legendary"},
  {name:"Alpha",icon:"🐺",desc:"×1.3 if highest power in hand",tier:"legendary"},
  {name:"Nocturnal",icon:"🌙",desc:"+2 mult per Nerve level",tier:"legendary"},
  // --- MYTHIC (S tier): run-defining ---
  {name:"Eternal",icon:"✨",desc:"×3 mult, scores twice at full power",tier:"mythic"},
  {name:"Phoenix",icon:"🔥",desc:"×2.5 mult. Scarred: ×4. Revives once on death",tier:"mythic"},
];

const COMMON_TRAITS=TRAITS.filter(t=>t.tier==="common");
const RARE_TRAITS=TRAITS.filter(t=>t.tier==="rare"||t.tier==="rare_neg");
const RARE_POS=TRAITS.filter(t=>t.tier==="rare");
const RARE_NEG=TRAITS.filter(t=>t.tier==="rare_neg");
const LEGENDARY_TRAITS=TRAITS.filter(t=>t.tier==="legendary");
const MYTHIC_TRAITS=TRAITS.filter(t=>t.tier==="mythic");

// ★ v48: Tiered trait picking — Mythic > Legendary > Rare > Common
function pickTrait(allowHigh=false){
  const r=Math.random();
  if(allowHigh&&r<0.02)return pk(MYTHIC_TRAITS);    // 2% Mythic
  if(allowHigh&&r<0.10)return pk(LEGENDARY_TRAITS);  // 8% Legendary
  if(r<0.35)return pk(RARE_TRAITS);                  // 25% Rare (includes neg)
  return pk(COMMON_TRAITS);                          // 65% Common
}
// ★ Draft trait: elevated chances — creates "off-breed Phoenix" decisions from A1
function pickDraftTrait(){
  const r=Math.random();
  if(r<0.08)return pk(MYTHIC_TRAITS);     // 8% Mythic
  if(r<0.23)return pk(LEGENDARY_TRAITS);  // 15% Legendary
  if(r<0.53)return pk(RARE_TRAITS);       // 30% Rare
  return pk(COMMON_TRAITS);               // 47% Common
}
// ★ Breeding mutation: biased toward lower tiers
function pickBreedTrait(){
  const r=Math.random();
  if(r<0.03)return pk(MYTHIC_TRAITS);     // 3% Mythic
  if(r<0.11)return pk(LEGENDARY_TRAITS);  // 8% Legendary
  if(r<0.36)return pk(RARE_TRAITS);       // 25% Rare
  return pk(COMMON_TRAITS);               // 64% Common
}
// ★ Tier label for display
function traitTierLabel(t){
  if(t.tier==="mythic")return{label:"Mythic",color:"#fef08a"};
  if(t.tier==="legendary")return{label:"Legendary",color:"#c084fc"};
  if(t.tier==="rare"||t.tier==="rare_neg")return{label:"Rare",color:"#3b82f6"};
  return{label:"Common",color:"#888"};
}
function isHighTier(t){return t.tier==="mythic"||t.tier==="legendary"||t.tier==="rare";}
function tierColor(t){return traitTierLabel(t).color;}

// ★ TRAIT HELPERS: check all traits a cat has (primary + extra)
function catHas(cat,name){return(cat.trait||PLAIN).name===name||(cat.extraTraits||[]).some(t=>t.name===name);}
function catAllTraits(cat){const all=[cat.trait||PLAIN,...(cat.extraTraits||[])];return all.filter(t=>t.name!=="Plain");}
function catIsPlain(cat){return(cat.trait||PLAIN).name==="Plain"&&!(cat.extraTraits||[]).length;}
function addTrait(cat,trait){
  if(!cat.trait)cat.trait=PLAIN;
  if(cat.trait.name==="Plain"){cat.trait=trait;return true;}
  if(!(cat.extraTraits||[]).length&&cat.trait.name!==trait.name){cat.extraTraits=[trait];return true;}
  return false; // already has 2 traits or duplicate
}

const HT=[
  {name:"Stray",base:{c:15,m:2},ex:"Any cat alone"},
  {name:"Kin",base:{c:40,m:4},ex:"2 same season"},
  {name:"Two Kin",base:{c:65,m:4},ex:"2 of one season + 2 of another"},
  {name:"Prowl",base:{c:115,m:7},ex:"3 with consecutive power"},
  {name:"Clowder",base:{c:100,m:5},ex:"3 of the same season"},
  {name:"Kindred",base:{c:100,m:5},ex:"3 or more sharing a trait"},
  {name:"Full Den",base:{c:140,m:7},ex:"3 of one season + 2 of another"},
  {name:"Stalk",base:{c:190,m:10},ex:"4 with consecutive power"},
  {name:"Colony",base:{c:165,m:8},ex:"4 of the same season"},
  {name:"Nine Lives",base:{c:275,m:12},ex:"5 with consecutive power"},
  {name:"Litter",base:{c:250,m:12},ex:"5 of the same season"},
  {name:"Grand Litter",base:{c:330,m:15},ex:"5 same season + consecutive power"},
];

// ═══════════════════════════════════════════════════════════════
// WARDS (passive bonuses that watch over your colony)
// ═══════════════════════════════════════════════════════════════
const FAMS=[
  {id:"f1",name:"Falling Leaf",icon:"🍂",desc:"+4 mult per Autumn cat, +8 if 3+",eff:c=>{const n=c.filter(x=>x.breed==="Autumn").length;return{mult:n*4+(n>=3?8:0)};}},
  {id:"f2",name:"Warm Hearth",icon:"☀️",desc:"+4 mult per Summer cat, +8 if 3+",eff:c=>{const n=c.filter(x=>x.breed==="Summer").length;return{mult:n*4+(n>=3?8:0)};}},
  {id:"f3",name:"Snowglobe",icon:"🔮",desc:"+4 mult per Winter cat, +8 if 3+",eff:c=>{const n=c.filter(x=>x.breed==="Winter").length;return{mult:n*4+(n>=3?8:0)};}},
  {id:"f4",name:"First Bud",icon:"🌸",desc:"+4 mult per Spring cat, +8 if 3+",eff:c=>{const n=c.filter(x=>x.breed==="Spring").length;return{mult:n*4+(n>=3?8:0)};}},
  {id:"f5",name:"Golden Yarn",icon:"🧶",desc:"+25 chips per cat",eff:c=>({chips:c.length*25})},
  {id:"f6",name:"Moonstone",icon:"🌙",desc:"×1.5 if 3 or more cats",eff:c=>c.length>=3?{xMult:1.5}:{}},
  {id:"f7",name:"Black Mirror",icon:"🪞",desc:"×1.75 if all same season",eff:c=>{const b=c[0]?.breed;return c.length>1&&c.every(x=>x.breed===b)?{xMult:1.75}:{}}},
  {id:"f8",name:"Witch's Bell",icon:"🔔",desc:"+1 ration per hand",eff:()=>({gold:1})},
  {id:"f9",name:"Provider's Collar",icon:"📿",desc:"+8 mult with Provider",eff:c=>c.some(x=>catHas(x,"Provider"))?{mult:8}:{}},
  {id:"f10",name:"Wild Card",icon:"🃏",desc:"×2 with Wild cat",eff:c=>c.some(x=>catHas(x,"Wild"))?{xMult:2}:{}},
  {id:"f11",name:"Echo Chamber",icon:"🔊",desc:"+5 mult per Echo cat",eff:c=>({mult:c.filter(x=>catHas(x,"Echo")).length*5})},
  {id:"f12",name:"Brawler's Belt",icon:"🥋",desc:"+3 mult per Scrapper",eff:c=>({mult:c.filter(x=>catHas(x,"Scrapper")).length*3})},
  {id:"f18",name:"Iron Will",icon:"🛡️",desc:"×1.15 per scarred cat",eff:c=>{const sc=c.filter(x=>x.scarred&&!x.injured).length;return sc>0?{xMult:Math.round(Math.pow(1.15,sc)*100)/100}:{}}},
  {id:"f19",name:"Nesting Ward",icon:"🏠",desc:"+1 Shelter slot",eff:()=>({shelter:1}),passive:true},
  {id:"f20",name:"Lineage Keeper",icon:"👪",desc:"+6 mult per parent-child pair",eff:c=>{let n=0;c.forEach(x=>{if(x.parentIds)c.forEach(p=>{if(x.parentIds.includes(p.id))n++;});});return{mult:n*6};}},
];

const CURSES=[
  {id:"c_shrink",name:"Cramped Cage",icon:"📦",desc:"Hand size -2",tier:1,fx:{hsMod:-2}},
  {id:"c_silence",name:"Muzzled",icon:"🤐",desc:"Wards silenced",tier:1,fx:{silence:true}},
  {id:"c_fog",name:"Fog of War",icon:"🌫️",desc:"Cards face-down",tier:1,fx:{fog:true}},
  {id:"c_exile",name:"Exile",icon:"🚫",desc:"One season exiled",tier:2,fx:{exile:true}},
  {id:"c_fragile",name:"Glass Claws",icon:"💔",desc:"No discards",tier:2,fx:{noDisc:true}},
  {id:"c_famine",name:"Famine",icon:"🦴",desc:"No foraging, lose stores",tier:2,fx:{famine:true}},
  {id:"c_double",name:"Double Down",icon:"🎲",desc:"Threshold ×1.3",tier:3,fx:{tgtMult:1.3}},
];

const NERVE=[
  {name:"Still",xM:1.0,color:"#555",glow:"transparent",desc:""},
  {name:"Awake",xM:1.0,color:"#6b7280",glow:"transparent",desc:""},
  {name:"Tense",xM:1.1,color:"#9a8672",glow:"#9a867233",desc:""},
  {name:"Cornered",xM:1.2,color:"#b85c2c",glow:"#b85c2c44",desc:""},
  {name:"Defiant",xM:1.3,color:"#d97706",glow:"#d9770655",desc:"backs against the wall"},
  {name:"Burning",xM:1.4,color:"#f59e0b",glow:"#f59e0b66",desc:"past the point of fear"},
  {name:"Fury",xM:1.55,color:"#fb923c",glow:"#fb923c66",desc:"nothing left to lose"},
  {name:"Blazing",xM:1.7,color:"#fbbf24",glow:"#fbbf2488",desc:"the air itself catches fire"},
  {name:"Undying",xM:1.9,color:"#fef08a",glow:"#fef08aaa",desc:"they should have stayed down"},
  {name:"NINTH LIFE",xM:2.2,color:"#ffffffdd",glow:"#ffffff88",desc:"the last one"},
]; // ★ v44 BALANCE: flattened from 1.0→3.0 to 1.0→2.2 to reduce winning-run snowball

// ★ v47 BALANCE: FOCUS removed — sim proved 1-cat ×1.8 can never compete with 5-cat scoring

const UPGRADES=[
  {id:"u_g",name:"Buried Provisions",icon:"🐟",desc:"+2 Rations each night",cost:30,b:{gold:2},max:3},
  {id:"u_h",name:"Stubborn Will",icon:"✊",desc:"+1 Hand per round",cost:60,b:{hands:1},max:2},
  {id:"u_d",name:"Quick Instincts",icon:"🐾",desc:"+1 Discard per round",cost:45,b:{discards:1},max:2},
  {id:"u_f",name:"The Old Fire",icon:"🔥",desc:"Start with +2 Nerve",cost:75,b:{fervor:2},max:2},
  {id:"u_c",name:"Bloodline",icon:"📿",desc:"Companion +2 power, drafted cats +1 power",cost:100,b:{heirloom:2,draftPower:1},max:1},
  {id:"u_b",name:"Blood Memory",icon:"🩸",desc:"A starter cat inherits a Hearth cat's trait each run",cost:80,b:{bloodMemory:1},max:1},
  {id:"u_o",name:"What The Stars Owe",icon:"🔍",desc:"+50% Stardust from the Hearth",cost:120,b:{dustBonus:.5},max:1},
  {id:"u_xp",name:"Cat Mastery",icon:"📈",desc:"Unlock Seasoned & Veteran ranks (higher bonuses)",cost:50,b:{xp:1},max:1},
  // ★ v34 ECON: Extended stardust sinks — unlocked after purchasing 6+ upgrades
  {id:"u_scr",name:"Scar Memory",icon:"🩹",desc:"Scarred cats gain +2 mult",cost:100,b:{scarMult:2},max:1},
  {id:"u_pot",name:"The Warden",icon:"🛡️",desc:"Start each run with a random ward",cost:80,b:{startWard:1},max:2},
  {id:"u_grd",name:"Grudge Wisdom",icon:"⚡",desc:"'Something to Prove' triggers at 30% (not 25%)",cost:120,b:{grudgeWisdom:1},max:1},
  {id:"u_den",name:"Deeper Burrow",icon:"🏠",desc:"+1 Shelter slot in the den",cost:60,b:{shelter:1},max:1},
];

const MILESTONES=[{req:3,bonus:{gold:1}},{req:8,bonus:{discards:1}},{req:15,bonus:{hands:1}},{req:25,bonus:{fervor:2}}];

// ─── Names ───────────────────────────────────────────────────
// ════════════════════════════════════════════════════
// TWO-POOL NAMING SYSTEM — strays sound found, chosen sound loved
// ════════════════════════════════════════════════════
// Pool A: Strays / Plain / Traitless — names that stuck, not given
const STRAY_NAMES=[
  // descriptors-as-names
  "Notch","Stub","Scrap","Runt","Smudge","Nicks","Scruff","Burr","Muddle","Tatters","Dingy","Matted","Ratty","Grimy","Dusty","Scruffy",
  // where they were found
  "Gutter","Alley","Crawl","Eave","Stoop","Ditch","Rubble","Drain","Cellar","Ledge",
  // what they looked like
  "Socks","Patch","Stripe","Speck","Tuft","Boots","Tux","Mask","Bib","Spot","Blotch",
  // sounds
  "Mew","Chirr","Yowl","Hiss","Pip","Squeak",
  // food scraps (scavenger energy)
  "Crumb","Morsel","Kibble","Sardine","Rind","Giblet","Anchovy","Oyster",
  // backstory names
  "Twice","Drift","Leftover","Castoff","Waif","Foundling","Stowaway","Vagrant","Cadge","Ghost",
  // lost world objects
  "Nickel","Ticket","Thimble","Candle","Locket","Pencil","Radio","Postcard","Lantern","Compass","Gazette",
];
// Pool B: Chosen / Trait / Drafted / Bred — names you grieve
const CHOSEN_CORE=["Mabel","Penny","Clover","Rosie","Milo","Pepper","Olive","Willow","Maple","Poppy","Tilly","Biscuit","Sunny","Ruby","Percy","Nellie","Teddy","Daisy","Fern","Pippa","Gus","Pearl","Wren","Cricket","Juniper","Nutmeg","Archie","Winnie","Tessa","Dottie","Minnie","Sprout","Truffle","Mochi","Peaches","Figgy","Button","Lulu","Opal","Tansy","Finch","Birdie","Hazel","Honey","Ada","Flora","Phoebe","Goldie","Plum","Sage"];
// Seasonal flavor names — weighted toward matching breed
const CHOSEN_SEASON={
  Autumn:["Rowan","Cinder","Amber","Copper","Russet","Acorn","Ember","Hickory","Walnut","Harvest","Marrow","Tawny"],
  Winter:["Frost","Silver","Hush","Slate","Rime","Quill","Flurry","Aspen","Ivory","Sterling","Mist","Pebble"],
  Summer:["Blaze","Brass","Soleil","Marigold","Saffron","Dahlia","Clementine","Zinnia","Coral","Tangerine","Flare","Sienna"],
  Spring:["Blossom","Dew","Clove","Primrose","Sorrel","Violet","Aster","Linden","Briar","Ivy","Thistle","Moss"],
};
// Trait-flavored names — rare/special traits get names that echo their power
const CHOSEN_TRAIT={
  Eternal:["Vesper","Solace","Haven","Riven","Vigil","Crest","Herald","Lark","Starling","Meridian"],
  Phoenix:["Kindle","Dawn","Cinder","Ash","Flicker","Rebirth","Scorch","Fable","Remnant","Reverie"],
  Chimera:["Puzzle","Mosaic","Riddle","Splice","Motley","Kaleid","Patchwork","Prisma","Mirage","Chimera"],
  Alpha:["Rex","Boss","Duke","Reign","Crown","Apex","Prime","Summit","Throne","Valor"],
  Nocturnal:["Dusk","Shade","Eclipse","Twilight","Gloaming","Umbra","Nyx","Shadow","Vesper","Eventide"],
  Scrapper:["Grit","Flint","Knox","Fang","Spike","Bolt","Raze","Crag","Vice","Brunt"],
  Cursed:["Jinx","Hex","Bane","Omen","Shade","Wraith","Murk","Pall","Gloom","Thorn"],
  Guardian:["Ward","Bastion","Aegis","Vigil","Warden","Shield","Sentinel","Anchor","Rampart","Keep"],
  Swift:["Dash","Breeze","Fleet","Arrow","Zephyr","Wisp","Flick","Dart","Streak","Glide"],
};
const TITL={Autumn:["the Fading","who Remembers","Last of the Harvest","of Falling Leaves"],Summer:["the Undying","who Burns","Keeper of Flames","the Defiant"],Winter:["the Patient","who Endures","Still as Stone","the Unyielding"],Spring:["the Tender","who Grows","of New Roots","the Renewing"]};
// Rare/special trait titles (grander)
const TITL_RARE={Eternal:["the Myth","of Legend","the Undying Name","whom the Dark Remembers"],Phoenix:["Twice-Risen","the Unkillable","who Returned","Born from Ash"],Chimera:["of Many Faces","the Impossible","who Contains Multitudes","Between Worlds"],Alpha:["the Unquestioned","who Leads","the Apex","First Among All"],Nocturnal:["of the Dark Hours","the Sleepless","who Wakes at Midnight","Last Light Standing"],Echo:["Twice-Heard","the Resonance","who Lingers","the Afterimage"]};

// ════════════════════════════════════════════════════
// DEN NARRATION - the heart of the game
// ════════════════════════════════════════════════════
const DEN_BREED=[
  (a,b,baby)=>`${a} and ${b} curled around each other as the moon rose. By dawn, ${baby} was breathing softly between them.`,
  (a,b,baby)=>`No one saw the moment it happened. Only that when the light came, there were three where there had been two. ${baby} blinked at the world for the first time.`,
  (a,b,baby)=>`${a} groomed ${b}'s ear. ${b} pressed close. ${baby} arrived quiet as a secret, already purring.`,
  (a,b,baby)=>`They chose each other. In the gentleness between heartbeats, ${baby} came into being.`,
  (a,b,baby)=>`${a} had never stayed this close to anyone before. But ${b} was different. And ${baby} was proof.`,
  (a,b,baby)=>`The den was small and warm. ${a} and ${b} made it smaller. ${baby} made it complete.`,
];
const DEN_FIGHT=[
  (a,b,loser)=>`A growl in the dark. Then claws. ${loser} pulled away, bleeding. Some things don't heal clean.`,
  (a,b,loser)=>`${a} and ${b} circled. It was over fast. ${loser} licked the wound and wouldn't meet anyone's eyes.`,
  (a,b,loser)=>`It started over nothing. A look. A wrong step. But ${loser} will carry the scar longer than either will carry the reason.`,
  (a,b,loser)=>`The den went quiet after. ${loser} stayed in the corner. The others pretended not to notice.`,
];
const DEN_DEATH=[
  (a,b,victim)=>`The fight went too far. ${victim} didn't get up. Nobody spoke for a long time after.`,
  (a,b,victim)=>`${victim} had survived everything. The hunger. The cold. The swarm. But not this. Not tonight. The others pressed against the spot where the warmth had been and didn't move until dawn.`,
  (a,b,victim)=>`One moment ${victim} was there. Then the sound. Then the silence. Then the space. The colony would carry that space for a long time.`,
  (a,b,victim)=>`${a} didn't mean it. Everyone knew that. But ${victim} was gone, and meaning had nothing to do with it.`,
];
const DEN_QUIET=[
  ()=>"Moonlight through the cracks. The cats dreamed separately. Tomorrow they would need each other again.",
  ()=>"Nothing happened. Sometimes that's the most merciful thing a night can do.",
  ()=>"Someone purred. Someone shifted. The others pretended to sleep. In the morning, no one mentioned the sound they all heard at the treeline.",
  ()=>"Rain on the roof. The den smelled like wet earth and warm fur. For a few hours, they were just animals. Just alive. Just here.",
  ()=>"The quietest nights are the ones you remember. Not for what happened. For what almost didn't.",
];
const DEN_PHOENIX=[
  (a,b,risen)=>`The fight should have ended ${risen}. It did, for a moment. But something older than death flickered behind those eyes, and ${risen} rose, changed, burning with what comes after the last chance.`,
  (a,b,risen)=>`${risen} lay still. The others turned away. Then: light. Heat. The cat that stood up was not the cat that fell. Something had been traded. Something had been gained.`,
];
const DEN_FOUND=[
  (cat)=>`${cat} nosed at something in the rubble. A glint. Not much, but enough.`,
  (cat)=>`${cat} came back at dawn with something between teeth. No one asked where.`,
  (cat)=>`The others were sleeping when ${cat} slipped out. Came back heavier. Richer. The colony asks no questions.`,
  (cat)=>`${cat} dug. Quietly, obsessively, in the far corner. Found what was buried there.`,
];
const DEN_GROWTH=[
  (cat)=>`A quiet night for ${cat}. But the quiet does something. Muscles remember. Instincts sharpen.`,
  (cat)=>`${cat} sat watching the treeline until dawn. Something behind those eyes had changed.`,
  (cat)=>`${cat} hunted alone tonight. What came back moved differently. Faster. More certain.`,
  (cat)=>`The others noticed it first: ${cat} had grown. Not larger. Sharper. The kind of change you can't undo.`,
  (cat)=>`${cat} practiced the jump seventeen times. On the eighteenth, something clicked. Power isn't born. It's built.`,
];
const DEN_MENTOR=[
  (elder,young)=>`${elder} sat beside ${young} for a long time. Not touching. Just watching. Teaching, the way cats do.`,
  (elder,young)=>`${young} copied the way ${elder} moved. By morning, something had clicked.`,
  (elder,young)=>`${elder} groomed ${young}'s ears flat. A small gesture. But ${young} stood taller after.`,
  (elder,young)=>`They hunted together. ${elder} let ${young} lead. Corrected nothing. Let the night teach what words can't.`,
];
const DEN_WANDER=[
  (cat)=>`A shape at the edge of the den. Not a threat. Just another survivor, looking for somewhere to belong.`,
  (cat)=>`${cat} appeared between heartbeats. Thin. Tired. But alive. The colony grew by one.`,
  (cat)=>`Nobody saw ${cat} arrive. One moment the corner was empty. The next, a pair of eyes caught the moonlight.`,
  (cat)=>`${cat} had been circling for days. Something about this colony. Something that said: here. Stay here.`,
  (cat)=>`The others recognized ${cat}'s scent. They'd crossed paths before, back when everything was falling apart.`,
];
const DEN_BOND=[
  (a,b)=>`Something shifted between ${a} and ${b}. Not a word. Not a touch. Just... a knowing.`,
  (a,b)=>`${a} and ${b} slept closer tonight. Not touching. Just close. Tomorrow they'd be closer still.`,
  (a,b)=>`It started when ${a} brought food back for ${b}. A small thing. The kind of thing that changes everything.`,
  (a,b)=>`The rain drove them together. By the time it stopped, neither moved apart. They'd found something worth staying for.`,
  (a,b)=>`${a} licked the wound ${b} pretended wasn't there. After that, they were inseparable.`,
];
const NIGHT_FLAVOR=[
  "The first night, they sleep with their eyes open.",
  "The second night, they learn the sound of something watching.",
  "The third night, the den gets quieter. It shouldn't.",
  "The fourth night. Someone purrs in the dark. The others press closer. They know.",
  "The last night. They have been afraid of this since the beginning. And they are still here.",
];
const BOSS_FLAVOR=[
  "The cats go still. All of them. At once.",
  "There is a smell. Every living thing on earth recognizes it.",
  "A sound at the edge of the dark. Patient. Certain. It has done this before.",
  "The veterans flatten their ears. The kittens don't understand yet. They will.",
  "Everything you built. Everyone you kept alive. It all comes down to what happens next.",
];

// ★ v49: BLIND WHISPERS — narrative context for each blind type
const BLIND_WHISPER={
  dusk:[ // The dark stirs
    "The dark stirs.",
    "Something shifts at the edge of hearing.",
    "The first test. Always the gentlest.",
    "Prove you're awake.",
  ],
  midnight:[ // It knows you're here
    "It knows you're here.",
    "The dark has your scent now.",
    "Harder. Because it's paying attention.",
    "No more warming up.",
  ],
  boss:[ // It remembers what killed the others
    "It remembers what killed the others.",
    "This is why the other colonies fell.",
    "Everything before this was prologue.",
    "The real test. The only one that matters.",
  ],
};

// ★ v49: THRESHOLD CLEAR LINES — night-aware, blind-aware
// The dark's reaction to being defied
function getThresholdClear(ante,blind,clutch,pct){
  // Boss clears get their own treatment via boss.defeat dialogue
  if(blind>=2)return null;
  if(clutch){
    return pk([
      "They almost forgot you were here. Almost.",
      "One number. Between you and nothing.",
      "The threshold held. barely.",
      "Close enough to taste the dark.",
    ]);
  }
  if(pct>=200){
    const crush=[
      "The dark flinched.",
      "They couldn't ignore that.",
      "The threshold shattered.",
      "More than enough. More than anyone expected.",
    ];
    if(ante>=4)crush.push("This is what a colony looks like.");
    return pk(crush);
  }
  // Standard clears — escalate with night
  const lines=[
    // Night 1
    ["The dark heard something. It isn't sure what.","Still here. That's a start.","The threshold gives. Barely notices you."],
    // Night 2
    ["It noticed. It's starting to pay attention.","Loud enough to be heard. For now.","The ground accepts your weight. Reluctantly."],
    // Night 3
    ["The dark knows your name now.","Three nights in. They're still counting you.","Louder than the silence. That's all it takes."],
    // Night 4
    ["The dark expected you to stop. You didn't.","Four nights. The other colonies didn't make it this far.","Still burning. Still visible."],
    // Night 5
    ["The dark blinked first.","Five nights and the threshold still breaks.","You are not forgettable."],
  ];
  return pk(lines[Math.min(ante-1,4)]);
}

// ★ v49: ANTE ESCALATION LINES — why it gets harder
const ANTE_ESCALATION=[
  "", // Night 1: no escalation message
  "The dark noticed the light. It looks closer now.",
  "It remembers your name. The threshold rises.",
  "Four nights. The dark sends what killed the others.",
  "The last threshold. Everything the dark has left.",
];
// ════════════════════════════════════════════════════
// ACHIEVEMENTS
// ════════════════════════════════════════════════════
const ACHIEVEMENTS=[
  {id:"first_win",name:"Survivor",desc:"Win your first run",icon:"🏆",check:s=>s.w>=1},
  {id:"five_wins",name:"Colony Leader",desc:"Win 5 runs",icon:"👑",check:s=>s.w>=5},
  {id:"night5",name:"Into the Dark",desc:"Reach Night 5",icon:"🌙",check:s=>s.ba>=5},
  {id:"deathless",name:"Every Single One",desc:"Win with 0 deaths",icon:"💚",check:(_,f)=>f===true},
  {id:"legend_score",name:"NINTH LIFE",desc:"Score 500,000+ in one hand",icon:"✨",check:s=>s.hs>=500000},
  {id:"all_breeds",name:"All Four Seasons",desc:"Save a cat from each season to the Hearth",icon:"🐾",check:s=>{const br=new Set((s.disc||[]).map(d=>d.split("-")[0]));return["Autumn","Summer","Winter","Spring"].every(b=>br.has(b));}},
  {id:"ten_runs",name:"Stubborn",desc:"Attempt 10 runs",icon:"🔄",check:s=>s.r>=10},
  {id:"max_fervor",name:"NINTH LIFE Reached",desc:"Reach maximum Nerve",icon:"🔥",check:s=>s.mf>=9},
];

// ════════════════════════════════════════════════════
// CAT XP - experience from being played
// ════════════════════════════════════════════════════
// ★ v32: 3 tiers — veterans become multiplicative engines
// ★ Tier 1 (Proven) always available. Tiers 2-3 require Cat Mastery upgrade.
const CAT_XP=[
  {plays:5,label:"Proven",bonus:{mult:2},color:"#60a5fa",free:true},
  {plays:10,label:"Seasoned",bonus:{mult:3,xMult:1.15},color:"#c084fc"},
  {plays:18,label:"Veteran",bonus:{mult:4,xMult:1.3},color:"#fbbf24"},
];
function getCatXP(tp,hasMastery=false){
  for(let i=CAT_XP.length-1;i>=0;i--){
    if(tp>=CAT_XP[i].plays){
      if(CAT_XP[i].free||hasMastery)return CAT_XP[i];
      // Fall through to check lower tiers
    }
  }
  // If no mastery, can still get first free tier
  if(tp>=CAT_XP[0].plays)return CAT_XP[0];
  return null;
}

// ════════════════════════════════════════════════════
// NIGHT MODIFIERS - the world shifts each night
// ════════════════════════════════════════════════════
// v37: Night mods deferred to v38
// ════════════════════════════════════════════════════

// ════════════════════════════════════════════════════
// COLONY EVENTS - what happens between the battles
// ════════════════════════════════════════════════════
const COLONY_EVENTS=[
  // ★ v32: Night-gated events — narrative escalates alongside mechanics
  // --- NIGHT 1-2: ESTABLISHING THE COLONY ---
  {id:"cache",title:"The Cache",icon:"📦",maxNight:3,
    textFn:(_,ctx)=>{const c=ctx.all.length;return c>16?`Under the rubble: a dead colony's last supplies. ${c} mouths. Not enough for everything. Enough for a choice.`:`Under the rubble: a dead colony's last supplies. Enough for ${c} cats, if you choose wisely.`;},
    choices:[
      {label:"Take the rations",desc:"+4 Rations",fx:{gold:4}},
      {label:"Feed the strong",desc:"Best cat +2 Power",fx:{bestPower:2}},
      {label:"Stoke the fire",desc:"+2 Nerve",fx:{fervor:2}},
    ]},
  {id:"stranger",title:"The Stranger",icon:"🐱",maxNight:3,
    textFn:(_,ctx)=>{const n=ctx.colony;return n>=16?`A shape at the edge of the firelight. Ribs like a ladder. Eyes that have seen this before. You have ${n} already. One more changes the math.`:`A shape at the edge of the firelight. Ribs like a ladder. Eyes that have seen this before. Your colony of ${n} watches. Waiting for you to decide.`;},
    choices:[
      {label:"Welcome them",desc:"Gain a random cat",fx:{addCat:true}},
      {label:"Feed and release",desc:"-2 Rations, +1 Nerve",fx:{gold:-2,fervor:1}},
      {label:"Chase them off",desc:"Nothing happens",fx:{}},
    ]},
  {id:"first_kill",title:"The First Blood",icon:"🩸",needsCat:"random",maxNight:2,
    textFn:(t,ctx)=>{const sc=ctx?.scarred||0;const n=t[0].name.split(" ")[0];return sc>0?`${n} brought something back. Left it at the entrance. Not as food. As proof. ${sc} of the colony carry scars already. ${n} wants to make sure they weren't for nothing.`:`${n} brought something back. Left it at the entrance. Not as food. As proof. The colony gathers. This is the first kill. It changes things.`;},
    choices:[
      {label:"Honor the hunter",desc:"Cat +2 Power",fx:{targetPower:2}},
      {label:"Share the catch",desc:"+3 Rations",fx:{gold:3}},
      {label:"Bury it",desc:"+2 Nerve",fx:{fervor:2}},
    ]},
  {id:"the_sound",title:"The Sound",icon:"🔊",maxNight:3,
    textFn:(_,ctx)=>`At exactly the same moment, every cat in the colony, all ${ctx.colony} of them, turns east. No one told them to. No one understands why. Ten seconds later, they forget they did it.`,
    choices:[
      {label:"Follow the direction",desc:"Gain a cat",fx:{addCat:true}},
      {label:"Fortify the opposite wall",desc:"+2 Nerve",fx:{fervor:2}},
    ]},
  {id:"the_name",title:"The Old Name",icon:"📜",needsCat:"random",maxNight:3,
    textFn:(t)=>`Someone scratched a name into the wall where ${t[0].name.split(" ")[0]} sleeps. The same name. Over and over.`,
    choices:[
      {label:"Let them read it",desc:"Cat gains a random trait",fx:{targetTrait:true}},
      {label:"Scratch it out",desc:"+3 Rations",fx:{gold:3}},
      {label:"Leave it",desc:"Nothing. Yet.",fx:{}},
    ]},
  {id:"quiet",title:"A Quiet Moment",icon:"🌿",maxNight:3,
    textFn:(_,ctx)=>{const inj=ctx.injured;return inj>0?`For once, nothing is coming. The fire crackles. ${inj} of them are still nursing wounds. But someone purrs. This is what they were fighting for.`:`For once, nothing is coming. The fire crackles. Someone purrs. Every single one of them is here, whole, breathing. This is what they were fighting for.`;},
    choices:[
      {label:"Rest",desc:"All injured cats heal",fx:{fullHeal:true}},
      {label:"Train",desc:"+1 Discard next round",fx:{tempDiscs:1}},
      {label:"Enjoy it",desc:"+2 Rations",fx:{gold:2}},
    ]},
  {id:"omen",title:"The Omen",icon:"🌠",
    textFn:(_,ctx)=>{const n=ctx.nerve;return n==="Still"||n==="Awake"?`A light that casts no shadow. The colony is quiet. Too quiet. As if waiting for something it can't name.`:`A light that casts no shadow. The colony's nerve is ${n.toLowerCase()}. The omen lands differently on cats already burning.`;},
    choices:[
      {label:"Read the signs",desc:"+2 Nerve",fx:{fervor:2}},
      {label:"Scavenge while distracted",desc:"+4 Rations",fx:{gold:4}},
    ]},
  {id:"the_warmth",title:"The Warmth",icon:"🔥",maxNight:2,
    textFn:(_,ctx)=>{const c=ctx?.colony||12;return `Someone found dry wood. Real fuel, not the scraps you've been burning. The fire climbs higher than it has in days. ${c} faces turn golden in the light. For a moment, nobody is counting anything.`;},
    choices:[
      {label:"Let it blaze",desc:"+2 Nerve",fx:{fervor:2}},
      {label:"Cook a real meal",desc:"+3 Rations",fx:{gold:3}},
      {label:"Save the fuel",desc:"+1 Hand next round",fx:{tempHands:1}},
    ]},
  {id:"the_kitten",title:"The Lost Kitten",icon:"🐈",maxNight:3,
    textFn:(_,ctx)=>{const c=ctx?.colony||12;return `Mewing from the rubble. Barely audible. A kitten, too young to survive alone. Eyes still closed. ${c} cats, and every one of them is looking at you.`;},
    choices:[
      {label:"Take them in",desc:"Gain a Power 1 cat",fx:{addCat:true,catPower:1}},
      {label:"Find them food",desc:"-2 Rations. Kitten grows stronger.",fx:{gold:-2,addCat:true,catPower:3}},
      {label:"You can't save everyone",desc:"+1 Nerve",fx:{fervor:1}},
    ]},
  {id:"the_scar_story",title:"The Scar",icon:"⚔️",needsCat:"random",maxNight:3,
    textFn:(t)=>{const n=t[0].name.split(" ")[0];return `${n} caught a claw on something in the dark. Not deep. Not dangerous. But the wound won't stop bleeding. The colony watches to see how ${n} handles it.`;},
    choices:[
      {label:"Let it scar",desc:"Cat scarred. +1 Power.",fx:{targetScar:true,targetPower:1}},
      {label:"Bandage it",desc:"-1 Ration. Cat healed.",fx:{gold:-1}},
      {label:"Wear it proud",desc:"Cat scarred. +2 Nerve.",fx:{targetScar:true,fervor:2}},
    ]},
  {id:"the_watch",title:"The Watch",icon:"👁️",maxNight:2,needsCat:"random",
    textFn:(t,ctx)=>{const n=t[0].name.split(" ")[0];return `${n} volunteers for first watch. Sits at the entrance, ears flat, tail still. When dawn comes, something is different about them. Sharper.`;},
    choices:[
      {label:"Honor the vigil",desc:"Cat +2 Power",fx:{targetPower:2}},
      {label:"Let them rest now",desc:"Cat gains Seer",fx:{targetNamedTrait:"Seer"}},
      {label:"Double the watch",desc:"+2 Nerve",fx:{fervor:2}},
    ]},
  {id:"the_sharing",title:"The Sharing",icon:"🍖",maxNight:3,
    textFn:(_,ctx)=>{const g=ctx?.gold||0;return g>=8?`Rations are good. ${g} fish. More than enough. The question is whether to eat well tonight or save for what's coming. The cats can smell the surplus. Their eyes say tonight.`:`Rations are thin. ${g} fish for ${ctx?.colony||12} mouths. But the smallest cat hasn't eaten since yesterday. The others notice.`;},
    choices:[
      {label:"Feed everyone equally",desc:"+2 Rations, +1 Nerve",fx:{gold:2,fervor:1}},
      {label:"Feed the strongest",desc:"Best cat +1 Power",fx:{bestPower:1}},
      {label:"Save for tomorrow",desc:"+4 Rations",fx:{gold:4}},
    ]},
  {id:"the_game",title:"The Game",icon:"🪶",maxNight:3,needsCat:"pair",
    textFn:(t)=>{const a=t[0].name.split(" ")[0],b=t[1].name.split(" ")[0];return `${a} bats a feather toward ${b}. ${b} bats it back. It's the first time anyone has played since the world ended. The colony stops to watch. Something loosens in the air.`;},
    choices:[
      {label:"Let them play",desc:"Both cats +1 Power",fx:{bothPower:1}},
      {label:"Join in",desc:"+2 Nerve, +1 Discard next round",fx:{fervor:2,tempDiscs:1}},
      {label:"Back to work",desc:"+3 Rations",fx:{gold:3}},
    ]},
  {id:"the_scent",title:"The Scent",icon:"🌿",maxNight:2,
    textFn:(_,ctx)=>{const inj=ctx?.injured||0;return inj>0?`Herbs. Growing in a crack in the wall that shouldn't support life. The scent is sharp and clean. The ${inj} wounded cats press toward it before anyone else moves.`:`Herbs. Growing in a crack in the wall that shouldn't support life. The scent is sharp and clean. Every cat lifts their head.`;},
    choices:[
      {label:"Harvest them",desc:"All injured healed. +2 Rations.",fx:{fullHeal:true,gold:2}},
      {label:"Let them grow",desc:"+1 Hand next round",fx:{tempHands:1}},
      {label:"Mark the spot",desc:"Random cat gains Guardian",fx:{addNamedTrait:"Guardian"}},
    ]},
  {id:"the_old_den",title:"The Old Den",icon:"🏚️",maxNight:3,
    textFn:(_,ctx)=>`Behind the far wall: another den. Older. Abandoned. Scratches on the floor where cats once slept. Whoever was here before didn't leave by choice. But they left something behind.`,
    choices:[
      {label:"Search it",desc:"Gain a random ward",fx:{addWard:true}},
      {label:"Claim the space",desc:"+1 Shelter slot this night",fx:{eventDenBonus:true}},
      {label:"Seal it off",desc:"+2 Nerve. Don't invite ghosts.",fx:{fervor:2}},
    ]},
  // --- NIGHT 2-4: UNDER PRESSURE ---
  {id:"crucible",title:"The Crucible",icon:"🔨",needsCat:"random",minNight:2,
    textFn:(t,ctx)=>{const n=t[0].name.split(" ")[0];const tr=t[0].trait?.name;return tr&&tr!=="Plain"?`${n} has been pushing harder than anyone. The ${tr} in them burns brighter every night. Something is changing behind those eyes.`:`${n} has been pushing harder than anyone. Plain. Unremarkable. Until now. Something is changing behind those eyes.`;},
    choices:[
      {label:"Let the fury build",desc:"Cat gains Scrapper",fx:{targetNamedTrait:"Scrapper"}},
      {label:"Feed the strength",desc:"Cat gains Hefty. -2 Rations.",fx:{targetNamedTrait:"Hefty",gold:-2}},
      {label:"Channel it inward",desc:"+2 Nerve",fx:{fervor:2}},
    ]},
  {id:"whisper",title:"The Whisper",icon:"👂",needsCat:"random",minNight:2,
    textFn:(t)=>`Something spoke to ${t[0].name.split(" ")[0]} in the dark. Not words. More like... a feeling that hasn't faded.`,
    choices:[
      {label:"Let them listen",desc:"Cat gains Echo",fx:{targetNamedTrait:"Echo"}},
      {label:"Follow the feeling",desc:"Cat gains Provider",fx:{targetNamedTrait:"Provider"}},
      {label:"Shake it off",desc:"+3 Rations",fx:{gold:3}},
    ]},
  {id:"kinship",title:"The Kinship",icon:"🫂",needsCat:"pair",minNight:2,
    textFn:(t,ctx)=>{const a=t[0].name.split(" ")[0],b=t[1].name.split(" ")[0];const bd=ctx?.bonded||0;return bd>2?`${a} and ${b} shared something last night. In a colony where ${bd} cats are already bonded, this means something different. Every new connection is a new weight to carry. Every one is worth it.`:`${a} and ${b} shared something last night. Food, warmth, a look. Whatever it was, it changed them both.`;},
    choices:[
      {label:"Let it grow",desc:"Both gain Echo",fx:{bothNamedTrait:"Echo"}},
      {label:"The wild way",desc:"One gains Wild. Both +1 Power.",fx:{targetNamedTrait:"Wild",allPower:1}},
      {label:"Keep it simple",desc:"+4 Rations",fx:{gold:4}},
    ]},
  {id:"the_vigil",title:"The Vigil",icon:"🌙",needsCat:"random",minNight:3,
    textFn:(t)=>`${t[0].name.split(" ")[0]} stayed awake all night. Watching. Not afraid. Just... present. Something shifted before dawn.`,
    choices:[
      {label:"Honor the watch",desc:"Cat gains Hefty. +1 Power.",fx:{targetNamedTrait:"Hefty",targetPower:1}},
      {label:"The luck of the watchful",desc:"Cat gains Provider",fx:{targetNamedTrait:"Provider"}},
      {label:"Rest now",desc:"Cat fully healed. +2 Nerve.",fx:{fervor:2,fullHeal:true}},
    ]},
  {id:"the_hollow",title:"The Hollow",icon:"🕳️",minNight:2,
    textFn:()=>"A gap in the wall. Too small for a predator. Just right for a nest. With a little work, it could shelter one more.",
    choices:[
      {label:"Dig it out",desc:"+1 Shelter slot this night",fx:{eventDenBonus:true}},
      {label:"Store food there",desc:"+4 Rations",fx:{gold:4}},
      {label:"Block it off",desc:"+2 Nerve. Can't risk it.",fx:{fervor:2}},
    ]},
  {id:"sickness",title:"The Sickness",icon:"🤒",needsCat:"random",minNight:2,
    textFn:(t,ctx)=>{const n=t[0].name.split(" ")[0];const c=ctx?.colony||12;return c<12?`${n} hasn't moved since yesterday. In a colony of ${c}, every single one matters, and the others won't go near the corner anymore.`:`${n} hasn't moved since yesterday. The others won't go near the corner anymore. ${c} cats, and every eye avoids that spot.`;},
    choices:[
      {label:"Spend herbs",desc:"-4 Rations, fully healed",fx:{gold:-4}},
      {label:"Let them rest",desc:"Cat -1 Power, but stable",fx:{targetPower:-1}},
      {label:"Do nothing",desc:"50% fine, 50% scarred -2P",fx:{targetGamble:true}},
    ]},
  {id:"storm",title:"The Storm",icon:"⛈️",minNight:2,
    textFn:(_,ctx)=>{const sc=ctx.scarred;return sc>2?`The sky turns the wrong color. Wind like a living thing. ${sc} of your cats already carry scars. They know what's coming.`:`The sky turns the wrong color. Wind like a living thing. They have minutes.`;},
    choices:[
      {label:"Hunker down",desc:"-1 Hand next round, all safe",fx:{tempHands:-1}},
      {label:"Brave it",desc:"Random cat loses 1-2 Power",fx:{randDmg:true}},
      {label:"Find shelter",desc:"-3 Rations, everyone safe",fx:{gold:-3}},
    ]},
  {id:"challenge",title:"The Challenge",icon:"⚔️",needsCat:"pair",minNight:2,
    textFn:(t,ctx)=>{const a=t[0].name.split(" ")[0],b=t[1].name.split(" ")[0];const gr=ctx?.grudges||0;return gr>1?`${a} and ${b} circle each other. This colony already carries ${Math.floor(gr)} grudge${gr>1?"s":""}. One more might be the one that breaks it.`:`${a} and ${b} circle each other. This has been building since the first night. The colony watches. Picking sides without meaning to.`;},
    choices:[
      {label:"Let them fight",desc:"Loser scarred. Winner +2 power",fx:{catFight:true}},
      {label:"Separate them",desc:"Both -1 Power",fx:{bothWeaken:true}},
      {label:"Channel it",desc:"+2 Nerve",fx:{fervor:2}},
    ]},
  {id:"the_pact",title:"The Pact",icon:"🤝",needsCat:"pair",minNight:2,
    textFn:(t,ctx)=>{const a=t[0].name.split(" ")[0],b=t[1].name.split(" ")[0];const same=t[0].breed===t[1].breed;return same?`${a} and ${b}, both ${t[0].breed}, have been inseparable since the second night. Same season, same instinct. They eat together. Fight together. They've made something you didn't arrange.`:`${a} and ${b} have been inseparable since the second night. ${t[0].breed} and ${t[1].breed}, an unlikely pair. They eat together. Fight together. They've made something you didn't arrange.`;},
    choices:[
      {label:"Acknowledge it",desc:"Both bond. +1 Power each.",fx:{pactBond:true}},
      {label:"Separate them",desc:"Both +2 Power. Grudge forms.",fx:{pactGrudge:true}},
    ]},
  {id:"trader",title:"The Trader",icon:"🎪",minNight:2,
    textFn:(_,ctx)=>`They come from nowhere and leave the same way. But what they carry is real enough. They look at your ${ctx.colony} cats like they're counting something.`,
    choices:[
      {label:"Trade weakest cat",desc:"Lose weakest, gain mystery cat",fx:{tradeCat:true}},
      {label:"Buy supplies",desc:"-5🐟, +1 Hand & +1 Discard next round",fx:{gold:-5,tempHands:1,tempDiscs:1}},
      {label:"Walk away",desc:"Nothing happens",fx:{}},
    ]},
  {id:"shrine",title:"The Old Shrine",icon:"🕯️",minNight:2,
    textFn:(_,ctx)=>{const bd=ctx.bonded;return bd>0?`Under the collapsed wall, something that should have crumbled a long time ago. Still whole. Still warm. ${bd} of your cats feel a pull toward it, the bonded ones. As if it recognizes what they share.`:`Under the collapsed wall, something that should have crumbled a long time ago. Still whole. Still warm. Someone built this on purpose.`;},
    choices:[
      {label:"Pray for strength",desc:"Best cat gains a rare trait",fx:{rareTrait:true}},
      {label:"Pray for safety",desc:"Next den: no fights",fx:{eventDenSafe:true}},
      {label:"Take the offerings",desc:"+8 Rations",fx:{gold:8}},
    ]},
  // --- NIGHT 3-5: DESPERATION ---
  {id:"the_choice",title:"The Lifeboat",icon:"⚖️",needsCat:"pair",minNight:3,
    textFn:(t,ctx)=>{const a=t[0].name.split(" ")[0],b=t[1].name.split(" ")[0];const f=ctx?.fallen?.length||0;return f>0?`The supply cache has enough medicine for one. ${a} and ${b} both need it. You've already lost ${f}. You know what this choice costs. You cannot split it.`:`The supply cache has enough medicine for one. ${a} and ${b} both need it. You haven't lost anyone yet. This is where that might change. Choose.`;},
    choices:[
      {labelFn:(t)=>`Save ${t[0].name.split(" ")[0]}`,descFn:(t)=>`${t[0].name.split(" ")[0]} +3 power. ${t[1].name.split(" ")[0]} scarred.`,fx:{choiceSave:0}},
      {labelFn:(t)=>`Save ${t[1].name.split(" ")[0]}`,descFn:(t)=>`${t[1].name.split(" ")[0]} +3 power. ${t[0].name.split(" ")[0]} scarred.`,fx:{choiceSave:1}},
      {label:"Split it anyway",desc:"Both -1 Power. But both live whole.",fx:{bothWeaken:true}},
    ]},
  {id:"the_map",title:"The Map",icon:"🗺️",minNight:3,
    textFn:(_,ctx)=>{const f=ctx.fallen.length;return f>0?`Under a dead colony's floorboards: a map. Not to safety. To something else. The ink is still wet. You think of the ${f} you've already lost. Maybe this is what they would have wanted.`:`Under a dead colony's floorboards: a map. Not to safety. To something else. The ink is still wet. Every cat you have is still here. The map asks if you want to risk that.`;},
    choices:[
      {label:"Follow it",desc:"Remove weakest. Gain a stranger.",fx:{mapFollow:true}},
      {label:"Sell it",desc:"+8 Rations",fx:{gold:8}},
      {label:"Burn it",desc:"+3 Nerve",fx:{fervor:3}},
    ]},
  {id:"flood",title:"Rising Water",icon:"🌊",minNight:3,
    textFn:(_,ctx)=>{const w=ctx.all.filter(c=>c.breed==="Winter").length;return w>1?`Water. Ankle-deep, then waist-deep, then a choice. The ${w} Winter cats barely flinch. Cold is their element. The rest aren't so sure.`:`Water. Ankle-deep, then waist-deep, then a choice. ${ctx.colony} cats, and the water doesn't care about any of them.`;},
    choices:[
      {label:"Save everyone",desc:"Lose half your rations",fx:{halfGold:true}},
      {label:"Save supplies",desc:"Keep rations, 2 weakest cats -2P each",fx:{weakDmg:true}},
    ]},
  {id:"the_cost",title:"What It Costs",icon:"💔",needsCat:"random",minNight:4,
    textFn:(t,ctx)=>{const n=t[0].name.split(" ")[0];const p=t[0].power;return p>=8?`${n} has been carrying the colony. Power ${p}. Everyone knows it. Including whatever watches from outside. The question isn't whether ${n} is strong. It's whether strength costs more than it gives.`:`${n} has been carrying the colony. Everyone knows it. Including whatever watches from outside. And ${n} is starting to feel the weight.`;},
    choices:[
      {label:"Keep them fighting",desc:"Cat gains Scrapper. 50% injured next den.",fx:{targetScrapper:true}},
      {label:"Let them rest",desc:"Cat heals, +2 power. One less hand next round.",fx:{targetHeal:true,tempHands:-1}},
    ]},
  {id:"the_deal",title:"The Offer",icon:"🐕",minNight:4,
    textFn:(_,ctx)=>{const f=ctx.fallen.length;const c=ctx.colony;return f>0?`The thing at the edge of the dark speaks. You understand it. It says it took ${f} already. It offers: one more of yours, and it leaves the rest alone. Tonight.`:`The thing at the edge of the dark speaks. You understand it. ${c} cats, all alive, and it wants just one. That's the offer. For tonight.`;},
    choices:[
      {label:"Refuse",desc:"+2 Nerve. But it remembers.",fx:{fervor:2}},
      {label:"Send the weakest",desc:"Weakest cat lost. Den safe. +6🐟.",fx:{sacrifice:true}},
    ]},
  {id:"the_memory",title:"The Memory",icon:"🧠",minNight:4,
    textFn:(_,ctx)=>{const f=ctx.fallen;return f.length>0?`You dream of a colony that made it. All five nights. Every single cat. You wake up and count yours. ${ctx.colony}. You started with more. ${f[f.length-1].name.split(" ")[0]} isn't here to count.`:`You dream of a colony that made it. All five nights. Every single cat. You wake up and count yours. ${ctx.colony}. All accounted for. The dream feels like a promise.`;},
    choices:[
      {label:"Remember their names",desc:"+2 Nerve",fx:{fervor:2}},
      {label:"Focus on the living",desc:"All cats +1 Power",fx:{allPower:1}},
    ]},
  {id:"the_last_light",title:"The Last Light",icon:"🕯️",minNight:5,maxNight:5,needsFallen:2,
    textFn:(_,ctx)=>{const f=ctx.fallen;const names=f.map(x=>x.name.split(" ")[0]).join(", ");return `Someone lit a candle. Actual fire, in this place. Every cat gravitates toward it. The dark is still out there. But for one moment, the light is louder. ${f.length} names are missing. ${names}. The flame remembers them even if the world won't.`;},
    choices:[
      {label:"Let it burn",desc:"+3 Nerve. The fire is everything now.",fx:{fervor:3}},
      {label:"Shelter it",desc:"All cats fully healed.",fx:{fullHeal:true}},
      {label:"Carry it forward",desc:"Best cat gains Phoenix trait.",fx:{rareTrait:true,specificTrait:"Phoenix"}},
    ]},
  // ─── NEW EVENTS: hidden outcomes, gut decisions, colony-aware ───
  {id:"the_echo",title:"The Echo",icon:"🔊",minNight:1,
    textFn:(_,ctx)=>{const n=ctx?.nerve||"Still";const hi=["Burning","Fury","Blazing","Undying","NINTH LIFE"].includes(n);return hi?`A sound from deep in the walls. Not a voice. Not a growl. Something between a heartbeat and a memory. Your colony is ${n.toLowerCase()}, and the sound feeds on that energy. Some lean toward it. Some back away.`:`A sound from deep in the walls. Not a voice. Not a growl. Something between a heartbeat and a memory. The cats freeze. Some lean toward it. Some back away.`;},
    choices:[
      {label:"Follow the sound",hidden:true,desc:"Random cat +2 power or scarred",fx:{echoGamble:true}},
      {label:"Block it out",hidden:true,desc:"+1 Nerve",fx:{fervor:1}},
    ]},
  {id:"the_gift",title:"Something Left Behind",icon:"🎁",minNight:1,
    textFn:(_,ctx)=>{const c=ctx?.colony||12;return `In the rubble: a bundle, carefully wrapped. It smells like the colony that was here before, the ones who didn't make Night ${ctx?.night||1}. Whatever they left for their ${c>12?"many":"few"}, they left it on purpose.`;},
    choices:[
      {label:"Open it",hidden:true,desc:"Random: +6🐟, a ward, or a curse",fx:{mysteryGift:true}},
      {label:"Leave it",desc:"Nothing happens. Some things aren't yours.",fx:{}},
      {label:"Bury it deeper",hidden:true,desc:"+2 Nerve",fx:{fervor:2}},
    ]},
  {id:"the_weight",title:"The Weight",icon:"⚓",needsCat:"best",minNight:2,
    textFn:(t)=>`${t[0].name.split(" ")[0]} has been carrying the colony on their back. Everyone knows it. ${t[0].name.split(" ")[0]} knows it too. The question is how long a back can bend before it breaks.`,
    choices:[
      {label:"Push harder",hidden:true,desc:"Cat +3 power, 40% chance injured",fx:{pushCat:true}},
      {label:"Share the burden",desc:"Best cat loses 1 power, two weakest gain 1 each",fx:{redistribute:true}},
      {label:"Let them decide",hidden:true,desc:"Cat-dependent outcome",fx:{catDecide:true}},
    ]},
  {id:"the_door",title:"The Door",icon:"🚪",minNight:2,
    textFn:(_,ctx)=>{const sc=ctx?.scarred||0;return sc>2?`There's a door in the wall that wasn't there yesterday. Through the crack, warm air and the smell of something growing. ${sc} of your cats carry scars. They've learned to distrust warm things.`:`There's a door in the wall that wasn't there yesterday. Not hidden. Not new. Just waiting. Through the crack, warm air and the smell of something growing.`;},
    choices:[
      {label:"Go through",hidden:true,desc:"???",fx:{mysteryDoor:true}},
      {label:"Seal it shut",desc:"+2 Nerve. Mysteries are just danger with better lighting.",fx:{fervor:2}},
    ]},
  {id:"the_chorus",title:"The Chorus",icon:"🎵",minNight:2,
    textFn:(_,ctx)=>{const bd=ctx?.bonded||0;const inj=ctx?.injured||0;return inj>0?`All at once, without signal or reason, the cats begin to purr. Together. In rhythm. Even the ${inj} wounded ones. The sound fills the space like something solid. Like armor made of vibration.`:bd>2?`All at once, without signal or reason, the cats begin to purr. Together. In rhythm. The bonded pairs sync first, then the rest follow. The sound fills the space like something solid.`:`All at once, without signal or reason, the cats begin to purr. Together. In rhythm. The sound fills the space like something solid. Like armor made of vibration.`;},
    choices:[
      {label:"Listen",desc:"All cats heal injuries",fx:{fullHeal:true}},
      {label:"Join in",hidden:true,desc:"???",fx:{chorusJoin:true}},
    ]},
  {id:"the_tide",title:"The Tide",icon:"🌊",minNight:3,
    textFn:(_,ctx)=>{const c=ctx?.colony||12;return `It comes from nowhere. Not water, something thicker. It rises ankle-high and stops. In its surface, ${c} reflections that don't match. Every cat sees something different.`;},
    choices:[
      {label:"Let them look",hidden:true,desc:"Each cat has a chance to gain or lose",fx:{tideGaze:true}},
      {label:"Drive them back",desc:"+2 Nerve, all cats lose 1 power",fx:{fervor:2,allPowerLoss:true}},
      {label:"Wade into it",hidden:true,desc:"Best cat transforms",fx:{tideWade:true}},
    ]},
  {id:"the_debt",title:"The Debt",icon:"💰",minNight:3,
    textFn:(_,ctx)=>{const g=ctx?.gold||0;const f=ctx?.fallen?.length||0;return f>0?`Something arrives at the edge of the colony's light. It extends a paw. On it, a tally. ${f} marks fresh, the rest old. It is exactly what you owe. It always is.`:`Something arrives at the edge of the colony's light. It extends a paw. On it, a tally. Scratches in flesh. You have ${g} rations. The number on the paw is close to half. It always is.`;},
    choices:[
      {label:"Pay in rations",desc:"−half your 🐟. Den is safe next phase.",fx:{halfGold:true,eventDenSafe:true}},
      {label:"Pay in blood",hidden:true,desc:"Random cat scarred. Something gained.",fx:{debtBlood:true}},
      {label:"Refuse the debt",hidden:true,desc:"???",fx:{debtRefuse:true}},
    ]},
  {id:"the_inheritance",title:"The Inheritance",icon:"📜",needsCat:"random",minNight:3,
    textFn:(t)=>`${t[0].name.split(" ")[0]} found something buried beneath their sleeping spot. Old. Deliberate. Addressed to no one and everyone. A previous colony's last will and testament.`,
    choices:[
      {label:"Read it aloud",hidden:true,desc:"Colony-wide effect",fx:{inheritanceRead:true}},
      {label:"Keep it private",hidden:true,desc:"Finder only",fx:{inheritancePrivate:true}},
      {label:"Burn it",desc:"+3 Nerve. The past is not a map.",fx:{fervor:3}},
    ]},
  {id:"the_split",title:"The Split",icon:"🔀",needsCat:"pair",minNight:3,
    textFn:(t,ctx)=>{const a=t[0].name.split(" ")[0],b=t[1].name.split(" ")[0];const ap=t[0].power,bp=t[1].power;return `${a} wants to go left. ${b} wants to go right. Power ${ap} against Power ${bp}. For the first time, the colony is looking at two futures. The stronger path isn't always the safer one.`;},
    choices:[
      {labelFn:(t)=>`Follow ${t[0].name.split(" ")[0]}`,hidden:true,desc:"???",fx:{splitFollow:0}},
      {labelFn:(t)=>`Follow ${t[1].name.split(" ")[0]}`,hidden:true,desc:"???",fx:{splitFollow:1}},
      {label:"Neither, forge ahead",desc:"+1 Nerve. Both cats lose 1 power.",fx:{fervor:1,bothWeaken:true}},
    ]},
  {id:"the_hollow",title:"The Hollow Tree",icon:"🌳",minNight:2,
    textFn:(_,ctx)=>{const inj=ctx?.injured||0;return inj>0?`The tree has been dead for years but something lives inside it. Not an animal. A warmth. The ${inj} wounded cats press against it first. As if it knows what hurts.`:`The tree has been dead for years but something lives inside it. Not an animal. A warmth. The cats circle it, curious. Something in there wants to be found.`;},
    choices:[
      {label:"Send someone in",hidden:true,desc:"Random cat enters",fx:{hollowEnter:true}},
      {label:"Rest in its shade",desc:"All injured cats heal. +1 Discard next round.",fx:{fullHeal:true,tempDiscs:1}},
    ]},
  {id:"the_wager",title:"The Wager",icon:"🎲",minNight:4,
    textFn:(_,ctx)=>{const g=ctx?.gold||0;const best=ctx?.all?.sort((a,b)=>b.power-a.power)[0];const bn=best?best.name.split(" ")[0]:"your best";return `A voice from the dark. Not cruel. Almost playful. It knows ${bn}'s name. It knows you have ${g} rations. 'Bet something you love against something you need. I always pay my debts.'`;},
    choices:[
      {label:"Bet your best cat",hidden:true,desc:"Risk the strongest for ???",fx:{wagerBest:true}},
      {label:"Bet your rations",hidden:true,desc:"Risk half 🐟 for ???",fx:{wagerGold:true}},
      {label:"Walk away",desc:"'Smart. Boring. But smart.'",fx:{}},
    ]},
  {id:"the_truth",title:"The Truth",icon:"👁️",needsCat:"random",minNight:4,
    textFn:(t)=>`${t[0].name.split(" ")[0]} hasn't slept in two nights. They keep staring at the same spot on the wall. When you follow their eyes, there's nothing there. But ${t[0].name.split(" ")[0]} disagrees.`,
    choices:[
      {label:"Trust them",hidden:true,desc:"What did they see?",fx:{truthTrust:true}},
      {label:"Pull them away",desc:"Cat healed, +1 power. But they won't stop looking.",fx:{targetHeal:true}},
    ]},
  // ★ v48+: NEW EVENTS — cover remaining traits
  {id:"the_pack",title:"The Pack",icon:"🐾",minNight:2,
    textFn:(_,ctx)=>{const c=ctx?.colony||12;return c>=16?`They came from everywhere. A dozen strays, thin and wild-eyed. They look at your ${c} and do the math. You're already big. They want to make you bigger.`:`They came from everywhere. A dozen strays, thin and wild-eyed. Your colony of ${c} watches from the firelight. The strays don't want shelter. They want numbers. There's safety in crowds.`;},
    choices:[
      {label:"Welcome them in",desc:"Cat gains Feral. +2 strays join deck.",fx:{targetNamedTrait:"Feral",addStrays:2}},
      {label:"Send a scout",desc:"+1 stray. +2 Rations.",fx:{addStrays:1,gold:2}},
      {label:"Drive them off",desc:"+3 Nerve. They'll remember this.",fx:{fervor:3}},
    ]},
  {id:"the_vision",title:"The Vision",icon:"🔮",needsCat:"random",minNight:2,
    textFn:(t)=>`${t[0].name.split(" ")[0]} woke the others with a sound no one had heard before, half growl, half song. Eyes open, but seeing somewhere else. When it passed, ${t[0].name.split(" ")[0]} said three words: "I saw tomorrow."`,
    choices:[
      {label:"Believe them",desc:"Cat gains Seer.",fx:{targetNamedTrait:"Seer"}},
      {label:"Ask what they saw",hidden:true,desc:"The answer might not be kind.",fx:{visionPeek:true}},
      {label:"Let it pass",desc:"+2 Nerve. Some doors stay closed.",fx:{fervor:2}},
    ]},
  {id:"the_devotion",title:"The Devotion",icon:"💕",needsCat:"pair",minNight:2,
    textFn:(t)=>`${t[0].name.split(" ")[0]} won't eat unless ${t[1].name.split(" ")[0]} eats first. Won't sleep unless they're close. It's not weakness. It's a gravity between them that even the dark can feel.`,
    choices:[
      {label:"Bless the bond",desc:"One gains Devoted. Both bond.",fx:{targetNamedTrait:"Devoted",forceBond:true}},
      {label:"Use it",desc:"Both +2 Power. Love as fuel.",fx:{bothPower:2}},
      {label:"Separate them",desc:"+3 Nerve. Hearts are liabilities.",fx:{fervor:3}},
    ]},
  {id:"the_hex",title:"The Hex",icon:"💀",needsCat:"random",minNight:3,
    textFn:(t)=>`Something followed ${t[0].name.split(" ")[0]} back from the dark. Not an injury. Something worse. A kind of wrongness that makes the other cats flinch. ${t[0].name.split(" ")[0]} can feel it too. But there's a strange power in being the one nobody wants to stand next to.`,
    choices:[
      {label:"Embrace it",desc:"Cat gains Cursed. +3 Nerve.",fx:{targetNamedTrait:"Cursed",fervor:3}},
      {label:"Fight it off",desc:"Cat +2 Power. −2 Rations.",fx:{targetPower:2,gold:-2}},
      {label:"Quarantine",desc:"Cat sheltered. Others +1 Power.",fx:{shelterTarget:true,othersPower:1}},
    ]},
  {id:"the_glass",title:"The Glass Cat",icon:"🩻",needsCat:"random",minNight:2,
    textFn:(t)=>`${t[0].name.split(" ")[0]} is getting thinner. Not sick, translucent. You can almost see through them. The other cats instinctively close ranks around ${t[0].name.split(" ")[0]}, as if protecting something precious. Something that might break.`,
    choices:[
      {label:"Let them become what they're becoming",desc:"Cat gains Fragile.",fx:{targetNamedTrait:"Fragile"}},
      {label:"Feed them everything",desc:"Cat +3 Power. −3 Rations.",fx:{targetPower:3,gold:-3}},
      {label:"The colony will carry them",desc:"Cat gains Guardian instead.",fx:{targetNamedTrait:"Guardian"}},
    ]},
  {id:"the_escape",title:"The Escape Route",icon:"🪶",minNight:2,
    textFn:(_,ctx)=>{const sm=ctx?.all?.sort((a,b)=>a.power-b.power)[0];const sn=sm?sm.name.split(" ")[0]:"the smallest";return `A gap in the ceiling. Too narrow for most, but there's sky up there, real sky, not the dark's imitation. ${sn} could squeeze through. Learn the angles. Find the fast way out of anything.`;},
    choices:[
      {label:"Send the smallest",desc:"Random cat gains Swift.",fx:{targetNamedTrait:"Swift"}},
      {label:"Widen it for everyone",desc:"+1 Discard next round. +2 Rations.",fx:{tempDiscs:1,gold:2}},
      {label:"Collapse it",desc:"+3 Nerve. No retreat. No escape.",fx:{fervor:3}},
    ]},
  {id:"the_wounded",title:"The Wounded",icon:"🛡️",needsCat:"random",minNight:3,
    textFn:(t)=>`${t[0].name.split(" ")[0]} hasn't stopped watching the injured. Not hovering, but positioning. Always between the hurt ones and the door. Always awake. It's not a choice they're making. It's who they are.`,
    choices:[
      {label:"Honor the instinct",desc:"Cat gains Guardian.",fx:{targetNamedTrait:"Guardian"}},
      {label:"Put them on watch",desc:"Den is safe next phase. Cat loses 1 power.",fx:{eventDenSafe:true,targetWeaken:1}},
      {label:"Everyone fights",desc:"+2 Nerve. No one sits out.",fx:{fervor:2}},
    ]},
  {id:"the_convergence",title:"The Convergence",icon:"🧬",needsCat:"random",minNight:3,
    textFn:(t)=>`Something is happening to ${t[0].name.split(" ")[0]}. Their markings are shifting, autumn brown bleeding into summer gold, winter frost creeping up spring green. As if every season is trying to claim them at once. It should be impossible. It is impossible. And yet.`,
    choices:[
      {label:"Let the change complete",desc:"Cat gains Chimera.",fx:{targetNamedTrait:"Chimera"}},
      {label:"Anchor them",desc:"Cat +3 Power. They stay what they are.",fx:{targetPower:3}},
      {label:"Study it",desc:"All cats +1 mult next round. +2 Nerve.",fx:{fervor:2,tempMult:1}},
    ]},
  {id:"the_dominance",title:"The Dominance",icon:"🐺",needsCat:"pair",minNight:3,
    textFn:(t)=>`${t[0].name.split(" ")[0]} and ${t[1].name.split(" ")[0]} squared off over the last ration. Not a fight, something older. A question: who leads? The colony held its breath. Someone has to answer.`,
    choices:[
      {label:"Let the stronger lead",desc:"Highest power cat gains Alpha.",fx:{bestNamedTrait:"Alpha"}},
      {label:"Break it up",desc:"Both +1 Power. Neither leads. Both remember.",fx:{bothPower:1}},
      {label:"You decide",desc:"+2 Nerve. +3 Rations. The question waits.",fx:{fervor:2,gold:3}},
    ]},
  {id:"the_nightwatch",title:"The Nightwatch",icon:"🌙",needsCat:"random",minNight:4,
    textFn:(t)=>`${t[0].name.split(" ")[0]} volunteered for the watch. Every night. Without being asked. The others sleep easier for it. But ${t[0].name.split(" ")[0]} is changing, and something about the dark agrees with them. They don't just endure it anymore. They drink it in.`,
    choices:[
      {label:"Let the dark feed them",desc:"Cat gains Nocturnal.",fx:{targetNamedTrait:"Nocturnal"}},
      {label:"Rotate the watch",desc:"All cats heal injuries. +1 Nerve.",fx:{fullHeal:true,fervor:1}},
      {label:"No one watches alone",desc:"Cat +2 Power. +2 Nerve.",fx:{targetPower:2,fervor:2}},
    ]},
];
// ════════════════════════════════════════════════════
// BOSS REWARDS - each threat leaves something behind
// ════════════════════════════════════════════════════
const BOSS_REWARDS=[
  {name:"What They Left Behind",desc:"+6 Rations",icon:"🐟",type:"gold",value:6},
  {name:"Earned Ground",desc:"+1 Hand per round (this run)",icon:"✊",type:"hands",value:1},
  {name:"Her Locket",desc:"Best cat gains a rare trait",icon:"💎",type:"trait"},
  {name:"Cleared Path",desc:"Remove 3 weakest cats",icon:"🗑️",type:"thin",value:3},
  {name:"They Remember",desc:"All cats +1 Power",icon:"⭐",type:"power",value:1},
];

// ════════════════════════════════════════════════════
// ★ v34: EXPANDED BOSS ROSTER — echoes of the fallen colonies
// ════════════════════════════════════════════════════
// These bosses join the rotation pool after 3+ wins. Each is the death-pattern of a colony.
const EXPANDED_BOSSES=[
  {name:"The Fraying",icon:"🕸️",
    taunt:"I'm already inside. I always have been.",
    tauntFn:(ctx)=>ctx.bonded>3&&ctx.grudges>0?"Love and hate in the same den. I don't even have to try."
      :ctx.grudges>0?`They resent each other. I can taste it.`
      :"No grudges? Give it time. I'm patient.",
    defeat:"You held it together. The Fifth Colony said the same thing on Night 3.",
    defeatFn:(ctx)=>ctx.clutch?"Held together by a thread. I know what threads do."
      :"You healed what I infected. Impressive. Temporary.",
    lore:"The colony that ate itself."},
  {name:"The Eclipse",icon:"🌑",
    taunt:"You've fought so hard. Isn't it time to rest?",
    tauntFn:(ctx)=>ctx.fallen>2?"You've lost so many. Why keep going? For what?"
      :ctx.colony<12?"So few of you. You've done enough. It's okay."
      :"All that nerve. All that fire. Aren't you tired?",
    defeat:"Fine. Burn. But fire always goes out eventually.",
    defeatFn:(ctx)=>ctx.clutch?"You almost let go. You wanted to. I felt it."
      :"Still burning. The Sixth Colony burned too. Until they didn't.",
    lore:"The fire went out and no one relit it."},
  {name:"The Ember That Remains",icon:"🔥",
    taunt:"Don't you dare fall one short. Don't you dare.",
    tauntFn:(ctx)=>ctx.clutch?"Cutting it close. I know what 'close' costs."
      :ctx.colony<10?"Not enough of you. There weren't enough of us either."
      :ctx.fallen>0?"We lost three on Night 4. Thought we could still make it. 'Still' is a lie."
      :"This is where we died. Right here. Make it different.",
    defeat:"Good. Do what we couldn't. And don't look back.",
    defeatFn:(ctx)=>ctx.clutch?"By that much? Of course by that much. It's always by that much."
      :"All of them. You kept all of them. We... couldn't.",
    lore:"One hand short. That's the whole story."},
];

// ★ v34: BOSS TRAITS — modifier system for boss fights
const BOSS_TRAITS=[
  {id:"armored",name:"Armored",icon:"🛡️",desc:"+20% threshold",flavor:"It remembers how to protect itself.",fx:{tgtMult:1.2}},
  {id:"ruthless",name:"Ruthless",icon:"💀",desc:"Lose a hand → random cat injured",flavor:"It takes what it can.",fx:{ruthless:true}},
  {id:"watchful",name:"Watchful",icon:"👁️",desc:"Strength meter disabled",flavor:"It knows what you're holding.",fx:{noStrength:true}},
  {id:"sealed",name:"Sealed",icon:"🔒",desc:"Ward abilities blocked",flavor:"Your tricks won't work.",fx:{sealed:true}},
  {id:"bleeding",name:"Bleeding",icon:"🩸",desc:"Threshold −2% per hand played",flavor:"It weakens, but will you last?",fx:{bleeding:true}},
  {id:"frozen",name:"Frozen",icon:"🧊",desc:"First 2 cats score half power",flavor:"The cold takes the first ones.",fx:{frozen:true}},
  {id:"enraged",name:"Enraged",icon:"🔥",desc:"Threshold −15%, all cats +3 mult",flavor:"It fights harder. So do you.",fx:{tgtMult:0.85,enragedMult:3}},
  {id:"fading",name:"Fading",icon:"🕯️",desc:"Threshold +5% per hand remaining",flavor:"It grows stronger as time runs out.",fx:{fading:true}},
  {id:"mirrored",name:"Mirrored",icon:"🪞",desc:"Best cat scores at half",flavor:"It turns your best against you.",fx:{mirrored:true}},
];

// ★ v34: Boss trait assignment rules
function pickBossTraits(ante,heat,isNinthDawn){
  const pool=shuf([...BOSS_TRAITS]);
  let count=0;
  if(ante===1)count=0;
  else if(ante===2)count=Math.random()<0.5?0:1;
  else if(ante===3)count=1;
  else if(ante===4)count=Math.random()<0.5?1:2;
  else count=2;
  if((heat||0)>=2)count+=1;
  if(isNinthDawn)count=Math.min(3,count+1);
  return pool.slice(0,Math.min(count,3));
}

// ★ v34: HEAT FLAVOR TEXT — narrative framing for difficulty
const HEAT_FLAVOR=[
  "",
  "The fire remembers.",
  "They're sending you instead of an army.",
  "The dark noticed.",
  "Everything you've built burns in your defense.",
  "Ninth life. Last light. No mercy.",
];

// ★ v35: HEAT RELICS — permanent trophies earned through fire (one per Heat cleared first time)
const HEAT_RELICS=[
  null, // index 0 unused
  {heat:1,icon:"🕯️",name:"First Flame",desc:"Colony events offer +1 choice",flavor:"The first light anyone carried out of the dark."},
  {heat:2,icon:"⚔️",name:"Old Scars",desc:"Scarred cats start with +1 Power",flavor:"What doesn't kill them makes everyone remember."},
  {heat:3,icon:"👁️",name:"The Vigil",desc:"Boss intros reveal their weakness",flavor:"They watched the dark long enough to learn its patterns."},
  {heat:4,icon:"🌟",name:"Ninth Star",desc:"Hearth descendants start with +1 Power",flavor:"The bloodline strengthens."},
  {heat:5,icon:"🔥",name:"Undying Flame",desc:"Start every run with +1 Nerve",flavor:"The last thing the dark expected: someone who came back angrier."},
];

// ★ v34: NINTH DAWN EVENTS — exclusive to the endgame run
const NINTH_DAWN_EVENTS=[
  {id:"nd_first_fire",title:"The First Colony's Fire",icon:"🔥",minNight:1,maxNight:1,ninthDawn:true,
    textFn:(_,ctx)=>{const inj=ctx?.injured||0;return inj>0?`You find warmth where there should be none. A fire pit, maintained by no one, burning fuel that doesn't exist. ${inj} of your cats are hurting. They press close. The First Colony's last gift. Or their last trap.`:`You find warmth where there should be none. A fire pit, maintained by no one, burning fuel that doesn't exist. The First Colony starved behind perfect walls. This fire is all that remains of them.`;},
    choices:[
      {label:"Tend the flame",desc:"+3 Nerve. All cats heal.",fx:{fervor:3,fullHeal:true}},
      {label:"Take the coals",desc:"+6 Rations",fx:{gold:6}},
      {label:"Let it burn out",desc:"Best cat gains Mythic trait",fx:{rareTrait:true,specificTrait:"Eternal"}},
    ]},
  {id:"nd_second_wall",title:"The Second Colony's Wall",icon:"🧱",minNight:2,maxNight:2,ninthDawn:true,
    textFn:(_,ctx)=>{const c=ctx?.colony||12;return `A wall. Built perfectly. Every stone placed with intention. Behind it: nothing. The Second Colony defended something that was already gone. Your ${c} study the craftsmanship. The question is whether to build on ruin.`;},
    choices:[
      {label:"Tear it down",desc:"+2 Hands next round",fx:{tempHands:2}},
      {label:"Build upon it",desc:"Den is safe next phase",fx:{eventDenSafe:true}},
      {label:"Study the stones",desc:"Random cat gains a trait",fx:{targetTrait:true}},
    ]},
  {id:"nd_third_cradle",title:"The Third Colony's Cradle",icon:"🍼",minNight:3,maxNight:3,ninthDawn:true,
    textFn:(_,ctx)=>{const bd=ctx?.bonded||0;return bd>0?`A nest. Woven from materials that don't grow here anymore. Inside: tiny bones, curled together. She tried to keep them warm. She tried so hard. Your ${bd} bonded cats understand. They look away first.`:`A nest. Woven from materials that don't grow here anymore. Inside: tiny bones, curled together. The Third Colony's leader loved every one of them. That was her mistake. And her gift.`;},
    choices:[
      {label:"Grieve",desc:"All bonded cats +2 Power",fx:{bondedPower:2}},
      {label:"Promise",desc:"+4 Nerve",fx:{fervor:4}},
      {label:"Carry the bones",desc:"A kitten appears. P1. Phoenix trait.",fx:{addPhoenixKitten:true}},
    ]},
  {id:"nd_eighth_score",title:"The Eighth Colony's Score",icon:"📊",minNight:4,maxNight:4,ninthDawn:true,
    textFn:(_,ctx)=>{const hs=ctx?.all?Math.max(...ctx.all.map(c=>c.stats?.bs||0)):0;return hs>10000?`Scratched into the floor: a number. Their best score. Their last score. The one that wasn't enough. You've scored higher. The number stares at you like a dare anyway.`:`Scratched into the floor: a number. Their best score. Their last score. The one that wasn't enough. The Eighth Colony came this close. One hand short. The number stares at you like a dare.`;},
    choices:[
      {label:"Beat it",desc:"Next hand ≥50% of threshold? +6 Nerve. Else −3.",fx:{dareBet:true}},
      {label:"Honor it",desc:"+5 Rations. Some things need witnessing.",fx:{gold:5}},
      {label:"Erase it",desc:"Best cat gains Scrapper",fx:{targetScrapper:true}},
    ]},
  {id:"nd_names_wall",title:"The Names on the Wall",icon:"📜",minNight:5,maxNight:5,ninthDawn:true,
    textFn:(_,ctx)=>{const c=ctx?.colony||12;const f=ctx?.fallen?.length||0;return f>0?`Every name. Every colony. Scratched, painted, burned into stone. Hundreds of names you will never know. Below them, space for ${c} more. And ${f} empty spaces where names should have been.`:`Every name. Every colony. Scratched, painted, burned into stone. Hundreds of names you will never know. And below them, space for exactly ${c} more. Your cats' names. There is exactly enough room.`;},
    choices:[
      {label:"Write their names",desc:"All cats +1 Power",fx:{allPower:1}},
      {label:"Leave it blank",desc:"+5 Nerve. Names are for the living.",fx:{fervor:5}},
    ]},
];

// ★ v34: THE REMEMBERING — final boss of the Ninth Dawn
const THE_REMEMBERING={
  name:"The Remembering",icon:"🌅",
  taunt:"I am everyone you saved and everyone you lost. Do you know why you're here?",
  tauntFn:(ctx)=>"I am the First Colony's hunger and the Eighth Colony's last hand. I am the fire that went out and the fire that didn't.",
  defeat:"Not because you're strong. Because you remember.",
  defeatFn:(ctx)=>ctx.clutch?"By that much. Of course. It's always by that much. But you remembered."
    :"They will remember this colony. They will have to. Because you remembered all the rest.",
  lore:"The last question is not 'did you survive.' It is 'did you remember.'",
};

// ★ v34: Ninth Dawn unlock check
function canUnlockNinthDawn(meta){
  if(!meta)return false;
  const w=meta.stats.w||0,h=meta.heat||0,cats=meta.cats?.length||0;
  const allBreeds=BK.every(b=>(meta.stats.disc||[]).some(d=>d.startsWith(b)));
  const achvCount=(meta.achv||[]).length;
  return w>=1&&h>=3&&cats>=9&&allBreeds&&achvCount>=3;
}
// ════════════════════════════════════════════════════
// THE EPIGRAPH - the question the whole game answers
// ════════════════════════════════════════════════════
const EPIGRAPHS=[
  "You don't get to choose what you lose. Only what you carry.",
  "A colony is a bet against the dark. Sometimes the dark wins.",
  "They asked me how many survived. I told them their names instead.",
  "The difference between a colony and a grave is one more night.",
  "Every name is a small act of defiance against forgetting.",
  // ★ v34: Narrative bible additions — mythology seeps through
  "Eight colonies fell. This one doesn't have to.",
  "The dark doesn't hate you. It doesn't know you're there. Yet.",
  "What do you call the thing that keeps burning after everything else goes out?",
  "They didn't win because they were the strongest. They won because they didn't stop.",
  "Somewhere behind the dark, the dawn is keeping score.",
  "A colony is just a word for people who refuse to die alone.",
  "The first colony starved. The second fought. The third loved too much. You get one more try.",
  "Not all fires go out. Some of them become Hearths.",
];
// ★ v34: Dynamic epigraphs — the title screen KNOWS your history
function getEpigraph(meta){
  if(!meta||meta.stats.r===0)return pk(EPIGRAPHS);
  const w=meta.stats.w||0,r=meta.stats.r||0,h=meta.heat||0,cats=meta.cats?.length||0;
  // Ninth Dawn unlocked
  if(w>=1&&h>=3&&cats>=9&&BK.every(b=>(meta.stats.disc||[]).some(d=>d.startsWith(b)))&&(meta.achv||[]).length>=3){
    if(meta.ninthDawnCleared)return "Nine colonies. One survived. Not because it was the strongest. Because someone remembered all the rest.";
    return "The Hearth is bright enough to see by now. Something is coming. Not from the dark. From the light.";
  }
  if(h>=3&&w>=6)return "They said it couldn't burn this bright.";
  if(w>=10)return "You are what the colonies were for.";
  if(r>=6)return "The dark has learned to flinch.";
  if(w>=4)return "They're starting to tell stories about you.";
  if(w>=2)return "The Hearth burns a little brighter.";
  if(r>=1)return "The night remembers your name now.";
  return pk(EPIGRAPHS);
}

// NIGHT EPIGRAPHS - chapter cards, not flavor text
const NIGHT_EPI=[
  "I. WHAT REMAINS",
  "II. THE COST OF KEEPING",
  "III. THE ONES YOU COULDN'T SAVE",
  "IV. WHAT YOU CHOSE",
  "V. WHAT IT WAS ALL FOR",
];
// ★ v34: Night subtitles — one-line flavor beneath the chapter title
const NIGHT_SUB=[
  "Count them. Remember the number.",
  "Everything you save costs something else.",
  "Say their names. Then keep going.",
  "You are the sum of every choice.",
  "Answer the question. Then answer it again.",
];

// ★ SCORE REACTIONS - escalating hype + ★ v34: narrator voice
const SCORE_TIERS=[{min:0,label:"",color:"",sub:"",nar:""},{min:1500,label:"Alive",color:"#9a8672",sub:"",nar:"Still here."},{min:6000,label:"Defiant",color:"#b85c2c",sub:"they felt that one",nar:"They won't forget this hand."},{min:15000,label:"ROARING",color:"#f59e0b",sub:"the ground shakes",nar:"The dark is listening now."},{min:45000,label:"UNSTOPPABLE",color:"#fbbf24",sub:"nothing can touch them",nar:"This is what a colony looks like."},{min:150000,label:"LEGENDARY",color:"#fef08a",sub:"they will tell stories about this",nar:"Write it down. Someone needs to know."},{min:500000,label:"NINTH LIFE",color:"#ffffffdd",sub:"the dark blinks first",nar:"Nine lives. Nine colonies. This is the one."}];
function getScoreTier(s){let t=SCORE_TIERS[0];for(const tier of SCORE_TIERS)if(s>=tier.min)t=tier;return t;}
function getShakeIntensity(s){if(s<1500)return 0;if(s<6000)return 1;if(s<15000)return 2;if(s<45000)return 3;return 5;}
let _nis=0;const _un=new Set();
function gN(br,trait){
  const isChosen=trait&&trait.name&&trait.name!=="Plain";
  const tName=isChosen?trait.name:null;
  let n;
  if(isChosen){
    // ★ Build weighted pool: core + 2x seasonal + 3x trait-flavored, then shuffle
    const pool=[...CHOSEN_CORE];
    if(CHOSEN_SEASON[br])pool.push(...CHOSEN_SEASON[br],...CHOSEN_SEASON[br]); // double-weight season
    if(tName&&CHOSEN_TRAIT[tName])pool.push(...CHOSEN_TRAIT[tName],...CHOSEN_TRAIT[tName],...CHOSEN_TRAIT[tName]); // triple-weight trait
    // Shuffle and pick first unused
    const shuffled=pool.sort(()=>Math.random()-0.5);
    n=shuffled.find(x=>!_un.has(x));
    if(!n)n=shuffled[0]; // safety: all used (very unlikely)
  }else{
    // Strays: cycle through with offset
    let a=0;
    do{n=STRAY_NAMES[(_nis++)%STRAY_NAMES.length];a++;}while(_un.has(n)&&a<STRAY_NAMES.length);
  }
  _un.add(n);
  // Titles: rare traits get grander titles, others get seasonal
  if(isChosen&&Math.random()<.30){
    const rareTitles=tName&&TITL_RARE[tName];
    if(rareTitles&&Math.random()<.6)return`${n} ${pk(rareTitles)}`;
    if(TITL[br])return`${n} ${pk(TITL[br])}`;
  }
  return n;
}

// ─── Cat Quirks — personality tags that make cats memorable ───
const QUIRKS={
  Autumn:["stares at falling things","sleeps with one eye open","hoards scraps","vanishes mid-conversation","sits in doorways","refuses to be held","watches the horizon"],
  Summer:["purrs aggressively","knocks things over","yells at dawn","eats too fast","picks fights for fun","headbutts everyone","steals food"],
  Winter:["never blinks first","sits perfectly still","watches snow fall","last to sleep","first to wake","ignores chaos","waits by the door"],
  Spring:["grooms everyone","brings gifts","naps in sunlight","follows the youngest","purrs in their sleep","finds water","nudges the sad ones"],
};

// ─── Utility ─────────────────────────────────────────────────
let _cid=0;
const uid=()=>`c${++_cid}`;
const pk=a=>a&&a.length?a[Math.floor(Math.random()*a.length)]:undefined;
const shuf=a=>{const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;};
const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));

function gC(o={}){
  const br=o.breed||pk(BK);
  // ★ v30: All callers now pass explicit trait. Fallback kept for safety.
  const defaultTrait=o.trait||pickTrait(false)||PLAIN;
  const cat={id:uid(),breed:br,power:o.power||(Math.floor(Math.random()*9)+1),
    trait:defaultTrait,extraTraits:o.extraTraits||[],name:o.name||gN(br,defaultTrait),
    sex:o.sex||(Math.random()<.5?"M":"F"),
    parentBreeds:o.parentBreeds||null,
    // ★ v33: Quirk — personality tag for memorability
    quirk:o.quirk||pk(QUIRKS[o.breed||br]||QUIRKS.Autumn),
    scarred:o.scarred||false, injured:o.injured||false, bondedTo:o.bondedTo||null,
    // ★ v33: Array-based grudges — cats accumulate rivalries
    grudgedWith:o.grudgedWith||[],
    // ★ v33: Story moments — key events that define this cat's run
    story:o.story||[],
    stats:o.stats||{tp:0,ts:0,bs:0,bh:""}};
  return cat;
}

function breedC(p1,p2){
  // ★ v46: Generate descendant from two parent cats
  let br=Math.random()<.08?pk(BK):(Math.random()<.5?p1.breed:p2.breed);
  const m=Math.random()<.15?(Math.random()<.5?1:-1):0;
  const pw=clamp(Math.round((p1.power+p2.power)/2)+m,1,15);
  // ★ v27: Baby trait inheritance - parents pass traits if they have them
  let tr=PLAIN;
  const p1Traits=catAllTraits(p1),p2Traits=catAllTraits(p2);
  const parentTraits=[...p1Traits,...p2Traits].filter(t=>t.name!=="Plain");
  if(parentTraits.length>0&&Math.random()<0.6)tr=pk(parentTraits); // 60% inherit from parent
  if(Math.random()<0.08)tr=pickBreedTrait(); // 8% mutation overrides
  const pBreeds=(p1.breed!==p2.breed)?[p1.breed,p2.breed]:null;
  return gC({breed:br,power:pw,trait:tr,parentBreeds:pBreeds,
    parentIds:[p1.id,p2.id],
    sex:Math.random()<.5?"M":"F",
    stats:{tp:0,ts:0,bs:0,bh:"",par:`${p1.name.split(" ")[0]} & ${p2.name.split(" ")[0]}`}});
}

// ★ DEN AFFINITY: Calculates what happens between two cats overnight
function calcAffinity(c1,c2,ctx={}){
  let breedCh=0,fightCh=0; // ★ v48: base 3→0% fight (trait modifiers + denRisk provide all fight chance)
  // Note: heatDenFight applied by caller if needed
  const oppSex=c1.sex!==c2.sex;
  if(oppSex)breedCh=20; // ★ v46: base 15→20% breed chance. the den should produce life
  // ★ v46: Incest prevention — parent and child cannot breed
  const isParentChild=c1.parentIds?.includes(c2.id)||c2.parentIds?.includes(c1.id);
  const isSibling=c1.parentIds&&c2.parentIds&&c1.parentIds.some(p=>c2.parentIds.includes(p));
  if(isParentChild||isSibling)breedCh=0; // shelter together for teaching, not breeding
  const b1=c1.breed,b2=c2.breed;
  const personalBond=(c1.bondedTo===c2.id||c2.bondedTo===c1.id);
  if(personalBond){breedCh+=25;fightCh=Math.max(0,fightCh-3);}
  // ★ v31→v33: Personal grudges increase tension (array-based)
  const hasGrudgeFlag=hasGrudge(c1,c2);
  if(hasGrudgeFlag){fightCh+=12;}
  if(b1===b2){breedCh+=15;fightCh+=5;} // ★ v44: same breed = familiarity BUT territorial (+5% fight)

  // ★ v28: Simplified trait modifiers
  [c1,c2].forEach(c=>{
    if(catHas(c,"Scrapper"))fightCh+=5;    // ★ v48: fighters still fight, but less dominant
    if(catHas(c,"Cursed"))fightCh+=8;      // ★ v48: cursed cats are volatile but not fight magnets
    if(catHas(c,"Fragile"))breedCh-=10;     // fragile cats don't breed well
    if(catHas(c,"Alpha"))fightCh+=4;        // alphas assert dominance
    if(catHas(c,"Guardian"))fightCh-=3;     // guardians de-escalate
    if(catHas(c,"Devoted")&&c.bondedTo)breedCh+=10; // devoted cats bond deeper
  });
  if(!oppSex)breedCh=0; // same sex can't breed
  if(isParentChild||isSibling)breedCh=0; // ★ v46: family can't breed (overrides all bonuses)

  // ★ v46: Den size social bonus — more cats = more social activity, not just more fights
  const denSize=ctx.denSize||2;
  if(oppSex)breedCh+=Math.max(0,(denSize-2)*2); // +2% breed per extra cat

  // ★ v44→v46: Nerve affects den — softened. High nerve = tense, but life still finds a way.
  const nerveLvl=ctx.nerveLvl||0;
  if(nerveLvl>=4){
    const nerveExcess=nerveLvl-3; // 1-6 for levels 4-9
    fightCh+=nerveExcess*2;       // ★ v46: +3→+2 per level (was too aggressive)
    breedCh-=nerveExcess*2;       // ★ v46: −4→−2 per level (was sterilizing at high nerve)
  }

  // ★ v44: Same-breed crowding — too many of one breed creates territorial tension
  const sameBreedCount=ctx.sameBreedCount||0; // how many of THIS breed in the den
  if(b1===b2&&sameBreedCount>2){
    fightCh+=(sameBreedCount-2)*4; // +4% per extra same-breed cat above 2
  }

  return{breedCh:clamp(breedCh,0,85),fightCh:clamp(fightCh,0,70)}; // ★ v44: fight cap 60→70 (nerve can push higher)
}

function resolveDen(denCats,hasMatchmaker,denSafe,heatDenFight,ctx={}){
  if(denCats.length<2)return[];
  const results=[];const paired=new Set();
  const deckSize=ctx.deckSize||18;let deaths=0;
  const cats=shuf([...denCats]);
  // ★ v46: breedOnly mode (shelter) — only breed/bond events
  const breedOnly=ctx.breedOnly||false;
  // ★ v46: noBreed mode (wilds) — everything except breeding
  const noBreed=ctx.noBreed||false;
  // ★ v44: Breed census for territorial crowding
  const breedCensus={};cats.forEach(c=>{breedCensus[c.breed]=(breedCensus[c.breed]||0)+1;});
  // ★ v48: Den event count — shelter is active (breeding, bonding), wilds are dangerous
  // Shelter: 1-2 base events + 10% bonus per extra cat (love finds a way)
  // Wilds: 2-3 base events + 10% bonus per cat above 4 (more cats = more chaos)
  const baseEvents=breedOnly?(1+Math.floor(Math.random()*2)):(2+Math.floor(Math.random()*2));
  let bonusEvents=0;
  if(breedOnly){
    for(let e=0;e<Math.max(0,cats.length-2);e++){if(Math.random()<0.10)bonusEvents++;}
  }else{
    for(let e=0;e<Math.max(0,cats.length-4);e++){if(Math.random()<0.10)bonusEvents++;}
  }
  const targetEvents=baseEvents+bonusEvents;

  // Pass 1: Pair-based events (existing affinity logic)
  for(let i=0;i<cats.length;i++){
    if(paired.has(cats[i].id))continue;
    if(results.length>=targetEvents)break;
    for(let j=i+1;j<cats.length;j++){
      if(paired.has(cats[j].id))continue;
      const sameBreed=cats[i].breed===cats[j].breed?breedCensus[cats[i].breed]||0:0;
      const a=calcAffinity(cats[i],cats[j],{nerveLvl:ctx.nerveLvl||0,sameBreedCount:sameBreed,denSize:cats.length});
      const denRisk=Math.max(0,Math.round((denCats.length-2)*0.32)); // ★ v48: crowd tension. ~3% for 12 cats
      a.fightCh=Math.min(70,a.fightCh+denRisk+(heatDenFight||0));
      let bCh=a.breedCh;if(hasMatchmaker)bCh=Math.min(90,bCh+10);
      // ★ v46: Shelter bonus — calm, safe environment = better breeding
      if(breedOnly)bCh=Math.min(90,bCh+15);
      const roll=Math.random()*100;
      if(!noBreed&&roll<bCh){
        const baby=breedC(cats[i],cats[j]);
        const twins=Math.random()<0.08;
        results.push({type:"breed",c1:cats[i],c2:cats[j],baby,twins});
        cats[i].bondedTo=cats[j].id;cats[j].bondedTo=cats[i].id;
        paired.add(cats[i].id);paired.add(cats[j].id);break;
      }else if(!breedOnly&&!denSafe&&(noBreed?roll<a.fightCh:roll<bCh+a.fightCh)){
        const severity=Math.random();
        const loser=Math.random()<.5?cats[i]:cats[j];
        addGrudge(cats[i],cats[j].id);addGrudge(cats[j],cats[i].id);
        // ★ v46: Injured losers always die. Scarred losers 9% death. Stakes are real.
        const canDie=deckSize-deaths>6;
        const hasPhoenix=catHas(loser,"Phoenix");
        let forceDeath=false;
        if(loser.injured)forceDeath=true; // broken cats don't survive another fight
        else if(loser.scarred&&Math.random()<0.09)forceDeath=true; // veterans risk everything
        if(forceDeath){
          if(hasPhoenix){
            loser.power=1;loser.scarred=true;loser.injured=false;loser.injuryTimer=0;
            loser.trait=TRAITS.find(t=>t.name==="Eternal");
            results.push({type:"phoenix",c1:cats[i],c2:cats[j],risen:loser});
          }else if(canDie){
            deaths++;
            results.push({type:"death",c1:cats[i],c2:cats[j],victim:loser});
          }else{
            loser.power=Math.max(1,loser.power-3);loser.scarred=true;loser.injured=true;loser.injuryTimer=2;
            results.push({type:"fight",c1:cats[i],c2:cats[j],loser,dmg:3,wasInjured:true});
          }
        }else if(severity<0.05){
          // ★ v46: Severe fight — but only injured/scarred cats die (see forceDeath above)
          loser.power=Math.max(1,loser.power-3);loser.scarred=true;loser.injured=true;loser.injuryTimer=2;
          results.push({type:"fight",c1:cats[i],c2:cats[j],loser,dmg:3,wasInjured:true});
        }else if(severity<0.40){
          // ★ v48: Heavy fight — ~0.33 heavy fights/den at 12 cats
          if(loser.scarred){loser.injured=true;loser.injuryTimer=2;loser.power=Math.max(1,loser.power-3);results.push({type:"fight",c1:cats[i],c2:cats[j],loser,dmg:3,wasInjured:true});}
          else{loser.power=Math.max(1,loser.power-2);loser.scarred=true;results.push({type:"fight",c1:cats[i],c2:cats[j],loser,dmg:2});}
        }else{
          if(loser.scarred){loser.injured=true;loser.injuryTimer=2;loser.power=Math.max(1,loser.power-2);results.push({type:"fight",c1:cats[i],c2:cats[j],loser,dmg:2,wasInjured:true});}
          else{loser.power=Math.max(1,loser.power-1);loser.scarred=true;results.push({type:"fight",c1:cats[i],c2:cats[j],loser,dmg:1});}
        }
        paired.add(cats[i].id);paired.add(cats[j].id);break;
      }
      else if(breedOnly){
        // ★ v46: Shelter — if they didn't breed, they might bond, reconcile, or teach
        if(hasGrudge(cats[i],cats[j])&&Math.random()<0.35){
          removeGrudge(cats[i],cats[j].id);removeGrudge(cats[j],cats[i].id);
          if(Math.random()<0.3&&cats[i].sex!==cats[j].sex){
            cats[i].bondedTo=cats[j].id;cats[j].bondedTo=cats[i].id;
            results.push({type:"reconcile_bond",c1:cats[i],c2:cats[j]});
          }else{
            results.push({type:"reconcile",c1:cats[i],c2:cats[j]});
          }
          paired.add(cats[i].id);paired.add(cats[j].id);break;
        }
        // ★ v46: Parent teaches child their trait in the safety of shelter
        const parentChild=cats[i].parentIds?.includes(cats[j].id)?[cats[j],cats[i]]:cats[j].parentIds?.includes(cats[i].id)?[cats[i],cats[j]]:null;
        if(parentChild){
          const[parent,child]=parentChild;
          const parentTraits=catAllTraits(parent).filter(t=>t.name!=="Plain");
          if(parentTraits.length>0&&catIsPlain(child)&&Math.random()<0.35){
            const learned=pk(parentTraits);
            if(addTrait(child,learned)){
              results.push({type:"teach",parent,child,trait:learned});
              paired.add(cats[i].id);paired.add(cats[j].id);break;
            }
          }
        }
        if(!cats[i].bondedTo&&!cats[j].bondedTo&&cats[i].sex!==cats[j].sex&&Math.random()<0.20){
          cats[i].bondedTo=cats[j].id;cats[j].bondedTo=cats[i].id;
          results.push({type:"bond",c1:cats[i],c2:cats[j]});
          paired.add(cats[i].id);paired.add(cats[j].id);break;
        }
      }
      else if(Math.random()<0.18){
        const ev=Math.random();
        const elder=cats[i].stats.tp>=5?cats[i]:cats[j].stats.tp>=5?cats[j]:null;
        const young=elder?(elder===cats[i]?cats[j]:cats[i]):null;
        if(elder&&young&&young.stats.tp<=1&&ev<0.20){
          young.power=Math.min(15,young.power+1);
          results.push({type:"mentor",elder,young});
        }else if(ev<0.30){results.push({type:"found",cat:cats[i],gold:Math.random()<.3?4:2});}
        else if(ev<0.50){const g=Math.random()<.5?cats[i]:cats[j];g.power=Math.min(15,g.power+1);results.push({type:"growth",cat:g});}
        else if(ev<0.65){
          cats[i].power=Math.min(15,cats[i].power+1);cats[j].power=Math.min(15,cats[j].power+1);
          results.push({type:"training",c1:cats[i],c2:cats[j]});
        }
        else if(ev<0.78&&!cats[i].bondedTo&&!cats[j].bondedTo&&!hasGrudge(cats[i],cats[j])){
          addGrudge(cats[i],cats[j].id);addGrudge(cats[j],cats[i].id);
          results.push({type:"grudge",c1:cats[i],c2:cats[j]});
        }
        else if(ev<0.88&&hasGrudge(cats[i],cats[j])){
          removeGrudge(cats[i],cats[j].id);removeGrudge(cats[j],cats[i].id);
          if(Math.random()<0.25&&cats[i].sex!==cats[j].sex){
            cats[i].bondedTo=cats[j].id;cats[j].bondedTo=cats[i].id;
            results.push({type:"reconcile_bond",c1:cats[i],c2:cats[j]});
          }else{
            results.push({type:"reconcile",c1:cats[i],c2:cats[j]});
          }
        }
        else{const rjBreed=ctx.draftRejects&&ctx.draftRejects.length>0&&Math.random()<0.6?pk(ctx.draftRejects):null;const w=gC(rjBreed?{breed:rjBreed,trait:PLAIN}:{trait:PLAIN});results.push({type:"wanderer",cat:w});}
        paired.add(cats[i].id);paired.add(cats[j].id);break;
      }
    }
  }
  // ★ v38: Pass 2 — fill up to targetEvents with bonus events from available cats
  let safety=0;
  while(results.length<targetEvents&&safety++<10){
    const avail=cats.filter(c=>!paired.has(c.id));
    const pool=avail.length>=2?avail:cats; // reuse cats if needed
    if(pool.length<1)break;
    const ev=Math.random();
    if(pool.length>=2&&ev<0.25){
      const[a,b]=[pk(pool),pk(pool.filter(c=>c.id!==pool[0]?.id)||pool)];
      if(a&&b&&a.id!==b.id){a.power=Math.min(15,a.power+1);b.power=Math.min(15,b.power+1);results.push({type:"training",c1:a,c2:b});paired.add(a.id);paired.add(b.id);continue;}
    }
    if(ev<0.45){const g=pk(pool);g.power=Math.min(15,g.power+1);results.push({type:"growth",cat:g});}
    else if(ev<0.60){results.push({type:"found",cat:pk(pool),gold:Math.random()<.3?4:2});}
    else if(pool.length>=2&&ev<0.80){
      const a=pk(pool),b=pk(pool.filter(c=>c.id!==a.id));
      if(a&&b&&a.sex!==b.sex&&!a.bondedTo&&!b.bondedTo){a.bondedTo=b.id;b.bondedTo=a.id;results.push({type:"bond",c1:a,c2:b});}
      else{const g=pk(pool);g.power=Math.min(15,g.power+1);results.push({type:"growth",cat:g});}
    }
    else{const g=pk(pool);g.power=Math.min(15,g.power+1);results.push({type:"growth",cat:g});}
  }
  // Guarantee minimum 1 for shelter only — wilds can be silent
  if(results.length===0&&cats.length>=2&&breedOnly){
    const ev=Math.random();
    if(ev<0.25){const g=pk(cats);g.power=Math.min(15,g.power+1);results.push({type:"growth",cat:g});}
    else if(ev<0.45){results.push({type:"found",cat:pk(cats),gold:Math.random()<.3?4:2});}
    else if(ev<0.65){cats[0].power=Math.min(15,cats[0].power+1);cats[1].power=Math.min(15,cats[1].power+1);results.push({type:"training",c1:cats[0],c2:cats[1]});}
    else{
      const c1=cats[0],c2=cats[1];
      if(c1.sex!==c2.sex&&!c1.bondedTo){c1.bondedTo=c2.id;c2.bondedTo=c1.id;results.push({type:"bond",c1,c2});}
      else{const g=pk(cats);g.power=Math.min(15,g.power+1);results.push({type:"growth",cat:g});}
    }
  }
  return results;
}

// ★ Get effective breeds for a cat (handles Void, Chimera, Stray)
function getCatBreeds(cat){
  if(catHas(cat,"Wild")||catHas(cat,"Chimera"))return[...BK]; // all breeds
  return[cat.breed];
}

function evalH(cats){
  if(!cats.length)return{type:HT[0],idx:0};
  // ★ Use getCatBreeds for breed counting
  const bc={};
  cats.forEach(c=>{getCatBreeds(c).forEach(b=>{bc[b]=(bc[b]||0)+1;});});
  const pows=[...new Set(cats.map(c=>c.power))].sort((a,b)=>a-b);
  let mS=1,cu=1;
  for(let i=1;i<pows.length;i++){if(pows[i]===pows[i-1]+1){cu++;mS=Math.max(mS,cu);}else cu=1;}
  const mBC=Math.max(0,...Object.values(bc)),pairs=Object.values(bc).filter(c=>c>=2).length;
  const bcVals=Object.values(bc).sort((a,b)=>b-a); // ★ sorted breed counts for Full Den check
  const tc={};cats.forEach(c=>{catAllTraits(c).forEach(t=>{tc[t.name]=(tc[t.name]||0)+1;});});const mTC=Math.max(0,...Object.values(tc));
  if(cats.length===5&&mBC>=5&&mS>=5)return{type:HT[11],idx:11}; // Grand Litter
  if(cats.length>=5&&mBC>=5)return{type:HT[10],idx:10}; // Litter
  if(mS>=5&&cats.length>=5)return{type:HT[9],idx:9}; // Nine Lives
  if(mBC>=4)return{type:HT[8],idx:8}; // Colony
  if(mS>=4&&cats.length>=4)return{type:HT[7],idx:7}; // Stalk
  // ★ Full Den: 3 of one season + 2 of another (Full House)
  if(bcVals[0]>=3&&bcVals.length>=2&&bcVals[1]>=2)return{type:HT[6],idx:6};
  if(mTC>=3&&cats.length>=3)return{type:HT[5],idx:5}; // Kindred
  if(mBC>=3)return{type:HT[4],idx:4}; // Clowder
  if(mS>=3&&cats.length>=3)return{type:HT[3],idx:3}; // Prowl
  if(pairs>=2)return{type:HT[2],idx:2}; // Two Kin
  if(mBC>=2)return{type:HT[1],idx:1}; // Kin
  return{type:HT[0],idx:0}; // Stray
}

// ═══════════════════════════════════════════════════════════════
// ★ SCORING ENGINE (with chemistry + expanded traits)
// ═══════════════════════════════════════════════════════════════
function calcScore(cats,fams,fLvl,cfx={},ctx={}){
  const{type}=evalH(cats);
  let chips=type.base.c,mult=type.base.m;
  const bd=[{label:type.name,chips:type.base.c,mult:type.base.m,type:"hand"}];
  // ★ Scavenge: bonus chips from discarded cats' power
  const scavBonus=ctx.scavenge||0;
  if(scavBonus>0){chips+=scavBonus;bd.push({label:`🔧 Scavenged`,chips:scavBonus,mult:0,type:"scavenge"});}
  // ★ v34: Boss trait breakdown labels
  const btFxAll=ctx.bossTraitFx||[];
  if(btFxAll.length>0){btFxAll.forEach(bt=>{
    if(bt.fx.frozen)bd.push({label:`🧊 Frozen: first 2 cats halved`,chips:0,mult:0,type:"boss_trait"});
    if(bt.fx.mirrored)bd.push({label:`🪞 Mirrored: best cat halved`,chips:0,mult:0,type:"boss_trait"});
    if(bt.fx.enragedMult)bd.push({label:`🔥 Enraged: all cats +${bt.fx.enragedMult}M`,chips:0,mult:0,type:"boss_trait"});
  });}

  const {gold:pGold=0,deckSize=18,discSize=0}=ctx;let luckyGold=0;let providerNerve=false;
  const powers=cats.map(c=>c.power);const maxP=Math.max(...powers);const minP=Math.min(...powers);
  const uniqueBreeds=new Set(cats.flatMap(c=>getCatBreeds(c))).size;
  const toS=[];
  cats.forEach((c,ci)=>{
    c._ci=ci;
    toS.push(c);
    if(!cfx.noTraits){
      // ★ v32: Echo scores twice at half power. Eternal scores twice at full.
      if(catHas(c,"Echo"))toS.push({...c,_re:true,_halfPow:true,_ci:ci});
      if(catHas(c,"Eternal"))toS.push({...c,_re:true,_ci:ci});
    }
  });

  // ★ v34: Boss trait scoring modifiers
  const btFx=ctx.bossTraitFx||[];
  const hasFrozen=btFx.some(bt=>bt.fx.frozen);
  const hasMirrored=btFx.some(bt=>bt.fx.mirrored);
  const enragedBT=btFx.find(bt=>bt.fx.enragedMult);
  const maxPowIdx=hasMirrored?cats.reduce((best,c,i)=>c.power>cats[best].power?i:best,0):-1;

  // ★ v32: Per-cat scoring — traits with conditions, scars as xMult
  // ★ DOPAMINE FIX: Collapsed into ONE step per cat (Balatro-style: each card fires ONCE)
  toS.forEach((c,si)=>{
    const exiled=cfx.exileBreed&&c.breed===cfx.exileBreed;
    let basePow=c._halfPow?Math.max(2,Math.floor(c.power/2)):(c.injured&&!c._re?Math.floor(c.power/2):c.power);
    if(hasFrozen&&!c._re&&c._ci<2)basePow=Math.max(2,Math.floor(basePow/2));
    if(hasMirrored&&!c._re&&c._ci===maxPowIdx)basePow=Math.max(2,Math.floor(basePow/2));
    let cc=exiled?0:basePow,cm=0,cx=1;
    if(enragedBT&&!c._re)cm+=enragedBT.fx.enragedMult;

    // ★ DOPAMINE: Accumulate ALL effects into one combined entry
    const icons=[];
    if(!cfx.noTraits){
      // COMMON (C tier)
      if(catHas(c,"Hefty")){const v=(c._ci===0&&!c._re)?8:5;cc+=v;icons.push("💪");}
      if(catHas(c,"Provider")&&!c._re){luckyGold+=1;if(pGold>=15)providerNerve=true;icons.push("🍀");}
      // Wild: no direct scoring (season matching handled by getCatBreeds)
      if(catHas(c,"Feral")&&!c._re){cc+=deckSize;icons.push("🐾");}
      if(catHas(c,"Seer")&&!c._re){cm+=4;icons.push("🔮");}
      if(catHas(c,"Devoted")&&!c._re){if(c.bondedTo&&cats.find(x=>x.id===c.bondedTo)){cm+=4;icons.push("🫀");}}
      // RARE (B tier)
      if(catHas(c,"Scrapper")){const v=(c.scarred&&!c._re)?5:3;cm+=v;icons.push("🥊");}
      if(catHas(c,"Cursed")){const alone=cats.filter(x=>x.breed===c.breed).length===1;const v=alone?8:-3;cm+=v;icons.push("💀");}
      if(catHas(c,"Fragile")){cc=0;const v=(cats.length-1)*2;cm+=v;const fx=cats.length>=5&&!c._re?1.5:0;if(fx)cx*=fx;icons.push("🩻");}
      if(catHas(c,"Swift")&&!c._re){const handSize=ctx.handSize||6;const empty=Math.max(0,handSize-cats.length);cc+=empty*3;icons.push("🪶");}
      if(catHas(c,"Guardian")&&!c._re){const hurt=cats.filter(x=>x.id!==c.id&&(x.scarred||x.injured)).length;if(hurt>0){cm+=hurt*2;icons.push("🛡️");}}
      // LEGENDARY (A tier)
      if(catHas(c,"Echo")){}// handled via toS double-scoring above
      if(catHas(c,"Chimera")&&!c._re){
        const otherBreeds=new Set(cats.filter(x=>x.id!==c.id&&!catHas(x,"Chimera")).flatMap(x=>getCatBreeds(x)));
        if(otherBreeds.size>=3){cx*=1.5;icons.push("🧬");}
      }
      if(catHas(c,"Alpha")&&!c._re){if(c.power>=Math.max(...powers)){cx*=1.3;icons.push("🐺");}}
      if(catHas(c,"Nocturnal")&&!c._re){const nerveMult=fLvl*2;if(nerveMult>0){cm+=nerveMult;icons.push("🌙");}}
      // MYTHIC (S tier)
      if(catHas(c,"Eternal")){cx*=3.0;icons.push("✨");}
      if(catHas(c,"Phoenix")){const v=c.scarred?4.0:2.5;cx*=v;icons.push("🔥");}
    }

    // Scar/injury
    if(c.injured&&!c._re){cm-=2;icons.push("🩹");}
    else if(c.scarred&&!c._re){cx*=1.25;const sm=ctx.scarMult||0;if(sm)cm+=sm;icons.push("⚔️");}

    // ★ Cat XP bonus — Proven is free, Seasoned/Veteran require Cat Mastery upgrade
    if(!c._re&&c.stats){
      const xpTier=getCatXP(c.stats.tp,!!ctx.hasMastery);
      if(xpTier){cm+=xpTier.bonus.mult;if(xpTier.bonus.xMult)cx*=xpTier.bonus.xMult;icons.push("⭐");}
    }

    // Season passive — folded into the cat's step
    let pcc=0,pcm=0;let passiveBreed=null;
    if(!c._re&&!cfx.noTraits){
      const cb=c.breed;
      if(cb==="Autumn"){pcm+=1+cats.filter(x=>x.scarred&&!x.injured).length;}
      if(cb==="Summer"){pcc+=2+cats.filter(x=>x.id!==c.id).length;}
      if(cb==="Winter"){pcm+=1+cats.filter(x=>!x.scarred&&!x.injured).length;}
      if(cb==="Spring"){pcc+=1;pcm+=Math.max(1,cats.filter(x=>x.bondedTo).length);}
      if(pcc||pcm){icons.push(BREED_PASSIVE[cb]?.icon||"");passiveBreed=cb;}
    }
    cc+=pcc;cm+=pcm;

    // Accumulate totals (same math as before)
    chips+=cc;mult+=cm;if(cx>1)mult=Math.round(mult*cx);

    // ★ DOPAMINE: ONE breakdown entry per cat — everything combined
    const iconStr=icons.filter(Boolean).join("");
    const hasRareTrait=cx>=1.5; // Eternal/Phoenix/Chimera/Fragile5
    const hasScar=c.scarred&&!c.injured&&!c._re;
    const hasTrait=icons.length>0;
    const catType=hasRareTrait?"trait_rare":hasScar&&hasTrait?"scar":hasTrait?"trait":"cat";
    bd.push({
      label:`${iconStr}${iconStr?" ":""}${c._re?"↻ ":""}${c.name.split(" ")[0]}`,
      chips:cc,mult:cm,xMult:cx>1?cx:null,
      type:catType,catIdx:c._ci,
      passiveBreed:passiveBreed,
      isBigCat:Math.abs(cm)>=3||cx>1||cc>=8, // flag for special sound
    });
  });

  // ★ v31/v34: GRUDGES — personal rivalries. Tension vs Something to Prove
  const grudges=getGrudges(cats);
  let hasGrudgeProve=false;
  // ★ v34 ECON: Grudge Wisdom upgrade shifts prove chance from 25% to 30%
  const proveChance=ctx.grudgeWisdom?0.30:0.25;
  if(!cfx.noTraits&&grudges.length>0){
    grudges.forEach(([a,b])=>{
      const outcome=Math.random()<proveChance?"prove":"tension";
      if(outcome==="prove"){
        mult+=4;hasGrudgeProve=true;
        bd.push({label:`⚡ ${a.name.split(" ")[0]}+${b.name.split(" ")[0]} Prove!`,chips:0,mult:4,type:"grudge_prove"});
      }else{
        mult=Math.max(1,mult-2);
        bd.push({label:`⚡ ${a.name.split(" ")[0]}+${b.name.split(" ")[0]} Tension`,chips:0,mult:-2,type:"grudge_tension"});
      }
    });
  }


  // ★ v32: BONDED PAIRS — diminishing xMult: first pair ×1.5, additional pairs ×1.25
  {
    const bondedPairs=[];
    cats.forEach(c=>{if(c.bondedTo){const mate=cats.find(x=>x.id===c.bondedTo);if(mate&&!bondedPairs.find(p=>p[0]===mate.id))bondedPairs.push([c.id,mate.id]);}});
    bondedPairs.forEach(([a,b],pi)=>{
      const ca=cats.find(c=>c.id===a),cb=cats.find(c=>c.id===b);
      const bpXM=pi===0?1.5:1.25; // ★ BALANCE: Diminishing. first bond is run-defining, extras help but don't dominate
      mult=Math.round(mult*bpXM);bd.push({label:`💕 ${ca.name.split(" ")[0]}+${cb.name.split(" ")[0]} Bonded`,chips:0,mult:0,xMult:bpXM,type:"bond"});
    });
  }

  // ★ v46: LINEAGE — parent+child in hand = ×1.15 per pair (family fights harder)
  {
    const lineagePairs=[];
    cats.forEach(c=>{
      if(c.parentIds){
        c.parentIds.forEach(pid=>{
          const parent=cats.find(x=>x.id===pid);
          if(parent&&!lineagePairs.find(p=>(p[0]===pid&&p[1]===c.id)||(p[0]===c.id&&p[1]===pid)))
            lineagePairs.push([pid,c.id]);
        });
      }
    });
    lineagePairs.forEach(([pid,cid])=>{
      const pa=cats.find(c=>c.id===pid),ch=cats.find(c=>c.id===cid);
      const lpXM=1.15;
      mult=Math.round(mult*lpXM);bd.push({label:`👪 ${pa.name.split(" ")[0]}→${ch.name.split(" ")[0]} Lineage`,chips:0,mult:0,xMult:lpXM,type:"lineage"});
    });
  }

  // Wards (positive crescendo continues)
  let bG=0;
  if(!cfx.silence){
    fams.forEach(f=>{
      const fx=f.eff(cats);const fc=fx.chips||0,fm=fx.mult||0,fxm=fx.xMult||1;
      if(fx.gold)bG+=fx.gold;chips+=fc;mult+=fm;if(fxm>1)mult=Math.round(mult*fxm);
      if(fc||fm||fxm>1)bd.push({label:`${f.icon} ${f.name}`,chips:fc,mult:fm,xMult:fxm>1?fxm:null,type:"fam"});
    });
  }else if(fams.length)bd.push({label:"🤐 Silenced",chips:0,mult:0,type:"curse"});

  // ★ v35: Provider rations
  luckyGold=Math.min(3,luckyGold);
  if(luckyGold>0){bG+=luckyGold;bd.push({label:`🍀 +${luckyGold}🐟`,chips:0,mult:0,type:"gold"});}
  if(providerNerve){bd.push({label:`🍀 Full bellies, +1 Nerve`,chips:0,mult:0,type:"provider"});}

  // NERVE always last — the climax
  const fv=NERVE[fLvl];if(fv.xM>1){mult=Math.round(mult*fv.xM);bd.push({label:`🔥 ${fv.name}`,chips:0,mult:0,xMult:fv.xM,type:"nerve"});}

  // ★ v47: Focus removed (sim-verified: mathematically non-competitive)

  return{chips:Math.max(0,chips),mult:Math.max(1,mult),total:Math.max(0,chips)*Math.max(1,mult),bd,bG,ht:type.name,hasGrudgeProve,hasProviderNerve:providerNerve};
}

// ★ PROGRESSIVE UNLOCKS - features gate on meta-progress
function getUnlocks(meta){
  if(!meta)return{fams:false,all:false};
  const r=meta.stats.r||0,w=meta.stats.w||0,ba=meta.stats.ba||0;
  return{
    fams:w>=1,              // Wards: won at least one run
    all:w>=2,               // Full arsenal
  };
}

function getTarget(a,b,firstRun){return Math.round((firstRun?[2200,4500,9000]:[2500,5000,11000])[b]*Math.pow(1.7,a-1));} // ★ CALIBRATED: first run challenging (2200/4500/9000), full run (2500/5000/11000)
function getHeatMult(h){return 1+(h||0)*0.15;} // +15% per heat level (stacks: H5 = +75%)
function getHeatFx(h){
  // Cumulative mechanical penalties per heat level
  return{
    targets:1+(h||0)*0.15,        // H1:+15%, H3:+45%, H5:+75%
    extraCurse:h>=1?1:0,          // H1+: Bosses get +1 curse
    discMod:h>=2?-1:0,            // H2+: -1 starting discard
    shopCost:h>=3?1:0,            // H3+: Everything costs +1 more
    denFight:h>=3?8:0,            // H3+: +8% den fight chance
    handMod:h>=4?-1:0,            // H4+: -1 starting hand
    hexStart:h>=5,                // H5: Start with a Hexed cat
    dustMult:1+(h||0)*0.25,       // +25% stardust per level (reward)
  };
}

function genCurses(ante,extraCurses=0){
  const p1=CURSES.filter(c=>c.tier===1),p2=CURSES.filter(c=>c.tier<=2),p3=CURSES.filter(c=>c.tier<=3);
  const pickN=(p,n)=>{const s=[...p],r=[];for(let i=0;i<n&&s.length;i++){const j=Math.floor(Math.random()*s.length);r.push(s.splice(j,1)[0]);}return r;};
  const base=ante<=1?pickN(p1,1):ante===2?pickN(p2,1):ante===3?pickN(p2,2):ante===4?pickN(p3,2):pickN(p3,3);const extra=pickN(p3.filter(x=>!base.find(b=>b.id===x.id)),extraCurses);return[...base,...extra];
}
function buildCfx(curses){
  const fx={hsMod:0,silence:false,fog:false,exileBreed:null,noDisc:false,tgtMult:1,famine:false};
  curses.forEach(c=>{const e=c.fx;if(e.hsMod)fx.hsMod+=e.hsMod;if(e.silence)fx.silence=true;if(e.fog)fx.fog=true;if(e.exile)fx.exileBreed=fx.exileBreed||pk(BK);if(e.noDisc)fx.noDisc=true;if(e.tgtMult)fx.tgtMult*=e.tgtMult;if(e.famine)fx.famine=true;});
  return fx;
}

const SK="nl_v29";
const dSave=()=>({cats:[],dust:0,ups:{},stats:{r:0,w:0,ba:0,hs:0,mf:0,td:0,disc:[]},heat:0,achv:[],relics:[],v:16});
async function loadS(){try{const r=await window.storage.get(SK);return r?migrateSave(JSON.parse(r.value)):dSave();}catch{return dSave();}}
async function saveS(d){try{await window.storage.set(SK,JSON.stringify(d));}catch(e){console.error(e);}}

// ★ v47: SAVE-AND-QUIT — persist run state between nights
const RK="nl_run"; // run save key
async function saveRun(state){try{await window.storage.set(RK,JSON.stringify(state));}catch(e){console.error("Run save failed:",e);}}
async function loadRun(){try{const r=await window.storage.get(RK);return r?JSON.parse(r.value):null;}catch{return null;}}
async function clearRunSave(){try{await window.storage.delete(RK);}catch(e){console.error(e);}}

// ★ v45: Migrate old breed names (Shadow/Ember/Frost/Bloom) → seasons (Autumn/Summer/Winter/Spring)
const BREED_MIGRATE={Shadow:"Autumn",Ember:"Summer",Frost:"Winter",Bloom:"Spring"};
function migrateSave(d){
  if(!d)return dSave();
  const mb=n=>BREED_MIGRATE[n]||n;
  if(d.cats)d.cats=d.cats.map(c=>({...c,breed:mb(c.breed)}));
  if(d.stats?.disc)d.stats.disc=d.stats.disc.map(s=>s.replace(/^(Shadow|Ember|Frost|Bloom)/,(_,m)=>mb(m)));
  return d;
}

// ★ v30: THE HEARTH — saved cats radiate stardust at run start
// ★ v46: LINEAGE DRAFTING — descendants from Hearth pairs
function getHearthPairs(hearthCats){
  const pairs={};
  hearthCats.filter(c=>c.pairId).forEach(c=>{if(!pairs[c.pairId])pairs[c.pairId]=[];pairs[c.pairId].push(c);});
  return Object.values(pairs).filter(p=>p.length===2);
}
function genDescendant(hearthCats,powerBonus=0){
  const pairs=getHearthPairs(hearthCats);
  if(pairs.length===0)return gC({trait:pickTrait(false)}); // fallback: random
  const pair=pk(pairs);
  // Convert hearth cats to breedC-compatible objects
  const p1={...pair[0],id:pair[0].name+"-h1",trait:typeof pair[0].trait==="string"?TRAITS.find(t=>t.name===pair[0].trait)||PLAIN:(pair[0].trait||PLAIN)};
  const p2={...pair[1],id:pair[1].name+"-h2",trait:typeof pair[1].trait==="string"?TRAITS.find(t=>t.name===pair[1].trait)||PLAIN:(pair[1].trait||PLAIN)};
  const baby=breedC(p1,p2);
  // Descendants always get a trait (this is the hearth advantage)
  if(catIsPlain(baby)){
    baby.trait=pickTrait(false);
    baby.name=gN(baby.breed,baby.trait); // ★ FIX: Regenerate name with new trait so descendants get chosen names
  }
  if(powerBonus>0)baby.power=Math.min(15,baby.power+powerBonus);
  baby.hearthDescendant=true; // tag for UI
  return baby;
}

function calcHearthDust(cats){
  return cats.map(c=>{
    let d=0;
    d+=Math.max(1,Math.floor((c.power||3)/2));
    const tier=c.trait?.tier||"common";
    if(tier==="mythic")d+=15;
    else if(tier==="legendary")d+=10;
    else if(tier==="rare"||tier==="rare_neg")d+=6;
    else if(tier==="common"&&c.trait?.name!=="Plain")d+=3;
    if(c.stats?.tp>=10)d+=3;
    else if(c.stats?.tp>=5)d+=1;
    if(c.stats?.bs>=10000)d+=5;
    else if(c.stats?.bs>=3000)d+=2;
    if(c.bondedTo||c.bonded)d+=2;
    if(c.scarred)d+=3;
    if(c.fromAnte>=5)d+=4;
    else if(c.fromAnte>=3)d+=2;
    if(c.lineage)d+=3; // ★ v46: Lineage. parents and children generate more light
    return{cat:c,dust:d};
  });
}
function calcTotalHearthDust(cats,dustBonus=0,heatMult=1){
  const hd=calcHearthDust(cats);
  const raw=hd.reduce((s,h)=>s+h.dust,0);
  // ★ v35: Fading Light — maintaining a large Hearth costs stardust
  const activeCats=cats.filter(c=>!c.enshrined);
  const activeRaw=calcHearthDust(activeCats).reduce((s,h)=>s+h.dust,0);
  const maintenance=activeCats.length>8?(activeCats.length-8)*2:0;
  const enshrined=cats.filter(c=>c.enshrined).length;
  const gross=Math.round(activeRaw*(1+dustBonus)*heatMult);
  const total=Math.max(0,gross-maintenance);
  return{cats:hd,total,raw:activeRaw,gross,maintenance,enshrined,activeCats:activeCats.length};
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════

function CC({cat:_cat,sel,onClick,sm,dis,hl,fog,chemHint,denMode,onTraitClick}){
  const cat=(!_cat||!_cat.trait)?{...(_cat||{}),trait:PLAIN,extraTraits:[],breed:"Autumn",name:"???",power:1,sex:"M"}:_cat;
  const b=BREEDS[cat.breed]||BREEDS.Autumn,w=sm?74:100,h=sm?105:140,fn=cat.name?cat.name.split(" ")[0]:"?";
  const allTraits=catAllTraits(cat);
  const isNeg=allTraits.some(t=>t.tier==="rare_neg");
  const isMythicTier=allTraits.some(t=>t.tier==="mythic");
  const isLegendaryTier=allTraits.some(t=>t.tier==="legendary");
  const isRareTier=allTraits.some(t=>t.tier==="rare"||t.tier==="rare_neg");
  const tierBorder=isMythicTier?"#c084fc":isLegendaryTier?"#f59e0b":isRareTier?"#4ade80":"";
  const tierWidth=isMythicTier||isLegendaryTier?3:isRareTier?2.5:2;
  const isPlain=cat.trait.name==="Plain"&&!(cat.extraTraits||[]).length;
  const isWild=catHas(cat,"Chimera")||catHas(cat,"Wild");
  const pCol=cat.injured?"#ef4444":cat.power>=12?"#ff6b6b":cat.power>=10?"#fef08a":cat.power>=6?b.color:cat.power<=2?"#555":b.color;

  if(fog)return(<div onClick={dis?undefined:onClick} style={{width:w,height:h,borderRadius:10,border:`2px solid ${sel?"#fbbf24":"#333"}`,background:"linear-gradient(145deg,#1a1a2e,#0d0d1a)",boxShadow:sel?"0 0 20px #fbbf2444":"0 2px 8px #00000066",cursor:dis?"default":"pointer",transition:"all 0.2s",transform:sel?"translateY(-12px) scale(1.05)":"",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontFamily:"'Cinzel',serif"}}><span style={{fontSize:sm?22:30,opacity:.3}}>?</span></div>);

  return(
    <div onClick={dis?undefined:onClick} title={`${cat.name}. ${b.name}, Power ${cat.power} ${cat.sex==="M"?"♂":"♀"}\n${cat.trait.icon} ${cat.trait.name}: ${cat.trait.desc}${cat.injured?"\n🩹 Injured":(cat.scarred?"\n⚔ Scarred":"")}${cat.bondedTo?"\n💕 Bonded":""}${(cat.grudgedWith||[]).length>0?"\n⚡ Grudge":""}`} style={{
      width:w,height:h,borderRadius:10,
      border:`${sel?2:tierWidth}px solid ${sel?"#fbbf24":denMode?"#c084fc88":hl?b.glow:tierBorder||"#ffffff0a"}`,
      background:`linear-gradient(170deg,${b.bg}dd,#0a0a14)`,
      boxShadow:sel?`0 0 20px ${b.glow}88,0 0 40px ${b.glow}33,inset 0 0 14px ${b.glow}15`:hl?`0 0 10px ${b.glow}44`
        :isMythicTier?`0 0 12px #c084fc33,0 0 4px #c084fc22`:isLegendaryTier?`0 0 10px #f59e0b22`:isRareTier?`0 0 8px #4ade8018`:"0 2px 6px #00000055",
      cursor:dis?"default":"pointer",transition:"all 0.15s ease-out",
      transform:sel?"translateY(-12px) scale(1.06)":"",
      display:"flex",flexDirection:"column",alignItems:"center",
      padding:0,position:"relative",overflow:"hidden",
      flexShrink:0,opacity:dis?.45:1,fontFamily:"'Cinzel',serif"
    }}>
      {/* Season stripe. colored band at top for instant season ID */}
      <div style={{width:"100%",height:sm?3:4,background:`linear-gradient(90deg,transparent,${b.color}88,transparent)`,flexShrink:0}}/>

      {/* TOP. Season icon + Power */}
      <div style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:sm?"2px 4px 0":"3px 6px 0"}}>
        <div style={{fontSize:sm?20:28,lineHeight:1,filter:`drop-shadow(0 0 5px ${b.glow}66)`}}>{isWild?"✨":b.icon}</div>
        <div style={{textAlign:"center",minWidth:sm?20:28}}>
          <div style={{fontSize:sm?18:26,fontWeight:900,lineHeight:1,color:pCol,letterSpacing:-1,
            textShadow:cat.power>=10?`0 0 8px ${pCol}66`:"none"}}>{cat.power}</div>
          <div style={{fontSize:sm?6:7,color:cat.sex==="M"?"#60a5fa88":"#f472b688",fontFamily:"system-ui",lineHeight:1}}>{cat.sex==="M"?"♂":"♀"}</div>
        </div>
      </div>

      {/* CENTER. Name is the soul of the card */}
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",width:"100%",padding:"0 3px"}}>
        <div style={{fontSize:sm?10:14,fontWeight:700,color:b.color,letterSpacing:sm?0:1,
          textShadow:`0 0 8px ${b.glow}33`,overflow:"hidden",whiteSpace:"nowrap",
          textOverflow:"ellipsis",maxWidth:"100%",textAlign:"center"}}>{fn}</div>
        {false&&!sm&&cat.quirk&&<div style={{fontSize:10,color:"#666",fontStyle:"italic",fontFamily:"system-ui",lineHeight:1,marginTop:1,textAlign:"center",maxWidth:"100%",overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>{cat.quirk}</div>}
        <div style={{fontSize:sm?7:9,color:b.color,opacity:.45,letterSpacing:2,textTransform:"uppercase",fontFamily:"system-ui",lineHeight:1.2}}>
          {isWild?"All Seasons":cat.breed}
        </div>
        {/* Status badges */}
        <div style={{display:"flex",gap:3,alignItems:"center",minHeight:sm?10:12,marginTop:1,flexWrap:"wrap",justifyContent:"center"}}>
          {cat.injured&&<span style={{fontSize:sm?7:9,color:"#ef4444",fontWeight:700,fontFamily:"system-ui",background:"#ef444418",borderRadius:3,padding:"0 3px"}}>🩹</span>}
          {!cat.injured&&cat.scarred&&<span style={{fontSize:sm?8:10,color:"#d97706"}}>⚔</span>}
          {cat.bondedTo&&<span style={{fontSize:sm?8:10,color:"#f472b6"}}>💕</span>}
          {(cat.grudgedWith||[]).length>0&&<span style={{fontSize:sm?8:10,color:"#fb923c"}}>⚡{(cat.grudgedWith||[]).length>1?(cat.grudgedWith||[]).length:""}</span>}
          {cat.parentIds&&<span style={{fontSize:sm?8:10,color:"#34d399"}}>👪</span>}
          {!cat.injured&&!cat.scarred&&!cat.bondedTo&&!(cat.grudgedWith||[]).length&&cat.stats&&(()=>{const xp=getCatXP(cat.stats.tp);return xp?<span style={{fontSize:sm?7:8,color:xp.color,fontFamily:"system-ui",fontWeight:600}}>{xp.label}</span>:null;})()}
        </div>
      </div>

      {/* BOTTOM. Trait pill */}
      <div style={{width:"100%",padding:sm?"1px 2px 2px":"2px 4px 4px",textAlign:"center",borderTop:`1px solid ${isPlain?"#ffffff06":isMythicTier?"#c084fc22":isLegendaryTier?"#f59e0b22":isRareTier?"#4ade8022":"#ffffff0a"}`}}>
        {isPlain?(
          <div onClick={e=>{e.stopPropagation();if(onTraitClick)onTraitClick(cat);}} style={{fontSize:sm?7:9,color:onTraitClick?"#444":"#2a2a3a",padding:"1px 0",cursor:onTraitClick?"help":"default"}}>{onTraitClick?"ℹ inspect":"untrained"}</div>
        ):(
          <div style={{display:"flex",flexDirection:"column",gap:1}}>
            {[cat.trait,...(cat.extraTraits||[])].filter(t=>t.name!=="Plain").map((t,ti)=>{
              const tc=t.tier==="mythic"?"#c084fc":t.tier==="legendary"?"#f59e0b":(t.tier==="rare"||t.tier==="rare_neg")?"#4ade80":"#e8e6e3";
              const tbg=t.tier==="mythic"?"#c084fc15":t.tier==="legendary"?"#f59e0b15":(t.tier==="rare"||t.tier==="rare_neg")?"#4ade8015":"#ffffff08";
              return(<div key={ti} onClick={e=>{e.stopPropagation();if(onTraitClick)onTraitClick(cat);}} style={{
                fontSize:sm?7:9,color:tc,
                background:tbg,
                borderRadius:3,padding:"1px 4px",textAlign:"center",width:"100%",
                overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis",
                fontWeight:t.tier!=="common"?700:500,cursor:onTraitClick?"help":"default",lineHeight:1.4
              }}>{t.icon} {t.name}</div>);
            })}
          </div>
        )}
      </div>

      {/* Chemistry hints */}
      {chemHint&&chemHint.grudge&&<div style={{position:"absolute",top:sm?7:9,right:sm?2:3}}>
        <div style={{width:6,height:6,borderRadius:3,background:"#fb923c",boxShadow:"0 0 6px #fb923c66"}} title="Grudge: 75% tension, 25% prove"/>
      </div>}
    </div>
  );
}

function FS({f,onClick,sm,off}){
  const isChem=f.isChem;
  return(
    <div onClick={onClick} title={f.desc} style={{width:sm?68:84,height:sm?44:54,borderRadius:8,border:`1.5px solid ${off?"#ef444444":isChem?"#818cf844":"#fbbf2444"}`,background:off?"linear-gradient(145deg,#2a1111,#0d0d1a)":isChem?"linear-gradient(145deg,#1a1a3a,#0d0d1a)":"linear-gradient(145deg,#2a2200,#0d0d1a)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:onClick?"pointer":"default",padding:2,flexShrink:0,fontFamily:"'Cinzel',serif",opacity:off?.5:1}}>
      <span style={{fontSize:sm?13:16}}>{off?"🤐":f.icon}</span>
      <span style={{fontSize:10,color:off?"#ef4444":isChem?"#818cf8":"#fbbf24",textAlign:"center",lineHeight:1.1,marginTop:1}}>{f.name}</span>
    </div>
  );
}

// v10: Progress breadcrumb
function ProgressMap({ante,blind,mx}){
  const dots=[];
  for(let a=1;a<=mx;a++){
    for(let b=0;b<3;b++){
      const done=a<ante||(a===ante&&b<blind);
      const cur=a===ante&&b===blind;
      const isBoss=b===2;
      dots.push({a,b,done,cur,isBoss});
    }
  }
  return(<div style={{display:"flex",gap:2,alignItems:"center",padding:"2px 0"}}>
    {dots.map((d,i)=>{
      const showAnte=d.b===0;
      return(<div key={i} style={{display:"flex",alignItems:"center",gap:1}}>
        {showAnte&&i>0&&<div style={{width:4,height:1,background:"#333",margin:"0 1px"}}/>}
        {showAnte&&<span style={{fontSize:10,color:d.done||d.cur?"#fbbf24":"#444",fontFamily:"system-ui",marginRight:1}}>{d.a}</span>}
        <div style={{
          width:d.cur?10:d.isBoss?9:6,height:d.cur?10:d.isBoss?9:6,
          borderRadius:d.isBoss?1:10,
          background:d.cur?"#fbbf24":d.done?"#4ade80":"#333",
          border:d.cur?`2px solid #fbbf24`:d.isBoss&&!d.done?"1px solid #ef444466":"none",
          boxShadow:d.cur?"0 0 8px #fbbf2488":"none",
          transition:"all .3s"
        }}/>
      </div>);
    })}
  </div>);
}

function FM({level,prev}){
  const fv=NERVE[level],pct=(level/9)*100,mx=level===9,ch=prev!==null&&prev!==level,up=ch&&level>prev,dn=ch&&level<prev;
  return(<div style={{width:"100%",maxWidth:700,padding:"0 16px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <span title={"NERVE multiplies ALL scores.\nGain: Crush thresholds (3x pace = +1).\nGrudge 'Something to Prove' gives bonus gains.\nLose: Discard (-1). Weak hands (-1 to -2).\nDecay: -1 each night transition.\nAt NINTH LIFE (max): ×2.2 to ALL scores."} style={{fontSize:12,fontWeight:700,color:fv.color,letterSpacing:2,textShadow:mx?`0 0 14px ${fv.glow}`:level>3?`0 0 6px ${fv.color}44`:"none",animation:mx?"fp 1s ease-in-out infinite":up?"fpp .4s ease-out":dn?"shake .3s ease":"none",fontFamily:"'Cinzel',serif",cursor:"help"}}>{mx?"✦ ":""}{fv.name}{mx?" ✦":""}</span>
        <span style={{fontSize:11,color:fv.color,fontFamily:"system-ui",fontWeight:700,opacity:fv.xM>1?1:.4}}>{fv.xM>1?`x${fv.xM}`:""}</span>
        {ch&&<span style={{fontSize:10,fontWeight:700,animation:"countUp .4s ease-out",color:up?"#4ade80":"#ef4444"}}>{up?"▲":"▼"}</span>}
      </div>
      <div style={{display:"flex",gap:3,alignItems:"center"}}>{Array.from({length:9}).map((_,i)=>(<div key={i} style={{width:10,height:10,borderRadius:"50%",background:i<level?NERVE[Math.min(i+1,9)].color:"#1a1a2e",border:`1.5px solid ${i<level?NERVE[Math.min(i+1,9)].color+"aa":"#333"}`,transition:"all .3s",boxShadow:i<level?`0 0 4px ${NERVE[Math.min(i+1,9)].color}44`:"none"}}/>))}<span style={{fontSize:10,color:"#555",fontFamily:"system-ui",marginLeft:2}}>{level}/9</span></div>
    </div>
    <div style={{height:8,background:"#1a1a2e",borderRadius:4,overflow:"hidden",border:"1px solid #ffffff08"}}><div style={{height:"100%",width:`${pct}%`,borderRadius:4,background:mx?"linear-gradient(90deg,#b85c2c,#f59e0b,#fef08a,#ffffffcc)":`linear-gradient(90deg,#9a8672,${fv.color})`,transition:"width .5s cubic-bezier(.4,0,.2,1)",boxShadow:level>3?`0 0 8px ${fv.color}44`:"none"}}/></div>
    {level===0&&<div style={{fontSize:10,color:"#666",fontFamily:"system-ui",marginTop:2,textAlign:"center"}}>Crush targets to build Nerve. Each discard costs 1 Nerve level.</div>}
  </div>);
}

// ★ Grudge Preview: shows grudge pairs for selected cats
function ChemPreview({cats}){
  if(cats.length<2)return null;
  const grudges=getGrudges(cats);
  if(!grudges.length)return null;
  return(<div style={{display:"flex",gap:6,alignItems:"center",fontSize:10,fontFamily:"system-ui"}}>
    {grudges.map(([a,b],i)=><span key={`g${i}`} style={{color:"#fb923c"}}>⚡{a.name.split(" ")[0]}+{b.name.split(" ")[0]}</span>)}
  </div>);
}

// ═══════════════════════════════════════════════════════════════
// MAIN GAME
// ═══════════════════════════════════════════════════════════════

function NinthLife(){
  const[ph,setPh]=useState("title");
  const[ante,setAnte]=useState(1);const[blind,setBlind]=useState(0);
  const[rScore,setRScore]=useState(0);const[hLeft,setHLeft]=useState(4);
  const[dLeft,setDLeft]=useState(3);const[gold,setGold]=useState(5);
  const[scavenge,setScavenge]=useState(0); // ★ Scavenge: bonus chips from discarded cats' power
  const[hand,setHand]=useState([]);const[draw,setDraw]=useState([]);
  const[disc,setDisc]=useState([]);const[sel,setSel]=useState(new Set());
  const[fams,setFams]=useState([]);const[sCats,setSCats]=useState([]);
  const[sFams,setSFams]=useState([]);const[sRes,setSRes]=useState(null);
  const[sStep,setSStep]=useState(-1);
  const[runChips,setRunChips]=useState(0);const[runMult,setRunMult]=useState(0);
  const[scoreShake,setScoreShake]=useState(0);const[clutch,setClutch]=useState(false);const[scoringFlash,setScoringFlash]=useState(null); // ★ v47: brightness flash on big hits
  const[handBests,setHandBests]=useState({});const[newBest,setNewBest]=useState(null);const[scoringDone,setScoringDone]=useState(false);const[traitTip,setTraitTip]=useState(null);const[deckView,setDeckView]=useState(false);
  const[boss,setBoss]=useState(null);
  const stRef=useRef(null);
  const scoreEndRef=useRef(null); // ★ v38: Pre-computed end state for skip
  const advancingRef=useRef(false); // ★ FIX: Prevent double-click on scoring screen
  const actionLock=useRef(false); // ★ FIX: Prevent double-click on play/discard
  const fcSeenRef=useRef({}); // ★ v47: Track which first-cascade annotations have shown
  const[ferv,setFerv]=useState(0);const[pFerv,setPFerv]=useState(null);
  const[fFlash,setFFlash]=useState(null);const[rMaxF,setRMaxF]=useState(0);
  const[curses,setCurses]=useState([]);const[cfx,setCfx]=useState({});
  const[oData,setOData]=useState(null);
  const[sellMode,setSellMode]=useState(false);
  const[sellsLeft,setSellsLeft]=useState(2); // ★ Max 2 sells per shop
  const[den,setDen]=useState([]); // ★ v44: Now stores ISOLATED cats (sheltered from den). Everyone else enters.
  const[denRes,setDenRes]=useState(null); // ★ Den night results
  const[babyNames,setBabyNames]=useState({}); // ★ v46: Baby naming {catId: newName}
  const[denStep,setDenStep]=useState(-1); // ★ v38: Den cascade step
  const denStRef=useRef(null); // ★ v38: Den cascade timer
  // ★ v44: Cleanup timeout chains on unmount
  useEffect(()=>()=>{if(stRef.current)clearTimeout(stRef.current);if(denStRef.current)clearTimeout(denStRef.current);},[]);
  // v10: CONTEXT SYSTEMS
  const[runLog,setRunLog]=useState([]); // event log
  const[fallen,setFallen]=useState([]); // names of the dead
  // v13: Draft system
  const[draftPool,setDraftPool]=useState([]);const[draftRejects,setDraftRejects]=useState([]);const[colonyData,setColonyData]=useState(null);
  const[draftPicked,setDraftPicked]=useState([]);
  const[draftBase,setDraftBase]=useState([]);
  const[draftWaves,setDraftWaves]=useState([]); // ★ v48: pre-generated draft waves (2 remaining after first)
  // v13: Boss rewards
  const[bossReward,setBossReward]=useState(null);
  // v13: Run bonuses from boss rewards
  const[runBonus,setRunBonus]=useState({hands:0});
  // v14: Den news (persists across rounds until next den)
  const[denNews,setDenNews]=useState([]);
  // v14: First hand fog tracker for New Moon
  const[firstHandPlayed,setFirstHandPlayed]=useState(false);
  // v16: Visual scoring
  const[scoringCats,setScoringCats]=useState([]);
  const[aftermath,setAftermath]=useState([]);
  // v15: Colony events
  const[colEvent,setColEvent]=useState(null);
  const[colTargets,setColTargets]=useState([]);const[eventOutcome,setEventOutcome]=useState(null);const[skipShop,setSkipShop]=useState(false);
  // v15: Temp round modifiers from events
  const[tempMods,setTempMods]=useState({hands:0,discs:0});
  // v15: Event-granted den safety
  const[eventDenSafe,setEventDenSafe]=useState(false);const[eventDenBonus,setEventDenBonus]=useState(0);const[firstDenUsed,setFirstDenUsed]=useState(false);
  const[newUnlocks,setNewUnlocks]=useState([]); // hover tooltip
  const[shopTab,setShopTab]=useState("cats"); // ★ v41: Shop tabs
  const[defeatData,setDefeatData]=useState(null); // v30: defeat interstitial
  const[bloodMemMsg,setBloodMemMsg]=useState(null); // ★ v35: Blood Memory inheritance narration
  const[rerollCount,setRerollCount]=useState(0); // ★ v35: Escalating reroll cost per shop visit
  const[hearthDust,setHearthDust]=useState(0); // v30: dust earned from saved cats at run start
  const[anteUp,setAnteUp]=useState(null); // ante transition
  const[nightCard,setNightCard]=useState(null); // v29: night interstitial
  const[meta,setMeta]=useState(null);const[hearthPair,setHearthPair]=useState([]); // ★ v46: save M+F pair to hearth
  const[savedRun,setSavedRun]=useState(null); // ★ v47: saved run for continue
  const[starter,setStarter]=useState(null);const[reshuf,setReshuf]=useState(false);
  const[tab,setTab]=useState("play");
  // ★ v40: Guided first hand replaces tutorial pages
  const[guide,setGuide]=useState(null); // {step:0-3, msg:"..."}
  // ★ v47: Auto-play first hand — demo the scoring cascade before handing control
  const[autoPlay,setAutoPlay]=useState(null); // null | {step:0-3, idxs:[]}
  const[namingCat,setNamingCat]=useState(null); // cat being named after draft pick (first run only)
  // ★ v33: Toast notification system — fleeting feedback for purchases, traits, outcomes
  const[toasts,setToasts]=useState([]);const toastRef=useRef(0);
  function toast(icon,text,color="#fbbf24"){const id=++toastRef.current;setToasts(t=>[...t,{id,icon,text,color}]);setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),2200);}
  // ★ v33: First-encounter tracking — show hints on first time seeing a phase
  const[seen,setSeen]=useState({});
  // ★ v39: Audio mute state
  const[muted,setMuted]=useState(()=>{try{return localStorage.getItem("nl_mute")==="1";}catch(e){return false;}});
  const toggleMute=()=>{setMuted(m=>{const v=!m;Audio.muted=v;try{localStorage.setItem("nl_mute",v?"1":"0");}catch(e){}return v;});};
  // ★ v34: Boss traits, Ninth Dawn, colony counter
  const[bossTraits,setBossTraits]=useState([]);
  const[isNinthDawn,setIsNinthDawn]=useState(false);
  const[dareBet,setDareBet]=useState(false); // Eighth Colony's Score event

  // ★ v48: First run = 3 nights. Repeat until first WIN — then unlock full 5 nights.
  const isFirstRun=!meta||meta.stats.w===0;
  const MX=isFirstRun?3:5,BH=7,MF=5;
  const BOSSES=[
  // ★ v34: Full narrative bible dialogue — every boss is a fallen colony's echo
  {name:"The Hunger",icon:"🌪️",taunt:"I was here before you named it.",
    tauntFn:(ctx)=>ctx.fallen>0?`You've already lost ${ctx.fallen}. I can smell the space they left.`
      :ctx.scarred>2?"So many scars. You wear them like armor. They're not armor."
      :ctx.colony>18?"All those mouths. I don't have to break in. I just have to wait."
      :ctx.bonded>2?"Love is expensive. Every bond is a mouth you'll feed twice."
      :ctx.gold<3?"You feel it already, don't you? That tightness. That counting."
      :"Fresh. Unbroken. That won't last. It never does.",
    defeat:"...for now. I come back every morning disguised as a plan.",
    defeatFn:(ctx)=>ctx.clutch?"That close. You smelled it. You'll smell it again."
      :ctx.deathless?"You fed them all. The First Colony said the same thing. On Night One."
      :"You survived the first hunger. The second is worse.",
    lore:"Not a creature. A fact."},
  {name:"The Territory",icon:"🐕",taunt:"You built on someone else's grave.",
    tauntFn:(ctx)=>ctx.colony>18?`${ctx.colony} of you? This place wasn't built for that many.`
      :ctx.scarred>3?"Battle-scarred on my ground. Bold. Stupid, but bold."
      :ctx.bonded>0?"Bonds won't save you from what's underneath."
      :ctx.grudges>2?"You can't even keep peace among yourselves."
      :"You smell like prey.",
    defeat:"Next time, build faster.",
    defeatFn:(ctx)=>ctx.clutch?"Barely. The ground remembers close calls."
      :ctx.deathless?"Sturdy. The Second Colony was sturdy too. For a while."
      :"Fine. Stay. But the ground doesn't forget weight.",
    lore:"The land remembers who was here first."},
  {name:"The Mother",icon:"👁️",taunt:"I had names for them, too. Every one.",
    tauntFn:(ctx)=>ctx.fallen>2?`I never lost that many that fast. I lost them slowly. That's worse.`
      :ctx.fallen>0?`${ctx.fallenName}. I would have kept them safe.`
      :ctx.colony>18?"So many mouths. Can you really feed them all? I thought I could."
      :ctx.bonded>3?"So much love. It's beautiful. It's also heavy. So, so heavy."
      :ctx.colony<10?"Getting smaller. I know this part. I know exactly how this goes."
      :"They look at you the way mine looked at me. Before.",
    defeat:"Take care of them. Please. Do what I couldn't.",
    defeatFn:(ctx)=>ctx.clutch?"One number. That's all that stood between them and me."
      :ctx.deathless?"You're stronger than I was. Don't waste it."
      :ctx.fallen>0?"You've already made the choices I couldn't. Maybe that's enough."
      :"You're stronger than I was. Don't waste it.",
    lore:"She is what you become if you fail."},
  {name:"The Swarm",icon:"🐀",taunt:"We don't need to be stronger. Just patient.",
    tauntFn:(ctx)=>ctx.scarred>3?"So many wounded. We've been watching. We're very good at watching."
      :ctx.colony<12?"Getting smaller. Easier. We appreciate your cooperation."
      :ctx.colony>18?"Impressive numbers! Still not enough. We've done the math."
      :ctx.grudges>2?"Fighting each other. We love that. Saves us the trouble."
      :"We are very, very good at counting.",
    defeat:"We are still counting.",
    defeatFn:(ctx)=>ctx.clutch?"We almost had you. We always almost have you. That's the game."
      :ctx.fallen>0?`We took ${ctx.fallen}. We'll take more next time. We always take more.`
      :ctx.deathless?"Fewer of us now. But never none. Never, ever none."
      :"Fewer of us now. But never none.",
    lore:"The math of extinction."},
  {name:"The Forgetting",icon:"🌫️",taunt:"What were their names? Say them. Quickly, now.",
    tauntFn:(ctx)=>ctx.fallen>0?`You've already forgotten something about ${ctx.fallenName}. Don't pretend you haven't.`
      :ctx.colony>18?`Can you really remember ${ctx.colony} names? All of them? Without looking?`
      :ctx.scarred>2?"Which scars are from Night 2? Which from Night 4? You don't remember."
      :ctx.bonded>3?"They bonded. How? When exactly? What were the words? Gone."
      :"All of them? Still? Let me fix that.",
    defeat:"You remembered. This time.",
    defeatFn:(ctx)=>ctx.clutch?"One more number. That's all that stood between you and forgetting."
      :ctx.deathless?"They'll remember this colony. They'll have to."
      :ctx.fallen>2?"You'll tell people about the ones who survived. Not the ones who didn't. That's how I win."
      :"They'll remember this colony. They'll have to.",
    lore:"The last enemy is not death. It is being forgotten."},
];
  // ★ v34: Build full boss pool — expanded bosses join after 3 wins
  const wins=meta?.stats?.w||0;
  const FULL_BOSS_POOL=[...BOSSES,...(wins>=3?EXPANDED_BOSSES:[])];

  useEffect(()=>{loadS().then(d=>setMeta(d));loadRun().then(r=>setSavedRun(r));},[]);
  useEffect(()=>{Audio.muted=muted;},[muted]);
  // ★ FIX: Safety net — if stuck in playing with 0 hands and not winning, force game over
  useEffect(()=>{
    if(ph==="playing"&&hLeft<=0){
      const t=(()=>{try{return eTgt();}catch(e){return Infinity;}})();
      if(rScore<t){
        advancingRef.current=false;
        setTimeout(()=>endRun(false,rScore),100);
      }
    }
  },[ph,hLeft,rScore]); // eslint-disable-line
  // ★ v47: Auto-save colony at each night transition
  useEffect(()=>{
    if(ph==="nightCard"&&hand.length+draw.length>0){
      const snapshot={ante,blind,hand,draw,fams:fams.map(f=>f.id),ferv,rMaxF,gold,fallen,handBests,
        runBonus,runLog,denNews,isNinthDawn,hearthDust,firstHandPlayed,firstDenUsed,
        tempMods,_cid,_nis};
      saveRun(snapshot);
    }
  },[ph]); // eslint-disable-line

  // ★ v47: AUTO-PLAY FIRST HAND — single timeout chain, no useEffect complexity
  const autoRef=useRef(null);
  const[introStep,setIntroStep]=useState(0); // ★ v49: Multi-page intro step
  function startAutoPlay(){
    // Find best breed — select ALL matching (up to 5)
    const bc={};hand.forEach((c,i)=>{bc[c.breed]=(bc[c.breed]||0)+1;});
    const best=Object.entries(bc).sort((a,b)=>b[1]-a[1]).find(([,v])=>v>=2);
    const idxs=[];
    if(best)hand.forEach((c,i)=>{if(c.breed===best[0]&&idxs.length<5)idxs.push(i);});
    else{idxs.push(0);if(hand.length>1)idxs.push(1);}
    setAutoPlay({step:0,idxs});

    // Step 0: banner for 3s, then cascade select cats one by one
    autoRef.current=setTimeout(()=>{
      let ci=0;
      function selectNext(){
        if(ci>=idxs.length){
          // All selected — pause then play
          setAutoPlay(a=>a?{...a,step:3}:null);
          autoRef.current=setTimeout(()=>{
            const cats=idxs.map(i=>hand[i]).filter(Boolean);
            if(cats.length>=1){
              setScoringCats(cats);setAftermath([]);setFirstHandPlayed(true);Audio.cardPlay();
              const beatingPace=rScore>=eTgt()*0.4;
              const activeBT=blind===2?bossTraits:[];
              const result=calcScore(cats,fams,ferv,cfx,{gold,deckSize:allC.length,discSize:disc.length,handSize:hs(),beatingPace,bossTraitFx:activeBT,scarMult:getMB().scarMult||0,grudgeWisdom:getMB().grudgeWisdom||0,hasMastery:!!(getMB().xp),scavenge});
              setScavenge(0);advancingRef.current=false;
              setSRes(result);setSStep(0);setPh("scoring");setRunChips(0);setRunMult(0);setNewBest(null);
              let rC=0,rM=0;
              const stepTotals=result.bd.map(s=>{rC+=s.chips||0;rM+=s.mult||0;if(s.xMult)rM=Math.round(rM*s.xMult);return{chips:Math.max(0,rC),mult:Math.max(1,rM),total:Math.max(0,rC)*Math.max(1,rM)};});
              const aft=[];
              cats.forEach(c=>{
                const oldXP=getCatXP(c.stats.tp,!!(getMB().xp));const newXP=getCatXP(c.stats.tp+1,!!(getMB().xp));
                if(newXP&&(!oldXP||newXP.label!==oldXP.label))aft.push({icon:"⭐",text:`${c.name.split(" ")[0]}: ${newXP.label}!`,color:newXP.color});
                if(result.total>c.stats.bs)aft.push({icon:"🏆",text:`${c.name.split(" ")[0]} PB: ${result.total.toLocaleString()}`,color:"#fbbf24"});
              });
              const bondedInHand=cats.filter(c=>c.bondedTo&&cats.find(x=>x.id===c.bondedTo));
              if(bondedInHand.length>=2)aft.push({icon:"💕",text:`${bondedInHand[0].name.split(" ")[0]} & ${bondedInHand[1].name.split(" ")[0]}: Together`,color:"#f472b6"});
              scoreEndRef.current={chips:result.chips,mult:result.mult,total:result.total,ht:result.ht,aft,shk:getShakeIntensity(result.total),isFirstCascade:true,stepTotals:stepTotals.map(s=>s.total)};
              let stp=0;const tot=result.bd.length;
              function getAutoStepDelay(s){
                const tempo=Math.max(0.5,Math.min(1.4,7/tot));const slow=1.4;
                const st=result.bd[s];const isLast=s===tot-1;const isPenult=s===tot-2;
                if(st&&(st.mult<0||st.type==="curse"||st.type==="grudge_tension"))return Math.round(150*tempo*slow);
                if(st&&st.xMult)return Math.round(Math.max(520,720*Math.max(0.7,tempo))*slow);
                if(st&&st.type==="nerve")return Math.round(Math.max(420,620*Math.max(0.7,tempo))*slow);
                if(st&&(st.type==="bond"||st.type==="lineage"))return Math.round(Math.max(320,470*tempo)*slow);
                if(isPenult)return Math.round(Math.max(370,520*tempo)*slow);
                if(isLast)return Math.round(Math.max(470,670*tempo)*slow);
                if(s===0)return Math.round(550*tempo*slow);
                if(st?.isBigCat)return Math.round(Math.max(300,420*tempo)*slow);
                if(s===1)return Math.round(420*tempo*slow);
                if(s<=3)return Math.round(350*tempo*slow);
                return Math.round(Math.max(70,(200-s*5)*tempo)*slow);
              }
              function animStep(){
                stp++;
                if(stp<tot){
                  setSStep(stp);setRunChips(stepTotals[stp].chips);setRunMult(stepTotals[stp].mult);
                  const progress=stepTotals[stp].total/(result.total||1);const s=result.bd[stp];
                  if(s){
                    if(s.xMult){Audio.xMultSlam(s.xMult);setScoreShake(Math.ceil(s.xMult));setTimeout(()=>setScoreShake(0),300);setScoringFlash(s.xMult>=1.5?"#fef08a":"#fbbf24");setTimeout(()=>setScoringFlash(null),150);}
                    else if(s.type==="grudge_tension")Audio.grudgeTense();
                    else if(s.type==="grudge_prove")Audio.grudgeProve();
                    else if(s.type==="bond"||s.type==="lineage")Audio.bondChime();
                    else if(s.isBigCat)Audio.bigCatHit(progress);
                    else if(s.mult>0)Audio.multHit(s.mult,progress);
                    else if(s.chips>0)Audio.chipUp(s.chips,progress);
                  }
                  stRef.current=setTimeout(animStep,getAutoStepDelay(stp));
                }else{
                  const end=scoreEndRef.current;
                  setRunChips(end.chips);setRunMult(end.mult);
                  setScoreShake(end.shk);setTimeout(()=>setScoreShake(0),400+end.shk*100);
                  const prev=handBests[end.ht]||0;
                  if(end.total>prev){setHandBests(b=>({...b,[end.ht]:end.total}));setNewBest(end.ht);}
                  setAftermath(end.aft);setScoringDone(true);
                  const tier=getScoreTier(end.total);
                  if(tier&&tier.label)Audio.tierReveal(Math.min(5,Math.floor(end.total/5000)));
                }
              }
              Audio.handType(Math.min(3,Math.floor((HT.findIndex(h=>h.name===result.ht)||0)/3)));
              stRef.current=setTimeout(animStep,getAutoStepDelay(0));
            }
          },2000);
          return;
        }
        // Select next cat with 800ms between each
        setSel(prev=>{const ns=new Set(prev);ns.add(idxs[ci]);return ns;});
        Audio.cardSelect();
        setAutoPlay(a=>a?{...a,step:ci===0?1:2}:null);
        ci++;
        autoRef.current=setTimeout(selectNext,800);
      }
      selectNext();
    },3000);
  }

  function getMB(){
    if(!meta)return{gold:0,hands:0,discards:0,fervor:0,bloodMemory:0,heirloom:0,draftPower:0,dustBonus:0,scarMult:0,startWard:0,grudgeWisdom:0,shelter:0};
    let b={gold:0,hands:0,discards:0,fervor:0,bloodMemory:0,heirloom:0,draftPower:0,dustBonus:0,scarMult:0,startWard:0,grudgeWisdom:0,shelter:0};
    MILESTONES.forEach(m=>{if(meta.cats.length>=m.req)Object.entries(m.bonus).forEach(([k,v])=>{b[k]=(b[k]||0)+v;});});
    Object.entries(meta.ups||{}).forEach(([id,cnt])=>{const u=UPGRADES.find(x=>x.id===id);if(u)Object.entries(u.b).forEach(([k,v])=>{b[k]=(b[k]||0)+v*cnt;});});
    // v14: Cattery breed completion bonus
    if(meta.stats.disc){
      const breeds=new Set(meta.stats.disc.map(d=>d.split("-")[0]));
      if(BK.every(b=>breeds.has(b)))b.gold+=2; // all 4 breeds saved = +2G per night
    }
    return b;
  }
  // ★ v35: Heat Relic check helper
  const hasRelic=n=>!!(meta?.relics||[]).includes(n);
  const hs=()=>Math.max(4,BH+(cfx.hsMod||0));
  const eTgt=()=>{
    let t=Math.round(getTarget(ante,blind,isFirstRun)*(cfx.tgtMult||1)*getHeatMult(meta?.heat));
    // ★ v34: Boss trait target modifiers
    if(blind===2&&bossTraits.length>0){
      bossTraits.forEach(bt=>{if(bt.fx.tgtMult)t=Math.round(t*bt.fx.tgtMult);});
      // Fading: +5% per hand remaining
      const fadingTrait=bossTraits.find(bt=>bt.fx.fading);
      if(fadingTrait)t=Math.round(t*(1+hLeft*0.05));
      // Bleeding: -2% per hand played (4-hLeft played)
      const bleedingTrait=bossTraits.find(bt=>bt.fx.bleeding);
      if(bleedingTrait){const played=Math.max(0,4-hLeft);t=Math.round(t*(1-played*0.02));}
    }
    return t;
  };
  // ★ v44: Memoize expensive derived state
  const allC=React.useMemo(()=>[...hand,...draw,...disc],[hand,draw,disc]);

  // v10: Run log helper
  function logEvent(type,data){setRunLog(l=>[...l,{type,data,ante,blind,t:Date.now()}]);}

  // ★ v47: COLONY CHRONICLE — auto-generated run narrative
  function genChronicle(won){
    const deaths=runLog.filter(e=>e.type==="death");
    const fights=runLog.filter(e=>e.type==="fight");
    const bonds=runLog.filter(e=>e.type==="bond");
    const breeds=runLog.filter(e=>e.type==="breed");
    const grudges=runLog.filter(e=>e.type==="grudge");
    const reconciles=runLog.filter(e=>e.type==="reconcile");
    const hands=runLog.filter(e=>e.type==="hand");
    const bestHand=hands.length?hands.reduce((a,b)=>b.data.score>a.data.score?b:a,hands[0]):null;
    const mvpCat=[...allC].sort((a,b)=>(b.stats?.bs||0)-(a.stats?.bs||0))[0];
    const lines=[];
    // Opening
    const opener=ante<=2?"They barely lasted two nights."
      :ante<=3?`Three nights. ${allC.length} survivors out of 14.`
      :`Colony #${(meta?.stats?.r||0)+1}. ${allC.length} cats. ${ante} nights deep.`;
    const draftLine=runLog.find(e=>e.type==="draft");
    lines.push(opener+(draftLine?` It started with ${draftLine.data.picked}, three souls pulled from the draft.`:""));
    // Middle — pick the most dramatic events
    const midParts=[];
    if(bestHand)midParts.push(`Their best moment: a ${bestHand.data.type} worth ${bestHand.data.score.toLocaleString()}. ${bestHand.data.cats} working as one${bestHand.data.nerve&&bestHand.data.nerve!=="Still"?`, ${bestHand.data.nerve} burning through them`:""}.`);
    if(bonds.length)midParts.push(`${bonds.length===1?bonds[0].data.c1+" and "+bonds[0].data.c2+" found each other":bonds.length+" pairs bonded in the den"}.`);
    if(grudges.length&&reconciles.length)midParts.push(`${grudges.length} grudge${grudges.length>1?"s":""} formed. ${reconciles.length} healed.`);
    else if(grudges.length)midParts.push(`${grudges.length} grudge${grudges.length>1?"s":""} festered in the den. None forgiven.`);
    if(breeds.length)midParts.push(`${breeds.length} kitten${breeds.length>1?"s":""} born, and life found a way even in the dark.`);
    if(fights.length>2)midParts.push(`The den saw ${fights.length} fights. Scars accumulated.`);
    lines.push(midParts.slice(0,3).join(" "));
    // Ending
    if(won&&fallen.length===0)lines.push(`All of them. Every single one made it through ${ante} nights. ${mvpCat?mvpCat.name.split(" ")[0]+" led the way.":""} Ask me their names. I remember every one.`);
    else if(won)lines.push(`${fallen.length} didn't make it: ${fallen.map(f=>f.name.split(" ")[0]).join(", ")}. The rest carried their names into the dawn.${mvpCat?" "+mvpCat.name.split(" ")[0]+" carried the heaviest.":""}`);
    else lines.push(`Night ${ante}${deaths.length?". "+deaths.map(d=>d.data.victim.split(" ")[0]).join(", ")+" fell":""}. The dark doesn't remember the ones it takes. But I do.`);
    return lines;
  }

  // v10: Deck composition stats
  function getDeckStats(){
    const cats=allC;const bc={};const gc={M:0,F:0};let tp=0,neg=0,rare=0,scarred=0,bonded=0;
    cats.forEach(c=>{
      bc[c.breed]=(bc[c.breed]||0)+1;
      gc[c.sex||"M"]++;tp+=c.power;
      if((c.trait||PLAIN).tier==="rare_neg")neg++;
      if((c.trait||PLAIN).tier==="rare")rare++;
      if(c.scarred)scarred++;
      if(c.bondedTo)bonded++;
    });
    return{total:cats.length,bc,gc,avgPow:cats.length?(tp/cats.length).toFixed(1):"0",neg,rare,scarred,bonded:Math.floor(bonded/2)};
  }

  // v10: Next blind target preview
  function getNextTarget(){
    const nb=blind>=2?0:blind+1;const na=blind>=2?ante+1:ante;
    if(blind>=2&&ante>=MX)return null; // victory next
    return{ante:na,blind:nb,target:Math.round(getTarget(na,nb,isFirstRun)),blindName:nb===2?"Boss":(nb===0?"Small":"Big")};
  }

  function drawN(dp,di,n){let d=[...dp],ds=[...di];const r=[];for(let i=0;i<n;i++){if(!d.length&&ds.length){d=shuf(ds);ds=[];setReshuf(true);setTimeout(()=>setReshuf(false),800);}if(d.length)r.push(d.shift());else break;}return{drawn:r,nd:d,ndi:ds};}

  // ★ v47 BALANCE: Nerve gain tightened (sim-verified: avg peak 9→5.5)
  function updFerv(s,cs,ct,ch,hasGrudgeProve,hasProviderNerve){
    if(cfx.noNerve)return;
    const rem=ct-cs,pace=ch>0?rem/ch:rem;setPFerv(ferv);
    const proveBonus=hasGrudgeProve?1:0;
    const provBonus=hasProviderNerve?1:0;
    // ★ v47: Only +1 at 3× pace (was +2 at 4× and +1 at 2.5×)
    if(s>=pace*3.0){const g=1+proveBonus+provBonus;const nx=Math.min(9,ferv+g);setFerv(nx);setRMaxF(m=>Math.max(m,nx));setFFlash("up");Audio.nerveUp();}
    else if(s<pace*.5){setFerv(Math.max(0,ferv-2+provBonus));setFFlash(provBonus?"up":"down");Audio[provBonus?"nerveUp":"nerveDown"]();}
    else if(s<pace*.8){setFerv(Math.max(0,ferv-1+provBonus));setFFlash(provBonus?"up":"down");Audio[provBonus?"nerveUp":"nerveDown"]();}
    // Grudge proves / Provider can still nudge you up on decent hands
    else if(proveBonus+provBonus>0){const nx=Math.min(9,ferv+proveBonus+provBonus);setFerv(nx);setRMaxF(m=>Math.max(m,nx));setFFlash("up");Audio.nerveUp();}
    setTimeout(()=>setFFlash(null),600);
  }

  function startGame(st){
    clearRunSave(); // ★ v47: Clear any saved colony when starting fresh
    _cid=0;_nis=Math.floor(Math.random()*STRAY_NAMES.length);_un.clear();
    const mb=getMB();const cats=[];
    for(let i=0;i<13;i++){
      const sex=i%2===0?"M":"F";
      const breed=pk(BK);
      // ★ v30: Strays start Plain. Only your chosen cats have traits.
      cats.push(gC({sex,breed,trait:PLAIN}));
    }
    if(st){const tr=TRAITS.find(t=>t.name===st.trait.name)||st.trait;cats[0]=gC({breed:st.breed,power:Math.min(15,st.power+(mb.heirloom||0)),trait:tr,name:st.name});}
    // v18 Heat 5: start with a Hexed cat
    if(getHeatFx(meta?.heat).hexStart){const hexTr=TRAITS.find(t=>t.name==="Cursed");cats[1]=gC({trait:hexTr,name:"Cursed One"});}
    // v13: Draft system - pick 3 cats, then start with 13+3=16
    const baseCats=cats.slice(0,13);
    // ★ v35: Blood Memory — a random starter inherits a Hearth cat's trait
    setBloodMemMsg(null);
    if((mb.bloodMemory||0)>0&&meta&&meta.cats.length>0){
      const plainStarters=baseCats.filter(c=>(c.trait||PLAIN).name==="Plain");
      if(plainStarters.length>0){
        const heir=pk(plainStarters);
        const ancestor=pk(meta.cats);
        const ancestorTrait=TRAITS.find(t=>t.name===ancestor.trait?.name)||(ancestor.trait?.tier?ancestor.trait:null);
        if(ancestorTrait&&ancestorTrait.name!=="Plain"){
          heir.trait=ancestorTrait;
          if(ancestor.scarred){heir.scarred=true;}
          heir.story=[`Inherited ${ancestorTrait.icon}${ancestorTrait.name} from ${ancestor.name.split(" ")[0]}`];
          setBloodMemMsg({heir:heir.name,ancestor:ancestor.name.split(" ")[0],trait:ancestorTrait,scarred:!!ancestor.scarred});
        }
      }
    }
    // ★ v34 ECON: Bloodline upgrade — drafted cats get +draftPower
    const dp=mb.draftPower||0;
    // ★ v46: LINEAGE DRAFTING — if hearth has pairs, draft from descendants
    const hearthPrs=getHearthPairs(meta?.cats||[]);
    const ninthStarBonus=(meta?.relics||[]).includes(4)?1:0; // Ninth Star relic = +1P
    const genDraft=()=>{
      const c=hearthPrs.length>0?genDescendant(meta.cats,dp+ninthStarBonus):gC({trait:pickDraftTrait()});
      // ★ v49: Draft cats always power 2-6 — no runts, no gods
      c.power=clamp(c.power,2,6);
      return c;
    };
    // ★ v48: Generate all 9 draft cats upfront — total power clamped to 20-55
    // Guarantee: at least 1 Legendary (A tier), no Mythic (S tier) in draft
    let allDraft;
    let safety=0;
    do{
      allDraft=[genDraft(),genDraft(),genDraft(),genDraft(),genDraft(),genDraft(),genDraft(),genDraft(),genDraft()];
      // Block S tier — downgrade Mythic traits to Legendary
      allDraft.forEach(c=>{
        if((c.trait||PLAIN).tier==="mythic"){c.trait=pk(LEGENDARY_TRAITS);c.name=gN(c.breed,c.trait);}
      });
      safety++;
    }while(safety<20&&(allDraft.reduce((s,c)=>s+c.power,0)<20||allDraft.reduce((s,c)=>s+c.power,0)>55));
    // Guarantee at least 1 Legendary across all 9 — if none, upgrade a random common
    if(!allDraft.some(c=>(c.trait||PLAIN).tier==="legendary")){
      const cands=allDraft.filter(c=>(c.trait||PLAIN).tier==="common");
      if(cands.length>0){const pick=pk(cands);pick.trait=pk(LEGENDARY_TRAITS);pick.name=gN(pick.breed,pick.trait);}
    }
    if(dp>0&&hearthPrs.length===0)allDraft.forEach(c=>{c.power=Math.min(15,c.power+dp);});
    const pool1=allDraft.slice(0,3);
    setDraftBase(baseCats);setDraftPool(pool1);setDraftPicked([]);setDraftRejects([]);
    setDraftWaves([allDraft.slice(3,6),allDraft.slice(6,9)]); // ★ v48: pre-generated waves
    setDisc([]);setSel(new Set());setAnte(1);setBlind(0);setRScore(0);
    const hfx=getHeatFx(meta?.heat);setHLeft(4+mb.hands+(hfx.handMod||0));setDLeft(3+mb.discards+(hfx.discMod||0));setGold(3+mb.gold);
    // ★ v35: Relic 5 (Undying Summer) — start with extra Nerve
    const startNerve=(mb.fervor||0)+((meta?.relics||[]).includes(5)?1:0);
    setFams([]);setFerv(startNerve);setPFerv(null);setFFlash(null);setRMaxF(startNerve);
    setBoss(BOSSES[0]);setSRes(null);setSStep(-1);setScoringDone(false);setHearthPair(null);setStarter(null);
    setBossTraits([]);setIsNinthDawn(false);setDareBet(false);
    setCurses([]);setCfx({});setOData(null);
    setSellMode(false);setSellsLeft(2);
    // ★ v36: Apothecary reworked — start with a random ward instead of potion
    const startWards=mb.startWard||0;
    const startFams=[];
    if(startWards>0){for(let i=0;i<startWards;i++){const w=pk(FAMS.filter(f=>!startFams.find(o=>o.id===f.id)));if(w)startFams.push(w);}}
    setFams(startFams);
    setDen([]);setDenRes(null);setDenStep(-1);setRunLog([]);setFallen([]);setAnteUp(null);setBossReward(null);setRunBonus({hands:0});setDenNews([]);setFirstHandPlayed(false);setScoringCats([]);setAftermath([]);setColEvent(null);setColTargets([]);setTempMods({hands:0,discs:0});setEventDenSafe(false);setEventDenBonus(0);setBabyNames({});setFirstDenUsed(false);fcSeenRef.current={};setAutoPlay(null);
    setRunChips(0);setRunMult(0);setScoreShake(0);setClutch(false);setNewBest(null);setDefeatData(null);setRerollCount(0);setScavenge(0);
    // ★ v30: The Hearth — saved cats radiate stardust at start of each run
    if(meta&&meta.cats.length>0){
      const dustBonus=getMB().dustBonus||0;
      const heatMult=getHeatFx(meta?.heat).dustMult||1;
      const hd=calcTotalHearthDust(meta.cats,dustBonus,heatMult);
      setHearthDust(hd.total);
      if(hd.total>0){const u={...meta,dust:meta.dust+hd.total};setMeta(u);saveS(u);}
    }else{setHearthDust(0);}
    setPh("draft");
  }

  // ★ v47: SAVE-AND-QUIT — resume a saved colony
  function resumeRun(sr){
    _cid=sr._cid||100;_nis=sr._nis||sr._ni||0;_un.clear();
    // ★ v48+: Sanitize restored cats — old saves may lack trait objects
    const sanitizeCat=c=>{
      if(!c)return c;
      if(!c.trait)c.trait=PLAIN;
      if(!c.extraTraits)c.extraTraits=[];
      if(!c.grudgedWith)c.grudgedWith=[];
      if(!c.stats)c.stats={tp:0,ts:0,bs:0,bh:""};
      // Rehydrate trait from TRAITS constant (restore methods/references)
      if(typeof c.trait.name==="string"){const found=TRAITS.find(t=>t.name===c.trait.name);if(found)c.trait=found;}
      c.extraTraits=c.extraTraits.map(et=>{if(typeof et.name==="string"){const found=TRAITS.find(t=>t.name===et.name);return found||et;}return et;});
      return c;
    };
    const sHand=(sr.hand||[]).map(sanitizeCat);
    const sDraw=(sr.draw||[]).map(sanitizeCat);
    // ★ v47: Repopulate name set from restored cats to prevent duplicates
    [...sHand,...sDraw,...(sr.fallen||[])].forEach(c=>{if(c&&c.name){const fn=c.name.split(" ")[0];_un.add(fn);}});
    const mb=getMB();const hfx=getHeatFx(meta?.heat);
    setHand(sHand);setDraw(sDraw);setDisc([]);setSel(new Set());
    setAnte(sr.ante);setBlind(sr.blind);setRScore(0);
    // ★ v47: Restore wards from FAMS constant (eff functions don't survive JSON)
    setFams((sr.fams||[]).map(fid=>typeof fid==="string"?FAMS.find(f=>f.id===fid)||{id:fid,name:"?",icon:"?",desc:"",eff:()=>({})}:fid));setFerv(sr.ferv||0);setPFerv(null);setFFlash(null);setRMaxF(sr.rMaxF||0);
    setGold(sr.gold||0);setFallen(sr.fallen||[]);setHandBests(sr.handBests||{});
    setRunBonus(sr.runBonus||{hands:0});setRunLog(sr.runLog||[]);
    setDenNews(sr.denNews||[]);setIsNinthDawn(sr.isNinthDawn||false);
    setHearthDust(sr.hearthDust||0);setFirstHandPlayed(sr.firstHandPlayed||false);
    setFirstDenUsed(sr.firstDenUsed||false);setTempMods(sr.tempMods||{hands:0,discs:0});
    setBoss(BOSSES[Math.min(sr.ante-1,BOSSES.length-1)]);
    setSRes(null);setSStep(-1);setScoringDone(false);setHearthPair(null);setStarter(null);
    setBossTraits([]);setDareBet(false);setCurses([]);setCfx({});setOData(null);
    setSellMode(false);setSellsLeft(2);setDen([]);setDenRes(null);setDenStep(-1);
    setScoringCats([]);setAftermath([]);setColEvent(null);setColTargets([]);
    setEventDenSafe(false);setEventDenBonus(0);setBabyNames({});
    setRunChips(0);setRunMult(0);setScoreShake(0);setClutch(false);setNewBest(null);
    setDefeatData(null);setRerollCount(0);setBloodMemMsg(null);setScavenge(0);
    const bh=4+mb.hands+(hfx.handMod||0)+(sr.runBonus?.hands||0);
    const bd=3+mb.discards+(hfx.discMod||0);
    setHLeft(bh);setDLeft(bd);
    setNightCard({ante:sr.ante,blind:sr.blind});setPh("nightCard");
    setSavedRun(null);
    toast("🏠","Colony restored. The fire still burns.","#fbbf24");
  }

  // ★ v34: Start the Ninth Dawn — the endgame run
  function startNinthDawn(){
    startGame(null); // Start with no companion
    setIsNinthDawn(true);
    // Boss selection will be randomized in nextBlind
  }

  function pickDraft(i){
    const cat=draftPool[i];const picked=[...draftPicked,cat];
    // Track rejected breeds - they'll influence future wanderers
    const rejects=[...draftRejects,...draftPool.filter((_,j)=>j!==i).map(c=>c.breed)];
    setDraftRejects(rejects);
    // ★ v49: First run naming — let player name each drafted cat
    const isFirstRun=!meta||meta.stats.r===0;
    if(isFirstRun){
      setNamingCat(cat);
      setDraftPicked(picked);
      if(picked.length>=3){
        // Will finalize after naming
        setPh("naming");
        // Store that we need to finalize after this name
        cat._finalPick=true;
      }else{
        const waveIdx=picked.length-1;
        const np=draftWaves[waveIdx]||[gC({trait:pickDraftTrait()}),gC({trait:pickDraftTrait()}),gC({trait:pickDraftTrait()})];
        setDraftPool(np);
        setPh("naming");
      }
      return;
    }
    if(picked.length>=3){
      finalizeDraft(picked);
    }else{
      setDraftPicked(picked);
      const waveIdx=picked.length-1;
      const np=draftWaves[waveIdx]||[gC({trait:pickDraftTrait()}),gC({trait:pickDraftTrait()}),gC({trait:pickDraftTrait()})];
      setDraftPool(np);
    }
  }
  function finalizeDraft(picked){
      const traitVal=t=>t.tier==="mythic"?5:t.tier==="legendary"?3:t.tier==="rare"?2:t.tier==="rare_neg"?-1:t.name==="Plain"?0:1;
      const draftStr=picked.reduce((s,c)=>s+c.power+traitVal(c.trait||PLAIN),0);
      // ★ v49: Asymmetric rubber-banding for 16-card deck
      // Weak draft: gentle cushion. Strong draft: mild tax.
      // Applied per-stray with probability to smooth out the ±13 cliff effect.
      const midpoint=19;
      const raw=(midpoint-draftStr)/4;
      // Asymmetric: weak draft dampened more (0.5x) than strong draft tax (0.7x), both capped
      const floatOffset=raw>0?Math.min(2,raw*0.5):Math.max(-1.5,raw*0.7);
      // Apply probabilistically: integer part always, fractional part as chance
      if(floatOffset!==0){
        const sign=floatOffset>0?1:-1;
        const abs=Math.abs(floatOffset);
        const base=Math.floor(abs); // guaranteed part
        const frac=abs-base; // probability of +1 more
        draftBase.forEach(c=>{
          const bonus=base+(Math.random()<frac?1:0);
          c.power=Math.max(1,Math.min(9,c.power+bonus*sign));
        });
      }
      const offset=Math.round(floatOffset);
      const all=shuf([...draftBase,...picked]);
      setHand(all.slice(0,BH));setDraw(all.slice(BH));
      setColonyData({chosen:picked,strays:draftBase,strayOffset:offset});
      setDraftPool([]);setDraftPicked([]);setDraftBase([]);
      logEvent("draft",{picked:picked.map(c=>c.name.split(" ")[0]).join(", "),rejects:draftRejects.length});
      setPh("colonyFormed");setTraitTip(null);
  }

  function advanceFromScoring(){
    if(!scoringDone||!sRes)return;
    // ★ FIX: Ref-based re-entry guard — prevents double-click from decrementing hLeft twice
    if(advancingRef.current)return;
    advancingRef.current=true;
    try{
    // ★ v47: Always clear autoPlay on scoring advance — no race condition
    if(autoPlay){setAutoPlay(null);setGuide({step:3,msg:""});}
    const result=sRes;const cats=scoringCats;
    setScoringDone(false);
    const tgt=eTgt();const ns=rScore+result.total;
    setRScore(ns);setGold(g=>Math.max(0,g+result.bG));
    updFerv(result.total,rScore,tgt,hLeft,result.hasGrudgeProve,result.hasProviderNerve);
    // ★ v34: Eighth Colony's dare bet
    if(dareBet){
      if(result.total>=tgt*0.5){setFerv(f=>Math.min(9,f+6));toast("🔥","THE DARE IS MET. +6 Nerve!","#fbbf24");}
      else{setFerv(f=>Math.max(0,f-3));toast("💀","The dare... failed. −3 Nerve.","#ef4444");}
      setDareBet(false);
    }
    
    logEvent("hand",{score:result.total,type:result.ht,cats:cats.map(c=>c.name.split(" ")[0]).join(", "),nerve:NERVE[ferv].name});
    cats.forEach(c=>{c.stats.tp++;c.stats.ts+=result.total;if(result.total>c.stats.bs){c.stats.bs=result.total;c.stats.bh=result.ht;}});
    const pIds=new Set(cats.map(c=>c.id));const rem=hand.filter(c=>!pIds.has(c.id));
    // ★ FIX: Played cats go to discard pile, then draw from draw pile (reshuffles if needed)
    const nDisc=[...disc,...cats];
    const target=hs();const need=target-rem.length;
    if(need>0){
      const{drawn,nd,ndi}=drawN(draw,nDisc,need);
      setHand([...rem,...drawn]);setDraw(nd);setDisc(ndi);
    }else{
      setHand(rem);setDraw(draw);setDisc(nDisc);
    }
    setSel(new Set());setHLeft(h=>h-1);setSRes(null);setSStep(-1);
    setRunChips(0);setRunMult(0);setNewBest(null);setScoringDone(false);
    if(ns>=tgt){
      if(hLeft<=1){setClutch(true);Audio.clutchWin();}
      setTimeout(()=>{setClutch(false);showOF(ns,tgt,hLeft-1);},hLeft<=1?800:400);
    }else if(hLeft-1<=0){endRun(false,ns);} // ★ Pass actual final score (rScore is stale)
    // ★ v34: Ruthless boss trait — random cat injured when hand doesn't clear target
    else{
      if(blind===2&&bossTraits.some(bt=>bt.fx.ruthless)){
        const allC2=[...hand,...draw,...disc];
        const eligible=allC2.filter(c=>!c.injured);
        if(eligible.length>0){
          const victim=pk(eligible);
          [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>x.id===victim.id?{...x,injured:true,injuryTimer:2,power:Math.max(1,x.power)}:x));});
          toast("💀",`${victim.name.split(" ")[0]} was injured by ${boss?.name||"the boss"}!`,"#ef4444");
        }
      }
      setPh("playing");
    }
    advancingRef.current=false; // ★ FIX: Always clear after processing
    }catch(e){console.error("advanceFromScoring error:",e);advancingRef.current=false;endRun(false,rScore);}
  }

  // ★ v38: Skip scoring animation — jump to final state
  function skipScoring(){
    if(scoringDone||!sRes||!scoreEndRef.current)return;
    if(stRef.current)clearTimeout(stRef.current);
    const end=scoreEndRef.current;
    setSStep(sRes.bd.length-1);
    setRunChips(end.chips);setRunMult(end.mult);
    setScoreShake(end.shk);setTimeout(()=>setScoreShake(0),400+end.shk*100);
    const prev=handBests[end.ht]||0;
    if(end.total>prev){setHandBests(b=>({...b,[end.ht]:end.total}));setNewBest(end.ht);}
    setAftermath(end.aft);
    setScoringDone(true);
    // ★ v47: autoPlay clearing now handled by advanceFromScoring directly
    // ★ v40: Guide step 2→3 on scoring complete
    if(!autoPlay&&guide&&guide.step===2)setTimeout(()=>setGuide(g=>g?({...g,step:3}):null),400);
  }

  const toggleS=i=>{if(ph!=="playing"||autoPlay)return;Audio.cardSelect();const s=new Set(sel);if(s.has(i))s.delete(i);else if(s.size<5)s.add(i);setSel(s);
    // ★ v40: Guide step 0→1 when player selects 2+ same-breed cats
    if(guide&&guide.step===0&&s.size>=2){
      const sc=[...s].map(j=>hand[j]).filter(Boolean);const bc={};sc.forEach(c=>{bc[c.breed]=(bc[c.breed]||0)+1;});
      if(Object.values(bc).some(v=>v>=2))setGuide(g=>({...g,step:1}));
    }
  };

  function playH(){
    if(!sel.size||hLeft<=0)return;
    if(actionLock.current)return;actionLock.current=true;
    Audio.cardPlay();
    // ★ v40: Guide step 1→2 when player plays first hand
    if(guide&&guide.step<=1)setGuide(g=>({...g,step:2}));
    setFirstHandPlayed(true);
    const cats=[...sel].map(i=>hand[i]).filter(Boolean);
    setScoringCats(cats);setAftermath([]);
    // ★ v35: beatingPace — used for Nerve gain thresholds
    const beatingPace=rScore>=eTgt()*0.4;
    const activeBT=blind===2?bossTraits:[];
    const result=calcScore(cats,fams,ferv,cfx,{gold,deckSize:allC.length,discSize:disc.length,handSize:hs(),beatingPace,bossTraitFx:activeBT,scarMult:getMB().scarMult||0,grudgeWisdom:getMB().grudgeWisdom||0,hasMastery:!!(getMB().xp),scavenge});
    setScavenge(0); // ★ Scavenge consumed on play
    advancingRef.current=false; // ★ FIX: Reset re-entry guard for new hand
    actionLock.current=false; // ★ FIX: Clear action lock
    setSRes(result);setSStep(0);setPh("scoring");
    setRunChips(0);setRunMult(0);setNewBest(null);
    // Build running totals per step + pre-compute score-at-step for threshold detection
    let rC=0,rM=0;
    const stepTotals=result.bd.map(s=>{
      rC+=s.chips||0;rM+=s.mult||0;if(s.xMult)rM=Math.round(rM*s.xMult);
      const total=Math.max(0,rC)*Math.max(1,rM);
      return{chips:Math.max(0,rC),mult:Math.max(1,rM),total};
    });
    // ★ DOPAMINE: Pre-compute which step crosses the target (for celebration)
    const curTgt=tgt-rScore; // remaining needed
    let thresholdStep=-1;
    for(let i=0;i<stepTotals.length;i++){
      if(stepTotals[i].total>=curTgt&&(i===0||stepTotals[i-1].total<curTgt)){thresholdStep=i;break;}
    }
    let step=0;const tot=result.bd.length;
    if(stRef.current)clearTimeout(stRef.current);
    // ★ v38: Pre-compute aftermath so skip can use it
    const aft=[];
    cats.forEach(c=>{
      const oldTp=c.stats.tp;const newTp=oldTp+1;
      const oldXP=getCatXP(oldTp,!!(getMB().xp));const newXP=getCatXP(newTp,!!(getMB().xp));
      if(newXP&&(!oldXP||newXP.label!==oldXP.label))aft.push({icon:"⭐",text:`${c.name.split(" ")[0]}: ${newXP.label}!`,color:newXP.color});
      if(result.total>c.stats.bs)aft.push({icon:"🏆",text:`${c.name.split(" ")[0]} PB: ${result.total.toLocaleString()}`,color:"#fbbf24"});
    });
    const bondedInHand=cats.filter(c=>c.bondedTo&&cats.find(x=>x.id===c.bondedTo));
    if(bondedInHand.length>=2)aft.push({icon:"💕",text:`${bondedInHand[0].name.split(" ")[0]} & ${bondedInHand[1].name.split(" ")[0]}: Together`,color:"#f472b6"});
    // ★ v47: First cascade plays at 1.4× speed for comprehension
    const isFirstCascade=isFirstRun&&ante===1&&blind===0&&!firstHandPlayed;
    scoreEndRef.current={chips:result.chips,mult:result.mult,total:result.total,ht:result.ht,aft,shk:getShakeIntensity(result.total),isFirstCascade,stepTotals:stepTotals.map(s=>s.total)};
    // ★ v38: Pre-compute score-at-each-step for jump detection
    // ★ v46: stepScores removed — S-curve timing uses step type, not % jumps
    function getStepDelay(s,total){
      // ★ DOPAMINE: Redesigned timing for collapsed cascade (fewer steps = more weight per step)
      const slowMult=isFirstCascade?1.4:meta&&meta.stats.r>=3?0.7:1;
      const tempo=Math.max(0.5, Math.min(1.4, 7/total)); // slightly slower per-step since fewer steps
      const step=result.bd[s];
      const isLast=s===total-1;
      const isPenult=s===total-2;
      const isNeg=step&&(step.mult<0||step.type==="curse"||step.type==="grudge_tension");
      const hasX=step&&!!step.xMult;
      const isNerve=step&&step.type==="nerve";
      const isBond=step&&(step.type==="bond"||step.type==="lineage");
      const isBigCat=step&&step.isBigCat;
      const isThreshold=s===thresholdStep;

      // Negative steps: still fast
      if(isNeg) return Math.round(150*tempo*slowMult);

      // ★ DOPAMINE: Threshold crossing step gets extra freeze-frame (THE moment)
      if(isThreshold&&!hasX) return Math.round(Math.max(500, 650*Math.max(0.7,tempo))*slowMult);

      // xMult freeze-frame: THE moment
      if(hasX) return Math.round(Math.max(520, 720*Math.max(0.7,tempo))*slowMult);

      // Nerve climax
      if(isNerve) return Math.round(Math.max(420, 620*Math.max(0.7,tempo))*slowMult);

      // Bond/lineage: warm moment
      if(isBond) return Math.round(Math.max(320, 470*tempo)*slowMult);

      // Penultimate: anticipation
      if(isPenult) return Math.round(Math.max(370, 520*tempo)*slowMult);

      // Last step: the reveal
      if(isLast) return Math.round(Math.max(470, 670*tempo)*slowMult);

      // First step (hand type): establish
      if(s===0) return Math.round(550*tempo*slowMult);

      // ★ DOPAMINE: Big cat (loaded with traits/scars) gets more weight
      if(isBigCat) return Math.round(Math.max(300, 420*tempo)*slowMult);

      // Second step: building
      if(s===1) return Math.round(420*tempo*slowMult);

      // Third: still building
      if(s<=3) return Math.round(350*tempo*slowMult);

      // Everything else: cascade flow
      const cascade=Math.max(70, Math.round((200-s*5)*tempo));
      return Math.round(cascade*slowMult);
    }
    function animStep(){
      step++;
      if(step<tot){
        setSStep(step);setRunChips(stepTotals[step].chips);setRunMult(stepTotals[step].mult);
        // ★ DOPAMINE: Calculate progress toward target for ascending pitch
        const progress=curTgt>0?stepTotals[step].total/curTgt:0;
        const prevTotal=step>0?stepTotals[step-1].total:0;
        const jumpPct=prevTotal>0?(stepTotals[step].total-prevTotal)/prevTotal:0;

        // ★ DOPAMINE: THRESHOLD CROSSING — the casino moment
        if(step===thresholdStep){
          Audio.thresholdCross();
          setScoreShake(3);
          setScoringFlash("#4ade80");
          setTimeout(()=>{setScoreShake(0);setScoringFlash(null);},350);
        }

        // ★ DOPAMINE: Sound per step type with ascending pitch
        const s=result.bd[step];
        if(s){
          if(s.xMult){Audio.xMultSlam(s.xMult);setScoreShake(Math.ceil(s.xMult));setTimeout(()=>setScoreShake(0),300);setScoringFlash(s.xMult>=1.5?"#fef08a":"#fbbf24");setTimeout(()=>setScoringFlash(null),150);}
          else if(s.type==="grudge_tension")Audio.grudgeTense();
          else if(s.type==="grudge_prove")Audio.grudgeProve();
          else if(s.type==="bond"||s.type==="lineage")Audio.bondChime();
          else if(s.isBigCat)Audio.bigCatHit(progress); // loaded cat gets a beefier sound
          else if(s.mult>0)Audio.multHit(s.mult,progress);
          else if(s.chips>0)Audio.chipUp(s.chips,progress);
        }
        stRef.current=setTimeout(animStep,getStepDelay(step,tot));
      }
      else{
        const end=scoreEndRef.current;
        setRunChips(end.chips);setRunMult(end.mult);
        setScoreShake(end.shk);setTimeout(()=>setScoreShake(0),400+end.shk*100);
        const prev=handBests[end.ht]||0;
        if(end.total>prev){setHandBests(b=>({...b,[end.ht]:end.total}));setNewBest(end.ht);}
        setAftermath(end.aft);
        setScoringDone(true);
        // ★ v47: autoPlay clearing now handled by advanceFromScoring directly
        // ★ v40: Guide step 2→3 on scoring complete
        if(!autoPlay&&guide&&guide.step===2)setTimeout(()=>setGuide(g=>g?({...g,step:3}):null),400);
        // ★ v39: Tier reveal sound
        const tier=getScoreTier(end.total);
        if(tier&&tier.label)Audio.tierReveal(Math.min(5,Math.floor(end.total/5000)));
      }
    }
    // ★ v39: Hand type reveal sound
    Audio.handType(Math.min(3,Math.floor((HT.findIndex(h=>h.name===result.ht)||0)/3)));
    stRef.current=setTimeout(animStep,getStepDelay(0,tot));
  }

  function discardH(){
    if(!sel.size||dLeft<=0||cfx.noDisc)return;
    if(actionLock.current)return;actionLock.current=true;requestAnimationFrame(()=>{actionLock.current=false;});
    const d=[...sel].map(i=>hand[i]).filter(Boolean);const rem=hand.filter((_,i)=>!sel.has(i));
    // ★ v49: Accumulate side-effects first, then do one state update pass
    let extraDraw=[];let healIds=[];let powerUps={};let nerveDelta=0;let goldDelta=0;let handDelta=0;let discDelta=0;
    d.forEach(cat=>{
      if(catHas(cat,"Scrapper")){nerveDelta++;toast("🥊","Scrapper tossed: +1 Nerve","#fb923c");}
      else if(catHas(cat,"Provider")){goldDelta++;toast("🍀","Provider tossed: +1🐟","#4ade80");}
      else if(catHas(cat,"Hefty")){handDelta++;toast("💪","Hefty tossed: +1 Hand","#3b82f6");}
      else if(catHas(cat,"Cursed")){nerveDelta++;toast("💀","Cursed purged: +1 Nerve","#d97706");}
      else if(catHas(cat,"Swift")){discDelta++;toast("🪶","Swift tossed: +1 Discard","#67e8f9");}
      else if(catHas(cat,"Nocturnal")){nerveDelta+=2;toast("🌙","Nocturnal tossed: +2 Nerve","#c084fc");}
      else if(catHas(cat,"Devoted")&&cat.bondedTo){
        powerUps[cat.bondedTo]=(powerUps[cat.bondedTo]||0)+1;
        toast("🫀","Devoted tossed: mate gains 1 power","#f472b6");
      }
      else if(catHas(cat,"Feral")){extraDraw.push(gC({trait:PLAIN}));toast("🐾","Feral tossed: stray joins","#888");}
      else if(catHas(cat,"Seer")){
        const peek=draw.slice(0,3).map(c=>c.name.split(" ")[0]).join(", ");
        toast("🔮",peek?`Next: ${peek}`:"Draw pile empty","#c084fc");
      }
      else if(catHas(cat,"Guardian")){
        const healTarget=[...rem,...draw,...disc].find(c=>c.injured&&!healIds.includes(c.id));
        if(healTarget){
          healIds.push(healTarget.id);
          toast("🛡️",`Guardian healed ${healTarget.name.split(" ")[0]}`,"#4ade80");
        }else{toast("🛡️","Guardian tossed: no injured to heal","#888");}
      }
    });
    // ★ Scavenge: discarded cats' power×2 becomes bonus chips on next played hand
    const scavPow=d.reduce((s,c)=>s+(c.injured?Math.floor(c.power/2):c.power),0)*2;
    if(scavPow>0){setScavenge(v=>v+scavPow);toast("🔧",`Scavenged +${scavPow}C from discards`,"#67e8f9");}
    // Apply power-ups and heals to all piles
    const applyMods=arr=>arr.map(c=>{
      let nc={...c};
      if(powerUps[c.id])nc.power=Math.min(15,nc.power+powerUps[c.id]);
      if(healIds.includes(c.id)){nc.injured=false;nc.injuryTimer=0;}
      return nc;
    });
    // ★ FIX: Build final piles in one pass. Discarded cats go to discard, extra cats added to draw.
    const nDisc=[...disc,...d];
    const nDraw=[...draw,...extraDraw];
    const target=hs();const need=target-rem.length;
    if(need>0){
      const{drawn,nd,ndi}=drawN(applyMods(nDraw),applyMods(nDisc),need);
      setHand(applyMods([...rem,...drawn]));setDraw(nd);setDisc(ndi);
    }else{
      setHand(applyMods(rem));setDraw(applyMods(nDraw));setDisc(applyMods(nDisc));
    }
    setSel(new Set());setDLeft(v=>v-1);
    if(nerveDelta>0)setFerv(f=>Math.min(9,f+nerveDelta));
    if(goldDelta>0)setGold(g=>g+goldDelta);
    if(handDelta>0)setHLeft(h=>h+handDelta);
    if(discDelta>0)setDLeft(v=>v+discDelta);
    if(ferv>0){setPFerv(ferv);setFerv(f=>Math.max(0,f-1));setFFlash("down");setTimeout(()=>setFFlash(null),600);}
  }

  // v37: Ward actives removed — wards are passive only

  function showOF(fs,tgt,uh){
    const excess=Math.max(0,fs-tgt);
    const hB=uh*Math.round(tgt*.10);
    const gR=cfx.famine?0:(blind>=2?4+ante:2+blind);
    // ★ v34 ECON: Excess score → rations (rewards overkill). 1🐟 per 200% of target, cap 3🐟.
    const excessGold=tgt>0?Math.min(3,Math.floor(excess/(tgt*2))):0;
    const interest=Math.min(5,Math.floor(gold/5));
    // v37: Gold uncapped. No surplus/providence.
    setGold(gold+gR+interest+excessGold);
    setOData({excess,uh,hB,gR,fs,tgt,interest,excessGold});setPh("overflow");
  }

  function endRun(won,finalScore){
    try{
    try{clearRunSave();}catch(e){}
    const fScore=finalScore!=null?finalScore:rScore;
    const bName=["Dusk","Midnight",(boss?.name)||"The Boss"][blind]||"Unknown";
    setHearthPair(won?[]:null); // ★ v48: Only winners save cats to the Hearth
    if(won){setPh("victory");try{Audio.victory();}catch(e){}}
    else{
      try{Audio.defeat();}catch(e){}
      const defeatLines=[
        "Not loud enough. The dark moved on.",
        "Below the threshold. The silence swallowed them whole.",
        "They needed more time. They always need more time.",
        "The last hand fell short. The dark didn't even notice.",
        "Not enough. The number doesn't care about the story behind it.",
        "They fell below the threshold. And the dark forgot they were there.",
      ];
      const tgtVal=(()=>{try{return eTgt();}catch(e){return 0;}})();
      setDefeatData({score:fScore,target:tgtVal,line:pk(defeatLines),blind:bName});
      setPh("defeat");
    }
    // ★ Fire-and-forget async meta save — phase is already set
    if(meta){(async()=>{try{
      const newHeat=won?Math.min(5,(meta.heat||0)+1):0;
      const deathless=won&&fallen.length===0;
      const curHeat=meta.heat||0;
      const relics=[...(meta.relics||[])];
      if(won&&curHeat>=1&&!relics.includes(curHeat)){
        relics.push(curHeat);
        const relic=HEAT_RELICS[curHeat];
        if(relic)toast(relic.icon,`RELIC: ${relic.name}. ${relic.desc}`,"#fbbf24");
      }
      const ninthDawnCleared=(isNinthDawn&&won)?true:(meta.ninthDawnCleared||false);
      const u={...meta,heat:newHeat,ninthDawnCleared,relics,
        stats:{...meta.stats,r:meta.stats.r+1,w:meta.stats.w+(won?1:0),ba:Math.max(meta.stats.ba,ante),hs:Math.max(meta.stats.hs,fScore),mf:Math.max(meta.stats.mf,rMaxF)}};
      const newAchv=[...(u.achv||[])];
      ACHIEVEMENTS.forEach(a=>{if(!newAchv.includes(a.id)&&a.check(u.stats,deathless))newAchv.push(a.id);});
      u.achv=newAchv;
      setMeta(u);
      try{await saveS(u);}catch(e){console.warn("Save failed:",e);}
      const prevUl=getUnlocks(meta);
      const newUl=getUnlocks(u);
      const unlockMsgs=[];
      if(!prevUl.fams&&newUl.fams)unlockMsgs.push("🛡️ Wards unlocked in the Market!");
      setNewUnlocks(unlockMsgs);
    }catch(e){console.warn("Post-run save error:",e);}})();}
    }catch(e){console.error("endRun crashed:",e);setPh("defeat");setDefeatData({score:finalScore||rScore||0,target:0,line:"Something went wrong.",blind:"?"});}
  }

  async function saveCatM(cat){if(!meta)return;
    // ★ v46: Check if cat has lineage (parent or child in current colony)
    const allC=[...hand,...draw,...disc];
    const hasKids=allC.some(c=>c.parentIds?.includes(cat.id));
    const hasParents=cat.parentIds?.some(pid=>allC.some(c=>c.id===pid));
    const ser={breed:cat.breed,power:cat.power,sex:cat.sex||"M",
      trait:{name:(cat.trait||PLAIN).name,icon:(cat.trait||PLAIN).icon,desc:(cat.trait||PLAIN).desc,tier:(cat.trait||PLAIN).tier},
      name:cat.name,parentBreeds:cat.parentBreeds,parentIds:cat.parentIds||null,
      bonded:!!cat.bondedTo,scarred:!!cat.scarred,
      lineage:!!(hasKids||hasParents),
      stats:{...cat.stats},savedAt:Date.now(),fromAnte:ante};
    const newPair=[...hearthPair,ser];
    if(newPair.length>=2){
      // ★ v46: Link as pair for descendant drafting
      const pairId=Date.now();
      newPair[0].pairId=pairId;newPair[1].pairId=pairId;
      const d1=`${newPair[0].breed}-${(newPair[0].trait||PLAIN).name}`,d2=`${newPair[1].breed}-${(newPair[1].trait||PLAIN).name}`;
      const newDisc=[...meta.stats.disc];
      if(!newDisc.includes(d1))newDisc.push(d1);if(!newDisc.includes(d2))newDisc.push(d2);
      const u={...meta,cats:[...meta.cats,...newPair],stats:{...meta.stats,disc:newDisc}};
      setMeta(u);await saveS(u);setHearthPair(null); // null = done
    }else{
      setHearthPair(newPair); // one picked, need the other sex
    }
  }

  function nextBlind(){
    const nb=blind>=2?0:blind+1,na=blind>=2?ante+1:ante;
    if(blind>=2&&ante>=MX){endRun(true);return;}
    setBlind(nb);setAnte(na);setRScore(0);
    const mb=getMB();const hfx2=getHeatFx(meta?.heat);setHLeft(4+mb.hands+runBonus.hands+tempMods.hands+(hfx2.handMod||0));setDLeft(3+mb.discards+tempMods.discs+(hfx2.discMod||0));setTempMods({hands:0,discs:0});
    if(nb===0){
      setBoss(BOSSES[Math.min(na,BOSSES.length)-1]||BOSSES[0]);
      // ★ v34: After 3 wins, shuffle in expanded bosses for variety
      if(wins>=3&&!isNinthDawn){
        const pool=FULL_BOSS_POOL.filter(b=>b.name!==boss?.name); // avoid same boss twice
        setBoss(pk(pool)||BOSSES[Math.min(na,BOSSES.length)-1]);
      }
      // ★ v34: Pick boss traits based on night/heat
      setBossTraits(pickBossTraits(na,meta?.heat,isNinthDawn));
      // ★ v34: In Ninth Dawn Night 5, face The Remembering
      if(isNinthDawn&&na>=5){setBoss(THE_REMEMBERING);}
      setFirstHandPlayed(false);
      // ★ v32.5: Nightly nerve decay — "The dark wears you down."
      if(na>1){setFerv(f=>Math.max(0,f-1));}
      if(na>ante){
        // v10: Ante transition
        setAnteUp({from:ante,to:na,target:Math.round(getTarget(na,0,isFirstRun))});
        logEvent("night",{from:ante,to:na});
      }
    }
    if(nb===2){const hfxC=getHeatFx(meta?.heat);const c=genCurses(na,hfxC.extraCurse||0);setCurses(c);const fx=buildCfx(c);setCfx(fx);
      // Famine: no foraging + lose stored interest
      if(fx.famine)setGold(g=>Math.max(0,g-Math.min(5,Math.floor(g/5)))); // lose interest
    }
    else{setCurses([]);setCfx({});}
    // ★ v32: Injury healing — injuries heal after 2 rounds. Scrappers heal in 1.
    [setHand,setDraw,setDisc].forEach(setter=>{
      setter(arr=>arr.map(c=>{
        if(!c.injured)return c;
        const timer=(c.injuryTimer||2)-1;
        const fastHeal=catHas(c,"Scrapper");
        if(timer<=0||fastHeal){return{...c,injured:false,injuryTimer:0};}
        return{...c,injuryTimer:timer};
      }));
    });
    const all=shuf([...hand,...draw,...disc]);
    setHand(all.slice(0,BH));setDraw(all.slice(BH));setDisc([]);
    setSel(new Set());setSellMode(false);
    if(nb===2){setPh("bossIntro");Audio.bossIntro();}
    else{setNightCard({ante:na,blind:nb});setPh("nightCard");}
  }

  function genShop(){
    // ★ v34 ECON: Prices scale with ante. Negative cats 3🐟. Reroll scales.
    const hfxS=getHeatFx(meta?.heat);const catPrice=(a,c)=>((c.trait||PLAIN).tier==="rare_neg"?3:(c.trait||PLAIN).tier==="mythic"?8+a:(c.trait||PLAIN).tier==="legendary"?6+a:4+a)+(hfxS.shopCost||0);
    const nc=2;const sc=[];
    for(let i=0;i<nc;i++){
      // ★ v30: First cat is the "featured" item — always has a trait. Rest are Plain.
      const c=gC(i===0?{trait:pickTrait(ante>=3)}:{trait:PLAIN});
      c._price=catPrice(ante,c);sc.push(c);
    }
    setSCats(sc);
    const ul=getUnlocks(meta);
    // ★ v36: Starter wards — first-timers get a curated pick from simple, breed-agnostic wards
    const STARTER_WARD_IDS=["f5","f6","f8"]; // Golden Yarn, Moonstone, Witch's Bell
    if(isFirstRun&&ante===1&&blind===0){
      // First shop ever — offer 2 starter wards at discounted price (2🐟)
      const starters=shuf(FAMS.filter(f=>STARTER_WARD_IDS.includes(f.id)&&!fams.find(o=>o.id===f.id)))
        .slice(0,2).map(w=>({...w,_starter:true})); // ★ v36 fix: clone, don't mutate FAMS constant
      setSFams(starters);
    }else{
      setSFams(ul.fams?shuf(FAMS.filter(f=>!fams.find(o=>o.id===f.id))).slice(0,2):[]);
    }
    setSellMode(false);setSellsLeft(2);setDen([]);setRerollCount(0);setShopTab("cats");
  }

  // ★ v36: Starter wards cost 2🐟, normal wards cost 5+ante/2
  const famPrice=(f)=>f?._starter?2:(5+Math.floor(ante/2)+(getHeatFx(meta?.heat).shopCost||0));
  function buyCat(i){const p=sCats[i]._price||3;if(gold<p)return;Audio.buy();setGold(g=>g-p);const c={...sCats[i]};delete c._price;setDraw(d=>[...d,c]);setSCats(s=>s.filter((_,j)=>j!==i));logEvent("buy",{name:c.name,breed:c.breed,cost:p});toast(BREEDS[c.breed].icon,`${c.name.split(" ")[0]} joined the colony`,BREEDS[c.breed].color);}
  function buyFam(i){const f=sFams[i];const fp=famPrice(f);if(gold<fp||fams.length>=MF)return;Audio.buy();setGold(g=>g-fp);const clean={...f};delete clean._starter;setFams(fs=>[...fs,clean]);setSFams(s=>s.filter((_,j)=>j!==i));toast(f.icon,`${f.name} watches over you`,"#fbbf24");}
  // ★ v36: Potions removed — ward actives replace them

  // ★ v34 ECON: Reroll scales with ante (prevents trivial late-game rerolling)
  // ★ v35: Reroll escalates per use within a shop visit (base + ante + rerollCount)
  function reroll(){const rc=2+ante+rerollCount;if(gold<rc)return;setGold(g=>g-rc);setRerollCount(c=>c+1);genShop();}

  // ★ v35: THE LETTING GO — releasing a cat is an act of mercy
  function getPartingGifts(cat){
    const gifts=[];let goldVal=1;let narr="";
    const isNeg=(cat.trait||PLAIN).tier==="rare_neg"||(cat.extraTraits||[]).some(t=>t.tier==="rare_neg");
    if(isNeg){return{goldVal:0,gifts,narr:`${cat.name.split(" ")[0]} slipped away before dawn. No one stopped them.`};}
    // Scarred → +2G, +1 Nerve (they earned more than coin)
    if(cat.scarred){goldVal+=1;gifts.push("+1 Nerve");narr=`${cat.name.split(" ")[0]} walked different after the scar. Heavier. But they walked.`;}
    // High power → weakest cat +1P
    if(cat.power>=8){gifts.push("Weakest gains power");if(!narr)narr=`${cat.name.split(" ")[0]} was the strongest. Now someone else has to be.`;}
    // Bonded → partner gains +2P + story
    if(cat.bondedTo){gifts.push("Partner gains power");if(!narr)narr=`The one who stayed didn't eat for two days.`;}
    if(!narr)narr=`${cat.name.split(" ")[0]} left before sunrise.${gifts.length>0?" They left something behind.":""}`;
    return{goldVal,gifts,narr};
  }
  function sellCat(cat){
    if(allC.length<=8||sellsLeft<=0)return;
    const pg=getPartingGifts(cat);
    if(pg.goldVal<0&&gold<Math.abs(pg.goldVal))return;
    // Apply gold
    setGold(g=>g+pg.goldVal);
    setSellsLeft(s=>s-1);
    // Remove from all piles
    setHand(h=>h.filter(c=>c.id!==cat.id));setDraw(d=>d.filter(c=>c.id!==cat.id));setDisc(di=>di.filter(c=>c.id!==cat.id));
    // ★ v35: Scarred release gives +1 Nerve
    if(cat.scarred)setFerv(f=>Math.min(9,f+1));
    // ★ v35: Bonded partner gains +2P + story entry
    if(cat.bondedTo){
      [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(c=>{
        if(c.id===cat.bondedTo)return{...c,power:Math.min(15,c.power+2),bondedTo:null,story:[...(c.story||[]),`Watched ${cat.name.split(" ")[0]} go`]};
        return c;
      }));});
    }
    // ★ v35: Power 8+ release — weakest cat gains +1P
    if(cat.power>=8){
      const uAll2=[...hand,...draw,...disc].filter(c=>c.id!==cat.id);
      if(uAll2.length>0){
        const weakest=uAll2.reduce((a,b)=>a.power<=b.power?a:b);
        [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(c=>c.id===weakest.id?{...c,power:Math.min(15,c.power+1)}:c));});
      }
    }
    // Toast + narration
    const giftStr=pg.gifts.length>0?` (${pg.gifts.join(", ")})`:"";
    toast("🕊️",`${cat.name.split(" ")[0]} released${giftStr}`,pg.goldVal>=0?"#c084fc":"#ef4444");
  }
  function sellFam(f){setGold(g=>g+3);setFams(fs=>fs.filter(x=>x.id!==f.id));}
  // ★ v44: DEN SYSTEM FLIPPED — all cats enter the den, player ISOLATES up to 3 to protect
  // ★ v46: Shelter starts at 2. Deeper Burrow (+1), Nesting Ward (+1), events (+1 temp)
  const shelterFromWards=fams.filter(f=>f.passive&&f.eff).reduce((s,f)=>{const fx=f.eff([]);return s+(fx.shelter||0);},0);
  const MAX_ISOLATE=2+(getMB().shelter||0)+shelterFromWards+(eventDenBonus||0);
  const toggleDen=c=>{if(den.find(d=>d.id===c.id))setDen(d=>d.filter(x=>x.id!==c.id));else if(den.length<MAX_ISOLATE)setDen(d=>[...d,c]);};
  function endNight(){
    const dAll=[...hand,...draw,...disc];
    // ★ v46: Shelter = breeding grounds. Wilds = everything else.
    const shelterCats=den.filter(c=>!c.injured); // sheltered cats can breed (injured can't)
    const wildCats=dAll.filter(c=>!den.find(d=>d.id===c.id)); // ★ v48: ALL unsheltered cats face the wilds. injured included
    if(shelterCats.length<2&&wildCats.length<2){nextBlind();return;}
    setDenNews([]);
    const hasMM=false;
    const heatFight=getHeatFx(meta?.heat).denFight||0;
    const baseCtx={draftRejects,deckSize:dAll.length,nerveLvl:ferv};
    // Pass 1: Shelter — breed/bond/reconcile only (calm, safe, +15% breed bonus)
    const shelterResults=shelterCats.length>=2?resolveDen(shelterCats,hasMM,true,0,{...baseCtx,breedOnly:true}):[];
    shelterResults.forEach(r=>r.source="shelter");
    // Pass 2: Wilds — fights, training, growth, mentoring, grudges — no breeding
    const wildResults=wildCats.length>=2?resolveDen(wildCats,hasMM,eventDenSafe,heatFight,{...baseCtx,noBreed:true}):[];
    wildResults.forEach(r=>r.source="wilds");
    const results=[...shelterResults,...wildResults];
    setEventDenSafe(false);setEventDenBonus(0);
    if(!firstDenUsed)setFirstDenUsed(true);
    // Apply results to deck
    results.forEach(r=>{
      if(r.type==="breed"){
        setDraw(d=>[...d,r.baby]);
        if(r.twins){const twin=breedC(r.c1,r.c2);setDraw(d=>[...d,twin]);r.twin2=twin;}
        // Update bonded status on the actual deck cats + clear orphan bonds
        [setHand,setDraw,setDisc].forEach(setter=>{
          setter(arr=>arr.map(c=>{
            if(c.id===r.c1.id)return{...c,bondedTo:r.c2.id};
            if(c.id===r.c2.id)return{...c,bondedTo:r.c1.id};
            // ★ v34: Clear orphan bond — if cat was bonded to c1 or c2 before, their partner changed
            if(c.bondedTo===r.c1.id||c.bondedTo===r.c2.id)return{...c,bondedTo:null};
            return c;
          }));
        });
      }else if(r.type==="death"){
        // Remove dead cat from deck
        setHand(h=>h.filter(c=>c.id!==r.victim.id));
        setDraw(d=>d.filter(c=>c.id!==r.victim.id));
        setDisc(di=>di.filter(c=>c.id!==r.victim.id));
      }else if(r.type==="fight"){
        // Apply scarred/power loss to actual deck cats + ★ v31: set grudge on BOTH fighters
        const winnerId=r.c1.id===r.loser.id?r.c2.id:r.c1.id;
        [setHand,setDraw,setDisc].forEach(setter=>{
          setter(arr=>arr.map(c=>{
            if(c.id===r.loser.id){
              // ★ v35: Relic 2 (Old Scars) — what doesn't kill them makes them stronger
              const scarPow=hasRelic(2)?Math.min(15,r.loser.power+1):r.loser.power;
              return{...c,power:scarPow,scarred:true,injured:r.wasInjured||c.injured,injuryTimer:(r.wasInjured||c.injured)?2:c.injuryTimer,grudgedWith:[...(c.grudgedWith||[]).filter(id=>id!==winnerId),winnerId]};
            }
            if(c.id===winnerId)return{...c,grudgedWith:[...(c.grudgedWith||[]).filter(id=>id!==r.loser.id),r.loser.id]};
            return c;
          }));
        });
      }
    });
    // Apply positive den events (including mentoring)
    results.forEach(r=>{
      if(r.type==="mentor"){
        [setHand,setDraw,setDisc].forEach(setter=>{
          setter(arr=>arr.map(x=>x.id===r.young.id?{...x,power:r.young.power}:x));
        });
      }
      if(r.type==="found")setGold(g=>g+r.gold);
      if(r.type==="growth"){
        [setHand,setDraw,setDisc].forEach(setter=>{
          setter(arr=>arr.map(x=>x.id===r.cat.id?{...x,power:r.cat.power}:x));
        });
      }
      if(r.type==="wanderer")setDraw(d=>[...d,r.cat]);
    });
    results.forEach(r=>{
      if(r.type==="training"){
        // Both cats gain power from sparring
        [setHand,setDraw,setDisc].forEach(setter=>{
          setter(arr=>arr.map(c=>{
            if(c.id===r.c1.id)return{...c,power:r.c1.power};
            if(c.id===r.c2.id)return{...c,power:r.c2.power};
            return c;
          }));
        });
        logEvent("training",{c1:r.c1.name.split(" ")[0],c2:r.c2.name.split(" ")[0]});
      }
      if(r.type==="grudge"){
        // ★ v31: Set grudge on both cats in all state arrays
        [setHand,setDraw,setDisc].forEach(setter=>{
          setter(arr=>arr.map(c=>{
            if(c.id===r.c1.id)return{...c,grudgedWith:[...(c.grudgedWith||[]).filter(id=>id!==r.c2.id),r.c2.id]};
            if(c.id===r.c2.id)return{...c,grudgedWith:[...(c.grudgedWith||[]).filter(id=>id!==r.c1.id),r.c1.id]};
            return c;
          }));
        });
        logEvent("grudge",{c1:r.c1.name.split(" ")[0],c2:r.c2.name.split(" ")[0]});
      }
      if(r.type==="reconcile"||r.type==="reconcile_bond"){
        [setHand,setDraw,setDisc].forEach(setter=>{
          setter(arr=>arr.map(c=>{
            if(c.id===r.c1.id)return{...c,grudgedWith:(c.grudgedWith||[]).filter(id=>id!==r.c2.id),...(r.type==="reconcile_bond"?{bondedTo:r.c2.id}:{})};
            if(c.id===r.c2.id)return{...c,grudgedWith:(c.grudgedWith||[]).filter(id=>id!==r.c1.id),...(r.type==="reconcile_bond"?{bondedTo:r.c1.id}:{})};
            // ★ v34: Clear orphan bonds
            if(r.type==="reconcile_bond"&&(c.bondedTo===r.c1.id||c.bondedTo===r.c2.id))return{...c,bondedTo:null};
            return c;
          }));
        });
        logEvent("reconcile",{c1:r.c1.name.split(" ")[0],c2:r.c2.name.split(" ")[0],bonded:r.type==="reconcile_bond"});
      }
      if(r.type==="bond"){
        [setHand,setDraw,setDisc].forEach(setter=>{
          setter(arr=>arr.map(c=>{
            if(c.id===r.c1.id)return{...c,bondedTo:r.c2.id};
            if(c.id===r.c2.id)return{...c,bondedTo:r.c1.id};
            // ★ v34: Clear orphan bonds
            if(c.bondedTo===r.c1.id||c.bondedTo===r.c2.id)return{...c,bondedTo:null};
            return c;
          }));
        });
        logEvent("bond",{c1:r.c1.name.split(" ")[0],c2:r.c2.name.split(" ")[0]});
      }
      if(r.type==="breed")logEvent("breed",{parents:r.c1.name.split(" ")[0]+" & "+r.c2.name.split(" ")[0],baby:r.baby.name,breed:r.baby.breed});
      if(r.type==="fight")logEvent("fight",{loser:r.loser.name.split(" ")[0],dmg:r.dmg});
      if(r.type==="death"){logEvent("death",{victim:r.victim.name});setFallen(f=>[...f,{name:r.victim.name,breed:r.victim.breed,night:ante}]);}
      if(r.type==="mentor")logEvent("mentor",{elder:r.elder.name.split(" ")[0],young:r.young.name.split(" ")[0]});
      if(r.type==="found")logEvent("found",{cat:r.cat.name.split(" ")[0],gold:r.gold});
      if(r.type==="growth")logEvent("growth",{cat:r.cat.name.split(" ")[0]});
      if(r.type==="wanderer")logEvent("wanderer",{cat:r.cat.name});
      if(r.traitGained)logEvent("trait",{cat:r.traitGained.cat.name,trait:r.traitGained.trait.name});
      if(r.type==="phoenix"){
        logEvent("phoenix",{risen:r.risen.name});
        // Update the cat in deck to Eternal P1
        [setHand,setDraw,setDisc].forEach(setter=>{
          setter(arr=>arr.map(c=>c.id===r.risen.id?{...c,power:1,scarred:true,trait:TRAITS.find(t=>t.name==="Eternal")}:c));
        });
      }
      // ★ v46: Parent teaches child trait in shelter
      if(r.type==="teach"){
        logEvent("teach",{parent:r.parent.name,child:r.child.name,trait:r.trait.name});
        [setHand,setDraw,setDisc].forEach(setter=>{
          setter(arr=>arr.map(c=>c.id===r.child.id?{...c,trait:r.child.trait,extraTraits:[...(r.child.extraTraits||[])],story:[...(c.story||[]).slice(-3),`Learned ${r.trait.icon}${r.trait.name} from ${r.parent.name.split(" ")[0]}`]}:c));
        });
      }
    });
    // v14: Build den news for play screen
    const news=results.map(r=>{
      if(r.type==="breed")return{icon:"🐣",text:`${r.baby.name.split(" ")[0]} born`,color:"#4ade80"};
      if(r.type==="fight")return{icon:"🩹",text:`${r.loser.name.split(" ")[0]} scarred`,color:"#ef4444"};
      if(r.type==="death")return{icon:"💀",text:`${r.victim.name.split(" ")[0]} lost`,color:"#ef4444"};
      if(r.type==="phoenix")return{icon:"🔥",text:`${r.risen.name.split(" ")[0]} rose`,color:"#fbbf24"};
      if(r.type==="mentor")return{icon:"📖",text:`${r.elder.name.split(" ")[0]} taught ${r.young.name.split(" ")[0]}`,color:"#c084fc"};
      if(r.type==="found")return{icon:"🐟",text:`${r.cat.name.split(" ")[0]} found rations`,color:"#fbbf24"};
      if(r.type==="growth")return{icon:"⭐",text:`${r.cat.name.split(" ")[0]} grew stronger`,color:"#4ade80"};
      if(r.type==="wanderer")return{icon:"🐱",text:`${r.cat.name.split(" ")[0]} joined`,color:"#67e8f9"};
      if(r.type==="bond")return{icon:"💕",text:`${r.c1.name.split(" ")[0]}+${r.c2.name.split(" ")[0]} bonded`,color:"#f472b6"};
      if(r.type==="training")return{icon:"⚔️",text:`${r.c1.name.split(" ")[0]}+${r.c2.name.split(" ")[0]} trained`,color:"#60a5fa"};
      if(r.type==="grudge")return{icon:"⚡",text:`${r.c1.name.split(" ")[0]} vs ${r.c2.name.split(" ")[0]} grudge`,color:"#fb923c"};
      if(r.type==="reconcile")return{icon:"🕊️",text:`${r.c1.name.split(" ")[0]}+${r.c2.name.split(" ")[0]} made peace`,color:"#67e8f9"};
      if(r.type==="reconcile_bond")return{icon:"💕",text:`${r.c1.name.split(" ")[0]}+${r.c2.name.split(" ")[0]} forgave & bonded`,color:"#f472b6"};
      if(r.type==="teach")return{icon:"👪",text:`${r.parent.name.split(" ")[0]} taught ${r.child.name.split(" ")[0]} ${r.trait.icon}${r.trait.name}`,color:"#34d399"};
      return null;
    }).filter(Boolean);
    setDenNews(news);
    // ★ v33: Add story moments to cats — makes them memorable
    results.forEach(r=>{
      const addStory=(catId,moment)=>{[setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(c=>c.id===catId?{...c,story:[...(c.story||[]).slice(-3),moment]}:c));});};
      if(r.type==="breed"){addStory(r.c1.id,`Parent (N${ante})`);addStory(r.c2.id,`Parent (N${ante})`);addStory(r.baby.id,`Born N${ante}`);}
      if(r.type==="fight"){addStory(r.loser.id,`Scarred N${ante}`);const w=r.c1.id===r.loser.id?r.c2:r.c1;addStory(w.id,`Won fight N${ante}`);}
      if(r.type==="death"){/* victim removed */}
      if(r.type==="bond"){addStory(r.c1.id,`Bonded N${ante}`);addStory(r.c2.id,`Bonded N${ante}`);}
      if(r.type==="reconcile"||r.type==="reconcile_bond"){addStory(r.c1.id,`Made peace N${ante}`);addStory(r.c2.id,`Made peace N${ante}`);}
      if(r.type==="mentor"){addStory(r.young.id,`Mentored by ${r.elder.name.split(" ")[0]}`);}
      if(r.type==="phoenix"){addStory(r.risen.id,`Rose from ashes N${ante}`);}
      if(r.type==="teach"){addStory(r.child.id,`Learned ${r.trait.name} from ${r.parent.name.split(" ")[0]}`);}
    });
    // ★ v27+v46: Post-process trait gains from den events — expanded paths
    results.forEach(r=>{
      let target=null,trait=null,chance=0;
      if(r.type==="fight"&&!r.wasInjured){target=r.loser;trait=TRAITS.find(t=>t.name==="Scrapper");chance=0.35;}
      if(r.type==="mentor"){target=r.young;trait=pk(COMMON_TRAITS);chance=0.3;}
      if(r.type==="training"){target=Math.random()<0.5?r.c1:r.c2;trait=pk(COMMON_TRAITS);chance=0.30;}
      if(r.type==="growth"){target=r.cat;trait=pk(COMMON_TRAITS);chance=0.2;}
      // ★ v46: New trait paths — den relationships forge character
      if(r.type==="bond"){target=Math.random()<0.5?r.c1:r.c2;trait=TRAITS.find(t=>t.name==="Devoted");chance=0.20;}
      if(r.type==="breed"){target=Math.random()<0.5?r.c1:r.c2;trait=TRAITS.find(t=>t.name==="Hefty");chance=0.15;}
      if(r.type==="reconcile"){target=Math.random()<0.5?r.c1:r.c2;trait=TRAITS.find(t=>t.name==="Wild");chance=0.20;}
      if(r.type==="reconcile_bond"){target=Math.random()<0.5?r.c1:r.c2;trait=TRAITS.find(t=>t.name==="Echo");chance=0.25;}
      if(r.type==="found"){target=r.cat;trait=TRAITS.find(t=>t.name==="Provider");chance=0.25;}
      if(target&&trait&&Math.random()<chance){
        const gained=addTrait(target,trait);
        if(gained){
          r.traitGained={cat:target,trait};
          // ★ v33: Add story moment for trait gain
          [setHand,setDraw,setDisc].forEach(setter=>{
            setter(arr=>arr.map(c=>c.id===target.id?{...c,trait:target.trait,extraTraits:[...(target.extraTraits||[])],story:[...(c.story||[]).slice(-3),`Gained ${trait.icon}${trait.name}`]}:c));
          });
        }
      }
    });
    setDenRes(results);setDen([]);setPh("denResults");
    // ★ v38: Start den cascade with sounds
    if(denStRef.current)clearTimeout(denStRef.current);
    const denSound=(r)=>{
      if(r.type==="breed")Audio.denBirth();
      else if(r.type==="death")Audio.denDeath();
      else if(r.type==="fight"||r.type==="training")Audio.denFight();
      else if(r.type==="bond"||r.type==="reconcile_bond")Audio.denBond();
      else if(r.type==="grudge")Audio.denGrudge();
      else if(r.type==="reconcile")Audio.denBond();
      else if(r.type==="teach")Audio.denBond(); // parent teaching feels warm
      else Audio.denGrowth();
    };
    if(results.length===0){setDenStep(0);}
    else{
      setDenStep(0);denSound(results[0]);
      let ds=0;
      const denAnim=()=>{
        ds++;
        if(ds<results.length){
          setDenStep(ds);denSound(results[ds]);
          // Dramatic events get more time: deaths, births, bonds
          const r=results[ds];
          const delay=r.type==="death"?900:r.type==="breed"?700:r.type==="bond"||r.type==="reconcile_bond"?600:r.type==="fight"?550:r.type==="grudge"||r.type==="reconcile"?500:400;
          denStRef.current=setTimeout(denAnim,delay);
        }
      };
      const first=results[0];
      const firstDelay=first.type==="death"?900:first.type==="breed"?700:first.type==="bond"?600:500;
      denStRef.current=setTimeout(denAnim,firstDelay);
    }
  }

  // ═══════════════════════════════════════════════════
  // v15: COLONY EVENTS
  // ═══════════════════════════════════════════════════
  function fireEvent(){
    const all=[...hand,...draw,...disc];
    // ★ v32: Night-gated event pool — narrative escalates with mechanics
    // ★ v34: Ninth Dawn events added when in endgame run
    const eventSource=isNinthDawn?[...COLONY_EVENTS,...NINTH_DAWN_EVENTS]:COLONY_EVENTS;
    let pool=[...eventSource].filter(e=>{
      if(e.ninthDawn&&!isNinthDawn)return false;
      if(e.minNight&&ante<e.minNight)return false;
      if(e.maxNight&&ante>e.maxNight)return false;
      if(e.needsFallen&&fallen.length<e.needsFallen)return false;
      return true;
    });
    // In Ninth Dawn, prioritize Ninth Dawn events
    if(isNinthDawn){const ndEvts=pool.filter(e=>e.ninthDawn);if(ndEvts.length>0)pool=ndEvts;}
    if(all.length<2)pool=pool.filter(e=>e.needsCat!=="pair");
    if(all.length<1)pool=pool.filter(e=>!e.needsCat);
    // Weight harder events in later antes
    const hardEvents=["sickness","storm","challenge","flood","the_cost","the_deal"];
    const weighted=ante>=4?[...pool,...pool.filter(e=>hardEvents.includes(e.id))]:pool;
    const evt=pk(weighted);
    let targets=[];
    if(evt.needsCat==="random"){targets=[pk(all)];}
    else if(evt.needsCat==="pair"){
      const s=shuf(all);
      // Try to pick cats of different breeds for drama
      const diff=s.length>=2&&s[0].breed!==s[1].breed;
      targets=diff?[s[0],s[1]]:[s[0],s[1]||s[0]];
    }
    setColEvent(evt);setColTargets(targets);setPh("event");
  }

  function chooseEvent(idx){
    const fx=colEvent.choices[idx].fx;
    const targets=colTargets;
    const all=[...hand,...draw,...disc];
    // ★ v35: Event Choice Scaling — non-gold choices grow more dramatic in Night 4-5
    const lateGame=ante>=4;
    if(fx.gold)setGold(g=>Math.max(0,g+fx.gold));
    if(fx.fervor){const boost=lateGame&&fx.fervor>=2?1:0;setFerv(f=>Math.min(9,Math.max(0,f+fx.fervor+boost)));}
    if(fx.bestPower){
      const bp=fx.bestPower+(lateGame?1:0);
      const best=[...all].sort((a,b)=>b.power-a.power)[0];
      if(best){
        [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>{
          if(x.id!==best.id)return x;
          const u={...x,power:Math.min(15,x.power+bp)};
          // ★ v35: Late-game bonus — Plain best cat gains Scrapper
          if(lateGame&&u.trait.name==="Plain"){const scr=TRAITS.find(t=>t.name==="Scrapper");if(scr)u.trait=scr;}
          return u;
        }));});
      }
    }
    if(fx.addCat){const rjB=draftRejects.length>0&&Math.random()<0.5?pk(draftRejects):null;const cp=fx.catPower||0;const nc=gC(rjB?{breed:rjB,trait:PLAIN}:{trait:PLAIN});if(cp)nc.power=clamp(cp,1,15);setDraw(d=>[...d,nc]);}
    if(fx.targetPower&&targets[0]){
      const t=targets[0];
      [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>x.id===t.id?{...x,power:Math.min(15,Math.max(1,x.power+fx.targetPower))}:x));});
    }
    if(fx.targetGamble&&targets[0]){
      if(Math.random()<0.5){
        const t=targets[0];
        [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>x.id===t.id?{...x,power:Math.max(1,x.power-2),scarred:true,injured:x.scarred,injuryTimer:x.scarred?2:0}:x));});
      }
    }
    if(fx.randDmg){
      const t=pk(all);if(t){const d=Math.random()<.5?1:2;
        [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>x.id===t.id?{...x,power:Math.max(1,x.power-d)}:x));});
      }
    }
    if(fx.tempHands)setTempMods(m=>({...m,hands:m.hands+fx.tempHands+(lateGame&&fx.tempHands>0?1:0)}));
    if(fx.tempDiscs)setTempMods(m=>({...m,discs:m.discs+fx.tempDiscs+(lateGame&&fx.tempDiscs>0?1:0)}));
    if(fx.tradeCat){
      const weakest=[...all].sort((a,b)=>a.power-b.power)[0];
      if(weakest){
        [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.filter(x=>x.id!==weakest.id));});
        setDraw(d=>[...d,gC({power:Math.floor(Math.random()*4)+5,trait:PLAIN})]);
      }
    }
    if(fx.catFight&&targets.length>=2){
      const w=Math.random()<.5?0:1,l=w===0?1:0;
      [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>{
        if(x.id===targets[w].id)return{...x,power:Math.min(15,x.power+2)};
        if(x.id===targets[l].id)return{...x,power:Math.max(1,x.power-1),scarred:true,injured:x.scarred,injuryTimer:x.scarred?2:0};
        return x;
      }));});
    }
    if(fx.bothWeaken&&targets.length>=2){
      [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>{
        if(x.id===targets[0].id||x.id===targets[1].id)return{...x,power:Math.max(1,x.power-1)};
        return x;
      }));});
    }
    if(fx.rareTrait&&!fx.specificTrait){
      const best=[...all].sort((a,b)=>b.power-a.power)[0];
      if(best){const rt=pk(RARE_TRAITS);[setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>{if(x.id===best.id){addTrait(x,rt);return{...x};}return x;}));});}
    }
    if(fx.eventDenSafe)setEventDenSafe(true);
    if(fx.eventDenBonus)setEventDenBonus(b=>b+1);
    if(fx.halfGold)setGold(g=>Math.floor(g/2));
    if(fx.weakDmg){
      const sorted=[...all].sort((a,b)=>a.power-b.power).slice(0,2);
      [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>sorted.find(w=>w.id===x.id)?{...x,power:Math.max(1,x.power-2)}:x));});
    }
    if(fx.healScars){
      [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>x.injured?{...x,injured:false,injuryTimer:0,power:Math.min(15,x.power+1)}:x.scarred?{...x,power:Math.min(15,x.power+1)}:x));});
    }
    // ★ v32: New event effects
    if(fx.pactBond&&targets.length>=2){
      [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>{
        if(x.id===targets[0].id)return{...x,bondedTo:targets[1].id,power:Math.min(15,x.power+1)};
        if(x.id===targets[1].id)return{...x,bondedTo:targets[0].id,power:Math.min(15,x.power+1)};
        // ★ v34: Clear orphan bonds
        if(x.bondedTo===targets[0].id||x.bondedTo===targets[1].id)return{...x,bondedTo:null};
        return x;
      }));});
    }
    if(fx.pactGrudge&&targets.length>=2){
      [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>{
        if(x.id===targets[0].id)return{...x,power:Math.min(15,x.power+2),grudgedWith:[...(x.grudgedWith||[]).filter(id=>id!==targets[1].id),targets[1].id]};
        if(x.id===targets[1].id)return{...x,power:Math.min(15,x.power+2),grudgedWith:[...(x.grudgedWith||[]).filter(id=>id!==targets[0].id),targets[0].id]};
        return x;
      }));});
    }
    if(fx.choiceSave!==undefined&&targets.length>=2){
      const save=fx.choiceSave,scar=save===0?1:0;
      [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>{
        if(x.id===targets[save].id)return{...x,power:Math.min(15,x.power+3)};
        if(x.id===targets[scar].id)return{...x,scarred:true};
        return x;
      }));});
    }
    if(fx.mapFollow){
      const sorted=[...all].sort((a,b)=>a.power-b.power);
      const remove=sorted.slice(0,1);
      remove.forEach(r=>{[setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.filter(x=>x.id!==r.id));});});
      setDraw(d=>[...d,gC({power:5+Math.floor(Math.random()*3),trait:pickTrait(true)})]);
    }
    if(fx.targetScrapper&&targets[0]){
      const scrT=TRAITS.find(t=>t.name==="Scrapper");
      [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>{if(x.id===targets[0].id){addTrait(x,scrT);return{...x};}return x;}));});
    }
    if(fx.targetHeal&&targets[0]){
      [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>x.id===targets[0].id?{...x,injured:false,injuryTimer:0,power:Math.min(15,x.power+2)}:x));});
    }
    if(fx.sacrifice){
      const weakest=[...all].sort((a,b)=>a.power-b.power)[0];
      if(weakest){
        [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.filter(x=>x.id!==weakest.id));});
        setFallen(f=>[...f,{name:weakest.name,breed:weakest.breed,night:ante}]);
        setGold(g=>g+6);setEventDenSafe(true);
        logEvent("death",{victim:weakest.name+" (sacrificed)"});
      }
    }
    if(fx.allPower){
      [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>({...x,power:Math.min(15,x.power+fx.allPower)})));});
    }
    if(fx.fullHeal){
      [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>({...x,injured:false,injuryTimer:0})));});
      // ★ v35: Late game rest is more restorative
      if(lateGame)setFerv(f=>Math.min(9,f+1));
    }
    if(fx.targetTrait&&targets[0]){
      const rt=pk(COMMON_TRAITS);
      [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>{if(x.id===targets[0].id){addTrait(x,rt);return{...x};}return x;}));});
    }
    // ★ v46: Named trait — event gives a specific common/negative trait to target or best cat
    if(fx.targetNamedTrait&&targets[0]){
      const nt=TRAITS.find(t=>t.name===fx.targetNamedTrait);
      if(nt){[setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>{if(x.id===targets[0].id){addTrait(x,nt);return{...x};}return x;}));});}
    }
    if(fx.bestNamedTrait){
      const best=[...all].sort((a,b)=>b.power-a.power)[0];
      const nt=TRAITS.find(t=>t.name===fx.bestNamedTrait);
      if(best&&nt){[setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>{if(x.id===best.id){addTrait(x,nt);return{...x};}return x;}));});}
    }
    if(fx.bothNamedTrait&&targets.length>=2){
      const nt=TRAITS.find(t=>t.name===fx.bothNamedTrait);
      if(nt){targets.forEach(t=>{[setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>{if(x.id===t.id){addTrait(x,nt);return{...x};}return x;}));});});}
    }
    if(fx.targetScar&&targets[0]){
      [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>x.id===targets[0].id?{...x,scarred:true}:x));});
    }
    if(fx.addNamedTrait){
      const nt=TRAITS.find(t=>t.name===fx.addNamedTrait);
      if(nt){const plain=all.filter(c=>catIsPlain(c));const pick=plain.length>0?pk(plain):pk(all);
        if(pick){[setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>{if(x.id===pick.id){addTrait(x,nt);return{...x};}return x;}));});}
      }
    }
    if(fx.addWard){
      const available=WARDS.filter(w=>!fams.find(f=>f.id===w.id));
      if(available.length>0&&fams.length<MF){const w=pk(available);setFams(fs=>[...fs,w]);toast(w.icon,`${w.name} found`,"#fbbf24");}
      else{setGold(g=>g+5);toast("🐟","No room for a ward. +5 Rations instead.","#fbbf24");}
    }
    if(fx.specificTrait&&fx.rareTrait){
      const best=[...all].sort((a,b)=>b.power-a.power)[0];
      const st=TRAITS.find(t=>t.name===fx.specificTrait)||pk(RARE_TRAITS);
      if(best){[setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>{if(x.id===best.id){addTrait(x,st);return{...x};}return x;}));});}
    }
    // ★ v34: Ninth Dawn event effects
    if(fx.bondedPower){
      [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>x.bondedTo?{...x,power:Math.min(15,x.power+fx.bondedPower)}:x));});
    }
    if(fx.addPhoenixKitten){
      const phTr=TRAITS.find(t=>t.name==="Phoenix");
      const kitten=gC({power:1,trait:phTr});
      kitten.story=["Born from the Third Colony's memory"];
      setDraw(d=>[...d,kitten]);
    }
    if(fx.dareBet){setDareBet(true);}
    // ★ v48: New hidden-outcome event effects
    if(fx.echoGamble){
      const t=pk(all);if(t){
        if(Math.random()<0.6){[setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>x.id===t.id?{...x,power:Math.min(15,x.power+2)}:x));});}
        else{[setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>x.id===t.id?{...x,scarred:true,power:Math.max(1,x.power-1)}:x));});}
      }
    }
    if(fx.mysteryGift){
      const r=Math.random();
      if(r<0.4)setGold(g=>g+6);
      else if(r<0.75){const avail=FAMS.filter(f=>!fams.find(ff=>ff.id===f.id));if(avail.length)setFams(f=>[...f,pk(avail)].slice(0,5));}
      else{const c=pk(CURSES.filter(x=>x.tier<=2));if(c)setCurses(cu=>[...cu,c]);}
    }
    if(fx.pushCat&&targets[0]){
      const t=targets[0];
      if(Math.random()<0.4){[setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>x.id===t.id?{...x,power:Math.min(15,x.power+3),injured:true,injuryTimer:2}:x));});}
      else{[setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>x.id===t.id?{...x,power:Math.min(15,x.power+3)}:x));});}
    }
    if(fx.redistribute){
      const sorted=[...all].sort((a,b)=>b.power-a.power);const best=sorted[0];const weak=sorted.slice(-2);
      [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>{
        if(best&&x.id===best.id)return{...x,power:Math.max(1,x.power-1)};
        if(weak.find(w=>w.id===x.id))return{...x,power:Math.min(15,x.power+1)};
        return x;
      }));});
    }
    if(fx.catDecide&&targets[0]){
      const t=targets[0];const isScarred=t.scarred;const hasTrait=(t.trait||PLAIN).name!=="Plain";
      if(isScarred){// scarred cats push through
        [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>x.id===t.id?{...x,power:Math.min(15,x.power+2)}:x));});
        setFerv(f=>Math.min(9,f+1));
      }else if(hasTrait){// trait cats share their gift
        [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>x.id===t.id?{...x,power:Math.min(15,x.power+1)}:x));});
        const weak=all.filter(x=>x.id!==t.id).sort((a,b)=>a.power-b.power)[0];
        if(weak){[setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>x.id===weak.id?{...x,power:Math.min(15,x.power+2)}:x));});}
      }else{// plain cats rest
        [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>x.id===t.id?{...x,injured:false,injuryTimer:0,power:Math.min(15,x.power+1)}:x));});
      }
    }
    if(fx.mysteryDoor){
      const r=Math.random();
      if(r<0.35){// good: warm shelter
        [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>({...x,injured:false,injuryTimer:0})));});
        setGold(g=>g+3);
      }else if(r<0.7){// great: trait upgrade
        const best=[...all].sort((a,b)=>b.power-a.power)[0];
        if(best){const rt=pk(RARE_TRAITS);[setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>{if(x.id===best.id){addTrait(x,rt);return{...x};}return x;}));});}
      }else{// twist: lose weakest, gain two strangers
        const weak=[...all].sort((a,b)=>a.power-b.power)[0];
        if(weak){[setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.filter(x=>x.id!==weak.id));});}
        setDraw(d=>[...d,gC({trait:PLAIN}),gC({trait:PLAIN})]);
      }
    }
    if(fx.chorusJoin){
      [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>({...x,injured:false,injuryTimer:0})));});
      setFerv(f=>Math.min(9,f+2));
      // Chance to bond two unbonded cats
      const unbonded=all.filter(x=>!x.bondedTo);
      if(unbonded.length>=2){
        const a=pk(unbonded),b=pk(unbonded.filter(x=>x.id!==a.id&&x.sex!==a.sex));
        if(a&&b){[setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>{
          if(x.id===a.id)return{...x,bondedTo:b.id};
          if(x.id===b.id)return{...x,bondedTo:a.id};
          if(x.bondedTo===a.id||x.bondedTo===b.id)return{...x,bondedTo:null};
          return x;
        }));});}
      }
    }
    if(fx.tideGaze){
      [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>{
        const r=Math.random();
        if(r<0.4)return{...x,power:Math.min(15,x.power+1)}; // saw something good
        if(r<0.7)return x; // nothing
        return{...x,power:Math.max(1,x.power-1)}; // disturbing
      }));});
    }
    if(fx.tideWade){
      const best=[...all].sort((a,b)=>b.power-a.power)[0];
      if(best){const rt=pk([...RARE_TRAITS,...RARE_TRAITS,TRAITS.find(t=>t.name==="Wild")]);
        [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>{if(x.id===best.id){addTrait(x,rt);return{...x,scarred:true};}return x;}));});}
    }
    if(fx.allPowerLoss){
      [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>({...x,power:Math.max(1,x.power-1)})));});
    }
    if(fx.debtBlood){
      const t=pk(all);
      if(t){[setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>x.id===t.id?{...x,scarred:true}:x));});}
      setFerv(f=>Math.min(9,f+2));setGold(g=>g+4);
    }
    if(fx.debtRefuse){
      // Bold choice — rewarded or punished
      if(Math.random()<0.5){setFerv(f=>Math.min(9,f+3));}
      else{setTempMods(m=>({...m,hands:m.hands-1}));const t=pk(all);if(t){[setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>x.id===t.id?{...x,power:Math.max(1,x.power-2)}:x));});}}
    }
    if(fx.inheritanceRead){
      // Colony-wide: all cats +1P, random one gains trait
      [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>({...x,power:Math.min(15,x.power+1)})));});
      const t=pk(all.filter(x=>(x.trait||PLAIN).name==="Plain"));
      if(t){const tr=pk(COMMON_TRAITS);[setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>{if(x.id===t.id){addTrait(x,tr);return{...x};}return x;}));});}
    }
    if(fx.inheritancePrivate&&targets[0]){
      // Finder gets big power boost and rare trait
      const t=targets[0];const rt=pk(RARE_TRAITS);
      [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>{if(x.id===t.id){addTrait(x,rt);return{...x,power:Math.min(15,x.power+3)};}return x;}));});
    }
    if(fx.splitFollow!==undefined&&targets.length>=2){
      const leader=targets[fx.splitFollow],other=targets[fx.splitFollow===0?1:0];
      // Leader's stats determine outcome
      if(leader.power>=8){// strong leader. everyone benefits
        [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>({...x,power:Math.min(15,x.power+1)})));});
        setGold(g=>g+3);
      }else{// weak leader. risky detour
        [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>x.id===leader.id?{...x,power:Math.min(15,x.power+2)}:x));});
        [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>x.id===other.id?{...x,power:Math.max(1,x.power-1)}:x));});
      }
    }
    if(fx.hollowEnter){
      const t=pk(all);
      if(t){
        const r=Math.random();
        if(r<0.5){// emerged changed
          const rt=pk(COMMON_TRAITS);
          [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>{if(x.id===t.id){addTrait(x,rt);return{...x,power:Math.min(15,x.power+1)};}return x;}));});
        }else if(r<0.8){// found supplies
          setGold(g=>g+5);
        }else{// came back... different
          [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>x.id===t.id?{...x,scarred:true,power:Math.min(15,x.power+2)}:x));});
        }
      }
    }
    if(fx.wagerBest){
      const best=[...all].sort((a,b)=>b.power-a.power)[0];
      if(best){
        if(Math.random()<0.55){// won the bet
          const rt=pk(RARE_TRAITS);
          [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>{if(x.id===best.id){addTrait(x,rt);return{...x,power:Math.min(15,x.power+3)};}return x;}));});
          setGold(g=>g+8);
        }else{// lost. cat scarred and weakened
          [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>x.id===best.id?{...x,scarred:true,injured:true,injuryTimer:2,power:Math.max(1,x.power-3)}:x));});
        }
      }
    }
    if(fx.wagerGold){
      const half=Math.floor((gold||0)/2);
      setGold(g=>Math.floor(g/2));
      if(Math.random()<0.55){// won. triple it back
        setGold(g=>g+half*3);setFerv(f=>Math.min(9,f+2));
      }else{// lost. nothing gained, nerve penalty
        setFerv(f=>Math.max(0,f-1));
      }
    }
    if(fx.truthTrust&&targets[0]){
      const t=targets[0];
      const r=Math.random();
      if(r<0.4){// they saw the way. rare trait
        const rt=pk(RARE_TRAITS);
        [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>{if(x.id===t.id){addTrait(x,rt);return{...x};}return x;}));});
      }else if(r<0.7){// false vision. but nerve from conviction
        setFerv(f=>Math.min(9,f+3));
      }else{// the wall stares back
        [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>x.id===t.id?{...x,scarred:true,power:Math.max(1,x.power-1)}:x));});
        setFerv(f=>Math.min(9,f+1));
      }
    }
    // ★ v48+: New trait-coverage event effects
    if(fx.addStrays){
      for(let i=0;i<fx.addStrays;i++)setDraw(d=>[...d,gC({trait:PLAIN})]);
    }
    if(fx.visionPeek){
      // Seer-style: reveal what's coming + chance for good/bad outcome
      const r=Math.random();
      if(r<0.5){setFerv(f=>Math.min(9,f+2));} // the vision was hopeful
      else if(r<0.8){setGold(g=>g+4);} // saw where supplies were hidden
      else{// saw something terrible. but knowledge is power
        const t=pk(all);if(t){[setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>x.id===t.id?{...x,scarred:true}:x));});}
        setFerv(f=>Math.min(9,f+3));
      }
    }
    if(fx.forceBond&&targets.length>=2){
      const [a,b]=targets;
      [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>{
        if(x.id===a.id)return{...x,bondedTo:b.id};
        if(x.id===b.id)return{...x,bondedTo:a.id};
        // Break existing bonds to these cats
        if(x.bondedTo===a.id||x.bondedTo===b.id)return{...x,bondedTo:null};
        return x;
      }));});
    }
    if(fx.shelterTarget&&targets[0]){
      // Cat is sheltered (removed from next den) — implemented as safe flag
      setEventDenSafe(true); // simplification: entire den is safe
    }
    if(fx.othersPower){
      // All cats EXCEPT target gain power
      const tid=targets[0]?.id;
      [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>x.id!==tid?{...x,power:Math.min(15,x.power+fx.othersPower)}:x));});
    }
    if(fx.targetWeaken&&targets[0]){
      const t=targets[0];
      [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>x.id===t.id?{...x,power:Math.max(1,x.power-fx.targetWeaken)}:x));});
    }
    if(fx.bothPower&&targets.length>=2){
      [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>{
        if(x.id===targets[0].id||x.id===targets[1].id)return{...x,power:Math.min(15,x.power+fx.bothPower)};
        return x;
      }));});
    }
    const outcomeText=buildOutcomeText(colEvent,colEvent.choices[idx],targets,fx);
    const choiceLabel=colEvent.choices[idx].labelFn?colEvent.choices[idx].labelFn(targets):colEvent.choices[idx].label;
    logEvent("event",{title:colEvent.title,choice:choiceLabel});
    // ★ v33: Toast the most significant outcome for clarity
    if(outcomeText.length>0){const top=outcomeText[0];toast(top.icon||"📜",top.text,top.color||"#fbbf24");}
    setEventOutcome({title:colEvent.title,icon:colEvent.icon,choice:choiceLabel,desc:outcomeText,targets});
    setColEvent(null);setColTargets([]);
    setPh("eventResult");
  }

  function buildOutcomeText(evt,choice,targets,fx){
    const lines=[];
    if(fx.gold>0)lines.push({text:`+${fx.gold} Rations`,color:"#fbbf24",icon:"🐟"});
    if(fx.gold<0)lines.push({text:`${fx.gold} Rations`,color:"#ef4444",icon:"🐟"});
    if(fx.fervor>0)lines.push({text:`+${fx.fervor} Nerve`,color:"#d97706",icon:"🔥"});
    if(fx.bestPower)lines.push({text:`Best cat +${fx.bestPower} Power`,color:"#4ade80",icon:"⭐"});
    if(fx.addCat)lines.push({text:"A new cat joins the colony",color:"#67e8f9",icon:"🐱"});
    if(fx.targetPower&&targets[0])lines.push({text:`${targets[0].name.split(" ")[0]} ${fx.targetPower>0?"+":""}${fx.targetPower} Power`,color:fx.targetPower>0?"#4ade80":"#ef4444",icon:"⚡"});
    if(fx.targetGamble&&targets[0])lines.push({text:`${targets[0].name.split(" ")[0]}: fate decided...`,color:"#fbbf24",icon:"🎲"});
    if(fx.randDmg)lines.push({text:"A cat was caught in the storm",color:"#ef4444",icon:"⛈️"});
    if(fx.tempHands)lines.push({text:`${fx.tempHands>0?"+":""}${fx.tempHands} Hands next round`,color:fx.tempHands>0?"#4ade80":"#ef4444",icon:"✊"});
    if(fx.tempDiscs)lines.push({text:`+${fx.tempDiscs} Discards next round`,color:"#4ade80",icon:"🔄"});
    if(fx.tradeCat)lines.push({text:"Weakest traded for a stronger stranger",color:"#fbbf24",icon:"🔄"});
    if(fx.catFight)lines.push({text:"One stands taller. One bears a scar.",color:"#ef4444",icon:"⚔️"});
    if(fx.bothWeaken)lines.push({text:"Both separated. Both diminished.",color:"#ef4444",icon:"💔"});
    if(fx.rareTrait&&!fx.specificTrait)lines.push({text:"Best cat touched by something ancient",color:"#fbbf24",icon:"✨"});
    if(fx.specificTrait)lines.push({text:`Best cat gained ${fx.specificTrait}. The flame lives in them now.`,color:"#fbbf24",icon:"🔥"});
    if(fx.eventDenSafe)lines.push({text:"Next den is protected. No fights.",color:"#4ade80",icon:"🕊️"});
    if(fx.eventDenBonus)lines.push({text:"+1 Shelter slot this night.",color:"#4ade80",icon:"🏠"});
    if(fx.halfGold)lines.push({text:"Lost half your rations saving everyone",color:"#ef4444",icon:"🐟"});
    if(fx.weakDmg)lines.push({text:"Two weakest cats suffered (-2 Power each)",color:"#ef4444",icon:"🌊"});
    if(fx.healScars)lines.push({text:"Scarred cats healed (+1 Power each)",color:"#4ade80",icon:"💚"});
    // ★ v32 new event outcomes
    if(fx.pactBond)lines.push({text:`${targets[0]?.name.split(" ")[0]} and ${targets[1]?.name.split(" ")[0]} bonded. +1 Power each.`,color:"#f472b6",icon:"💕"});
    if(fx.pactGrudge)lines.push({text:`Both grew stronger. But the grudge is real.`,color:"#fb923c",icon:"⚡"});
    if(fx.choiceSave!==undefined&&targets.length>=2)lines.push({text:`${targets[fx.choiceSave].name.split(" ")[0]} saved. ${targets[fx.choiceSave===0?1:0].name.split(" ")[0]} scarred.`,color:"#fbbf24",icon:"⚖️"});
    if(fx.mapFollow)lines.push({text:"One cat left. A stranger arrived.",color:"#c084fc",icon:"🗺️"});
    if(fx.targetScrapper)lines.push({text:`${targets[0]?.name.split(" ")[0]} gained Scrapper. The cost may come later.`,color:"#fb923c",icon:"🥊"});
    if(fx.targetHeal)lines.push({text:`${targets[0]?.name.split(" ")[0]} healed. +2 Power. But one less hand tomorrow.`,color:"#4ade80",icon:"💚"});
    if(fx.sacrifice)lines.push({text:"One was offered. The den sleeps safely tonight.",color:"#ef4444",icon:"🐕"});
    if(fx.allPower)lines.push({text:"All cats +1 Power",color:"#4ade80",icon:"⭐"});
    if(fx.fullHeal)lines.push({text:"All injuries healed.",color:"#4ade80",icon:"💚"});
    if(fx.targetTrait&&targets[0])lines.push({text:`${targets[0].name.split(" ")[0]} learned something from the wall.`,color:"#c084fc",icon:"📜"});
    if(fx.targetNamedTrait&&targets[0])lines.push({text:`${targets[0].name.split(" ")[0]} gained ${fx.targetNamedTrait}.`,color:"#4ade80",icon:TRAITS.find(t=>t.name===fx.targetNamedTrait)?.icon||"✨"});
    if(fx.bestNamedTrait)lines.push({text:`Best cat gained ${fx.bestNamedTrait}.`,color:"#fbbf24",icon:TRAITS.find(t=>t.name===fx.bestNamedTrait)?.icon||"✨"});
    if(fx.bothNamedTrait&&targets.length>=2)lines.push({text:`${targets[0].name.split(" ")[0]} and ${targets[1].name.split(" ")[0]} both gained ${fx.bothNamedTrait}.`,color:"#4ade80",icon:TRAITS.find(t=>t.name===fx.bothNamedTrait)?.icon||"✨"});
    // ★ v34: Ninth Dawn event outcomes
    if(fx.bondedPower)lines.push({text:`All bonded cats +${fx.bondedPower} Power. Love fuels rage.`,color:"#f472b6",icon:"💕"});
    if(fx.addPhoenixKitten)lines.push({text:"A kitten appeared. Power 1. Trait: Phoenix. Born from memory.",color:"#fbbf24",icon:"🔥"});
    if(fx.dareBet)lines.push({text:"The dare is set. Next hand decides.",color:"#fbbf24",icon:"📊"});
    // ★ v48: Hidden-outcome event results — reveal what actually happened
    if(fx.echoGamble)lines.push({text:"The echo answered. Something changed.",color:"#c084fc",icon:"🔊"});
    if(fx.mysteryGift){const r=Math.random();lines.push({text:r<0.4?"Rations inside. Practical.":r<0.75?"A ward, wrapped in old cloth. Still warm.":"A curse. Someone else's bad luck, now yours.",color:r<0.75?"#fbbf24":"#ef4444",icon:r<0.4?"🐟":r<0.75?"🛡️":"💀"});}
    if(fx.pushCat&&targets[0])lines.push({text:`${targets[0].name.split(" ")[0]} pushed harder. +3 Power.`,color:"#4ade80",icon:"💪"});
    if(fx.redistribute)lines.push({text:"Burden shared. Colony rebalanced.",color:"#67e8f9",icon:"⚖️"});
    if(fx.catDecide&&targets[0])lines.push({text:`${targets[0].name.split(" ")[0]} made their own choice.`,color:"#c084fc",icon:"🐱"});
    if(fx.mysteryDoor)lines.push({text:"Through the door: something you didn't expect.",color:"#c084fc",icon:"🚪"});
    if(fx.chorusJoin)lines.push({text:"The sound became something solid. Bonds formed in the resonance.",color:"#f472b6",icon:"🎵"});
    if(fx.tideGaze)lines.push({text:"Each cat saw something different. Not all of it was kind.",color:"#67e8f9",icon:"🌊"});
    if(fx.tideWade&&targets.length===0)lines.push({text:"The strongest waded in. Came back changed. And scarred.",color:"#fbbf24",icon:"🌊"});
    if(fx.allPowerLoss)lines.push({text:"All cats −1 Power. The retreat cost something.",color:"#ef4444",icon:"📉"});
    if(fx.debtBlood)lines.push({text:"Blood paid. Something gained. The balance holds.",color:"#ef4444",icon:"🩸"});
    if(fx.debtRefuse)lines.push({text:"The debt remembers. Whether it forgives... we'll see.",color:"#fb923c",icon:"💰"});
    if(fx.inheritanceRead)lines.push({text:"The will was read. Every cat heard it. One understood.",color:"#4ade80",icon:"📜"});
    if(fx.inheritancePrivate&&targets[0])lines.push({text:`${targets[0].name.split(" ")[0]} kept the secret. Grew from it.`,color:"#fbbf24",icon:"📜"});
    if(fx.splitFollow!==undefined&&targets.length>=2)lines.push({text:`The colony followed ${targets[fx.splitFollow].name.split(" ")[0]}.`,color:"#67e8f9",icon:"🔀"});
    if(fx.hollowEnter)lines.push({text:"Someone went in. Something came out.",color:"#c084fc",icon:"🌳"});
    if(fx.wagerBest)lines.push({text:"The wager was accepted. The voice always pays.",color:"#fbbf24",icon:"🎲"});
    if(fx.wagerGold)lines.push({text:"Rations on the table. The voice smiled.",color:"#fbbf24",icon:"🎲"});
    if(fx.truthTrust&&targets[0])lines.push({text:`${targets[0].name.split(" ")[0]} saw something in the wall. You chose to believe them.`,color:"#c084fc",icon:"👁️"});
    // ★ v48+: New trait-coverage event outcome lines
    if(fx.addStrays)lines.push({text:`+${fx.addStrays} stray${fx.addStrays>1?"s":""} joined the colony.`,color:"#888",icon:"🐾"});
    if(fx.visionPeek)lines.push({text:"The vision passed. Something changed.",color:"#c084fc",icon:"🔮"});
    if(fx.forceBond&&targets.length>=2)lines.push({text:`${targets[0].name.split(" ")[0]} and ${targets[1].name.split(" ")[0]} bonded.`,color:"#f472b6",icon:"💕"});
    if(fx.shelterTarget)lines.push({text:"Quarantined. The den is safe.",color:"#4ade80",icon:"🏠"});
    if(fx.othersPower)lines.push({text:`Others gained +${fx.othersPower} Power.`,color:"#4ade80",icon:"⭐"});
    if(fx.targetWeaken&&targets[0])lines.push({text:`${targets[0].name.split(" ")[0]} −${fx.targetWeaken} Power.`,color:"#ef4444",icon:"📉"});
    if(fx.bothPower&&targets.length>=2)lines.push({text:`${targets[0].name.split(" ")[0]} and ${targets[1].name.split(" ")[0]} both +${fx.bothPower} Power.`,color:"#4ade80",icon:"⚡"});
    if(fx.targetScar&&targets[0])lines.push({text:`${targets[0].name.split(" ")[0]} scarred.`,color:"#fbbf24",icon:"⚔"});
    if(fx.addNamedTrait)lines.push({text:`A cat gained ${fx.addNamedTrait}.`,color:"#4ade80",icon:TRAITS.find(t=>t.name===fx.addNamedTrait)?.icon||"✨"});
    if(fx.addWard)lines.push({text:"Found a ward.",color:"#fbbf24",icon:"🔮"});
    if(fx.catPower&&fx.addCat)lines.push({text:`A Power ${fx.catPower} cat joins.`,color:"#67e8f9",icon:"🐱"});
    if(Object.keys(fx).length===0)lines.push({text:"Nothing happened.",color:"#666",icon:"..."});
    return lines;
  }

  async function buyUpg(u){if(!meta||meta.dust<u.cost)return;const cur=meta.ups[u.id]||0;if(cur>=u.max)return;const um={...meta,dust:meta.dust-u.cost,ups:{...meta.ups,[u.id]:cur+1}};setMeta(um);await saveS(um);}

  // ★ v44: Memoize selection-dependent computations
  const selC=React.useMemo(()=>[...sel].map(i=>hand[i]).filter(Boolean),[sel,hand]);
  const preview=React.useMemo(()=>sel.size>0?evalH(selC):null,[sel.size,selC]);
  const tgt=eTgt();const isBoss=blind===2;
  const blindN=["Dusk","Midnight",(boss?.name)||"The Boss"];
  // v37: Night mods removed

  const W={width:"100%",minHeight:"100vh",background:isBoss?"linear-gradient(180deg,#140808,#1a0808,#0d0815)":ferv>=7?"linear-gradient(180deg,#0f0808,#1a0a0a,#0d0815)":"linear-gradient(180deg,#06060f,#0a0a1a,#0d0815)",color:"#e8e6e3",fontFamily:"'Cinzel',serif",display:"flex",flexDirection:"column",alignItems:"center",position:"relative",overflow:"hidden",transition:"background .8s"};
  const BG={position:"fixed",inset:0,pointerEvents:"none",zIndex:0,backgroundImage:isBoss?"radial-gradient(circle at 50% 30%,#ef444411,transparent 50%)":ferv>=9?"radial-gradient(circle at 50% 50%,#fef08a11,transparent 40%)":"radial-gradient(circle at 20% 80%,#7a665211,transparent 50%),radial-gradient(circle at 80% 20%,#06b6d411,transparent 50%)"};
  const BTN=(bg,col,on=true)=>({padding:"9px 24px",fontSize:13,fontWeight:700,border:"none",borderRadius:8,cursor:on?"pointer":"not-allowed",fontFamily:"'Cinzel',serif",letterSpacing:1,background:on?bg:"#222",color:on?col:"#555",transition:"all .2s"});
  const CSS=`@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&display=swap');
    @keyframes slideIn{from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:translateX(0)}}
    @keyframes fadeIn{from{opacity:0;transform:scale(.5) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}
    @keyframes fp{0%,100%{text-shadow:0 0 12px #ffffffaa}50%{text-shadow:0 0 24px #ffffffdd}}
    @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
    @keyframes fpp{0%{transform:scale(1)}50%{transform:scale(1.3)}100%{transform:scale(1)}}
    @keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-3px)}75%{transform:translateX(3px)}}
    @keyframes guidePulse{0%,100%{transform:translateY(0);filter:brightness(1)}50%{transform:translateY(-4px);filter:brightness(1.2)}}
    @keyframes glow{0%,100%{box-shadow:0 0 15px #fef08a44}50%{box-shadow:0 0 30px #fef08a88}}
    @keyframes flash{0%{opacity:0}30%{opacity:1}100%{opacity:0}}
    @keyframes countUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
    @keyframes wardPop{from{opacity:0;transform:scale(.8)}to{opacity:1;transform:scale(1)}}
    @keyframes scorePop{0%{transform:scale(1)}30%{transform:scale(1.4)}100%{transform:scale(1)}}
    @keyframes thresholdPop{0%{transform:scale(1);filter:brightness(1)}20%{transform:scale(1.2);filter:brightness(1.6)}100%{transform:scale(1);filter:brightness(1)}}
    @keyframes tierReveal{0%{opacity:0;transform:scale(.3) translateY(15px)}40%{opacity:1;transform:scale(1.2) translateY(-3px)}100%{transform:scale(1) translateY(0)}}
    @keyframes clutchBurst{0%{opacity:0;transform:scale(0);letter-spacing:20px}40%{opacity:1;transform:scale(1.3);letter-spacing:12px}100%{opacity:1;transform:scale(1);letter-spacing:8px}}
    @keyframes newBestPop{0%{opacity:0;transform:scale(0) rotate(-10deg)}50%{opacity:1;transform:scale(1.3) rotate(3deg)}100%{opacity:1;transform:scale(1) rotate(0)}}
    @keyframes cardFire{0%{transform:scale(1);filter:brightness(1)}30%{transform:scale(1.12);filter:brightness(1.4)}100%{transform:scale(1);filter:brightness(1)}}
    @keyframes comboBurst{0%{opacity:0;transform:scale(0.3)}40%{opacity:1;transform:scale(1.4)}60%{transform:scale(0.9)}100%{transform:scale(1)}}
    @keyframes multFlash{0%{opacity:0;transform:scale(0) rotate(-15deg)}50%{opacity:1;transform:scale(1.5) rotate(5deg)}100%{opacity:1;transform:scale(1) rotate(0)}}
    @keyframes bigShake{0%,100%{transform:translate(0,0)}10%{transform:translate(-4px,-2px)}20%{transform:translate(3px,1px)}30%{transform:translate(-3px,-1px)}40%{transform:translate(2px,2px)}50%{transform:translate(-2px,-1px)}60%{transform:translate(1px,1px)}80%{transform:translate(1px,-1px)}}
    @keyframes breathe{0%,100%{opacity:.3}50%{opacity:.8}}
    @keyframes driftUp{0%{transform:translateY(20px);opacity:0}100%{transform:translateY(-20px);opacity:0}50%{opacity:.6}}
    @keyframes epicReveal{0%{opacity:0;letter-spacing:20px;filter:blur(8px)}60%{opacity:1;letter-spacing:8px;filter:blur(0)}100%{letter-spacing:4px}}
    *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
    button{min-height:44px;min-width:44px}
    ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-thumb{background:#333;border-radius:2px}
    body{margin:0;background:#06060f}`;

  // ★ v42: Viewport-aware sizing
  const[vw,setVw]=useState(typeof window!=="undefined"?window.innerWidth:600);
  useEffect(()=>{const h=()=>setVw(window.innerWidth);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);
  const mob=vw<500;

  // ═══════════════════════════════════════════════════════
  // FIRST RUN INTRO — multi-page click-through
  // ═══════════════════════════════════════════════════════
  if(ph==="firstIntro"){
    const iCard=(br,pw)=>(<div style={{display:"inline-flex",flexDirection:"column",alignItems:"center",padding:"5px 8px",borderRadius:6,background:"#1a1a2e",border:`2px solid ${BREEDS[br].color}44`,minWidth:44,gap:1}}>
      <div style={{display:"flex",justifyContent:"space-between",width:"100%",fontSize:9}}><span>{BREEDS[br].icon}</span><span style={{color:"#ffffff88",fontWeight:700}}>{pw}</span></div>
      <div style={{fontSize:9,color:BREEDS[br].color,fontWeight:600}}>{br.slice(0,3)}</div>
    </div>);
    const pages=[
      // Page 0: The world — emotional hook
      ()=>(<>
        <div style={{fontSize:48,animation:"fadeIn .6s ease-out",opacity:.8}}>🌙</div>
        <div style={{fontSize:20,fontWeight:900,color:"#fbbf24",letterSpacing:6,fontFamily:"'Cinzel',serif",animation:"fadeIn .8s ease-out"}}>THE NINTH COLONY</div>
        <div style={{fontSize:15,color:"#ffffff77",fontFamily:"system-ui",textAlign:"center",maxWidth:340,lineHeight:1.9,animation:"fadeIn 1.2s ease-out"}}>
          Eight colonies fell to the dark.<br/>This is the last one.<br/><br/>
          <span style={{color:"#ffffff44",fontSize:13}}>You lead a colony of cats. Play them together each round to score high enough that the dark can't ignore you.</span>
        </div>
      </>),
      // Page 1: Seasons + reading a card — the only pre-knowledge needed
      ()=>(<>
        <div style={{fontSize:10,color:"#ffffff22",letterSpacing:6,fontFamily:"system-ui",animation:"fadeIn .4s ease-out"}}>YOUR CATS</div>
        <div style={{display:"flex",gap:10,justifyContent:"center",animation:"fadeIn .6s ease-out",flexWrap:"wrap"}}>
          {["Autumn","Summer","Winter","Spring"].map(s=>{const b=BREEDS[s];return(
            <div key={s} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"6px 10px",borderRadius:8,background:`${b.color}11`,border:`1px solid ${b.color}33`,minWidth:60}}>
              <span style={{fontSize:20}}>{b.icon}</span>
              <span style={{fontSize:10,color:b.color,fontWeight:700}}>{b.name}</span>
            </div>
          );})}
        </div>
        <div style={{fontSize:13,color:"#4ade8088",fontFamily:"system-ui",textAlign:"center",maxWidth:300,lineHeight:1.7,animation:"fadeIn .8s ease-out",fontWeight:600}}>
          Cats of the same season score better together.
        </div>
        <div style={{display:"flex",gap:16,alignItems:"center",justifyContent:"center",animation:"fadeIn 1s ease-out",marginTop:4}}>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"10px 14px",borderRadius:10,background:"#1a1a2e",border:`2px solid ${BREEDS.Autumn.color}66`,gap:3,minWidth:72}}>
            <div style={{display:"flex",justifyContent:"space-between",width:"100%"}}><span style={{fontSize:14}}>🍂</span><span style={{color:"#ffffff88",fontWeight:900,fontSize:14}}>5</span></div>
            <div style={{fontSize:11,color:BREEDS.Autumn.color,fontWeight:700}}>Ember</div>
            <div style={{fontSize:8,color:"#f59e0b",background:"#f59e0b18",padding:"1px 5px",borderRadius:3}}>🐺 Alpha</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <div style={{display:"flex",gap:5,alignItems:"center"}}><span style={{fontSize:11}}>🍂</span><span style={{fontSize:11,color:"#ffffff55"}}>Season</span></div>
            <div style={{display:"flex",gap:5,alignItems:"center"}}><span style={{fontSize:11,fontWeight:700,color:"#ffffff77"}}>5</span><span style={{fontSize:11,color:"#ffffff55"}}>Power (chips)</span></div>
            <div style={{display:"flex",gap:5,alignItems:"center"}}><span style={{fontSize:11}}>🐺</span><span style={{fontSize:11,color:"#ffffff55"}}>Trait (bonus)</span></div>
          </div>
        </div>
      </>),
      // Page 2: Go — minimal, sets expectations
      ()=>(<>
        <div style={{fontSize:36,animation:"fadeIn .6s ease-out",opacity:.7}}>⚔</div>
        <div style={{fontSize:14,color:"#ffffff66",fontFamily:"system-ui",textAlign:"center",maxWidth:300,lineHeight:1.8,animation:"fadeIn .8s ease-out"}}>
          Pick <b style={{color:"#fbbf24"}}>3 cats</b> for your colony.<br/>
          The game will show you how to play.<br/><br/>
          <span style={{color:"#ffffff33",fontSize:12}}>Everything else, you'll learn by doing.</span>
        </div>
      </>),
    ];
    const isLast=introStep>=pages.length-1;
    return(<div style={W}><div style={BG}/><style>{CSS}</style>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",zIndex:1,gap:20,padding:20,maxWidth:420}} onClick={()=>{
        if(isLast){setIntroStep(0);setPh("draft");}
        else{setIntroStep(introStep+1);}
      }}>
        {pages[introStep]()}
        <div style={{display:"flex",gap:6,marginTop:8}}>
          {pages.map((_,i)=>(<div key={i} style={{width:8,height:8,borderRadius:"50%",background:i===introStep?"#fbbf24":i<introStep?"#fbbf2444":"#333",transition:"all .3s"}}/>))}
        </div>
        <div style={{fontSize:12,color:"#ffffff33",fontFamily:"system-ui",animation:"fadeIn 2s ease-out",letterSpacing:2}}>{isLast?"Tap to start drafting":"Tap to continue"}</div>
      </div>
    </div>);
  }


  // ═══════════════════════════════════════════════════════
  // NAMING SCREEN — first run only, after each draft pick
  // ═══════════════════════════════════════════════════════
  if(ph==="naming"&&namingCat){
    const b=BREEDS[namingCat.breed];
    const defaultName=namingCat.name.split(" ")[0];
    const tr=namingCat.trait||PLAIN;
    const detail=TRAIT_DETAIL[tr.name]||tr.desc;
    const tierLabel=tr.tier==="mythic"?"Mythic":tr.tier==="legendary"?"Legendary":tr.tier==="rare"?"Rare":tr.tier==="rare_neg"?"Rare":tr.tier==="common"?"Common":"";
    const tierCol=tr.tier==="mythic"?"#c084fc":tr.tier==="legendary"?"#f59e0b":(tr.tier==="rare"||tr.tier==="rare_neg")?"#4ade80":"#ffffff55";
    return(<div style={W}><div style={BG}/><style>{CSS}</style>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",zIndex:1,gap:12,padding:20,maxWidth:420}}>
        <div style={{fontSize:10,color:"#ffffff22",letterSpacing:6,fontFamily:"system-ui",animation:"fadeIn .6s ease-out"}}>NAME YOUR CAT</div>
        <div style={{animation:"float 3s ease-in-out infinite"}}><CC cat={namingCat}/></div>

        {/* Season + Power */}
        <div style={{display:"flex",gap:12,alignItems:"center",animation:"fadeIn .8s ease-out"}}>
          <div style={{fontSize:12,color:b.color,fontWeight:700,letterSpacing:1}}>{b.icon} {b.name}</div>
          <div style={{fontSize:12,color:"#ffffff66"}}>Power {namingCat.power}</div>
        </div>

        {/* Trait detail card */}
        {tr.name!=="Plain"?(<div style={{padding:"12px 16px",borderRadius:10,background:`${tierCol}08`,border:`1px solid ${tierCol}22`,maxWidth:340,width:"100%",animation:"fadeIn 1s ease-out"}}>
          <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:6}}>
            <span style={{fontSize:18}}>{tr.icon}</span>
            <span style={{fontSize:14,color:tierCol,fontWeight:700}}>{tr.name}</span>
            {tierLabel&&<span style={{fontSize:9,color:tierCol,opacity:.6,letterSpacing:1,textTransform:"uppercase"}}>{tierLabel}</span>}
          </div>
          <div style={{fontSize:12,color:"#ffffff77",fontFamily:"system-ui",lineHeight:1.7}}>{detail}</div>
        </div>):(
          <div style={{padding:"10px 16px",borderRadius:10,background:"#ffffff06",border:"1px solid #ffffff11",maxWidth:340,width:"100%",animation:"fadeIn 1s ease-out"}}>
            <div style={{fontSize:12,color:"#ffffff44",fontFamily:"system-ui",lineHeight:1.7}}>No special trait yet. This cat can earn one through events, breeding, or the shop.</div>
          </div>
        )}

        {/* Name input */}
        <input
          id="nameInput"
          type="text"
          defaultValue={defaultName}
          maxLength={12}
          autoFocus
          onKeyDown={e=>{if(e.key==="Enter")document.getElementById("nameConfirm")?.click();}}
          style={{fontSize:22,fontWeight:700,color:b.color,background:"#0a0a1a",border:`2px solid ${b.color}44`,borderRadius:8,padding:"10px 16px",textAlign:"center",outline:"none",fontFamily:"system-ui",width:220,letterSpacing:1,marginTop:4}}
        />
        <div style={{fontSize:10,color:"#ffffff22",fontFamily:"system-ui"}}>Change the name or keep it.</div>
        <button id="nameConfirm" onClick={()=>{
          const inp=document.getElementById("nameInput");
          const defaultName=namingCat.name.split(" ")[0];
          const newName=(inp?.value||defaultName).trim().substring(0,12)||defaultName;
          const fullName=namingCat.name.includes(" ")?`${newName} ${namingCat.name.split(" ").slice(1).join(" ")}`:newName;
          namingCat.name=fullName;
          delete namingCat._finalPick;
          const isFinal=draftPicked.length>=3;
          setNamingCat(null);
          if(isFinal){
            finalizeDraft(draftPicked);
          }else{
            setPh("draft");
          }
        }} style={{...BTN(`linear-gradient(135deg,${b.color},${b.color}cc)`,"#0a0a1a"),padding:"10px 32px",fontSize:14,letterSpacing:2}}>
          This is their name
        </button>
      </div>
    </div>);
  }

  // ═══════════════════════════════════════════════════════
  // TITLE
  // ═══════════════════════════════════════════════════════
  // v13: DRAFT SCREEN
  if(ph==="draft"){
    const isFirstRun=!meta||meta.stats.r===0;
    const hasHearthLineage=getHearthPairs(meta?.cats||[]).length>0;
    const draftStory=hasHearthLineage?[
      "The Hearth burns. New life stirs in its light. Three descendants step forward, carrying their ancestors' blood.",
      "From the names you saved, new generations emerge. They carry the old power in young bodies.",
      "The bloodline continues. Three young cats, born of the Hearth's memory, await your choice.",
    ]:isFirstRun?[
      "Three survivors. Pick one.",
      "Three shapes in the dusk. One joins you.",
      "They found you first. Choose one.",
    ]:[
      "The world ended. Not with fire. Not with flood. It just... stopped. These three found the wreckage first.",
      "Someone had to start over. Three cats, drawn by instinct, converged on the same ruin.",
      "They came from different directions. Different lives. But they all smelled the same thing: a place that could be a home.",
    ];
    const draftMid=isFirstRun?[
      "Word travels. Three more arrive.",
      "Your colony is forming. Pick another.",
    ]:[
      "Word spreads among survivors. Three more arrive, drawn by the sound of breathing.",
      "The scent of a colony carries far. New arrivals circle the edges, waiting to be chosen.",
      "More shapes in the dusk. The colony's pull is stronger now. Three more step into the light.",
    ];
    const draftFinal=isFirstRun?[
      "Last wave. One more joins you.",
      "Three remain. Pick your final companion.",
    ]:[
      "The last wave. After this, the door closes. Whoever is inside is the colony.",
      "Three final chances. The others will scatter into the night. But they might come back.",
      "Choose carefully. The ones you turn away don't disappear. They remember.",
    ];
    const storyText=draftPicked.length===0?pk(draftStory):draftPicked.length===1?pk(draftMid):pk(draftFinal);
    return(<div style={W}><div style={BG}/><style>{CSS}</style>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",zIndex:1,gap:14,padding:20,maxWidth:500}}>
        <div style={{fontSize:10,color:"#888",letterSpacing:4,fontFamily:"system-ui",animation:"fadeIn .5s ease-out"}}>{hasHearthLineage?"DESCENDANTS OF THE HEARTH":"THE GATHERING"}</div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          {[0,1,2].map(i=>(<div key={i} style={{width:10,height:10,borderRadius:"50%",
            background:i<draftPicked.length?"#4ade80":i===draftPicked.length?"#fbbf24":"#333",
            boxShadow:i===draftPicked.length?"0 0 8px #fbbf2444":"none",
            transition:"all .4s ease-out"}}/>))}
          <span style={{fontSize:10,color:"#666",fontFamily:"system-ui",marginLeft:4}}>{draftPicked.length+1} of 3</span>
        </div>
        <div style={{fontSize:11,color:"#d9770699",fontStyle:"italic",fontFamily:"system-ui",textAlign:"center",lineHeight:1.7,maxWidth:320,animation:"fadeIn 1s ease-out"}}>{storyText}</div>

        {/* ★ Rubber-banding hint. visible before first pick, all runs */}
        {draftPicked.length===0&&<div style={{fontSize:12,color:"#fb923c",fontFamily:"system-ui",textAlign:"center",maxWidth:300,lineHeight:1.6,animation:"fadeIn 1.5s ease-out .8s both",padding:"6px 12px",borderRadius:6,background:"#fb923c0d",border:"1px solid #fb923c22",fontWeight:700}}>⚖️ Strong cats attract weak strays. Choose wisely.</div>}

        {/* ★ v47: First-run draft. trust instinct, don't info-dump */}
        {isFirstRun&&draftPicked.length===0&&<div style={{fontSize:11,color:"#fbbf2466",fontFamily:"system-ui",textAlign:"center",maxWidth:280,lineHeight:1.5,animation:"fadeIn 1.2s ease-out .5s both"}}>Pick who catches your eye.</div>}
        {draftPicked.length>0&&<div style={{display:"flex",gap:6,alignItems:"center"}}>
          <span style={{fontSize:10,color:"#4ade8088",letterSpacing:2}}>CHOSEN</span>
          {draftPicked.map((c,i)=>(<CC key={i} cat={c} sm hl/>))}
        </div>}
        {/* ★ v47: Wave instruction: first-run gets none (personality lines invite clicking), returning gets tactical */}
        {!isFirstRun&&<div style={{fontSize:10,color:"#888",fontFamily:"system-ui",letterSpacing:1,marginTop:4}}>Choose one. The others scatter into the dark.</div>}
        <div style={{display:"flex",gap:14,justifyContent:"center",animation:"fadeIn .6s ease-out 2.0s both"}}>
          {draftPool.map((c,i)=>{
            const b=BREEDS[c.breed];
            const voice=getDraftVoice(c);
            return(<div key={c.id} onClick={()=>pickDraft(i)} style={{cursor:"pointer",textAlign:"center",maxWidth:110,
              animation:`fadeIn .5s ease-out ${2.2+i*.3}s both`,
              transition:"transform .2s, filter .2s",
            }}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-6px)";e.currentTarget.style.filter="brightness(1.15)";}}
            onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.filter="brightness(1)";}}>
              <div style={{animation:`float ${2.5+i*.4}s ease-in-out ${i*.3}s infinite`}}>
                <CC cat={c}/>
              </div>
              <div style={{fontSize:12,fontFamily:"system-ui",color:b.color,marginTop:4,lineHeight:1.3,fontWeight:700}}>{c.name.split(" ")[0]}</div>
              <div style={{fontSize:10,color:"#ffffff99",fontStyle:"italic",fontFamily:"system-ui",lineHeight:1.4,minHeight:28,marginTop:3}}>"{voice}"</div>
              {c.trait.name!=="Plain"&&<div style={{fontSize:9,color:tierColor(c.trait),fontFamily:"system-ui",marginTop:2,lineHeight:1.3,maxWidth:100}}>{c.trait.desc}</div>}
              {c.stats?.par&&<div style={{color:"#34d399",fontSize:9,fontFamily:"system-ui"}}>👪 {c.stats.par}</div>}
            </div>);
          })}
        </div>
        {!isFirstRun&&draftRejects.length>0&&<div style={{fontSize:10,color:"#555",fontFamily:"system-ui",fontStyle:"italic"}}>The ones you turned away haven't gone far...</div>}
      </div>
    </div>);
  }

  // ★ v32.5: NIGHT CARD - cinematic breathing room with threshold preview
  if(ph==="nightCard"&&nightCard){
    const blindNames=["Dusk","Midnight","Boss"];
    const blindKey=nightCard.blind===0?"dusk":nightCard.blind===1?"midnight":"boss";
    const epi=NIGHT_EPI[Math.min(nightCard.ante-1,4)];
    const flav=NIGHT_FLAVOR[Math.min(nightCard.ante-1,4)];
    const ncTgt=Math.round(getTarget(nightCard.ante,nightCard.blind,isFirstRun));
    const isFirstEver=meta&&meta.stats.r===0&&nightCard.ante===1&&nightCard.blind===0;
    const whisper=pk(BLIND_WHISPER[blindKey]);
    return(<div style={W}><div style={BG}/><style>{CSS}</style>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",zIndex:1,gap:10,padding:20}} onClick={()=>{setNightCard(null);setPh("playing");if(isFirstEver)setTimeout(startAutoPlay,100);}}>
        <div style={{fontSize:11,color:"#55555588",letterSpacing:3,fontFamily:"system-ui",animation:"fadeIn .6s ease-out",textTransform:"uppercase"}}>Night {nightCard.ante}</div>
        <div style={{fontSize:32,fontWeight:900,letterSpacing:8,color:"#fbbf24",fontFamily:"'Cinzel',serif",animation:"comboBurst .6s ease-out",textShadow:"0 0 40px #fbbf2444"}}>{blindNames[nightCard.blind].toUpperCase()}</div>
        {/* ★ v49: Blind whisper: narrative context for what this round means */}
        <div style={{fontSize:13,color:"#ffffff44",fontStyle:"italic",fontFamily:"system-ui",letterSpacing:2,animation:"fadeIn 1s ease-out",textAlign:"center",textShadow:"0 0 20px #ffffff11"}}>{whisper}</div>
        <div style={{fontSize:16,color:"#ffffff66",fontStyle:"italic",fontFamily:"'Cinzel',serif",textAlign:"center",maxWidth:320,lineHeight:1.7,animation:"fadeIn 1.2s ease-out",letterSpacing:1}}>{epi}</div>
        {/* ★ v34: Night subtitle. one-line flavor */}
        {NIGHT_SUB[Math.min(nightCard.ante-1,4)]&&<div style={{fontSize:12,color:"#ffffff33",fontStyle:"italic",fontFamily:"system-ui",textAlign:"center",maxWidth:280,lineHeight:1.5,animation:"fadeIn 1.5s ease-out"}}>{NIGHT_SUB[Math.min(nightCard.ante-1,4)]}</div>}
        {isNinthDawn&&<div style={{fontSize:10,color:"#fbbf2466",letterSpacing:4,fontFamily:"system-ui",animation:"fadeIn 1.8s ease-out"}}>THE NINTH DAWN</div>}
        {/* ★ v49: Threshold. the minimum to not be forgotten */}
        {(()=>{const ncMb=getMB();const ncHfx=getHeatFx(meta?.heat);const ncDiscs=3+ncMb.discards+(ncHfx.discMod||0);return(
        <div style={{display:"flex",gap:16,alignItems:"center",marginTop:12,animation:"fadeIn 1.5s ease-out .3s both"}}>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:10,color:"#666",letterSpacing:2,fontFamily:"system-ui"}}>THRESHOLD</div>
            <div style={{fontSize:isFirstEver?28:20,fontWeight:900,color:"#fbbf24",animation:isFirstEver?"glow 2s ease-in-out infinite":undefined,transition:"font-size .3s"}}>{ncTgt.toLocaleString()}</div>
          </div>
          <div style={{width:1,height:28,background:"#ffffff0a"}}/>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:10,color:"#666",letterSpacing:2,fontFamily:"system-ui"}}>HANDS</div>
            <div style={{fontSize:isFirstEver?28:20,fontWeight:900,color:"#3b82f6"}}>3</div>
          </div>
          <div style={{width:1,height:28,background:"#ffffff0a"}}/>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:10,color:"#666",letterSpacing:2,fontFamily:"system-ui"}}>DISCARDS</div>
            <div style={{fontSize:isFirstEver?28:20,fontWeight:900,color:"#ef4444"}}>{ncDiscs}</div>
          </div>
        </div>);})()}
        {/* ★ v47: First-run. one tight line, not a paragraph */}
        {isFirstEver&&<div style={{fontSize:11,color:"#4ade8088",fontFamily:"system-ui",animation:"fadeIn 2s ease-out .8s both"}}>Tap cats → Play Hand → Beat {ncTgt.toLocaleString()}</div>}
        <div style={{fontSize:10,color:"#44444466",fontFamily:"system-ui",marginTop:16,animation:`fadeIn 2s ease-out ${isFirstEver?1.2:.6}s both`}}>tap to begin</div>
      </div>
    </div>);
  }

  // ★ v28: COLONY FORMED - shows your drafted cats + the strays
  if(ph==="colonyFormed"&&colonyData){
    const{chosen,strays,strayOffset}=colonyData;
    const isFirstRun=!meta||meta.stats.r===0;
    // ★ v34: Stray origin narration — they aren't blank. They came from somewhere.
    const STRAY_ORIGINS={
      Autumn:["Found shivering in a collapsed tunnel. Born when the leaves turned.","Watched from the treeline for three days before coming in.","This one remembered things the others had forgotten.","Came from a colony that didn't make it past harvest."],
      Summer:["Walked out of the dark like it owed them money.","Still warm. Whatever happened to the last colony, this one ran.","Born in the longest day. Burned like it.","The loud one. Showed up yelling. Hasn't stopped."],
      Winter:["Was already in the shelter when they arrived. Said nothing.","Born in the deep cold. The cold never left.","This one watched the dark with something like patience.","The cold didn't bother them. Nothing did."],
      Spring:["Followed the youngest kitten in. Stayed for the rest.","Groomed everyone on arrival. Nobody asked. Nobody refused.","Born when the world thawed. Carried that warmth.","The gentle one. Gentle things survive too. Sometimes."],
    };
    const colonyLines=[
      "Three chose to stay. Thirteen others were already waiting.",
      "You picked three. But thirteen had picked this place long before you arrived.",
      "Three by choice. Thirteen by survival. None by accident.",
    ];
    const colonyCounts={};chosen.forEach(c=>{colonyCounts[c.breed]=(colonyCounts[c.breed]||0)+1;});strays.forEach(c=>{colonyCounts[c.breed]=(colonyCounts[c.breed]||0)+1;});
    const totalPow=[...chosen,...strays].reduce((s,c)=>s+c.power,0);
    const avgPow=(totalPow/16).toFixed(1);
    // Assign each stray a unique origin
    const strayOrigins=strays.map(c=>pk(STRAY_ORIGINS[c.breed]||STRAY_ORIGINS.Autumn));
    return(<div style={W}><div style={BG}/><style>{CSS}</style>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",zIndex:1,gap:14,padding:20,maxWidth:600}}>
        {isNinthDawn&&<div style={{fontSize:10,color:"#fbbf24",letterSpacing:6,fontFamily:"system-ui",animation:"float 3s ease-in-out infinite",marginBottom:-4}}>「 THE NINTH DAWN 」</div>}

        {/* ★ v47: FIRST RUN. cinematic. Just the 3 chosen, a line, and the button. */}
        {isFirstRun?<>
          <div style={{fontSize:10,color:"#55555566",letterSpacing:6,fontFamily:"system-ui",animation:"fadeIn 1.5s ease-out"}}>YOUR COLONY</div>
          <div style={{display:"flex",gap:16,justifyContent:"center",marginTop:8}}>
            {chosen.map((c,i)=>{const b=BREEDS[c.breed];return(
              <div key={c.id} style={{textAlign:"center",animation:`fadeIn .6s ease-out ${.3+i*.4}s both`}}>
                <CC cat={c} hl/>
                <div style={{fontSize:12,color:b.color,fontFamily:"system-ui",marginTop:4,fontWeight:700}}>{c.name.split(" ")[0]}</div>
                <div style={{fontSize:10,color:"#ffffff77",fontStyle:"italic",fontFamily:"system-ui",lineHeight:1.4,marginTop:2,maxWidth:100}}>"{getDraftVoice(c)}"</div>
              </div>);
            })}
          </div>
          <div style={{fontSize:12,color:"#888",fontStyle:"italic",fontFamily:"system-ui",textAlign:"center",lineHeight:1.6,maxWidth:340,marginTop:8,animation:"fadeIn 1.5s ease-out 1.2s both"}}>
            Three you chose. Thirteen strays who were already here.<br/>
            <span style={{color:"#55555566"}}>Sixteen souls against the dark.</span>
          </div>
        </>
        /* ★ RETURNING PLAYERS. full composition breakdown */
        :<>
          <div style={{fontSize:10,color:"#55555566",letterSpacing:6,fontFamily:"system-ui",animation:"epicReveal 2s ease-out forwards"}}>SURVIVE {MX} NIGHTS</div>
          {meta&&meta.stats.r>0&&<div style={{fontSize:10,color:"#55555544",fontFamily:"system-ui",letterSpacing:3}}>Colony #{(meta.stats.r||0)+1}</div>}
          <div style={{fontSize:11,color:"#888",letterSpacing:4,fontFamily:"system-ui",animation:"fadeIn 1s ease-out .4s both"}}>THE COLONY</div>
          <div style={{fontSize:15,color:"#d9770688",fontStyle:"italic",fontFamily:"system-ui",textAlign:"center",lineHeight:1.6,maxWidth:360,animation:"fadeIn 1.5s ease-out .3s both"}}>
            {pk(colonyLines)}
          </div>

          {/* ★ v35: Blood Memory */}
          {bloodMemMsg&&<div style={{padding:"8px 16px",borderRadius:8,background:"linear-gradient(135deg,#7a665208,#ef444408)",border:"1px solid #c084fc22",animation:"fadeIn 2s ease-out .6s both",textAlign:"center",maxWidth:380}}>
            <div style={{fontSize:10,color:"#c084fc",fontFamily:"system-ui",fontStyle:"italic",lineHeight:1.6}}>
              🩸 <b>{bloodMemMsg.heir.split(" ")[0]}</b> carries something old. {bloodMemMsg.trait.icon} <span style={{color:"#e8e6e3"}}>{bloodMemMsg.trait.name}</span>. inherited from <span style={{color:"#fbbf24"}}>{bloodMemMsg.ancestor}</span> of the Hearth.
              {bloodMemMsg.scarred&&<span style={{color:"#d97706"}}> The scar came with it.</span>}
            </div>
          </div>}

          <div style={{display:"flex",gap:20,justifyContent:"center",animation:"fadeIn 1.8s ease-out .5s both"}}>
            <div style={{textAlign:"center"}}><div style={{fontSize:32,fontWeight:900,color:"#fbbf24",letterSpacing:2,animation:"comboBurst .8s ease-out .8s both"}}>{14}</div><div style={{fontSize:10,color:"#555",letterSpacing:2,fontFamily:"system-ui"}}>SOULS</div></div>
            <div style={{width:1,height:40,background:"#ffffff0a"}}/>
            <div style={{textAlign:"center"}}><div style={{fontSize:32,fontWeight:900,color:"#ef4444",letterSpacing:2,animation:"comboBurst .8s ease-out 1s both"}}>{MX}</div><div style={{fontSize:10,color:"#555",letterSpacing:2,fontFamily:"system-ui"}}>NIGHTS</div></div>
          </div>
          {strayOffset&&strayOffset!==0&&<div style={{fontSize:10,color:strayOffset>0?"#4ade80aa":"#fb923caa",fontStyle:"italic",fontFamily:"system-ui",textAlign:"center",animation:"fadeIn 2s ease-out 1.4s both",maxWidth:340,lineHeight:1.5}}>
            {strayOffset>=2?"Weak cats attract strong strays. They had to be. your chosen carry less."
            :strayOffset===1?"Weak cats attract strong strays. Something to prove."
            :strayOffset===-1?"Strong cats attract weak strays. They followed the light, not the fight."
            :"Strong cats attract weak strays. Your chosen burn bright. the rest just watched."}
          </div>}

          <div style={{width:"100%",marginTop:4}}>
            <div style={{fontSize:10,color:"#4ade80",letterSpacing:2,marginBottom:6,textAlign:"center"}}>CHOSEN. YOUR EDGE</div>
            <div style={{display:"flex",gap:10,justifyContent:"center",animation:"fadeIn .6s ease-out .6s both"}}>
              {chosen.map(c=>(<div key={c.id} style={{textAlign:"center",cursor:"pointer"}} onClick={()=>setTraitTip(c)}>
                <CC cat={c} hl/>
                <div style={{fontSize:10,color:BREEDS[c.breed]?.color,fontFamily:"system-ui",marginTop:2,fontWeight:700}}>{c.name.split(" ")[0]}</div>
                <div style={{fontSize:10,color:"#888",fontFamily:"system-ui"}}>{c.trait.name!=="Plain"?c.trait.icon+" "+c.trait.name:"plain"}</div>
              </div>))}
            </div>
          </div>

          <div style={{width:"100%",marginTop:6}}>
            <div style={{fontSize:10,color:"#888",letterSpacing:2,marginBottom:6,textAlign:"center"}}>THE ONES WHO WERE ALREADY HERE</div>
            <div style={{display:"flex",gap:8,justifyContent:"center",animation:"fadeIn 1s ease-out .9s both"}}>
              {BK.map(b=>{const ct=(colonyCounts[b]||0)-(chosen.filter(c=>c.breed===b).length);return ct>0?<div key={b} style={{display:"flex",alignItems:"center",gap:3,padding:"4px 10px",borderRadius:6,background:BREEDS[b].bg,border:`1px solid ${BREEDS[b].color}22`}}>
                <span style={{fontSize:14}}>{BREEDS[b].icon}</span>
                <span style={{fontSize:13,fontWeight:700,color:BREEDS[b].color}}>{ct}</span>
              </div>:null;})}
              <div style={{display:"flex",alignItems:"center",gap:3,padding:"4px 10px",borderRadius:6,background:"#ffffff04",border:"1px solid #ffffff0a"}}>
                <span style={{fontSize:10,color:"#666",fontFamily:"system-ui"}}>13 strays · all Plain</span>
              </div>
            </div>
          </div>
        </>}

        {hearthDust>0&&<div style={{display:"flex",alignItems:"center",gap:6,padding:"8px 16px",borderRadius:8,background:"#c084fc0a",border:"1px solid #c084fc22",animation:"fadeIn 1.5s ease-out 1.4s both"}}>
          <span style={{fontSize:14}}>🏠</span>
          <span style={{fontSize:11,color:"#c084fc",fontFamily:"system-ui"}}>The Hearth radiates <span style={{fontWeight:700}}>+{hearthDust}✦</span></span>
        </div>}

        <button onClick={()=>{setColonyData(null);setNightCard({ante:1,blind:0});setPh("nightCard");}} style={{background:"linear-gradient(135deg,#fbbf24,#f59e0b)",color:"#0a0a1a",border:"none",borderRadius:10,padding:"14px 44px",fontSize:17,fontWeight:900,cursor:"pointer",letterSpacing:4,fontFamily:"'Cinzel',serif",marginTop:8,animation:`fadeIn .8s ease-out ${isFirstRun?1.8:0.8}s both`,boxShadow:"0 0 40px #fbbf2433",textTransform:"uppercase"}}>Enter the Night</button>
        {!isFirstRun&&<div style={{fontSize:10,color:"#ffffff15",fontFamily:"system-ui",marginTop:4,animation:"fadeIn 1s ease-out .5s both"}}>tap anywhere to continue</div>}
      </div>
    </div>);
  }

  if(ph==="title"){
    const mb=getMB(),hc=meta&&meta.cats.length>0,sd=meta?meta.dust:0;
    const hasRun=meta&&meta.stats.r>=1;
    const hasWin=meta&&meta.stats.w>=1;
    const showUpgrades=hasRun;
    const showHearth=hasWin;
    const showHeat=meta&&meta.stats.w>=2;
    const showStats=hasRun;
    const availTabs=["play"];if(showUpgrades)availTabs.push("✦ upgrades");if(showHearth)availTabs.push("hearth");
    const safeTab=availTabs.includes(tab)?tab:"play";
    return(<div style={W}><div style={BG}/><style>{CSS}</style>
      {/* ★ v39: Mute toggle. always accessible */}
      <button onClick={toggleMute} style={{position:"fixed",top:10,right:10,zIndex:200,background:"none",border:"none",fontSize:16,cursor:"pointer",opacity:.4,padding:6}} title={muted?"Unmute":"Mute"}>{muted?"🔇":"🔊"}</button>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",zIndex:1,gap:12,padding:20,textAlign:"center",maxWidth:600}}>
        <div style={{fontSize:15,color:"#ffffff55",fontStyle:"italic",fontFamily:"system-ui",textAlign:"center",maxWidth:360,lineHeight:1.7,animation:"fadeIn 2s ease-out",textShadow:"0 0 20px #ffffff08"}}>{getEpigraph(meta)}</div>
        {/* ★ v47: Hearth flame visualization. grows with saved cats */}
        <div style={{display:"flex",gap:1,alignItems:"flex-end",justifyContent:"center",height:meta&&meta.cats.length>0?28:16,marginTop:8,marginBottom:-4}}>
          {meta&&meta.cats.length>0?meta.cats.slice(0,20).map((c,i)=>{const bc=BREEDS[c.breed]?.color||"#fbbf24";const seed=(i*7+3)%10;return(
            <div key={i} style={{width:4,height:6+seed*.8,borderRadius:"50% 50% 50% 50% / 60% 60% 40% 40%",
              background:`linear-gradient(0deg,${bc},#fbbf24aa)`,
              animation:`breathe ${1.5+seed*.15}s ease-in-out ${i*.2}s infinite`,
              boxShadow:`0 0 4px ${bc}66`,opacity:.5+seed*.05}} title={c.name}/>);
          })
          /* First run: single tiny flame. the colony doesn't exist yet */
          :[0,1,2].map(i=>(
            <div key={i} style={{width:3,height:6+i*3,borderRadius:"50% 50% 50% 50% / 60% 60% 40% 40%",
              background:"linear-gradient(0deg,#d9770644,#fbbf2444)",
              animation:`breathe ${1.8+i*.3}s ease-in-out ${i*.3}s infinite`,
              opacity:.3}}/>))}
        </div>
        <h1 style={{fontSize:"clamp(32px,7vw,52px)",fontWeight:900,letterSpacing:6,lineHeight:1.1,background:"linear-gradient(135deg,#b85c2c,#fbbf24,#fef08a)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",margin:0}}>NINTH LIFE{meta?.ninthDawnCleared?" 🌅":""}</h1>
        <div style={{fontSize:10,color:"#88888888",letterSpacing:3,fontFamily:"system-ui",lineHeight:1.6,animation:"fadeIn 2.5s ease-out"}}>A colony deckbuilder. Match seasons. Multiply everything.</div>

        {hasRun&&meta&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
          <div style={{display:"flex",gap:12,alignItems:"center"}}>
            <div style={{color:"#c084fc",fontSize:13,fontWeight:700}}>✦ {sd} Stardust</div>
            {meta.cats.length>0&&<div style={{fontSize:10,color:"#c084fc88",fontFamily:"system-ui"}}>🏠 +{calcTotalHearthDust(meta.cats,getMB().dustBonus||0,getHeatFx(meta?.heat).dustMult||1).total}/run</div>}
          </div>
          {showHeat&&(meta.heat||0)>0&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <div style={{display:"flex",gap:2,alignItems:"center"}}>{Array.from({length:meta.heat}).map((_,i)=>(<span key={i} style={{fontSize:10,filter:"drop-shadow(0 0 3px #ef4444)"}}>🔥</span>))}<span style={{fontSize:10,color:"#ef4444",fontFamily:"system-ui"}}>Heat {meta.heat}</span><span style={{fontSize:10,color:"#4ade80",fontFamily:"system-ui"}}>+{(meta.heat)*25}% hearth</span></div>
          </div>}
        </div>}

        {/* ★ v47: Breed icons removed. meaningless before first play */}

        {/* ★ v32.5: Progressive tabs. only show what the player has earned */}
        {availTabs.length>1&&<div style={{display:"flex",gap:3,background:"#ffffff08",borderRadius:8,padding:2}}>
          {availTabs.map(t=>(<button key={t} onClick={()=>setTab(t)} style={{padding:"5px 14px",fontSize:10,border:"none",borderRadius:6,cursor:"pointer",background:safeTab===t?"#ffffff12":"transparent",color:safeTab===t?"#e8e6e3":"#666",fontFamily:"'Cinzel',serif",letterSpacing:1,textTransform:"uppercase",fontWeight:safeTab===t?700:400}}>{t}</button>))}
        </div>}

        {safeTab==="play"&&<>
          {hc&&<div style={{width:"100%"}}>
            <div style={{fontSize:10,color:"#888",letterSpacing:2,marginBottom:5}}>WHO WALKS WITH YOU INTO THE DARK?</div>
            <div style={{display:"flex",gap:5,overflowX:"auto",justifyContent:"center",flexWrap:"wrap"}}>
              {meta.cats.slice(-8).map((c,i)=>{const tr=TRAITS.find(t=>t.name===c.trait.name)||c.trait;const cat={...c,id:`ct${i}`,trait:tr};const isSel=starter&&starter._i===i;
                return(<div key={i} style={{cursor:"pointer"}} onClick={()=>setStarter(isSel?null:{...c,trait:tr,_i:i})}><CC cat={cat} sm sel={isSel}/></div>);})}
            </div>
          </div>}
          {/* ★ v47: Continue saved colony */}
          {savedRun&&<button onClick={()=>{Audio.init();resumeRun(savedRun);}} style={{...BTN("linear-gradient(135deg,#4ade80,#22c55e)","#0a0a1a"),padding:"14px 48px",fontSize:18,letterSpacing:3,textTransform:"uppercase",boxShadow:"0 0 30px #4ade8044",animation:"float 3s ease-in-out infinite",marginBottom:6}}>Continue Colony <span style={{fontSize:11,opacity:.7}}>Night {savedRun.ante}</span></button>}
          <button onClick={()=>{Audio.init();if(!meta?.stats?.r){setGuide({step:0,msg:""});startGame(starter);setPh("firstIntro");}else{startGame(starter);}}} style={{...BTN("linear-gradient(135deg,#fbbf24,#f59e0b)","#0a0a1a"),padding:"14px 48px",fontSize:18,letterSpacing:3,textTransform:"uppercase",boxShadow:"0 0 30px #fbbf2444"}}>{savedRun?"New Colony":"Enter the Night"}</button>
          {/* ★ v34: Ninth Dawn button. the endgame */}
          {meta&&canUnlockNinthDawn(meta)&&!meta.ninthDawnCleared&&<button onClick={()=>{Audio.init();startNinthDawn();}} style={{...BTN("linear-gradient(135deg,#fbbf24,#fef08a)","#0a0a1a"),padding:"10px 36px",fontSize:13,letterSpacing:4,textTransform:"uppercase",boxShadow:"0 0 20px #fbbf2444",animation:"float 3s ease-in-out infinite"}}>「 THE NINTH DAWN 」</button>}
          {meta?.ninthDawnCleared&&<div style={{fontSize:11,color:"#fbbf2466",fontFamily:"system-ui",fontStyle:"italic"}}>🌅 The dawn holds.</div>}
          {/* ★ v34: Heat flavor text */}
          {showHeat&&(meta.heat||0)>0&&HEAT_FLAVOR[meta.heat]&&<div style={{fontSize:11,color:"#ef444466",fontStyle:"italic",fontFamily:"system-ui"}}>{HEAT_FLAVOR[meta.heat]}</div>}
          {/* ★ v35: Heat Relics display */}
          {(meta?.relics||[]).length>0&&<div style={{display:"flex",gap:4,flexWrap:"wrap",justifyContent:"center"}}>
            {(meta.relics||[]).sort().map(h=>{const r=HEAT_RELICS[h];return r?(<div key={h} style={{padding:"3px 8px",borderRadius:5,background:"#fbbf2408",border:"1px solid #fbbf2422",fontSize:10,color:"#fbbf24",fontFamily:"system-ui"}} title={`${r.name}: ${r.desc}\n"${r.flavor}"`}>{r.icon} {r.name}</div>):null;})}
          </div>}
          {/* ★ v47: First-run. concise, no spoilers */}
          {(!meta||meta.stats.r===0)&&<div style={{fontSize:11,color:"#fbbf2466",fontFamily:"system-ui",lineHeight:1.5,textAlign:"center",maxWidth:300}}>3 nights. 14 cats. The game teaches as you play.</div>}
          {meta&&<div style={{display:"flex",gap:14,fontFamily:"system-ui",fontSize:10,color:"#555",alignItems:"center",flexWrap:"wrap"}}><button onClick={()=>setSeen(s=>({...s,howToPlay:!s.howToPlay}))} style={{background:"none",border:"1px solid #ffffff12",borderRadius:12,color:"#555",fontSize:10,cursor:"pointer",padding:"2px 8px",fontFamily:"system-ui"}}>How to Play</button><span>{meta.stats.r} runs</span><span>{meta.stats.w} wins</span></div>}
          {seen.howToPlay&&<div style={{padding:"10px 16px",borderRadius:10,background:"#ffffff06",border:"1px solid #ffffff0a",maxWidth:400,fontSize:11,fontFamily:"system-ui",color:"#aaa",lineHeight:1.6,animation:"fadeIn .4s ease-out",textAlign:"left"}}>
            <div style={{fontWeight:700,color:"#fbbf24",marginBottom:4}}>Quick Rules</div>
            Draw 7 cats. Pick up to 5. Match seasons for stronger hands. 2 of a kind = Kin, 3 = Clowder, 4 = Colony. Your score = Chips × Mult. Beat the target to survive.
            <div style={{marginTop:6}}>Scars (×1.25) and Bonds (×1.5) make your cats stronger. Nerve builds when you crush targets. at max, it more than doubles everything. In the Den, shelter cats to breed them. Everyone else enters the wilds to train, fight, and grow.</div>
            <div style={{marginTop:6,color:"#67e8f9"}}>🎯 Tip: Match seasons for Clowder/Colony hands. Stack traits for big multipliers. Bonds and scars multiply everything.</div>
            <div style={{marginTop:6,color:"#34d399"}}>👪 Lineage: Parent + child in hand = ×1.15. Shelter parent with child to teach traits. Save a M/F pair to the Hearth. their descendants start your next colony.</div>
          </div>}
          {meta&&(mb.gold>0||mb.hands>0||mb.discards>0||mb.fervor>0)&&<div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center",fontFamily:"system-ui",fontSize:10}}>
            {mb.gold>0&&<span style={{color:"#fbbf24"}}>+{mb.gold}🐟</span>}{mb.hands>0&&<span style={{color:"#3b82f6"}}>+{mb.hands}H</span>}{mb.discards>0&&<span style={{color:"#ef4444"}}>+{mb.discards}D</span>}{mb.fervor>0&&<span style={{color:"#d97706"}}>N+{mb.fervor}</span>}</div>}
        </>}

        {safeTab==="✦ upgrades"&&meta&&<div style={{width:"100%",display:"flex",flexDirection:"column",gap:6}}>
          {(()=>{
            // ★ v34 ECON: Advanced upgrades (u_scr, u_pot, u_grd) unlock after 5+ upgrade levels purchased
            const totalLevels=Object.values(meta.ups||{}).reduce((s,v)=>s+v,0);
            const advancedIds=["u_scr","u_pot","u_grd"];
            const visibleUps=UPGRADES.filter(u=>!advancedIds.includes(u.id)||totalLevels>=5);
            return visibleUps.map(u=>{const o=meta.ups[u.id]||0,mx=o>=u.max,can=meta.dust>=u.cost&&!mx;
            const isAdv=advancedIds.includes(u.id);
            return(<div key={u.id} onClick={()=>can&&buyUpg(u)} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderRadius:8,background:mx?"#4ade8008":isAdv?"#c084fc06":"#ffffff04",border:`1px solid ${mx?"#4ade8033":can?"#c084fc33":"#ffffff0a"}`,cursor:can?"pointer":"default",opacity:can||mx?1:.5}}>
              <span style={{fontSize:18}}>{u.icon}</span>
              <div style={{flex:1,textAlign:"left"}}><div style={{fontSize:11,fontWeight:700,color:mx?"#4ade80":isAdv?"#c084fc":"#e8e6e3"}}>{u.name}{o>0?` (${o}/${u.max})`:""}{isAdv&&o===0?" ✦":"" }</div><div style={{fontSize:10,color:"#888",fontFamily:"system-ui"}}>{u.desc}</div></div>
              <div style={{fontSize:11,color:mx?"#4ade80":"#c084fc",fontWeight:700}}>{mx?"MAX":`✦${u.cost}`}</div>
            </div>);});
          })()}
        </div>}

        {safeTab==="hearth"&&meta&&<div style={{width:"100%",display:"flex",flexDirection:"column",gap:8}}>
          {meta.cats.length>0?(()=>{
            const dustBonus=getMB().dustBonus||0;
            const heatMult=getHeatFx(meta?.heat).dustMult||1;
            const hd=calcTotalHearthDust(meta.cats,dustBonus,heatMult);
            const activeCats=meta.cats.filter(c=>!c.enshrined);
            const enshrinedCats=meta.cats.filter(c=>c.enshrined);
            return(<>
              <div style={{textAlign:"center",padding:"8px 0"}}>
                <div style={{fontSize:10,color:"#c084fc88",letterSpacing:3,fontFamily:"system-ui"}}>STARDUST PER RUN</div>
                <div style={{fontSize:24,fontWeight:900,color:"#c084fc",textShadow:"0 0 20px #c084fc44"}}>+{hd.total}✦</div>
                {/* ★ v35: Fading Light. maintenance breakdown */}
                <div style={{fontSize:10,color:"#c084fc66",fontFamily:"system-ui",lineHeight:1.6}}>
                  {(dustBonus>0||heatMult>1||hd.maintenance>0)&&<>
                    <span>Gross {hd.gross}✦</span>
                    {dustBonus>0&&<span> (×{1+dustBonus} bonus)</span>}
                    {heatMult>1&&<span> (×{heatMult} heat)</span>}
                    {hd.maintenance>0&&<span style={{color:"#ef444488"}}> − {hd.maintenance}✦ upkeep ({hd.activeCats-8} above 8)</span>}
                  </>}
                </div>
                <div style={{fontSize:10,color:"#666",fontFamily:"system-ui"}}>Each saved cat radiates stardust when you enter the night</div>
              </div>
              {/* Active Hearth cats */}
              {activeCats.length>0&&<>
                <div style={{fontSize:10,color:"#888",letterSpacing:2,fontFamily:"system-ui"}}>HEARTH ({activeCats.length} cats{hd.maintenance>0?`. ${hd.maintenance}✦ upkeep`:""})</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"center"}}>
                  {activeCats.map((c,i)=>{const tr=TRAITS.find(t=>t.name===c.trait.name)||c.trait;const perCat=calcHearthDust([c])[0].dust;
                    return(<div key={`h${i}`} style={{textAlign:"center",position:"relative"}}>
                      <CC cat={{...c,id:`ht${i}`,trait:tr}} sm/>
                      <div style={{fontSize:10,fontWeight:700,color:"#c084fc",fontFamily:"system-ui",marginTop:1,textShadow:"0 0 6px #c084fc44"}}>+{perCat}✦</div>
                      {/* ★ v35: Enshrine button. appears at 20+ cats */}
                      {meta.cats.length>=20&&<button onClick={()=>{
                        const u={...meta,cats:meta.cats.map(x=>x.name===c.name&&x.savedAt===c.savedAt?{...x,enshrined:true}:x)};
                        setMeta(u);saveS(u);toast("🌟",`${c.name.split(" ")[0]} enshrined. Their light is permanent now.`,"#fbbf24");
                      }} style={{fontSize:10,color:"#fbbf2488",background:"transparent",border:"1px solid #fbbf2422",borderRadius:3,padding:"1px 4px",cursor:"pointer",marginTop:1}}>Enshrine</button>}
                    </div>);
                  })}
                </div>
              </>}
              {/* ★ v35: Enshrined cats. zero maintenance, golden border */}
              {enshrinedCats.length>0&&<>
                <div style={{fontSize:10,color:"#fbbf2488",letterSpacing:2,fontFamily:"system-ui",marginTop:4}}>🌟 ENSHRINED ({enshrinedCats.length}). eternal, no upkeep</div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap",justifyContent:"center"}}>
                  {enshrinedCats.map((c,i)=>{const tr=TRAITS.find(t=>t.name===c.trait.name)||c.trait;
                    return(<div key={`en${i}`} style={{textAlign:"center",position:"relative"}}>
                      <div style={{border:"2px solid #fbbf2444",borderRadius:8,padding:1}}>
                        <CC cat={{...c,id:`en${i}`,trait:tr}} sm/>
                      </div>
                      <div style={{fontSize:10,color:"#fbbf2466",fontFamily:"system-ui"}}>🌟</div>
                    </div>);
                  })}
                </div>
              </>}
            </>);
          })():<div style={{color:"#555",fontSize:11,fontFamily:"system-ui",textAlign:"center",padding:"20px 0"}}>
            <div style={{fontSize:28,opacity:.3,marginBottom:8}}>🏠</div>
            No survivors yet. Win a run and save a cat to the Hearth.<br/>
            <span style={{color:"#c084fc88",fontSize:10}}>Each saved cat will generate ✦ Stardust at the start of every run.</span>
          </div>}
          <div style={{display:"flex",gap:6,justifyContent:"center"}}>
            {BK.map(b=>{const has=(meta.stats.disc||[]).some(d=>d.startsWith(b));return(<span key={b} style={{fontSize:12,opacity:has?1:.2,filter:has?"none":"grayscale(1)"}} title={has?`${b} saved`:`${b} needed`}>{BREEDS[b].icon}</span>);})}
            {BK.every(b=>(meta.stats.disc||[]).some(d=>d.startsWith(b)))&&<span style={{fontSize:10,color:"#4ade80",fontFamily:"system-ui",fontWeight:700}}>✓ All seasons!</span>}
          </div>
          {(meta.achv||[]).length>0&&<div>
            <div style={{fontSize:10,color:"#888",letterSpacing:2,marginBottom:3}}>ACHIEVEMENTS</div>
            <div style={{display:"flex",gap:4,flexWrap:"wrap",justifyContent:"center"}}>
              {ACHIEVEMENTS.filter(a=>(meta.achv||[]).includes(a.id)).map(a=>(<span key={a.id} style={{fontSize:10,padding:"3px 8px",borderRadius:5,background:"#fbbf2411",border:"1px solid #fbbf2422",color:"#fbbf24",fontFamily:"system-ui"}} title={a.desc}>{a.icon} {a.name}</span>))}
            </div>
          </div>}
          <div style={{display:"flex",gap:4,flexWrap:"wrap",justifyContent:"center",opacity:.4}}>
            {ACHIEVEMENTS.filter(a=>!(meta.achv||[]).includes(a.id)).map(a=>(<span key={a.id} style={{fontSize:10,padding:"2px 6px",borderRadius:4,background:"#ffffff04",border:"1px solid #ffffff08",color:"#555",fontFamily:"system-ui"}} title={a.desc}>{a.icon} {a.name}</span>))}
          </div>
          {/* ★ v44: THE RECORD. enhanced memorial with constellation + stats */}
          {meta.ninthDawnCleared&&<div style={{marginTop:8,padding:"12px 16px",borderRadius:10,background:"linear-gradient(135deg,#fbbf2408,#7a665208)",border:"1px solid #fbbf2422"}}>
            <div style={{fontSize:12,color:"#fbbf24",letterSpacing:4,textAlign:"center",fontWeight:700}}>🌅 THE RECORD</div>
            <div style={{fontSize:10,color:"#fbbf2466",fontFamily:"system-ui",textAlign:"center",marginTop:3,marginBottom:8}}>Every cat who ever carried the colony's name.</div>
            {/* Constellation view */}
            <div style={{position:"relative",width:"100%",maxWidth:300,height:300,margin:"0 auto",marginBottom:8}}>
              <div style={{position:"absolute",inset:0,borderRadius:"50%",border:"1px solid #ffffff06"}}/>
              <div style={{position:"absolute",inset:"15%",borderRadius:"50%",border:"1px solid #ffffff04"}}/>
              {meta.cats.map((c,i)=>{
                const angle=(i/meta.cats.length)*Math.PI*2-Math.PI/2;
                const radius=c.enshrined?90:120;
                const cx=150+Math.cos(angle)*radius;
                const cy=150+Math.sin(angle)*radius;
                const dustVal=c.power*2+(c.trait?.tier==="mythic"?15:c.trait?.tier==="legendary"?10:(c.trait?.tier==="rare"||c.trait?.tier==="rare_neg")?6:c.trait?.name!=="Plain"?3:0);
                const dotSize=Math.max(6,Math.min(14,4+dustVal/3));
                const col=BREEDS[c.breed]?.color||"#888";
                return(<div key={i} title={`${c.name}. P${c.power} ${c.breed} ${c.trait?.icon||""} ${c.trait?.name||"Plain"}${c.bonded?" 💕":""}${c.scarred?" ⚔":""}\nSaved from Night ${c.fromAnte||"?"}`} style={{
                  position:"absolute",left:cx-dotSize/2,top:cy-dotSize/2,width:dotSize,height:dotSize,
                  borderRadius:"50%",background:col,boxShadow:`0 0 ${c.enshrined?12:6}px ${col}66`,
                  border:c.enshrined?"2px solid #fbbf24":"1px solid #ffffff22",
                  cursor:"pointer",transition:"all .3s",zIndex:1
                }}/>);
              })}
              <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",textAlign:"center"}}>
                <div style={{fontSize:24,opacity:.5}}>🔥</div>
                <div style={{fontSize:10,color:"#fbbf2466",fontFamily:"system-ui"}}>{meta.cats.length} saved</div>
              </div>
            </div>
            {/* Stats summary */}
            {(()=>{
              const cats=meta.cats;
              const totalDust=cats.reduce((s,c)=>s+c.power*2+(c.trait?.tier==="mythic"?15:c.trait?.tier==="legendary"?10:(c.trait?.tier==="rare"||c.trait?.tier==="rare_neg")?6:c.trait?.name!=="Plain"?3:0)+(c.bonded?8:0)+(c.scarred?3:0),0);
              const byCounts={};cats.forEach(c=>{byCounts[c.breed]=(byCounts[c.breed]||0)+1;});
              const longestSurvivor=cats.reduce((best,c)=>(c.stats?.tp||0)>(best.stats?.tp||0)?c:best,cats[0]);
              const mostScarred=cats.filter(c=>c.scarred).length;
              const totalRuns=meta.stats.r||0;
              return(<div style={{display:"flex",flexDirection:"column",gap:3,fontSize:10,fontFamily:"system-ui",color:"#888",lineHeight:1.5}}>
                <div style={{display:"flex",justifyContent:"space-between"}}><span>Saved</span><span style={{color:"#fbbf24",fontWeight:700}}>{cats.length} cats across {totalRuns} runs</span></div>
                <div style={{display:"flex",justifyContent:"space-between"}}><span>Total stardust generated</span><span style={{color:"#c084fc",fontWeight:700}}>{totalDust}✦</span></div>
                <div style={{display:"flex",justifyContent:"space-between"}}><span>Seasons</span><span>{Object.entries(byCounts).map(([b,n])=><span key={b} style={{color:BREEDS[b]?.color}}>{BREEDS[b]?.icon}{n} </span>)}</span></div>
                {longestSurvivor&&<div style={{display:"flex",justifyContent:"space-between"}}><span>Most played</span><span style={{color:BREEDS[longestSurvivor.breed]?.color}}>{longestSurvivor.name.split(" ")[0]} ({longestSurvivor.stats?.tp||0} plays)</span></div>}
                {mostScarred>0&&<div style={{display:"flex",justifyContent:"space-between"}}><span>Battle-scarred</span><span style={{color:"#ef4444"}}>{mostScarred} warriors</span></div>}
                {(()=>{const pairs=getHearthPairs(cats);return pairs.length>0?<div style={{display:"flex",justifyContent:"space-between"}}><span>Bloodlines</span><span style={{color:"#34d399"}}>{pairs.length} pair{pairs.length>1?"s":""}. descendants draft next run</span></div>:null;})()}
              </div>);
            })()}
            {/* Name list */}
            <div style={{display:"flex",gap:3,flexWrap:"wrap",justifyContent:"center",marginTop:8}}>
              {meta.cats.map((c,i)=>{const hasPair=c.pairId&&meta.cats.some((x,j)=>j!==i&&x.pairId===c.pairId);return(<span key={i} style={{fontSize:10,color:BREEDS[c.breed]?.color||"#888",fontFamily:"system-ui",padding:"2px 6px",borderRadius:3,background:c.enshrined?"#fbbf2411":"#ffffff06",border:c.enshrined?"1px solid #fbbf2433":hasPair?"1px solid #34d39933":"none"}}>{c.enshrined?"🌟 ":""}{hasPair?"👪 ":""}{c.name.split(" ")[0]} {c.sex==="M"?"♂":"♀"}</span>);})}
            </div>
            <div style={{fontSize:10,color:"#55555566",fontFamily:"system-ui",textAlign:"center",marginTop:8,fontStyle:"italic"}}>Nine colonies. One survived. Not because it was the strongest. Because someone remembered all the rest.</div>
          </div>}
        </div>}


      </div>
    </div>);
  }

  // v10: ANTE TRANSITION
  if(anteUp){
    return(<div style={W}><div style={BG}/><style>{CSS}</style>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",zIndex:1,gap:16,padding:20}}>
        <div style={{fontSize:13,color:"#ffffff55",fontStyle:"italic",fontFamily:"'Cinzel',serif",textAlign:"center",maxWidth:300,lineHeight:1.6,animation:"fadeIn 1.5s ease-out",letterSpacing:1}}>{NIGHT_EPI[Math.min(anteUp.to-1,4)]}</div>
        <div style={{fontSize:72,fontWeight:900,background:"linear-gradient(135deg,#f59e0b,#fef08a)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",animation:"scorePop .6s ease-out",letterSpacing:8,marginTop:8}}>{anteUp.to}</div>
        <ProgressMap ante={anteUp.to} blind={0} mx={MX}/>
        <div style={{fontFamily:"system-ui",fontSize:10,color:"#666",marginTop:4}}>Threshold: <span style={{color:"#e8e6e3",fontWeight:700}}>{anteUp.target.toLocaleString()}</span></div>
        {/* ★ v49: Escalation narrative. why it gets harder */}
        {ANTE_ESCALATION[Math.min(anteUp.to-1,4)]&&<div style={{fontSize:12,color:"#fbbf2466",fontStyle:"italic",fontFamily:"system-ui",animation:"fadeIn 1.4s ease-out",textAlign:"center",maxWidth:320,lineHeight:1.6,textShadow:"0 0 15px #fbbf2422"}}>{ANTE_ESCALATION[Math.min(anteUp.to-1,4)]}</div>}
        {/* ★ v32.5: Nerve decay notification */}
        {anteUp.to>1&&<div style={{fontSize:11,color:"#d9770688",fontStyle:"italic",fontFamily:"system-ui",animation:"fadeIn 1.2s ease-out",textAlign:"center"}}>⚡ Morning comes. The dark took a piece of their nerve. (−1 Nerve)</div>}
        
        {runLog.length>0&&<div style={{maxWidth:350,width:"100%"}}>
          <div style={{fontSize:10,color:"#555",letterSpacing:2,marginBottom:4}}>LAST NIGHT</div>
          <div style={{display:"flex",flexDirection:"column",gap:2,maxHeight:120,overflowY:"auto"}}>
            {runLog.filter(e=>e.ante===anteUp.from).slice(-6).map((e,i)=>(<div key={i} style={{fontSize:10,fontFamily:"system-ui",color:e.type==="death"?"#ef4444":e.type==="breed"?"#4ade80":e.type==="hand"?"#fbbf24":"#666",padding:"1px 4px"}}>
              {e.type==="draft"&&<span>Drafted: {e.data.picked}</span>}
              {e.type==="hand"&&<span>{e.data.type}: {e.data.score.toLocaleString()}</span>}
              {e.type==="breed"&&<span>{e.data.baby} born ({e.data.breed})</span>}
              {e.type==="fight"&&<span>{e.data.loser} scarred (-{e.data.dmg}P)</span>}
              {e.type==="death"&&<span>{e.data.victim} was lost</span>}
              {e.type==="night"&&<span>Night {e.data.to} begins</span>}
              {e.type==="phoenix"&&<span>{e.data.risen} rose from the ashes!</span>}
              {e.type==="mentor"&&<span>{e.data.elder} mentored {e.data.young}</span>}
              {e.type==="found"&&<span>{e.data.cat} found rations</span>}
              {e.type==="growth"&&<span>{e.data.cat} grew stronger</span>}
              {e.type==="wanderer"&&<span>{e.data.cat} joined</span>}
              {e.type==="reward"&&<span>Reward: {e.data.name}</span>}
              {e.type==="event"&&<span>{e.data.title}: {e.data.choice}</span>}
            </div>))}
          </div>
        </div>}
        <button onClick={()=>{setAnteUp(null);}} style={{...BTN("linear-gradient(135deg,#fbbf24,#f59e0b)","#0a0a1a"),padding:"12px 40px",fontSize:15,marginTop:8}}>Continue</button>
      </div>
    </div>);
  }

  // BOSS INTRO - cinematic, sparse
  if(ph==="bossIntro"){const b=boss||BOSSES[0];
    // ★ v32: Build boss context for dynamic dialogue
    const bossCtx={fallen:fallen.length,fallenName:fallen.length>0?fallen[fallen.length-1].name.split(" ")[0]:"",scarred:allC.filter(c=>c.scarred).length,bonded:allC.filter(c=>c.bondedTo).length,colony:allC.length,clutch:false,grudges:allC.reduce((s,c)=>(c.grudgedWith||[]).length+s,0)/2,deathless:fallen.length===0,gold};
    const dynamicTaunt=b.tauntFn?b.tauntFn(bossCtx):null;
    return(<div style={W}><div style={BG}/><style>{CSS}</style>
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",zIndex:1,gap:20,padding:20,maxWidth:500}}>
      <div style={{fontSize:72,filter:"drop-shadow(0 0 30px #ef444466)",animation:"fadeIn 1.2s ease-out"}}>{b.icon}</div>
      <h2 style={{fontSize:30,color:"#ef4444",letterSpacing:8,margin:0,textShadow:"0 0 40px #ef444488",animation:"tierReveal 1s ease-out"}}>{b.name}</h2>
      <div style={{fontSize:17,color:"#ef4444",fontFamily:"system-ui",fontStyle:"italic",textAlign:"center",opacity:.8,animation:"fadeIn 1.5s ease-out",lineHeight:1.6,maxWidth:360,textShadow:"0 0 20px #ef444422"}}>"{b.taunt}"</div>
      {dynamicTaunt&&<div style={{fontSize:14,color:"#ef444488",fontFamily:"system-ui",fontStyle:"italic",textAlign:"center",animation:"fadeIn 2s ease-out"}}>"{dynamicTaunt}"</div>}
      {/* ★ v34: Boss traits. modifier badges */}
      {bossTraits.length>0&&<div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"center",animation:"fadeIn 1.8s ease-out",maxWidth:400}}>
        {bossTraits.map((t,i)=>(<div key={i} style={{padding:"8px 14px",borderRadius:8,background:"#ef444415",border:"1px solid #ef444433",textAlign:"center",minWidth:120,maxWidth:180}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
            <span style={{fontSize:16}}>{t.icon}</span>
            <span style={{fontSize:11,color:"#ef4444",fontWeight:700,letterSpacing:1}}>{t.name}</span>
          </div>
          <div style={{fontSize:11,color:"#ef4444cc",fontFamily:"system-ui",marginTop:3,lineHeight:1.3}}>{t.desc}</div>
          <div style={{fontSize:10,color:"#ef444455",fontStyle:"italic",fontFamily:"system-ui",marginTop:2}}>{t.flavor}</div>
        </div>))}
      </div>}
      <div style={{fontSize:11,color:"#ef444466",fontStyle:"italic",fontFamily:"system-ui",letterSpacing:2,animation:"fadeIn 2.5s ease-out"}}>{b.lore}</div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"center",marginTop:4}}>{curses.map((c,i)=>(<div key={i} style={{padding:"6px 10px",borderRadius:8,background:"#ef444408",border:"1px solid #ef444433",textAlign:"center",minWidth:90}}><span style={{fontSize:16}}>{c.icon}</span><div style={{fontSize:10,color:"#ef4444",fontWeight:600,marginTop:1}}>{c.name}</div><div style={{fontSize:10,color:"#ef444488",fontFamily:"system-ui",marginTop:1}}>{c.desc}</div></div>))}</div>
      {cfx.exileBreed&&<div style={{fontSize:11,color:"#ef444488",fontFamily:"system-ui"}}>{BREEDS[cfx.exileBreed].icon} {cfx.exileBreed} exiled</div>}
      <div style={{fontSize:12,color:"#666",fontFamily:"system-ui",marginTop:8}}>Threshold: <span style={{color:"#ef4444",fontWeight:700,fontSize:16}}>{eTgt().toLocaleString()}</span>
        {(meta?.heat||0)>0&&<span style={{color:"#ef444488",fontSize:10}}> (Heat +{(meta.heat||0)*10}%)</span>}
      </div>
      {/* ★ v35: Relic 3 (The Vigil). the colony learned to read the dark's patterns */}
      {hasRelic(3)&&<div style={{fontSize:10,color:"#4ade8066",fontFamily:"system-ui",fontStyle:"italic",textAlign:"center",maxWidth:300,lineHeight:1.5,animation:"fadeIn 2.5s ease-out",padding:"4px 12px",borderRadius:6,background:"#4ade8008",border:"1px solid #4ade8018"}}>
        👁️ The Vigil whispers: {b.id==="hunger"?"Bonds score double here. Fill every hand.":b.id==="territory"?"Scars make you stronger. The Territory respects fighters.":b.id==="mother"?"Don't spread thin. Pick your best five and commit.":b.id==="swarm"?"Nerve is everything. Build it before you get here.":b.id==="forgetting"?"Every name matters. Play your bonded pairs.":b.id==="fraying"?"Resolve your grudges. Or use them. 'Something to Prove' is powerful here.":b.id==="eclipse"?"Don't rest. Momentum carries through.":b.id==="ember"?"Give everything. One more hand is all it takes.":"Trust the colony."}
      </div>}
      <button onClick={()=>setPh("playing")} style={{...BTN("linear-gradient(135deg,#ef4444,#dc2626)","#fff"),padding:"12px 40px",fontSize:15}}>Defend</button>
    </div></div>);}


  // ═══════════════════════════════════════════════════
  // v15: COLONY EVENT SCREEN
  // ═══════════════════════════════════════════════════
  if(ph==="event"&&colEvent){
    const evt=colEvent,tgts=colTargets;
    const allC2=[...hand,...draw,...disc];
    const evtCtx={
      all:allC2,colony:allC2.length,fallen,night:ante,nerve:NERVE[ferv].name,
      scarred:allC2.filter(c=>c.scarred).length,injured:allC2.filter(c=>c.injured).length,
      bonded:allC2.filter(c=>c.bondedTo).length,grudges:allC2.reduce((s,c)=>(c.grudgedWith||[]).length+s,0)/2,
      gold,isNinthDawn,seasons:BK.map(b=>({name:b,count:allC2.filter(c=>c.breed===b).length})).filter(s=>s.count>0).sort((a,b)=>b.count-a.count),
    };
    const evtText=evt.textFn?evt.textFn(tgts,evtCtx):evt.text;
    return(<div style={W}><div style={BG}/><style>{CSS}</style>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",zIndex:1,gap:0,padding:20,maxWidth:480}}>
        {/* Atmosphere header */}
        <div style={{fontSize:10,color:"#ffffff15",letterSpacing:6,fontFamily:"system-ui",marginBottom:16,animation:"fadeIn 1.2s ease-out"}}>NIGHT {ante}. {["DUSK","MIDNIGHT","AFTER THE BOSS"][blind].toUpperCase()}</div>
        {/* Icon. large, atmospheric */}
        <div style={{fontSize:64,marginBottom:8,animation:"fadeIn .6s ease-out",filter:"drop-shadow(0 0 30px #ffffff11)",opacity:.85}}>{evt.icon}</div>
        {/* Title. understated */}
        <h2 style={{fontSize:20,color:"#e8e6e3cc",letterSpacing:5,margin:"0 0 16px 0",fontWeight:400,animation:"fadeIn .8s ease-out"}}>{evt.title}</h2>
        {/* Story text. the soul of the event */}
        <div style={{fontSize:15,color:"#c8c2bb",fontFamily:"system-ui",textAlign:"center",lineHeight:1.9,maxWidth:400,fontStyle:"italic",animation:"fadeIn 1.2s ease-out",marginBottom:8,padding:"0 8px"}}>{evtText}</div>
        {/* Involved cats. shown inline, atmospheric */}
        {tgts.length>0&&<div style={{display:"flex",gap:10,justifyContent:"center",marginBottom:12,animation:"fadeIn 1s ease-out 0.3s both"}}>
          {tgts.map((t,i)=>(<div key={t.id} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
            <CC cat={t} sm/>
            <div style={{fontSize:9,color:BREEDS[t.breed]?.color||"#888",fontFamily:"system-ui",letterSpacing:1,opacity:.7}}>{t.name.split(" ")[0]}</div>
          </div>))}
        </div>}
        {/* Choices. blind. Only the label. No previews. */}
        <div style={{display:"flex",flexDirection:"column",gap:8,width:"100%",maxWidth:360,marginTop:4}}>
          {evt.choices.map((ch,i)=>{
            const canAfford=!ch.fx.gold||ch.fx.gold>=0||gold>=Math.abs(ch.fx.gold);
            const label=ch.labelFn?ch.labelFn(tgts):ch.label;
            // Hint badge based on effect types
            const hint=(()=>{
              const fx=ch.fx;const hints=[];
              if(fx.gold&&fx.gold<0)hints.push({t:"Costly",c:"#fbbf24"});
              if(fx.injure||fx.scar||fx.scarTarget||fx.lose)hints.push({t:"Risky",c:"#ef4444"});
              if(fx.nerve&&fx.nerve<0||fx.fervMod&&fx.fervMod<0)hints.push({t:"Risky",c:"#ef4444"});
              if(fx.heal||fx.healAll||fx.denSafe||fx.shelter)hints.push({t:"Safe",c:"#4ade80"});
              if(fx.trait||fx.addNamedTrait||fx.specificTrait||fx.rareTrait||fx.addWard)hints.push({t:"Growth",c:"#c084fc"});
              if(fx.gold&&fx.gold>0)hints.push({t:"Rations",c:"#fbbf24"});
              if(!hints.length&&(fx.nerve>0||fx.ferv>0))hints.push({t:"Bold",c:"#fb923c"});
              return hints[0]||null;
            })();
            return(<button key={i} onClick={()=>canAfford&&chooseEvent(i)} style={{
              padding:"14px 20px",borderRadius:12,
              background:canAfford?"#ffffff04":"#0a0a0a",
              border:`1px solid ${canAfford?"#ffffff12":"#ffffff06"}`,cursor:canAfford?"pointer":"not-allowed",
              fontFamily:"'Cinzel',serif",transition:"all .3s",opacity:canAfford?1:.3,
              textAlign:"left",position:"relative",overflow:"hidden",
              animation:`fadeIn .5s ease-out ${1.2+i*0.15}s both`
            }}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:13,color:canAfford?"#e8e6e3":"#555",fontWeight:500,letterSpacing:1}}>{label}</span>
                {hint&&canAfford&&<span style={{fontSize:9,color:`${hint.c}66`,fontFamily:"system-ui",letterSpacing:1,flexShrink:0,marginLeft:8}}>{hint.t}</span>}
              </div>
              {!canAfford&&<span style={{fontSize:9,color:"#ef444488",fontFamily:"system-ui",display:"block",marginTop:3}}>Not enough rations</span>}
            </button>);
          })}
          {/* Relic 1: First Flame bonus choice */}
          {hasRelic(1)&&<button onClick={()=>{setFerv(f=>Math.min(9,f+1));setEventOutcome({title:evt.title,icon:evt.icon,choice:"Stoke the First Flame",desc:[{text:"The first light anyone carried out of the dark. +1 Nerve.",color:"#fbbf24",icon:"🕯️"}],targets:[]});setPh("eventResult");}} style={{
            padding:"14px 20px",borderRadius:12,
            background:"#fbbf2406",
            border:"1px solid #fbbf2418",cursor:"pointer",
            fontFamily:"'Cinzel',serif",transition:"all .3s",
            textAlign:"left",
            animation:`fadeIn .5s ease-out ${1.2+evt.choices.length*0.15}s both`
          }}>
            <span style={{fontSize:13,color:"#fbbf24",fontWeight:500,letterSpacing:1}}>🕯️ Stoke the First Flame</span>
          </button>}
        </div>
        {/* Rations. visible near choices */}
        <div style={{fontSize:11,color:"#fbbf2444",fontFamily:"system-ui",marginTop:12,letterSpacing:1}}>🐟 {gold} rations</div>
      </div>
    </div>);
  }

  // EVENT OUTCOME
  if(ph==="eventResult"&&eventOutcome){
    const eo=eventOutcome;
    return(<div style={W}><div style={BG}/><style>{CSS}</style>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",zIndex:1,gap:10,padding:20,maxWidth:480}}>
        {/* What you chose. quiet, past tense */}
        <div style={{fontSize:10,color:"#ffffff15",letterSpacing:6,fontFamily:"system-ui",animation:"fadeIn .6s ease-out"}}>WHAT HAPPENED</div>
        <div style={{fontSize:36,animation:"fadeIn .4s ease-out",opacity:.8}}>{eo.icon}</div>
        <h2 style={{fontSize:16,color:"#e8e6e3aa",letterSpacing:4,margin:0,fontWeight:400,animation:"fadeIn .6s ease-out"}}>{eo.title}</h2>
        <div style={{fontSize:11,color:"#ffffff22",fontFamily:"'Cinzel',serif",fontStyle:"italic",letterSpacing:2,animation:"fadeIn .8s ease-out"}}>"{eo.choice}"</div>
        {/* Cats involved. show their current state (post-effect) */}
        {eo.targets&&eo.targets.length>0&&<div style={{display:"flex",gap:10,justifyContent:"center",marginTop:4,animation:"fadeIn .6s ease-out 0.4s both"}}>
          {eo.targets.map((t,i)=>{
            // Re-fetch the cat from current state to show updated cards
            const updated=[...hand,...draw,...disc].find(c=>c.id===t.id)||t;
            return(<div key={t.id} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
              <CC cat={updated} sm/>
              <div style={{fontSize:9,color:BREEDS[updated.breed]?.color||"#888",fontFamily:"system-ui",letterSpacing:1,opacity:.7}}>{updated.name.split(" ")[0]}</div>
            </div>);
          })}
        </div>}
        {/* Consequences. each revealed with staggered timing */}
        <div style={{display:"flex",flexDirection:"column",gap:8,width:"100%",maxWidth:380,marginTop:8}}>
          {eo.desc.map((d,i)=>(
            <div key={i} style={{display:"flex",gap:10,alignItems:"center",padding:"10px 16px",borderRadius:10,
              background:`${d.color}08`,border:`1px solid ${d.color}18`,
              animation:`fadeIn .6s ease-out ${0.6+i*0.35}s both`}}>
              <span style={{fontSize:18,flexShrink:0,filter:`drop-shadow(0 0 6px ${d.color}44)`}}>{d.icon}</span>
              <span style={{fontSize:12,color:d.color,fontWeight:600,fontFamily:"system-ui",lineHeight:1.5}}>{d.text}</span>
            </div>
          ))}
        </div>
        <button onClick={()=>{setEventOutcome(null);if(skipShop){setSkipShop(false);nextBlind();}else{genShop();setPh("shop");}}} style={{...BTN("linear-gradient(135deg,#fbbf24,#f59e0b)","#0a0a1a"),marginTop:12,padding:"10px 32px",fontSize:13,animation:`fadeIn .5s ease-out ${0.6+eo.desc.length*0.35+0.3}s both`}}>{skipShop?"Continue":"Continue to Market"}</button>
      </div>
    </div>);
  }

  // OVERFLOW
  if(ph==="overflow"&&oData){const o=oData;
    const pctClear=o.tgt>0?Math.round(o.fs/o.tgt*100):100;
    const clearLine=blind>=2?null:getThresholdClear(ante,blind,clutch,pctClear);
    return(<div style={{...W,animation:clutch?"flash .6s ease-out":"none"}}><div style={BG}/><style>{CSS}</style>
    {/* ★ v43: Clutch celebration */}
    {clutch&&<div style={{position:"fixed",inset:0,zIndex:50,background:"radial-gradient(circle,#fbbf2433,transparent 70%)",pointerEvents:"none",animation:"flash 1.5s ease-out"}}/>}
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",zIndex:1,gap:10,padding:20}}>
      {clutch&&<div style={{fontSize:22,fontWeight:900,color:"#fbbf24",letterSpacing:8,textShadow:"0 0 30px #fbbf24cc",animation:"clutchBurst .8s ease-out",fontFamily:"'Cinzel',serif",marginBottom:4}}>CLUTCH</div>}
      <div style={{fontSize:14,color:blind>=2?"#4ade80":"#fbbf24",letterSpacing:3}}>{blind>=2?(clutch?"Survived. Barely.":"Survived."):"The threshold breaks."}</div>
      {/* ★ v49: Narrative clear line. the dark's reaction */}
      {clearLine&&<div style={{fontSize:13,color:"#ffffff55",fontStyle:"italic",fontFamily:"system-ui",textAlign:"center",maxWidth:320,lineHeight:1.6,animation:"fadeIn 1.2s ease-out",textShadow:"0 0 15px #ffffff11"}}>{clearLine}</div>}
      {blind>=2&&boss&&(()=>{
        const dCtx={fallen:fallen.length,fallenName:fallen.length>0?fallen[fallen.length-1].name.split(" ")[0]:"",scarred:allC.filter(c=>c.scarred).length,bonded:allC.filter(c=>c.bondedTo).length,colony:allC.length,clutch:clutch,grudges:allC.reduce((s,c)=>(c.grudgedWith||[]).length+s,0)/2,deathless:fallen.length===0};
        const dLine=boss.defeatFn?boss.defeatFn(dCtx):null;
        return(<div style={{textAlign:"center"}}>
          <div style={{fontSize:13,color:"#4ade8088",fontStyle:"italic",fontFamily:"system-ui",marginTop:4,lineHeight:1.5}}>"{boss.defeat}"</div>
          {dLine&&<div style={{fontSize:11,color:"#4ade8088",fontStyle:"italic",fontFamily:"system-ui",marginTop:2}}>"{dLine}"</div>}
        </div>);
      })()}
      {blind===1&&<div style={{fontSize:13,color:"#ef4444",fontWeight:700,letterSpacing:3,fontFamily:"system-ui",animation:"fpp 1s ease infinite"}}>Something approaches...</div>}
      {/* ★ v35: The Boss Speaks First. the boss notices you struggling before the fight */}
      {ante>=4&&blind<2&&(clutch||o.fs<o.tgt*1.3)&&boss&&(()=>{
        const bCtx={fallen:fallen.length,fallenName:fallen.length>0?fallen[fallen.length-1].name.split(" ")[0]:"",scarred:allC.filter(c=>c.scarred).length,bonded:allC.filter(c=>c.bondedTo).length,colony:allC.length,clutch,grudges:allC.reduce((s,c)=>(c.grudgedWith||[]).length+s,0)/2,deathless:fallen.length===0,gold};
        const earlyTaunt=boss.tauntFn?boss.tauntFn(bCtx):null;
        return earlyTaunt?(<div style={{textAlign:"center",animation:"fadeIn 1.5s ease-out",padding:"6px 14px",borderRadius:8,background:"#ef444408",border:"1px solid #ef444418",maxWidth:340}}>
          <span style={{fontSize:14}}>{boss.icon}</span>
          <div style={{fontSize:11,color:"#ef444488",fontStyle:"italic",fontFamily:"system-ui",lineHeight:1.5}}>"{earlyTaunt}"</div>
          <div style={{fontSize:10,color:"#ef444433",fontFamily:"system-ui",marginTop:2}}>{boss.name} watches.</div>
        </div>):null;
      })()}
      <div style={{fontSize:36,fontWeight:900,color:"#fbbf24",textShadow:"0 0 30px #fbbf2444"}}>{o.fs.toLocaleString()}</div>
      <div style={{fontSize:13,color:"#666",fontFamily:"system-ui"}}>Threshold: {o.tgt.toLocaleString()} <span style={{color:pctClear>=200?"#fbbf24":pctClear>=130?"#4ade80":"#888",fontWeight:700}}>({pctClear}%)</span></div>
      <div style={{display:"flex",flexDirection:"column",gap:5,background:"#ffffff06",borderRadius:12,padding:"14px 22px",border:"1px solid #ffffff0a",minWidth:260}}>
        <div style={{display:"flex",justifyContent:"space-between",fontFamily:"system-ui",fontSize:11}}><span style={{color:"#888"}}>Excess</span><span style={{color:"#fbbf24",fontWeight:700}}>+{o.excess.toLocaleString()}</span></div>
        {o.uh>0&&<div style={{display:"flex",justifyContent:"space-between",fontFamily:"system-ui",fontSize:11}}><span style={{color:"#888"}}>{o.uh} Unused Hand{o.uh>1?"s":""}</span><span style={{color:"#3b82f6",fontWeight:700}}>+{o.hB.toLocaleString()}</span></div>}
        <div style={{borderTop:"1px solid #ffffff0a",paddingTop:4,display:"flex",justifyContent:"space-between",fontFamily:"system-ui",fontSize:11}}><span style={{color:"#888"}}>Rations Earned</span><span style={{color:"#fbbf24",fontWeight:700}}>+{o.gR} 🐟</span></div>
        {o.interest>0&&<div style={{display:"flex",justifyContent:"space-between",fontFamily:"system-ui",fontSize:11}}><span style={{color:"#4ade80"}}>Stores (interest)</span><span style={{color:"#4ade80",fontWeight:700}}>+{o.interest} 🐟</span></div>}
        {o.excessGold>0&&<div style={{display:"flex",justifyContent:"space-between",fontFamily:"system-ui",fontSize:11}}><span style={{color:"#fbbf24"}}>Overkill Bonus</span><span style={{color:"#fbbf24",fontWeight:700}}>+{o.excessGold} 🐟</span></div>}
      </div>
      {blind>=2?(()=>{
        const rw=BOSS_REWARDS[Math.min(ante-1,4)];
        return(<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,marginTop:4}}>
          <div style={{padding:"14px 24px",borderRadius:10,background:"linear-gradient(145deg,#1b2e1b,#0d0d1a)",border:"1px solid #4ade8044",textAlign:"center",animation:"fadeIn .8s ease-out"}}>
            <div style={{fontSize:10,color:"#4ade8088",letterSpacing:2,fontFamily:"system-ui",marginBottom:4}}>REWARD</div>
            <div style={{fontSize:22}}>{rw.icon}</div>
            <div style={{fontSize:14,fontWeight:700,color:"#4ade80",letterSpacing:1,marginTop:4}}>{rw.name}</div>
            <div style={{fontSize:10,color:"#888",fontFamily:"system-ui",marginTop:2}}>{rw.desc}</div>
          </div>
          <button onClick={()=>{
            if(rw.type==="gold")setGold(g=>g+rw.value);
            if(rw.type==="hands")setRunBonus(b=>({...b,hands:b.hands+rw.value}));
            if(rw.type==="trait"){const best=[...hand,...draw,...disc].sort((a,b)=>b.power-a.power)[0];if(best){best.trait=pk(RARE_TRAITS);[setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>x.id===best.id?{...x,trait:best.trait}:x));});}}
            if(rw.type==="thin"){const sorted=[...draw].sort((a,b)=>a.power-b.power).slice(0,rw.value);setDraw(d=>d.filter(x=>!sorted.find(r=>r.id===x.id)));}
            if(rw.type==="power"){[setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>({...x,power:Math.min(15,x.power+rw.value)})));});}
            logEvent("reward",{name:rw.name,desc:rw.desc});setOData(null);genShop();setPh("shop");
          }} style={{...BTN("linear-gradient(135deg,#4ade80,#22c55e)","#0a0a1a"),padding:"10px 32px",fontSize:14}}>Claim Reward</button>
        </div>);
      })()
        :<div style={{display:"flex",gap:8,marginTop:6}}>
          <button onClick={()=>{setOData(null);setSkipShop(false);if(blind===0){fireEvent();}else{genShop();setPh("shop");}}} style={{...BTN("linear-gradient(135deg,#fbbf24,#f59e0b)","#0a0a1a"),padding:"10px 32px",fontSize:14}}>Visit the Market</button>
          <button onClick={()=>{const skipG=3+ante;setOData(null);setGold(g=>g+skipG);if(blind===0){setSkipShop(true);fireEvent();}else{nextBlind();}}} style={{...BTN("#1a1a2e","#fbbf24"),padding:"10px 16px",fontSize:11,border:"1px solid #fbbf2444"}}>Skip Market +{3+ante}🐟</button>
        </div>}
    </div></div>);}

  // v13: BOSS REWARD (kept as fallback but flow now goes through merged overflow)
  if(ph==="bossReward"&&bossReward){
    const rw=bossReward;
    function claimReward(){
      if(rw.type==="gold")setGold(g=>g+rw.value);
      if(rw.type==="hands")setRunBonus(b=>({...b,hands:b.hands+rw.value}));
      if(rw.type==="trait"){const best=[...hand,...draw,...disc].sort((a,b)=>b.power-a.power)[0];if(best){best.trait=pk(RARE_TRAITS);[setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>x.id===best.id?{...x,trait:best.trait}:x));});}}
      if(rw.type==="thin"){const sorted=[...draw].sort((a,b)=>a.power-b.power).slice(0,rw.value);setDraw(d=>d.filter(x=>!sorted.find(r=>r.id===x.id)));}
      if(rw.type==="power"){[setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>({...x,power:Math.min(15,x.power+rw.value)})));});}
      logEvent("reward",{name:rw.name,desc:rw.desc});
      setBossReward(null);genShop();setPh("shop");
    }
    const b=boss||BOSSES[0];
    return(<div style={W}><div style={BG}/><style>{CSS}</style>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",zIndex:1,gap:16,padding:20,maxWidth:400}}>
        <div style={{fontSize:10,color:"#4ade8088",letterSpacing:3,fontFamily:"system-ui"}}>NIGHT {ante} SURVIVED</div>
        <div style={{fontSize:10,color:"#666",fontStyle:"italic",fontFamily:"system-ui"}}>"{b.defeat}"</div>
        <div style={{padding:"20px 30px",borderRadius:12,background:"linear-gradient(145deg,#1b2e1b,#0d0d1a)",border:"1px solid #4ade8044",textAlign:"center",animation:"fadeIn .6s ease-out"}}>
          <div style={{fontSize:28}}>{rw.icon}</div>
          <div style={{fontSize:16,fontWeight:700,color:"#4ade80",letterSpacing:2,marginTop:6}}>{rw.name}</div>
          <div style={{fontSize:10,color:"#888",fontFamily:"system-ui",marginTop:4}}>{rw.desc}</div>
        </div>
        <button onClick={claimReward} style={{...BTN("linear-gradient(135deg,#4ade80,#22c55e)","#0a0a1a"),padding:"12px 36px",fontSize:14}}>Claim</button>
      </div>
    </div>);
  }

  // ★ v30: DEFEAT INTERSTITIAL - dramatic pause before game over
  if(ph==="defeat"&&defeatData){
    return(<div style={W}><div style={BG}/><style>{CSS}</style>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",zIndex:1,gap:16,padding:20,maxWidth:500}}>
        <div style={{fontSize:64,opacity:.6,animation:"fadeIn 1s ease-out",filter:"drop-shadow(0 0 30px #ef444466)"}}>💀</div>
        <h2 style={{fontSize:32,color:"#ef4444",letterSpacing:6,margin:0,textShadow:"0 0 40px #ef444444",animation:"tierReveal 1s ease-out"}}>COLONY FELL</h2>
        <div style={{fontSize:16,color:"#ef4444aa",fontFamily:"system-ui",fontStyle:"italic",textAlign:"center",maxWidth:360,lineHeight:1.7,animation:"fadeIn 1.5s ease-out"}}>{defeatData.line}</div>
        <div style={{display:"flex",gap:12,fontFamily:"system-ui",fontSize:13,color:"#666",animation:"fadeIn 2s ease-out"}}>
          <span>Night {ante}</span>
          <span style={{color:"#ef4444"}}>{defeatData.blind}</span>
        </div>
        <div style={{display:"flex",gap:2,alignItems:"baseline",animation:"fadeIn 2s ease-out"}}>
          <span style={{fontSize:28,fontWeight:900,color:"#ef444488"}}>{defeatData.score.toLocaleString()}</span>
          <span style={{fontSize:12,color:"#444",fontFamily:"system-ui"}}> / {defeatData.target.toLocaleString()} threshold</span>
        </div>
        {fallen.length>0&&<div style={{display:"flex",gap:4,flexWrap:"wrap",justifyContent:"center",animation:"fadeIn 2.5s ease-out"}}>
          {fallen.map((f,i)=>(<span key={i} style={{fontSize:10,color:BREEDS[f.breed]?.color||"#888",fontFamily:"system-ui",opacity:.5}}>{f.name.split(" ")[0]}</span>))}
        </div>}
        <button onClick={()=>{setDefeatData(null);setPh("gameOver");}} style={{...BTN("linear-gradient(135deg,#ef4444,#dc2626)","#fff"),padding:"12px 40px",fontSize:15,animation:"fadeIn 2.5s ease-out",marginTop:8}}>Continue</button>
      </div>
    </div>);
  }

  // GAME OVER / VICTORY
  if(ph==="gameOver"||ph==="victory"){const won=ph==="victory";
    const cands=[...allC].sort((a,b)=>(b.stats?.bs||0)-(a.stats?.bs||0));const mvp=cands[0];
    return(<div style={W}><div style={BG}/><style>{CSS}</style>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",zIndex:1,gap:12,padding:20,maxWidth:550}}>
        <div style={{fontSize:48}}>{won?(isNinthDawn?"🌅":"👑"):"💀"}</div>
        <h2 style={{fontSize:won&&isNinthDawn?42:26,letterSpacing:won&&isNinthDawn?12:4,margin:0,color:won?undefined:"#ef4444",background:won?"linear-gradient(135deg,#f59e0b,#fef08a)":undefined,WebkitBackgroundClip:won?"text":undefined,WebkitTextFillColor:won?"transparent":undefined}}>{won?(isNinthDawn?"DAWN":"THEY MADE IT"):"THE DARK WON"}</h2>
        {won&&isNinthDawn&&<div style={{fontSize:14,color:"#fbbf24aa",fontStyle:"italic",fontFamily:"system-ui",textAlign:"center",maxWidth:360,lineHeight:1.7,animation:"fadeIn 2s ease-out"}}>Nine colonies. One survived. Not because it was the strongest. Because someone remembered all the rest.</div>}
        {/* ★ v34: Hearth constellation. every saved cat appears as a star */}
        {won&&isNinthDawn&&meta&&meta.cats.length>0&&<div style={{display:"flex",gap:2,flexWrap:"wrap",justifyContent:"center",maxWidth:400,animation:"fadeIn 3s ease-out 1s both"}}>
          {meta.cats.map((c,i)=>(<span key={i} style={{width:4,height:4,borderRadius:"50%",background:BREEDS[c.breed]?.color||"#fbbf24",boxShadow:`0 0 4px ${BREEDS[c.breed]?.color||"#fbbf24"}`,animation:`fadeIn ${0.5+i*0.1}s ease-out ${1+i*0.05}s both`}} title={c.name}/>))}
        </div>}
        {fallen.length>0&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,marginTop:4}}>
          <div style={{fontSize:10,color:"#ef444488",letterSpacing:3}}>THEY WERE HERE</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"center"}}>
            {fallen.map((f,i)=>(<span key={i} style={{fontSize:10,color:BREEDS[f.breed]?.color||"#888",fontFamily:"system-ui",opacity:.6}}>{f.name.split(" ")[0]}</span>))}
          </div>
        </div>}
        <div style={{fontSize:14,color:won?"#fbbf2488":"#ef444488",fontStyle:"italic",fontFamily:"system-ui",textAlign:"center",maxWidth:320,lineHeight:1.6,marginTop:4}}>{won?(
          // ★ v32: Dynamic victory narration — every run ends differently
          fallen.length===0?`Every single one. All ${MX} nights. Ask me their names. I remember every one.`
          :fallen.length>=3?`${fallen.length} didn't make it: ${fallen.map(f=>f.name.split(" ")[0]).join(", ")}. The others carry them now.`
          :rMaxF>=8?"They burned so bright the dark flinched. It had never seen anything like them."
          :clutch?"It came down to the last number. The numbers said it was over. The numbers were wrong."
          :"Not all of them. Not whole. But enough to carry the names of those who didn't."
        ):(
          fallen.length>=3?`${fallen.length} names lost. Say them anyway: ${fallen.map(f=>f.name.split(" ")[0]).join(", ")}.`
          :rMaxF>=6?"They fought like fire. But fire needs fuel, and the fuel ran out."
          :"They were here. That mattered. Even if no one remembers."
        )}</div>
        <div style={{display:"flex",gap:12,fontFamily:"system-ui",fontSize:10,color:"#666"}}>{meta&&meta.cats.length>0&&<span style={{color:"#c084fc"}}>🏠 +{calcHearthDust(meta.cats).reduce((s,h)=>s+h.dust,0)}✦/run</span>}<span>Peak: <span style={{color:NERVE[rMaxF].color}}>{NERVE[rMaxF].name}</span></span>
          {(meta?.heat||0)>0&&<span style={{color:"#ef4444"}}>Heat {meta.heat}🔥</span>}
        </div>
        {/* ★ v47: Colony Chronicle. the story of this run */}
        {runLog.length>2&&<div style={{padding:"10px 16px",borderRadius:10,background:"#ffffff04",border:"1px solid #ffffff08",maxWidth:360,animation:"fadeIn 1.5s ease-out 1s both"}}>
          <div style={{fontSize:10,color:"#88888866",letterSpacing:3,marginBottom:6,textAlign:"center"}}>THE CHRONICLE</div>
          {genChronicle(won).map((p,i)=>(<div key={i} style={{fontSize:11,color:"#999",fontFamily:"system-ui",fontStyle:"italic",lineHeight:1.6,marginBottom:i<2?6:0,animation:`fadeIn .6s ease-out ${1.5+i*0.4}s both`}}>{p}</div>))}
        </div>}
        {newUnlocks.length>0&&<div style={{display:"flex",flexDirection:"column",gap:4,padding:"8px 16px",borderRadius:10,background:"#fbbf2408",border:"1px solid #fbbf2433",animation:"fadeIn .6s ease-out"}}>
          <div style={{fontSize:10,color:"#fbbf24",letterSpacing:2,fontWeight:700}}>NEW UNLOCKS</div>
          {newUnlocks.map((msg,i)=>(<div key={i} style={{fontSize:10,color:"#fbbf24",fontFamily:"system-ui",animation:`fadeIn .4s ease-out ${i*0.2}s both`}}>{msg}</div>))}
        </div>}
        {/* ★ v33: First run → full game unlock message */}
        {meta&&meta.stats.w===1&&won&&<div style={{padding:"8px 16px",borderRadius:10,background:"#4ade8008",border:"1px solid #4ade8033",animation:"fadeIn .8s ease-out",textAlign:"center",maxWidth:320}}>
          <div style={{fontSize:10,color:"#4ade80",fontWeight:700,marginBottom:3}}>🌅 THE FULL NIGHT AWAITS</div>
          <div style={{fontSize:11,color:"#4ade80aa",fontFamily:"system-ui",lineHeight:1.5}}>Your next run is the real thing. <b>5 nights</b>. Harder targets, deeper systems, new events. Everything you learned in 3 nights? You'll need it.</div>
        </div>}
        {hearthPair!==null&&cands.length>0&&(()=>{
          const picked=hearthPair;const needSex=picked.length===0?null:picked[0].sex==="M"?"F":"M";
          const availCands=needSex?cands.filter(c=>c.sex===needSex):cands;
          const pickedIds=picked.map(p=>p.name);
          const noMate=needSex&&availCands.filter(c=>!pickedIds.includes(c.name)).length===0;
          return(<div style={{width:"100%",textAlign:"center"}}>
          <div style={{fontSize:12,color:"#fbbf24",letterSpacing:3,marginBottom:4}}>
            {picked.length===0?"CHOOSE THE FIRST SOUL":"CHOOSE THEIR "+(needSex==="M"?"M":"F")+"ATE"}
          </div>
          <div style={{fontSize:10,color:"#c084fc88",fontFamily:"system-ui",marginBottom:6}}>
            {picked.length===0?"A male and female carry the story to the Hearth. their descendants begin the next colony"
            :`${picked[0].name.split(" ")[0]} (${picked[0].sex==="M"?"♂":"♀"}) chosen. Now pick a ${needSex==="M"?"male":"female"} companion.`}
          </div>
          {noMate&&<div style={{fontSize:11,color:"#fb923c",fontFamily:"system-ui",marginBottom:8}}>No {needSex==="M"?"males":"females"} survived. {picked[0].name.split(" ")[0]} goes alone.
            <button onClick={async()=>{
              // Save single cat without pair
              const u={...meta,cats:[...meta.cats,picked[0]],stats:{...meta.stats,disc:[...new Set([...meta.stats.disc,`${picked[0].breed}-${(picked[0].trait||PLAIN).name}`])]}};
              setMeta(u);await saveS(u);setHearthPair(null);
            }} style={{...BTN("#333","#fb923c"),padding:"4px 12px",fontSize:10,marginLeft:8}}>Save alone</button>
          </div>}
          <div style={{display:"flex",gap:5,flexWrap:"wrap",justifyContent:"center",maxHeight:300,overflowY:"auto"}}>
            {availCands.filter(c=>!pickedIds.includes(c.name)).slice(0,12).map(c=>{const b=BREEDS[c.breed];
              const hVal=calcHearthDust([{...c,fromAnte:ante}])[0].dust;
              return(
              <div key={c.id} onClick={()=>saveCatM(c)} style={{cursor:"pointer",textAlign:"center",padding:5,borderRadius:8,border:"1px solid #ffffff0a",background:"#ffffff04",width:96}}>
                <CC cat={c} sm hl={c.id===mvp?.id}/>
                <div style={{marginTop:3,fontFamily:"system-ui",fontSize:10,lineHeight:1.4}}>
                  <div style={{color:c.sex==="M"?"#60a5fa":"#f472b6",fontWeight:700}}>{c.sex==="M"?"♂":"♀"}</div>
                  {c.stats.tp>0?<div style={{color:"#888"}}>{c.stats.tp}x Best:{c.stats.bs.toLocaleString()}</div>:<div style={{color:"#555",fontStyle:"italic"}}>Never played</div>}
                  <div style={{color:"#c084fc",fontWeight:700,fontSize:10}}>+{hVal}✦/run</div>
                  {c.id===mvp?.id&&c.stats.tp>0&&<div style={{color:"#fbbf24",fontWeight:700,fontSize:10}}>★ MVP</div>}
                </div>
              </div>);})}
          </div>
          {picked.length===0&&<button onClick={()=>setHearthPair(null)} style={{...BTN("#333","#888"),padding:"6px 16px",fontSize:10,marginTop:8}}>Skip. carry no one</button>}
          {picked.length===1&&<button onClick={()=>{setHearthPair([]);}} style={{...BTN("#333","#888"),padding:"6px 16px",fontSize:10,marginTop:8}}>Undo. repick</button>}
        </div>);})()}
        {hearthPair===null&&runLog.length>0&&<div style={{width:"100%",maxWidth:400}}>
          <details style={{cursor:"pointer"}}>
            <summary style={{fontSize:10,color:"#888",letterSpacing:2}}>THE RECORD ({runLog.length} events)</summary>
            <div style={{display:"flex",flexDirection:"column",gap:2,maxHeight:200,overflowY:"auto",marginTop:4,paddingBottom:4}}>
              {runLog.map((e,i)=>(<div key={i} style={{fontSize:10,fontFamily:"system-ui",display:"flex",gap:4,padding:"2px 0",
                color:e.type==="death"?"#ef4444":e.type==="phoenix"?"#fbbf24":e.type==="breed"||e.type==="growth"||e.type==="wanderer"||e.type==="mentor"?"#4ade80":e.type==="hand"||e.type==="found"||e.type==="reward"?"#fbbf24":e.type==="night"?"#c084fc":"#666"
              }}>
                <span style={{color:"#555",minWidth:35}}>N{e.ante}.{e.blind+1}</span>
                {e.type==="trait"&&<span>✨ {e.data.cat} gained {e.data.trait}</span>}
                {e.type==="draft"&&<span>Drafted: {e.data.picked} ({e.data.rejects} turned away)</span>}
                {e.type==="hand"&&<span>{e.data.cats} played {e.data.type} for {e.data.score.toLocaleString()}</span>}
                {e.type==="breed"&&<span>{e.data.baby} was born to {e.data.parents}</span>}
                {e.type==="fight"&&<span>{e.data.loser} was scarred in a fight</span>}
                {e.type==="death"&&<span>{e.data.victim} was lost</span>}
                {e.type==="night"&&<span>Night {e.data.to} begins</span>}
                {e.type==="phoenix"&&<span>{e.data.risen} rose from ashes!</span>}
                {e.type==="bond"&&<span>{e.data.c1} bonded with {e.data.c2}</span>}
                {e.type==="training"&&<span>{e.data.c1} and {e.data.c2} sparred</span>}
                {e.type==="grudge"&&<span>⚡ Grudge: {e.data.c1} vs {e.data.c2}</span>}
                {e.type==="reconcile"&&<span>🕊️ Peace: {e.data.c1}+{e.data.c2}{e.data.bonded?" 💕":""}</span>}
                {e.type==="mentor"&&<span>{e.data.elder} mentored {e.data.young}</span>}
                {e.type==="found"&&<span>{e.data.cat} found +{e.data.gold}🐟</span>}
                {e.type==="growth"&&<span>{e.data.cat} grew stronger</span>}
                {e.type==="wanderer"&&<span>{e.data.cat} joined the colony</span>}
                {e.type==="reward"&&<span>Claimed: {e.data.name}</span>}
              </div>))}
            </div>
          </details>
        </div>}
        {hearthPair===null&&<button onClick={()=>setPh("title")} style={{...BTN("linear-gradient(135deg,#fbbf24,#f59e0b)","#0a0a1a"),padding:"10px 36px",fontSize:15}}>{won?"Carry Their Names":"Begin Again"}</button>}
      </div></div>);}

  // ═══════════════════════════════════════════════════
  // v17: DEN SELECTION - dedicated phase
  // ═══════════════════════════════════════════════════
  if(ph==="denSelect"){
    const dAll=[...hand,...draw,...disc];
    const injured=dAll.filter(c=>c.injured);
    const isolated=[...den]; // den state = isolated cats
    const denCats=dAll.filter(c=>!den.find(d=>d.id===c.id)&&!c.injured);
    const nightText=NIGHT_FLAVOR[Math.min(ante-1,4)];
    return(<div style={W}><div style={BG}/><style>{CSS}</style>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",zIndex:1,gap:12,padding:20,maxWidth:600}}>
        <div style={{fontSize:32,animation:"float 3s ease-in-out infinite"}}>🌙</div>
        <h2 style={{fontSize:20,color:"#c084fc",letterSpacing:4,margin:0}}>THE DEN</h2>
        <div style={{fontSize:12,color:"#ffffff44",fontStyle:"italic",fontFamily:"system-ui",textAlign:"center",maxWidth:320,lineHeight:1.7}}>{nightText}</div>

        {/* ★ v44: First-encounter hint. flipped mechanic */}
        {!seen.den&&<div style={{padding:"10px 16px",borderRadius:10,background:"#c084fc08",border:"1px solid #c084fc22",fontSize:12,fontFamily:"system-ui",color:"#c084fccc",lineHeight:1.7,textAlign:"center",maxWidth:380,animation:"fadeIn .6s ease-out"}}>
          <b>Shelter a ♂ + ♀ pair to breed safely.</b> Everyone else enters the wilds, where they train, bond, or fight. More cats in the wilds = more risk, more growth.
          <div style={{marginTop:6}}><button onClick={()=>setSeen(s=>({...s,den:true}))} style={{fontSize:10,background:"none",border:"1px solid #c084fc33",borderRadius:4,color:"#c084fc",cursor:"pointer",padding:"3px 10px",fontFamily:"system-ui"}}>Got it</button></div>
        </div>}
        {eventDenSafe&&<div style={{fontSize:10,color:"#4ade80",fontFamily:"system-ui"}}>🕊️ The shrine's protection holds. No fights tonight.</div>}
        {eventDenBonus>0&&<div style={{fontSize:10,color:"#4ade80",fontFamily:"system-ui"}}>🏠 +{eventDenBonus} extra shelter slot{eventDenBonus>1?"s":""} tonight.</div>}

        {/* Status bar */}
        <div style={{fontSize:11,color:"#888",fontFamily:"system-ui",textAlign:"center"}}>
          <b style={{color:"#fb923c"}}>{denCats.length}</b> in wilds{isolated.length>0&&<span> · <b style={{color:"#4ade80"}}>{isolated.length}</b>/{MAX_ISOLATE} sheltered</span>}{injured.length>0&&<span> · <b style={{color:"#fb923c"}}>{injured.length}</b> resting</span>}
        </div>

        {/* ★ v44: Combined risk line. one glanceable signal */}
        {(()=>{
          const risk=denCats.length<=4?"Calm":denCats.length<=7?"Active":denCats.length<=10?"Volatile":"Dangerous";
          const riskColor=denCats.length<=4?"#4ade80":denCats.length<=7?"#fbbf24":denCats.length<=10?"#fb923c":"#ef4444";
          const alerts=[];
          if(ferv>=4)alerts.push({icon:"🔥",text:NERVE[ferv].name,color:ferv>=7?"#ef4444":"#fb923c"});
          const bc={};denCats.forEach(c=>{bc[c.breed]=(bc[c.breed]||0)+1;});
          const crowded=Object.entries(bc).filter(([,ct])=>ct>2);
          if(crowded.length)alerts.push({icon:"⚔",text:crowded.map(([br,ct])=>`${BREEDS[br]?.icon||""}${ct}`).join(" "),color:"#fb923c"});
          return(<div style={{display:"flex",gap:8,alignItems:"center",justifyContent:"center",fontSize:10,fontFamily:"system-ui"}}>
            <span style={{color:riskColor,fontWeight:700}}>{risk}</span>
            {alerts.map((a,i)=><span key={i} style={{color:a.color}}>{a.icon} {a.text}</span>)}
          </div>);
        })()}

        {/* ★ v46: Pair summary. shelter breed pairs + wilds danger */}
        {(isolated.length>=2||denCats.length>=2)&&(()=>{
          // Shelter pairs — who can breed?
          let shelterBreedPairs=0,relatedPairs=0;
          for(let i=0;i<isolated.length;i++){
            for(let j=i+1;j<isolated.length;j++){
              if(isolated[i].sex!==isolated[j].sex&&!isolated[i].injured&&!isolated[j].injured){
                const isFamily=isolated[i].parentIds?.includes(isolated[j].id)||isolated[j].parentIds?.includes(isolated[i].id)||
                  (isolated[i].parentIds&&isolated[j].parentIds&&isolated[i].parentIds.some(p=>isolated[j].parentIds.includes(p)));
                if(isFamily)relatedPairs++;else shelterBreedPairs++;
              }
            }
          }
          // Wilds pairs — who's at risk?
          const denBC={};denCats.forEach(c=>{denBC[c.breed]=(denBC[c.breed]||0)+1;});
          let grudgePairs=0,fightRisk=0;
          for(let i=0;i<denCats.length;i++){
            for(let j=i+1;j<denCats.length;j++){
              const sameBreed=denCats[i].breed===denCats[j].breed?denBC[denCats[i].breed]||0:0;
              const af=calcAffinity(denCats[i],denCats[j],{nerveLvl:ferv,sameBreedCount:sameBreed,denSize:denCats.length});
              if(hasGrudge(denCats[i],denCats[j]))grudgePairs++;
              if(af.fightCh>=20)fightRisk++;
            }
          }
          const has=shelterBreedPairs||relatedPairs||grudgePairs||fightRisk;
          return has?(<div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap",fontSize:10,fontFamily:"system-ui"}}>
            {shelterBreedPairs>0&&<span style={{color:"#4ade80"}}>🤝 {shelterBreedPairs} can breed</span>}
            {relatedPairs>0&&<span style={{color:"#fb923c"}}>👪 {relatedPairs} kin (can't breed)</span>}
            {shelterBreedPairs===0&&relatedPairs===0&&isolated.length>=2&&<span style={{color:"#888"}}>🤝 no M/F pairs sheltered</span>}
            {grudgePairs>0&&<span style={{color:"#fb923c"}}>⚡ {grudgePairs} grudge</span>}
            {fightRisk>0&&<span style={{color:"#ef4444",fontWeight:700}}>🩹 {fightRisk} tense</span>}
          </div>):null;
        })()}

        {/* All cats. tap to shelter */}
        <div style={{display:"flex",gap:4,flexWrap:"wrap",justifyContent:"center",maxWidth:500,maxHeight:220,overflowY:"auto",padding:4}}>
          {dAll.map(c=>{
            const isIsolated=den.find(d=>d.id===c.id);
            const isInjured=c.injured;
            const canToggle=!isInjured&&(isIsolated||den.length<MAX_ISOLATE);
            return(<div key={c.id} onClick={isInjured?undefined:canToggle?()=>toggleDen(c):undefined} style={{cursor:isInjured?"default":canToggle?"pointer":"not-allowed",opacity:!canToggle&&!isIsolated&&!isInjured?.7:1,transition:"opacity .2s",position:"relative"}}>
              <CC cat={c} sm sel={!!isIsolated} denMode={!isIsolated&&!isInjured} dis={isInjured} onTraitClick={ct=>setTraitTip(ct)}/>
              {/* Shelter badge */}
              {isIsolated&&<div style={{position:"absolute",top:-4,right:-4,background:"#4ade80",color:"#000",fontSize:10,width:18,height:18,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,border:"2px solid #0a0a1a"}}>🛡</div>}
              {/* Injured badge */}
              {isInjured&&<div style={{position:"absolute",top:-4,right:-4,background:"#fb923c",color:"#000",fontSize:10,width:18,height:18,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,border:"2px solid #0a0a1a"}}>🩹</div>}
            </div>);
          })}
        </div>

        <div style={{display:"flex",gap:8,marginTop:8}}>
          <button onClick={endNight} style={{...BTN("linear-gradient(135deg,#c084fc,#a855f7)","#fff"),padding:"10px 28px",fontSize:14}}>End Night</button>
          <button onClick={()=>{setDen([]);nextBlind();}} style={{...BTN("#1a1a2e","#888"),padding:"10px 20px",fontSize:11,border:"1px solid #ffffff12"}}>Skip Den</button>
        </div>
      </div>
    </div>);
  }

  // DEN RESULTS
  if(ph==="denResults"&&denRes){
    const denDone=denRes.length===0||denStep>=denRes.length-1;
    const skipDen=()=>{if(denDone)return;if(denStRef.current)clearTimeout(denStRef.current);setDenStep(denRes.length-1);};
    return(<div onClick={denDone?undefined:skipDen} style={{...W,cursor:denDone?"default":"pointer"}}><div style={BG}/><style>{CSS}</style>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-start",minHeight:"100vh",zIndex:1,gap:14,padding:20,maxWidth:550,overflowY:"auto"}}>
        <div style={{fontSize:32}}>🌙</div>
        <h2 style={{fontSize:18,color:"#c084fc",letterSpacing:4,margin:0}}>WHAT HAPPENED IN THE DARK</h2>
        {/* ★ v38: Detailed summary with names. show after cascade completes */}
        {denDone&&denRes.length>0&&(()=>{
          const n=c=>c.name.split(" ")[0];
          const groups={life:[],bonds:[],conflict:[],growth:[]};
          denRes.forEach(r=>{
            if(r.type==="breed")groups.life.push({icon:"🐣",text:`${n(r.baby)} was born to ${n(r.c1)} & ${n(r.c2)}${r.twins?" (twins!)":""}`,color:"#4ade80",src:r.source});
            if(r.type==="wanderer")groups.life.push({icon:"🐱",text:`${n(r.cat)} wandered in`,color:"#67e8f9",src:r.source});
            if(r.type==="death")groups.conflict.push({icon:"💀",text:`${n(r.victim)} was lost`,color:"#ef4444",bold:true,src:r.source});
            if(r.type==="fight")groups.conflict.push({icon:"⚔",text:`${n(r.loser)} was ${r.wasInjured?"injured":"scarred"} (−${r.dmg}P) fighting ${n(r.loser.id===r.c1.id?r.c2:r.c1)}`,color:"#ef4444",src:r.source});
            if(r.type==="grudge")groups.conflict.push({icon:"⚡",text:`${n(r.c1)} & ${n(r.c2)} developed a grudge`,color:"#fb923c",src:r.source});
            if(r.type==="bond")groups.bonds.push({icon:"💕",text:`${n(r.c1)} & ${n(r.c2)} bonded`,color:"#f472b6",src:r.source});
            if(r.type==="reconcile_bond")groups.bonds.push({icon:"💕",text:`${n(r.c1)} & ${n(r.c2)} reconciled and bonded`,color:"#f472b6",src:r.source});
            if(r.type==="reconcile")groups.bonds.push({icon:"🕊️",text:`${n(r.c1)} & ${n(r.c2)} made peace`,color:"#67e8f9",src:r.source});
            if(r.type==="growth")groups.growth.push({icon:"⭐",text:`${n(r.cat)} grew stronger`,color:"#4ade80"});
            if(r.type==="mentor")groups.growth.push({icon:"📖",text:`${n(r.elder)} mentored ${n(r.young)}`,color:"#c084fc"});
            if(r.type==="training")groups.growth.push({icon:"⚔️",text:`${n(r.c1)} & ${n(r.c2)} sparred`,color:"#60a5fa"});
            if(r.type==="phoenix")groups.life.push({icon:"🔥",text:`${n(r.risen)} rose from the ashes. now Eternal`,color:"#fbbf24",bold:true});
            if(r.type==="teach")groups.growth.push({icon:"👪",text:`${n(r.parent)} taught ${n(r.child)} ${r.trait.icon} ${r.trait.name}`,color:"#34d399",bold:true});
            if(r.type==="found")groups.growth.push({icon:"🐟",text:`${n(r.cat)} found ${r.gold} rations`,color:"#fbbf24"});
            if(r.traitGained)groups.growth.push({icon:"✨",text:`${n(r.traitGained.cat)} gained ${r.traitGained.trait.icon} ${r.traitGained.trait.name}`,color:"#fbbf24",bold:true});
          });
          const sections=[
            {key:"life",title:"🐣 New Life",items:groups.life,border:"#4ade8033"},
            {key:"bonds",title:"💕 Bonds",items:groups.bonds,border:"#f472b633"},
            {key:"conflict",title:"⚔ Conflict",items:groups.conflict,border:"#ef444433"},
            {key:"growth",title:"⭐ Growth",items:groups.growth,border:"#60a5fa33"},
          ].filter(s=>s.items.length>0);
          return(<div style={{display:"flex",flexDirection:"column",gap:6,maxWidth:420,animation:"fadeIn .3s ease-out"}}>
            {sections.map(sec=>(
              <div key={sec.key} style={{padding:"6px 12px",borderRadius:8,background:"#ffffff04",borderLeft:`3px solid ${sec.border}`,display:"flex",flexDirection:"column",gap:2}}>
                <div style={{fontSize:10,color:"#888",fontWeight:700,letterSpacing:1,marginBottom:1}}>{sec.title}</div>
                {sec.items.map((l,i)=><div key={i} style={{fontSize:11,fontFamily:"system-ui",color:l.color,fontWeight:l.bold?800:600,lineHeight:1.4}}>{l.icon} {l.text}</div>)}
              </div>
            ))}
          </div>);
        })()}
        {denRes.length===0&&<div style={{color:"#666",fontSize:13,fontStyle:"italic",fontFamily:"system-ui",textAlign:"center",lineHeight:1.6,maxWidth:340}}>{pk(DEN_QUIET)()}</div>}
        {denRes.slice(0,denStep+1).map((r,i)=>{
          const isActive=i===denStep;
          return (
          <div key={i} style={{width:"100%",padding:"10px 14px",borderRadius:10,
            background:r.type==="breed"||r.type==="growth"||r.type==="wanderer"||r.type==="mentor"||r.type==="training"||r.type==="teach"?"linear-gradient(145deg,#1b2e1b,#0d0d1a)":r.type==="death"?"linear-gradient(145deg,#2e1111,#0d0d1a)":r.type==="phoenix"||r.type==="found"?"linear-gradient(145deg,#2e2211,#0d0d1a)":r.type==="bond"||r.type==="reconcile_bond"?"linear-gradient(145deg,#2e1b2e,#0d0d1a)":r.type==="grudge"?"linear-gradient(145deg,#2e2211,#0d0d1a)":r.type==="reconcile"?"linear-gradient(145deg,#1b2e3e,#0d0d1a)":"linear-gradient(145deg,#2e1b1b,#0d0d1a)",
            border:`1px solid ${r.type==="breed"||r.type==="growth"||r.type==="wanderer"||r.type==="mentor"||r.type==="training"?"#4ade8044":r.type==="death"?"#ef444466":r.type==="phoenix"||r.type==="found"?"#fbbf2466":r.type==="bond"||r.type==="reconcile_bond"?"#f472b644":r.type==="grudge"?"#fb923c44":r.type==="reconcile"?"#67e8f944":"#ef444433"}`,
            animation:isActive?"scorePop .4s ease-out":"none"
          }}>
            {r.type==="breed"&&<div>
              <div style={{fontStyle:"italic",color:"#4ade8088",fontSize:12,lineHeight:1.5,fontFamily:"system-ui",marginBottom:6}}>{pk(DEN_BREED)(r.c1.name.split(" ")[0],r.c2.name.split(" ")[0],r.baby.name.split(" ")[0])}</div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <CC cat={r.c1} sm/><span style={{color:"#4ade8088"}}>+</span><CC cat={r.c2} sm/><span style={{color:"#4ade8088"}}>=</span><CC cat={r.baby} sm hl/>
                {r.twins&&r.twin2&&<><span style={{color:"#fbbf2488"}}>+</span><CC cat={r.twin2} sm hl/></>}
              </div>
              <div style={{fontSize:10,color:"#888",fontFamily:"system-ui",marginTop:3}}>
                {BREEDS[r.baby.breed].icon} {r.baby.name} Power {r.baby.power} {(r.baby.trait||PLAIN).icon} {(r.baby.trait||PLAIN).name} {r.baby.sex==="M"?"♂":"♀"}
                {(r.baby.trait||PLAIN).tier!=="common"&&(r.baby.trait||PLAIN).name!=="Plain"&&<span style={{color:traitTierLabel(r.baby.trait).color,fontWeight:700}}> ★ {traitTierLabel(r.baby.trait).label.toUpperCase()}</span>}
                {r.twins&&" + TWINS!"}
              </div>
            </div>}
            {r.type==="fight"&&<div>
              <div style={{fontStyle:"italic",color:"#ef444488",fontSize:13,lineHeight:1.5,fontFamily:"system-ui",marginBottom:6}}>{pk(DEN_FIGHT)(r.c1.name.split(" ")[0],r.c2.name.split(" ")[0],r.loser.name.split(" ")[0])}</div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}><CC cat={r.c1} sm/><span style={{color:"#ef444488",fontSize:14}}>⚔️</span><CC cat={r.c2} sm/></div>
              <div style={{fontSize:10,color:"#ef4444",fontFamily:"system-ui",marginTop:3}}>{r.wasInjured?"🩹🩹":"🩹"} {r.loser.name.split(" ")[0]} was {r.wasInjured?"INJURED":"scarred"} (-{r.dmg} Power)</div>
              {r.traitGained&&<div style={{fontSize:10,color:"#fbbf24",fontFamily:"system-ui",marginTop:3,animation:"countUp .3s ease-out"}}>✨ {r.traitGained.cat.name.split(" ")[0]} gained {r.traitGained.trait.icon} {r.traitGained.trait.name}!</div>}
            </div>}
            {r.type==="phoenix"&&<div>
              <div style={{fontSize:11,color:"#fbbf24",fontWeight:700,marginBottom:4}}>🔥 {r.risen.name.split(" ")[0]} RISES FROM THE ASHES!</div>
              <div style={{fontStyle:"italic",color:"#fbbf2488",fontSize:10,marginBottom:4,fontFamily:"system-ui"}}>{pk(DEN_PHOENIX)(r.c1.name,r.c2.name,r.risen.name)}</div>
              <div style={{fontSize:10,color:"#fbbf24",fontFamily:"system-ui"}}>Now Eternal at P1. The fire changes everything.</div>
            </div>}
            {r.type==="mentor"&&<div>
              <div style={{fontStyle:"italic",color:"#c084fc88",fontSize:13,lineHeight:1.5,fontFamily:"system-ui",marginBottom:4}}>{pk(DEN_MENTOR)(r.elder.name.split(" ")[0],r.young.name.split(" ")[0])}</div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}><CC cat={r.elder} sm/><span style={{color:"#c084fc88",fontSize:12}}>📖</span><CC cat={r.young} sm hl/></div>
              <div style={{fontSize:10,color:"#c084fc",fontFamily:"system-ui",marginTop:3}}>⭐ {r.young.name.split(" ")[0]} +1 Power (mentored)</div>
              {r.traitGained&&<div style={{fontSize:10,color:"#fbbf24",fontFamily:"system-ui",marginTop:2,animation:"countUp .3s ease-out"}}>✨ {r.traitGained.cat.name.split(" ")[0]} gained {r.traitGained.trait.icon} {r.traitGained.trait.name}!</div>}
            </div>}
            {r.type==="found"&&<div>
              <div style={{fontStyle:"italic",color:"#fbbf2488",fontSize:13,lineHeight:1.5,fontFamily:"system-ui",marginBottom:4}}>{pk(DEN_FOUND)(r.cat.name.split(" ")[0])}</div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}><CC cat={r.cat} sm/></div>
              <div style={{fontSize:10,color:"#fbbf24",fontFamily:"system-ui",marginTop:3}}>🐟 +{r.gold} Rations{r.gold>=4?". Jackpot!":""}</div>
            </div>}
            {r.type==="growth"&&<div>
              <div style={{fontStyle:"italic",color:"#4ade8088",fontSize:12,lineHeight:1.5,fontFamily:"system-ui",marginBottom:4}}>{pk(DEN_GROWTH)(r.cat.name.split(" ")[0])}</div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}><CC cat={r.cat} sm hl/></div>
              <div style={{fontSize:10,color:"#4ade80",fontFamily:"system-ui",marginTop:3}}>⭐ {r.cat.name.split(" ")[0]} +1 Power</div>
              {r.traitGained&&<div style={{fontSize:10,color:"#fbbf24",fontFamily:"system-ui",marginTop:2,animation:"countUp .3s ease-out"}}>✨ {r.traitGained.cat.name.split(" ")[0]} gained {r.traitGained.trait.icon} {r.traitGained.trait.name}!</div>}
            </div>}
            {r.type==="wanderer"&&<div>
              <div style={{fontStyle:"italic",color:"#67e8f988",fontSize:13,lineHeight:1.5,fontFamily:"system-ui",marginBottom:4}}>{pk(DEN_WANDER)(r.cat.name.split(" ")[0])}</div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}><CC cat={r.cat} sm hl/></div>
              <div style={{fontSize:10,color:"#67e8f9",fontFamily:"system-ui",marginTop:3}}>A wanderer joins. {r.cat.name} Power {r.cat.power} {(r.cat.trait||PLAIN).icon} {(r.cat.trait||PLAIN).name}</div>
            </div>}
            {r.type==="training"&&<div>
              <div style={{fontStyle:"italic",color:"#60a5fa88",fontSize:10,lineHeight:1.5,fontFamily:"system-ui",marginBottom:4}}>{pk([
                (a,b)=>`${a} and ${b} circled each other. Not fighting. Learning. Testing. By dawn, both were sharper.`,
                (a,b)=>`It wasn't a fight. It was a conversation in claw and reflex. ${a} and ${b} understood each other better after.`,
                (a,b)=>`${b} feinted left. ${a} read it. They went back and forth until the moon set. Both were better for it.`,
              ])(r.c1.name.split(" ")[0],r.c2.name.split(" ")[0])}</div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}><CC cat={r.c1} sm hl/><span style={{color:"#60a5fa88",fontSize:14}}>⚔️</span><CC cat={r.c2} sm hl/></div>
              <div style={{fontSize:10,color:"#60a5fa",fontFamily:"system-ui",marginTop:3}}>Both cats +1 Power from sparring</div>
              {r.traitGained&&<div style={{fontSize:10,color:"#fbbf24",fontFamily:"system-ui",marginTop:2,animation:"countUp .3s ease-out"}}>✨ {r.traitGained.cat.name.split(" ")[0]} gained {r.traitGained.trait.icon} {r.traitGained.trait.name}!</div>}
            </div>}
            {r.type==="grudge"&&<div>
              <div style={{fontStyle:"italic",color:"#f5920388",fontSize:10,lineHeight:1.5,fontFamily:"system-ui",marginBottom:4}}>{pk([
                (a,b)=>`${a} hissed when ${b} crossed the invisible line. There was a line now. That was new.`,
                (a,b)=>`They'd been circling the same sleeping spot for three nights. Tonight, ${a} claimed it. ${b} remembered.`,
                (a,b)=>`It wasn't hatred. It was something quieter. ${a} and ${b} would never forget this.`,
              ])(r.c1.name.split(" ")[0],r.c2.name.split(" ")[0])}</div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}><CC cat={r.c1} sm/><span style={{color:"#f5920388",fontSize:14}}>⚡</span><CC cat={r.c2} sm/></div>
              <div style={{fontSize:10,color:"#fb923c",fontFamily:"system-ui",marginTop:3}}>⚡ Grudge formed between {r.c1.name.split(" ")[0]} and {r.c2.name.split(" ")[0]}</div>
            </div>}
            {(r.type==="reconcile"||r.type==="reconcile_bond")&&<div>
              <div style={{fontStyle:"italic",color:r.type==="reconcile_bond"?"#f472b688":"#67e8f988",fontSize:10,lineHeight:1.5,fontFamily:"system-ui",marginBottom:4}}>{pk([
                (a,b)=>`${a} groomed the scar on ${b}'s ear. After all this time, the war was over.`,
                (a,b)=>`It started with a shared mouse. By morning, ${a} and ${b} slept side by side.`,
                (a,b)=>`Neither ${a} nor ${b} remembered who started it. But both remembered when it ended.`,
              ])(r.c1.name.split(" ")[0],r.c2.name.split(" ")[0])}</div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}><CC cat={r.c1} sm hl/><span style={{color:r.type==="reconcile_bond"?"#f472b688":"#67e8f988",fontSize:14}}>{r.type==="reconcile_bond"?"💕":"🕊️"}</span><CC cat={r.c2} sm hl/></div>
              <div style={{fontSize:10,color:r.type==="reconcile_bond"?"#f472b6":"#67e8f9",fontFamily:"system-ui",marginTop:3}}>
                {r.type==="reconcile_bond"?`Grudge healed. ${r.c1.name.split(" ")[0]} and ${r.c2.name.split(" ")[0]} are now bonded 💕`:`Grudge healed. The tension has passed.`}
              </div>
            </div>}
            {r.type==="bond"&&<div>
              <div style={{fontStyle:"italic",color:"#f472b688",fontSize:13,lineHeight:1.5,fontFamily:"system-ui",marginBottom:4}}>{pk(DEN_BOND)(r.c1.name.split(" ")[0],r.c2.name.split(" ")[0])}</div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}><CC cat={r.c1} sm hl/><span style={{color:"#f472b688",fontSize:14}}>💕</span><CC cat={r.c2} sm hl/></div>
              <div style={{fontSize:10,color:"#f472b6",fontFamily:"system-ui",marginTop:3}}>💕 {r.c1.name.split(" ")[0]} and {r.c2.name.split(" ")[0]} bonded</div>
            </div>}
            {r.type==="death"&&<div>
              <div style={{fontStyle:"italic",color:"#ef444488",fontSize:13,lineHeight:1.5,fontFamily:"system-ui",marginBottom:6}}>{pk(DEN_DEATH)(r.c1.name.split(" ")[0],r.c2.name.split(" ")[0],r.victim.name.split(" ")[0])}</div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}><CC cat={r.c1} sm/><span style={{color:"#ef444488",fontSize:14}}>💀</span><CC cat={r.c2} sm/></div>
              <div style={{textAlign:"center",marginTop:8,padding:"8px 12px",borderRadius:8,background:"#ef444411",border:"1px solid #ef444422"}}>
                <div style={{fontSize:12,color:"#ef4444",fontWeight:700}}>{r.victim.name}</div>
                <div style={{fontSize:10,color:"#888",fontFamily:"system-ui",marginTop:2}}>Power {r.victim.power} {BREEDS[r.victim.breed].icon} {r.victim.breed} {r.victim.trait.icon} {r.victim.trait.name}</div>
                <div style={{fontSize:10,color:"#ef444488",fontFamily:"system-ui",marginTop:2}}>{r.victim.stats?.tp>0?`Played ${r.victim.stats.tp} hands. Best: ${r.victim.stats.bs?.toLocaleString()}.`:"Never got to play."}</div>
              </div>
            </div>}
          </div>
        );})}{/* end denRes.map */}
        {/* ★ v38: Skip hint during cascade */}
        {!denDone&&denRes.length>1&&<div style={{fontSize:10,color:"#ffffff22",fontFamily:"system-ui",letterSpacing:2,animation:"fadeIn 1s ease-out"}}>TAP TO SKIP ⏭</div>}
        {/* ★ v46: BABY NAMING. name the newborns */}
        {denDone&&denRes.some(r=>r.type==="breed")&&<div style={{width:"100%",maxWidth:420,padding:"8px 12px",borderRadius:8,background:"#4ade8008",border:"1px solid #4ade8022"}}>
          <div style={{fontSize:10,color:"#4ade80",letterSpacing:2,fontWeight:700,marginBottom:6}}>🐣 NAME THE NEWBORNS</div>
          {denRes.filter(r=>r.type==="breed").map(r=>{
            const babies=[r.baby,...(r.twin2?[r.twin2]:[])];
            return babies.map(b=>(<div key={b.id} style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
              <span style={{fontSize:10,color:BREEDS[b.breed]?.color||"#888"}}>{BREEDS[b.breed]?.icon} {b.sex==="M"?"♂":"♀"}</span>
              <input value={babyNames[b.id]!==undefined?babyNames[b.id]:b.name.split(" ")[0]} onChange={e=>setBabyNames(n=>({...n,[b.id]:e.target.value.slice(0,12)}))}
                style={{background:"#ffffff08",border:"1px solid #4ade8033",borderRadius:4,padding:"3px 8px",color:"#e8e6e3",fontSize:11,fontFamily:"system-ui",width:120,outline:"none"}}
                onClick={e=>e.stopPropagation()} placeholder="Name..."/>
              <span style={{fontSize:9,color:"#666",fontFamily:"system-ui"}}>Power {b.power} {b.trait.icon}{b.trait.name}</span>
            </div>));
          })}
        </div>}
        {denDone&&<button onClick={()=>{
          // ★ v46: Apply baby renames before leaving den
          if(Object.keys(babyNames).length>0){
            const rename=arr=>arr.map(c=>{
              if(babyNames[c.id]!==undefined){const parts=c.name.split(" ");parts[0]=babyNames[c.id]||parts[0];return{...c,name:parts.join(" ")};}return c;
            });
            setHand(rename);setDraw(rename);setDisc(rename);
          }
          setBabyNames({});
          if(denStRef.current)clearTimeout(denStRef.current);setDenRes(null);setDenStep(-1);nextBlind();
        }} style={{...BTN("linear-gradient(135deg,#fbbf24,#f59e0b)","#0a0a1a"),marginTop:8,padding:"10px 32px",fontSize:14}}>The Sun Comes Up</button>}
      </div>
    </div>);
  }

  // ═══════════════════════════════════════════════════════
  // SHOP
  // ═══════════════════════════════════════════════════════
  if(ph==="shop"){
    const mb=getMB();const uAll=[...hand,...draw,...disc];
    const rc=(2+ante+rerollCount);
    const interestPreview=Math.min(5,Math.floor(gold/5));
    const ul=getUnlocks(meta);
    const nt=getNextTarget();
    return(<div style={W}><div style={BG}/><style>{CSS}</style>
      {/* Toast overlay */}
      {toasts.length>0&&<div style={{position:"fixed",top:12,right:12,zIndex:250,display:"flex",flexDirection:"column",gap:6,pointerEvents:"none",maxWidth:280}}>
        {toasts.map(t=>(<div key={t.id} style={{display:"flex",gap:8,alignItems:"center",padding:"8px 14px",borderRadius:8,background:"#1a1a2eee",border:`1px solid ${t.color}44`,boxShadow:`0 4px 16px #00000066,0 0 8px ${t.color}22`,animation:"slideIn .3s ease-out",fontFamily:"system-ui"}}>
          <span style={{fontSize:16,flexShrink:0}}>{t.icon}</span>
          <span style={{fontSize:12,color:t.color,fontWeight:600,lineHeight:1.3}}>{t.text}</span>
        </div>))}
      </div>}
      <div style={{width:"100%",maxWidth:700,padding:"10px 16px",zIndex:1,display:"flex",flexDirection:"column",gap:8,alignItems:"center",paddingBottom:100}}>
        {/* ★ v41: Shop header */}
        <div style={{display:"flex",justifyContent:"space-between",width:"100%",alignItems:"center"}}>
          <h2 style={{fontSize:17,color:"#fbbf24",letterSpacing:4,margin:0}}>THE MARKET</h2>
          <ProgressMap ante={ante} blind={blind} mx={MX}/>
        </div>
        <FM level={ferv} prev={pFerv}/>

        {/* First-encounter shop hint */}
        {!seen.shop&&<div style={{padding:"8px 14px",borderRadius:8,background:"#fbbf2408",border:"1px solid #fbbf2422",fontSize:11,fontFamily:"system-ui",color:"#fbbf24aa",lineHeight:1.6,textAlign:"center",maxWidth:400,animation:"fadeIn .6s ease-out"}}>
          Buy strong cats to improve your deck. Release weak ones from the Colony tab to keep hands focused. Wards give passive bonuses every hand. Unspent rations earn interest.
          <div style={{marginTop:4}}><button onClick={()=>setSeen(s=>({...s,shop:true}))} style={{fontSize:10,background:"none",border:"1px solid #fbbf2433",borderRadius:4,color:"#fbbf24",cursor:"pointer",padding:"2px 8px",fontFamily:"system-ui"}}>Got it</button></div>
        </div>}

        {/* ★ v41: Tab bar */}
        <div style={{display:"flex",gap:0,width:"100%",borderBottom:"1px solid #ffffff0a"}}>
          {[["cats","🐱 Cats"],["wards","🛡️ Wards"],["colony","👥 Colony"]].map(([id,label])=>(
            <button key={id} onClick={()=>{setShopTab(id);if(id!=="colony")setSellMode(false);}} style={{flex:1,padding:"8px 4px",fontSize:10,fontFamily:"system-ui",fontWeight:shopTab===id?700:400,color:shopTab===id?"#fbbf24":"#666",background:shopTab===id?"#fbbf2408":"transparent",border:"none",borderBottom:shopTab===id?"2px solid #fbbf24":"2px solid transparent",cursor:"pointer",transition:"all .2s"}}>{label}</button>
          ))}
        </div>

        {/* ═══ CATS TAB ═══ */}
        {shopTab==="cats"&&<div style={{width:"100%",animation:"fadeIn .3s ease-out"}}>
          {(()=>{
            const featured=sCats.find(c=>c.trait.tier==="mythic")||sCats.find(c=>c.trait.tier==="legendary")||sCats.find(c=>c.trait.tier==="rare")||sCats.find(c=>c.trait.name!=="Plain")||sCats[0];
            const rest=featured?sCats.filter(c=>c!==featured):[];
            const ftl=featured?traitTierLabel(featured.trait):null;
            return(<div>
              {featured&&ftl&&<div style={{marginBottom:8}}>
                <div style={{fontSize:10,color:featured.trait.name==="Plain"?"#4ade80":ftl.color,letterSpacing:2,marginBottom:4}}>{featured.trait.tier==="mythic"?"✨ MYTHIC FIND":featured.trait.tier==="legendary"?"⭐ LEGENDARY FIND":featured.trait.tier==="rare"?"★ RARE FIND":featured.trait.tier==="rare_neg"?"⚡ RISKY BET":featured.trait.name!=="Plain"?"★ TRAINED CAT":"FOR SALE"}</div>
                <div onClick={()=>buyCat(sCats.indexOf(featured))} style={{cursor:gold>=(featured._price||4)?"pointer":"not-allowed",display:"flex",gap:12,alignItems:"center",padding:"8px 12px",borderRadius:10,background:isHighTier(featured.trait)?`linear-gradient(135deg,${ftl.color}08,${ftl.color}02)`:"#ffffff04",border:`1px solid ${isHighTier(featured.trait)?ftl.color+"33":"#ffffff0a"}`,transition:"all .2s"}}>
                  <CC cat={featured} dis={gold<(featured._price||4)} onTraitClick={ct=>setTraitTip(ct)}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,fontWeight:700,color:BREEDS[featured.breed]?.color,fontFamily:"'Cinzel',serif"}}>{featured.name}</div>
                    <div style={{fontSize:10,color:"#888",fontFamily:"system-ui",marginTop:2}}>Power {featured.power} {BREEDS[featured.breed]?.icon} {featured.breed} {featured.sex==="M"?"♂":"♀"}</div>
                    <div style={{fontSize:10,color:featured.trait.name==="Plain"?"#555":tierColor(featured.trait),fontFamily:"system-ui",marginTop:3}}>{featured.trait.name==="Plain"?"No trait yet":featured.trait.icon+" "+featured.trait.name+": "+featured.trait.desc}</div>
                    {(featured.extraTraits||[]).map((t,ti)=><div key={ti} style={{fontSize:10,color:tierColor(t),fontFamily:"system-ui",marginTop:1}}>+{t.icon} {t.name}: {t.desc}</div>)}
                    <div style={{fontSize:10,color:"#fbbf24",fontWeight:700,marginTop:4}}>{featured._price||4}🐟</div>
                  </div>
                </div>
              </div>}
              {rest.length>0&&<div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{rest.map(c2=>{const ri=sCats.indexOf(c2);const p=c2._price||4;const gI=c2.sex==="M"?"♂":"♀";const gC2=c2.sex==="M"?"#60a5fa":"#f472b6";return(<div key={c2.id} onClick={()=>buyCat(ri)} style={{cursor:gold>=p?"pointer":"not-allowed",textAlign:"center",maxWidth:110}}><CC cat={c2} dis={gold<p} onTraitClick={ct=>setTraitTip(ct)}/><div style={{fontSize:10,color:c2.trait.tier==="rare_neg"?"#ef4444":BREEDS[c2.breed].color,marginTop:1,fontFamily:"system-ui"}}>{c2.name} <span style={{color:gC2}}>{gI}</span> <span style={{color:"#fbbf24"}}>{p}🐟</span></div></div>);})}
                </div>
              </div>}
              {!sCats.length&&<div style={{color:"#444",fontSize:10,fontFamily:"system-ui",textAlign:"center",padding:16}}>Sold out</div>}
              <div style={{display:"flex",justifyContent:"center",marginTop:8}}>
                <button onClick={reroll} disabled={gold<rc} style={{...BTN("#1a1a2e","#fbbf24",gold>=rc),border:`1px solid ${gold>=rc?"#fbbf2444":"#222"}`,fontSize:11}}>Reroll ({rc}🐟)</button>
              </div>
            </div>);
          })()}
        </div>}

        {/* ═══ WARDS TAB ═══ */}
        {shopTab==="wards"&&<div style={{width:"100%",animation:"fadeIn .3s ease-out"}}>
          {/* Available wards */}
          <div style={{fontSize:10,color:"#888",letterSpacing:2,marginBottom:6}}>AVAILABLE{sFams.some(f=>f._starter)?". choose your first ward":""}</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{sFams.map((f,i)=>{const wp=famPrice(f);return(<div key={f.id} style={{textAlign:"center",maxWidth:100}}>
            <div onClick={()=>buyFam(i)} style={{cursor:gold>=wp&&fams.length<MF?"pointer":"not-allowed"}}><FS f={f}/></div>
            <div style={{fontSize:10,color:f._starter?"#fbbf24":f.isChem?"#818cf8":"#666",marginTop:2,fontFamily:"system-ui",lineHeight:1.3}}>{f.desc}</div>
            <div style={{fontSize:10,color:"#fbbf24",fontWeight:700,marginTop:2}}>{wp}🐟{f._starter?" ★":""}</div>
          </div>);})}{!sFams.length&&(ul.fams||isFirstRun?<div style={{color:"#444",fontSize:10,fontFamily:"system-ui",textAlign:"center",padding:16}}>Sold out</div>:<div style={{color:"#333",fontSize:10,fontFamily:"system-ui",fontStyle:"italic",textAlign:"center",padding:16}}>🔒 Complete a run to unlock Wards</div>)}</div>
          {/* Your wards */}
          {fams.length>0&&<div style={{marginTop:12,borderTop:"1px solid #ffffff0a",paddingTop:8}}>
            <div style={{fontSize:10,color:"#fbbf2488",letterSpacing:2,marginBottom:4}}>YOUR WARDS ({fams.length}/{MF}) {sellMode&&<span style={{color:"#ef4444"}}>(sell 3🐟)</span>}</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{fams.map(f=><div key={f.id} style={{textAlign:"center"}}><FS f={f} sm onClick={sellMode?()=>sellFam(f):undefined}/><div style={{fontSize:10,color:"#888",fontFamily:"system-ui",marginTop:1,maxWidth:70}}>{f.name}</div></div>)}</div>
          </div>}
        </div>}


        {/* ═══ COLONY TAB ═══ */}
        {shopTab==="colony"&&<div style={{width:"100%",animation:"fadeIn .3s ease-out"}}>
          {/* Deck stats */}
          {(()=>{const ds=getDeckStats();return(<div style={{padding:"8px 12px",borderRadius:8,background:"#ffffff06",border:"1px solid #ffffff0a",fontFamily:"system-ui",fontSize:10,display:"flex",gap:6,flexWrap:"wrap",color:"#888",marginBottom:8,lineHeight:1.6}}>
            <span style={{fontWeight:700,color:"#e8e6e3"}}>{uAll.length} cats</span>
            <span style={{color:"#555"}}>·</span>
            <div style={{display:"flex",gap:4}}>
              {Object.entries(ds.bc).sort(([,a],[,b])=>b-a).map(([br,ct])=>(<span key={br} style={{color:BREEDS[br]?.color||"#888"}}>{BREEDS[br]?.icon}{ct}</span>))}
            </div>
            <span style={{color:"#555"}}>·</span>
            <span>Avg Power {ds.avgPow}</span>
            <span style={{color:"#555"}}>·</span>
            <span style={{color:"#60a5fa"}}>♂ {ds.gc.M} male</span>
            <span style={{color:"#f472b6"}}>♀ {ds.gc.F} female</span>
            {ds.scarred>0&&<><span style={{color:"#555"}}>·</span><span style={{color:"#ef4444"}}>🩹 {ds.scarred} scarred</span></>}
            {ds.bonded>0&&<><span style={{color:"#555"}}>·</span><span style={{color:"#4ade80"}}>💕 {ds.bonded} bonded</span></>}
          </div>);})()}
          {/* Release mode */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <div style={{fontSize:10,color:sellMode?"#c084fc":"#888",fontWeight:sellMode?700:400}}>
              {sellMode?<span>🕊️ THE LETTING GO <span style={{color:sellsLeft>0?"#4ade80":"#ef4444"}}>({sellsLeft} left)</span></span>
              :<span>YOUR COLONY</span>}
            </div>
            <button onClick={()=>setSellMode(!sellMode)} style={{fontSize:10,padding:"4px 12px",borderRadius:6,border:`1px solid ${sellMode?"#c084fc44":"#fbbf2444"}`,background:sellMode?"#c084fc11":"transparent",color:sellMode?"#c084fc":"#fbbf24",cursor:"pointer",fontFamily:"system-ui"}}>{sellMode?"Done":"Release..."}</button>
          </div>
          {sellMode&&<div style={{fontSize:10,color:"#c084fc88",fontFamily:"system-ui",marginBottom:6,fontStyle:"italic"}}>Each departure leaves something behind. Tap a cat to release them.</div>}
          <div style={{display:"flex",gap:4,flexWrap:"wrap",maxHeight:300,overflowY:"auto",paddingBottom:4}}>
            {uAll.map(c=>{
              const pg=getPartingGifts(c);
              const canSell=sellMode&&sellsLeft>0&&uAll.length>8&&(pg.goldVal>=0||gold>=Math.abs(pg.goldVal));
              return(<div key={c.id} style={{position:"relative"}}>
                <CC cat={c} sm onClick={sellMode&&canSell?()=>sellCat(c):undefined} dis={sellMode&&!canSell} onTraitClick={ct=>setTraitTip(ct)}/>
                {sellMode&&canSell&&<div style={{position:"absolute",top:2,right:2,fontSize:10,color:"#c084fc",fontWeight:700,background:"#000000dd",borderRadius:3,padding:"1px 3px",cursor:"pointer",maxWidth:72,lineHeight:1.3}}>
                  {pg.goldVal>0&&<span style={{color:"#4ade80"}}>+{pg.goldVal}🐟 </span>}
                  {pg.gifts.map((g,gi)=><span key={gi} style={{color:"#c084fc"}}>{g} </span>)}
                  {pg.goldVal===0&&pg.gifts.length===0&&<span style={{color:"#888"}}>free</span>}
                </div>}
              </div>);
            })}
          </div>
        </div>}

      </div>
      {/* ★ v41: Fixed bottom bar */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:100,background:"linear-gradient(180deg,transparent,#0a0a1a 8px,#0a0a1a)",padding:"8px 16px 12px",display:"flex",justifyContent:"center"}}>
        <div style={{maxWidth:700,width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
          <div style={{display:"flex",flexDirection:"column",gap:2}}>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <span style={{color:"#fbbf24",fontSize:14,fontWeight:700}}>🐟{gold}</span>
              {interestPreview>0&&<span style={{color:"#4ade80",fontSize:10,fontFamily:"system-ui"}}>+{interestPreview} stores{interestPreview>=5?" MAX":""}</span>}
              <span style={{color:"#c084fc",fontSize:10}}>✦{meta?.dust||0}</span>
            </div>
            <div style={{fontSize:10,fontFamily:"system-ui",color:"#888"}}>
              {nt?<span>Next: <span style={{color:nt.blind===2?"#ef4444":"#fbbf24",fontWeight:700}}>{nt.blindName}</span> Night {nt.ante} · Threshold: <span style={{color:"#e8e6e3",fontWeight:700}}>{nt.target.toLocaleString()}</span></span>
              :<span style={{color:"#4ade80",fontWeight:700}}>Final Round!</span>}
            </div>
          </div>
          {blind>=2?
            <button onClick={()=>{setDen([]);setPh("denSelect");}} style={{...BTN("linear-gradient(135deg,#c084fc,#a855f7)","#fff"),padding:"10px 20px",fontSize:12}}>🌙 Into the Night</button>
            :<button onClick={()=>{nextBlind();}} style={{...BTN("linear-gradient(135deg,#fbbf24,#f59e0b)","#0a0a1a"),padding:"10px 20px",fontSize:12}}>Next Round →</button>}
        </div>
      </div>
    </div>);
  }

  // ═══════════════════════════════════════════════════════
  // MAIN PLAY
  // ═══════════════════════════════════════════════════════
  const isNL=ferv===9;
  // ★ Compute grudge hints for each card vs current selection
  function getHint(cat){
    if(!sel.size)return null;
    let g=false;
    selC.forEach(s=>{
      if(hasGrudge(cat,s))g=true;
    });
    return g?{grudge:true}:null;
  }

  return(
    <div style={{...W,animation:fFlash==="down"?"shake .3s ease":"none"}}>
      <div style={BG}/><style>{CSS}</style>
      {isNL&&<div style={{position:"fixed",inset:0,border:"2px solid #fef08a44",pointerEvents:"none",zIndex:50,animation:"glow 2s ease-in-out infinite"}}/>}
      {reshuf&&<div style={{position:"fixed",top:"40%",left:"50%",transform:"translate(-50%,-50%)",zIndex:200,animation:"flash .8s ease-out forwards",fontSize:13,color:"#fbbf24",letterSpacing:4,fontWeight:700,whiteSpace:"nowrap"}}>♻ RESHUFFLE</div>}

      {/* ★ v33: Toast notification overlay */}
      {toasts.length>0&&<div style={{position:"fixed",top:12,right:12,zIndex:250,display:"flex",flexDirection:"column",gap:6,pointerEvents:"none",maxWidth:280}}>
        {toasts.map(t=>(<div key={t.id} style={{display:"flex",gap:8,alignItems:"center",padding:"8px 14px",borderRadius:8,background:"#1a1a2eee",border:`1px solid ${t.color}44`,boxShadow:`0 4px 16px #00000066,0 0 8px ${t.color}22`,animation:"slideIn .3s ease-out",fontFamily:"system-ui"}}>
          <span style={{fontSize:16,flexShrink:0}}>{t.icon}</span>
          <span style={{fontSize:12,color:t.color,fontWeight:600,lineHeight:1.3}}>{t.text}</span>
        </div>))}
      </div>}

      {/* ★ v40: Guided first hand. teach by doing, not by reading */}
      {/* ★ v47: AUTO-PLAY BANNER. shows during first-hand demo */}
      {autoPlay&&ph==="playing"&&<div style={{position:"fixed",bottom:60,left:"50%",transform:"translateX(-50%)",zIndex:150,padding:"14px 24px",borderRadius:12,background:"#0a0a1aee",border:"1px solid #4ade8044",maxWidth:340,animation:"fadeIn .6s ease-out",textAlign:"center",fontFamily:"system-ui",boxShadow:"0 8px 32px #00000088"}}>
        <div style={{fontSize:14,color:"#4ade80",fontWeight:700,marginBottom:4}}>{
          autoPlay.step===0?"👀 Watch this first hand..."
          :autoPlay.step===1?"Selecting same-season cats..."
          :autoPlay.step===2?`Selecting ${autoPlay.idxs?.length||0} ${hand[autoPlay.idxs?.[0]]?BREEDS[hand[autoPlay.idxs[0]].breed]?.name:""} cats`
          :"Playing the hand..."
        }</div>
        <div style={{fontSize:11,color:"#4ade80aa",lineHeight:1.5}}>{
          autoPlay.step===0?"The game will play one hand to show you how scoring works."
          :autoPlay.step<=2?"More cats of the same season = stronger hand."
          :"Watch how each cat adds to the score..."
        }</div>
        <button onClick={()=>{if(autoRef.current)clearTimeout(autoRef.current);if(stRef.current)clearTimeout(stRef.current);setSel(new Set());setAutoPlay(null);setGuide({step:3,msg:""});}} style={{marginTop:8,fontSize:10,background:"none",border:"1px solid #4ade8033",borderRadius:4,color:"#4ade8066",cursor:"pointer",padding:"3px 10px"}}>Skip demo →</button>
      </div>}
      {guide&&!autoPlay&&ante===1&&blind===0&&ph==="playing"&&(()=>{
        // Compute guide context
        const selCats=[...sel].map(i=>hand[i]).filter(Boolean);
        const breedCounts={};selCats.forEach(c=>{breedCounts[c.breed]=(breedCounts[c.breed]||0)+1;});
        const hasPair=Object.values(breedCounts).some(v=>v>=2);
        const pairBreed=hand.reduce((acc,c)=>{acc[c.breed]=(acc[c.breed]||0)+1;return acc;},{});
        const suggestBreed=Object.entries(pairBreed).sort((a,b)=>b[1]-a[1]).find(([,v])=>v>=2);

        let msg="",sub="";
        if(guide.step===0){
          const bIcon=suggestBreed?BREEDS[suggestBreed[0]]?.icon:"";
          msg=`${bIcon} Tap the glowing cats`;
          sub="Cats of the same season score better together.";
        }else if(guide.step===1){
          const ht=evalH?.(selCats);
          msg=`✨ ${ht?.name||"Hand"}! Hit Play ▶`;
          sub="Watch how each cat adds to the score.";
        }else if(guide.step===2){
          msg="Each cat adds to the score.";
          sub="Matching seasons multiply everything. That's the whole game.";
        }else if(guide.step===3){
          const need=Math.max(0,tgt-rScore);
          const postAuto=!autoPlay&&isFirstRun&&ante===1&&blind===0&&hLeft>=2;
          msg=postAuto?"Your turn! 🎮":need>0?`${hLeft} hand${hLeft!==1?"s":""} left. Need ${need.toLocaleString()} more.`:"Threshold cleared! 🎉";
          sub=postAuto?`${hLeft} hands left. Tap cats that share a season, then hit Play.`:need>0?"Pick a different group, or discard to draw new ones.":"Keep playing for bonus rations.";
        }
        return(<div style={{position:"fixed",bottom:guide.step>=2?280:220,left:"50%",transform:"translateX(-50%)",zIndex:150,padding:"12px 20px",borderRadius:12,background:"#0a0a1aee",border:"1px solid #fbbf2444",maxWidth:340,animation:"fadeIn .6s ease-out",textAlign:"center",fontFamily:"system-ui",boxShadow:"0 8px 32px #00000088"}}>
          <div style={{fontSize:14,color:"#fbbf24",fontWeight:700,marginBottom:3}}>{msg}</div>
          <div style={{fontSize:11,color:"#fbbf24aa",lineHeight:1.5}}>{sub}</div>
          <button onClick={()=>{if(guide.step>=3){setGuide(null);setSeen(s=>({...s,guided:true}));}else setGuide(g=>({...g,step:Math.min(3,g.step+1)}));}} style={{marginTop:6,fontSize:10,background:"none",border:"1px solid #fbbf2433",borderRadius:4,color:"#fbbf2488",cursor:"pointer",padding:"3px 10px"}}>{guide.step>=3?"Got it!":"Skip"}</button>
        </div>);
      })()}

      {/* Header */}
      <div style={{width:"100%",maxWidth:700,padding:"8px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",zIndex:1,borderBottom:`1px solid ${isBoss?"#ef444422":"#ffffff0a"}`}}>
        <div><div style={{fontSize:10,color:"#888",letterSpacing:2}}>NIGHT {ante}/{MX} <span style={{color:"#555"}}>Round {blind+1}/3</span></div><div style={{fontSize:13,fontWeight:700,color:isBoss?"#ef4444":"#fbbf24"}}>{blindN[blind]}</div><ProgressMap ante={ante} blind={blind} mx={MX}/></div>
        <div style={{textAlign:"center"}}><div style={{fontSize:10,color:"#888",letterSpacing:2}}>SCORE</div><div style={{fontSize:17,fontWeight:900}}><span style={{color:rScore>=tgt?"#4ade80":"#e8e6e3"}}>{rScore.toLocaleString()}</span><span style={{color:"#444",fontSize:11}}> / {tgt.toLocaleString()}</span></div>
            {rScore<tgt&&hLeft>0&&(()=>{const nph=Math.ceil((tgt-rScore)/hLeft);return (<div style={{fontSize:10,color:nph>45000?"#ef4444":nph>24000?"#fb923c":"#888",fontFamily:"system-ui",fontWeight:nph>45000?700:400,animation:nph>45000?"fpp 2s ease infinite":"none"}}>Need {nph.toLocaleString()}/hand</div>);})()}
        </div>
        <div style={{textAlign:"right"}}><div style={{color:"#fbbf24",fontWeight:700,fontSize:13}}>🐟{gold}</div><div style={{fontSize:10,color:"#4ade80",fontFamily:"system-ui"}}>{Math.min(5,Math.floor(gold/5))>0?`+${Math.min(5,Math.floor(gold/5))} stores`:""}</div></div>
        <button onClick={e=>{e.stopPropagation();toggleMute();}} style={{background:"none",border:"none",fontSize:14,cursor:"pointer",opacity:.4,padding:4}} title={muted?"Unmute":"Mute"}>{muted?"🔇":"🔊"}</button>
        <button onClick={e=>{e.stopPropagation();setDeckView(true);}} style={{background:"none",border:"none",fontSize:14,cursor:"pointer",opacity:.4,padding:4}} title="View deck">📋</button>
      </div>

      {isBoss&&curses.length>0&&<div style={{display:"flex",gap:4,padding:"3px 16px",zIndex:1,maxWidth:700,width:"100%",flexWrap:"wrap"}}>
        {curses.map((c,i)=>(<div key={i} title={c.desc} style={{display:"flex",alignItems:"center",gap:2,padding:"2px 6px",borderRadius:5,background:"#ef444411",border:"1px solid #ef444433",fontSize:10,color:"#ef4444",fontFamily:"system-ui"}}>{c.icon} <span style={{fontWeight:600}}>{c.name}</span></div>))}
        {cfx.exileBreed&&<div style={{display:"flex",alignItems:"center",gap:2,padding:"2px 6px",borderRadius:5,background:"#ef444411",border:"1px solid #ef444433",fontSize:10,color:"#ef4444",fontFamily:"system-ui"}}>{BREEDS[cfx.exileBreed].icon} Exiled</div>}
      </div>}
      {/* ★ v30: Last hand warning */}
      {hLeft===1&&rScore<tgt&&ph==="playing"&&<div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"4px 16px",zIndex:1,maxWidth:700,width:"100%",animation:"fpp 1.5s ease infinite"}}>
        <span style={{fontSize:10,fontWeight:900,color:"#ef4444",letterSpacing:3,fontFamily:"system-ui"}}>⚠ LAST HAND. MAKE IT COUNT</span>
      </div>}
      {/* ★ v38: Fallen strip moved to night transition only */}
      {/* ★ v38: Den news moved to night transition only */}

      <div style={{width:"100%",maxWidth:700,zIndex:1,padding:"3px 0"}}><FM level={ferv} prev={pFerv}/></div>

      {/* ★ v38: Wards collapsed to icon row */}
      {fams.length>0&&<div style={{display:"flex",gap:3,padding:"0 16px",zIndex:1,maxWidth:700,width:"100%",justifyContent:"center",alignItems:"center",flexWrap:"wrap"}}>
        {fams.map(f=>(<span key={f.id} title={`${f.name}: ${f.desc}`} onClick={()=>toast(f.icon,`${f.name}: ${f.desc}`,"#fbbf24")} style={{fontSize:14,opacity:cfx.silence?.3:1,cursor:"pointer",padding:"2px"}}>{f.icon}</span>))}
        {cfx.silence&&<span style={{fontSize:10,color:"#ef444488",fontFamily:"system-ui"}}>🤐</span>}
      </div>}

      {/* ★ v38: Last hand line removed (redundant with score counter) */}

      <div style={{width:"100%",maxWidth:700,padding:"0 16px",zIndex:1}}><div style={{height:3,background:"#1a1a2e",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(100,(rScore/tgt)*100)}%`,background:isNL?"linear-gradient(90deg,#b85c2c,#f59e0b,#fef08a,#ffffffcc)":"linear-gradient(90deg,#fbbf24,#4ade80)",borderRadius:2,transition:"width .5s ease-out"}}/></div></div>

      {/* Scoring overlay with running counter */}
      {ph==="scoring"&&sRes&&(
        <div onClick={scoringDone?advanceFromScoring:skipScoring} style={{cursor:"pointer",position:"fixed",inset:0,background:"#000000cc",zIndex:100,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:0,
          animation:scoreShake>0?`bigShake ${0.2+scoreShake*0.08}s ease`:"none"}}>
          {/* ★ v47: Brightness flash on xMult */}
          {scoringFlash&&<div style={{position:"absolute",inset:0,background:scoringFlash,opacity:.08,pointerEvents:"none",transition:"opacity .15s",zIndex:101}}/>}

          {/* ═══ FOCAL POINT 1: THE COUNTER BLOCK ═══ */}
          {/* Everything the eye needs lives here. No separate zones. */}
          {(()=>{
            const s=sStep>=0&&sStep<sRes.bd.length?sRes.bd[sStep]:null;
            const done=sStep>=sRes.bd.length-1;
            const curTotal=done?sRes.total:((runChips||0)*Math.max(1,runMult||0));
            const pct=tgt>0?Math.min(100,(curTotal+rScore)/tgt*100):0;
            const nearMiss=pct>=70&&pct<100;
            const tier=done?getScoreTier(sRes.total):null;
            // ★ v47: First-cascade plain-english annotations
            const _fc=scoreEndRef.current?.isFirstCascade;
            const stepTotalsRef=scoreEndRef.current?.stepTotals||[];
            let annotation=null;
            if(_fc&&s&&!done){
              const t=s.type;
              if(t==="hand"&&!fcSeenRef.current.hand){fcSeenRef.current.hand=true;annotation="Matching seasons = stronger hand type";}
              else if(t==="cat"&&!fcSeenRef.current.cat){fcSeenRef.current.cat=true;annotation="Each cat's Power adds Chips";}
              else if((t==="trait"||t==="scar")&&!fcSeenRef.current.trait){fcSeenRef.current.trait=true;annotation="Icons show traits and scars. They stack!";}
              else if(t==="trait_rare"&&!fcSeenRef.current.rare){fcSeenRef.current.rare=true;annotation="Rare traits MULTIPLY everything";}
              else if(t==="bond"&&!fcSeenRef.current.bond){fcSeenRef.current.bond=true;annotation="Bonded pairs multiply everything";}
              else if(t==="nerve"&&!fcSeenRef.current.nerve){fcSeenRef.current.nerve=true;annotation="Nerve builds when you crush targets";}
            }

            // Counter color reacts to what just happened (Aristocrat: counter tells the story)
            const hasX=s&&!!s.xMult;
            const counterColor=done?(tier?.color||"#e8e6e3")
              :!s?"#e8e6e3"
              :s.type==="hand"?"#fbbf24"
              :hasX?"#fef08a"
              :s.type==="nerve"?(NERVE[ferv]?.color||"#d97706")
              :s.type==="bond"||s.type==="lineage"?"#4ade80"
              :s.type==="grudge_prove"?"#fbbf24"
              :s.type==="grudge_tension"?"#fb923c"
              :s.type==="trait"||s.type==="scar"?"#60a5fa"
              :s.type==="cat"&&s.passiveBreed?(BREEDS[s.passiveBreed]?.color||"#3b82f6")
              :s.type==="curse"||(s.mult<0)?"#ef4444"
              :s.chips&&!s.mult?"#60a5fa"
              :"#e8e6e3";

            // Counter scale: ★ DOPAMINE: responds to % jump in total, not just xMult
            const prevStepTotal=sStep>0&&sStep<stepTotalsRef.length?stepTotalsRef[sStep-1]:0;
            const curStepTotal=sStep>=0&&sStep<stepTotalsRef.length?stepTotalsRef[sStep]:0;
            const jumpPct=prevStepTotal>0?(curStepTotal-prevStepTotal)/prevStepTotal:0;
            const counterScale=done?1.1
              :hasX?(s.xMult>=2?1.35:1.25)
              :jumpPct>0.5?1.18    // 50%+ jump = visible pop
              :jumpPct>0.2?1.1     // 20%+ jump = subtle pop
              :s?.isBigCat?1.08
              :1;

            // Flavor pools — variable ratio reinforcement (prevents habituation)
            const pools={
              bond:["Love multiplies.","Together, more.","The bond holds.","Stronger as one."],
              lineage:["Blood remembers.","Family fights harder.","Generations deep."],
              grudge_prove:["Something to prove.","Rage is fuel.","They'll show them.","Spite burns bright."],
              grudge_tension:["Old wounds fester.","They can't focus.","History weighs."],
              nerve:NERVE[ferv]?.desc?[NERVE[ferv].desc]:[],
              fam:["A ward watches.","Silent guardian."],
              cat:s?.passiveBreed&&BREED_PASSIVE[s.passiveBreed]?[BREED_PASSIVE[s.passiveBreed].desc]:["Holding the line.","Every cat counts."],
              trait:["Instinct kicks in.","Bred for this.","It's in their nature.","Training pays off."],
              trait_rare:["Power compounds.","The engine roars.","It keeps stacking.","Transcendent."],
              scar:["What doesn't kill…","Battle-hardened.","Scars are armor.","Earned, not given."],
              curse:["The dark pushes back.","A price paid."],
              gold:["Fortune favors them."],
              provider:["Resourceful."],
            };
            let pool=null;
            if(s){
              if(s.type==="cat")pool=pools.cat;
              else if(s.type==="bond")pool=pools.bond;
              else if(s.type==="lineage")pool=pools.lineage;
              else if(s.type==="grudge_prove")pool=pools.grudge_prove;
              else if(s.type==="grudge_tension")pool=pools.grudge_tension;
              else if(s.type==="nerve")pool=pools.nerve;
              else if(s.type==="fam")pool=pools.fam;
              else if(s.type==="trait")pool=pools.trait;
              else if(s.type==="trait_rare")pool=pools.trait_rare;
              else if(s.type==="scar")pool=pools.scar;
              else if(s.type==="curse")pool=pools.curse;
              else if(s.type==="gold")pool=pools.gold;
              else if(s.type==="provider")pool=pools.provider;
            }
            const flavor=pool&&pool.length>0?pool[sStep%pool.length]:null;

            // Step label color — ★ DOPAMINE: collapsed types (cat with passiveBreed gets breed color)
            const stepColor=!s?"#888":s.type==="hand"?"#fbbf24":s.type==="cat"?(s.passiveBreed?BREEDS[s.passiveBreed]?.color||"#3b82f6":"#3b82f6"):s.type==="trait"?"#60a5fa":s.type==="trait_rare"?"#fbbf24":s.type==="scar"?"#fb923c":s.type==="fam"?"#c084fc":s.type==="bond"?"#4ade80":s.type==="lineage"?"#34d399":s.type==="grudge_prove"?"#fbbf24":s.type==="grudge_tension"?"#fb923c":s.type==="boss_trait"?"#ef4444":s.type==="provider"?"#4ade80":s.type==="nerve"?(NERVE[ferv]?.color||"#d97706"):s.type==="curse"?"#ef4444":s.type==="gold"?"#fbbf24":"#888";

            return(<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:0,
              transform:`scale(${counterScale})`,transition:"transform .3s ease-out",
              padding:"8px 20px",borderRadius:16,
              background:nearMiss&&!done?"#ef444408":hasX?"#fbbf2408":"transparent",
              boxShadow:nearMiss&&!done?`0 0 40px #ef444422`:hasX?`0 0 60px ${counterColor}22`:"none",
              border:nearMiss&&!done?"1px solid #ef444422":hasX?"1px solid #fbbf2422":"1px solid transparent",
            }}>

              {/* Hand type. small, establishes context */}
              <div style={{fontSize:done?14:20,fontWeight:900,letterSpacing:done?3:6,
                color:sRes.bd.some(b=>b.type==="nerve")?NERVE[ferv].color:"#fbbf24",
                textShadow:`0 0 20px ${sRes.bd.some(b=>b.type==="nerve")?NERVE[ferv].color:"#fbbf24"}44`,
                fontFamily:"'Cinzel',serif",marginBottom:done?2:4,
                transition:"font-size .3s, letter-spacing .3s",
                opacity:done?.6:1,
              }}>{sRes.ht}</div>

              {/* THE NUMBER. the hero. Eye magnet. Changes color per step type. */}
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <div style={{textAlign:"center"}}>
                  <span style={{color:"#3b82f6",fontWeight:900,fontSize:done?24:16,transition:"font-size .2s"}}>{runChips||sRes.bd[0]?.chips||0}</span>
                  {_fc&&!done&&<div style={{fontSize:7,color:"#3b82f688",fontFamily:"system-ui",letterSpacing:1}}>CHIPS</div>}
                </div>
                <span style={{color:"#555",fontSize:12}}>×</span>
                <div style={{textAlign:"center"}}>
                  <span style={{color:"#ef4444",fontWeight:900,fontSize:done?24:16,transition:"font-size .2s"}}>{runMult||1}</span>
                  {_fc&&!done&&<div style={{fontSize:7,color:"#ef444488",fontFamily:"system-ui",letterSpacing:1}}>MULT</div>}
                </div>
                <span style={{color:"#555",fontSize:12}}>=</span>
                <div style={{textAlign:"center"}}>
                  <span style={{fontWeight:900,
                    fontSize:done?36:22,
                    color:counterColor,
                    textShadow:`0 0 20px ${counterColor}66${done?", 0 0 60px "+counterColor+"33":""}`,
                    animation:done?"scorePop .5s ease-out":hasX?"multFlash .4s ease-out":"none",
                    transition:"all .15s",fontFamily:"system-ui",
                  }}>{curTotal.toLocaleString()}</span>
                  {_fc&&!done&&<div style={{fontSize:7,color:counterColor+"88",fontFamily:"system-ui",letterSpacing:1}}>SCORE</div>}
                </div>
              </div>

              {/* Flavor. subtitle OF the counter, not a separate zone */}
              {!done&&flavor&&<div style={{fontSize:11,color:counterColor+"bb",fontFamily:"system-ui",fontStyle:"italic",letterSpacing:1.5,marginTop:2,animation:"fadeIn .15s ease-out",maxWidth:260,textAlign:"center",lineHeight:1.3}}>{flavor}</div>}
              {/* ★ v47: First-cascade plain-english annotation */}
              {!done&&annotation&&<div style={{fontSize:10,color:"#4ade80",fontFamily:"system-ui",marginTop:4,padding:"3px 12px",borderRadius:8,background:"#4ade800a",border:"1px solid #4ade8022",animation:"fadeIn .3s ease-out",maxWidth:280,textAlign:"center",lineHeight:1.4,letterSpacing:.5}}>💡 {annotation}</div>}

              {/* Step label. footnote OF the counter */}
              {s&&!done&&<div style={{marginTop:2,textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:1}}>
                <div style={{
                  fontSize:s.type==="hand"?14:hasX?14:s.type==="nerve"?13:s.isBigCat?12:s.type==="bond"?11:10,
                  fontFamily:s.type==="hand"||hasX?"'Cinzel',serif":"system-ui",
                  letterSpacing:s.type==="hand"?3:hasX?2:1,
                  fontWeight:900,color:stepColor,opacity:.85,
                  animation:s.type==="hand"?"comboBurst .5s ease-out":hasX?"multFlash .4s ease-out":s.type==="nerve"?"comboBurst .4s ease-out":s.isBigCat?"comboBurst .35s ease-out":"fadeIn .15s ease-out",
                }}>{s.label}</div>
                {hasX&&<div style={{fontSize:s.xMult>=2?28:s.xMult>=1.5?24:20,fontWeight:900,color:"#fef08a",letterSpacing:s.xMult>=2?6:4,
                  animation:"multFlash .5s ease-out",
                  textShadow:`0 0 ${s.xMult>=2?30:20}px #fbbf24cc`,
                  background:"linear-gradient(135deg,#fbbf24,#fef08a)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
                }}>×{s.xMult}</div>}
                {(s.type==="bond"||s.type==="cat"||s.type==="trait"||s.type==="scar"||s.type==="trait_rare")&&(s.chips||s.mult)?<div style={{fontSize:10,color:stepColor+"cc",fontFamily:"system-ui",fontWeight:700}}>
                  {s.chips>0?`+${s.chips} chips `:""}{"  "}{s.mult>0?`+${s.mult} mult`:s.mult<0?`${s.mult} mult`:""}
                </div>:null}
              </div>}

              {/* ★ DOPAMINE: Progress bar. heartbeat when close, FLASH on threshold cross */}
              {!done&&<div style={{width:160,height:nearMiss?6:3,background:"#ffffff0a",borderRadius:3,overflow:"hidden",marginTop:4,transition:"height .3s",
                animation:nearMiss?"breathe 1.2s ease infinite":"none"}}>
                <div style={{height:"100%",width:`${pct}%`,borderRadius:3,transition:"width .3s ease-out",
                  background:pct>=100?"linear-gradient(90deg,#4ade80,#22d3ee)":nearMiss?"linear-gradient(90deg,#fb923c,#ef4444)":"linear-gradient(90deg,#fbbf2444,#4ade8044)",
                  boxShadow:pct>=100?"0 0 16px #4ade8088":nearMiss?"0 0 12px #ef444466":"none"
                }}/>
              </div>}
              {!done&&pct>=100&&<div style={{fontSize:10,color:"#4ade80",fontFamily:"system-ui",letterSpacing:3,fontWeight:900,animation:"comboBurst .5s ease-out",marginTop:1,textShadow:"0 0 12px #4ade8066"}}>TARGET PASSED ✦</div>}
              {!done&&nearMiss&&pct<100&&<div style={{fontSize:9,color:"#ef4444aa",fontFamily:"system-ui",letterSpacing:2,animation:"fpp 1.5s ease infinite",marginTop:1}}>ALMOST THERE</div>}

              {/* TIER REACTION. climax replaces the counter vibe */}
              {done&&tier?.label&&<div style={{textAlign:"center",animation:"tierReveal .5s ease-out",marginTop:4}}>
                <div style={{fontSize:20,fontWeight:900,letterSpacing:8,color:tier.color,
                  textShadow:`0 0 30px ${tier.color}aa, 0 0 60px ${tier.color}44`,fontFamily:"'Cinzel',serif"
                }}>{tier.label}</div>
                {tier.sub&&<div style={{fontSize:11,color:tier.color,opacity:.7,letterSpacing:3,fontFamily:"system-ui",marginTop:2}}>{tier.sub}</div>}
                {tier.nar&&<div style={{fontSize:12,color:"#aaa",fontStyle:"italic",fontFamily:"system-ui",marginTop:3,opacity:.7}}>{tier.nar}</div>}
              </div>}

              {/* New best. part of the counter celebration */}
              {done&&newBest&&<div style={{fontSize:10,fontWeight:700,color:"#fbbf24",letterSpacing:3,animation:"newBestPop .5s ease-out",fontFamily:"system-ui",background:"#fbbf2418",padding:"3px 12px",borderRadius:20,border:"1px solid #fbbf2433",marginTop:4}}>NEW BEST {newBest.toUpperCase()}</div>}

              {/* ★ v47: First-cascade completion summary */}
              {done&&_fc&&<div style={{fontSize:11,color:"#4ade80",fontFamily:"system-ui",marginTop:6,padding:"6px 14px",borderRadius:8,background:"#4ade800a",border:"1px solid #4ade8022",animation:"fadeIn .6s ease-out .3s both",maxWidth:300,textAlign:"center",lineHeight:1.5}}>
                <b>Chips × Mult = Score.</b> Match seasons, stack traits, and multiply everything. That's the whole game.
              </div>}

            </div>);
          })()}

          {/* ═══ THE BREATH ═══ */}
          {/* Empty space between counter and cats. The anticipation gap. */}
          <div style={{height:scoringDone?8:16}}/>

          {/* Skip hint. whisper in the breath */}
          {!scoringDone&&sStep>=2&&<div style={{fontSize:10,color:"#ffffff18",fontFamily:"system-ui",letterSpacing:2,animation:"fadeIn 1.5s ease-out"}}>TAP TO SKIP ⏭</div>}

          {/* Continue. replaces the breath */}
          {scoringDone&&(
            <button onClick={advanceFromScoring} style={{background:"linear-gradient(135deg,#fbbf24,#f59e0b)",color:"#0a0a1a",border:"none",borderRadius:10,padding:"10px 32px",fontSize:13,fontWeight:700,cursor:"pointer",letterSpacing:1,fontFamily:"system-ui",boxShadow:"0 0 24px #fbbf2444",animation:"fadeIn .3s ease-out"}}>Continue</button>
          )}

          {/* v16: Visual Cat Scoring - each cat fires left to right */}
          <div style={{display:"flex",gap:6,justifyContent:"center",alignItems:"flex-start",padding:"4px 8px",flexWrap:"wrap"}}>
            {scoringCats.map((cat,ci)=>{
              const mySteps=sRes.bd.filter((s,si)=>s.catIdx===ci&&si<=sStep);
              const isActive=sRes.bd[sStep]?.catIdx===ci;
              const hasFired=mySteps.length>0;
              const totalC=mySteps.reduce((a,s)=>a+(s.chips||0),0);
              const totalM=mySteps.reduce((a,s)=>a+(s.mult||0),0);
              const xVals=mySteps.filter(s=>s.xMult).map(s=>s.xMult);
              return(
                <div key={cat.id} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,
                  animation:isActive?"cardFire .35s ease":"none",
                  opacity:hasFired?1:0.25,transition:"opacity .3s"}}>
                  <div style={{position:"relative"}}>
                    <CC cat={cat} sm sel={isActive} hl={hasFired&&!isActive}/>
                    {isActive&&<div style={{position:"absolute",inset:-2,borderRadius:14,border:"2px solid #fbbf24",boxShadow:"0 0 16px #fbbf2466",pointerEvents:"none",animation:"glow 1s ease infinite"}}/>}
                  </div>
                  <div style={{minHeight:24,display:"flex",flexDirection:"column",alignItems:"center",gap:0}}>
                    {hasFired&&<div style={{display:"flex",gap:3,alignItems:"center",animation:"countUp .3s ease-out"}}>
                      {totalC!==0&&<span style={{fontSize:10,color:"#3b82f6",fontWeight:700,fontFamily:"system-ui"}}>{totalC>0?"+":""}{totalC}</span>}
                      {totalM!==0&&<span style={{fontSize:10,color:"#ef4444",fontWeight:700,fontFamily:"system-ui"}}>{totalM>0?"+":""}{totalM}M</span>}
                    </div>}
                    {xVals.map((x,xi)=><span key={xi} style={{fontSize:10,color:"#fbbf24",fontWeight:900,fontFamily:"system-ui",animation:"scorePop .3s ease",textShadow:"0 0 8px #fbbf2466"}}>x{x}</span>)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Global effects (bonds, grudges, wards, nerve) */}
          <div style={{display:"flex",gap:4,flexWrap:"wrap",justifyContent:"center",maxWidth:360}}>
            {sRes.bd.slice(0,sStep+1).filter(s=>s.catIdx===undefined&&s.type!=="hand").map((s,i)=>(
              <div key={i} style={{display:"flex",gap:3,alignItems:"center",animation:"slideIn .2s ease-out",fontSize:10,fontFamily:"system-ui",
                padding:"2px 6px",borderRadius:4,
                background:s.type==="nerve"?NERVE[ferv].color+"18":s.type==="bond"?"#4ade8018":s.type==="lineage"?"#34d39918":s.type==="grudge_tension"?"#ef444418":s.type==="grudge_prove"?"#4ade8018":"#ffffff08",
                border:`1px solid ${s.type==="nerve"?NERVE[ferv].color+"33":s.type==="bond"?"#4ade8033":s.type==="lineage"?"#34d39933":s.type==="grudge_tension"?"#ef444433":s.type==="grudge_prove"?"#4ade8033":"#ffffff11"}`}}>
                <span style={{color:s.type==="nerve"?NERVE[ferv].color:s.type==="curse"?"#ef4444":s.type==="bond"?"#4ade80":s.type==="grudge_tension"?"#ef4444":s.type==="grudge_prove"?"#4ade80":"#888",fontWeight:700}}>{s.label}</span>
                {s.xMult&&<span style={{color:"#fbbf24",fontWeight:700}}>x{s.xMult}</span>}
                {!s.xMult&&s.mult!==0&&<span style={{color:s.mult>0?"#ef4444":"#888",fontWeight:700}}>{s.mult>0?"+":""}{s.mult}M</span>}
              </div>
            ))}
          </div>

          {/* v16: Aftermath - what happened to your cats */}
          {sStep>=sRes.bd.length-1&&aftermath.length>0&&(
            <div style={{display:"flex",flexDirection:"column",gap:3,alignItems:"center",marginTop:2,padding:"6px 12px",borderRadius:8,background:"#ffffff06",border:"1px solid #ffffff0a"}}>
              {aftermath.map((a,i)=>(
                <div key={i} style={{fontSize:10,fontFamily:"system-ui",color:a.color,fontWeight:600,
                  animation:`fadeIn .4s ease-out ${i*0.15}s both`}}>
                  {a.icon} {a.text}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Deck Viewer */}
      {deckView&&(
        <div onClick={()=>setDeckView(false)} style={{position:"fixed",inset:0,zIndex:140,display:"flex",alignItems:"center",justifyContent:"center",background:"#000000cc",padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"linear-gradient(145deg,#1a1a2e,#0d0d1a)",border:"1px solid #ffffff11",borderRadius:14,padding:"16px 20px",maxWidth:480,width:"100%",maxHeight:"80vh",overflowY:"auto",animation:"fadeIn .15s ease-out"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontSize:12,color:"#888",letterSpacing:3}}>COLONY · {allC.length} CATS</div>
              <button onClick={()=>setDeckView(false)} style={{background:"none",border:"none",color:"#666",fontSize:16,cursor:"pointer"}}>✕</button>
            </div>
            {(()=>{
              const sections=[
                {label:"IN HAND",cats:hand,color:"#4ade80"},
                {label:"DRAW PILE",cats:draw,color:"#fbbf24"},
                {label:"DISCARD",cats:disc,color:"#888"},
              ];
              return sections.map(s=>s.cats.length>0&&(
                <div key={s.label} style={{marginBottom:12}}>
                  <div style={{fontSize:10,color:s.color,letterSpacing:2,marginBottom:6,opacity:.7}}>{s.label} ({s.cats.length})</div>
                  <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                    {[...s.cats].sort((a,b)=>b.power-a.power).map(c=>(
                      <div key={c.id} onClick={()=>{setTraitTip(c);}} style={{cursor:"pointer"}}>
                        <CC cat={c} sm/>
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* Trait Tooltip */}
      {traitTip&&(
        <div onClick={()=>setTraitTip(null)} style={{position:"fixed",inset:0,zIndex:150,display:"flex",alignItems:"center",justifyContent:"center",background:"#000000aa",padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"linear-gradient(145deg,#1a1a2e,#0d0d1a)",border:`2px solid ${tierColor(traitTip.trait||{tier:"common"})}`,borderRadius:14,padding:"20px 24px",maxWidth:340,width:"100%",animation:"fadeIn .15s ease-out",boxShadow:`0 12px 48px #00000099,0 0 30px ${BREEDS[traitTip.breed]?.glow||"#fff"}11`}}>
            {/* Cat identity header */}
            <div style={{textAlign:"center",marginBottom:10}}>
              <div style={{fontSize:36,lineHeight:1,marginBottom:4,filter:`drop-shadow(0 0 8px ${BREEDS[traitTip.breed]?.glow||"#fff"}44)`}}>{catHas(traitTip,"Chimera")||catHas(traitTip,"Wild")?"✨":BREEDS[traitTip.breed]?.icon||"🐱"}</div>
              <div style={{fontSize:20,fontWeight:900,color:BREEDS[traitTip.breed]?.color||"#888",letterSpacing:2}}>{traitTip.name?.split(" ")[0]}</div>
              {traitTip.name?.includes(" ")&&<div style={{fontSize:10,color:"#666",fontFamily:"system-ui",fontStyle:"italic"}}>{traitTip.name}</div>}
              <div style={{fontSize:11,color:BREEDS[traitTip.breed]?.color||"#888",fontFamily:"system-ui",marginTop:4}}>{BREEDS[traitTip.breed]?.icon} {traitTip.breed} · Power {traitTip.power} · {traitTip.sex==="M"?"♂ Male":"♀ Female"}</div>
              {traitTip.quirk&&<div style={{fontSize:11,color:"#999",fontStyle:"italic",fontFamily:"system-ui",marginTop:4,lineHeight:1.4}}>"{traitTip.quirk}"</div>}
            </div>
            {/* Traits section */}
            {(()=>{const allT=catAllTraits(traitTip);return allT.length===0?(
              <div style={{fontSize:12,color:"#666",textAlign:"center",fontFamily:"system-ui",padding:"8px 0",lineHeight:1.5}}>No trait yet. Cats can earn traits through den events, breeding, or the shop.</div>
            ):(allT.map((t,ti)=>{const tl=traitTierLabel(t);return(
              <div key={ti} style={{marginTop:ti>0?12:0,paddingTop:ti>0?12:0,borderTop:ti>0?"1px solid #ffffff0a":"none"}}>
                <div style={{fontSize:28,textAlign:"center"}}>{t.icon}</div>
                <div style={{fontSize:16,fontWeight:700,color:tl.color,textAlign:"center",letterSpacing:2,fontFamily:"'Cinzel',serif"}}>{t.name}</div>
                <div style={{fontSize:10,color:tl.color,textAlign:"center",letterSpacing:2,textTransform:"uppercase",marginTop:2,opacity:.7}}>{tl.label}</div>
                <div style={{fontSize:13,color:"#c8c8c8",textAlign:"center",lineHeight:1.5,marginTop:6,fontFamily:"system-ui"}}>{TRAIT_DETAIL[t.name]||t.desc}</div>
              </div>
            );}));})()}
            {/* Breed passive */}
            {BREED_PASSIVE[traitTip.breed]&&<div style={{marginTop:10,padding:"8px 12px",borderRadius:8,background:"#ffffff06",border:"1px solid #ffffff0a"}}>
              <div style={{fontSize:10,color:"#888",letterSpacing:2,marginBottom:3}}>SEASON PASSIVE</div>
              <div style={{fontSize:12,color:BREEDS[traitTip.breed]?.color||"#888",fontFamily:"system-ui"}}>{BREED_PASSIVE[traitTip.breed]?.icon} {BREED_PASSIVE[traitTip.breed]?.name}: {BREED_PASSIVE[traitTip.breed]?.desc}</div>
            </div>}
            {/* Relationships & status */}
            <div style={{display:"flex",flexDirection:"column",gap:4,marginTop:8}}>
              {traitTip.bondedTo&&<div style={{fontSize:11,color:"#f472b6",textAlign:"center",fontFamily:"system-ui"}}>💕 Bonded. ×1.5 mult, ×1.25 for second pair</div>}
              {(traitTip.grudgedWith||[]).length>0&&<div style={{fontSize:11,color:"#fb923c",textAlign:"center",fontFamily:"system-ui"}}>⚡ {(traitTip.grudgedWith||[]).length} Grudge{(traitTip.grudgedWith||[]).length>1?"s":""}. 75% tension / 25% prove per pair</div>}
              {traitTip.scarred&&!traitTip.injured&&<div style={{fontSize:11,color:"#fbbf24",textAlign:"center",fontFamily:"system-ui"}}>⚔ Battle-Hardened. ×1.25 mult</div>}
              {traitTip.injured&&<div style={{fontSize:11,color:"#ef4444",textAlign:"center",fontFamily:"system-ui"}}>🩹 Injured. Half power, less mult (heals in {traitTip.injuryTimer||1})</div>}
            </div>
            {/* Story timeline */}
            {(traitTip.story||[]).length>0&&<div style={{marginTop:10,padding:"8px 12px",borderRadius:8,background:"#ffffff04",border:"1px solid #ffffff08"}}>
              <div style={{fontSize:10,color:"#666",letterSpacing:2,marginBottom:4}}>STORY</div>
              {(traitTip.story||[]).slice(-3).map((s,i)=>(<div key={i} style={{fontSize:11,color:"#999",fontFamily:"system-ui",lineHeight:1.5}}>{s}</div>))}
            </div>}
            {/* Play stats */}
            {traitTip.stats&&traitTip.stats.tp>0&&<div style={{marginTop:8,display:"flex",gap:10,justifyContent:"center",fontSize:10,fontFamily:"system-ui",color:"#666"}}>
              <span>▶ {traitTip.stats.tp} plays</span>
              {traitTip.stats.bs>0&&<span>🏆 Best: {traitTip.stats.bs.toLocaleString()}</span>}
              {(()=>{const xp=getCatXP(traitTip.stats.tp,!!(getMB().xp));return xp?<span style={{color:xp.color,fontWeight:700}}>{xp.label}</span>:null;})()}
            </div>}
          </div>
        </div>
      )}

      {/* CLUTCH flash */}
      {clutch&&<div style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",background:"radial-gradient(circle,#fbbf2422,transparent 60%)",pointerEvents:"none"}}>
        <div style={{fontSize:32,fontWeight:900,color:"#fbbf24",letterSpacing:8,textShadow:"0 0 40px #fbbf24cc",animation:"clutchBurst .6s ease-out",fontFamily:"'Cinzel',serif"}}>THEY SHOULD HAVE STAYED DOWN</div>
      </div>}

      {/* Preview. vibes, not spoilers */}
      <div style={{minHeight:36,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:1,gap:2}}>
        {preview?(()=>{
          // ★ v30: Strength meter — intentionally fuzzy. The scoring animation IS the reveal.
          // ★ v34: Watchful boss trait disables strength meter
          if(blind===2&&bossTraits.some(bt=>bt.fx.noStrength)){
            return(<div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:13,fontWeight:700,color:"#fbbf24",letterSpacing:2}}>{preview.type.name}</span>
              <span style={{fontSize:10,color:"#ef444488",fontStyle:"italic",fontFamily:"system-ui"}}>👁️ Watchful. it sees your hand</span>
            </div>);
          }
          const baseC=preview.type.base.c;
          const baseM=preview.type.base.m;
          const catPow=selC.reduce((s,c)=>s+(c.injured?0:c.power),0);
          const traitCount=selC.filter(c=>!catIsPlain(c)).length;
          const bondedInHand=selC.filter(c=>c.bondedTo&&selC.find(x=>x.id===c.bondedTo)).length;
          const injuredCount=selC.filter(c=>c.injured).length;
          // ★ v32: Strength signal accounts for xMult sources
          const scarredCount=selC.filter(c=>c.scarred&&!c.injured).length;
          const scarredXM=Math.pow(1.25,scarredCount);
          const bondPairCount=selC.filter(c=>c.bondedTo&&selC.find(x=>x.id===c.bondedTo)).length/2;
          const bondPairXM=bondPairCount>=2?1.5*1.25:bondPairCount>=1?1.5:1; // ★ Diminishing: first ×1.5, second ×1.25
          const sig=(baseC+catPow+(scavenge||0))*(baseM+traitCount*2)*Math.max(1,NERVE[ferv].xM)*scarredXM*bondPairXM; // ★ v47: Focus removed
          const tgt2=eTgt();const need=Math.max(0,tgt2-rScore);
          const pacePerHand=hLeft>0?need/hLeft:need;
          const ratio=pacePerHand>0?sig/pacePerHand:99;
          const tier=ratio>=3?{w:"Crushing",c:"#fbbf24",p:100}:ratio>=1.8?{w:"Strong",c:"#4ade80",p:80}:ratio>=1?{w:"Decent",c:"#e8e6e3",p:55}:ratio>=0.5?{w:"Risky",c:"#fb923c",p:35}:{w:"Weak",c:"#ef4444",p:15};
          return(<>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:15,fontWeight:700,color:"#fbbf24",letterSpacing:2}}>{preview.type.name}</span>
              <span style={{fontSize:11,color:"#888",fontFamily:"system-ui"}}>{preview.type.base.c}×{preview.type.base.m}</span>
              <span style={{fontSize:14,fontWeight:900,color:tier.c,letterSpacing:1,fontFamily:"system-ui",textShadow:`0 0 8px ${tier.c}44`}}>{tier.w}</span>
              {scavenge>0&&<span style={{fontSize:10,color:"#67e8f9",fontFamily:"system-ui",fontWeight:700}}>🔧+{scavenge}C</span>}
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <div style={{width:100,height:4,background:"#1a1a2e",borderRadius:3,overflow:"hidden",border:"1px solid #ffffff08"}}>
                <div style={{height:"100%",width:`${tier.p}%`,borderRadius:3,background:`linear-gradient(90deg,${tier.c}66,${tier.c})`,transition:"width .3s"}}/>
              </div>
              {need>0&&hLeft>0&&<span style={{fontSize:11,fontWeight:700,color:ratio>=1?"#4ade80":"#ef4444",fontFamily:"system-ui"}}>Need {Math.ceil(pacePerHand).toLocaleString()}/hand</span>}
            </div>
            {sel.size>1&&<button onClick={()=>setSel(new Set())} style={{background:"none",border:"1px solid #ffffff12",borderRadius:4,color:"#555",fontSize:9,cursor:"pointer",padding:"2px 8px",fontFamily:"system-ui"}}>Clear</button>}
            {hLeft<=1&&need>0&&<div style={{fontSize:10,color:"#ef4444",fontWeight:700,fontFamily:"system-ui",animation:"fpp 1.5s ease infinite"}}>LAST HAND</div>}
            {(()=>{
              const warnings=[];
              const injured=selC.filter(c=>c.injured);
              if(injured.length)warnings.push({icon:"🩹",text:`${injured.map(c=>c.name.split(" ")[0]).join(", ")} injured (half power)`,color:"#ef4444"});
              const grudgePairs=getGrudges(selC);
              if(grudgePairs.length)warnings.push({icon:"⚡",text:`${grudgePairs.map(([a,b])=>a.name.split(" ")[0]+"+"+b.name.split(" ")[0]).join(", ")} grudge (gamble!)`,color:"#fb923c"});
              const cursedNotAlone=selC.filter(c=>catHas(c,"Cursed")&&selC.filter(x=>x.breed===c.breed).length>1);
              if(cursedNotAlone.length)warnings.push({icon:"💀",text:`${cursedNotAlone[0].name.split(" ")[0]} Cursed, not alone (penalty)`,color:"#ef4444"});
              return warnings.length>0?<div style={{display:"flex",flexDirection:"column",gap:1}}>
                {warnings.map((w,i)=><div key={i} style={{fontSize:10,color:w.color,fontFamily:"system-ui"}}>{w.icon} {w.text}</div>)}
              </div>:null;
            })()}
          </>);
        })():(<div style={{textAlign:"center"}}><span style={{color:"#444",fontSize:10}}>Select up to 5 cats to play</span></div>)}
      </div>

      {/* Play preview strip. shows selected cats in scoring order */}
      {sel.size>=2&&(()=>{
        const ordered=[...sel].map(idx=>hand[idx]).filter(Boolean);
        return(
          <div style={{display:"flex",gap:3,padding:"4px 16px",zIndex:1,maxWidth:700,width:"100%",justifyContent:"center",alignItems:"flex-end"}}>
            {ordered.map((cat,pos)=>{
              if(!cat)return null;const b=BREEDS[cat.breed];
              return(<div key={cat.id} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:0}}>
                <span style={{fontSize:10,color:"#fbbf24",fontFamily:"system-ui",fontWeight:700}}>{pos+1}</span>
                <div style={{width:24,height:28,borderRadius:4,background:b.bg,border:`1px solid ${b.color}44`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontSize:10}}>
                  <span>{b.icon}</span><span style={{fontSize:10,color:b.color,fontWeight:700}}>{cat.power}</span>
                </div>
              </div>);
            })}
          </div>);
      })()}

      {/* ★ v38: Deck comp bar moved to shop Colony tab */}

      {/* Hand with chemistry hints + relationship highlighting */}
      {(()=>{
        // Pre-compute: inject mate name initial for bonded display, compute related set
        const selCats=[...sel].map(idx=>hand[idx]).filter(Boolean);
        const relatedMap={};
        selCats.forEach(sc=>{
          if(sc.bondedTo){const mate=hand.find(h=>h.id===sc.bondedTo);if(mate&&!sel.has(hand.indexOf(mate)))relatedMap[mate.id]="mate";}
          hand.forEach(h=>{if(!sel.has(hand.indexOf(h))&&(h.parentIds?.includes(sc.id)||sc.parentIds?.includes(h.id)||h.stats?.par&&h.stats.par.includes(sc.name.split(" ")[0])))relatedMap[h.id]="kin";});
        });
        hand.forEach(cat=>{
          if(cat.bondedTo){const mate=[...hand,...draw,...disc].find(h=>h.id===cat.bondedTo);cat._mateName=mate?mate.name.split(" ")[0][0]:"";}else{cat._mateName="";}
        });
        // ★ v47: Compute guide highlight indices for visual glow on suggested cats
        const _gHL=new Set();
        if(guide&&guide.step===0&&ante===1&&blind===0){
          const bc={};hand.forEach((c,i)=>{bc[c.breed]=(bc[c.breed]||0)+1;});
          const best=Object.entries(bc).sort((a,b)=>b[1]-a[1]).find(([,v])=>v>=2);
          if(best)hand.forEach((c,i)=>{if(c.breed===best[0]&&_gHL.size<best[1])_gHL.add(i);});
        }
        // Stash for card rendering
        hand._guideHL=_gHL;
        return null;
      })()}
      <div style={{display:"flex",gap:mob?3:4,padding:"0 8px",zIndex:1,justifyContent:"center",flexWrap:"wrap",maxWidth:mob?400:750,width:"100%"}}>
        {hand.map((c,i)=>{
          const selCats=[...sel].map(idx=>hand[idx]).filter(Boolean);
          const isRelated=!sel.has(i)&&selCats.some(sc=>(sc.bondedTo===c.id)||(c.parentIds?.includes(sc.id))||(sc.parentIds?.includes(c.id))||(c.stats?.par&&c.stats.par.includes(sc.name.split(" ")[0])));
          const relType=isRelated?(selCats.some(sc=>sc.bondedTo===c.id)?"mate":"kin"):null;
          const isGuideHL=hand._guideHL?.has(i)&&!sel.has(i);
          return(<div key={c.id} style={{position:"relative",flexShrink:0,animation:isGuideHL?"guidePulse 1.5s ease-in-out infinite":"none"}}>
            <CC cat={c} sel={sel.has(i)} onClick={()=>toggleS(i)} dis={ph!=="playing"} fog={cfx.fog&&!sel.has(i)} chemHint={!sel.has(i)?getHint(c):null} hl={isRelated||isGuideHL} onTraitClick={ct=>setTraitTip(ct)} sm={mob}/>
            {isRelated&&<div style={{position:"absolute",top:-8,left:"50%",transform:"translateX(-50%)",fontSize:10,fontWeight:700,fontFamily:"system-ui",background:"#0a0a1a",padding:"0 4px",borderRadius:3,whiteSpace:"nowrap",animation:"countUp .3s ease-out",zIndex:2,color:relType==="mate"?"#f472b6":"#4ade80"}}>{relType==="mate"?"💕 mate":"👪 kin"}</div>}
            {isGuideHL&&<div style={{position:"absolute",top:-8,left:"50%",transform:"translateX(-50%)",fontSize:10,fontWeight:700,fontFamily:"system-ui",background:"#0a0a1a",padding:"0 4px",borderRadius:3,whiteSpace:"nowrap",animation:"fadeIn .5s ease-out",zIndex:2,color:"#fbbf24"}}>👆 tap</div>}
          </div>);
        })}
      </div>

      <div style={{display:"flex",gap:8,padding:"8px",zIndex:10,alignItems:"center",position:mob?"sticky":"static",bottom:mob?0:"auto",background:mob?"#0a0a1aee":"transparent",borderTop:mob?"1px solid #ffffff0a":"none",justifyContent:"center"}}>
        {/* ★ FIX: If stuck at 0 hands with score below target, show explicit end-run button */}
        {ph==="playing"&&hLeft<=0&&rScore<tgt?(<div style={{textAlign:"center"}}>
          <button onClick={()=>endRun(false,rScore)} style={{...BTN("linear-gradient(135deg,#ef4444,#dc2626)","#fff"),padding:mob?"12px 24px":"10px 20px",fontSize:14,animation:"fpp 1.5s ease infinite"}}>Colony Fell</button>
          <div style={{fontSize:10,color:"#ef444488",marginTop:4,fontFamily:"system-ui"}}>No hands remaining</div>
        </div>):(<>
        <div style={{textAlign:"center"}}>
          <button onClick={playH} disabled={!sel.size||hLeft<=0||ph!=="playing"||!!autoPlay} style={{...BTN(sel.size&&ph==="playing"&&!autoPlay?"linear-gradient(135deg,#fbbf24,#f59e0b)":"#222",sel.size&&ph==="playing"&&!autoPlay?"#0a0a1a":"#555",sel.size>0&&ph==="playing"&&!autoPlay),minWidth:mob?80:60,padding:mob?"10px 16px":"8px 14px"}}>Play</button>
          <div style={{fontSize:10,color:hLeft<=1?"#ef4444":"#888",marginTop:2,fontFamily:"system-ui",animation:hLeft<=1?"fpp 1s ease infinite":"none"}}>Hands: {hLeft}{tempMods.hands!==0?<span style={{color:tempMods.hands>0?"#4ade80":"#ef4444"}}> ({tempMods.hands>0?"+":""}{tempMods.hands})</span>:""}</div>
        </div>
        <div style={{textAlign:"center"}}>
          <button onClick={discardH} disabled={!sel.size||dLeft<=0||ph!=="playing"||cfx.noDisc} style={{...BTN(sel.size&&dLeft>0&&ph==="playing"&&!cfx.noDisc?"#1a1a2e":"#111",sel.size&&dLeft>0&&ph==="playing"&&!cfx.noDisc?"#ef4444":"#444",sel.size>0&&dLeft>0&&ph==="playing"&&!cfx.noDisc),border:`1px solid ${sel.size&&dLeft>0&&!cfx.noDisc?"#ef444444":"#222"}`,minWidth:mob?80:60,padding:mob?"10px 16px":"8px 14px"}}>Discard{cfx.noDisc?" 🚫":""}</button>
          <div style={{fontSize:10,color:cfx.noDisc?"#ef444488":dLeft<=0?"#ef4444":"#888",marginTop:2,fontFamily:"system-ui"}}>{cfx.noDisc?"Disabled":`Discards: ${dLeft}`}{!cfx.noDisc&&ferv>0&&dLeft>0?<span style={{color:"#ef4444",fontWeight:700}}> −1 Nerve</span>:""}</div>
          {sel.size>0&&dLeft>0&&!cfx.noDisc&&ph==="playing"&&(()=>{
            const selCats2=[...sel].map(i=>hand[i]).filter(Boolean);
            const hints=[];
            // ★ Scavenge preview: show total power×2 that will convert to bonus chips
            const scavPow=selCats2.reduce((s,c)=>s+(c.injured?Math.floor(c.power/2):c.power),0)*2;
            if(scavPow>0)hints.push({icon:"🔧",text:`+${scavPow}C scavenge`,color:"#67e8f9"});
            selCats2.forEach(c=>{
              if(catHas(c,"Scrapper"))hints.push({icon:"🥊",text:"+1 Nerve",color:"#fb923c"});
              else if(catHas(c,"Provider"))hints.push({icon:"🍀",text:"+1🐟",color:"#fbbf24"});
              else if(catHas(c,"Hefty"))hints.push({icon:"💪",text:"+1 Hand",color:"#3b82f6"});
              else if(catHas(c,"Cursed"))hints.push({icon:"💀",text:"+1 Nerve",color:"#d97706"});
              else if(catHas(c,"Swift"))hints.push({icon:"🪶",text:"+1 Discard",color:"#67e8f9"});
              else if(catHas(c,"Nocturnal"))hints.push({icon:"🌙",text:"+2 Nerve",color:"#c084fc"});
              else if(catHas(c,"Devoted")&&c.bondedTo)hints.push({icon:"🫀",text:"mate gains power",color:"#f472b6"});
              else if(catHas(c,"Feral"))hints.push({icon:"🐾",text:"+1 stray",color:"#888"});
              else if(catHas(c,"Guardian"))hints.push({icon:"🛡️",text:"heal injured",color:"#4ade80"});
              else if(catHas(c,"Seer"))hints.push({icon:"🔮",text:"peek 3 draws",color:"#c084fc"});
            });
            return hints.length>0?<div style={{fontSize:10,color:"#4ade80",fontFamily:"system-ui",marginTop:1}}>
              {hints.map((h,i)=><span key={i} style={{color:h.color}}>{h.icon}{h.text} </span>)}
            </div>:null;
          })()}
        </div>
        </>)}
      </div>

      <div style={{maxWidth:700,width:"100%",padding:"2px 16px",zIndex:1,marginTop:"auto"}}>
        <details style={{cursor:"pointer"}}><summary style={{fontSize:10,color:"#555",letterSpacing:2}}>REFERENCE</summary>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:2,marginTop:4}}>
            {HT.slice(1).map(h=>{const best=handBests[h.name];return(<div key={h.name} style={{fontSize:10,fontFamily:"system-ui",color:"#555"}}><span style={{color:"#888",fontWeight:600}}>{h.name}</span> <span style={{color:"#3b82f6"}}>{h.base.c}</span>x<span style={{color:"#ef4444"}}>{h.base.m}</span> {h.ex}{best?<span style={{color:"#fbbf2488"}}> best:{best.toLocaleString()}</span>:""}</div>);})}
          </div>
          <div style={{borderTop:"1px solid #ffffff0a",marginTop:4,paddingTop:4}}>
            <div style={{fontSize:10,color:"#666",letterSpacing:1,marginBottom:2}}>TRAITS</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:1}}>
              {TRAITS.map(t=>{const tl=traitTierLabel(t);return(<div key={t.name} style={{fontSize:10,fontFamily:"system-ui",color:tl.color}}>{t.icon} <span style={{fontWeight:600}}>{t.name}</span> <span style={{opacity:.6,fontSize:9}}>({tl.label})</span> {t.desc}</div>);})}
            </div>
          </div>
          <div style={{display:"flex",gap:8,paddingTop:4,fontSize:10,fontFamily:"system-ui",color:"#666",flexWrap:"wrap"}}>
            <span>⚔ Scarred: ×1.25 mult</span>
            <span>🩹 Injured: Half power, −2 mult (heals in 2 rounds)</span>
            <span>🔥 Nerve: ×1.0 to ×2.2 (builds when you crush targets)</span>
          </div>
          <div style={{display:"flex",gap:8,paddingBottom:4,fontSize:10,fontFamily:"system-ui",color:"#666",flexWrap:"wrap"}}>
            <span>💕 Bonded pair: ×1.5 mult (from den shelter)</span>
            <span>👪 Lineage: Parent + child in hand = ×1.15</span>
            <span>⚡ Grudge: From den fights. 75% tension (−2 mult) or 25% something to prove (+4 mult)</span>
            <span>🔧 Scavenge: Discarded cats' power ×2 → bonus chips next hand</span>
            <span>⭐ Proven (5+ plays): +2 mult per cat</span>
          </div>
          <div style={{display:"flex",gap:8,paddingBottom:6,fontSize:10,fontFamily:"system-ui",color:"#666",flexWrap:"wrap"}}>
            {Object.entries(BREED_PASSIVE).map(([k,v])=>(<span key={k} style={{color:BREEDS[k]?.color||"#888"}}>{v.icon} {v.name}: {v.desc}</span>))}
          </div>
        </details>
      </div>
    </div>
  );
}

const _root = ReactDOM.createRoot(document.getElementById("root"));
_root.render(React.createElement(NinthLife));
