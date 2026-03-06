// NINTH LIFE v0.61
// A roguelike deckbuilder — cats are cards, seasons are suits, survive the dark.
// https://greatgamesgonewild.github.io/ninth-live/

const { useState, useEffect, useRef, useMemo, useCallback } = React;
// Tone.js loaded via CDN


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
  comboHit(){this.p(()=>{const t=Tone.now();this.syn.triggerAttackRelease("E5","16n",t,0.3);this.syn.triggerAttackRelease("G5","16n",t+0.06,0.3);this.bass.triggerAttackRelease("C3","8n",t,0.35);});},
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
  // ── Juice sounds (★ v54: every moment matters) ──
  epithetEarned(){this.p(()=>{const t=Tone.now();this.syn.triggerAttackRelease("A4","8n",t,0.2);this.syn.triggerAttackRelease("E5","8n",t+0.15,0.25);this.syn.triggerAttackRelease("A5","4n",t+0.3,0.2);});},
  legendaryDiscover(){this.p(()=>{const t=Tone.now();this.bass.triggerAttackRelease("C2","2n",t,0.5);["G4","B4","D5","G5"].forEach((n,i)=>this.syn.triggerAttackRelease(n,"8n",t+0.05+i*0.1,0.35));this.perc.triggerAttackRelease("16n",t+0.02,0.3);});},
  mythicDiscover(){this.p(()=>{const t=Tone.now();this.bass.triggerAttackRelease("C2","1n",t,0.7);["C4","E4","G4","B4","D5","G5","B5"].forEach((n,i)=>this.syn.triggerAttackRelease(n,"8n",t+i*0.09,0.4));this.perc.triggerAttackRelease("8n",t,0.4);});},
  recruit(){this.p(()=>{const t=Tone.now();this.syn.triggerAttackRelease("D5","32n",t,0.2);this.syn.triggerAttackRelease("G5","32n",t+0.06,0.15);});},
  bossClear(){this.p(()=>{const t=Tone.now();this.bass.triggerAttackRelease("C2","4n",t,0.5);["C4","E4","G4","C5"].forEach((n,i)=>this.syn.triggerAttackRelease(n,"16n",t+0.1+i*0.08,0.3));this.perc.triggerAttackRelease("8n",t+0.05,0.35);});},
  kittenGrow(){this.p(()=>{const t=Tone.now();["C5","E5","G5","C6"].forEach((n,i)=>this.syn.triggerAttackRelease(n,"32n",t+i*0.07,0.2));});},
};

const BREEDS={
  Autumn:{color:"#b8956a",glow:"#9a7a52",bg:"#1f1a14",icon:"🍂",name:"Autumn",lore:"Born when the leaves fell. They know what it means to let go."},
  Winter:{color:"#67e8f9",glow:"#06b6d4",bg:"#1b3a4e",icon:"❄️",name:"Winter",lore:"Born in the cold. The cold never left them."},
  Spring:{color:"#4ade80",glow:"#22c55e",bg:"#1b4e2d",icon:"🌱",name:"Spring",lore:"Born when the world tried again. They carry that stubbornness."},
  Summer:{color:"#fb923c",glow:"#f97316",bg:"#4e2a1b",icon:"☀️",name:"Summer",lore:"Born in the longest light. They burn like they know it won't last."},
};
const BK=Object.keys(BREEDS);

// ════════════════════════════════════════════════════
// SEASON PASSIVES - each season scores differently
// ════════════════════════════════════════════════════
// Autumn: harvest wounds. Summer: fury in numbers. Winter: endurance. Spring: colony bonds.
// ★ SEASON DEVOTION — play cats of a season to unlock run-long bonuses
// Counter increments per cat played. Milestones give permanent (run) bonuses.
const DEVOTION_MILESTONES={
  Autumn:[
    {at:10,name:"First Harvest",desc:"+1 mult per Autumn cat played",fx:{multPerCat:1}},
    {at:25,name:"Scarred Earth",desc:"Scarred cats score ×1.4",fx:{scarMult:1.4}},
    {at:50,name:"Endurance",desc:"+1 hand per round",fx:{hands:1}},
    {at:80,name:"Ironwood",desc:"Injuries heal in 1 round",fx:{fastHeal:true}},
    {at:90,name:"The Harvest Moon",desc:"All Autumn cats +3 Power",fx:{powerBoost:3}},
  ],
  Summer:[
    {at:10,name:"First Spark",desc:"+3 chips per Summer cat played",fx:{chipsPerCat:3}},
    {at:25,name:"Wildfire",desc:"Hand types get +10% base chips",fx:{chipScale:0.1}},
    {at:50,name:"Fury",desc:"+1 free recruit per round",fx:{freeRecruits:1}},
    {at:80,name:"Inferno",desc:"Nerve gains +1 extra",fx:{nerveBoost:1}},
    {at:90,name:"The Blazing Sun",desc:"All Summer cats +3 Power",fx:{powerBoost:3}},
  ],
  Winter:[
    {at:10,name:"First Frost",desc:"+1 mult per Winter cat played",fx:{multPerCat:1}},
    {at:25,name:"Permafrost",desc:"First recruit each blind is free",fx:{freeRecruit:true}},
    {at:50,name:"Stillness",desc:"+1 hand per round",fx:{hands:1}},
    {at:80,name:"Absolute Zero",desc:"Boss curses reduced by 1",fx:{curseReduce:1}},
    {at:90,name:"The Frozen Throne",desc:"All Winter cats +3 Power",fx:{powerBoost:3}},
  ],
  Spring:[
    {at:10,name:"First Bloom",desc:"+1 mult per bonded cat in hand",fx:{bondMult:1}},
    {at:25,name:"Overgrowth",desc:"Breed cap 75% → 100%",fx:{breedBoost:0.25}},
    {at:50,name:"Deep Roots",desc:"Bonds score ×1.75",fx:{bondScale:1.75}},
    {at:80,name:"Renewal",desc:"+1 Shelter slot",fx:{shelter:1}},
    {at:90,name:"The Eternal Garden",desc:"All Spring cats +3 Power",fx:{powerBoost:3}},
  ],
};
function getDevotionLevel(breed,counts){
  const c=(counts||{})[breed]||0;
  const ms=DEVOTION_MILESTONES[breed]||[];
  const unlocked=ms.filter(m=>c>=m.at);
  const next=ms.find(m=>c<m.at);
  return{count:c,unlocked,next,total:ms.length};
}
function getAllDevotionFx(counts){
  const fx={multPerCat:{},chipsPerCat:{},hands:0,discards:0,scarMult:0,chipScale:0,nerveBoost:0,freeRecruit:false,fastHeal:false,peek:0,curseReduce:0,breedBoost:0,bondScale:0,bondMult:0,shelter:0,powerBoost:{}};
  Object.keys(DEVOTION_MILESTONES).forEach(breed=>{
    const dev=getDevotionLevel(breed,counts);
    dev.unlocked.forEach(m=>{
      if(m.fx.multPerCat)fx.multPerCat[breed]=(fx.multPerCat[breed]||0)+m.fx.multPerCat;
      if(m.fx.chipsPerCat)fx.chipsPerCat[breed]=(fx.chipsPerCat[breed]||0)+m.fx.chipsPerCat;
      if(m.fx.hands)fx.hands+=m.fx.hands;
      if(m.fx.discards)fx.discards+=m.fx.discards;
      if(m.fx.freeRecruits)fx.freeRecruits=(fx.freeRecruits||0)+m.fx.freeRecruits;
      if(m.fx.scarMult)fx.scarMult=m.fx.scarMult;
      if(m.fx.chipScale)fx.chipScale+=m.fx.chipScale;
      if(m.fx.nerveBoost)fx.nerveBoost+=m.fx.nerveBoost;
      if(m.fx.freeRecruit)fx.freeRecruit=true;
      if(m.fx.fastHeal)fx.fastHeal=true;
      if(m.fx.peek)fx.peek=Math.max(fx.peek,m.fx.peek);
      if(m.fx.curseReduce)fx.curseReduce+=m.fx.curseReduce;
      if(m.fx.breedBoost)fx.breedBoost+=m.fx.breedBoost;
      if(m.fx.bondScale)fx.bondScale=m.fx.bondScale;
      if(m.fx.bondMult)fx.bondMult+=m.fx.bondMult;
      if(m.fx.shelter)fx.shelter+=m.fx.shelter;
      if(m.fx.powerBoost)fx.powerBoost[breed]=(fx.powerBoost[breed]||0)+m.fx.powerBoost;
    });
  });
  return fx;
}


// ═══════════════════════════════════════════════════════════════
// ★ BREED CHEMISTRY - The relationship web
// ═══════════════════════════════════════════════════════════════
// Autumn+Winter = BOND (the fading seasons — cold and letting go)
// Summer+Spring  = BOND (the growing seasons — warmth and renewal)
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
// Grudge resolution: Always −2 mult when grudged cats play together. Simplified in v51.
// Resolution is inline in calcScore() — see proveChance variable

// ═══════════════════════════════════════════════════════════════
// ★ EXPANDED TRAIT SYSTEM
// ═══════════════════════════════════════════════════════════════
// Tier: common (normal drop), negative (shop discount, build-around),
//       rare (breeding only)
const PLAIN={name:"Plain",icon:"",desc:"No special ability yet",tier:"plain"};
const TRAIT_DETAIL={
  Plain:"No special ability yet. This cat can earn a trait through den events, breeding, or the shop.",
  Wild:"A cat between seasons. Counts as every season at once, so they fit into any hand you're building. The ultimate glue cat.",
  Stubborn:"Won't back down. Adds 3 mult when played, but if your last hand failed to clear, they dig in harder for 6 mult instead. Discard to gain +1 Nerve.",
  Stray:"The outsider who brings everyone together. Gains 3 mult per unique season among the cats you play. Play all four seasons together and that's +12 mult. Discard to draw an extra card.",
  Loyal:"Bonds with routine. Adds 2 mult normally, but play the exact same cats as your last play and they contribute 4 mult instead. Discard to inspire +1 mult across your whole hand.",
  Devoted:"Heart belongs to their mate. Adds 4 mult when their bonded partner is played in the same hand. Discard to give their mate +1 Power. Strongest when you play the pair together.",
  Scavenger:"A practical survivor. Adds 1 mult for every ration you're carrying, up to +5. The richer you are, the harder they fight. Discard to earn +2 rations.",
  Scrapper:"Tough and battle-hardened. Adds 3 mult, or 5 mult if they carry a scar. Pain makes them stronger. Discard to gain +1 Nerve.",
  Cursed:"A dark presence. Normally costs you 3 mult. But play them as the only cat of their season and the curse inverts for +8 mult. Isolate them for power. Discard to gain +1 Nerve.",
  Guardian:"Protector of the wounded. Gains 2 mult for every injured or scarred cat you play alongside them. The more your colony bleeds, the harder they fight. Discard to heal one injured cat.",
  Chimera:"Belongs to all four seasons at once. When played with 3 or more cats, multiplies your entire hand by 1.5. A rare shape-shifter.",
  Alpha:"The leader of the pack. If this cat has the highest power among the cats you play, multiplies everything by 1.3. Keep them strong and they carry the colony.",
  Echo:"Scores twice. The second time at half power. One of the strongest traits in the game. Every bonus this cat earns happens twice.",
  Nocturnal:"Feeds on desperation. Gains 2 mult for every level of Nerve your colony has built up. At max Nerve, that's +36 mult from one cat. Discard to gain +2 Nerve.",
  Eternal:"A living legend. Multiplies the entire hand by 3 and scores twice at full power. The rarest and most powerful trait. Changes everything.",
  Phoenix:"Burns brightest near death. Multiplies by 2.5, or by 4 if scarred. If this cat falls in the den, they rise once as Eternal. Death is not the end.",
};
const DRAFT_VOICE={
  // Trait-based (priority)
  // COMMON (C tier)
  Stubborn:["I don't quit.","They said it couldn't be done. Watch me.","Knock me down. See what happens.","I'll outlast anything."],
  Scavenger:["I know where the good stuff grows.","Save your rations. I'll find more.","Every patch of ground has something.","I provide. That's what I do."],
  Wild:["I belong everywhere. And nowhere.","Don't try to categorize me.","I'm whatever you need me to be.","Seasons? I make my own."],
  Stray:["I've seen all four seasons.","I don't belong anywhere. I belong everywhere.","Diversity is survival.","I make bridges, not walls."],
  Loyal:["Same crew. Same fight.","I remember who stood with me.","You were there last time. That matters.","Together again. Good."],
  Devoted:["Where they go, I go.","My heart belongs to someone.","Together we're unstoppable.","Love isn't weakness. It's fuel."],
  // RARE (B tier)
  Scrapper:["I fight dirty. That a problem?","Scars? I've got a collection.","Hit me. I dare you.","Pain's just information."],
  Cursed:["Don't get close. Trust me.","I bring bad luck. Mostly to others.","Something's wrong with me. Use it.","Alone, I'm dangerous. Together… worse."],


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
  // --- COMMON (C tier): utility, economy, enablers ---
  
  
  {name:"Wild",icon:"🌀",desc:"Counts as any season",tier:"common"},
  
  
  {name:"Devoted",icon:"🫀",desc:"+4 mult when played with mate. Discard: mate +1 Power",tier:"common"},
  {name:"Stubborn",icon:"🪨",desc:"+3 mult. Lost last hand: +6 mult. Discard: +1 Nerve",tier:"common"},
  {name:"Stray",icon:"🐈",desc:"+3 mult per unique season played. Discard: +1 draw",tier:"common"},
  {name:"Loyal",icon:"🫂",desc:"+2 mult. Repeat same cats: +4. Discard: +1 mult all",tier:"common"},
  {name:"Scavenger",icon:"🌾",desc:"+1 mult per ration held (max +5). Discard: +2 rations",tier:"common"},
  // --- RARE (B tier): solid contributors with conditions ---
  {name:"Scrapper",icon:"🥊",desc:"+3 mult, +5 if scarred. Discard: +1 Nerve",tier:"rare"},
  {name:"Cursed",icon:"💀",desc:"−3 mult. Alone in their season: +8. Discard: +1 Nerve",tier:"rare_neg"},
  
  
  {name:"Guardian",icon:"🛡️",desc:"+2 mult per injured or scarred cat played. Discard: heal 1",tier:"rare"},
  // --- LEGENDARY (A tier): build-defining ---
  {name:"Echo",icon:"🔁",desc:"Scores twice, half power on second",tier:"legendary"},
  {name:"Chimera",icon:"🧬",desc:"Counts as all seasons. Play 3+ cats: ×1.5",tier:"rare"},
  {name:"Alpha",icon:"🐺",desc:"×1.3 if highest power among played cats",tier:"rare"},
  {name:"Nocturnal",icon:"🌙",desc:"+2 mult per Nerve level. Discard: +2 Nerve",tier:"legendary"},
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

function pickTrait(allowHigh=false){
  const r=Math.random();
  if(r<0.03)return pk(LEGENDARY_TRAITS);             // 3% Legendary (rare find!)
  if(r<0.35)return pk(RARE_TRAITS);                  // 32% Rare
  return pk(COMMON_TRAITS);                          // 65% Common
}
// ★ Draft trait: elevated chances — creates "off-breed Phoenix" decisions from A1
function pickDraftTrait(){
  const r=Math.random();
  if(r<0.35)return pk(RARE_TRAITS);       // 35% Rare
  return pk(COMMON_TRAITS);               // 65% Common
}
function pickBreedInheritTrait(p1,p2){
  const t1=(p1.trait||PLAIN).tier||"common",t2=(p2.trait||PLAIN).tier||"common";
  const tiers=[t1,t2].map(t=>t==="mythic"?4:t==="legendary"?3:t==="rare"||t==="rare_neg"?2:t==="common"?1:0);
  const maxTier=Math.max(...tiers),minTier=Math.min(...tiers);
  // 2 Legendary → 10% Mythic, rest Legendary+Rare
  if(minTier>=3){
    if(Math.random()<0.10)return pk(MYTHIC_TRAITS);
    return Math.random()<0.5?pk(LEGENDARY_TRAITS):pk(RARE_TRAITS);
  }
  // 1 Legendary + 1 Rare+ → Legendary possible (20%)
  if(maxTier>=3&&minTier>=2){
    const r=Math.random();
    if(r<0.20)return pk(LEGENDARY_TRAITS);
    if(r<0.55)return pk(RARE_TRAITS);
    return pk(COMMON_TRAITS);
  }
  // 2 Rare → small chance of Legendary breakthrough (9%)
  if(minTier>=2){
    const r=Math.random();
    if(r<0.09)return pk(LEGENDARY_TRAITS); // ★ The breakthrough — two strong parents can spark greatness
    if(r<0.45)return pk(RARE_TRAITS);
    return pk(COMMON_TRAITS);
  }
  // 1 Rare + 1 Common → Rare possible (from mutation, not upbreed)
  if(maxTier>=2){
    return Math.random()<0.35?pk(RARE_TRAITS):pk(COMMON_TRAITS);
  }
  // Both Common/Plain → Common only (no upbreeding)
  return pk(COMMON_TRAITS);
  // Both Common/Plain → Common only
  return pk(COMMON_TRAITS);
}
// ★ Breeding mutation: now also tier-gated
function pickBreedTrait(p1,p2){
  if(p1&&p2)return pickBreedInheritTrait(p1,p2); // tier-aware
  // Fallback (no parents): old behavior
  const r=Math.random();
  if(r<0.08)return pk(RARE_TRAITS);
  return pk(COMMON_TRAITS);
}
// ★ Tier label for display
function traitTierLabel(t){
  if(t.tier==="mythic")return{label:"Mythic",color:"#c084fc"};
  if(t.tier==="legendary")return{label:"Legendary",color:"#f97316"};
  if(t.tier==="rare"||t.tier==="rare_neg")return{label:"Rare",color:"#38bdf8"};
  return{label:"Common",color:"#888"};
}
function isHighTier(t){return t.tier==="mythic"||t.tier==="legendary"||t.tier==="rare";}
function tierColor(t){return traitTierLabel(t).color;}

// ★ TRAIT HELPERS: check all traits a cat has (primary + extra)
function catHas(cat,name){return(cat.trait||PLAIN).name===name||(cat.extraTraits||[]).some(t=>t.name===name);}
function catAllTraits(cat){const all=[cat.trait||PLAIN,...(cat.extraTraits||[])];return all.filter(t=>t.name!=="Plain");}
function catIsPlain(cat){return(cat.trait||PLAIN).name==="Plain"&&!(cat.extraTraits||[]).length;}
function catIsKitten(cat){return !!(cat.parentIds&&cat.parentIds.length>0&&(cat.stats?.tp||0)===0);}
function addTrait(cat,trait){
  if(!cat.trait)cat.trait=PLAIN;
  if(cat.trait.name==="Plain"){cat.trait=trait;return true;}
  if(!(cat.extraTraits||[]).length&&cat.trait.name!==trait.name){cat.extraTraits=[trait];return true;}
  return false; // already has 2 traits or duplicate
}

// ═══════════════════════════════════════════════════════════════
// HAND TYPES — Season combos are primary. Power combos stack on top.
// ═══════════════════════════════════════════════════════════════
const HT=[
  {name:"Stray",base:{c:15,m:2},ex:"Any cat alone",echo:"alone"},
  {name:"Kin",base:{c:40,m:4},ex:"2 same season",echo:"together"},
  {name:"Two Kin",base:{c:80,m:4},ex:"2 of one season + 2 of another",echo:"balanced"},
  {name:"Clowder",base:{c:110,m:6},ex:"3 of the same season",echo:"pack"},
  {name:"Kindred",base:{c:110,m:6},ex:"3+ cats with the same trait",hidden:true,echo:"chosen family"},
  {name:"Full Den",base:{c:130,m:6},ex:"3 of one season + 2 of another",echo:"home"},
  {name:"Colony",base:{c:180,m:9},ex:"4 of the same season",echo:"unified"},
  {name:"Litter",base:{c:260,m:14},ex:"5 of the same season",echo:"one blood"},
];

// ★ HAND TYPE LEVELING — each play gives XP, scrolls give +1 level directly
function getHtLevel(htName,levels){return(levels||{})[htName]||1;}
function getHtScaled(ht,level){
  const lv=Math.max(1,level);if(lv<=1)return ht.base;
  const chipScale=1+(lv-1)*0.15;const multAdd=(lv-1)*1;
  return{c:Math.round(ht.base.c*chipScale),m:ht.base.m+multAdd};
}
const SCROLL_POOL=["Kin","Two Kin","Clowder","Full Den","Colony","Litter","Kindred"];
function genScrolls(ante,htLevels){
  const pool=shuf(SCROLL_POOL).slice(0,3);
  return pool.slice(0,2).map(name=>{
    const ht=HT.find(h=>h.name===name);const lv=getHtLevel(name,htLevels);
    const nextBase=ht?getHtScaled(ht,lv+1):null;
    const price=3+ante+Math.floor(lv/2);
    return{name,lv,nextLv:lv+1,nextBase,price,ht};
  });
}

// Power combos — standalone hidden hands OR stacking bonuses on season hands
const POWER_COMBOS=[
  {name:"Twins",bonus:{c:20,m:2},standalone:{c:40,m:3},ex:"2 same power",hidden:true,echo:"matched pair"},
  {name:"Two Pair",bonus:{c:40,m:3},standalone:{c:70,m:5},ex:"2+2 same power",hidden:true,echo:"double matched"},
  {name:"Prowl",bonus:{c:30,m:2},standalone:{c:60,m:4},ex:"3 consecutive power",hidden:true,echo:"in step"},            // ~23%
  {name:"Triplets",bonus:{c:60,m:5},standalone:{c:110,m:6},ex:"3 same power",hidden:true,echo:"equals"},                // ~10%
  {name:"Full House",bonus:{c:100,m:7},standalone:{c:160,m:8},ex:"3+2 same power",hidden:true,echo:"a perfect den"},
  {name:"Stalk",bonus:{c:50,m:3},standalone:{c:90,m:5},ex:"4 consecutive power",hidden:true,echo:"rising"},             // ~7%
  {name:"Mirrors",bonus:{c:140,m:9},standalone:{c:210,m:11},ex:"4 same power",hidden:true,echo:"matched"},              // ~0.6%
  {name:"Nine Lives",bonus:{c:80,m:5},standalone:{c:140,m:7},ex:"5 consecutive power",hidden:true,echo:"the last hand"},// ~1%
  {name:"Quintuplets",bonus:{c:250,m:15},standalone:{c:350,m:18},ex:"5 same power",hidden:true,echo:"impossible odds"}, // near 0%
];

// ═══════════════════════════════════════════════════════════════
// WARDS (passive bonuses that watch over your colony)
// ═══════════════════════════════════════════════════════════════
const FAMS=[
  {id:"f1",name:"Falling Leaf",icon:"🍂",desc:"+2 mult per Autumn cat, +5 if 3+",eff:c=>{const n=c.filter(x=>getCatBreeds(x).includes("Autumn")).length;return{mult:n*2+(n>=3?5:0)};}},
  {id:"f2",name:"Warm Hearth",icon:"☀️",desc:"+2 mult per Summer cat, +5 if 3+",eff:c=>{const n=c.filter(x=>getCatBreeds(x).includes("Summer")).length;return{mult:n*2+(n>=3?5:0)};}},
  {id:"f3",name:"Snowglobe",icon:"🔮",desc:"+2 mult per Winter cat, +5 if 3+",eff:c=>{const n=c.filter(x=>getCatBreeds(x).includes("Winter")).length;return{mult:n*2+(n>=3?5:0)};}},
  {id:"f4",name:"First Bud",icon:"🌸",desc:"+2 mult per Spring cat, +5 if 3+",eff:c=>{const n=c.filter(x=>getCatBreeds(x).includes("Spring")).length;return{mult:n*2+(n>=3?5:0)};}},
  {id:"f5",name:"Golden Yarn",icon:"🧶",desc:"+15 chips per cat",eff:c=>({chips:c.length*15})},
  {id:"f6",name:"Moonstone",icon:"🌙",desc:"×1.3 if 4 or more cats",eff:c=>c.length>=4?{xMult:1.3}:{}},
  {id:"f7",name:"Black Mirror",icon:"🪞",desc:"×1.5 if all same season",eff:c=>{const b0=getCatBreeds(c[0]||{});return c.length>1&&c.every(x=>getCatBreeds(x).some(br=>b0.includes(br)))?{xMult:1.5}:{}}},
  {id:"f8",name:"Witch's Bell",icon:"🔔",desc:"+1 ration per hand",eff:()=>({gold:1})},
  {id:"f9",name:"Stubborn's Stone",icon:"🪨",desc:"+6 mult with Stubborn",eff:c=>c.some(x=>catHas(x,"Stubborn"))?{mult:6}:{}},
  {id:"f10",name:"Wild Card",icon:"🃏",desc:"×2 with Wild cat",eff:c=>c.some(x=>catHas(x,"Wild"))?{xMult:2}:{}},
  {id:"f11",name:"Echo Chamber",icon:"🔊",desc:"+5 mult per Echo cat",eff:c=>({mult:c.filter(x=>catHas(x,"Echo")).length*5})},
  {id:"f12",name:"Brawler's Belt",icon:"🥋",desc:"+3 mult per Scrapper",eff:c=>({mult:c.filter(x=>catHas(x,"Scrapper")).length*3})},
  {id:"f18",name:"Iron Will",icon:"🛡️",desc:"×1.15 per scarred cat",eff:c=>{const sc=c.filter(x=>x.scarred&&!x.injured).length;return sc>0?{xMult:Math.round(Math.pow(1.15,sc)*100)/100}:{}}},
  {id:"f19",name:"Nesting Ward",icon:"🏠",desc:"+1 Shelter slot",eff:()=>({shelter:1}),passive:true},
  // ★ Hand-type bonus wards — steer hand selection strategy
  {id:"f20",name:"Pair Bond",icon:"💎",desc:"Kin ×1.4",eff:()=>({}),htBonus:{Kin:{xMult:1.4}}},
  {id:"f21",name:"Pack Howl",icon:"🐺",desc:"Clowder ×1.3, Colony ×1.5",eff:()=>({}),htBonus:{Clowder:{xMult:1.3},Colony:{xMult:1.5}}},
  {id:"f22",name:"Harmony",icon:"🎵",desc:"Two Kin ×1.7, Full Den ×1.6",eff:()=>({}),htBonus:{"Two Kin":{xMult:1.7},"Full Den":{xMult:1.6}}},
  {id:"f23",name:"Lone Wolf",icon:"🌑",desc:"Stray ×2.5",eff:()=>({}),htBonus:{Stray:{xMult:2.5}}},
  {id:"f24",name:"Bench Coach",icon:"🪑",desc:"+2M per unplayed cat",eff:(c,ctx)=>({mult:(ctx?.benchSize||0)*2})},
  {id:"f25",name:"Soul Bond",icon:"💜",desc:"Kindred ×1.6",eff:()=>({}),htBonus:{Kindred:{xMult:1.6}}},
];

const CURSES=[
  {id:"c_shrink",name:"Cramped Cage",icon:"📦",desc:"Hand size -1",tier:1,fx:{hsMod:-1}},
  {id:"c_silence",name:"Muzzled",icon:"🤐",desc:"Wards silenced",tier:1,fx:{silence:true}},
  {id:"c_fog",name:"Fog of War",icon:"🌫️",desc:"Cards face-down",tier:1,fx:{fog:true}},
  {id:"c_exile",name:"Exile",icon:"🚫",desc:"One season exiled",tier:2,fx:{exile:true}},
  {id:"c_fragile",name:"Glass Claws",icon:"💔",desc:"No discards",tier:2,fx:{noDisc:true}},
  {id:"c_famine",name:"Famine",icon:"🦴",desc:"No rations earned this night",tier:2,fx:{famine:true}},
  {id:"c_double",name:"Double Down",icon:"🎲",desc:"Threshold ×1.3",tier:3,fx:{tgtMult:1.3}},
];

const NERVE=[
  {name:"Still",     xM:1.0, color:"#555",     glow:"transparent",  desc:""},                     // 0
  {name:"Stirring",  xM:1.0, color:"#555",     glow:"transparent",  desc:""},                     // 1
  {name:"Awake",     xM:1.05,color:"#6b7280",  glow:"transparent",  desc:""},                     // 2
  {name:"Alert",     xM:1.05,color:"#6b7280",  glow:"#6b728033",    desc:""},                     // 3
  {name:"Tense",     xM:1.1, color:"#b8956a",  glow:"#b8956a33",    desc:""},                     // 4
  {name:"Focused",   xM:1.1, color:"#b8956a",  glow:"#b8956a44",    desc:""},                     // 5
  {name:"Cornered",  xM:1.15,color:"#b85c2c",  glow:"#b85c2c44",    desc:""},                     // 6
  {name:"Cornered",  xM:1.2, color:"#b85c2c",  glow:"#b85c2c55",    desc:""},                     // 7
  {name:"Defiant",   xM:1.25,color:"#d97706",  glow:"#d9770655",    desc:"backs against the wall"},// 8
  {name:"Defiant",   xM:1.3, color:"#d97706",  glow:"#d9770666",    desc:"backs against the wall"},// 9
  {name:"Burning",   xM:1.35,color:"#f59e0b",  glow:"#f59e0b66",    desc:"past the point of fear"},// 10
  {name:"Burning",   xM:1.4, color:"#f59e0b",  glow:"#f59e0b77",    desc:"past the point of fear"},// 11
  {name:"Fury",      xM:1.5, color:"#fb923c",  glow:"#fb923c77",    desc:"nothing left to lose"},  // 12
  {name:"Blazing",   xM:1.6, color:"#fbbf24",  glow:"#fbbf2488",    desc:"the air catches fire"},  // 13
  {name:"Blazing",   xM:1.7, color:"#fbbf24",  glow:"#fbbf24aa",    desc:"the air catches fire"},  // 14
  {name:"Undying",   xM:1.85,color:"#fef08a",  glow:"#fef08aaa",    desc:"they should have stayed down"},// 15
  {name:"Undying",   xM:2.0, color:"#fef08a",  glow:"#fef08abb",    desc:"they should have stayed down"},// 16
  {name:"NINTH LIFE",xM:2.2, color:"#ffffffdd",glow:"#ffffffbb",    desc:"the last one"},         // 17
];
const NERVE_MAX=17;


const UPGRADES=[
  // --- TIER 1: FUNDAMENTALS (always visible) ---
  {id:"u_g",name:"Buried Provisions",icon:"🐟",desc:"+2 Rations each night",cost:25,b:{gold:2},max:3,tier:1},
  {id:"u_d",name:"Quick Instincts",icon:"📣",desc:"+1 Free Recruit per round",cost:40,b:{freeRecruits:1},max:2,tier:1},
  {id:"u_den",name:"Deeper Burrow",icon:"🏠",desc:"+1 Shelter slot in the den",cost:50,b:{shelter:1},max:2,tier:1},
  {id:"u_keen",name:"Keen Eye",icon:"🎯",desc:"Recruit costs 1🐟 less (min free)",cost:35,b:{recruitDiscount:1},max:1,tier:1},
  // --- TIER 2: STRATEGIC (unlocks after 2 purchases) ---
  {id:"u_h",name:"Stubborn Will",icon:"✊",desc:"+1 Hand per round",cost:65,b:{hands:1},max:2,tier:2},
  {id:"u_f",name:"The Old Fire",icon:"🔥",desc:"Start with +2 Nerve",cost:70,b:{fervor:2},max:2,tier:2},
  {id:"u_pot",name:"The Warden",icon:"🛡️",desc:"Start each run with a random ward",cost:75,b:{startWard:1},max:2,tier:2},
  {id:"u_b",name:"Blood Memory",icon:"🩸",desc:"Starter cat inherits a Hearth cat's trait",cost:80,b:{bloodMemory:1},max:1,tier:2},
  {id:"u_fertile",name:"Fertile Ground",icon:"🌿",desc:"Den breed chance +15%",cost:60,b:{breedBoost:0.15},max:1,tier:2},
  {id:"u_scroll",name:"Ancient Scrolls",icon:"📜",desc:"Start with a random hand type leveled up",cost:75,b:{startScroll:1},max:1,tier:2},
  // --- TIER 3: POWER (unlocks after 4 purchases) ---
  {id:"u_c",name:"Bloodline",icon:"📿",desc:"Companion +2 power, drafted cats +1 power",cost:100,b:{heirloom:2,draftPower:1},max:1,tier:3},
  {id:"u_scr",name:"Scar Memory",icon:"🩹",desc:"Scarred cats gain +2 mult (stacks with trait)",cost:100,b:{scarMult:2},max:1,tier:3},
  {id:"u_grd",name:"Grudge Tempering",icon:"⚡",desc:"Grudge penalty reduced: −2 mult → −1 mult",cost:110,b:{grudgeWisdom:1},max:1,tier:3},
  {id:"u_bench",name:"Deep Bench",icon:"🪑",desc:"Unplayed cats give +50% passive bonus",cost:90,b:{doubleBench:1},max:1,tier:3},
  {id:"u_combo",name:"Power Resonance",icon:"💥",desc:"Power combos give +50% bonus",cost:110,b:{comboBoost:0.5},max:1,tier:3},
  // --- TIER 4: ENDGAME (unlocks after 6 purchases) ---
  {id:"u_o",name:"What The Stars Owe",icon:"🔍",desc:"+50% Stardust from the Hearth",cost:120,b:{dustBonus:.5},max:1,tier:4},
  {id:"u_draft",name:"Wider Horizons",icon:"🌅",desc:"See 4 cats per draft wave instead of 3",cost:130,b:{draftSize:1},max:1,tier:4},
  {id:"u_trait_luck",name:"The Colony's Memory",icon:"🧬",desc:"Drafted cats 55% chance of Rare trait (vs 35%)",cost:140,b:{traitLuck:1},max:1,tier:4},
  {id:"u_bond_str",name:"Unbreakable Bonds",icon:"💕",desc:"Bonded pairs score ×1.75",cost:150,b:{bondBoost:1},max:1,tier:4},
  {id:"u_nerve_floor",name:"Ember Within",icon:"🕯️",desc:"+2 starting Nerve each run",cost:160,b:{fervor:2},max:1,tier:4},
  {id:"u_second_wind",name:"Second Wind",icon:"💨",desc:"+1 extra Hand on final blind of each night",cost:180,b:{bossHand:1},max:1,tier:4},
  {id:"u_4draft",name:"Colony Instinct",icon:"🐱",desc:"Draft 4 cats instead of 3",cost:170,b:{extraDraft:1},max:1,tier:4},
  {id:"u_mythic",name:"Mythic Bloodline",icon:"🌟",desc:"Guarantee 1 Legendary trait in each draft",cost:200,b:{mythicChance:1},max:1,tier:4},
];

const MILESTONES=[
  {req:3,bonus:{gold:1},label:"First Light"},
  {req:6,bonus:{freeRecruits:1},label:"Growing Warmth"},
  {req:10,bonus:{hands:1},label:"Burning Bright"},
  {req:15,bonus:{gold:2},label:"The Colony Remembers"},
  {req:20,bonus:{fervor:1},label:"Legends Gather"},
  {req:30,bonus:{hands:1,freeRecruits:1},label:"The Hearth Eternal"},
];

// ─── Names ───────────────────────────────────────────────────
// ════════════════════════════════════════════════════
// UNIFIED NAMING SYSTEM — one pool, season-weighted, trait-flavored
// Every cat gets a name worth grieving. Players rename if they want.
// ════════════════════════════════════════════════════
const CAT_NAMES=[
  // Tender (sonorant-heavy — for attachment, mourning)
  "Mabel","Penny","Clover","Rosie","Milo","Olive","Willow","Maple","Poppy","Tilly",
  "Sunny","Ruby","Percy","Nellie","Teddy","Daisy","Fern","Pippa","Pearl","Wren",
  "Cricket","Juniper","Nutmeg","Archie","Winnie","Dottie","Minnie","Sprout","Mochi",
  "Opal","Tansy","Finch","Birdie","Hazel","Honey","Ada","Flora","Phoebe","Plum","Sage",
  "Lumen","Maren","Hollowe","Solene","Callow","Lark","Rue","Vesper","Sable",
  // Earned-feeling (imply history)
  "Cinder","Soot","Brindle","Thistle","Gale","Hob","Rook","Tallow","Spindle","Thresh",
  "Knot","Tinder","Sedge","Wisp","Drift","Ghost","Twice","Waif","Cadge","Vagrant",
  "Notch","Scruff","Burr","Tatters","Smudge","Patch","Tuft","Nicks","Scrap",
  // Fierce (plosive-forward — memorable and expendable)
  "Bracken","Crook","Pitch","Crag","Grit","Flinch","Tack","Buckle","Brunt","Knox",
  // Objects / places (the world they came from)
  "Thimble","Candle","Locket","Lantern","Compass","Ticket","Nickel","Postcard",
  "Sardine","Anchovy","Morsel","Kibble","Biscuit","Truffle","Pepper","Nutmeg",
];
// Season-flavored names — weighted toward matching breed
const SEASON_NAMES={
  Autumn:["Rowan","Ember","Amber","Copper","Russet","Acorn","Hickory","Walnut","Harvest","Tawny","Marrow","Ashen","Roan","Fen","Sorrel"],
  Winter:["Frost","Silver","Hush","Slate","Rime","Quill","Flurry","Aspen","Ivory","Sterling","Mist","Pebble","Nighten"],
  Summer:["Blaze","Brass","Soleil","Marigold","Saffron","Dahlia","Clementine","Zinnia","Coral","Flare","Sienna","Kindle"],
  Spring:["Blossom","Dew","Clove","Primrose","Violet","Aster","Linden","Briar","Ivy","Moss","Sorrel","Sprout"],
};
// Trait-flavored names — special traits get names that echo their power
const TRAIT_NAMES={
  Eternal:["Vesper","Solace","Haven","Riven","Vigil","Crest","Herald","Starling","Meridian"],
  Phoenix:["Kindle","Dawn","Ash","Flicker","Scorch","Fable","Remnant","Reverie"],
  Chimera:["Puzzle","Mosaic","Riddle","Motley","Kaleid","Prisma","Mirage"],
  Alpha:["Rex","Duke","Reign","Crown","Apex","Prime","Summit","Valor"],
  Nocturnal:["Dusk","Shade","Eclipse","Twilight","Gloaming","Umbra","Nyx","Eventide"],
  Scrapper:["Grit","Flint","Fang","Spike","Bolt","Raze","Crag","Vice"],
  Cursed:["Jinx","Hex","Bane","Omen","Wraith","Murk","Pall","Thorn"],
  Guardian:["Ward","Bastion","Aegis","Warden","Shield","Sentinel","Anchor","Keep"],
  Stubborn:["Grim","Stone","Iron","Clench","Root","Anvil","Brace","Plod"],
  Stray:["Drift","Wander","Bridge","Path","Roam","Link","Range","Venture"],
  Loyal:["True","Bond","Steady","Oath","Heart","Trust","Pact","Follow"],
  Scavenger:["Berry","Burrow","Dig","Cache","Gather","Stock","Nest"],
};
// Titles assigned at birth (30% chance for traited cats)
const TITL={Autumn:["the Fading","who Remembers","Last of the Harvest","of Falling Leaves"],Summer:["the Undying","who Burns","Keeper of Flames","the Defiant"],Winter:["the Patient","who Endures","Still as Stone","the Unyielding"],Spring:["the Tender","who Grows","of New Roots","the Renewing"]};
const TITL_RARE={Eternal:["the Myth","of Legend","the Undying Name","whom the Dark Remembers"],Phoenix:["Twice-Risen","the Unkillable","who Returned","Born from Ash"],Chimera:["of Many Faces","the Impossible","who Contains Multitudes","Between Worlds"],Alpha:["the Unquestioned","who Leads","the Apex","First Among All"],Nocturnal:["of the Dark Hours","the Sleepless","who Wakes at Midnight","Last Light Standing"],Echo:["Twice-Heard","the Resonance","who Lingers","the Afterimage"]};

// ════════════════════════════════════════════════════
// EPITHET SYSTEM — earned titles from gameplay events
// ════════════════════════════════════════════════════
const EPITHETS={
  scarred:{test:c=>c.scarred&&!c.epithet,titles:["the Marked","the Scarred","who Bled"]},
  bonded:{test:c=>c.bondedTo&&!c.epithet,titles:["the Devoted","the Beloved","who Chose"]},
  grudgeResolved:{test:c=>c._grudgeResolved&&!c.epithet,titles:["the Forgiven","the Mended","who Let Go"]},
  bossNight:{test:(c,ctx)=>ctx?.bossNight&&!c.epithet,gen:(c,ctx)=>[`of the ${["First","Second","Third","Fourth","Fifth"][Math.min((ctx?.ante||1)-1,4)]} Night`]},
  decisive:{test:(c,ctx)=>ctx?.decisive&&!c.epithet,titles:["the Decisive","who Tipped the Scale","the Clutch"]},
  lastStanding:{test:(c,ctx)=>ctx?.lastStanding&&!c.epithet,titles:["the Alone","Last Standing","the Survivor"]},
  grownUp:{test:c=>c._grewUp&&!c.epithet,titles:["the Grown","the Bloomed","who Found Their Name"]},
};
function assignEpithet(cat,ctx={}){
  if(cat.epithet)return; // one per cat
  for(const[,ep]of Object.entries(EPITHETS)){
    if(ep.test(cat,ctx)){
      const pool=ep.gen?ep.gen(cat,ctx):ep.titles;
      cat.epithet=pk(pool);
      cat.story=[...(cat.story||[]).slice(-4),`Earned: "${cat.epithet}"`];
      cat._newEpithet=true;
      return;
    }
  }
}
function getFullName(cat){
  const first=cat.name.split(" ")[0];
  return cat.epithet?`${first} ${cat.epithet}`:cat.name;
}

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

// ★ EMOTIONAL SYSTEM 1: Death memorial lines — personal eulogy based on cat stats
function getDeathMemorial(cat,ante){
  const fn=cat.name.split(" ")[0];const tp=cat.stats?.tp||0;const bs=cat.stats?.bs||0;
  const bonded=cat.bondedTo;const scarred=cat.scarred;
  if(tp>=10&&bonded)return`${fn} played ${tp} hands. Bonded. Scarred. Carried more than their share. The colony will feel this space for a long time.`;
  if(tp>=8)return`${fn} played ${tp} hands. Best score: ${bs.toLocaleString()}. They knew every fight. Every number. Gone.`;
  if(bonded)return`${fn} was bonded. The mate will look for them tomorrow. And the day after. And the day after that.`;
  if(scarred)return`${fn} carried scars from Night ${Math.max(1,ante-1)}. Survived that. Didn't survive this.`;
  if(tp>=3)return`${fn} was finding their rhythm. ${tp} hands played. A story just getting started.`;
  if(tp===0)return`${fn} never played a single hand. Never got the chance. Remember them anyway.`;
  return`${fn}. Say the name. That's all you can do now.`;
}

// ★ EMOTIONAL SYSTEM 2: Cat reactions after exceptional scoring
const CAT_REACTIONS={
  pb:(fn)=>[`${fn} has never scored higher.`,`${fn} just peaked. They know it. You can tell.`,`The best hand ${fn} will ever play? Maybe. Maybe not.`],
  carry:(fn,pct)=>[`${fn} carried that hand alone.`,`Without ${fn}, that hand collapses.`,`${fn} did ${pct}% of the work. The others watched.`],
  clutch:(fn)=>[`${fn}. One number. That was all that stood between survival and silence.`,`${fn} pulled them through. Ask the others — they'll tell you.`],
  bond:(a,b)=>[`${a} and ${b}. Together, more. Always more.`,`${a} fights harder when ${b} is watching. They both do.`],
};

// ★ EMOTIONAL SYSTEM 5: Night 5 roll call — names of fallen + survivors
function getRollCall(fallen,allCats,ante){
  const lines=[];
  if(fallen.length>0){
    fallen.forEach(f=>lines.push({name:f.name.split(" ")[0],type:"fallen",night:f.night}));
  }
  allCats.forEach(c=>{
    const fn=c.name.split(" ")[0];
    const desc=c.scarred?"scarred":c.bondedTo?"bonded":c.injured?"wounded":"still here";
    lines.push({name:fn,type:"alive",desc});
  });
  return lines;
}
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
  "The sixth night. The dark expected them to break by now. They didn't.",
  "The seventh night. They move like a single creature now. The dark has never seen this.",
  "The eighth night. They have stopped counting. They are just surviving.",
  "The ninth night. The last night of the last colony of the last world. Everything ends here.",
];
const BOSS_FLAVOR=[
  "The cats go still. All of them. At once.",
  "There is a smell. Every living thing on earth recognizes it.",
  "A sound at the edge of the dark. Patient. Certain. It has done this before.",
  "The veterans flatten their ears. The kittens don't understand yet. They will.",
  "Everything you built. Everyone you kept alive. It all comes down to what happens next.",
  "It sends something older this time. Something that remembers the first colony.",
  "The dark doesn't just watch anymore. It studies.",
  "There is nowhere left to retreat. The den is behind you. Everything else is dark.",
  "This is the last thing standing between your colony and the dawn. Make it count.",
];

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

const ANTE_ESCALATION=[
  "", // Night 1: no escalation message
  "The dark noticed the light. It looks closer now.",
  "It remembers your name. The threshold rises.",
  "Four nights. The dark sends what killed the others.",
  "The last threshold. Everything the dark has left.",
];
// ════════════════════════════════════════════════════
// ACHIEVEMENTS — ★ v52: 16 achievements with cosmetic/convenience rewards
// ════════════════════════════════════════════════════
const ACHIEVEMENTS=[
  // Tier 1 — Foundation
  {id:"first_win",name:"Survivor",desc:"Win your first run",icon:"🏆",check:s=>s.w>=1,reward:"5-night mode unlocked"},
  {id:"deathless",name:"Every Single One",desc:"Win with 0 deaths",icon:"💚",check:(_,f)=>f===true,reward:"New epigraphs unlocked"},
  {id:"ten_runs",name:"The Stubborn",desc:"Attempt 10 runs",icon:"🔄",check:s=>s.r>=10,reward:"Run counter on title screen"},
  {id:"max_fervor",name:"Nerve of Steel",desc:"Reach maximum Nerve",icon:"🔥",check:s=>s.mf>=9,reward:"Gold nerve flame visual"},
  // Tier 2 — Mastery
  {id:"all_breeds",name:"All Four Seasons",desc:"Save each season to Hearth",icon:"🐾",check:s=>{const br=new Set((s.disc||[]).map(d=>d.split("-")[0]));return["Autumn","Winter","Spring","Summer"].every(b=>br.has(b));},reward:"Season icons glow on title"},
  {id:"five_wins",name:"Colony Leader",desc:"Win 5 runs",icon:"👑",check:s=>s.w>=5,reward:"Gold colony name on title"},
  {id:"night5",name:"Into the Dark",desc:"Reach Night 5",icon:"🌙",check:s=>s.ba>=5,reward:"Boss traits shown on Night Card"},
  {id:"breeder",name:"The Breeder",desc:"5+ kittens in one run",icon:"🐣",check:s=>s.kittensTotal>=5,reward:"Kitten celebration"},
  // Tier 3 — Legend
  {id:"legend_score",name:"NINTH LIFE",desc:"Score 350,000+ in one hand",icon:"✨",check:s=>s.hs>=350000,reward:"Gold card borders"},
  {id:"heat_five",name:"Five by Five",desc:"Win 5 runs at Heat 1+",icon:"🔥",check:s=>(s.heatWins||0)>=5,reward:"Career heat wins shown"},
  {id:"diplomat",name:"The Diplomat",desc:"Resolve 10 grudges across all runs",icon:"🕊️",check:s=>(s.grudgesResolved||0)>=10,reward:"Upgraded reconciliation"},
  {id:"archivist",name:"The Archivist",desc:"Play 50 hands of one type",icon:"📜",check:s=>{const hp=s.handTypePlays||{};return Object.values(hp).some(v=>v>=50);},reward:"Custom hand type sound"},
  // Tier 4 — Myth
  {id:"ninth_dawn",name:"The Remembering",desc:"Clear the Ninth Dawn",icon:"🌅",check:s=>s.ninthDawnCleared===true,reward:"Secret epigraph pool"},
  {id:"constellation",name:"The Constellation",desc:"Save 20+ cats to Hearth",icon:"⭐",check:s=>(s.hearthTotal||0)>=20,reward:"Hearth becomes star field"},
  {id:"unbroken",name:"Unbroken Line",desc:"3rd generation cat in colony",icon:"👪",check:s=>s.thirdGen===true,reward:"Lineage tree in den"},
  {id:"completionist",name:"Completionist",desc:"All other achievements",icon:"🌟",check:(s,_,achv)=>ACHIEVEMENTS.filter(a=>a.id!=="completionist").every(a=>achv.includes(a.id)),reward:"Alternate title gradient"},
];

const BOSS_PORTRAIT_BASE="https://raw.githubusercontent.com/greatgamesgonewild/ninth-life/main/bosses/";
const BOSS_PORTRAITS={hunger:"hunger.webp",territory:"territory.webp",mother:"mother.webp",swarm:"swarm.webp",forgetting:"forgetting.webp",fraying:"fraying.webp",eclipse:"eclipse.webp",ember:"ember.webp"};
const BOSS_MASTERY={
  hunger:{title:"FAMINE BREAKER",wins:5},
  territory:{title:"GROUND KEEPER",wins:5},
  mother:{title:"THE UNBURDENED",wins:5},
  swarm:{title:"SWARM BREAKER",wins:5},
  forgetting:{title:"ONE WHO REMEMBERS",wins:5},
  fraying:{title:"THE UNBROKEN",wins:5},
  eclipse:{title:"LIGHT BEARER",wins:5},
  ember:{title:"THE FINISHER",wins:5},
};

function getChapterTitle(meta){
  if(!meta)return null;
  const w=meta.stats.w||0,r=meta.stats.r||0,h=meta.heat||0;
  if(meta.ninthDawnCleared)return{num:"VII",name:"THE TENTH COLONY"};
  if(w>=1&&h>=3)return{num:"VI",name:"THE FIRE THAT SPREADS"};
  if(w>=10)return{num:"V",name:"THE LONG MEMORY"};
  if(w>=6)return{num:"IV",name:"WHAT THE DARK TAUGHT"};
  if(w>=3)return{num:"III",name:"THE OLD WOUNDS"};
  if(meta.cats?.length>=3)return{num:"II",name:"NAMES IN THE FIRE"};
  if(r>=1)return{num:"I",name:"THE FIRST NIGHT"};
  return null;
}

// ════════════════════════════════════════════════════
// CAT XP - experience from being played
// ════════════════════════════════════════════════════
// ★ CAT XP TIERS — cosmetic progression. Does NOT affect scoring.
// Shown in trait tooltips and aftermath notifications for flavor only.
// Novice (×0.9) means fresh cats are a risk. Every rank-up is a dopamine hit.
// Tiers 1-3 always available. Tiers 4-7 require Cat Mastery upgrade.
const CAT_XP=[
  {plays:0, label:"Novice",    bonus:{mult:0,xMult:0.9}, color:"#666",   free:true, icon:"·"},
  {plays:3, label:"Experienced",bonus:{mult:2,xMult:1},   color:"#94a3b8",free:true, icon:"·"},
  {plays:6, label:"Expert",    bonus:{mult:3,xMult:1.1}, color:"#60a5fa",free:true, icon:"★"},
  {plays:9, label:"Veteran",   bonus:{mult:4,xMult:1.2}, color:"#818cf8",icon:"✦"},
  {plays:12,label:"Icon",      bonus:{mult:4,xMult:1.25},color:"#c084fc",icon:"✦"},
  {plays:15,label:"CATALYST",  bonus:{mult:4,xMult:1.3}, color:"#f472b6",icon:"◆"},
  {plays:18,label:"Purrrfect", bonus:{mult:5,xMult:1.5}, color:"#fbbf24",icon:"☀"},
];
function getCatXP(tp,hasMastery=false){
  for(let i=CAT_XP.length-1;i>=0;i--){
    if(tp>=CAT_XP[i].plays){
      if(CAT_XP[i].free||hasMastery)return CAT_XP[i];
    }
  }
  // Without mastery, cap at highest free tier
  for(let i=CAT_XP.length-1;i>=0;i--){
    if(tp>=CAT_XP[i].plays&&CAT_XP[i].free)return CAT_XP[i];
  }
  return CAT_XP[0]; // Everyone starts as Novice
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
// ═══════════════════════════════════════════════════════════
// v50 — "EVERY EVENT IS A SCAR OR A STORY"
// Voice: a narrator who has watched colonies die. Wry, weathered, invested.
// Dignity: named cats are affected. Never "weakest." Crisis events spaced.
// Structure: thematic tags ensure variety. Chains weighted 60%. Night 5 mandatory.
// Tags: memory, sacrifice, belonging, identity, survival, hope
// ═══════════════════════════════════════════════════════════

// ——— ARC 1: THE STRANGER (3 events) ———
{id:"stranger_arrives",title:"The Stranger",icon:"🐱",maxNight:2,tag:"belonging",
  textFn:(_,ctx)=>{const n=ctx.colony;return n>=18?`Ribs like a ladder. Eyes like yours on a bad night. All ${n} of your cats are watching the entrance and nobody's moving. You know what this is. You've been this — the one on the outside, hoping someone opens the door.`:`Something at the edge of the firelight. Not the dark — something smaller. Hungrier. It has a name somewhere behind those eyes. Whether you learn it is up to you.`;},
  choices:[
    {label:"One more mouth. One more heartbeat.",desc:"A stranger joins the colony.",fx:{addCat:true,chainSet:"stranger_welcomed"}},
    {label:"You can't save everyone. Start with these.",desc:"-2 Rations, +2 Nerve.",fx:{gold:-2,fervor:2,chainSet:"stranger_rejected"}},
  ]},
{id:"stranger_returns",title:"The Stranger Returns",icon:"🐱",minNight:2,chainRequires:"stranger_rejected",tag:"belonging",
  textFn:(_,ctx)=>`Same eyes. You recognize them now. Thinner than before, which you didn't think was possible. They came back. After what you did, they still came back. That tells you something about them. Maybe about you too.`,
  choices:[
    {label:"Alright. This time, come in.",desc:"They join scarred but strong.",fx:{addCat:true,catPower:3,chainSet:"stranger_redeemed"}},
    {label:"Not this time either. Not ever.",desc:"+3 Nerve. The guilt burns clean.",fx:{fervor:3}},
  ]},
{id:"stranger_gift",title:"The Stranger's Gift",icon:"🎁",minNight:2,chainRequires:"stranger_welcomed",tag:"belonging",
  textFn:(_,ctx)=>`The one you took in — the stranger — left something at the entrance while everyone slept. A kill. The biggest anyone's seen. They're sitting beside it. Not eating. Waiting. You know what they're saying without words: I belong here now. Right?`,
  choices:[
    {label:"Share it. Everyone eats tonight.",desc:"+4 Rations. +1 Nerve.",fx:{gold:4,fervor:1}},
    {label:"You eat first. You earned it.",desc:"Best cat +3 Power.",fx:{bestPower:3}},
  ]},

// ——— ARC 2: THE SICKNESS (3 events) ———
{id:"sickness",title:"The Sickness",icon:"🤒",minNight:2,maxNight:4,needsCat:"random",tag:"sacrifice",
  textFn:(t,ctx)=>{const n=t[0]?.name.split(" ")[0]||"Someone";return`${n} didn't eat this morning. By midday they're shaking. By evening two others won't look you in the eye. You've seen this before? No. Nobody's seen this before and survived. That's the point.`;},
  choices:[
    {label:"Quarantine. It's the only way.",desc:`Cat scarred. Colony safe.`,fx:{targetScar:true,fervor:1,chainSet:"sickness_quarantine"}},
    {label:"We stay together. All of us.",desc:"All cats -1 Power. No one alone.",fx:{allPowerLoss:true,chainSet:"sickness_spread"}},
    {label:"Burn the rations for medicine.",desc:"-4 Rations. Full heal.",fx:{gold:-4,fullHeal:true}},
  ]},
{id:"sickness_aftermath",title:"After the Fever",icon:"💪",minNight:2,chainRequires:"sickness_quarantine",needsCat:"random",tag:"identity",
  textFn:(t,ctx)=>{const n=t[0]?.name.split(" ")[0]||"They";return`${n} survived the quarantine. Different now. Quieter. But when the others hesitate, ${n} moves first. Every time. You don't get that from rest. You get it from being left alone in the dark and finding out you're enough.`;},
  choices:[
    {label:"You didn't break. Remember that.",desc:"Cat gains Stubborn.",fx:{targetNamedTrait:"Stubborn"}},
    {label:"The colony needs what you became.",desc:"Cat +3 Power.",fx:{targetPower:3}},
  ]},
{id:"sickness_bond",title:"The Ones Who Stayed",icon:"💕",minNight:2,chainRequires:"sickness_spread",needsCat:"pair",tag:"belonging",
  textFn:(t,ctx)=>{const a=t[0]?.name.split(" ")[0]||"One";const b=t[1]?.name.split(" ")[0]||"Another";return`${a} and ${b} slept side by side through the worst of it. When the fever broke, neither would move more than a tail's length from the other. The sickness took something from everyone. But it gave those two each other.`;},
  choices:[
    {label:"Let it become what it is.",desc:"Both bond. +1 Power each.",fx:{pactBond:true}},
    {label:"The memory hardens them.",desc:"Both +2 Power.",fx:{bothPower:2}},
  ]},

// ——— ARC 3: THE WALL (3 events) ———
{id:"the_wall",title:"The Wall",icon:"🧱",maxNight:3,tag:"survival",
  textFn:(_,ctx)=>`Someone started stacking stones while the others slept. By morning there's half a wall. Not enough to stop anything real. But enough to say something real: we're not leaving. Question is whether you finish it or take it apart for what it's worth.`,
  choices:[
    {label:"Finish what they started.",desc:"Den safe next phase. -2 Rations.",fx:{eventDenSafe:true,gold:-2,chainSet:"wall_built"}},
    {label:"Stones are worth more loose.",desc:"+3 Rations.",fx:{gold:3,chainSet:"wall_refused"}},
  ]},
{id:"wall_holds",title:"The Wall Holds",icon:"🛡️",minNight:2,chainRequires:"wall_built",tag:"hope",
  textFn:(_,ctx)=>`Something hit the wall last night. Hard enough to crack the second row. Hard enough to wake every one of your ${ctx.colony} cats. But it held. Claw marks on the other side, deep ones. On this side: nothing. Just a colony, alive, staring at something they built that actually worked.`,
  choices:[
    {label:"Repair it. Build it higher.",desc:"Den safe again. All cats +1 Power.",fx:{eventDenSafe:true,allPower:1}},
    {label:"The lesson matters more than the wall.",desc:"+3 Nerve. You can build things that last.",fx:{fervor:3}},
  ]},
{id:"wall_regret",title:"What the Wall Would Have Stopped",icon:"🌧️",minNight:2,chainRequires:"wall_refused",needsCat:"random",tag:"sacrifice",
  textFn:(t,ctx)=>{const n=t[0]?.name.split(" ")[0]||"Someone";return`The rain came sideways. ${n} was closest to the entrance. Took the worst of it. Everyone's thinking the same thing. The stones you took apart would have been a wall. ${n}'s shivering. Nobody's saying it. Everyone's saying it.`;},
  choices:[
    {label:"We should have built it.",desc:"Cat scarred. +2 Nerve.",fx:{targetScar:true,fervor:2}},
    {label:"We'll build something better.",desc:"-3 Rations. Den safe.",fx:{gold:-3,eventDenSafe:true}},
  ]},

// ——— ARC 4: THE DEBT (2 events) ———
{id:"the_debt",title:"The Debt",icon:"📜",minNight:2,maxNight:4,tag:"sacrifice",
  textFn:(_,ctx)=>`A voice from the dark. Not hostile. Worse — businesslike. "I kept something alive for you once. Before you knew this place existed. Now I need something in return." You can't see what's speaking. You're not sure you want to.`,
  choices:[
    {label:"Pay in blood. Get it over with.",desc:"Random cat scarred. +4 Rations. +2 Nerve.",fx:{debtBlood:true,chainSet:"debt_paid"}},
    {label:"We owe nothing to the dark.",desc:"50/50: +3 Nerve or -1 hand next round.",fx:{debtRefuse:true,chainSet:"debt_refused"}},
  ]},
{id:"debt_collector",title:"The Collector",icon:"📜",minNight:3,chainRequires:"debt_refused",tag:"sacrifice",
  textFn:(_,ctx)=>`It came back. The voice. Quieter now. "I asked nicely last time." Two of your youngest cats are shaking. They can feel it. Whatever's out there, it remembers you said no.`,
  choices:[
    {label:"Fine. Take what you're owed.",desc:"Two youngest cats -2 Power. +6 Rations.",fx:{weakDmg:true,gold:6}},
    {label:"We said no. We meant it.",desc:"+4 Nerve. Nothing is free.",fx:{fervor:4}},
  ]},

// ——— ARC 5: THE FIRE (2 events) ———
{id:"the_fire",title:"The Fire",icon:"🔥",maxNight:3,tag:"hope",
  textFn:(_,ctx)=>`Nobody knows who started it. Maybe lightning. Maybe something kinder. But there's a fire now, burning in a ring of stones, and every cat in the colony is sitting around it like they were born for this exact moment. Funny thing about fire — you don't realize how cold you were until you're warm.`,
  choices:[
    {label:"Tend it. Guard it. Keep it alive.",desc:"+2 Nerve. +1 Shelter.",fx:{fervor:2,eventDenBonus:true,chainSet:"fire_tended"}},
    {label:"Cook everything you've got.",desc:"+5 Rations. Practical wins.",fx:{gold:5,chainSet:"fire_taken"}},
  ]},
{id:"fire_memory",title:"The Fire Remembers",icon:"🔥",minNight:3,chainRequires:"fire_tended",tag:"hope",
  textFn:(_,ctx)=>{const bonded=ctx.all.filter(c=>c.bondedTo);const n=Math.floor(bonded.length/2);return n>0?`The fire's still burning. Nobody feeds it anymore — it just goes. The bonded pairs sit closest. ${n} pair${n>1?"s":""}, warming each other and the flame. Something about this feels older than any of you. Like you're remembering something you never lived.`:`The fire's still burning. No one feeds it. No one needs to. It just keeps going. Remind you of anyone?`;},
  choices:[
    {label:"Tell stories around it.",desc:"Bonded cats +2 Power. +1 Nerve.",fx:{bondedPower:2,fervor:1}},
    {label:"Some silences say more.",desc:"+3 Nerve.",fx:{fervor:3}},
  ]},

// ——— ARC 6: THE ELDER (2 events) ———
{id:"the_elder",title:"The Elder",icon:"👴",minNight:3,needsCat:"random",tag:"memory",
  textFn:(t,ctx)=>{const n=t[0]?.name.split(" ")[0]||"Someone";const tp=t[0]?.stats?.tp||0;return tp>=5?`${n} has fought more hands than anyone and the others know it. They don't look at ${n} with fear. It's closer to reverence. ${n} doesn't notice. Too busy surviving to see what they've become.`:`${n} sits at the back. Says nothing. But when the younger cats argue, they all glance toward ${n} first. Authority isn't given. It's accumulated.`;},
  choices:[
    {label:"Teach them what you know.",desc:"Cat +2 Power. Colony learns.",fx:{targetPower:2,chainSet:"elder_met"}},
    {label:"Rest. You've earned it.",desc:"Cat healed. +1 Shelter.",fx:{targetHeal:true,eventDenBonus:true}},
  ]},
{id:"elder_legacy",title:"The Elder's Legacy",icon:"📖",minNight:3,chainRequires:"elder_met",tag:"memory",
  textFn:(_,ctx)=>{const traits=ctx.all.filter(c=>(c.trait||{}).name!=="Plain");return`The elder started scratching marks into the wall at sunset. By midnight it's a map. Not of places — of relationships. Who bonds with whom. Who fights. Who carries. ${traits.length} cats with names worth remembering. The elder knows every single one.`;},
  choices:[
    {label:"Study the map.",desc:"+3 Nerve. Bonded cats +1 Power.",fx:{fervor:3,bondedPower:1}},
    {label:"Add your own marks.",desc:"Random plain cat gains trait. +2 Rations.",fx:{targetTrait:true,gold:2}},
  ]},

// ——— ESTABLISHING (Night 1-2) ———
{id:"cache",title:"The Cache",icon:"📦",maxNight:3,tag:"survival",
  textFn:(_,ctx)=>{const c=ctx.all.length;return`A dead colony's pantry. Still stocked. Isn't that always the way — they had enough food, they just didn't have enough time. You've got ${c} mouths and enough here for maybe half of them to care.`;},
  choices:[
    {label:"Dead colony, full pantry. Take it.",desc:"+4 Rations.",fx:{gold:4}},
    {label:"Feed the one who needs it most.",desc:"Best cat +2 Power.",fx:{bestPower:2}},
    {label:"Burn it. The warmth matters more.",desc:"+2 Nerve.",fx:{fervor:2}},
  ]},
{id:"first_kill",title:"First Blood",icon:"🩸",needsCat:"random",maxNight:2,tag:"identity",
  textFn:(t,ctx)=>{const n=t[0]?.name.split(" ")[0]||"Someone";const sc=ctx?.scarred||0;return`${n} brought something back. Dropped it at the entrance without a word and sat down. ${sc>0?`Not the first to bleed for this colony. Won't be the last. But ${n} didn't need to be asked.`:`The others don't know what to do with it. ${n} does. ${n}'s known since before you got here.`}`;},
  choices:[
    {label:"You've earned this.",desc:"Cat +2 Power.",fx:{targetPower:2}},
    {label:"Everyone eats tonight.",desc:"+3 Rations.",fx:{gold:3}},
  ]},
{id:"the_name",title:"The Old Name",icon:"📛",maxNight:2,tag:"memory",
  textFn:(_,ctx)=>`Scratched into the stone above the entrance: a name. Not a cat's name — a colony's name. The one that was here before. They carved it deep. Like they wanted someone to see it, even knowing no one would. But you see it. You're seeing it right now.`,
  choices:[
    {label:"Add ours below theirs.",desc:"+2 Nerve. We were here.",fx:{fervor:2}},
    {label:"Study their marks. Learn what they knew.",desc:"Random plain cat gains trait.",fx:{targetTrait:true}},
  ]},
{id:"quiet",title:"A Quiet Moment",icon:"🌙",maxNight:5,needsCat:"random",tag:"hope",
  textFn:(t,ctx)=>{const n=t[0]?.name.split(" ")[0]||"Someone";const p=t[0]?.power||0;const sc=t[0]?.scarred;return sc?`${n} is sitting alone at the entrance. Scar catching the firelight. Not watching for danger — just watching. Like they're memorizing what the dark looks like from the winning side.`:`${n} is sitting alone, watching the dark. Not afraid. Just... present. The others give them space. Some silences are worth more than plans.`;},
  choices:[
    {label:"Sit with them. Say nothing.",desc:"Cat +1 Power. +1 Nerve.",fx:{targetPower:1,fervor:1}},
    {label:"Let them have this.",desc:"Cat gains Loyal.",fx:{targetNamedTrait:"Loyal"}},
  ]},

// ——— PRESSURE (Night 2-3) ———
{id:"the_pact",title:"The Pact",icon:"🤝",needsCat:"pair",minNight:2,tag:"belonging",
  textFn:(t,ctx)=>{const a=t[0]?.name.split(" ")[0]||"One";const b=t[1]?.name.split(" ")[0]||"Another";const grudge=t[0]?.grudgedWith?.includes(t[1]?.id);return grudge?`${a} and ${b} have been circling each other for days. Not fighting. Not talking. Just circling. Tonight one of them stopped. The other sat down. Something's changing and it's bigger than both of them.`:`${a} and ${b} found something in each other. The kind of recognition that doesn't need explaining. You can see it from across the den. Something's being decided.`;},
  choices:[
    {label:"Let it become what it is.",desc:"Both bond. +1 Power each.",fx:{pactBond:true}},
    {label:"Turn it into fire.",desc:"Both +2 Power. Grudge fuels them.",fx:{pactGrudge:true}},
  ]},
{id:"the_choice",title:"The Lifeboat",icon:"⚖️",needsCat:"pair",minNight:2,tag:"sacrifice",
  textFn:(t,ctx)=>{const a=t[0]?.name.split(" ")[0]||"One";const b=t[1]?.name.split(" ")[0]||"Another";return`The ledge is crumbling. ${a} (P${t[0]?.power||"?"}) on the left. ${b} (P${t[1]?.power||"?"}) on the right. One paw-hold. The rock's already moving. You know exactly what this is. Don't pretend you don't.`;},
  choices:[
    {labelFn:t=>`Reach for ${t[0]?.name.split(" ")[0]||"the first"}.`,desc:"Saved +3 Power. Other scarred, grudge formed.",fx:{choiceSave:0}},
    {labelFn:t=>`Reach for ${t[1]?.name.split(" ")[0]||"the second"}.`,desc:"Saved +3 Power. Other scarred, grudge formed.",fx:{choiceSave:1}},
  ]},
{id:"the_challenge",title:"The Challenge",icon:"⚔️",needsCat:"pair",minNight:2,tag:"identity",
  textFn:(t,ctx)=>{const a=t[0]?.name.split(" ")[0]||"One";const b=t[1]?.name.split(" ")[0]||"Another";return`${a} knocked ${b}'s food sideways. Deliberate. ${b} turned slow. The colony went quiet. This is either going to end with blood or with something stronger than blood. You can feel everyone waiting to see which.`;},
  choices:[
    {label:"Blood, then. Get it over with.",desc:"Winner +2 Power. Loser scarred.",fx:{catFight:true}},
    {label:"Not tonight.",desc:"Both -1 Power. But no blood.",fx:{bothWeaken:true,fervor:1}},
  ]},
{id:"the_gift",title:"Something Left Behind",icon:"🎁",minNight:2,tag:"memory",
  textFn:(_,ctx)=>`Wedged in the rocks: something wrapped in leaves. Old leaves. Older than this colony, older than the one before it. Someone hid this here on purpose and whoever they were, they're gone in a way that doesn't leave a forwarding address.`,
  choices:[
    {label:"Open it. They left it for someone.",desc:"Random: ward, rations, or trouble.",fx:{mysteryGift:true}},
    {label:"Some things stay buried for a reason.",desc:"+2 Nerve.",fx:{fervor:2}},
  ]},

// ——— DESPERATION (Night 3-4) ———
{id:"the_wager",title:"The Wager",icon:"🎲",minNight:3,tag:"survival",
  textFn:(_,ctx)=>{const g=ctx.gold||0;return`A voice from the dark. Not the businesslike one — this one laughs. "I'll bet you double or nothing. ${g} rations on one question: does your colony see dawn?" The laughter stops. "Well?"`;},
  choices:[
    {label:"You're on. Bet the rations.",desc:"55%: triple rations + Nerve. 45%: lose half.",fx:{wagerGold:true}},
    {label:"Bet something that matters.",desc:"55%: best cat gains rare trait. 45%: scarred.",fx:{wagerBest:true}},
    {label:"Not today. Not with them.",desc:"+2 Nerve.",fx:{fervor:2}},
  ]},
{id:"the_hollow",title:"The Hollow Tree",icon:"🌳",minNight:3,tag:"identity",
  textFn:(_,ctx)=>`The tree has been dead longer than any colony has been alive. But inside it's warm. Not hot — just the absence of cold. One of your cats is already walking toward it. The others are watching, and you can see them doing the math: is this hope or a trap? The answer is always both.`,
  choices:[
    {label:"Let them go. Some doors you walk through.",desc:"Random: trait gained, supplies, or scar.",fx:{hollowEnter:true}},
    {label:"We don't walk into the dark.",desc:"+2 Nerve.",fx:{fervor:2}},
  ]},
{id:"the_storm",title:"The Storm",icon:"⛈️",minNight:3,tag:"survival",
  textFn:(_,ctx)=>{const n=ctx.colony;return`You know what's louder than a storm? ${n} cats pretending they're not scared. The ones on the outside are taking the worst of it. The ones on the inside are taking it differently. Everyone needs something and there isn't enough of anything.`;},
  choices:[
    {label:"Shield the youngest. We owe them that.",desc:"Strongest cat scarred. +2 Nerve.",fx:{targetGambleScar:true,fervor:2}},
    {label:"Ride it out. Everyone takes their share.",desc:"2 cats -2 Power. +1 hand next round.",fx:{weakDmg:true,tempHands:1}},
    {label:"Burn supplies for shelter. Everything.",desc:"-4 Rations. Full heal. Den safe.",fx:{gold:-4,fullHeal:true,eventDenSafe:true}},
  ]},
{id:"the_split",title:"The Split",icon:"↔️",needsCat:"pair",minNight:3,tag:"identity",
  textFn:(t,ctx)=>{const a=t[0]?.name.split(" ")[0]||"One";const b=t[1]?.name.split(" ")[0]||"Another";return`Two paths. ${a} smells food to the left. ${b} hears water to the right. Colony can't split. Someone decides for everyone. That's what leadership is — picking which half of the colony to disappoint.`;},
  choices:[
    {labelFn:t=>`Follow ${t[0]?.name.split(" ")[0]||"left"}'s instinct.`,desc:"Outcome depends on their Power.",fx:{splitFollow:0}},
    {labelFn:t=>`Follow ${t[1]?.name.split(" ")[0]||"right"}'s instinct.`,desc:"Outcome depends on their Power.",fx:{splitFollow:1}},
  ]},

// ——— ENDGAME WEIGHT (Night 4-5) ———
{id:"the_count",title:"The Count",icon:"📋",minNight:4,tag:"memory",
  textFn:(_,ctx)=>{const n=ctx.colony;const fallen=ctx.fallen?.length||0;return fallen>0?`You count them. ${n}. You count again. Still ${n}. The number doesn't change no matter how many times you check. ${fallen} empty spaces where names used to be. You'll carry those spaces with you. That's the deal.`:`You count them. ${n}. Every single one. You count again. Still ${n}. All of them. Still here. You know how rare that is? Most colonies can't say that by Night 2.`;},
  choices:[
    {label:"Say the names. All of them.",desc:"+3 Nerve.",fx:{fervor:3}},
    {label:"Focus on the living.",desc:"All cats +1 Power.",fx:{allPower:1}},
  ]},
{id:"the_last_light",title:"The Last Light",icon:"🕯️",minNight:4,tag:"hope",
  textFn:(_,ctx)=>{const b=ctx.all.filter(c=>c.bondedTo);const s=ctx.all.filter(c=>c.scarred);return`The light is failing. Not the fire — the other light. The one inside. ${b.length>0?`The bonded pairs hold tighter. `:""}${s.length>0?`The scarred ones don't flinch anymore. `:""}This is the part where colonies give up. You can feel it in the air — the quiet before surrender. The question is whether you're the kind that surrenders.`;},
  choices:[
    {label:"Not us. Not tonight. Not ever.",desc:"+4 Nerve.",fx:{fervor:4}},
    {label:"Rest. We'll need everything for tomorrow.",desc:"Full heal. +2 Rations.",fx:{fullHeal:true,gold:2}},
  ]},
{id:"the_sacrifice",title:"The Offering",icon:"🕊️",minNight:4,needsCat:"random",tag:"sacrifice",
  textFn:(t,ctx)=>{const n=t[0]?.name.split(" ")[0]||"Someone";const p=t[0]?.power||0;return`${n}'s standing at the entrance and you already know what that means. Don't pretend you don't. P${p}. They're not running because they decided this before you did. The question is whether you're going to stop them.`;},
  choices:[
    {label:"I'm stopping them.",desc:"+2 Nerve. We don't trade lives.",fx:{fervor:2}},
    {label:"...let them go.",desc:"Cat lost. +6 Rations. Den safe.",fx:{sacrifice:true}},
  ]},
{id:"the_vigil",title:"The Vigil",icon:"🕯️",minNight:4,tag:"memory",
  textFn:(_,ctx)=>{const fallen=ctx.fallen||[];const n=ctx.colony;return fallen.length>0?`Someone placed a stone at the entrance for each cat lost. ${fallen.length} stone${fallen.length>1?"s":""}. ${n} cats sitting around them in silence. Not grieving — remembering. There's a difference, and the colony that knows the difference is the colony that makes it.`:`No one can sleep. All ${n} of them, awake, watching the entrance. Not because they're afraid. Because they want to be awake for this. Whatever tonight becomes, they want to be present for it.`;},
  choices:[
    {label:"Say their names. Every one.",desc:"+3 Nerve.",fx:{fervor:3}},
    {label:"Add a stone for the living.",desc:"All cats +1 Power.",fx:{allPower:1}},
  ]},

// ——— TRAIT-SPECIFIC ———
{id:"the_stubborn_stand",title:"The Stand",icon:"🪨",minNight:2,needsCat:"random",tag:"identity",
  textFn:(t,ctx)=>{const n=t[0]?.name.split(" ")[0]||"Someone";return`Something came for the food stores. Big enough that everyone else backed away. ${n} didn't. Didn't run. Didn't call for help. Just stood there like a stone that grew legs and opinions. Whatever it was took one look at ${n} and left.`;},
  choices:[
    {label:"You don't bend, do you?",desc:"Cat gains Stubborn.",fx:{targetNamedTrait:"Stubborn"}},
    {label:"Get inside. Now.",desc:"Cat +2 Power. +1 Nerve.",fx:{targetPower:2,fervor:1}},
  ]},
{id:"the_wanderer",title:"The Wanderer's Return",icon:"🐈",minNight:2,needsCat:"random",tag:"identity",
  textFn:(t,ctx)=>{const n=t[0]?.name.split(" ")[0]||"Someone";return`${n} disappeared for two days. Everyone thought the worst. Then they walked back in smelling of places no cat here has been. Brought nothing back but a look that says: I've seen all four seasons. I've seen everything.`;},
  choices:[
    {label:"What did you find out there?",desc:"Cat gains Stray. +2 Rations.",fx:{targetNamedTrait:"Stray",gold:2}},
    {label:"Don't you ever do that again.",desc:"Cat +3 Power.",fx:{targetPower:3}},
  ]},
{id:"the_devotion",title:"The Devotion",icon:"🫂",needsCat:"pair",minNight:2,tag:"belonging",
  textFn:(t,ctx)=>{const a=t[0]?.name.split(" ")[0]||"One";const b=t[1]?.name.split(" ")[0]||"Another";const bonded=t[0]?.bondedTo===t[1]?.id;return bonded?`${a} and ${b} won't eat unless the other eats first. It's becoming a problem. A beautiful, infuriating problem that you don't actually want to solve.`:`${a} keeps bringing food to ${b}. Not sharing — giving. ${b} pretends not to notice. Everyone else notices. Everyone else is trying not to smile.`;},
  choices:[
    {label:"Let it grow. We need more of this.",desc:"Both gain Loyal.",fx:{bothNamedTrait:"Loyal"}},
    {label:"Channel it. Fight, don't feel.",desc:"Both +2 Power.",fx:{bothPower:2}},
  ]},
{id:"the_scavenger_find",title:"The Find",icon:"🌾",maxNight:4,needsCat:"random",tag:"survival",
  textFn:(t,ctx)=>{const n=t[0]?.name.split(" ")[0]||"Someone";return`${n} found a cache buried so deep it was clearly meant to stay hidden. Old. Sealed. Enough to feed the colony twice over. The question isn't whether to eat it. The question is how fast.`;},
  choices:[
    {label:"Feast. Tonight we live.",desc:"+6 Rations. Full heal.",fx:{gold:6,fullHeal:true}},
    {label:"Ration it. Make it last.",desc:"+3 Rations. Cat gains Scavenger.",fx:{gold:3,targetNamedTrait:"Scavenger"}},
  ]},
{id:"the_echo_cave",title:"The Echo",icon:"🔁",minNight:3,needsCat:"random",tag:"memory",
  textFn:(t,ctx)=>{const n=t[0]?.name.split(" ")[0]||"Someone";return`${n} called into the cave. Their voice came back. Twice. Not an echo — the second voice was different. Deeper. Said the same words but meant something else entirely. Like the cave was translating.`;},
  choices:[
    {label:"Call again. See what answers.",desc:"Cat gains Echo.",fx:{targetNamedTrait:"Echo",specificTrait:"Echo",rareTrait:true}},
    {label:"Seal it. Some things echo for a reason.",desc:"+3 Nerve.",fx:{fervor:3}},
  ]},
{id:"the_alpha_test",title:"The Test of Strength",icon:"🐺",minNight:2,needsCat:"random",tag:"identity",
  textFn:(t,ctx)=>{const n=t[0]?.name.split(" ")[0]||"Someone";const p=t[0]?.power||0;return`${n} (P${p}) walked to the front of the food line and stared. That's it. Didn't push. Didn't hiss. Just stared until everyone else looked away. You've seen this before in colonies that work. Also in colonies that don't.`;},
  choices:[
    {label:"Alright. You lead.",desc:"Cat gains Alpha.",fx:{targetNamedTrait:"Alpha",specificTrait:"Alpha",rareTrait:true}},
    {label:"We're equals here. All of us.",desc:"Cat +2 Power. All others +1 Power.",fx:{targetPower:2,othersPower:1}},
  ]},

// ——— EMOTIONAL BEATS ———
{id:"the_lullaby",title:"The Lullaby",icon:"🎵",minNight:2,needsCat:"random",tag:"hope",
  textFn:(t,ctx)=>{const n=t[0]?.name.split(" ")[0]||"Someone";const kittens=ctx.all.filter(c=>c.parentIds?.length>0);return kittens.length>0?`${n} is humming. Not a song anyone knows. The kittens — ${kittens.map(k=>k.name.split(" ")[0]).slice(0,3).join(", ")} — are asleep before the second verse. The adults pretend they're not listening. They're all listening.`:`${n} is humming something that came from before this colony, before the dark. One by one, the others stop what they're doing. Not to listen. To remember something they didn't know they'd forgotten.`;},
  choices:[
    {label:"Join in. Everyone needs this.",desc:"All cats heal. +1 Nerve.",fx:{fullHeal:true,fervor:1}},
    {label:"Let it end on its own.",desc:"Cat gains Devoted.",fx:{targetNamedTrait:"Devoted"}},
  ]},
{id:"the_naming",title:"The Naming Ceremony",icon:"✨",minNight:3,needsCat:"random",tag:"identity",
  textFn:(t,ctx)=>{const plains=ctx.all.filter(c=>(c.trait||{}).name==="Plain");const n=t[0]?.name.split(" ")[0]||"Someone";return plains.length>3?`${plains.length} cats in this colony without a defining moment. Without the thing that makes them them. ${n} is looking at you like they're waiting for theirs. You can see it — the potential. The almost.`:`${n} did something today nobody expected. Small. Unremarkable to anyone who wasn't watching. But you were watching. You always are.`;},
  choices:[
    {label:"This is your moment.",desc:"Cat gains a random trait.",fx:{targetTrait:true}},
    {label:"Your moment will come. Be patient.",desc:"Cat +2 Power. +1 Nerve.",fx:{targetPower:2,fervor:1}},
  ]},
{id:"the_grave",title:"The Unmarked Grave",icon:"⚰️",minNight:3,tag:"memory",
  textFn:(_,ctx)=>{const fallen=ctx.fallen||[];return fallen.length>0?`You found it while digging. A grave. Not one of yours — older. Deeper. From the colony before. No marker, no name. Just a hollow in the dirt shaped like someone who mattered. ${fallen.length} of yours are gone too. Somebody, someday, will find their graves and not know their names either. Unless.`:`A hollow in the dirt. Shaped like a body. No marker. No name. Gone in a way that doesn't leave anything behind. Not dead — erased. As if they were never here at all.`;},
  choices:[
    {label:"Mark it. Every name is defiance.",desc:"+3 Nerve.",fx:{fervor:3}},
    {label:"Dig deeper. They were buried with something.",desc:"Find a ward.",fx:{addWard:true}},
  ]},
{id:"the_inheritance",title:"The Inheritance",icon:"📜",minNight:3,needsCat:"random",tag:"memory",
  textFn:(t,ctx)=>{const n=t[0]?.name.split(" ")[0]||"Someone";return`${n} found carvings in the back wall. Not words — diagrams. Strategies. Patterns. A dead colony's last gift to whoever came next. They spent their final hours writing instructions for people they'd never meet. That's either beautiful or heartbreaking. Probably both.`;},
  choices:[
    {label:"Read it to everyone.",desc:"All cats +1 Power. Plain cat gains trait.",fx:{inheritanceRead:true}},
    {label:"Keep it quiet. One cat's edge.",desc:"Cat +3 Power. Best cat gains rare trait.",fx:{inheritancePrivate:true}},
  ]},

// ——— COLONY-REACTIVE ———
{id:"the_reckoning",title:"The Reckoning",icon:"⚡",minNight:2,needsCat:"pair",tag:"belonging",
  textFn:(t,ctx)=>{const a=t[0]?.name.split(" ")[0]||"One";const b=t[1]?.name.split(" ")[0]||"Another";const hasGrudge=t[0]?.grudgedWith?.includes(t[1]?.id);return hasGrudge?`${a} and ${b} have been carrying this long enough. Tonight something shifts. Not forgiveness — something rawer. The whole colony can feel it, the way you feel a storm before it hits.`:`${a} bumped ${b} at the food pile. The silence afterward lasted longer than it should have. This is going somewhere. The only question is where.`;},
  choices:[
    {label:"Talk. Now. Both of you.",desc:"Both bond. +1 Power each.",fx:{pactBond:true}},
    {label:"Get it out of your systems.",desc:"Winner +3 Power, loser scarred.",fx:{catFight:true}},
    {label:"Separate them. Distance helps.",desc:"+1 Shelter. +1 Nerve.",fx:{eventDenBonus:true,fervor:1}},
  ]},
{id:"the_teaching",title:"The Teaching",icon:"🎓",minNight:3,needsCat:"pair",tag:"belonging",
  textFn:(t,ctx)=>{const a=t[0]?.name.split(" ")[0]||"One";const b=t[1]?.name.split(" ")[0]||"Another";const isParent=t[1]?.parentIds?.includes(t[0]?.id);return isParent?`${a} has been watching ${b} — their own kitten, grown now. Watching how they hesitate. Tonight, ${a} sat down next to ${b} and just... showed them. No words. Just doing.`:`${a} has something ${b} needs to learn. You can see it in the way ${b} watches when ${a} isn't looking. Some lessons aren't taught. They're witnessed.`;},
  choices:[
    {label:"Let the lesson happen.",desc:"Both +2 Power.",fx:{bothPower:2}},
    {label:"Make it a colony lesson.",desc:"All cats +1 Power.",fx:{allPower:1}},
  ]},
{id:"the_crowding",title:"The Crowding",icon:"🏚️",minNight:3,tag:"survival",
  textFn:(_,ctx)=>{const n=ctx.colony;return n>18?`${n} bodies. One shelter. Someone is always awake, always pressed against a wall, always one sneeze away from a fight. You built this colony to survive. You didn't build it to be comfortable. Those are different problems.`:`The shelter feels smaller every night. Not because it's shrinking — because everything inside it is growing. Louder. Braver. More alive. That's the cost of keeping them all.`;},
  choices:[
    {label:"Expand. Build outward.",desc:"+2 Shelter. -3 Rations.",fx:{eventDenBonus:true,gold:-3,fervor:1}},
    {label:"Hold tighter. Closeness is strength.",desc:"+2 Nerve.",fx:{fervor:2}},
  ]},
{id:"the_thin_colony",title:"The Thinning",icon:"💨",minNight:3,tag:"identity",
  textFn:(_,ctx)=>{const n=ctx.colony;const fallen=ctx.fallen?.length||0;return n<=14?`${n}. You keep counting. Still ${n}. Every cat that's left has outlived the odds.${fallen>0?` ${fallen} didn't. You carry their weight now — and somehow, it makes you lighter.`:""} This is what a blade feels like before it strikes.`:`The colony is lean. No passengers. Every cat who's still here earned their place by being here. That's circular logic. It's also the only logic that works in the dark.`;},
  choices:[
    {label:"We're enough. We have to be.",desc:"+4 Nerve.",fx:{fervor:4}},
    {label:"We need more. Send the call.",desc:"Gain 2 plain strays.",fx:{addStrays:2}},
  ]},
{id:"the_dream",title:"The Dream",icon:"💭",minNight:4,needsCat:"random",tag:"hope",
  textFn:(t,ctx)=>{const n=t[0]?.name.split(" ")[0]||"Someone";const fallen=ctx.fallen||[];return fallen.length>0?`${n} woke up screaming. Said they saw ${fallen[0]?.name||"the one who was lost"}. Said they were warm. Waiting somewhere past the dark. The others pretend they didn't hear. They all heard.`:`${n} woke up smiling. Said they dreamed of a place with no dark. No cold. Just sun and grass and every cat they'd ever known. They looked embarrassed. Nobody laughed.`;},
  choices:[
    {label:"Tell me more. We need this.",desc:"Cat +2 Power. +2 Nerve.",fx:{targetPower:2,fervor:2}},
    {label:"Dreams are for after. Focus.",desc:"+3 Nerve.",fx:{fervor:3}},
  ]},
{id:"the_promise",title:"The Promise",icon:"🤞",minNight:4,needsCat:"pair",tag:"belonging",
  textFn:(t,ctx)=>{const a=t[0]?.name.split(" ")[0]||"One";const b=t[1]?.name.split(" ")[0]||"Another";return`${a} and ${b} pressed their foreheads together. No words. Didn't need any. Everyone who saw it understood the same thing: whatever comes, those two face it together. The colony is stronger for having witnessed it.`;},
  choices:[
    {label:"Remember this. All of you.",desc:"Both bond. Both +2 Power.",fx:{pactBond:true,bothPower:1}},
    {label:"This is why we fight.",desc:"+3 Nerve. +2 Rations.",fx:{fervor:3,gold:2}},
  ]},

// ——— THE WATCHER (Kojima's meta-awareness event) ———
{id:"the_watcher",title:"The Watcher",icon:"👁️",minNight:4,tag:"memory",
  textFn:(_,ctx)=>{const n=ctx.colony;return`One of your cats stopped mid-step and looked up. Not at the ceiling. Past it. Like they could see through the stone to somewhere else entirely. "Something's watching us," they said. Not from the dark. From... outside. Somewhere beyond. "They've been watching the whole time." Nobody argued. Everyone felt it.`;},
  choices:[
    {label:"Then let them see us survive.",desc:"+3 Nerve. All cats +1 Power.",fx:{fervor:3,allPower:1}},
    {label:"We don't perform. We endure.",desc:"+4 Nerve.",fx:{fervor:4}},
  ]},

// ——— NIGHT 5 MANDATORY (Kojima's thesis event) ———
{id:"the_dawn_question",title:"What Was It For",icon:"🌅",minNight:5,mandatory:true,tag:"memory",
  textFn:(_,ctx)=>{const n=ctx.colony;const fallen=ctx.fallen?.length||0;const scarred=ctx.all.filter(c=>c.scarred).length;return `The last night. ${n} cats. ${scarred} carrying scars.${fallen>0?` ${fallen} name${fallen>1?"s":""} you'll carry differently.`:""} The question isn't whether you survive. The question is whether what survives is worth surviving for. You've been answering that question all along. Every hand. Every choice. Every name you remembered. Answer it one more time.`;},
  choices:[
    {label:"It was worth it. All of it.",desc:"+3 Nerve. All cats +1 Power.",fx:{fervor:3,allPower:1}},
    {label:"Ask me after dawn.",desc:"+5 Nerve.",fx:{fervor:5}},
  ]},

// ——— NIGHT 5: ARC SUMMARY (Nolan's revelation event) ———
{id:"the_record",title:"The Record",icon:"📜",minNight:5,tag:"memory",
  textFn:(_,ctx)=>{const h=ctx.eventHistory||{};const parts=[];if(h.wall_built)parts.push("The wall you built still stands.");if(h.wall_refused)parts.push("The stones you scattered are still scattered.");if(h.stranger_welcomed)parts.push("The stranger you welcomed sits closest to the fire.");if(h.stranger_rejected&&!h.stranger_redeemed)parts.push("The stranger's eyes are somewhere in the dark. Still.");if(h.fire_tended)parts.push("The fire you tended is still burning.");if(h.sickness_quarantine)parts.push("The one you quarantined survived.");if(h.sickness_spread)parts.push("The ones who stayed together are still together.");if(h.debt_paid)parts.push("The debt is paid. The dark remembers.");if(h.debt_refused)parts.push("The dark remembers what you wouldn't give.");if(h.elder_met)parts.push("The elder's marks cover the wall now.");return parts.length>0?parts.join(" ")+` That's the record. That's what this colony did.`:`${ctx.colony} cats. No record of what happened except the one you're writing right now.`;},
  choices:[
    {label:"Write it down. Someone needs to know.",desc:"+4 Nerve.",fx:{fervor:4}},
    {label:"We are the record.",desc:"All cats +1 Power. +2 Rations.",fx:{allPower:1,gold:2}},
  ]},

// ——— NIGHT 5: THE CHORUS ———
{id:"the_chorus",title:"The Chorus",icon:"🎶",minNight:4,tag:"hope",
  textFn:(_,ctx)=>`It started with one voice. Then two. Then all of them. Not a song. Not a howl. Something between that says the only thing worth saying: we are here. We are here. We are here. The dark doesn't answer. For the first time, it doesn't need to.`,
  choices:[
    {label:"Join in. Every voice counts.",desc:"Full heal. +2 Nerve. Random bond.",fx:{chorusJoin:true}},
    {label:"Listen. Witness is enough.",desc:"+4 Nerve.",fx:{fervor:4}},
  ]},

// ——— CROSS-RUN ARCS — events that remember previous colonies ———
// These check meta.stats.chronicle flags set by fx.chronicleSet

// ARC: THE SCAR KEEPER (appears after 3+ wins, requires scarred cats)
{id:"scar_keeper_1",title:"The Marking",icon:"⚔️",minNight:2,tag:"memory",needsCat:"random",
  metaRequires:s=>s.w>=3&&!s.chronicle?.scarKeeper_complete,
  metaExcludes:s=>s.chronicle?.scarKeeper_acknowledged||s.chronicle?.scarKeeper_dismissed,
  textFn:(t,ctx)=>{const n=t[0]?.name.split(" ")[0]||"Someone";const sc=t[0]?.scarred;return sc?`${n} has a scar that matches one from a colony that fell before yours. Same shape. Same place. The elder — the cat who's been here longest — says it means the memory is trying to get out.`:`${n} found markings on the wall. Claw marks. Old ones. They match a pattern no living cat could have taught. Something from before.`;},
  choices:[
    {label:"Let it mean something.",desc:"Cat +2 Power. The scars remember.",fx:{targetPower:2,chronicleSet:"scarKeeper_acknowledged"}},
    {label:"Scars are scars. Move on.",desc:"+3 Nerve.",fx:{fervor:3,chronicleSet:"scarKeeper_dismissed"}},
  ]},
{id:"scar_keeper_2",title:"The Keeper Speaks",icon:"🗺️",minNight:3,tag:"memory",
  metaRequires:s=>s.chronicle?.scarKeeper_acknowledged&&!s.chronicle?.scarKeeper_complete,
  textFn:(_,ctx)=>`The patterns are everywhere now. Scratched into stone, traced in the dirt, carved by cats who died before you were born. They're not random — they're a map. A map to the First Colony's shelter. Whatever's there has been waiting a very long time.`,
  choices:[
    {label:"Follow the map.",desc:"Reveal boss traits. +2 Nerve.",fx:{fervor:2,chronicleSet:"scarKeeper_mapped",peek:1}},
    {label:"The past stays buried.",desc:"+4 Nerve.",fx:{fervor:4}},
  ]},
{id:"scar_keeper_3",title:"The Scar's Memory",icon:"🏛️",minNight:3,tag:"memory",
  metaRequires:s=>s.chronicle?.scarKeeper_mapped&&!s.chronicle?.scarKeeper_complete,
  textFn:(_,ctx)=>`You found it. The First Colony's shelter. Collapsed, overgrown, but inside — something still warm. Not fire. Memory. The walls are covered in names. Hundreds of names. And at the bottom, space for yours.`,
  choices:[
    {label:"Write your names. Carry theirs.",desc:"All cats +2 Power. A ward left behind.",fx:{allPower:2,addWard:true,chronicleSet:"scarKeeper_complete"}},
    {label:"Seal it. This place is a grave.",desc:"+6 Nerve.",fx:{fervor:6,chronicleSet:"scarKeeper_complete"}},
  ]},

// ARC: THE HISTORIAN (appears after 9+ Hearth cats)
{id:"historian_1",title:"The Historian",icon:"📖",minNight:2,tag:"memory",
  metaRequires:s=>(s.hearthTotal||0)>=9&&!s.chronicle?.historian_complete,
  metaExcludes:s=>s.chronicle?.historian_met,
  textFn:(_,ctx)=>`An old cat. Older than old. Blind, but they move like they can see the walls from memory. "I've been counting," they say. "Colonies. Not the ones that survived. The ones that didn't. Eight. I knew their names. Do you?"`,
  choices:[
    {label:"Tell me their names.",desc:"+3 Nerve. The mythology deepens.",fx:{fervor:3,chronicleSet:"historian_met"}},
    {label:"Names don't help the living.",desc:"+4 Rations.",fx:{gold:4,chronicleSet:"historian_dismissed"}},
  ]},
{id:"historian_2",title:"The Historian's Gift",icon:"📜",minNight:3,tag:"memory",
  metaRequires:s=>s.chronicle?.historian_met&&!s.chronicle?.historian_complete,
  textFn:(_,ctx)=>`The blind cat returned. They brought something — a bundle of leaves, each one etched with a name. "Eight colonies," they whisper. "Each one learned something the next one needed. The First learned hunger. The Third learned love costs more than hate. The Eighth learned that 'almost' and 'failure' weigh the same." They hold out the bundle. "Your turn to learn."`,
  choices:[
    {label:"Take the bundle. Carry all eight.",desc:"All cats +1 Power. +3 Nerve. The weight is worth it.",fx:{allPower:1,fervor:3,chronicleSet:"historian_complete"}},
    {label:"We'll write our own lessons.",desc:"+5 Nerve.",fx:{fervor:5,chronicleSet:"historian_complete"}},
  ]},

// ARC: THE FIRE SPREADER (appears after Heat 3+ win)
{id:"fire_spreader_1",title:"The Fire That Traveled",icon:"🔥",minNight:2,tag:"hope",
  metaRequires:s=>(s.mh||0)>=3&&!s.chronicle?.fireSpreader_complete,
  metaExcludes:s=>s.chronicle?.fireSpreader_found,
  textFn:(_,ctx)=>`A fire in the distance. Not the Hearth — something further. Something that shouldn't be there. Someone carried a coal from your fire and planted it in the dark. It's still burning. You can see it from here.`,
  choices:[
    {label:"Find out who lit it.",desc:"+3 Nerve. +3 Rations.",fx:{fervor:3,gold:3,chronicleSet:"fireSpreader_found"}},
    {label:"Let it burn. Fires don't need permission.",desc:"+4 Nerve.",fx:{fervor:4,chronicleSet:"fireSpreader_ignored"}},
  ]},
{id:"fire_spreader_2",title:"The Other Colony",icon:"🏕️",minNight:3,tag:"hope",
  metaRequires:s=>s.chronicle?.fireSpreader_found&&!s.chronicle?.fireSpreader_complete,
  textFn:(_,ctx)=>`They're real. A tenth colony — tiny, fragile, impossible. Three cats huddled around a coal that came from your Hearth. They look at you the way you looked at the dark on your first night. There was never supposed to be a tenth. But here it is.`,
  choices:[
    {label:"Give them what they need.",desc:"-4 Rations. +6 Nerve. A new colony survives.",fx:{gold:-4,fervor:6,chronicleSet:"fireSpreader_complete"}},
    {label:"They'll have to earn it. Like you did.",desc:"+4 Nerve. They watch you leave.",fx:{fervor:4,chronicleSet:"fireSpreader_complete"}},
  ]},
];


// ════════════════════════════════════════════════════
// BOSS REWARDS - each threat leaves something behind
// ════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════
// BOSS REWARDS — pick 1 of 3. Every choice costs something else.
// Pool is large enough to avoid repetition. Night-gated for pacing.
// ═══════════════════════════════════════════════════
const BOSS_REWARDS=[
  // --- ECONOMY ---
  {id:"br_rations",name:"What They Left Behind",desc:"+8 Rations",icon:"🐟",type:"gold",value:8},
  {id:"br_bounty",name:"The Bounty",desc:"+5 Rations, +1 Nerve",icon:"🐟",type:"gold_nerve",value:5},
  {id:"br_tithe",name:"The Tithe",desc:"+12 Rations, worst cat lost",icon:"💰",type:"gold_sacrifice",value:12,minNight:3},
  // --- HANDS / DISCARDS ---
  {id:"br_hands",name:"Earned Ground",desc:"+1 Hand per round (this run)",icon:"✊",type:"hands",value:1},
  {id:"br_discs",name:"Quick Reflexes",desc:"+2 Free Recruits per round (this run)",icon:"📣",type:"freeRecruits",value:2},
  {id:"br_both",name:"Battle Rhythm",desc:"+1 Hand, +2 Free Recruits next night",icon:"⚡",type:"temp_both"},
  // --- POWER ---
  {id:"br_power",name:"They Remember",desc:"All cats +1 Power",icon:"⭐",type:"power",value:1},
  {id:"br_elite",name:"The Strongest Survives",desc:"Best cat +3 Power, weakest -1",icon:"💪",type:"elite_power",minNight:2},
  {id:"br_surge",name:"Adrenaline Surge",desc:"All cats +2 Power, -1 Power next night",icon:"🔺",type:"surge",minNight:3},
  // --- TRAITS ---
  {id:"br_trait",name:"Her Locket",desc:"Best cat gains a rare trait",icon:"💎",type:"trait"},
  {id:"br_common_trait",name:"Hard Lessons",desc:"3 Plain cats gain random common traits",icon:"📚",type:"mass_trait"},
  {id:"br_xp",name:"Forged in Battle",desc:"All cats +1 Power",icon:"★",type:"power_all"},
  // --- DECK ---
  {id:"br_thin",name:"Cleared Path",desc:"Remove 3 weakest cats",icon:"🗑️",type:"thin",value:3},
  {id:"br_recruit",name:"Fresh Blood",desc:"Gain 2 cats with traits",icon:"🐱",type:"recruit",minNight:2},
  {id:"br_shelter",name:"Deeper Ground",desc:"+1 Shelter slot (permanent)",icon:"🏠",type:"shelter"},
  // --- NERVE ---
  {id:"br_nerve",name:"Defiance",desc:"+3 Nerve",icon:"🔥",type:"nerve",value:3},
  {id:"br_nerve_lock",name:"Unbreakable",desc:"+4 Nerve",icon:"🛡️",type:"nerve_surge",minNight:3},
  // --- WARDS ---
  {id:"br_ward",name:"The Relic",desc:"Gain a random ward",icon:"🔮",type:"ward"},
  // --- HEALING ---
  {id:"br_heal",name:"The Respite",desc:"All cats fully heal. Den safe.",icon:"🌿",type:"heal_safe"},
  // --- DARK / HIGH-RISK ---
  {id:"br_gamble",name:"Double or Nothing",desc:"Random: +10 Rations or lose half",icon:"🎲",type:"gamble",minNight:2},
  {id:"br_blood",name:"Blood Price",desc:"Strongest cat scarred. All others +2 Power.",icon:"🩸",type:"blood_price",minNight:3},
];
function pickBossRewards(currentAnte,prevIds=[]){
  const pool=BOSS_REWARDS.filter(r=>(!r.minNight||currentAnte>=r.minNight)&&!prevIds.includes(r.id));
  return shuf([...pool]).slice(0,3);
}

// ════════════════════════════════════════════════════
// ════════════════════════════════════════════════════
// These bosses join the rotation pool after 3+ wins. Each is the death-pattern of a colony.
const EXPANDED_BOSSES=[
  {id:"fraying",name:"The Fraying",icon:"🕸️",
    taunt:"I'm already inside. I always have been.",
    tauntFn:(ctx)=>ctx.bonded>3&&ctx.grudges>0?"Love and hate in the same den. I don't even have to try."
      :ctx.grudges>0?`They resent each other. I can taste it.`
      :"No grudges? Give it time. I'm patient.",
    defeat:"You held it together. The Fifth Colony said the same thing on Night 3.",
    defeatFn:(ctx)=>ctx.clutch?"Held together by a thread. I know what threads do."
      :"You healed what I infected. Impressive. Temporary.",
    lore:"The colony that ate itself."},
  {id:"eclipse",name:"The Eclipse",icon:"🌑",
    taunt:"You've fought so hard. Isn't it time to rest?",
    tauntFn:(ctx)=>ctx.fallen>2?"You've lost so many. Why keep going? For what?"
      :ctx.colony<12?"So few of you. You've done enough. It's okay."
      :"All that nerve. All that fire. Aren't you tired?",
    defeat:"Fine. Burn. But fire always goes out eventually.",
    defeatFn:(ctx)=>ctx.clutch?"You almost let go. You wanted to. I felt it."
      :"Still burning. The Sixth Colony burned too. Until they didn't.",
    lore:"The fire went out and no one relit it."},
  {id:"ember",name:"The Ember That Remains",icon:"🔥",
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

const BOSS_TRAITS=[
  {id:"armored",name:"Armored",icon:"🛡️",desc:"+20% threshold",flavor:"It remembers how to protect itself.",fx:{tgtMult:1.2}},
  {id:"watchful",name:"Watchful",icon:"👁️",desc:"Strength meter disabled",flavor:"It knows what you're holding.",fx:{noStrength:true}},
  {id:"sealed",name:"Sealed",icon:"🔒",desc:"Ward abilities blocked",flavor:"Your tricks won't work.",fx:{sealed:true}},
  {id:"bleeding",name:"Bleeding",icon:"🩸",desc:"Threshold −2% per hand played",flavor:"It weakens, but will you last?",fx:{bleeding:true}},
  {id:"frozen",name:"Frozen",icon:"🧊",desc:"First 2 cats score half power",flavor:"The cold takes the first ones.",fx:{frozen:true}},
  {id:"enraged",name:"Enraged",icon:"🔥",desc:"Threshold −15%, all cats +3 mult",flavor:"It fights harder. So do you.",fx:{tgtMult:0.85,enragedMult:3}},
  {id:"fading",name:"Fading",icon:"🕯️",desc:"Threshold +5% per hand remaining",flavor:"It grows stronger as time runs out.",fx:{fading:true}},
  {id:"marked",name:"Marked",icon:"🪞",desc:"One cat scarred before the fight",flavor:"The dark reached in and chose one.",fx:{marked:true}},
  {id:"bloodied",name:"Bloodied",icon:"🩹",desc:"Every failed hand scars a random cat",flavor:"Each mistake leaves a permanent mark.",fx:{bloodied:true}},
];

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

const HEAT_FLAVOR=[
  "",
  "The fire remembers.",
  "They're sending you instead of an army.",
  "The dark noticed.",
  "Everything you've built burns in your defense.",
  "Ninth life. Last light. No mercy.",
];

const HEAT_RELICS=[
  null, // index 0 unused
  {heat:1,icon:"🕯️",name:"First Flame",desc:"Colony events offer +1 choice",flavor:"The first light anyone carried out of the dark."},
  {heat:2,icon:"⚔️",name:"Old Scars",desc:"Scarred cats start with +1 Power",flavor:"What doesn't kill them makes everyone remember."},
  {heat:3,icon:"👁️",name:"The Vigil",desc:"Boss intros reveal their weakness",flavor:"They watched the dark long enough to learn its patterns."},
  {heat:4,icon:"🌟",name:"Ninth Star",desc:"Hearth descendants start with +1 Power",flavor:"The bloodline strengthens."},
  {heat:5,icon:"🔥",name:"Undying Flame",desc:"Start every run with +1 Nerve",flavor:"The last thing the dark expected: someone who came back angrier."},
];

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

const THE_REMEMBERING={
  name:"The Remembering",icon:"🌅",
  taunt:"I am everyone you saved and everyone you lost. Do you know why you're here?",
  tauntFn:(ctx)=>"I am the First Colony's hunger and the Eighth Colony's last hand. I am the fire that went out and the fire that didn't.",
  defeat:"Not because you're strong. Because you remember.",
  defeatFn:(ctx)=>ctx.clutch?"By that much. Of course. It's always by that much. But you remembered."
    :"They will remember this colony. They will have to. Because you remembered all the rest.",
  lore:"The last question is not 'did you survive.' It is 'did you remember.'",
};

function canUnlockNinthDawn(meta){
  if(!meta)return false;
  const w=meta.stats.w||0,h=Math.max(meta.heat||0,meta.stats.mh||0),cats=meta.cats?.length||0;
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
  "Eight colonies fell. This one doesn't have to.",
  "The dark doesn't hate you. It doesn't know you're there. Yet.",
  "What do you call the thing that keeps burning after everything else goes out?",
  "They didn't win because they were the strongest. They won because they didn't stop.",
  "Somewhere behind the dark, the dawn is keeping score.",
  "A colony is just a word for people who refuse to die alone.",
  "The first colony starved. The second fought. The third loved too much. You get one more try.",
  "Not all fires go out. Some of them become Hearths.",
];
function getEpigraph(meta){
  if(!meta||meta.stats.r===0)return pk(EPIGRAPHS);
  const w=meta.stats.w||0,r=meta.stats.r||0,h=meta.heat||0,cats=meta.cats?.length||0;
  const br=meta.stats.bossRecord||{};
  const totalBossWins=Object.values(br).reduce((s,b)=>s+(b.w||0),0);
  // Ninth Dawn unlocked
  if(w>=1&&h>=3&&cats>=9&&BK.every(b=>(meta.stats.disc||[]).some(d=>d.startsWith(b)))&&(meta.achv||[]).length>=3){
    if(meta.ninthDawnCleared)return "Nine colonies. One survived. Not because it was the strongest. Because someone remembered all the rest.";
    return "The Hearth is bright enough to see by now. Something is coming. Not from the dark. From the light.";
  }
  if(totalBossWins>=20&&w>=10)return pk(["You've been doing this longer than most colonies survived.","The dark tells stories about you now. It doesn't like the endings."]);
  if(br.forgetting?.w>=3)return "The Forgetting tried. You said their names anyway.";
  if(cats>=15)return "The Hearth is full of cats with scars. Not injuries — stories.";
  if((meta.stats.grudgesResolved||0)>=10)return "They fought. They forgave. They fought harder.";
  if(h>=3&&w>=6)return "They said it couldn't burn this bright.";
  if(w>=10)return "You are what the colonies were for.";
  if(r>=6)return "The dark has learned to flinch.";
  if(w>=4)return "They're starting to tell stories about you.";
  if(w>=2)return "The Hearth burns a little brighter.";
  if(r>=3&&w===0)return pk(["The dark keeps winning. But you keep coming back.","Three attempts. Zero victories. The stubborn survive longer than the strong."]);
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
  "VI. WHAT THE DARK LEARNED",
  "VII. THE ONES WHO STAYED",
  "VIII. WHAT BURNS LONGER",
  "IX. THE LAST NAME",
];

// 30% chance to fire. Context-sensitive. Reference the eight fallen colonies.
const WHISPER_OVERFLOW={
  crush:[ // scored 200%+ of target
    "None of the eight ever scored like that.",
    "The dark flinched. It doesn't do that often.",
    "The fourth colony never hit this hard. They still fell.",
  ],
  scrape:[ // scored 100-130% of target
    "The eighth colony made it this far too.",
    "Close. The third colony lost their nerve here. Don't.",
    "Enough. Barely. The first colony said the same thing.",
  ],
  boss:[ // after beating a boss
    "One more echo silenced. Eight to remember.",
    "The dark sent what killed the others. You're still here.",
    "Every boss is a colony that died. You just survived their death.",
  ],
};
const WHISPER_SHOP=[
  "The first colony had perfect walls. No food. Choose differently.",
  "The sixth colony stopped buying. Stopped trying. Don't stop.",
  "Every ration spent is a bet that tomorrow matters.",
  "The second colony fought over what the market offered. You get to choose.",
  "The fifth colony couldn't agree on what to buy. Then they couldn't agree on anything.",
  "Shop carefully. The eighth colony had one more hand's worth of rations. It wasn't enough.",
];
const WHISPER_DEN={
  birth:[ // baby born
    "The fourth colony never got this far. New life.",
    "Eight colonies. How many had time for kittens? Not enough.",
    "Born into the dark. But born.",
  ],
  death:[ // cat died
    "Every colony lost someone in the dark. Now you know how.",
    "The third colony tried to save everyone. This is why she couldn't.",
    "A name becomes a memory. A memory becomes a reason.",
  ],
  bond:[ // cats bonded
    "The fifth colony forgot what this felt like.",
    "Connection is expensive. The first colony learned that. So did the third.",
    "The dark doesn't understand bonds. That's why it fears them.",
  ],
  conflict:[ // fight or grudge
    "The fifth colony turned on itself. You can hear the echo.",
    "The seventh colony forgot who they were. Grudges speed that up.",
    "Internal war. The dark doesn't have to break in if you do it for them.",
  ],
};
const WHISPER_NIGHT=[ // contextual night card additions
  null, // Night 1: no whisper (cold open just happened)
  (ctx)=>ctx.fallen>0?`The second colony lost ${ctx.fallen===1?"one":"several"} on Night 2. History rhymes.`:"Eight colonies faced a second night. Seven made it. Barely.",
  (ctx)=>ctx.colony<12?"Getting smaller. The third colony got smaller too. She couldn't stop it.":"All of them, still. The eighth colony said the same thing. On Night 3.",
  (ctx)=>ctx.fallen===0?"All of them. Still. The eighth colony was whole on Night 4 too.":"You've made the choices she couldn't. The Mother would understand.",
  (_)=>"The last night. Eight colonies never saw this. You're already further than most.",
  (_)=>"Six nights. No colony has ever lasted this long.",
  (_)=>"Seven nights in the dark. Whatever you're doing, it's working.",
  (_)=>"The eighth colony fell one hand short. You've had eight nights of hands.",
  (_)=>"Nine nights. Nine colonies. This was always the number.",
];
const NIGHT_SUB=[
  "Count them. Remember the number.",
  "Everything you save costs something else.",
  "Say their names. Then keep going.",
  "You are the sum of every choice.",
  "Answer the question. Then answer it again.",
  "It adapted. So did you.",
  "Not the strongest. The ones who refused to leave.",
  "Longer than hunger. Longer than fear.",
  "Write it. Before the dark does.",
];

// ★ SCORE REACTIONS - escalating hype + ★ v34: narrator voice
const SCORE_TIERS=[{min:0,label:"",color:"",sub:"",nar:""},{min:1200,label:"Alive",color:"#b8956a",sub:"",nar:"Still here."},{min:4500,label:"Defiant",color:"#b85c2c",sub:"they felt that one",nar:"They won't forget this hand."},{min:12000,label:"ROARING",color:"#f59e0b",sub:"the ground shakes",nar:"The dark is listening now."},{min:35000,label:"UNSTOPPABLE",color:"#fbbf24",sub:"nothing can touch them",nar:"This is what a colony looks like."},{min:100000,label:"LEGENDARY",color:"#fef08a",sub:"they will tell stories about this",nar:"Write it down. Someone needs to know."},{min:350000,label:"NINTH LIFE",color:"#ffffffdd",sub:"the dark blinks first",nar:"Nine lives. Nine colonies. This is the one."}];
function getScoreTier(s){let t=SCORE_TIERS[0];for(const tier of SCORE_TIERS)if(s>=tier.min)t=tier;return t;}
function getShakeIntensity(s){if(s<1500)return 0;if(s<6000)return 1;if(s<15000)return 2;if(s<45000)return 3;return 5;}
let _nis=0;const _un=new Set();
function gN(br,trait){
  const tName=trait&&trait.name&&trait.name!=="Plain"?trait.name:null;
  const pool=[...CAT_NAMES];
  if(SEASON_NAMES[br])pool.push(...SEASON_NAMES[br],...SEASON_NAMES[br]);
  if(tName&&TRAIT_NAMES[tName])pool.push(...TRAIT_NAMES[tName],...TRAIT_NAMES[tName],...TRAIT_NAMES[tName]);
  const shuffled=pool.sort(()=>Math.random()-0.5);
  let n=shuffled.find(x=>!_un.has(x));
  if(!n)n=shuffled[0];
  _un.add(n);
  // Titles: rare traits get grander titles, others get seasonal (30% chance)
  if(tName&&Math.random()<.30){
    const rareTitles=TITL_RARE[tName];
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
  const defaultTrait=o.trait||pickTrait(false)||PLAIN;
  const cat={id:uid(),breed:br,power:o.power||(Math.floor(Math.random()*6)+1),
    trait:defaultTrait,extraTraits:o.extraTraits||[],name:o.name||gN(br,defaultTrait),
    sex:o.sex||(Math.random()<.5?"M":"F"),
    parentBreeds:o.parentBreeds||null,
    parentIds:o.parentIds||null,
    quirk:o.quirk||pk(QUIRKS[o.breed||br]||QUIRKS.Autumn),
    scarred:o.scarred||false, injured:o.injured||false, bondedTo:o.bondedTo||null,
    grudgedWith:o.grudgedWith||[],
    story:o.story||[],
    stats:o.stats||{tp:0,ts:0,bs:0,bh:""}};
  return cat;
}

function breedC(p1,p2){
  let br=Math.random()<.08?pk(BK):(Math.random()<.5?p1.breed:p2.breed);
  const parentAvg=(p1.power+p2.power)/2;
  let pw=3;
  if(Math.random()<0.60)pw++; // 60% → P4
  if(Math.random()<0.40)pw++; // 40% → P5
  const exceedChance=Math.max(0,Math.min(0.50,(parentAvg-4)*0.10));
  if(pw>=5&&Math.random()<exceedChance){
    const r=Math.random();
    pw=r<0.70?6:r<0.95?7:8; // P6 70%, P7 25%, P8 5%
  }
  pw=Math.min(8,pw); // hard cap: P9+ earned through gameplay only
  let tr=PLAIN;
  const p1Traits=catAllTraits(p1),p2Traits=catAllTraits(p2);
  const parentTraits=[...p1Traits,...p2Traits].filter(t=>t.name!=="Plain");
  // Step 1: 60% inherit parent trait directly
  if(parentTraits.length>0&&Math.random()<0.6){
    tr=pk(parentTraits);
  }
  // Step 2: 8% mutation — tier-gated
  if(Math.random()<0.08){
    tr=pickBreedInheritTrait(p1,p2);
  }
  // Step 3: 9% UPBREED — independent roll, can override to higher tier
  const t1=(p1.trait||PLAIN).tier||"plain",t2=(p2.trait||PLAIN).tier||"plain";
  const tiers=[t1,t2].map(t=>t==="mythic"?4:t==="legendary"?3:t==="rare"||t==="rare_neg"?2:t==="common"?1:0);
  const minTier=Math.min(...tiers),maxTier=Math.max(...tiers);
  if(Math.random()<0.09){
    // 2 Legendary → Mythic upbreed
    if(minTier>=3){tr=pk(MYTHIC_TRAITS);}
    // 2 Rare (or 1 Leg + 1 Rare) → Legendary upbreed
    else if(minTier>=2){tr=pk(LEGENDARY_TRAITS);}
    // 1 Legendary + 1 Common → half chance Legendary
    else if(maxTier>=3&&Math.random()<0.33){tr=pk(LEGENDARY_TRAITS);}
    // 1 Rare + 1 Common → no upbreed (Rare comes from inheritance)
    // Both Common → no upbreed
  }
  const pBreeds=(p1.breed!==p2.breed)?[p1.breed,p2.breed]:null;
  return gC({breed:br,power:pw,trait:tr,parentBreeds:pBreeds,
    parentIds:[p1.id,p2.id],
    sex:Math.random()<.5?"M":"F",
    stats:{tp:0,ts:0,bs:0,bh:"",par:`${p1.name.split(" ")[0]} & ${p2.name.split(" ")[0]}`}});
}

// ★ DEN AFFINITY: Calculates what happens between two cats overnight
function calcAffinity(c1,c2,ctx={}){
  let breedCh=0,fightCh=0;
  const oppSex=c1.sex!==c2.sex;
  if(oppSex)breedCh=30;
  // Incest prevention
  const isParentChild=c1.parentIds?.includes(c2.id)||c2.parentIds?.includes(c1.id);
  const isSibling=c1.parentIds&&c2.parentIds&&c1.parentIds.some(p=>c2.parentIds.includes(p));
  if(isParentChild||isSibling)breedCh=0;
  const b1=c1.breed,b2=c2.breed;
  const personalBond=(c1.bondedTo===c2.id||c2.bondedTo===c1.id);
  if(personalBond){breedCh+=15;fightCh=Math.max(0,fightCh-3);}
  const hasGrudgeFlag=hasGrudge(c1,c2);
  if(hasGrudgeFlag){fightCh+=12;}
  if(b1===b2){breedCh+=15;fightCh+=5;} // same breed familiarity + territorial

  [c1,c2].forEach(c=>{
    if(catHas(c,"Scrapper"))fightCh+=5;
    if(catHas(c,"Cursed"))fightCh+=8;
    if(catHas(c,"Alpha"))fightCh+=4;
    if(catHas(c,"Guardian"))fightCh-=3;
    if(catHas(c,"Devoted")&&c.bondedTo)breedCh+=10;
  });
  if(!oppSex)breedCh=0;
  if(isParentChild||isSibling)breedCh=0;

  const denSize=ctx.denSize||2;
  if(oppSex)breedCh+=Math.max(0,(denSize-2)*2);

  const nerveLvl=ctx.nerveLvl||0;
  if(nerveLvl>=4){
    const nerveExcess=nerveLvl-3;
    fightCh+=nerveExcess*2;
    breedCh-=nerveExcess*2;
  }

  const sameBreedCount=ctx.sameBreedCount||0;
  if(b1===b2&&sameBreedCount>2){
    fightCh+=(sameBreedCount-2)*4;
  }

  const springBoost=ctx.breedBoost||0; // from Spring devotion milestone
  const breedCap=springBoost>0?100:75;

  return{breedCh:clamp(breedCh,0,breedCap),fightCh:clamp(fightCh,0,70)};
}

function resolveDen(denCats,hasMatchmaker,denSafe,heatDenFight,ctx={}){
  if(denCats.length<2)return[];
  const results=[];const paired=new Set();
  const deckSize=ctx.deckSize||18;let deaths=0;
  const cats=shuf([...denCats]);
  const breedOnly=ctx.breedOnly||false;
  const noBreed=ctx.noBreed||false;
  const breedCensus={};cats.forEach(c=>{breedCensus[c.breed]=(breedCensus[c.breed]||0)+1;});
  const minEvents=Math.max(1,Math.floor(cats.length/2));
  const maxEvents=cats.length;
  const baseEvents=breedOnly?minEvents:Math.min(maxEvents,2+Math.floor(Math.random()*2));
  let bonusEvents=0;
  if(breedOnly){
    for(let e=0;e<Math.max(0,cats.length-2);e++){if(Math.random()<0.15)bonusEvents++;}
  }else{
    for(let e=0;e<Math.max(0,cats.length-4);e++){if(Math.random()<0.10)bonusEvents++;}
  }
  const targetEvents=Math.min(maxEvents,Math.max(minEvents,baseEvents+bonusEvents));

  // Pass 1: Pair-based events (existing affinity logic)
  for(let i=0;i<cats.length;i++){
    if(paired.has(cats[i].id))continue;
    if(results.length>=targetEvents)break;
    for(let j=i+1;j<cats.length;j++){
      if(paired.has(cats[j].id))continue;
      const sameBreed=cats[i].breed===cats[j].breed?breedCensus[cats[i].breed]||0:0;
      const a=calcAffinity(cats[i],cats[j],{nerveLvl:ctx.nerveLvl||0,sameBreedCount:sameBreed,denSize:cats.length,breedBoost:ctx.breedBoost||0});
      const denRisk=Math.max(0,Math.round((denCats.length-2)*0.32));
      a.fightCh=Math.min(70,a.fightCh+denRisk+(heatDenFight||0));
      let bCh=a.breedCh;if(hasMatchmaker)bCh=Math.min(100,bCh+10);
      if(breedOnly)bCh=Math.min(100,bCh+15);
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
          loser.power=Math.max(1,loser.power-3);loser.scarred=true;loser.injured=true;loser.injuryTimer=2;
          results.push({type:"fight",c1:cats[i],c2:cats[j],loser,dmg:3,wasInjured:true});
        }else if(severity<0.40){
          if(loser.scarred){loser.injured=true;loser.injuryTimer=2;loser.power=Math.max(1,loser.power-3);results.push({type:"fight",c1:cats[i],c2:cats[j],loser,dmg:3,wasInjured:true});}
          else{loser.power=Math.max(1,loser.power-2);loser.scarred=true;results.push({type:"fight",c1:cats[i],c2:cats[j],loser,dmg:2});}
        }else{
          if(loser.scarred){loser.injured=true;loser.injuryTimer=2;loser.power=Math.max(1,loser.power-2);results.push({type:"fight",c1:cats[i],c2:cats[j],loser,dmg:2,wasInjured:true});}
          else{loser.power=Math.max(1,loser.power-1);loser.scarred=true;results.push({type:"fight",c1:cats[i],c2:cats[j],loser,dmg:1});}
        }
        paired.add(cats[i].id);paired.add(cats[j].id);break;
      }
      else if(breedOnly){
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
        const elder=cats[i].stats.tp>=6?cats[i]:cats[j].stats.tp>=6?cats[j]:null;
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
        else if(ev<0.78&&!hasGrudge(cats[i],cats[j])){
          addGrudge(cats[i],cats[j].id);addGrudge(cats[j],cats[i].id);
          results.push({type:"grudge",c1:cats[i],c2:cats[j]});
        }
        else if(ev<0.88&&hasGrudge(cats[i],cats[j])){
          removeGrudge(cats[i],cats[j].id);removeGrudge(cats[j],cats[i].id);
          // ★ Wilds: reconcile only, no bonding (bonding is shelter-only)
          results.push({type:"reconcile",c1:cats[i],c2:cats[j]});
        }
        // ★ Power surge — rare wild event. The wilds forge strength.
        else if(ev<0.93){
          const candidate=Math.random()<0.5?cats[i]:cats[j];
          candidate.power=Math.min(15,candidate.power+2);
          results.push({type:"growth",cat:candidate});
        }
        else{const rjBreed=ctx.draftRejects&&ctx.draftRejects.length>0&&Math.random()<0.6?pk(ctx.draftRejects):null;const w=gC(rjBreed?{breed:rjBreed,trait:PLAIN}:{trait:PLAIN});results.push({type:"wanderer",cat:w});}
        paired.add(cats[i].id);paired.add(cats[j].id);break;
      }
    }
  }
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
    else if(breedOnly&&pool.length>=2&&ev<0.80){
      // ★ Bonding only in shelter fill loop
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
  if(!cats.length)return{type:HT[0],idx:0,combo:null};
  // ★ Use getCatBreeds for breed counting
  const bc={};
  cats.forEach(c=>{getCatBreeds(c).forEach(b=>{bc[b]=(bc[b]||0)+1;});});
  const mBC=Math.max(0,...Object.values(bc)),pairs=Object.values(bc).filter(c=>c>=2).length;
  const bcVals=Object.values(bc).sort((a,b)=>b-a);
  const tc={};cats.forEach(c=>{catAllTraits(c).forEach(t=>{tc[t.name]=(tc[t.name]||0)+1;});});const mTC=Math.max(0,...Object.values(tc));

  // ★ POWER COMBO detection — track which specific cats form the combo
  const pows=[...new Set(cats.map(c=>c.power))].sort((a,b)=>a-b);
  let maxSeq=1,curSeq=1,seqStart=0,bestSeqStart=0,bestSeqLen=1;
  for(let i=1;i<pows.length;i++){if(pows[i]===pows[i-1]+1){curSeq++;if(curSeq>maxSeq){maxSeq=curSeq;bestSeqStart=seqStart;bestSeqLen=curSeq;}}else{curSeq=1;seqStart=i;}}
  const pc={};cats.forEach((c,ci)=>{if(!pc[c.power])pc[c.power]={n:0,idxs:[]};pc[c.power].n++;pc[c.power].idxs.push(ci);});
  const mPC=Math.max(0,...Object.values(pc).map(v=>v.n));
  // Helpers to get specific cat indices for each combo type
  const getSeqIdxs=(len)=>{const sp=pows.slice(bestSeqStart,bestSeqStart+len);return sp.flatMap(p=>pc[p]?[pc[p].idxs[0]]:[]);};
  const getSameIdxs=(n)=>{const best=Object.values(pc).sort((a,b)=>b.n-a.n)[0];return best?best.idxs.slice(0,n):[];};
  const getFullHouseIdxs=()=>{const s=Object.values(pc).sort((a,b)=>b.n-a.n);return s.length>=2&&s[0].n>=3&&s[1].n>=2?[...s[0].idxs.slice(0,3),...s[1].idxs.slice(0,2)]:[];};
  const getTwoPairIdxs=()=>{const ps=Object.values(pc).filter(v=>v.n>=2).sort((a,b)=>b.n-a.n);return ps.length>=2?[...ps[0].idxs.slice(0,2),...ps[1].idxs.slice(0,2)]:[];};

  // Find best power combo — check strongest first, track involved cats
  let combo=null,comboIdxs=[];
  const pcVals=Object.values(pc).map(v=>v.n).sort((a,b)=>b-a);
  const pairCount=pcVals.filter(v=>v>=2).length;
  const hasFullHouse=pcVals[0]>=3&&pcVals.length>=2&&pcVals[1]>=2;
  for(let i=POWER_COMBOS.length-1;i>=0;i--){
    const p=POWER_COMBOS[i];
    if(p.name==="Quintuplets"&&mPC>=5){combo=p;comboIdxs=getSameIdxs(5);break;}
    if(p.name==="Nine Lives"&&maxSeq>=5){combo=p;comboIdxs=getSeqIdxs(5);break;}
    if(p.name==="Mirrors"&&mPC>=4){combo=p;comboIdxs=getSameIdxs(4);break;}
    if(p.name==="Stalk"&&maxSeq>=4){combo=p;comboIdxs=getSeqIdxs(4);break;}
    if(p.name==="Full House"&&hasFullHouse){combo=p;comboIdxs=getFullHouseIdxs();break;}
    if(p.name==="Triplets"&&mPC>=3){combo=p;comboIdxs=getSameIdxs(3);break;}
    if(p.name==="Prowl"&&maxSeq>=3){combo=p;comboIdxs=getSeqIdxs(3);break;}
    if(p.name==="Two Pair"&&pairCount>=2){combo=p;comboIdxs=getTwoPairIdxs();break;}
    if(p.name==="Twins"&&mPC>=2){combo=p;comboIdxs=getSameIdxs(2);break;}
  }

  // ★ PRIMARY HAND — season-based. Track which cats form the hand.
  let primary,idx,handIdxs=[];
  // Helper: get indices of cats matching a breed
  const breedIdxs=(breed,n)=>cats.map((c,i)=>getCatBreeds(c).includes(breed)?i:-1).filter(i=>i>=0).slice(0,n);
  // Find the dominant breed
  const bestBreed=Object.entries(bc).sort(([,a],[,b])=>b-a)[0]?.[0];
  const secondBreed=Object.entries(bc).sort(([,a],[,b])=>b-a)[1]?.[0];

  if(cats.length>=5&&mBC>=5){primary=HT[7];idx=7;handIdxs=breedIdxs(bestBreed,5);} // Litter
  else if(mBC>=4){primary=HT[6];idx=6;handIdxs=breedIdxs(bestBreed,4);} // Colony
  else if(bcVals[0]>=3&&bcVals.length>=2&&bcVals[1]>=2){primary=HT[5];idx=5;handIdxs=[...breedIdxs(bestBreed,3),...breedIdxs(secondBreed,2)];} // Full Den
  else if(mTC>=3&&cats.length>=3){primary=HT[4];idx=4;
    // Kindred: find which trait is shared by 3+
    const sharedTrait=Object.entries(tc).find(([,v])=>v>=3)?.[0];
    handIdxs=sharedTrait?cats.map((c,i)=>catAllTraits(c).some(t=>t.name===sharedTrait)?i:-1).filter(i=>i>=0):cats.map((_,i)=>i);
  }
  else if(mBC>=3){primary=HT[3];idx=3;handIdxs=breedIdxs(bestBreed,3);} // Clowder
  else if(pairs>=2){primary=HT[2];idx=2;
    // Two Kin: get 2 cats from each of the two paired breeds
    const pairedBreeds=Object.entries(bc).filter(([,v])=>v>=2).map(([b])=>b).slice(0,2);
    handIdxs=[...breedIdxs(pairedBreeds[0],2),...(pairedBreeds[1]?breedIdxs(pairedBreeds[1],2):[])];
  }
  else if(mBC>=2){primary=HT[1];idx=1;handIdxs=breedIdxs(bestBreed,2);} // Kin
  // ★ If no season match but power combo exists, power combo IS the primary
  else if(combo){primary={name:combo.name,base:combo.standalone,ex:combo.ex,hidden:true};idx=-1;return{type:primary,idx,combo:null,comboIdxs:[],handIdxs:comboIdxs};}
  else{primary=HT[0];idx=0;handIdxs=[0];} // Stray

  return{type:primary,idx,combo,comboIdxs,handIdxs};
}

// ═══════════════════════════════════════════════════════════════
// ★ SCORING ENGINE (with chemistry + expanded traits)
// ═══════════════════════════════════════════════════════════════
function calcScore(cats,fams,fLvl,cfx={},ctx={}){
  const{type,combo,comboIdxs,handIdxs}=evalH(cats);
  // ★ Hand type leveling — use scaled base values
  const htLv=getHtLevel(type.name,ctx.htLevels||{});
  const scaledBase=getHtScaled(type,htLv);
  let chips=scaledBase.c,mult=scaledBase.m;
  const lvLabel=htLv>1?` Lv${htLv}`:"";
  const bd=[{label:type.name+lvLabel,chips:scaledBase.c,mult:scaledBase.m,type:"hand",catIdxs:handIdxs}];
  let resonance=false;
  if(combo){
    const comboCats=comboIdxs.map(i=>cats[i]).filter(Boolean);
    if(comboCats.length>=2){
      const seasons=comboCats.map(c=>c.breed);
      resonance=seasons.every(s=>s===seasons[0]);
    }
    const comboBoostUp=ctx.comboBoost||0;
    const resMult=(resonance?1.5:1)*(1+comboBoostUp);
    const bc=Math.round(combo.bonus.c*resMult);
    const bm=Math.round(combo.bonus.m*resMult);
    chips+=bc;mult+=bm;
    bd.push({label:`⚡ ${combo.name}${resonance?" ✦":""}`,chips:bc,mult:bm,type:"combo",catIdxs:comboIdxs});
    if(resonance)bd.push({label:"✦ Resonance — season match bonus",chips:0,mult:0,type:"resonance"});
  }
  const btFxAll=ctx.bossTraitFx||[];
  if(btFxAll.length>0){btFxAll.forEach(bt=>{
    if(bt.fx.frozen)bd.push({label:`🧊 Frozen: first 2 cats score at half power`,chips:0,mult:0,type:"boss_trait"});
    if(bt.fx.enragedMult)bd.push({label:`🔥 Enraged: all cats +${bt.fx.enragedMult}M`,chips:0,mult:0,type:"boss_trait"});
  });}

  const {gold:pGold=0,deckSize=18,discSize=0}=ctx;
  const devFx=getAllDevotionFx(ctx.devotion||{});
  // ★ Devotion: chip scaling applies to hand type base
  if(devFx.chipScale>0){const bonus=Math.round(scaledBase.c*devFx.chipScale);chips+=bonus;bd.push({label:`☀️ Wildfire +${bonus}C`,chips:bonus,mult:0,type:"devotion"});}
  const powers=cats.map(c=>c.power);const maxP=Math.max(...powers);const minP=Math.min(...powers);
  const uniqueBreeds=new Set(cats.flatMap(c=>getCatBreeds(c))).size;
  const toS=[];
  cats.forEach((c,ci)=>{
    c._ci=ci;
    toS.push(c);
    if(!cfx.noTraits){
      if(catHas(c,"Echo"))toS.push({...c,_re:true,_halfPow:true,_ci:ci});
      if(catHas(c,"Eternal"))toS.push({...c,_re:true,_ci:ci});
    }
  });

  const btFx=ctx.bossTraitFx||[];
  const hasFrozen=btFx.some(bt=>bt.fx.frozen);
  const enragedBT=btFx.find(bt=>bt.fx.enragedMult);

  // ★ DOPAMINE FIX: Collapsed into ONE step per cat (Balatro-style: each card fires ONCE)
  toS.forEach((c,si)=>{
    const isKit=catIsKitten(c)&&!c._re;
    const exiled=cfx.exileBreed&&c.breed===cfx.exileBreed;
    let basePow=isKit?1:(c._halfPow?Math.max(2,Math.floor(c.power/2)):(c.injured&&!c._re?Math.floor(c.power/2):c.power));
    if(!isKit&&hasFrozen&&!c._re&&c._ci<2)basePow=Math.max(2,Math.floor(basePow/2));
    let cc=exiled?0:basePow,cm=0,cx=1;
    if(!isKit&&enragedBT&&!c._re)cm+=enragedBT.fx.enragedMult;

    // ★ DOPAMINE: Accumulate ALL effects into one combined entry
    const icons=[];
    if(isKit)icons.push("🐾"); // kitten marker
    if(!cfx.noTraits&&!isKit){
      // COMMON (C tier)
      
      
      // Wild: no direct scoring (season matching handled by getCatBreeds)
      
      
      if(catHas(c,"Devoted")&&!c._re){if(c.bondedTo&&cats.find(x=>x.id===c.bondedTo)){cm+=5;icons.push("🫀");}}
      if(catHas(c,"Stubborn")&&!c._re){const bonus=ctx.lastHandLost?6:3;cm+=bonus;icons.push("🪨");}
      if(catHas(c,"Stray")&&!c._re){const seasons=new Set(cats.flatMap(x=>getCatBreeds(x)));const v=seasons.size*3;cm+=v;icons.push("🐈");}
      if(catHas(c,"Loyal")&&!c._re){const lh=ctx.lastHandIds||[];const bonus=lh.length>0&&cats.every(x=>lh.includes(x.id))?4:2;cm+=bonus;icons.push("🫂");}
      if(catHas(c,"Scavenger")&&!c._re){const v=Math.min(5,Math.floor(pGold));cm+=v;icons.push("🌾");}
      // RARE (B tier)
      if(catHas(c,"Scrapper")){const v=(c.scarred&&!c._re)?5:3;cm+=v;icons.push("🥊");}
      if(catHas(c,"Cursed")){const myBreeds=getCatBreeds(c);const alone=!cats.some(x=>x.id!==c.id&&getCatBreeds(x).some(b=>myBreeds.includes(b)));const v=alone?8:-3;cm+=v;icons.push("💀");}
      
      
      if(catHas(c,"Guardian")&&!c._re){const hurt=cats.filter(x=>x.id!==c.id&&(x.scarred||x.injured)).length;if(hurt>0){cm+=hurt*2;icons.push("🛡️");}}
      // LEGENDARY (A tier)
      if(catHas(c,"Echo")){}// handled via toS double-scoring above
      if(catHas(c,"Chimera")&&!c._re){
        if(cats.length>=3){cx*=1.5;icons.push("🧬");}
      }
      if(catHas(c,"Alpha")&&!c._re){if(c.power>=Math.max(...powers)){cx*=1.3;icons.push("🐺");}}
      if(catHas(c,"Nocturnal")&&!c._re){const nerveMult=fLvl*2;if(nerveMult>0){cm+=nerveMult;icons.push("🌙");}}
      // MYTHIC (S tier)
      if(catHas(c,"Eternal")){cx*=3.0;icons.push("✨");}
      if(catHas(c,"Phoenix")){const v=c.scarred?4.0:2.5;cx*=v;icons.push("🔥");}
    }

    // Scar/injury
    if(c.injured&&!c._re){cm-=2;icons.push("🩹");}
    else if(c.scarred&&!c._re){cx*=devFx.scarMult||1.25;const sm=ctx.scarMult||0;if(sm)cm+=sm;icons.push("⚔️");}

    // ★ Season Devotion — per-cat mult/chips bonuses from milestone unlocks
    if(!c._re){
      const breed=c.breed;
      if(devFx.multPerCat[breed]){cm+=devFx.multPerCat[breed];icons.push(BREEDS[breed]?.icon||"");}
      if(devFx.chipsPerCat[breed]){cc+=devFx.chipsPerCat[breed];icons.push(BREEDS[breed]?.icon||"");}
    }

    // Accumulate totals (same math as before)
    chips+=cc;mult+=cm;if(cx!==1)mult=Math.round(mult*cx);

    // ★ DOPAMINE: ONE breakdown entry per cat — everything combined
    const iconStr=icons.filter(Boolean).join("");
    const hasRareTrait=cx>=1.5; // Eternal/Phoenix/Chimera
    const hasScar=c.scarred&&!c.injured&&!c._re;
    const hasTrait=icons.length>0;
    const catType=hasRareTrait?"trait_rare":hasScar&&hasTrait?"scar":hasTrait?"trait":"cat";
    // ★ ATTRIBUTION: Build human-readable reason explaining WHY this cat scored what it did
    const reasons=[];
    if(cc>0)reasons.push("P"+basePow);
    if(!cfx.noTraits){
      if(catHas(c,"Scrapper"))reasons.push("Scrapper"+(c.scarred?" (scarred!)":""));
      if(catHas(c,"Devoted")&&c.bondedTo&&cats.find(x=>x.id===c.bondedTo))reasons.push("Devoted to mate");
      if(catHas(c,"Alpha")&&c.power>=Math.max(...powers))reasons.push("Alpha (highest P)");
      if(catHas(c,"Nocturnal")&&fLvl>0)reasons.push("Nocturnal (Nerve "+fLvl+")");
      if(catHas(c,"Chimera")&&cats.length>=3)reasons.push("Chimera \u00d71.5");
      if(catHas(c,"Eternal"))reasons.push("Eternal \u00d73");
      if(catHas(c,"Phoenix"))reasons.push("Phoenix \u00d7"+(c.scarred?"4":"2.5"));
      if(catHas(c,"Echo")&&c._re)reasons.push("Echo (replay)");
      if(catHas(c,"Guardian")&&cats.filter(x=>x.id!==c.id&&(x.scarred||x.injured)).length>0)reasons.push("Guardian (protecting "+cats.filter(x=>x.id!==c.id&&(x.scarred||x.injured)).length+")");
      if(catHas(c,"Cursed")){const myB=getCatBreeds(c);const al=!cats.some(x=>x.id!==c.id&&getCatBreeds(x).some(b=>myB.includes(b)));reasons.push(al?"Cursed (lone \u2192 +8M)":"Cursed (\u22123M)");}
      if(catHas(c,"Fragile"))reasons.push("Fragile (+2M/ally)");
    }
    if(c.scarred&&!c.injured&&!c._re)reasons.push("Scarred \u00d71.25");
    if(c.injured&&!c._re)reasons.push("Injured (halved)");
    bd.push({
      label:`${iconStr}${iconStr?" ":""}${c._re?"\u21BB ":""}${c.name.split(" ")[0]}${(c.trait&&c.trait.name!=="Plain"&&!c._re)?" ("+c.trait.name+")":""}`,
      reason:reasons.length>0?reasons.join(" \u00B7 "):"",
      chips:cc,mult:cm,xMult:cx!==1?cx:null,
      type:catType,catIdx:c._ci,
      isBigCat:Math.abs(cm)>=3||cx>1||cc>=8,
    });
  });

  const grudges=getGrudges(cats);
  const grudgePenalty=(ctx.grudgeWisdom||0)>0?-1:-2;
  let hasGrudgeProve=false;
  if(!cfx.noTraits&&grudges.length>0){
    grudges.forEach(([a,b])=>{
      mult=Math.max(1,mult+grudgePenalty);
      bd.push({label:`⚡ ${a.name.split(" ")[0]}+${b.name.split(" ")[0]} Tension`,chips:0,mult:grudgePenalty,type:"grudge_tension",catIdxs:[cats.indexOf(a),cats.indexOf(b)]});
    });
  }


  {
    const bondedPairs=[];
    cats.forEach(c=>{if(c.bondedTo){const mate=cats.find(x=>x.id===c.bondedTo);if(mate&&!bondedPairs.find(p=>p[0]===mate.id))bondedPairs.push([c.id,mate.id]);}});
    bondedPairs.forEach(([a,b],pi)=>{
      const ca=cats.find(c=>c.id===a),cb=cats.find(c=>c.id===b);
      const bondBoostActive=ctx.bondBoost||0;
      const baseBond=devFx.bondScale||1.5;
      const bpXM=pi===0?(baseBond+(bondBoostActive?0.25:0)):(1.25+(bondBoostActive?0.15:0));
      mult=Math.round(mult*bpXM);bd.push({label:`💕 ${ca.name.split(" ")[0]}+${cb.name.split(" ")[0]} Bonded`,chips:0,mult:0,xMult:bpXM,type:"bond",catIdxs:[cats.indexOf(ca),cats.indexOf(cb)]});
    });
  }

  // Wards (positive crescendo continues)
  let bG=0;
  if(!cfx.silence){
    const benchSize=(ctx.bench||[]).length;
    fams.forEach(f=>{
      const fx=f.eff(cats,{benchSize});const fc=fx.chips||0,fm=fx.mult||0,fxm=fx.xMult||1;
      if(fx.gold)bG+=fx.gold;chips+=fc;mult+=fm;if(fxm>1)mult=Math.round(mult*fxm);
      if(fc||fm||fxm>1)bd.push({label:`${f.icon} ${f.name}`,chips:fc,mult:fm,xMult:fxm>1?fxm:null,type:"fam"});
    });
  }else if(fams.length)bd.push({label:"🤐 Silenced",chips:0,mult:0,type:"curse"});

  // ★ BENCH — cats in hand that weren't played give passive bonuses
  const bench=ctx.bench||[];
  const benchMultiplier=(ctx.doubleBench||0)>0?1.5:1;
  if(bench.length>0){
    let bc=0,bm=0;
    bench.forEach(c=>{
      if(catIsKitten(c))return;
      if(catHas(c,"Seer")){bm+=3*benchMultiplier;}
      else if(catHas(c,"Guardian")){bm+=Math.min(4,cats.filter(x=>x.scarred||x.injured).length*2)*benchMultiplier;}
      else if(catHas(c,"Devoted")&&c.bondedTo&&cats.find(x=>x.id===c.bondedTo)){bm+=3*benchMultiplier;}
      else if(catHas(c,"Scavenger")){bG+=1*benchMultiplier;}
      else if(catHas(c,"Nocturnal")){bm+=Math.floor(fLvl/2)*benchMultiplier;}
      else{bc+=c.power*benchMultiplier;} // Default: power as chips (doubled with Deep Bench)
    });
    if(bc>0){chips+=bc;bd.push({label:`🪑 Unplayed +${bc}C`,chips:bc,mult:0,type:"bench"});}
    if(bm>0){mult+=bm;bd.push({label:`🪑 Unplayed +${bm}M`,chips:0,mult:bm,type:"bench"});}
  }

  // ★ WARD HAND-TYPE BONUSES — some wards boost specific hand types
  if(!cfx.silence){
    const htName=type.name;
    fams.forEach(f=>{
      if(f.htBonus&&f.htBonus[htName]){
        const hb=f.htBonus[htName];
        if(hb.xMult){mult=Math.round(mult*hb.xMult);bd.push({label:`${f.icon} ${f.name}: ${htName} ×${hb.xMult}`,chips:0,mult:0,xMult:hb.xMult,type:"fam"});}
        if(hb.mult){mult+=hb.mult;bd.push({label:`${f.icon} ${f.name}: ${htName} +${hb.mult}M`,chips:0,mult:hb.mult,type:"fam"});}
      }
    });
  }

  // NERVE always last — the climax
  const fv=NERVE[fLvl];if(fv.xM>1){mult=Math.round(mult*fv.xM);bd.push({label:`🔥 ${fv.name}`,chips:0,mult:0,xMult:fv.xM,type:"nerve",allCats:true});}


  const negTypes=new Set(["grudge_tension","curse","boss_trait"]);
  const bdHand=bd.filter(s=>s.type==="hand"||s.type==="combo");
  const bdNeg=bd.filter(s=>negTypes.has(s.type)||(s.mult<0&&s.type!=="hand"&&s.type!=="combo"));
  const bdPos=bd.filter(s=>!negTypes.has(s.type)&&!(s.mult<0&&s.type!=="hand"&&s.type!=="combo")&&s.type!=="hand"&&s.type!=="combo");
  const bdSorted=[...bdHand,...bdNeg,...bdPos];
  return{chips:Math.max(0,chips),mult:Math.max(1,mult),total:Math.max(0,chips)*Math.max(1,mult),bd:bdSorted,bG,ht:type.name,combo:combo?.name||null,hasGrudgeProve};
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

function getTarget(a,b,firstRun,isLong){const scale=isLong?1.45:1.65;const base=(firstRun?[1200,2400,3500]:[2000,4000,8500])[b]*Math.pow(scale,a-1);const bossDiscount=b===2?(a===1?0.8:a===2&&firstRun?0.85:1):1;return Math.round(base*bossDiscount);}
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

const SLOT_COUNT=3;
let activeSlot=1; // default slot
const slotKey=s=>`nl_s${s}`;
const runKey=s=>`nl_r${s}`;
const bakKey=k=>k+"_bak";
const SK_SLOT="nl_slot"; // tracks which slot is active

const dSave=()=>({cats:[],dust:0,ups:{},stats:{r:0,w:0,ba:0,hs:0,mf:0,mh:0,td:0,disc:[],dh:[],bossRecord:{},grudgesResolved:0,kittensTotal:0,handTypePlays:{}},heat:0,achv:[],relics:[],v:17});

// Field-level validation — partial corruption → partial loss, never total wipe
function validateSave(d){
  if(!d||typeof d!=="object")return dSave();
  if(!Array.isArray(d.cats))d.cats=[];
  if(typeof d.dust!=="number"||isNaN(d.dust))d.dust=0;
  if(!d.ups||typeof d.ups!=="object")d.ups={};
  if(!d.stats||typeof d.stats!=="object")d.stats={};
  const s=d.stats;
  if(typeof s.r!=="number")s.r=0;
  if(typeof s.w!=="number")s.w=0;
  if(typeof s.ba!=="number")s.ba=0;
  if(typeof s.hs!=="number")s.hs=0;
  if(typeof s.mf!=="number")s.mf=0;
  if(typeof s.mh!=="number")s.mh=0;
  if(typeof s.td!=="number")s.td=0;
  if(!Array.isArray(s.disc))s.disc=[];
  if(!Array.isArray(s.dh))s.dh=[];
  if(!Array.isArray(d.achv))d.achv=[];
  if(!Array.isArray(d.relics))d.relics=[];
  if(typeof d.heat!=="number")d.heat=0;
  // Career counters (v17+)
  if(!s.bossRecord||typeof s.bossRecord!=="object")s.bossRecord={};
  if(typeof s.grudgesResolved!=="number")s.grudgesResolved=0;
  if(typeof s.kittensTotal!=="number")s.kittensTotal=0;
  if(!s.handTypePlays||typeof s.handTypePlays!=="object")s.handTypePlays={};
  // Chronicle flags (v52 cross-run arcs)
  if(!s.chronicle||typeof s.chronicle!=="object")s.chronicle={};
  // Cats array — filter out corrupt entries
  d.cats=d.cats.filter(c=>c&&typeof c==="object"&&c.name&&c.breed);
  if(!d.v)d.v=17;
  return d;
}

// Read/write helpers — try window.storage first, localStorage fallback
async function readRaw(k){try{if(window.storage?.get){const r=await window.storage.get(k);if(r)return r.value;}}catch(e){}try{return localStorage.getItem(k);}catch(e){}return null;}
async function writeRaw(k,v){try{if(window.storage?.set)await window.storage.set(k,v);}catch(e){}try{localStorage.setItem(k,v);}catch(e){}}
async function deleteRaw(k){try{if(window.storage?.delete)await window.storage.delete(k);}catch(e){}try{localStorage.removeItem(k);}catch(e){}}

// Load active slot number
async function loadSlotNum(){try{const v=await readRaw(SK_SLOT);if(v){const n=parseInt(v);if(n>=1&&n<=SLOT_COUNT){activeSlot=n;return n;}}}catch(e){}activeSlot=1;return 1;}

// Load save from slot — tries primary → backup → default
async function loadS(slot){
  const sk=slotKey(slot||activeSlot);
  // Try primary
  try{const raw=await readRaw(sk);if(raw){const d=JSON.parse(raw);return validateSave(migrateSave(d));}}catch(e){}
  // Try backup
  try{const bak=await readRaw(bakKey(sk));if(bak){const d=JSON.parse(bak);return validateSave(migrateSave(d));}}catch(e){}
  return dSave();
}

// Save to slot — backup previous first
async function saveS(d,slot){
  const sk=slotKey(slot||activeSlot);
  const json=JSON.stringify(d);
  // Backup current before overwriting
  try{const prev=await readRaw(sk);if(prev)await writeRaw(bakKey(sk),prev);}catch(e){}
  await writeRaw(sk,json);
}

// Run save (mid-run state)
async function saveRun(state){const rk=runKey(activeSlot);await writeRaw(rk,JSON.stringify(state));}
async function loadRun(){const rk=runKey(activeSlot);try{const raw=await readRaw(rk);if(raw)return JSON.parse(raw);}catch(e){}return null;}
async function clearRunSave(){await deleteRaw(runKey(activeSlot));}

// Export slot as JSON string
async function exportSlot(slot){const raw=await readRaw(slotKey(slot||activeSlot));return raw||JSON.stringify(dSave());}
// Import JSON string into slot
async function importSlot(json,slot){try{const d=validateSave(migrateSave(JSON.parse(json)));await saveS(d,slot||activeSlot);return d;}catch(e){return null;}}

// Slot summary (for slot selector UI)
async function getSlotSummary(slot){
  try{const raw=await readRaw(slotKey(slot));if(raw){const d=JSON.parse(raw);return{empty:false,wins:d.stats?.w||0,runs:d.stats?.r||0,cats:d.cats?.length||0,dust:d.dust||0,heat:d.heat||0};}}catch(e){}
  return{empty:true,wins:0,runs:0,cats:0,dust:0,heat:0};
}

// Migrate between save versions
async function setActiveSlot(n){activeSlot=n;await writeRaw(SK_SLOT,String(n));}

// Legacy migration — if old single-key save exists, move it to slot 1
async function migrateLegacy(){
  const old=await readRaw("nl_v29");
  if(old){
    // Copy old save to slot 1
    await writeRaw(slotKey(1),old);
    // Copy old run save to slot 1
    const oldRun=await readRaw("nl_run");
    if(oldRun)await writeRaw(runKey(1),oldRun);
    // Clean up old keys
    await deleteRaw("nl_v29");
    await deleteRaw("nl_run");
  }
}

const BREED_MIGRATE={Shadow:"Autumn",Ember:"Summer",Frost:"Winter",Bloom:"Spring"};
function migrateSave(d){
  if(!d)return dSave();
  const mb=n=>BREED_MIGRATE[n]||n;
  if(d.cats)d.cats=d.cats.map(c=>({...c,breed:mb(c.breed)}));
  if(d.stats?.disc)d.stats.disc=d.stats.disc.map(s=>s.replace(/^(Shadow|Ember|Frost|Bloom)/,(_,m)=>mb(m)));
  if(!d.stats.dh)d.stats.dh=[];
  // v16 → v17: Career counters for meta progression
  if(!d.v||d.v<17){
    if(!d.stats.bossRecord)d.stats.bossRecord={};
    if(!d.stats.grudgesResolved)d.stats.grudgesResolved=0;
    if(!d.stats.kittensTotal)d.stats.kittensTotal=0;
    if(!d.stats.handTypePlays)d.stats.handTypePlays={};
    if(!d.stats.chronicle)d.stats.chronicle={};
    d.v=17;
  }
  return validateSave(d);
}

function getHearthPairs(hearthCats){
  const pairs={};
  hearthCats.filter(c=>c.pairId).forEach(c=>{if(!pairs[c.pairId])pairs[c.pairId]=[];pairs[c.pairId].push(c);});
  return Object.values(pairs).filter(p=>p.length===2);
}
function genDescendant(hearthCats,powerBonus=0){
  const pairs=getHearthPairs(hearthCats);
  if(pairs.length===0)return gC({trait:pickDraftTrait()}); // fallback: draft pool
  const pair=pk(pairs);
  const p1={...pair[0],id:pair[0].name+"-h1",trait:typeof pair[0].trait==="string"?TRAITS.find(t=>t.name===pair[0].trait)||PLAIN:(pair[0].trait||PLAIN)};
  const p2={...pair[1],id:pair[1].name+"-h2",trait:typeof pair[1].trait==="string"?TRAITS.find(t=>t.name===pair[1].trait)||PLAIN:(pair[1].trait||PLAIN)};
  const baby=breedC(p1,p2);
  // Hearth bonus: if baby ended up Plain, give a Common trait (not free Legendary)
  if(catIsPlain(baby)){
    baby.trait=pk(COMMON_TRAITS);
    baby.name=gN(baby.breed,baby.trait);
  }
  if(powerBonus>0)baby.power=Math.min(8,baby.power+powerBonus);
  baby.hearthDescendant=true;
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
    if(c.stats?.tp>=12)d+=3;
    else if(c.stats?.tp>=6)d+=2;
    else if(c.stats?.tp>=3)d+=1;
    if(c.stats?.bs>=10000)d+=5;
    else if(c.stats?.bs>=3000)d+=2;
    if(c.bondedTo||c.bonded)d+=2;
    if(c.scarred)d+=3;
    if(c.fromAnte>=5)d+=4;
    else if(c.fromAnte>=3)d+=2;
    if(c.lineage)d+=3;
    return{cat:c,dust:d};
  });
}
function calcTotalHearthDust(cats,dustBonus=0,heatMult=1){
  const hd=calcHearthDust(cats);
  const raw=hd.reduce((s,h)=>s+h.dust,0);
  const activeCats=cats.filter(c=>!c.enshrined);
  const activeRaw=calcHearthDust(activeCats).reduce((s,h)=>s+h.dust,0);
  const maintenance=activeCats.length>8?(activeCats.length-8)*2:0;
  const enshrined=cats.filter(c=>c.enshrined).length;
  const tierBonus=cats.length>=15?0.30:cats.length>=6?0.15:0;
  const gross=Math.round(activeRaw*(1+dustBonus+tierBonus)*heatMult);
  const total=Math.max(0,gross-maintenance);
  return{cats:hd,total,raw:activeRaw,gross,maintenance,enshrined,activeCats:activeCats.length};
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════

// Pattern: {style}-{season}.png. Graceful fallback: if portraits don't load, cards look exactly like before.
const PORTRAIT_BASE="https://raw.githubusercontent.com/greatgamesgonewild/ninth-life/main/portraits/";
function getPortraitUrl(cat){
  try{
    const season=(cat.breed||"autumn").toLowerCase();
    // ★ 8 portrait archetypes — priority order, first match wins
    let style="plain";
    const allT=[cat.trait,...(cat.extraTraits||[])].filter(t=>t&&t.name!=="Plain");
    const hasT=(n)=>allT.some(t=>t.name===n);
    const hasTier=(t)=>allT.some(tr=>tr.tier===t);
    const tp=cat.stats?.tp||0;
    const power=cat.power||1;

    // 1. KITTEN — den-bred baby, never played (always kitten regardless of traits)
    if(catIsKitten(cat))style="kitten";
    // 2. MYTHIC — Phoenix/Eternal (rarest, always overrides)
    else if(hasTier("mythic")||hasT("Eternal")||hasT("Phoenix"))style="mythic";
    // 3. NOBLE — Legendary trait + high power (earned elite status)
    else if(hasTier("legendary")&&power>=8)style="noble";
    // 4. ELDER — veteran survivor (10+ plays, regardless of traits)
    else if(tp>=10)style="elder";
    // 5. ALERT — combat cats (Scrapper, Alpha) or any scarred cat
    else if(hasT("Scrapper")||hasT("Alpha")||cat.scarred)style="alert";
    // 6. WILD — untamed energy (Wild, Chimera, Feral, Cursed)
    else if(hasT("Wild")||hasT("Chimera")||hasT("Feral")||hasT("Cursed"))style="wild";
    // 7. GENTLE — support/nurture (Devoted, Provider, Seer, Guardian)
    else if(hasT("Devoted")||hasT("Provider")||hasT("Seer")||hasT("Guardian"))style="gentle";
    // 8. NOBLE fallback — any legendary without high power still looks refined
    else if(hasTier("legendary"))style="noble";
    // 9. ALERT fallback — any remaining traited cat
    else if(allT.length>0)style="alert";
    // 10. PLAIN — no traits, no history

    return `${PORTRAIT_BASE}${style}-${season}.png`;
  }catch(e){return "";}
}

// Test if portraits are reachable (once per session). If not, skip all portrait loading.
let _portraitsAvailable=null; // null=untested, true/false=tested
let _goldBorders=false;
(function testPortraits(){
  try{
    const img=new Image();
    img.onload=()=>{_portraitsAvailable=true;};
    img.onerror=()=>{_portraitsAvailable=false;};
    img.src=PORTRAIT_BASE+"plain-autumn.png";
  }catch(e){_portraitsAvailable=false;}
})();

function CatPortrait({cat,sm,b,fill}){
  const url=getPortraitUrl(cat);
  const[status,setStatus]=useState("loading");
  const urlRef=useRef(url);
  if(urlRef.current!==url){urlRef.current=url;setStatus("loading");}
  // No portrait available: return nothing (card shows dark background, overlays still visible)
  if(_portraitsAvailable===false||!url||status==="failed")return null;
  if(fill)return(<>
    <img src={url} alt="" loading="eager" style={{width:"100%",height:"100%",objectFit:"cover",display:status==="loaded"?"block":"none",filter:cat.injured?"saturate(0.3) brightness(0.5)":cat.scarred?"contrast(1.15) brightness(0.9)":"none",opacity:.85}}
      onLoad={()=>{setStatus("loaded");_portraitsAvailable=true;}}
      onError={()=>setStatus("failed")}/>
  </>);
  const sz=sm?40:56;
  return(<div style={{width:sz,height:sz,position:"relative",marginBottom:sm?1:2,flexShrink:0,borderRadius:"50%",overflow:"hidden",border:`1.5px solid ${b.color}33`}}>
    <img src={url} alt="" loading="eager" style={{width:"100%",height:"100%",objectFit:"cover",display:status==="loaded"?"block":"none",filter:cat.injured?"saturate(0.4) brightness(0.7)":cat.scarred?"contrast(1.2)":"none"}}
      onLoad={()=>{setStatus("loaded");_portraitsAvailable=true;}}
      onError={()=>setStatus("failed")}/>
  </div>);
}

function CC({cat:_cat,sel,onClick,sm,cw:_cw,dis,hl,fog,chemHint,denMode,onTraitClick}){
  const cat=(!_cat||!_cat.trait)?{...(_cat||{}),trait:PLAIN,extraTraits:[],breed:"Autumn",name:"???",power:1,sex:"M"}:_cat;
  const b=BREEDS[cat.breed]||BREEDS.Autumn,w=_cw||( sm?80:112),h=_cw?Math.round(_cw*1.4):(sm?112:158),fn=cat.name?cat.name.split(" ")[0]:"?";
  const xs=w<60;if(_cw&&_cw<80)sm=true;
  const allTraits=catAllTraits(cat);
  const isMythicTier=allTraits.some(t=>t.tier==="mythic");
  const isLegendaryTier=allTraits.some(t=>t.tier==="legendary");
  const isRareTier=allTraits.some(t=>t.tier==="rare"||t.tier==="rare_neg");
  const isPlain=cat.trait.name==="Plain"&&!(cat.extraTraits||[]).length;
  const isWild=catHas(cat,"Chimera")||catHas(cat,"Wild");
  const neon=b.color;
  const nd=neon+"55";const ng=neon+"33";
  const tierGlow=isMythicTier?",0 0 12px #c084fc44,0 0 20px #c084fc22":isLegendaryTier?",0 0 10px #f9731633":isRareTier?",0 0 8px #38bdf822":"";
  const goldBorder=_goldBorders&&!isPlain;
  let rankLabel=null;

  if(fog)return(<div onClick={dis?undefined:onClick} style={{width:w,height:h,borderRadius:sm?8:12,background:"#0d1117",border:"2px solid #ffffff12",boxShadow:"0 2px 8px #00000066",cursor:dis?"default":"pointer",transition:"all .15s",transform:sel?"translateY(-12px) scale(1.05)":"",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontFamily:"'Cinzel',serif"}}><span style={{fontSize:sm?22:30,opacity:.12,color:neon}}>?</span></div>);

  return(
    <div onClick={dis?undefined:onClick} title={cat.name+" - "+b.name+", P"+cat.power} style={{
      width:w,height:h,borderRadius:sm?8:12,
      background:"#0d1117",
      border:"2px solid "+(sel?"#fbbf24":denMode?"#c084fc88":hl?neon:goldBorder?"#fbbf2466":nd),
      boxShadow:(sel?"0 0 14px "+neon+"66,0 0 28px "+ng:hl?"0 0 10px "+ng:"0 0 6px "+ng+",0 0 14px "+ng)+tierGlow+(goldBorder?",0 0 3px #fbbf2422":""),
      cursor:dis?"default":"pointer",transition:"all .15s ease-out",
      transform:sel?`translateY(-${Math.min(12,Math.round(w*0.12))}px) scale(1.04)`:"",
      position:"relative",overflow:"hidden",
      flexShrink:0,opacity:dis?.4:1,fontFamily:"'Cinzel',serif"
    }}>

      {/* Inner neon frame */}
      <div style={{position:"absolute",top:sm?3:4,left:sm?3:4,right:sm?3:4,bottom:sm?3:4,
        borderRadius:sm?5:8,border:"1px solid "+nd,pointerEvents:"none",zIndex:1}}/>

      {/* Portrait — fills card, bottom cropped. Plain cats dimmed to 20% */}
      <div style={{position:"absolute",top:0,left:0,right:0,bottom:sm?28:38,
        overflow:"hidden",borderRadius:(sm?6:10)+"px "+(sm?6:10)+"px 0 0",zIndex:2}}>
        {(_portraitsAvailable!==false&&getPortraitUrl(cat))?
          <img src={getPortraitUrl(cat)} alt="" loading="eager"
            style={{width:"100%",height:"115%",objectFit:"cover",objectPosition:"center 15%",
              opacity:isPlain?0.15:1,
              filter:cat.injured?"saturate(0.3) brightness(0.5)":cat.scarred?"contrast(1.15) brightness(0.9)":"none",
              transition:"opacity .3s"}}
            onLoad={function(e){_portraitsAvailable=true;}}
            onError={function(e){
              const src=e.target.src;const season=src.match(/-(\w+)\.png/)?.[1]||"autumn";
              const fallback=PORTRAIT_BASE+"plain-"+season+".png";
              if(src!==fallback){e.target.src=fallback;}
              else{e.target.style.display="none";}
            }}/>
          :null}
      </div>

      {/* Power + Gender (top-right) */}
      <div style={{position:"absolute",top:sm?1:2,right:sm?1:2,zIndex:5,
        display:"flex",alignItems:"baseline",gap:sm?2:3,
        background:"#0d1117ee",border:"1.5px solid "+nd,
        borderRadius:sm?"0 6px 0 8px":"0 10px 0 10px",
        padding:sm?"2px 5px 1px":"3px 7px 2px",
        borderTop:"none",borderRight:"none"}}>
        <span style={{fontSize:xs?12:(sm?15:22),fontWeight:900,color:neon,lineHeight:1,
          textShadow:"0 0 8px "+ng,fontFamily:"'Cinzel',serif"}}>{cat.power}</span>
      </div>

      {/* Status badges (top-left) — all neon color, vertical stack */}
      {(cat.injured||cat.scarred||cat.bondedTo||(cat.grudgedWith||[]).length>0||cat.parentIds?.length>0)&&
      <div style={{position:"absolute",top:sm?2:3,left:sm?2:3,zIndex:5,display:"flex",flexDirection:"column",gap:1}}>
        {cat.injured&&<div title="Injured: half power, −2 mult. Heals in 1-2 rounds." style={{background:"#0d1117ee",border:"1px solid "+nd,borderRadius:3,
          padding:"1px 3px",fontSize:sm?7:9,color:"#ef4444",lineHeight:1}}>{"\u271A"}</div>}
        {!cat.injured&&cat.scarred&&<div title="Scarred: permanent ×1.25 mult bonus on this cat." style={{background:"#0d1117ee",border:"1px solid "+nd,borderRadius:3,
          padding:"1px 3px",fontSize:sm?7:9,color:"#fb923c",lineHeight:1}}>{"\u2694"}</div>}
        {cat.bondedTo&&<div title="Bonded: ×1.5 mult when played with their partner." style={{background:"#0d1117ee",border:"1px solid "+nd,borderRadius:3,
          padding:"1px 3px",fontSize:sm?7:9,color:"#f472b6",lineHeight:1}}>{"\u2661"}</div>}
        {(cat.grudgedWith||[]).length>0&&<div title="Grudge: −2 mult when played with their rival." style={{background:"#0d1117ee",border:"1px solid "+nd,borderRadius:3,
          padding:"1px 3px",fontSize:sm?7:9,color:"#fb923c",lineHeight:1}}>{"\u26A1"}</div>}
        {cat.parentIds&&cat.parentIds.length>0&&<div title={`Born in the den${cat.stats?.par?" — parents: "+cat.stats.par:""}`} style={{background:"#0d1117ee",border:"1px solid "+nd,borderRadius:3,
          padding:"1px 3px",fontSize:sm?7:9,color:"#c084fc",lineHeight:1}}>👪</div>}
      </div>}

      {/* Rank badge (below power) */}
      {rankLabel&&<div style={{position:"absolute",top:sm?15:20,right:sm?2:3,zIndex:5,
        background:"#0d1117ee",border:"1px solid "+nd,borderRadius:3,
        padding:"1px 3px",fontSize:sm?6:7,color:neon+"bb",fontFamily:"system-ui",fontWeight:600}}>
        {rankLabel}
      </div>}

      {/* BOTTOM: Trait icons on separator + Name full width */}
      <div style={{position:"absolute",bottom:0,left:0,right:0,zIndex:4}}>
        {/* Separator line */}
        <div style={{position:"relative",height:sm?14:18}}>
          <div style={{position:"absolute",top:"50%",left:sm?4:5,right:sm?4:5,height:1,
            background:"linear-gradient(90deg,"+neon+"44,"+neon+"88,"+neon+"44)"}}/>
          {/* All trait icons on left side of line */}
          <div style={{position:"absolute",left:sm?4:6,top:"50%",transform:"translateY(-50%)",
            display:"flex",gap:sm?2:3,zIndex:1}}>
            {[cat.trait,...(cat.extraTraits||[])].filter(function(t){return t.name!=="Plain";}).map(function(t,ti){
              return <div key={ti} onClick={function(e){e.stopPropagation();if(onTraitClick)onTraitClick(cat);}} style={{
                background:"#0d1117",padding:"0 2px",
                fontSize:xs?8:(sm?10:13),lineHeight:1,cursor:onTraitClick?"help":"default"
              }}>{t.icon}</div>;
            })}
          </div>
          {/* Season icon on right side of line */}
          <div style={{position:"absolute",right:sm?4:6,top:"50%",transform:"translateY(-50%)",
            background:"#0d1117",padding:"0 2px",
            fontSize:xs?8:(sm?10:13),lineHeight:1,zIndex:1}}>
            {isWild?"\u2726":b.icon}</div>
        </div>
        {/* Name — dynamic font size based on length */}
        <div style={{background:"#0d1117",padding:sm?"1px 6px 4px":"2px 8px 5px",textAlign:"center"}}>
          <div style={{fontSize:xs?(fn.length>5?5:7):(sm?(fn.length>7?7:fn.length>5?8:10):(fn.length>8?10:fn.length>6?11:13)),
            fontWeight:700,color:neon,letterSpacing:xs?0:(sm?(fn.length>6?0:1):(fn.length>7?1:3)),
            textShadow:"0 0 6px "+ng,
            textTransform:"uppercase",fontFamily:"'Cinzel',serif",
            whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",lineHeight:1.2}}>{fn}<span style={{fontSize:xs?7:(sm?9:11),fontWeight:700,marginLeft:2,color:cat.sex==="M"?"#60a5fa":"#f472b6"}}>{cat.sex==="M"?"♂":"♀"}</span></div>
        </div>
      </div>

      {/* Chemistry grudge dot */}
      {chemHint&&chemHint.grudge&&<div style={{position:"absolute",top:sm?3:4,left:"50%",transform:"translateX(-50%)",zIndex:6}}>
        <div style={{width:5,height:5,borderRadius:3,background:"#fb923c",boxShadow:"0 0 6px #fb923c88"}}/>
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
          border:d.cur?`2px solid #fbbf24`:d.isBoss&&!d.done?"1px solid #ef444488":"none",
          boxShadow:d.cur?"0 0 8px #fbbf2488":"none",
          transition:"all .3s"
        }}/>
      </div>);
    })}
  </div>);
}

function FM({level,prev}){
  const fv=NERVE[level]||NERVE[0],pct=(level/NERVE_MAX)*100,mx=level===NERVE_MAX,ch=prev!==null&&prev!==level,up=ch&&level>prev,dn=ch&&level<prev;
  return(<div style={{width:"100%",maxWidth:700,padding:"0 16px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <span title={"NERVE multiplies ALL scores.\nGain: +1 per Dusk/Midnight clear.\nBoss: +hands remaining (faster clear = more nerve).\nNo decay. No loss.\nAt NINTH LIFE (max): ×2.2 to ALL scores."} style={{fontSize:12,fontWeight:700,color:fv.color,letterSpacing:2,textShadow:mx?`0 0 14px ${fv.glow}`:level>5?`0 0 6px ${fv.color}44`:"none",animation:mx?"fp 1s ease-in-out infinite":up?"fpp .4s ease-out":dn?"shake .3s ease":"none",fontFamily:"'Cinzel',serif",cursor:"help"}}>{mx?"✦ ":""}{fv.name}{mx?" ✦":""}</span>
        <span style={{fontSize:fv.xM>1?13:11,color:fv.color,fontFamily:"system-ui",fontWeight:900,opacity:fv.xM>1?1:.3,letterSpacing:fv.xM>1?1:0,textShadow:fv.xM>1.3?`0 0 8px ${fv.color}44`:"none"}}>{fv.xM>1?`×${fv.xM}`:"×1"}</span>
        {ch&&<span style={{fontSize:10,fontWeight:700,animation:"countUp .4s ease-out",color:up?"#4ade80":"#ef4444"}}>{up?"▲":"▼"}</span>}
      </div>
      <span style={{fontSize:10,color:"#555",fontFamily:"system-ui"}}>{level}/{NERVE_MAX}</span>
    </div>
    <div style={{height:8,background:"#1a1a2e",borderRadius:4,overflow:"hidden",border:"1px solid #ffffff08"}}><div style={{height:"100%",width:`${pct}%`,borderRadius:4,background:mx?"linear-gradient(90deg,#b85c2c,#f59e0b,#fef08a,#ffffffcc)":`linear-gradient(90deg,#b8956a,${fv.color})`,transition:"width .5s cubic-bezier(.4,0,.2,1)",boxShadow:level>5?`0 0 8px ${fv.color}44`:"none"}}/></div>
    {level===0&&<div style={{fontSize:10,color:"#666",fontFamily:"system-ui",marginTop:2,textAlign:"center"}}>Clear blinds to build Nerve. Faster boss clears give more.</div>}
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
  // (scavenge removed in v51)
  const[hand,setHand]=useState([]);const[draw,setDraw]=useState([]);
  const[disc,setDisc]=useState([]);const[sel,setSel]=useState(new Set());
  const[fams,setFams]=useState([]);const[sCats,setSCats]=useState([]);
  const[sFams,setSFams]=useState([]);const[sRes,setSRes]=useState(null);
  const[sStep,setSStep]=useState(-1);
  const[runChips,setRunChips]=useState(0);const[runMult,setRunMult]=useState(0);
  const[scoreShake,setScoreShake]=useState(0);const[clutch,setClutch]=useState(false);const[scoringFlash,setScoringFlash]=useState(null);const[multPop,setMultPop]=useState(null); // ★ Big multiplier pop-up
  const[handBests,setHandBests]=useState({});const[newBest,setNewBest]=useState(null);const[handDiscovery,setHandDiscovery]=useState([]);const[scoringDone,setScoringDone]=useState(false);const[traitTip,setTraitTip]=useState(null);const[deckView,setDeckView]=useState(false);const[handSort,setHandSort]=useState("season");const[showLog,setShowLog]=useState(false);
  const[boss,setBoss]=useState(null);
  const stRef=useRef(null);
  const scoreEndRef=useRef(null);
  const advancingRef=useRef(false); // ★ FIX: Prevent double-click on scoring screen
  const actionLock=useRef(false); // ★ FIX: Prevent double-click on play/discard
  const fcSeenRef=useRef({});
  const[ferv,setFerv]=useState(0);const[pFerv,setPFerv]=useState(null);
  const[fFlash,setFFlash]=useState(null);const[rMaxF,setRMaxF]=useState(0);
  const[curses,setCurses]=useState([]);const[cfx,setCfx]=useState({});
  const[oData,setOData]=useState(null);
  const[sellMode,setSellMode]=useState(false);
  const[sellsLeft,setSellsLeft]=useState(2); // ★ Max 2 sells per shop
  const[den,setDen]=useState([]);
  const[denRes,setDenRes]=useState(null); // ★ Den night results
  const[babyNames,setBabyNames]=useState({});
  const[denStep,setDenStep]=useState(-1);
  const denStRef=useRef(null);
  useEffect(()=>()=>{if(stRef.current)clearTimeout(stRef.current);if(denStRef.current)clearTimeout(denStRef.current);},[]);
  // v10: CONTEXT SYSTEMS
  const[runLog,setRunLog]=useState([]); // event log
  const[fallen,setFallen]=useState([]); // names of the dead
  // v13: Draft system
  const[draftPool,setDraftPool]=useState([]);const[draftRejects,setDraftRejects]=useState([]);const[colonyData,setColonyData]=useState(null);
  const[colonyName,setColonyName]=useState("");
  const[draftPicked,setDraftPicked]=useState([]);
  const[draftBase,setDraftBase]=useState([]);
  const[draftWaves,setDraftWaves]=useState([]);
  // v13: Boss rewards — now a pick-1-of-3 system
  const[bossReward,setBossReward]=useState(null); // legacy single reward (unused in new flow)
  const[bossRewardChoices,setBossRewardChoices]=useState([]); // 3 options to pick from
  const prevRewardIdsRef=useRef([]); // track recently offered to avoid repeats
  // v13: Run bonuses from boss rewards
  const[runBonus,setRunBonus]=useState({hands:0});
  // v14: Den news (persists across rounds until next den)
  const[denNews,setDenNews]=useState([]);
  // v14: First hand fog tracker for New Moon
  const[firstHandPlayed,setFirstHandPlayed]=useState(false);
  // v16: Visual scoring
  const[scoringCats,setScoringCats]=useState([]);
  const[lastHandIds,setLastHandIds]=useState([]); // ★ for Loyal trait
  const[lastHandLost,setLastHandLost]=useState(false); // ★ for Stubborn trait
  const[aftermath,setAftermath]=useState([]);
  // v15: Colony events
  const[colEvent,setColEvent]=useState(null);
  const[eventHistory,setEventHistory]=useState({});
  const[colTargets,setColTargets]=useState([]);const[eventOutcome,setEventOutcome]=useState(null);const[skipShop,setSkipShop]=useState(false);
  const[campMode,setCampMode]=useState(false);
  // v15: Temp round modifiers from events
  const[tempMods,setTempMods]=useState({hands:0,discs:0,freeRecruits:0,nerveLock:0});
  // v15: Event-granted den safety
  const[eventDenSafe,setEventDenSafe]=useState(false);const[eventDenBonus,setEventDenBonus]=useState(0);const[firstDenUsed,setFirstDenUsed]=useState(false);
  const[newUnlocks,setNewUnlocks]=useState([]); // hover tooltip
  const[shopTab,setShopTab]=useState("cats");
  const[defeatData,setDefeatData]=useState(null); // v30: defeat interstitial
  const[bloodMemMsg,setBloodMemMsg]=useState(null);
  const[rerollCount,setRerollCount]=useState(0);
  const[htLevels,setHtLevels]=useState({}); // ★ Hand type levels — {handName: level} per run
  const[sScrolls,setSScrolls]=useState([]); // ★ Scrolls for sale in shop
  const[devotion,setDevotion]=useState({}); // ★ Season devotion counters — {Autumn:5, Winter:3, ...}
  const[hearthDust,setHearthDust]=useState(0); // v30: dust earned from saved cats at run start
  const[anteUp,setAnteUp]=useState(null); // ante transition
  const[nightCard,setNightCard]=useState(null); // v29: night interstitial
  const[meta,setMeta]=useState(null);const[hearthPair,setHearthPair]=useState([]);
  const[hearthFlash,setHearthFlash]=useState(null);
  const[savedRun,setSavedRun]=useState(null);
  const[starter,setStarter]=useState(null);const[reshuf,setReshuf]=useState(false);
  const[tab,setTab]=useState("play");
  const[longDark,setLongDark]=useState(false);
  const[guide,setGuide]=useState(null); // {step:0-3, msg:"..."}
  const[autoPlay,setAutoPlay]=useState(null); // null | {step:0-3, idxs:[]}
  const[namingCat,setNamingCat]=useState(null);
  const[babyNamingQueue,setBabyNamingQueue]=useState([]);
  const pendingRenames=useRef({});
  const[toasts,setToasts]=useState([]);const toastRef=useRef(0);
  function toast(icon,text,color="#fbbf24",dur=2500){const id=++toastRef.current;setToasts(t=>[...t,{id,icon,text,color,big:dur>2500}]);setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),dur);}
  const prevNerveRef=useRef(ferv);
  useEffect(()=>{
    const prev=prevNerveRef.current;prevNerveRef.current=ferv;
    if(prev===ferv||ph==="title"||ph==="draft")return;
    const up=ferv>prev;
    const NERVE_VOICE={2:"Tension.",3:"Cornered.",4:"DEFIANCE.",5:"IGNITE.",6:"FURY.",7:"BLAZING.",8:"UNDYING.",9:"NINTH LIFE."};
    const DOWN_VOICE={0:"Silence.",1:"Fading.",2:"Slipping.",3:"Shaken."};
    if(up&&NERVE_VOICE[ferv])toast("🔥",NERVE_VOICE[ferv],NERVE[ferv].color);
    else if(!up&&ferv<=3&&DOWN_VOICE[ferv])toast("💨",DOWN_VOICE[ferv],"#6b7280");
  },[ferv]);
  const[seen,setSeen]=useState({});
  const[muted,setMuted]=useState(()=>{try{return localStorage.getItem("nl_mute")==="1";}catch(e){return false;}});
  const[abandonConfirm,setAbandonConfirm]=useState(false);
  const toggleMute=()=>{setMuted(m=>{const v=!m;Audio.muted=v;try{localStorage.setItem("nl_mute",v?"1":"0");}catch(e){}return v;});};
  const[bossTraits,setBossTraits]=useState([]);
  const[isNinthDawn,setIsNinthDawn]=useState(false);
  const[dareBet,setDareBet]=useState(false); // Eighth Colony's Score event

  const isFirstRun=!meta||meta.stats.w===0;
  const runCount=meta?.stats?.r||0; // total runs completed (for progressive disclosure)
  const MX=isFirstRun?3:(longDark?9:5),BH=6,MF=5,MIN_DECK=6;
  const BOSSES=[
  {id:"hunger",name:"The Hunger",icon:"🌪️",taunt:"I was here before you named it.",
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
  {id:"territory",name:"The Territory",icon:"⛰️",taunt:"You built on someone else's grave.",
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
  {id:"mother",name:"The Mother",icon:"💔",taunt:"I had names for them, too. Every one.",
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
  {id:"swarm",name:"The Swarm",icon:"🐀",taunt:"We don't need to be stronger. Just patient.",
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
  {id:"forgetting",name:"The Forgetting",icon:"🌫️",taunt:"What were their names? Say them. Quickly, now.",
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
  const wins=meta?.stats?.w||0;
  const FULL_BOSS_POOL=[...BOSSES,...(wins>=3?EXPANDED_BOSSES:[])];

  const[slotSummaries,setSlotSummaries]=useState(null);
  const[showSlots,setShowSlots]=useState(false);
  const[importText,setImportText]=useState("");
  const[showImport,setShowImport]=useState(false);

  useEffect(()=>{
    (async()=>{
      await migrateLegacy(); // Move old single-key save to slot 1
      const slot=await loadSlotNum();
      const d=await loadS(slot);
      setMeta(d);
      _goldBorders=(d.achv||[]).includes("legend_score");
      const r=await loadRun();
      setSavedRun(r);
    })();
  },[]);
  useEffect(()=>{Audio.muted=muted;},[muted]);
  // The ONLY path to endRun(false) is now through advanceFromScoring when handsAfter<=0.
  // The "Colony Fell" button at hLeft<=0 handles the UI case if scoring doesn't advance.
  // ★ FIX v49: Empty hand softlock — if hand is empty but hands remain, auto-resolve
  useEffect(()=>{
    if(ph==="playing"&&hLeft>0&&hand.length===0&&draw.length===0&&disc.length===0){
      // No cards anywhere — truly stuck. But double-check after a longer delay.
      const t=(()=>{try{return eTgt();}catch(e){return Infinity;}})();
      const timer=setTimeout(()=>{
        // Re-check: if cards appeared (from React batch), abort
        if(hand.length>0||draw.length>0||disc.length>0)return;
        if(rScore>=t){showOF(rScore,t,hLeft);}
        else{toast("💀","No cats left to play.","#ef4444");endRun(false,rScore);}
      },1000);
      return ()=>clearTimeout(timer);
    }
    // Also handle: hand is empty but draw/disc have cards (shouldn't happen, but safety)
    if(ph==="playing"&&hand.length===0&&(draw.length>0||disc.length>0)){
      const target=hs();const{drawn,nd,ndi}=drawN([...draw],[...disc],target);
      if(drawn.length>0){setHand(drawn);setDraw(nd);setDisc(ndi);}
    }
  },[ph,hLeft,hand.length,draw.length,disc.length]); // eslint-disable-line
  useEffect(()=>{
    if(ph==="nightCard"&&hand.length+draw.length>0){
      const snapshot={ante,blind,hand,draw,fams:fams.map(f=>f.id),ferv,rMaxF,gold,fallen,handBests,
        runBonus,runLog,denNews,isNinthDawn,hearthDust,firstHandPlayed,firstDenUsed,
        tempMods,_cid,_nis};
      saveRun(snapshot);
    }
  },[ph]); // eslint-disable-line

  const autoRef=useRef(null);
  const[introStep,setIntroStep]=useState(0);
  function startAutoPlay(){
    // Find best breed — select ALL matching (up to 5) by ID
    if(!hand||hand.length===0)return;
    const bc={};hand.forEach(c=>{bc[c.breed]=(bc[c.breed]||0)+1;});
    const best=Object.entries(bc).sort((a,b)=>b[1]-a[1]).find(([,v])=>v>=2);
    const ids=[];
    if(best)hand.forEach(c=>{if(c.breed===best[0]&&ids.length<5)ids.push(c.id);});
    else{ids.push(hand[0].id);if(hand.length>1)ids.push(hand[1].id);}
    if(ids.length===0)return;
    // Convert IDs to current indices
    const idxs=ids.map(id=>hand.findIndex(c=>c.id===id)).filter(i=>i>=0);
    setAutoPlay({step:-3,idxs});
  }

  function getMB(){
    if(!meta)return{gold:0,hands:0,discards:0,freeRecruits:0,fervor:0,bloodMemory:0,heirloom:0,draftPower:0,dustBonus:0,scarMult:0,startWard:0,grudgeWisdom:0,shelter:0,draftSize:0,traitLuck:0,bondBoost:0,nerveFloor:0,bossHand:0,recruitDiscount:0,breedBoost:0,startScroll:0,doubleBench:0,comboBoost:0,extraDraft:0,mythicChance:0};
    let b={gold:0,hands:0,discards:0,freeRecruits:0,fervor:0,bloodMemory:0,heirloom:0,draftPower:0,dustBonus:0,scarMult:0,startWard:0,grudgeWisdom:0,shelter:0,draftSize:0,traitLuck:0,bondBoost:0,nerveFloor:0,bossHand:0,recruitDiscount:0,breedBoost:0,startScroll:0,doubleBench:0,comboBoost:0,extraDraft:0,mythicChance:0};
    MILESTONES.forEach(m=>{if(meta.cats.length>=m.req)Object.entries(m.bonus).forEach(([k,v])=>{b[k]=(b[k]||0)+v;});});
    Object.entries(meta.ups||{}).forEach(([id,cnt])=>{const u=UPGRADES.find(x=>x.id===id);if(u)Object.entries(u.b).forEach(([k,v])=>{b[k]=(b[k]||0)+v*cnt;});});
    // v14: Cattery breed completion bonus
    if(meta.stats.disc){
      const breeds=new Set(meta.stats.disc.map(d=>d.split("-")[0]));
      if(BK.every(b=>breeds.has(b)))b.gold+=2; // all 4 breeds saved = +2G per night
    }
    return b;
  }
  const hasRelic=n=>!!(meta?.relics||[]).includes(n);
  const hs=()=>Math.max(4,BH+(cfx.hsMod||0));
  // ★ Nerve floor from Ember Within upgrade
  const nerveFloor=()=>Math.max(getMB().nerveFloor||0,tempMods.nerveLock||0);
  const eTgt=()=>{
    let t=Math.round(getTarget(ante,blind,isFirstRun,longDark)*(cfx.tgtMult||1)*getHeatMult(meta?.heat));
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
  const allC=React.useMemo(()=>[...hand,...draw,...disc],[hand,draw,disc]);

  // v10: Run log helper
  function logEvent(type,data){setRunLog(l=>[...l,{type,data,ante,blind,t:Date.now()}]);}

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
    const blindNames=["Dusk","Midnight","The Boss"];
    return{ante:na,blind:nb,target:Math.round(getTarget(na,nb,isFirstRun,longDark)),blindName:blindNames[nb]||"Dusk"};
  }

  function drawN(dp,di,n){let d=[...dp],ds=[...di];const r=[];for(let i=0;i<n;i++){if(!d.length&&ds.length){d=shuf(ds);ds=[];setReshuf(true);setTimeout(()=>setReshuf(false),500);}if(d.length)r.push(d.shift());else break;}return{drawn:r,nd:d,ndi:ds};}

  // Average (4-hand boss): +1+1+0 = +2/night → nerve 9 at N5.
  // God (1-hand boss): +1+1+3 = +5/night → nerve 9 at N2.
  function updFerv(s,cs,ct,ch,hasGrudgeProve){
    if(cfx.noNerve)return;
    setPFerv(ferv);
    const totalScore=cs+s;
    const handsAfter=ch-1;
    if(totalScore>=ct){
      let gain=1; // Dusk/Midnight: +1
      if(blind===2) gain=Math.max(0,handsAfter); // Boss: +handsRemaining (0-3)
      if(gain>0){
        const nx=Math.min(NERVE_MAX,ferv+gain);setFerv(nx);setRMaxF(m=>Math.max(m,nx));setFFlash("up");Audio.nerveUp();
      }
    }
    setTimeout(()=>setFFlash(null),400);
  }

  function startGame(st){
    clearRunSave();
    _cid=0;_nis=Math.floor(Math.random()*CAT_NAMES.length);_un.clear();
    const mb=getMB();const cats=[];
    const draftCount=3+(mb.extraDraft||0);
    const strayCount=18-draftCount;
    const perSeason=Math.floor(strayCount/4);
    const remainder=strayCount-perSeason*4;
    const strayBreeds=[];
    for(let s=0;s<4;s++)for(let i=0;i<perSeason;i++)strayBreeds.push(BK[s]);
    for(let i=0;i<remainder;i++)strayBreeds.push(pk(BK));
    const shuffledBreeds=shuf(strayBreeds);
    const usedCombos=new Set();
    for(let i=0;i<strayCount;i++){
      const sex=i%2===0?"M":"F";
      const breed=shuffledBreeds[i];
      let cat=gC({sex,breed,trait:PLAIN});
      // Ensure no duplicate season+power
      let key=`${cat.breed}-${cat.power}`;
      let attempts=0;
      while(usedCombos.has(key)&&attempts<10){
        cat.power=Math.max(1,Math.min(9,cat.power+(Math.random()<0.5?1:-1)));
        key=`${cat.breed}-${cat.power}`;
        attempts++;
      }
      usedCombos.add(key);
      cats.push(cat);
    }
    if(st){const tr=TRAITS.find(t=>t.name===st.trait.name)||st.trait;cats[0]=gC({breed:st.breed,power:Math.min(15,st.power+(mb.heirloom||0)),trait:tr,name:st.name});}
    // v18 Heat 5: start with a Hexed cat
    if(getHeatFx(meta?.heat).hexStart){const hexTr=TRAITS.find(t=>t.name==="Cursed");cats[1]=gC({trait:hexTr,name:"Cursed One"});}
    // v13: Draft system - pick 3 cats, then start with 15+3=18
    const baseCats=cats.slice(0,15);
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
    const dp=mb.draftPower||0;
    const hearthPrs=getHearthPairs(meta?.cats||[]);
    const ninthStarBonus=(meta?.relics||[]).includes(4)?1:0; // Ninth Star relic = +1P
    const genDraft=()=>{
      const traitFn=(mb.traitLuck)?()=>{const r=Math.random();if(r<0.55)return pk(RARE_TRAITS);return pk(COMMON_TRAITS);}:pickDraftTrait;
      const c=hearthPrs.length>0?genDescendant(meta.cats,dp+ninthStarBonus):gC({trait:traitFn()});
      c.power=clamp(c.power,2,6);
      return c;
    };
    // ★ Wider Horizons: 4 per wave instead of 3
    const waveSize=3+(mb.draftSize||0);
    const totalDraftCats=waveSize*3;
    // Guarantee: at least 1 Legendary (A tier), no Mythic (S tier) in draft
    // ★ Season-balanced draft: guarantee at least 2 of each season
    const draftBreeds=(n)=>{const base=[...BK,...BK]; // 2×4=8 guaranteed
      while(base.length<n)base.push(pk(BK));
      return shuf(base).slice(0,n);};
    let allDraft;
    let safety=0;
    do{
      const breeds=draftBreeds(totalDraftCats);
      allDraft=breeds.map(br=>{const c=genDraft();c.breed=br;c.name=gN(br,c.trait);c.quirk=pk(QUIRKS[br]||QUIRKS.Autumn);return c;});
      allDraft.forEach(c=>{c.stats.tp=3;});
      allDraft.forEach(c=>{
        if(c.hearthDescendant)return; // inherited traits are legitimate
        if((c.trait||PLAIN).tier==="mythic"||(c.trait||PLAIN).tier==="legendary"){
          c.trait=pk(RARE_TRAITS);c.name=gN(c.breed,c.trait);
        }
      });
      if(mb.mythicChance>0&&!allDraft.some(c=>(c.trait||PLAIN).tier==="legendary")){
        const cands=allDraft.filter(c=>!c.hearthDescendant&&(c.trait||PLAIN).tier!=="legendary");
        if(cands.length>0){const pick=pk(cands);pick.trait=pk(LEGENDARY_TRAITS);pick.name=gN(pick.breed,pick.trait);}
      }
      safety++;
    }while(safety<20&&(allDraft.reduce((s,c)=>s+c.power,0)<Math.round(20*totalDraftCats/9)||allDraft.reduce((s,c)=>s+c.power,0)>Math.round(55*totalDraftCats/9)));
    // Guarantee at least 1 Rare across draft — if none, upgrade a common
    if(!allDraft.some(c=>(c.trait||PLAIN).tier==="rare"||(c.trait||PLAIN).tier==="rare_neg")){
      const cands=allDraft.filter(c=>(c.trait||PLAIN).name==="Plain"||(c.trait||PLAIN).tier==="common");
      if(cands.length>0){const pick=pk(cands);pick.trait=pk(RARE_TRAITS);pick.name=gN(pick.breed,pick.trait);}
    }
    if(dp>0)allDraft.forEach(c=>{c.power=Math.min(15,c.power+dp);});
    // ★ Ensure visual diversity per wave — each wave of 3 should have different portrait types
    function ensureVisualDiversity(wave){
      if(wave.length<3)return wave;
      // Get portrait type for each cat
      const getType=(c)=>{
        const allT2=[c.trait,...(c.extraTraits||[])].filter(t=>t&&t.name!=="Plain");
        if(allT2.some(t=>t.tier==="mythic"))return"mythic";
        if(allT2.some(t=>t.tier==="legendary")&&c.power>=8)return"noble";
        if(allT2.some(t=>["Scrapper","Alpha"].includes(t.name)))return"alert";
        if(allT2.some(t=>["Wild","Chimera","Feral","Cursed"].includes(t.name)))return"wild";
        if(allT2.some(t=>["Devoted","Provider","Seer","Guardian"].includes(t.name)))return"gentle";
        if(allT2.some(t=>t.tier==="legendary"))return"noble";
        if(allT2.length>0)return"alert";
        return"plain";
      };
      const types=wave.map(getType);
      // If all same type, force variety by changing traits on duplicates
      const VARIETY_TRAITS=[
        {pool:RARE_TRAITS.filter(t=>["Scrapper","Guardian"].includes(t.name)),type:"alert"},
        {pool:COMMON_TRAITS.filter(t=>["Devoted","Provider","Seer"].includes(t.name)),type:"gentle"},
        {pool:RARE_TRAITS.filter(t=>["Cursed"].includes(t.name)),type:"wild"},
      ];
      for(let i=1;i<wave.length;i++){
        if(types.slice(0,i).includes(types[i])){
          // Duplicate type — try to swap trait for visual variety
          const vt=VARIETY_TRAITS.find(v=>v.type!==types[i]&&v.pool.length>0&&!types.slice(0,i).includes(v.type));
          if(vt){wave[i].trait=pk(vt.pool);wave[i].name=gN(wave[i].breed,wave[i].trait);types[i]=vt.type;}
        }
      }
      return wave;
    }
    const pool1=ensureVisualDiversity(allDraft.slice(0,waveSize));
    setDraftBase(baseCats);setDraftPool(pool1);setDraftPicked([]);setDraftRejects([]);
    setDraftWaves([ensureVisualDiversity(allDraft.slice(waveSize,waveSize*2)),ensureVisualDiversity(allDraft.slice(waveSize*2,waveSize*3))]);
    setDisc([]);setSel(new Set());setAnte(1);setBlind(0);setRScore(0);setLastHandIds([]);setLastHandLost(false);setEventHistory({});
    const hfx=getHeatFx(meta?.heat);setHLeft(4+mb.hands+(hfx.handMod||0));setDLeft(3+mb.discards+(hfx.discMod||0));setGold(3+mb.gold);
    const startNerve=(mb.fervor||0)+((meta?.relics||[]).includes(5)?1:0);
    setFams([]);setFerv(startNerve);setPFerv(null);setFFlash(null);setRMaxF(startNerve);
    setBoss(BOSSES[0]);setSRes(null);setSStep(-1);setScoringDone(false);setHearthPair(null);setStarter(null);
    setBossTraits([]);setIsNinthDawn(false);setDareBet(false);
    setCurses([]);setCfx({});setOData(null);
    setSellMode(false);setSellsLeft(2);
    const startWards=mb.startWard||0;
    const startFams=[];
    if(startWards>0){for(let i=0;i<startWards;i++){const w=pk(FAMS.filter(f=>!startFams.find(o=>o.id===f.id)));if(w)startFams.push(w);}}
    setFams(startFams);
    setDen([]);setDenRes(null);setDenStep(-1);setRunLog([]);setFallen([]);setAnteUp(null);setBossReward(null);setBossRewardChoices([]);prevRewardIdsRef.current=[];setRunBonus({hands:0});setDenNews([]);setFirstHandPlayed(false);setScoringCats([]);setAftermath([]);setColEvent(null);setColTargets([]);setTempMods({hands:0,discs:0,freeRecruits:0,nerveLock:0});setEventDenSafe(false);setEventDenBonus(0);setBabyNames({});setBabyNamingQueue([]);setFirstDenUsed(false);fcSeenRef.current={};setAutoPlay(null);setHtLevels({});setSScrolls([]);setDevotion({});
    setRunChips(0);setRunMult(0);setScoreShake(0);setClutch(false);setNewBest(null);setHandDiscovery([]);setDefeatData(null);setRerollCount(0);
    if(meta&&meta.cats.length>0){
      const dustBonus=getMB().dustBonus||0;
      const heatMult=getHeatFx(meta?.heat).dustMult||1;
      const hd=calcTotalHearthDust(meta.cats,dustBonus,heatMult);
      setHearthDust(hd.total);
      if(hd.total>0){const u={...meta,dust:meta.dust+hd.total};setMeta(u);saveS(u);}
    }else{setHearthDust(0);}
    if(mb.startScroll>0){
      const scrollHT=pk(HT.filter(h=>!h.hidden));
      if(scrollHT)setHtLevels(prev=>({...prev,[scrollHT.name]:(prev[scrollHT.name]||1)+1}));
    }
    if(meta&&meta.cats.length>0&&meta.stats.r>0){
      setHearthFlash(meta.cats);setPh("hearthFlash");
      setTimeout(()=>{setHearthFlash(null);setPh("draft");
        // Progressive unlock toasts — show what's new this run
        if(meta.stats.r===1){
          setTimeout(()=>toast("🆕","Recruit unlocked! Pay 🐟 to draw extra cats.","#4ade80",4000),800);
          setTimeout(()=>toast("🆕","Interest unlocked! Save 5+ 🐟 for bonus each round.","#4ade80",4000),2000);
          setTimeout(()=>toast("🆕","Scrolls unlocked! Level up hand types in the shop.","#4ade80",4000),3200);
        }
      },2000);
    }else{setPh("draft");}
  }

  function resumeRun(sr){
    _cid=sr._cid||100;_nis=sr._nis||sr._ni||0;_un.clear();
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
    [...sHand,...sDraw,...(sr.fallen||[])].forEach(c=>{if(c&&c.name){const fn=c.name.split(" ")[0];_un.add(fn);}});
    const mb=getMB();const hfx=getHeatFx(meta?.heat);
    setHand(sHand);setDraw(sDraw);setDisc([]);setSel(new Set());
    setAnte(sr.ante);setBlind(sr.blind);setRScore(0);
    setFams((sr.fams||[]).map(fid=>typeof fid==="string"?FAMS.find(f=>f.id===fid)||{id:fid,name:"?",icon:"?",desc:"",eff:()=>({})}:fid));setFerv(sr.ferv||0);setPFerv(null);setFFlash(null);setRMaxF(sr.rMaxF||0);
    setGold(sr.gold||0);setFallen(sr.fallen||[]);setHandBests(sr.handBests||{});
    setRunBonus(sr.runBonus||{hands:0});setRunLog(sr.runLog||[]);
    setDenNews(sr.denNews||[]);setIsNinthDawn(sr.isNinthDawn||false);
    setHearthDust(sr.hearthDust||0);setFirstHandPlayed(sr.firstHandPlayed||false);
    setFirstDenUsed(sr.firstDenUsed||false);setTempMods(sr.tempMods||{hands:0,discs:0,freeRecruits:0,nerveLock:0});
    setBoss(BOSSES[Math.min(sr.ante-1,BOSSES.length-1)]);
    setSRes(null);setSStep(-1);setScoringDone(false);setHearthPair(null);setStarter(null);
    setBossTraits([]);setDareBet(false);setCurses([]);setCfx({});setOData(null);
    setSellMode(false);setSellsLeft(2);setDen([]);setDenRes(null);setDenStep(-1);
    setScoringCats([]);setAftermath([]);setColEvent(null);setColTargets([]);
    setEventDenSafe(false);setEventDenBonus(0);setBabyNames({});setBabyNamingQueue([]);
    setRunChips(0);setRunMult(0);setScoreShake(0);setClutch(false);setNewBest(null);
    setDefeatData(null);setRerollCount(0);setBloodMemMsg(null);
    const bh=4+mb.hands+(hfx.handMod||0)+(sr.runBonus?.hands||0);
    const bd=3+mb.discards+(hfx.discMod||0);
    setHLeft(bh);setDLeft(bd);
    setNightCard({ante:sr.ante,blind:sr.blind});setPh("nightCard");
    setSavedRun(null);
    toast("🏠","Colony restored. The fire still burns.","#fbbf24");
  }

  function startNinthDawn(){
    startGame(null); // Start with no companion
    setIsNinthDawn(true);
    // Boss selection will be randomized in nextBlind
  }

  function pickDraft(i){
    const cat=draftPool[i];const picked=[...draftPicked,cat];
    const tn=(cat.trait||PLAIN).name;const p=cat.power;
    const draftNarr=tn!=="Plain"&&(cat.trait||{}).tier==="legendary"?`${cat.name.split(" ")[0]}. P${p}. You don't find cats like this. They find you.`
      :tn!=="Plain"&&(cat.trait||{}).tier==="rare"?`${cat.name.split(" ")[0]}. P${p} ${tn}. They came with a story already started.`
      :p>=8?`${cat.name.split(" ")[0]}. P${p}. The others step aside when this one walks past.`
      :p<=3?`${cat.name.split(" ")[0]}. P${p}. No power yet. Give them time.`
      :`${cat.name.split(" ")[0]}. P${p}. Another name for the record.`;
    toast(BREEDS[cat.breed].icon,draftNarr,BREEDS[cat.breed].color);
    // Track rejected breeds - they'll influence future wanderers
    const rejects=[...draftRejects,...draftPool.filter((_,j)=>j!==i).map(c=>c.breed)];
    setDraftRejects(rejects);
    const isFirstEverRun=!meta||meta.stats.r===0;
    if(!isFirstEverRun){
      setNamingCat(cat);
      setDraftPicked(picked);
      if(picked.length>=(3+(getMB().extraDraft||0))){
        setPh("naming");
        cat._finalPick=true;
      }else{
        const waveIdx=picked.length-1;
        const np=draftWaves[waveIdx]||Array.from({length:3+(getMB().draftSize||0)},()=>gC({trait:pickDraftTrait()}));
        setDraftPool(np);
        setPh("naming");
      }
      return;
    }
    // First run: skip naming, go straight to next wave or finalize
    if(picked.length>=(3+(getMB().extraDraft||0))){
      finalizeDraft(picked);
    }else{
      setDraftPicked(picked);
      const waveIdx=picked.length-1;
      const np=draftWaves[waveIdx]||Array.from({length:3+(getMB().draftSize||0)},()=>gC({trait:pickDraftTrait()}));
      setDraftPool(np);
    }
  }
  function finalizeDraft(picked){
      const traitVal=t=>t.tier==="mythic"?5:t.tier==="legendary"?3:t.tier==="rare"?2:t.tier==="rare_neg"?-1:t.name==="Plain"?0:1;
      const draftStr=picked.reduce((s,c)=>s+c.power+traitVal(c.trait||PLAIN),0);
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
          c.power=Math.max(1,Math.min(6,c.power+bonus*sign));
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

  function checkHandDiscovery(htName,comboName){
    const discoveries=[];
    // Check primary hand
    const ht=HT.find(h=>h.name===htName);
    if(ht&&ht.hidden&&!(meta?.stats?.dh||[]).includes(htName))discoveries.push(htName);
    // Check power combo
    if(comboName){
      const pc=POWER_COMBOS.find(p=>p.name===comboName);
      if(pc&&pc.hidden&&!(meta?.stats?.dh||[]).includes(comboName))discoveries.push(comboName);
    }
    if(discoveries.length>0){
      setMeta(m=>{const nm={...m,stats:{...m.stats,dh:[...(m.stats.dh||[]),...discoveries]}};saveS(nm);return nm;});
      setHandDiscovery(discoveries);
      const label=discoveries.join(" + ");
      toast("✨",`SECRET ${discoveries.length>1?"COMBOS":"COMBO"} DISCOVERED: ${label}!`,"#c084fc");
      Audio.tierReveal(4);
    }
  }

  function advanceFromScoring(){
    if(!scoringDone||!sRes)return;
    // ★ FIX: Ref-based re-entry guard — prevents double-click from decrementing hLeft twice
    if(advancingRef.current)return;
    advancingRef.current=true;
    try{
    if(autoPlay){setAutoPlay(null);setGuide({step:3,msg:""});}
    const result=sRes;const cats=scoringCats;
    setScoringDone(false);
    const tgt=eTgt();const ns=rScore+result.total;
    setRScore(ns);setGold(g=>Math.max(0,g+result.bG));
    // ★ Hand type leveling — playing a hand type gives it XP toward next level
    if(result.ht){
      setHtLevels(prev=>{
        const cur=prev[result.ht]||1;
        const xpNeeded=cur*3;
        const xpKey=result.ht+"_xp";
        const curXp=(prev[xpKey]||0)+1;
        if(curXp>=xpNeeded){
          setDenNews(n=>[...n,{icon:"📜",text:`${result.ht} → Lv${cur+1}!`,color:"#fbbf24"}]);
          return{...prev,[result.ht]:cur+1,[xpKey]:0};
        }
        return{...prev,[xpKey]:curXp};
      });
    }
    if(result.ht&&meta){setMeta(m=>{const hp={...(m.stats.handTypePlays||{})};hp[result.ht]=(hp[result.ht]||0)+1;return{...m,stats:{...m.stats,handTypePlays:hp}};});}
    // ★ Season Devotion — count each cat's season + mixed diversity
    setDevotion(prev=>{
      const next={...prev};
      cats.forEach(c=>{next[c.breed]=(next[c.breed]||0)+1;});
      Object.keys(DEVOTION_MILESTONES).forEach(breed=>{
        const oldCount=(prev[breed]||0);const newCount=(next[breed]||0);
        const ms=DEVOTION_MILESTONES[breed]||[];
        ms.forEach(m=>{
          if(oldCount<m.at&&newCount>=m.at){
            const icon=breed==="Mixed"?"🌈":(BREEDS[breed]?.icon||"✦");
            const color=breed==="Mixed"?"#e8e6e3":(BREEDS[breed]?.color||"#fbbf24");
            setDenNews(n=>[...n,{icon,text:`${m.name}: ${m.desc}`,color}]);
          }
        });
      });
      return next;
    });
    // ★ Track last hand for Loyal/Stubborn traits
    setLastHandIds(cats.map(c=>c.id));
    setLastHandLost(result.total < tgt * 0.3); // "lost" = scored less than 30% of target
    updFerv(result.total,rScore,tgt,hLeft,result.hasGrudgeProve);
    if(dareBet){
      if(result.total>=tgt*0.5){setFerv(f=>Math.min(NERVE_MAX,f+6));toast("🔥","THE DARE IS MET. +6 Nerve!","#fbbf24");}
      else{toast("💀","The dare... failed. The number stares back.","#ef4444");}
      setDareBet(false);
    }
    
    logEvent("hand",{score:result.total,type:result.ht,cats:cats.map(c=>c.name.split(" ")[0]).join(", "),nerve:NERVE[ferv].name});
    cats.forEach(c=>{
      // ★ Kitten grows up! First play transitions from kitten to adult
      const wasKitten=catIsKitten(c);
      c.stats.tp++;c.stats.ts+=result.total;if(result.total>c.stats.bs){c.stats.bs=result.total;c.stats.bh=result.ht;}
      if(wasKitten){
        const fn=c.name.split(" ")[0];
        const hasTrait=c.trait&&c.trait.name!=="Plain";
        setDenNews(n=>[...n,{icon:"🐾",text:`${fn} grew up!${hasTrait?" "+c.trait.icon+" "+c.trait.name+" awakens.":""}`,color:BREEDS[c.breed]?.color||"#fbbf24"}]);
        c._grewUp=true;assignEpithet(c);Audio.kittenGrow();
      }
    });
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
    setSel(new Set());setHLeft(h=>h-1);setRecruitsThisHand(0);
    setRunChips(0);setRunMult(0);setNewBest(null);setScoringDone(false);
    setSRes(null);setSStep(-1);
    // ★ FIX v49: Use local variable for remaining hands, not stale state
    const handsAfter=hLeft-1;
    if(ns>=tgt){
      if(blind===2){
        Audio.bossClear();
        cats.forEach(c=>assignEpithet(c,{bossNight:true,ante}));
        const decisive=cats.sort((a,b)=>b.power-a.power)[0];
        if(decisive&&handsAfter>=0)assignEpithet(decisive,{decisive:true});
        // Apply epithets to deck + fire toasts
        [...cats].forEach(c=>{if(c.epithet){
          if(c._newEpithet){delete c._newEpithet;toast("🏷️",`${c.name.split(" ")[0]} earned: "${c.epithet}"`,BREEDS[c.breed]?.color||"#fbbf24",2500);Audio.epithetEarned();}
          [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>x.id===c.id?{...x,epithet:c.epithet}:x));});
        }});
      }
      if(handsAfter<=0){setClutch(true);Audio.clutchWin();}
      setTimeout(()=>{setClutch(false);showOF(ns,tgt,handsAfter);},handsAfter<=0?800:400);
    }else if(handsAfter<=0){
      // Fail = game over. No nerve adjustment needed.
      endRun(false,ns);
    }
    // Bloodied trait: scars instead of injures.
    else{
      const isLastHand=handsAfter<=0;
      const shouldInjure=blind===2&&(ante>=2||isLastHand);
      if(shouldInjure){
        const allC2=[...hand,...draw,...disc];
        const eligible=allC2.filter(c=>!c.injured);
        if(eligible.length>0){
          const victim=pk(eligible);
          const isBloodied=bossTraits.some(bt=>bt.fx.bloodied);
          if(isBloodied){
            [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>x.id===victim.id?{...x,scarred:true}:x));});
            toast("🩹",`${victim.name.split(" ")[0]} was scarred by ${boss?.name||"the boss"}!`,"#ef4444");
            victim.scarred=true;assignEpithet(victim);
            if(victim._newEpithet){delete victim._newEpithet;toast("🏷️",`${victim.name.split(" ")[0]} earned: "${victim.epithet}"`,BREEDS[victim.breed]?.color||"#fbbf24",2500);Audio.epithetEarned();}
            [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>x.id===victim.id?{...x,epithet:victim.epithet}:x));});
          }else{
            [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>x.id===victim.id?{...x,injured:true,injuryTimer:2,power:Math.max(1,x.power)}:x));});
            toast("💀",`${victim.name.split(" ")[0]} was injured by ${boss?.name||"the boss"}!`,"#ef4444");
          }
        }
      }
      setPh("playing");
    }
    advancingRef.current=false;
    }catch(e){console.error("advanceFromScoring error:",e);advancingRef.current=false;
      // ★ FIX v49: Don't end run on error — return to playing state so player can retry
      toast("⚠","Something went wrong. Try playing again.","#ef4444");
      setPh("playing");
    }
  }

  function skipScoring(){
    if(scoringDone||!sRes||!scoreEndRef.current)return;
    if(stRef.current)clearTimeout(stRef.current);
    const end=scoreEndRef.current;
    setSStep(sRes.bd.length-1);
    setRunChips(end.chips);setRunMult(end.mult);
    setScoreShake(end.shk);setTimeout(()=>setScoreShake(0),400+end.shk*100);
    const prev=handBests[end.ht]||0;
    if(end.total>prev){setHandBests(b=>({...b,[end.ht]:end.total}));setNewBest(end.ht);}
    checkHandDiscovery(end.ht,end.combo);
    setAftermath(end.aft);
    setScoringDone(true);
    if(!autoPlay&&guide&&guide.step===2)setTimeout(()=>setGuide(g=>g?({...g,step:3}):null),400);
  }

  const toggleS=i=>{if(ph!=="playing"||autoPlay)return;Audio.cardSelect();const s=new Set(sel);if(s.has(i))s.delete(i);else if(s.size<5)s.add(i);setSel(s);
    if(guide&&guide.step===0&&s.size>=2){
      const sc=[...s].map(j=>hand[j]).filter(Boolean);const bc={};sc.forEach(c=>{bc[c.breed]=(bc[c.breed]||0)+1;});
      if(Object.values(bc).some(v=>v>=2))setGuide(g=>({...g,step:1}));
    }
  };

  function playH(){
    if(!sel.size||hLeft<=0)return;
    if(actionLock.current)return;actionLock.current=true;
    Audio.cardPlay();
    setDenNews([]); // clear level-up/devotion notifications from previous hand
    if(guide&&guide.step<=1)setGuide(g=>({...g,step:2}));
    setFirstHandPlayed(true);
    const cats=[...sel].map(i=>hand[i]).filter(Boolean);
    setScoringCats(cats);setAftermath([]);
    const beatingPace=rScore>=eTgt()*0.4;
    const activeBT=blind===2?bossTraits:[];
    const result=calcScore(cats,fams,ferv,cfx,{gold,deckSize:allC.length,discSize:disc.length,handSize:hs(),beatingPace,bossTraitFx:activeBT,scarMult:getMB().scarMult||0,grudgeWisdom:getMB().grudgeWisdom||0,hasMastery:!!(getMB().xp),bondBoost:getMB().bondBoost||0,comboBoost:getMB().comboBoost||0,doubleBench:getMB().doubleBench||0,lastHandIds,lastHandLost,htLevels,devotion,bench:hand.filter(c=>!cats.find(x=>x.id===c.id))});
    advancingRef.current=false; // ★ FIX: Reset re-entry guard for new hand
    actionLock.current=false; // ★ FIX: Clear action lock
    setSRes(result);setSStep(-1);setPh("scoring");
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
    const aft=[];
    cats.forEach(c=>{
      if(result.total>c.stats.bs)aft.push({icon:"🏆",text:`${c.name.split(" ")[0]} PB: ${result.total.toLocaleString()}`,color:"#fbbf24"});
    });
    const bondedInHand=cats.filter(c=>c.bondedTo&&cats.find(x=>x.id===c.bondedTo));
    if(bondedInHand.length>=2)aft.push({icon:"💕",text:`${bondedInHand[0].name.split(" ")[0]} & ${bondedInHand[1].name.split(" ")[0]}: Together`,color:"#f472b6"});
    const isFirstCascade=isFirstRun&&ante===1&&blind===0&&!firstHandPlayed;
    scoreEndRef.current={chips:result.chips,mult:result.mult,total:result.total,ht:result.ht,combo:result.combo,aft,shk:getShakeIntensity(result.total),isFirstCascade,stepTotals};
    function getStepDelay(s,total){
      const slowMult=isFirstCascade?1.8:meta&&meta.stats.r<=1?1.4:meta&&meta.stats.r>=5?0.8:1;
      const tempo=Math.max(0.5, Math.min(1.4, 7/total)); // slightly slower per-step since fewer steps
      const step=result.bd[s];
      const isLast=s===total-1;
      const isPenult=s===total-2;
      const isNeg=step&&(step.mult<0||step.type==="curse"||step.type==="grudge_tension");
      const hasX=step&&!!step.xMult;
      const isNerve=step&&step.type==="nerve";
      const isCombo=step&&step.type==="combo";
      const isBond=step&&(step.type==="bond"||step.type==="grudge_tension");
      const isBigCat=step&&step.isBigCat;
      const isThreshold=s===thresholdStep;

      // Negative steps: still fast
      if(isNeg) return Math.round(200*tempo*slowMult);

      // ★ DOPAMINE: Threshold crossing step gets extra freeze-frame (THE moment)
      if(isThreshold&&!hasX) return Math.round(Math.max(600, 800*Math.max(0.7,tempo))*slowMult);

      // xMult freeze-frame: THE moment
      if(hasX) return Math.round(Math.max(650, 850*Math.max(0.7,tempo))*slowMult);

      // Nerve climax
      if(isNerve) return Math.round(Math.max(550, 750*Math.max(0.7,tempo))*slowMult);

      // Bond/grudge: emotional moment — hold longer to see cat highlights
      if(isBond) return Math.round(Math.max(550, 720*tempo)*slowMult);

      // Penultimate: anticipation
      if(isPenult) return Math.round(Math.max(450, 600*tempo)*slowMult);

      // Last step: the reveal
      if(isLast) return Math.round(Math.max(550, 750*tempo)*slowMult);

      // First step (hand type): dramatic reveal — hold long for impact
      if(s===0) return Math.round(1100*tempo*slowMult);

      // Combo step: second dramatic reveal — nearly as long as hand type
      if(isCombo) return Math.round(Math.max(900, 1000*tempo)*slowMult);

      // ★ DOPAMINE: Big cat (loaded with traits/scars) gets more weight
      if(isBigCat) return Math.round(Math.max(400, 550*tempo)*slowMult);

      // Second step: building
      if(s===1) return Math.round(500*tempo*slowMult);

      // Third: still building
      if(s<=3) return Math.round(450*tempo*slowMult);

      // Everything else: cascade flow — still slower than before
      const cascade=Math.max(200, Math.round((350-s*8)*tempo));
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
          if(s.xMult){
            Audio.xMultSlam(s.xMult);setScoreShake(Math.ceil(s.xMult));setTimeout(()=>setScoreShake(0),300);
            setScoringFlash(s.xMult>=1.5?"#fef08a":"#fbbf24");setTimeout(()=>setScoringFlash(null),150);
            setMultPop({val:s.xMult,label:s.label,mode:"xmult"});setTimeout(()=>setMultPop(null),1200);
          }
          else if(s.type==="hand"){
            const htIdx=HT.findIndex(h=>s.label.startsWith(h.name));
            const shk=htIdx>=6?4:htIdx>=4?3:htIdx>=2?2:1;
            Audio.comboHit();setScoringFlash(htIdx>=4?"#fef08a":"#fbbf24");setScoreShake(shk);setTimeout(()=>{setScoreShake(0);setScoringFlash(null);},200+shk*50);
          }
          else if(s.type==="combo"){Audio.comboHit();setScoreShake(3);setScoringFlash("#c084fc");setTimeout(()=>{setScoreShake(0);setScoringFlash(null);},300);}
          else if(s.type==="grudge_tension"){Audio.grudgeTense();setScoringFlash("#ef4444");setTimeout(()=>setScoringFlash(null),200);setScoreShake(2);setTimeout(()=>setScoreShake(0),300);}
          else if(s.type==="curse"||s.mult<0){setScoringFlash("#ef4444");setTimeout(()=>setScoringFlash(null),200);}
          else if(s.type==="bond"||s.type==="lineage")Audio.bondChime();
          else if(s.isBigCat)Audio.bigCatHit(progress);
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
        checkHandDiscovery(end.ht,end.combo);
        setAftermath(end.aft);
        setScoringDone(true);
        if(!autoPlay&&guide&&guide.step===2)setTimeout(()=>setGuide(g=>g?({...g,step:3}):null),400);
        const tier=getScoreTier(end.total);
        if(tier&&tier.label)Audio.tierReveal(Math.min(5,Math.floor(end.total/5000)));
      }
    }
    stRef.current=setTimeout(()=>{
      // Phase 1: Hand type sound + reveal
      {const _hti=HT.findIndex(h=>h.name===result.ht);Audio.handType(Math.min(3,Math.floor((_hti>=0?_hti:4)/2)));}
      setSStep(0);setRunChips(scoreEndRef.current.stepTotals[0].chips);setRunMult(scoreEndRef.current.stepTotals[0].mult);
      stRef.current=setTimeout(animStep,getStepDelay(0,tot));
    },800);
  }

  const MAX_DISCARD=3;
  function discardH(){
    if(!sel.size||dLeft<=0||cfx.noDisc)return;
    if(sel.size>MAX_DISCARD){toast("♻️",`Max ${MAX_DISCARD} cards per discard`,"#ef4444");return;}
    if(actionLock.current)return;actionLock.current=true;requestAnimationFrame(()=>{actionLock.current=false;});
    const d=[...sel].map(i=>hand[i]).filter(Boolean);const rem=hand.filter((_,i)=>!sel.has(i));
    let extraDraw=[];let healIds=[];let powerUps={};let nerveDelta=0;let goldDelta=0;let handDelta=0;let discDelta=0;
    d.forEach(cat=>{
      if(catHas(cat,"Scrapper")){nerveDelta++;toast("🥊","Scrapper discarded: +1 Nerve","#fb923c");}
      else if(catHas(cat,"Cursed")){nerveDelta++;toast("💀","Cursed discarded: +1 Nerve","#d97706");}
      else if(catHas(cat,"Nocturnal")){nerveDelta+=2;toast("🌙","Nocturnal discarded: +2 Nerve","#c084fc");}
      else if(catHas(cat,"Devoted")&&cat.bondedTo){
        powerUps[cat.bondedTo]=(powerUps[cat.bondedTo]||0)+1;
        toast("🫀","Devoted discarded: mate +1 Power","#f472b6");
      }
      else if(catHas(cat,"Guardian")){
        const healTarget=[...rem,...draw,...disc].find(c=>c.injured&&!healIds.includes(c.id));
        if(healTarget){
          healIds.push(healTarget.id);
          toast("🛡️",`Guardian healed ${healTarget.name.split(" ")[0]}`,"#4ade80");
        }else{toast("🛡️","Guardian discarded: no injured to heal","#888");}
      }
      else if(catHas(cat,"Stubborn")){nerveDelta++;toast("🪨","Stubborn discarded: +1 Nerve","#9ca3af");}
      else if(catHas(cat,"Stray")){extraDraw.push(draw.length>0?draw[0]:gC({trait:PLAIN}));toast("🐈","Stray wandered: +1 draw","#67e8f9");}
      else if(catHas(cat,"Loyal")){toast("🫂","Loyal inspires: +1M to all drawn cats","#f472b6");}
      else if(catHas(cat,"Scavenger")){goldDelta+=2;toast("🌾","Scavenger discarded: +2🐟","#4ade80");}
    });
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
    if(nerveDelta>0)setFerv(f=>Math.min(NERVE_MAX,f+nerveDelta));
    if(goldDelta>0)setGold(g=>g+goldDelta);
    if(handDelta>0)setHLeft(h=>h+handDelta);
    if(discDelta>0)setDLeft(v=>v+discDelta);
    Audio.cardSelect();
  }

  const[recruitsThisHand,setRecruitsThisHand]=useState(0);
  const[freeRecruitsUsed,setFreeRecruitsUsed]=useState(0); // per blind
  const devFxRef=useRef({});
  useEffect(()=>{try{devFxRef.current=getAllDevotionFx(devotion);}catch(e){}},[devotion]);
  const totalFreeRecruits=()=>{
    // Sources: Winter Permafrost (1), Quick Instincts upgrade, Hearth milestones, Summer Fury devotion, boss rewards
    const mb=getMB();
    const winterPerm=devFxRef.current.freeRecruit?1:0;
    return winterPerm+(mb.freeRecruits||0)+(devFxRef.current.freeRecruits||0)+(tempMods.freeRecruits||0);
  };
  const recruitCost=()=>{
    const freeLeft=Math.max(0,totalFreeRecruits()-freeRecruitsUsed);
    if(freeLeft>0)return 0;
    const paidCount=recruitsThisHand-Math.min(recruitsThisHand,totalFreeRecruits());
    const base=[1,2,4,8][Math.min(Math.max(0,paidCount),3)];
    const discount=getMB().recruitDiscount||0;
    return Math.max(0,base-discount);
  };
  function recruitCat(){
    if(ph!=="playing")return;
    const cost=recruitCost();
    if(gold<cost)return;
    if(draw.length===0&&disc.length===0)return;
    if(actionLock.current)return;actionLock.current=true;requestAnimationFrame(()=>{actionLock.current=false;});
    setGold(g=>g-cost);Audio.recruit();
    // Track free recruit usage
    if(cost===0)setFreeRecruitsUsed(f=>f+1);
    // Draw one cat from draw pile (shuffle disc back if needed)
    if(draw.length>0){
      setHand(h=>[...h,draw[0]]);setDraw(d=>d.slice(1));
    }else{
      const shuffled=shuf([...disc]);
      setHand(h=>[...h,shuffled[0]]);setDraw(shuffled.slice(1));setDisc([]);
    }
    setRecruitsThisHand(r=>r+1);
    setSel(new Set());
    toast("📣",`Recruited! Hand +1 (cost ${cost}🐟)`,"#fbbf24");
    Audio.cardSelect();
  }

  // v37: Ward actives removed — wards are passive only

  function showOF(fs,tgt,uh){
    const excess=Math.max(0,fs-tgt);
    const pct=tgt>0?fs/tgt:1;
    const baseR=cfx.famine?0:Math.floor(Math.min(6,2+Math.max(0,pct-1)*4));
    const bossBonus=blind>=2?2:0;
    const gR=cfx.famine?0:baseR+bossBonus;
    const excessGold=0;
    const interest=Math.min(5,Math.floor(gold/5));
    setGold(gold+gR+interest);
    setOData({excess,uh,gR,fs,tgt,interest,excessGold,pct:Math.round(pct*100)});setPh("overflow");
  }

  function endRun(won,finalScore){
    try{
    try{clearRunSave();}catch(e){}
    const fScore=finalScore!=null?finalScore:rScore;
    const bName=["Dusk","Midnight",(boss?.name)||"The Boss"][blind]||"Unknown";
    setHearthPair(won?[]:null);
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
      const bossRecord={...(meta.stats.bossRecord||{})};
      if(blind===2&&boss){
        const bk=boss.id||"unknown";
        if(!bossRecord[bk])bossRecord[bk]={w:0,l:0};
        if(won||ante>=MX)bossRecord[bk].w++;
        else bossRecord[bk].l++;
      }
      const heatWins=(meta.stats.heatWins||0)+(won&&curHeat>=1?1:0);
      const hearthTotal=(meta.stats.hearthTotal||0); // incremented on cat save, not here
      const u={...meta,heat:newHeat,ninthDawnCleared,relics,
        stats:{...meta.stats,r:meta.stats.r+1,w:meta.stats.w+(won?1:0),ba:Math.max(meta.stats.ba,ante),hs:Math.max(meta.stats.hs,fScore),mf:Math.max(meta.stats.mf,rMaxF),mh:Math.max(meta.stats.mh||0,curHeat),bossRecord,heatWins,ninthDawnCleared,hearthTotal}};
      const newAchv=[...(u.achv||[])];
      ACHIEVEMENTS.forEach(a=>{if(!newAchv.includes(a.id)&&a.check(u.stats,deathless,newAchv))newAchv.push(a.id);});
      u.achv=newAchv;
      setMeta(u);
      try{await saveS(u);}catch(e){console.warn("Save failed:",e);}
      const prevUl=getUnlocks(meta);
      const newUl=getUnlocks(u);
      const unlockMsgs=[];
      if(!prevUl.fams&&newUl.fams)unlockMsgs.push("🛡️ Wards unlocked in the Market!");
      const prevAchv=meta.achv||[];
      newAchv.filter(id=>!prevAchv.includes(id)).forEach(id=>{
        const a=ACHIEVEMENTS.find(x=>x.id===id);
        if(a)unlockMsgs.push(`${a.icon} ${a.name} — ${a.reward}`);
      });
      const prevChapter=getChapterTitle(meta);
      const newChapter=getChapterTitle(u);
      if(newChapter&&(!prevChapter||prevChapter.num!==newChapter.num)){
        unlockMsgs.push(`📖 Chapter ${newChapter.num} · ${newChapter.name}`);
      }
      setNewUnlocks(unlockMsgs);
    }catch(e){console.warn("Post-run save error:",e);}})();}
    }catch(e){console.error("endRun crashed:",e);setPh("defeat");setDefeatData({score:finalScore||rScore||0,target:0,line:"Something went wrong.",blind:"?"});}
  }

  const savingRef=useRef(false);
  async function saveCatM(cat){if(!meta||savingRef.current)return;
    savingRef.current=true;
    try{
    const allC=[...hand,...draw,...disc];
    const hasKids=allC.some(c=>c.parentIds?.includes(cat.id));
    const hasParents=cat.parentIds?.some(pid=>allC.some(c=>c.id===pid));
    const ser={id:cat.id,breed:cat.breed,power:cat.power,sex:cat.sex||"M",
      trait:{name:(cat.trait||PLAIN).name,icon:(cat.trait||PLAIN).icon,desc:(cat.trait||PLAIN).desc,tier:(cat.trait||PLAIN).tier},
      name:cat.name,parentBreeds:cat.parentBreeds,parentIds:cat.parentIds||null,
      bonded:!!cat.bondedTo,scarred:!!cat.scarred,
      lineage:!!(hasKids||hasParents),
      stats:{...cat.stats},savedAt:Date.now(),fromAnte:ante,
      story:(()=>{
        const fn=cat.name.split(" ")[0];const tp=cat.stats?.tp||0;const bs=cat.stats?.bs||0;
        const traitName=(cat.trait||PLAIN).name;
        const parts=[`${fn} survived ${ante} night${ante>1?"s":""}.`];
        if(traitName!=="Plain")parts.push(`${(cat.trait||PLAIN).icon} ${traitName}.`);
        if(cat.scarred&&cat.bondedTo){const mate=allC.find(c=>c.id===cat.bondedTo);parts.push(`Scarred and bonded${mate?" to "+mate.name.split(" ")[0]:""}.`);}
        else if(cat.scarred)parts.push("Carried a scar from the den.");
        else if(cat.bondedTo){const mate=allC.find(c=>c.id===cat.bondedTo);parts.push(`Bonded${mate?" to "+mate.name.split(" ")[0]:""}.`);}
        if(tp>=10)parts.push(`Played ${tp} hands.`);
        if(bs>5000)parts.push(`Best score: ${bs.toLocaleString()}.`);
        else if(tp<3)parts.push("Quiet. Reliable. Survived when others couldn't.");
        return parts.join(" ");
      })()};
    const newPair=[...hearthPair,ser];
    if(newPair.length>=2){
      const pairId=Date.now();
      newPair[0].pairId=pairId;newPair[1].pairId=pairId;
      const d1=`${newPair[0].breed}-${(newPair[0].trait||PLAIN).name}`,d2=`${newPair[1].breed}-${(newPair[1].trait||PLAIN).name}`;
      const newDisc=[...meta.stats.disc];
      if(!newDisc.includes(d1))newDisc.push(d1);if(!newDisc.includes(d2))newDisc.push(d2);
      const u={...meta,cats:[...meta.cats,...newPair],stats:{...meta.stats,disc:newDisc,hearthTotal:(meta.stats.hearthTotal||0)+2}};
      setMeta(u);await saveS(u);setHearthPair(null); // null = done
      savingRef.current=false;
    }else{
      setHearthPair(newPair); // one picked, need the other sex
      savingRef.current=false;
    }
    }catch(e){savingRef.current=false;}
  }

  function nextBlind(){
    const nb=blind>=2?0:blind+1,na=blind>=2?ante+1:ante;
    if(blind>=2&&ante>=MX){endRun(true);return;}
    setBlind(nb);setAnte(na);setRScore(0);setLastHandIds([]);setLastHandLost(false);setFreeRecruitsUsed(0);
    const mb=getMB();const hfx2=getHeatFx(meta?.heat);const bossHandBonus=(nb===2&&mb.bossHand)?mb.bossHand:0;
    const dFx=getAllDevotionFx(devotion);
    setHLeft(4+mb.hands+runBonus.hands+tempMods.hands+(hfx2.handMod||0)+bossHandBonus+dFx.hands);
    setDLeft(3+mb.discards+tempMods.discs+(hfx2.discMod||0)+dFx.discards);
    setTempMods({hands:0,discs:0,freeRecruits:0,nerveLock:0});
    if(nb===0){
      setBoss(BOSSES[Math.min(na,BOSSES.length)-1]||BOSSES[0]);
      if(wins>=3&&!isNinthDawn){
        const pool=FULL_BOSS_POOL.filter(b=>b.name!==boss?.name); // avoid same boss twice
        setBoss(pk(pool)||BOSSES[Math.min(na,BOSSES.length)-1]);
      }
      setBossTraits(pickBossTraits(na,meta?.heat,isNinthDawn));
      if(isNinthDawn&&na>=MX){setBoss(THE_REMEMBERING);}
      setFirstHandPlayed(false);
      if(na>ante){
        // v10: Ante transition
        setAnteUp({from:ante,to:na,target:Math.round(getTarget(na,0,isFirstRun,longDark))});
        logEvent("night",{from:ante,to:na});
      }
    }
    if(nb===2){const hfxC=getHeatFx(meta?.heat);const c=genCurses(na,hfxC.extraCurse||0);setCurses(c);const fx=buildCfx(c);setCfx(fx);
      // Famine: no foraging + lose stored interest
      if(fx.famine)setGold(g=>Math.max(0,g-Math.min(5,Math.floor(g/5)))); // lose interest
    }
    else{setCurses([]);setCfx({});}
    [setHand,setDraw,setDisc].forEach(setter=>{
      setter(arr=>arr.map(c=>{
        if(!c.injured)return c;
        const timer=(c.injuryTimer||2)-1;
        const fastHeal=catHas(c,"Scrapper");
        if(timer<=0||fastHeal){return{...c,injured:false,injuryTimer:0};}
        return{...c,injuryTimer:timer};
      }));
    });
    const all=shuf([...hand,...draw,...disc].map(c=>{
      if(pendingRenames.current[c.id]){const parts=c.name.split(" ");parts[0]=pendingRenames.current[c.id].split(" ")[0];return{...c,name:pendingRenames.current[c.id]};}
      return c;
    }));
    pendingRenames.current={};
    setHand(all.slice(0,BH));setDraw(all.slice(BH));setDisc([]);
    setSel(new Set());setSellMode(false);
    if(nb===2){setPh("bossIntro");Audio.bossIntro();}
    else{setNightCard({ante:na,blind:nb});setPh("nightCard");}
  }

  function genShop(){
    // ★ Track shop visit — stops market button glow on first run
    setSeen(s=>({...s,shop:true}));
    const hfxS=getHeatFx(meta?.heat);
    const catPrice=(a,c)=>{
      const tier=(c.trait||PLAIN).tier;
      const tierCost=tier==="rare_neg"?2:tier==="mythic"?12:tier==="legendary"?8:tier==="rare"?5:tier==="common"?3:2;
      const powCost=Math.max(0,Math.floor((c.power-3)/2)); // P3=0, P5=1, P7=2, P9=3
      return tierCost+powCost+Math.floor(a/2)+(hfxS.shopCost||0);
    };
    const nc=2;const sc=[];
    for(let i=0;i<nc;i++){
      const c=gC(i===0?{trait:pickTrait(ante>=3)}:{trait:PLAIN});
      c._price=catPrice(ante,c);sc.push(c);
    }
    setSCats(sc);
    // ★ Generate scrolls for hand type leveling
    setSScrolls(genScrolls(ante,htLevels));
    const ul=getUnlocks(meta);
    const STARTER_WARD_IDS=["f5","f6","f8"]; // Golden Yarn, Moonstone, Witch's Bell
    if(isFirstRun&&fams.length===0){
      // First shop ever — offer 2 starter wards at discounted price (2🐟)
      const starters=shuf(FAMS.filter(f=>STARTER_WARD_IDS.includes(f.id)&&!fams.find(o=>o.id===f.id)))
        .slice(0,2).map(w=>({...w,_starter:true}));
      setSFams(starters);
    }else{
      setSFams(ul.fams?shuf(FAMS.filter(f=>!fams.find(o=>o.id===f.id))).slice(0,2):[]);
    }
    setSellMode(false);setSellsLeft(2);setDen([]);setRerollCount(0);
    // ★ First run first shop: auto-open wards tab so players discover them
    setShopTab(isFirstRun&&fams.length===0?"wards":"cats");
  }

  const famPrice=(f)=>f?._starter?2:(5+Math.floor(ante/2)+(getHeatFx(meta?.heat).shopCost||0));
  function buyCat(i){const p=sCats[i]._price||3;if(gold<p)return;Audio.buy();setGold(g=>g-p);const c={...sCats[i]};delete c._price;
    const bTier=(c.trait||PLAIN).tier;
    if(bTier==="mythic"){Audio.mythicDiscover();toast("🌟",`MYTHIC! ${c.name.split(" ")[0]} — ${c.trait.icon}${c.trait.name}!`,"#c084fc",3000);}
    else if(bTier==="legendary"){Audio.legendaryDiscover();toast("✨",`LEGENDARY! ${c.name.split(" ")[0]} — ${c.trait.icon}${c.trait.name}!`,"#f59e0b",2500);}
    setDraw(d=>[...d,c]);setSCats(s=>s.filter((_,j)=>j!==i));logEvent("buy",{name:c.name,breed:c.breed,cost:p});
    const buyLines=["Another mouth. Another heartbeat.","They were waiting for a colony that would have them.","One more name to remember.","The colony grows."];
    toast(BREEDS[c.breed].icon,`${c.name.split(" ")[0]} joined. ${buyLines[(c.power+ante)%buyLines.length]}`,BREEDS[c.breed].color);}
  function buyFam(i){const f=sFams[i];const fp=famPrice(f);if(gold<fp||fams.length>=MF)return;Audio.buy();setGold(g=>g-fp);const clean={...f};delete clean._starter;setFams(fs=>[...fs,clean]);setSFams(s=>s.filter((_,j)=>j!==i));toast(f.icon,`${f.name} watches over you`,"#fbbf24");}
  function buyScroll(i){const s=sScrolls[i];if(!s||gold<s.price)return;Audio.buy();setGold(g=>g-s.price);
    setHtLevels(prev=>({...prev,[s.name]:(prev[s.name]||1)+1,[s.name+"_xp"]:0}));
    setSScrolls(sc=>sc.filter((_,j)=>j!==i));
    toast("📜",`${s.name} → Lv${s.nextLv}! ${s.nextBase?s.nextBase.c+"C×"+s.nextBase.m+"M":""}`,"#fbbf24");
  }

  function reroll(){const rc=2+ante+rerollCount;if(gold<rc)return;setGold(g=>g-rc);setRerollCount(c=>c+1);genShop();}

  function getPartingGifts(cat){
    const gifts=[];let narr="";
    const isNeg=(cat.trait||PLAIN).tier==="rare_neg"||(cat.extraTraits||[]).some(t=>t.tier==="rare_neg");
    if(isNeg){return{goldVal:0,gifts,narr:`${cat.name.split(" ")[0]} slipped away before dawn. No one stopped them.`};}
    const tier=(cat.trait||PLAIN).tier;
    const tierVal=tier==="mythic"?6:tier==="legendary"?4:tier==="rare"?3:tier==="common"?2:1;
    const powVal=Math.max(0,Math.floor((cat.power-3)/2));
    let goldVal=Math.max(1,tierVal+powVal);
    if(cat.scarred){goldVal+=1;gifts.push("+1 Nerve");narr=`${cat.name.split(" ")[0]} walked different after the scar. Heavier. But they walked.`;}
    if(cat.power>=8){gifts.push("Weakest gains power");if(!narr)narr=`${cat.name.split(" ")[0]} was the strongest. Now someone else has to be.`;}
    if(cat.bondedTo){gifts.push("Partner gains power");if(!narr)narr=`The one who stayed didn't eat for two days.`;}
    if(!narr)narr=`${cat.name.split(" ")[0]} left before sunrise.${gifts.length>0?" They left something behind.":""}`;
    return{goldVal,gifts,narr};
  }
  function sellCat(cat){
    if(allC.length<=MIN_DECK||sellsLeft<=0)return;
    const pg=getPartingGifts(cat);
    if(pg.goldVal<0&&gold<Math.abs(pg.goldVal))return;
    setFerv(f=>Math.max(0,f-1));
    setGold(g=>g+pg.goldVal);
    setSellsLeft(s=>s-1);
    logEvent("sell",{name:cat.name.split(" ")[0],gold:pg.goldVal});
    setHand(h=>h.filter(c=>c.id!==cat.id));setDraw(d=>d.filter(c=>c.id!==cat.id));setDisc(di=>di.filter(c=>c.id!==cat.id));
    if(cat.scarred)setFerv(f=>Math.min(NERVE_MAX,f+1));
    if(cat.bondedTo){
      [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(c=>{
        if(c.id===cat.bondedTo)return{...c,power:Math.min(15,c.power+2),bondedTo:null,story:[...(c.story||[]),`Watched ${cat.name.split(" ")[0]} go`]};
        return c;
      }));});
    }
    if(cat.power>=8){
      const uAll2=[...hand,...draw,...disc].filter(c=>c.id!==cat.id);
      if(uAll2.length>0){
        const weakest=uAll2.reduce((a,b)=>a.power<=b.power?a:b);
        [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(c=>c.id===weakest.id?{...c,power:Math.min(15,c.power+1)}:c));});
      }
    }
    // Toast + narration
    const giftStr=pg.gifts.length>0?` (${pg.gifts.join(", ")})`:"";
    const sellLines=["Gone. Not to the dark — just gone.","The colony gets lighter.","One less name. The rest carry more."];
    toast("🕊️",`${cat.name.split(" ")[0]} released. ${sellLines[ante%sellLines.length]}${giftStr}`,pg.goldVal>=0?"#c084fc":"#ef4444");
  }
  function sellFam(f){setGold(g=>g+3);setFams(fs=>fs.filter(x=>x.id!==f.id));}
  const shelterFromWards=fams.filter(f=>f.passive&&f.eff).reduce((s,f)=>{const fx=f.eff([]);return s+(fx.shelter||0);},0);
  const MAX_ISOLATE=campMode?2:(3+(getMB().shelter||0)+shelterFromWards+(eventDenBonus||0));
  const toggleDen=c=>{if(den.find(d=>d.id===c.id))setDen(d=>d.filter(x=>x.id!==c.id));else if(den.length<MAX_ISOLATE)setDen(d=>[...d,c]);};
  function endNight(){
    const dAll=[...hand,...draw,...disc];
    const shelterCats=den.filter(c=>!c.injured); // sheltered cats can breed (injured can't)
    const wildCats=dAll.filter(c=>!den.find(d=>d.id===c.id));
    if(shelterCats.length<2&&wildCats.length<2){nextBlind();return;}
    setDenNews([]);
    const hasMM=false;
    const heatFight=getHeatFx(meta?.heat).denFight||0;
    const baseCtx={draftRejects,deckSize:dAll.length,nerveLvl:ferv,breedBoost:(getAllDevotionFx(devotion).breedBoost||0)+(getMB().breedBoost||0)};
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
            if(c.bondedTo===r.c1.id||c.bondedTo===r.c2.id)return{...c,bondedTo:null};
            return c;
          }));
        });
        logEvent("bond",{c1:r.c1.name.split(" ")[0],c2:r.c2.name.split(" ")[0]});
      }
      if(r.type==="breed")logEvent("breed",{parents:r.c1.name.split(" ")[0]+" & "+r.c2.name.split(" ")[0],baby:r.baby.name,breed:r.baby.breed});
      if(r.type==="fight")logEvent("fight",{loser:r.loser.name.split(" ")[0],dmg:r.dmg});
      if(r.type==="death"){logEvent("death",{victim:r.victim.name});
        Audio.denDeath();
        toast("💀",`${r.victim.name.split(" ")[0]} is gone.`,"#ef4444",3500);
        setFallen(f=>{
        const isFirstEver=f.length===0&&(meta?.stats?.r||0)<=1;
        if(isFirstEver)toast("🕯️","You will lose cats. This is the first. Remember their name.","#ef4444",4000);
        return[...f,{name:r.victim.name,breed:r.victim.breed,night:ante,memorial:getDeathMemorial(r.victim,ante)}];
      });}
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
      if(r.type==="teach"){
        logEvent("teach",{parent:r.parent.name,child:r.child.name,trait:r.trait.name});
        [setHand,setDraw,setDisc].forEach(setter=>{
          setter(arr=>arr.map(c=>c.id===r.child.id?{...c,trait:r.child.trait,extraTraits:[...(r.child.extraTraits||[])],story:[...(c.story||[]).slice(-3),`Learned ${r.trait.icon}${r.trait.name} from ${r.parent.name.split(" ")[0]}`]}:c));
        });
      }
    });
    // v14: Build den news for play screen
    const news=results.map(r=>{
      if(r.type==="breed"){
        const bTier=(r.baby.trait||PLAIN).tier;
        const isLeg=bTier==="legendary";const isMyth=bTier==="mythic";
        if(isMyth){toast("🌟",`MYTHIC! ${r.baby.name.split(" ")[0]} — ${r.baby.trait.icon}${r.baby.trait.name}!`,"#c084fc",3000);Audio.mythicDiscover();}
        else if(isLeg){toast("✨",`LEGENDARY! ${r.baby.name.split(" ")[0]} — ${r.baby.trait.icon}${r.baby.trait.name}!`,"#f59e0b",2500);Audio.legendaryDiscover();}
        return{icon:isMyth?"🌟":isLeg?"✨":"🐣",text:`${r.baby.name.split(" ")[0]} born${(bTier!=="common"&&bTier!=="plain")?" — "+r.baby.trait.icon+r.baby.trait.name:""}`,color:isMyth?"#c084fc":isLeg?"#f97316":"#4ade80"};
      }
      if(r.type==="fight")return{icon:"🩹",text:`${r.loser.name.split(" ")[0]} scarred`,color:"#ef4444"};
      if(r.type==="death")return{icon:"💀",text:`${r.victim.name.split(" ")[0]} is gone. The colony is smaller now.`,color:"#ef4444"};
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
    results.forEach(r=>{
      const applyEp=(cat,ctx={})=>{assignEpithet(cat,ctx);if(cat._newEpithet){delete cat._newEpithet;toast("🏷️",`${cat.name.split(" ")[0]} earned: "${cat.epithet}"`,BREEDS[cat.breed]?.color||"#fbbf24",2500);Audio.epithetEarned();}[setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(c=>c.id===cat.id?{...c,epithet:cat.epithet,story:cat.story}:c));});};
      if(r.type==="fight"&&r.loser.scarred)applyEp(r.loser);
      if(r.type==="bond"){applyEp(r.c1);applyEp(r.c2);}
      if(r.type==="reconcile"||r.type==="reconcile_bond"){r.c1._grudgeResolved=true;r.c2._grudgeResolved=true;applyEp(r.c1);applyEp(r.c2);}
    });
    results.forEach(r=>{
      let target=null,trait=null,chance=0;
      if(r.type==="fight"&&!r.wasInjured){target=r.loser;trait=TRAITS.find(t=>t.name==="Scrapper");chance=0.35;}
      if(r.type==="mentor"){target=r.young;trait=pk(COMMON_TRAITS);chance=0.3;}
      if(r.type==="training"){target=Math.random()<0.5?r.c1:r.c2;trait=pk(COMMON_TRAITS);chance=0.30;}
      if(r.type==="growth"){target=r.cat;trait=pk(COMMON_TRAITS);chance=0.2;}
      if(r.type==="bond"){target=Math.random()<0.5?r.c1:r.c2;trait=TRAITS.find(t=>t.name==="Devoted");chance=0.20;}
      if(r.type==="breed"){target=Math.random()<0.5?r.c1:r.c2;trait=TRAITS.find(t=>t.name==="Stubborn");chance=0.15;}
      if(r.type==="reconcile"){target=Math.random()<0.5?r.c1:r.c2;trait=TRAITS.find(t=>t.name==="Wild");chance=0.20;}
      if(r.type==="reconcile_bond"){target=Math.random()<0.5?r.c1:r.c2;trait=TRAITS.find(t=>t.name==="Echo");chance=0.25;}
      if(r.type==="found"){target=r.cat;trait=TRAITS.find(t=>t.name==="Scavenger");chance=0.25;}
      if(target&&trait&&Math.random()<chance){
        const gained=addTrait(target,trait);
        if(gained){
          r.traitGained={cat:target,trait};
          [setHand,setDraw,setDisc].forEach(setter=>{
            setter(arr=>arr.map(c=>c.id===target.id?{...c,trait:target.trait,extraTraits:[...(target.extraTraits||[])],story:[...(c.story||[]).slice(-3),`Gained ${trait.icon}${trait.name}`]}:c));
          });
        }
      }
    });
    setDenRes(results);setDen([]);setPh("denResults");
    if(meta){
      const reconcileCount=results.filter(r=>r.type==="reconcile"||r.type==="reconcile_bond").length;
      const kittenCount=results.filter(r=>r.type==="breed").length + results.filter(r=>r.twin2).length;
      if(reconcileCount>0||kittenCount>0){
        setMeta(m=>{const nm={...m,stats:{...m.stats,grudgesResolved:(m.stats.grudgesResolved||0)+reconcileCount,kittensTotal:(m.stats.kittensTotal||0)+kittenCount}};saveS(nm);return nm;});
      }
    }
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
          const delay=r.type==="death"?720:r.type==="breed"?560:r.type==="bond"||r.type==="reconcile_bond"?480:r.type==="fight"?440:r.type==="grudge"||r.type==="reconcile"?400:320;
          denStRef.current=setTimeout(denAnim,delay);
        }
      };
      const first=results[0];
      const firstDelay=first.type==="death"?720:first.type==="breed"?560:first.type==="bond"?480:400;
      denStRef.current=setTimeout(denAnim,firstDelay);
    }
  }

  // ═══════════════════════════════════════════════════
  // v15: COLONY EVENTS
  // ═══════════════════════════════════════════════════
  function fireEvent(){
    const all=[...hand,...draw,...disc];
    const eventSource=isNinthDawn?[...COLONY_EVENTS,...NINTH_DAWN_EVENTS]:COLONY_EVENTS;
    const mandatory=eventSource.find(e=>e.mandatory&&(!e.minNight||ante>=(longDark&&e.minNight===5?MX:e.minNight))&&(!e.maxNight||ante<=(longDark&&e.maxNight===5?MX:e.maxNight))&&!eventHistory['_seen_'+e.id]);
    if(mandatory){
      let targets=[];
      if(mandatory.needsCat==="random"){targets=[pk(all)];}
      else if(mandatory.needsCat==="pair"){const s=shuf(all);targets=s.length>=2?[s[0],s[1]]:[s[0],s[0]];}
      setColEvent(mandatory);setColTargets(targets);setPh("event");return;
    }
    let pool=[...eventSource].filter(e=>{
      if(e.mandatory)return false; // already handled above
      if(e.ninthDawn&&!isNinthDawn)return false;
      const mn=longDark&&e.minNight===5?MX:e.minNight; // ★ v50: Long Dark shifts "last night" events
      const mx2=longDark&&e.maxNight===5?MX:e.maxNight;
      if(mn&&ante<mn)return false;
      if(mx2&&ante>mx2)return false;
      if(e.needsFallen&&fallen.length<e.needsFallen)return false;
      if(e.chainRequires&&!eventHistory[e.chainRequires])return false;
      if(e.metaRequires&&!e.metaRequires(meta?.stats||{}))return false;
      if(e.metaExcludes&&e.metaExcludes(meta?.stats||{}))return false;
      return true;
    });
    if(isNinthDawn){const ndEvts=pool.filter(e=>e.ninthDawn);if(ndEvts.length>0)pool=ndEvts;}
    if(all.length<2)pool=pool.filter(e=>e.needsCat!=="pair");
    if(all.length<1)pool=pool.filter(e=>!e.needsCat);
    const lastTag=eventHistory._lastTag||"";
    const variedPool=pool.filter(e=>e.tag!==lastTag);
    if(variedPool.length>=3)pool=variedPool; // only enforce if enough variety
    if(lastTag==="sacrifice")pool=pool.filter(e=>e.tag!=="sacrifice");
    const chainEvts=pool.filter(e=>e.chainRequires);
    const baseEvts=pool.filter(e=>!e.chainRequires);
    const hardEvents=["sickness","the_storm","the_challenge","the_sacrifice"];
    const weighted=ante>=4?[...baseEvts,...baseEvts.filter(e=>hardEvents.includes(e.id))]:baseEvts;
    // Chain events get 5x weight: add them 5 times to the pool
    const finalPool=[...weighted,...chainEvts,...chainEvts,...chainEvts,...chainEvts,...chainEvts];
    const evt=pk(finalPool.length>0?finalPool:pool);
    if(!evt){setPh("shop");return;}
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
    if(fx.chainSet)setEventHistory(h=>({...h,[fx.chainSet]:true}));
    if(fx.chronicleSet&&meta){
      setMeta(m=>{const nm={...m,stats:{...m.stats,chronicle:{...(m.stats.chronicle||{}),[fx.chronicleSet]:true}}};saveS(nm);return nm;});
      const arcToasts={
        scarKeeper_acknowledged:"⚔️ The Scar Keeper remembers your choice...",
        scarKeeper_mapped:"🗺️ The map will guide future colonies...",
        scarKeeper_complete:"🏛️ The Scar Keeper's arc is complete.",
        historian_met:"📖 The Historian will return...",
        historian_complete:"📜 The Historian's story is told.",
        fireSpreader_found:"🔥 A fire burns in the distance...",
        fireSpreader_complete:"🏕️ The Tenth Colony's story continues.",
      };
      if(arcToasts[fx.chronicleSet])toast("✦",arcToasts[fx.chronicleSet],"#c084fc",3000);
    }
    if(colEvent.tag)setEventHistory(h=>({...h,_lastTag:colEvent.tag}));
    if(colEvent.mandatory)setEventHistory(h=>({...h,['_seen_'+colEvent.id]:true}));
    const lateGame=ante>=4;
    if(fx.gold)setGold(g=>Math.max(0,g+fx.gold));
    if(fx.fervor){const boost=lateGame&&fx.fervor>=2?1:0;const total=fx.fervor+boost;if(total>0)setFerv(f=>Math.min(NERVE_MAX,f+total));}
    if(fx.bestPower){
      const bp=fx.bestPower+(lateGame?1:0);
      const best=[...all].sort((a,b)=>b.power-a.power)[0];
      if(best){
        [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>{
          if(x.id!==best.id)return x;
          const u={...x,power:Math.min(15,x.power+bp)};
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
    if(fx.tradeCat&&all.length>MIN_DECK){
      const weakest=[...all].sort((a,b)=>a.power-b.power)[0];
      if(weakest){
        [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.filter(x=>x.id!==weakest.id));});
        setDraw(d=>[...d,gC({power:Math.floor(Math.random()*3)+4,trait:PLAIN})]);
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
    if(fx.pactBond&&targets.length>=2){
      [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>{
        if(x.id===targets[0].id)return{...x,bondedTo:targets[1].id,power:Math.min(15,x.power+1)};
        if(x.id===targets[1].id)return{...x,bondedTo:targets[0].id,power:Math.min(15,x.power+1)};
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
        if(x.id===targets[scar].id)return{...x,scarred:true,grudgedWith:[...(x.grudgedWith||[]).filter(id=>id!==targets[save].id),targets[save].id]};
        return x;
      }));});
    }
    if(fx.mapFollow&&all.length>MIN_DECK){
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
    if(fx.sacrifice&&all.length>MIN_DECK){
      const victim=targets[0]||[...all].sort((a,b)=>a.power-b.power)[0];
      if(victim){
        [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.filter(x=>x.id!==victim.id));});
        setFallen(f=>[...f,{name:victim.name,breed:victim.breed,night:ante}]);
        setGold(g=>g+6);setEventDenSafe(true);
        logEvent("death",{victim:victim.name+" (offered themselves)"});
      }
    }
    if(fx.exile&&targets[0]&&all.length>MIN_DECK){
      const t=targets[0];
      [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.filter(x=>x.id!==t.id));});
      logEvent("exile",{victim:t.name+" (exiled)"});
    }
    if(fx.allPower){
      [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>({...x,power:Math.min(15,x.power+fx.allPower)})));});
    }
    if(fx.fullHeal){
      [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>({...x,injured:false,injuryTimer:0})));});
      if(lateGame)setFerv(f=>Math.min(NERVE_MAX,f+1));
    }
    if(fx.targetTrait&&targets[0]){
      const rt=pk(COMMON_TRAITS);
      [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>{if(x.id===targets[0].id){addTrait(x,rt);return{...x};}return x;}));});
    }
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
    // ★ XP tier jump effects
    // (targetXpJump removed — XP ranks are cosmetic only, use targetPower instead)
    if(fx.targetGambleScar&&targets[0]){
      if(Math.random()<0.5){[setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>x.id===targets[0].id?{...x,scarred:true}:x));});}
    }
    // (bothXpJump removed — use bothPower instead)
    if(fx.addNamedTrait){
      const nt=TRAITS.find(t=>t.name===fx.addNamedTrait);
      if(nt){const plain=all.filter(c=>catIsPlain(c));const pick=plain.length>0?pk(plain):pk(all);
        if(pick){[setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>{if(x.id===pick.id){addTrait(x,nt);return{...x};}return x;}));});}
      }
    }
    if(fx.addWard){
      const available=FAMS.filter(w=>!fams.find(f=>f.id===w.id));
      if(available.length>0&&fams.length<MF){const w=pk(available);setFams(fs=>[...fs,w]);toast(w.icon,`${w.name} found`,"#fbbf24");}
      else{setGold(g=>g+5);toast("🐟","No room for a ward. +5 Rations instead.","#fbbf24");}
    }
    if(fx.specificTrait&&fx.rareTrait){
      const best=[...all].sort((a,b)=>b.power-a.power)[0];
      const st=TRAITS.find(t=>t.name===fx.specificTrait)||pk(RARE_TRAITS);
      if(best){[setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>{if(x.id===best.id){addTrait(x,st);return{...x};}return x;}));});}
    }
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
    if(fx.echoGamble){
      const t=pk(all);if(t){
        if(Math.random()<0.6){[setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>x.id===t.id?{...x,power:Math.min(15,x.power+2)}:x));});}
        else{[setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>x.id===t.id?{...x,scarred:true,power:Math.max(1,x.power-1)}:x));});}
      }
    }
    if(fx.mysteryGift){
      const r=Math.random();
      if(r<0.4){setGold(g=>g+6);fx._mysteryResult="gold";}
      else if(r<0.75){const avail=FAMS.filter(f=>!fams.find(ff=>ff.id===f.id));if(avail.length){setFams(f=>[...f,pk(avail)].slice(0,5));fx._mysteryResult="ward";}else{setGold(g=>g+5);fx._mysteryResult="gold";}}
      else{const c=pk(CURSES.filter(x=>x.tier<=2));if(c){setCurses(cu=>[...cu,c]);fx._mysteryResult="curse";}else fx._mysteryResult="gold";}
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
        setFerv(f=>Math.min(NERVE_MAX,f+1));
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
      setFerv(f=>Math.min(NERVE_MAX,f+2));
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
      setFerv(f=>Math.min(NERVE_MAX,f+2));setGold(g=>g+4);
    }
    if(fx.debtRefuse){
      // Bold choice — rewarded or punished
      if(Math.random()<0.5){setFerv(f=>Math.min(NERVE_MAX,f+3));}
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
        setGold(g=>g+half*3);setFerv(f=>Math.min(NERVE_MAX,f+2));
      }else{// lost. nothing gained
      }
    }
    if(fx.truthTrust&&targets[0]){
      const t=targets[0];
      const r=Math.random();
      if(r<0.4){// they saw the way. rare trait
        const rt=pk(RARE_TRAITS);
        [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>{if(x.id===t.id){addTrait(x,rt);return{...x};}return x;}));});
      }else if(r<0.7){// false vision. but nerve from conviction
        setFerv(f=>Math.min(NERVE_MAX,f+3));
      }else{// the wall stares back
        [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>x.id===t.id?{...x,scarred:true,power:Math.max(1,x.power-1)}:x));});
        setFerv(f=>Math.min(NERVE_MAX,f+1));
      }
    }
    if(fx.addStrays){
      for(let i=0;i<fx.addStrays;i++)setDraw(d=>[...d,gC({trait:PLAIN})]);
    }
    if(fx.visionPeek){
      // Seer-style: reveal what's coming + chance for good/bad outcome
      const r=Math.random();
      if(r<0.5){setFerv(f=>Math.min(NERVE_MAX,f+2));} // the vision was hopeful
      else if(r<0.8){setGold(g=>g+4);} // saw where supplies were hidden
      else{// saw something terrible. but knowledge is power
        const t=pk(all);if(t){[setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>x.id===t.id?{...x,scarred:true}:x));});}
        setFerv(f=>Math.min(NERVE_MAX,f+3));
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
    if(fx.tempDiscs)lines.push({text:`+${fx.tempDiscs} Free Recruits next round`,color:"#4ade80",icon:"📣"});
    if(fx.tradeCat)lines.push({text:"Weakest traded for a stronger stranger",color:"#fbbf24",icon:"🔄"});
    if(fx.catFight)lines.push({text:"One stands taller. One bears a scar.",color:"#ef4444",icon:"⚔️"});
    if(fx.bothWeaken)lines.push({text:"Both separated. Both diminished.",color:"#ef4444",icon:"💔"});
    if(fx.rareTrait&&!fx.specificTrait)lines.push({text:"Best cat touched by something ancient",color:"#fbbf24",icon:"✨"});
    if(fx.specificTrait)lines.push({text:`Best cat gained ${fx.specificTrait}. The flame lives in them now.`,color:"#fbbf24",icon:"🔥"});
    if(fx.eventDenSafe)lines.push({text:"Next den is protected. No fights.",color:"#4ade80",icon:"🕊️"});
    if(fx.eventDenBonus)lines.push({text:"+1 Shelter slot this night.",color:"#4ade80",icon:"🏠"});
    if(fx.halfGold)lines.push({text:"Lost half your rations saving everyone",color:"#ef4444",icon:"🐟"});
    if(fx.weakDmg)lines.push({text:"The youngest took the worst of it (-2 Power each)",color:"#ef4444",icon:"🌊"});
    if(fx.healScars)lines.push({text:"Scarred cats healed (+1 Power each)",color:"#4ade80",icon:"💚"});
    if(fx.pactBond)lines.push({text:`${targets[0]?.name.split(" ")[0]} and ${targets[1]?.name.split(" ")[0]} bonded. +1 Power each.`,color:"#f472b6",icon:"💕"});
    if(fx.pactGrudge)lines.push({text:`Both grew stronger. But the grudge is real.`,color:"#fb923c",icon:"⚡"});
    if(fx.choiceSave!==undefined&&targets.length>=2){const sv=fx.choiceSave,sc=sv===0?1:0;lines.push({text:`${targets[sv].name.split(" ")[0]} saved. ${targets[sc].name.split(" ")[0]} scarred. They won't forget.`,color:"#fbbf24",icon:"⚖️"});}
    if(fx.mapFollow)lines.push({text:"One cat left. A stranger arrived.",color:"#c084fc",icon:"🗺️"});
    if(fx.targetScrapper)lines.push({text:`${targets[0]?.name.split(" ")[0]} gained Scrapper. The cost may come later.`,color:"#fb923c",icon:"🥊"});
    if(fx.targetHeal)lines.push({text:`${targets[0]?.name.split(" ")[0]} healed. +2 Power. But one less hand tomorrow.`,color:"#4ade80",icon:"💚"});
    if(fx.sacrifice)lines.push({text:`${targets[0]?.name.split(" ")[0]||"One"} walked into the dark. The den sleeps safely tonight.`,color:"#ef4444",icon:"🕊️"});
    if(fx.exile&&targets[0])lines.push({text:`${targets[0].name.split(" ")[0]} was cast out. The colony is lighter.`,color:"#ef4444",icon:"🚪"});
    if(fx.allPower)lines.push({text:`All cats +${fx.allPower} Power`,color:"#4ade80",icon:"⭐"});
    if(fx.fullHeal)lines.push({text:"All injuries healed.",color:"#4ade80",icon:"💚"});
    if(fx.targetTrait&&targets[0])lines.push({text:`${targets[0].name.split(" ")[0]} learned something from the wall.`,color:"#c084fc",icon:"📜"});
    if(fx.targetNamedTrait&&targets[0])lines.push({text:`${targets[0].name.split(" ")[0]} gained ${fx.targetNamedTrait}.`,color:"#4ade80",icon:TRAITS.find(t=>t.name===fx.targetNamedTrait)?.icon||"✨"});
    if(fx.bestNamedTrait)lines.push({text:`Best cat gained ${fx.bestNamedTrait}.`,color:"#fbbf24",icon:TRAITS.find(t=>t.name===fx.bestNamedTrait)?.icon||"✨"});
    if(fx.bothNamedTrait&&targets.length>=2)lines.push({text:`${targets[0].name.split(" ")[0]} and ${targets[1].name.split(" ")[0]} both gained ${fx.bothNamedTrait}.`,color:"#4ade80",icon:TRAITS.find(t=>t.name===fx.bothNamedTrait)?.icon||"✨"});
    if(fx.bondedPower)lines.push({text:`All bonded cats +${fx.bondedPower} Power. Love fuels rage.`,color:"#f472b6",icon:"💕"});
    if(fx.addPhoenixKitten)lines.push({text:"A kitten appeared. Power 1. Trait: Phoenix. Born from memory.",color:"#fbbf24",icon:"🔥"});
    if(fx.dareBet)lines.push({text:"The dare is set. Next hand decides.",color:"#fbbf24",icon:"📊"});
    if(fx.echoGamble)lines.push({text:"The echo answered. Something changed.",color:"#c084fc",icon:"🔊"});
    if(fx.mysteryGift){const mr=fx._mysteryResult||"gold";lines.push({text:mr==="gold"?"Rations inside. Practical.":mr==="ward"?"A ward, wrapped in old cloth. Still warm.":"A curse. Someone else's bad luck, now yours.",color:mr!=="curse"?"#fbbf24":"#ef4444",icon:mr==="gold"?"🐟":mr==="ward"?"🛡️":"💀"});}
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

  async function buyUpg(u){if(!meta||meta.dust<u.cost)return;const cur=meta.ups[u.id]||0;if(cur>=u.max)return;const um={...meta,dust:meta.dust-u.cost,ups:{...meta.ups,[u.id]:cur+1}};setMeta(um);await saveS(um);
    const upgVoice={"gold":"They buried provisions for the ones who came next.","hands":"Steadier now. The old fire taught patience.","freeRecruits":"The remembered ones call reinforcements from the shadows.","fervor":"The old fire burns in the new colony's veins.","heirloom":"The bloodline carries what the mind forgets.","bloodMemory":"Memory in the blood. Deeper than names.","dustBonus":"The stars owe you. They're starting to pay.","xpBonus":"Every hand teaches more now.","scarMemory":"Scars carry wisdom. The Hearth cats knew this.","startWard":"Protection. The first gift of the remembered.","grudgeWisdom":"The old scars teach patience. Grudges sting less now.","shelter":"Deeper burrows. Safer dreams.","recruitDiscount":"Sharper eyes. The colony knows who to call.","breedBoost":"The earth remembers how to grow.","startScroll":"Ancient knowledge, passed down in paw prints.","doubleBench":"Those who watch learn twice as much.","comboBoost":"Power aligned. The colony resonates.","extraDraft":"One more voice in the chorus.","mythicChance":"The stars choose their champions.","bondBoost":"Love is the strongest multiplier.","bossHand":"One more breath. One more chance.","draftPower":"Stronger stock. The bloodline remembers.","draftSize":"Wider nets catch rarer fish.","traitLuck":"The colony remembers what it needs."};
    toast("✦",upgVoice[u.id]||"Something the Hearth cats knew. Something they left for you.","#c084fc");}

  const selC=React.useMemo(()=>[...sel].map(i=>hand[i]).filter(Boolean),[sel,hand]);
  const preview=React.useMemo(()=>sel.size>0?evalH(selC):null,[sel.size,selC]);
  const tgt=eTgt();const isBoss=blind===2;
  const blindN=["Dusk","Midnight",(boss?.name)||"The Boss"];
  // v37: Night mods removed

  const W={width:"100%",minHeight:"100vh",background:isBoss?"linear-gradient(180deg,#140808,#1a0808,#0d0815)":ferv>=7?"linear-gradient(180deg,#0f0808,#1a0a0a,#0d0815)":"linear-gradient(180deg,#06060f,#0a0a1a,#0d0815)",color:"#e8e6e3",fontFamily:"'Cinzel',serif",display:"flex",flexDirection:"column",alignItems:"center",position:"relative",overflow:"hidden",transition:"background .8s"};
  const BG={position:"fixed",inset:0,pointerEvents:"none",zIndex:0,backgroundImage:`${isBoss?"radial-gradient(circle at 50% 30%,#ef444411,transparent 50%)":ferv>=NERVE_MAX?"radial-gradient(circle at 50% 50%,#fef08a11,transparent 40%)":"radial-gradient(circle at 20% 80%,#7a665211,transparent 50%),radial-gradient(circle at 80% 20%,#06b6d411,transparent 50%)"},radial-gradient(ellipse at 50% 50%,transparent 50%,#00000088 100%)`};
  const BTN=(bg,col,on=true)=>({padding:"9px 24px",fontSize:13,fontWeight:700,border:"none",borderRadius:8,cursor:on?"pointer":"not-allowed",fontFamily:"'Cinzel',serif",letterSpacing:1,background:on?bg:"#222",color:on?col:"#555",transition:"all .2s"});
  const CSS=`@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&display=swap');
    @keyframes slideIn{from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:translateX(0)}}
    @keyframes fadeIn{from{opacity:0;transform:scale(.5) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}
    @keyframes driftParticle{0%{transform:translateY(100vh) translateX(0);opacity:0}10%{opacity:.3}90%{opacity:.15}100%{transform:translateY(-10vh) translateX(30px);opacity:0}}
    @keyframes shimmer{0%,100%{opacity:.03}50%{opacity:.08}}
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
    @keyframes scorePopFade{0%{opacity:0;transform:translateY(8px) scale(0.8)}100%{opacity:1;transform:translateY(0) scale(1)}}
    @keyframes multFlash{0%{opacity:0;transform:scale(0) rotate(-15deg)}50%{opacity:1;transform:scale(1.5) rotate(5deg)}100%{opacity:1;transform:scale(1) rotate(0)}}
    @keyframes bigShake{0%,100%{transform:translate(0,0)}10%{transform:translate(-4px,-2px)}20%{transform:translate(3px,1px)}30%{transform:translate(-3px,-1px)}40%{transform:translate(2px,2px)}50%{transform:translate(-2px,-1px)}60%{transform:translate(1px,1px)}80%{transform:translate(1px,-1px)}}
    @keyframes starFall{0%{opacity:1;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(60vh) scale(0.3)}}
    @keyframes breathe{0%,100%{opacity:.3}50%{opacity:.8}}
    @keyframes driftUp{0%{transform:translateY(20px);opacity:0}100%{transform:translateY(-20px);opacity:0}50%{opacity:.6}}
    @keyframes epicReveal{0%{opacity:0;letter-spacing:20px;filter:blur(8px)}60%{opacity:1;letter-spacing:8px;filter:blur(0)}100%{letter-spacing:4px}}
    *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
    button{min-height:44px;min-width:44px}
    ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-thumb{background:#333;border-radius:2px}
    body{margin:0;background:#06060f}`;

  const Dust=()=>(<div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,overflow:"hidden"}}>
    {Array.from({length:8}).map((_,i)=>{
      const left=10+i*11+Math.sin(i*2.3)*8;
      const dur=12+i*3;const delay=i*2.5;const size=1+Math.random()*1.5;
      const col=isBoss?"#ef444415":ferv>=12?"#fbbf2412":"#ffffff08";
      return(<div key={i} style={{position:"absolute",left:`${left}%`,bottom:"-4px",
        width:size,height:size,borderRadius:"50%",background:col,
        animation:`driftParticle ${dur}s linear ${delay}s infinite`}}/>);
    })}
  </div>);

  const[vw,setVw]=useState(typeof window!=="undefined"?window.innerWidth:600);
  useEffect(()=>{const h=()=>setVw(window.innerWidth);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);
  const mob=vw<500;

  // ═══════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════
  const inGamePhases=["playing","scoring","shop","event","eventResult","overflow","nightCard","bossIntro","denSelect","denResults","colonyFormed","draft","naming"];
  const showAbandon=inGamePhases.includes(ph);

  // ═══════════════════════════════════════════════════════
  // FIRST RUN INTRO — multi-page click-through
  // ═══════════════════════════════════════════════════════
  if(ph==="coldOpen"){
    const coldLines=[
      "Eight colonies fell to the dark. Each died its own way.",
      "This is the ninth. There will not be a tenth.",
      "You are what's left. The one who remembers.",
    ];
    const advance=()=>{
      if(introStep>=coldLines.length-1){setIntroStep(0);setPh("firstIntro");}
      else{setIntroStep(s=>s+1);}
    };
    return(<div style={W}><div style={BG}/><style>{CSS}</style>
      <div onClick={advance} style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",zIndex:1,gap:0,padding:20,cursor:"pointer"}}>
        {coldLines.slice(0,introStep+1).map((line,i)=>{
          const isLast=i===introStep;
          const isFinal=i===coldLines.length-1;
          return(<div key={i} style={{
            fontSize:isFinal?16:i===1?18:15,
            color:i===1?"#fbbf24":isLast?"#e8e6e3cc":"#e8e6e355",
            fontFamily:"'Cinzel',serif",
            fontWeight:i===1?700:400,
            fontStyle:isFinal?"normal":"italic",
            textAlign:"center",
            maxWidth:340,
            lineHeight:1.8,
            marginBottom:isFinal?0:8,
            animation:isLast?"fadeIn 1.2s ease-out":"none",
            letterSpacing:i===1?3:1,
            textShadow:i===1?"0 0 30px #fbbf2444":"none",
          }}>{line}</div>);
        })}
        {introStep>=coldLines.length-1&&<div style={{fontSize:11,color:"#ffffff66",fontFamily:"system-ui",letterSpacing:3,marginTop:24,animation:"fadeIn 2s ease-out 1s both"}}>tap to continue</div>}
      </div>
    </div>);
  }

  if(ph==="firstIntro"){
    const pages=[
      // Page 0: Your role — exciting, not clinical
      ()=>(<>
        <div style={{fontSize:48,animation:"fadeIn .6s ease-out",opacity:.8}}>🔥</div>
        <div style={{fontSize:18,fontWeight:900,color:"#fbbf24",letterSpacing:5,fontFamily:"'Cinzel',serif",animation:"fadeIn .8s ease-out"}}>THE LAST HEARTH</div>
        <div style={{fontSize:14,color:"#ffffffaa",fontFamily:"system-ui",textAlign:"center",maxWidth:340,lineHeight:2,animation:"fadeIn 1.2s ease-out"}}>
          A fire still burns. Cats are gathering.<br/>
          Strays, fighters, survivors. They need someone to lead them.
        </div>
        <div style={{fontSize:14,color:"#e8e6e3cc",fontFamily:"system-ui",textAlign:"center",maxWidth:300,lineHeight:1.8,animation:"fadeIn 1.6s ease-out",marginTop:8}}>
          That's you. Keep the fire burning.<br/>
          Survive five nights. Make them remember you.
        </div>
      </>),
      // Page 1: Reading a card — real card with callouts
      ()=>{
        // Generate a sample cat for the intro
        const sampleCat={id:"intro",name:"Ember",breed:"Autumn",power:5,sex:"F",trait:{name:"Alpha",icon:"🐺",desc:"×1.3 if highest power",tier:"rare"},scarred:false,injured:false,bondedTo:null,grudgedWith:[],parentIds:null,stats:{tp:0,bs:0}};
        return(<>
        <div style={{fontSize:10,color:"#ffffff55",letterSpacing:6,fontFamily:"system-ui",animation:"fadeIn .4s ease-out"}}>READING A CARD</div>
        <div style={{display:"flex",gap:16,alignItems:"center",justifyContent:"center",animation:"fadeIn .6s ease-out",flexWrap:"wrap"}}>
          <div style={{position:"relative"}}>
            <CC cat={sampleCat}/>
            {/* Callout arrows */}
            {/* Callout: Power → top-right badge */}
            <div style={{position:"absolute",top:10,left:"100%",marginLeft:6,display:"flex",alignItems:"center",gap:4}}>
              <div style={{width:20,height:1,background:"#ffffff44"}}/>
              <span style={{fontSize:11,color:"#ffffffbb",fontFamily:"system-ui",whiteSpace:"nowrap"}}>Power → chips</span>
            </div>
            {/* Callout: Trait → bottom-left of separator (~26px from bottom) */}
            <div style={{position:"absolute",bottom:28,right:"100%",marginRight:6,display:"flex",alignItems:"center",gap:4}}>
              <span style={{fontSize:11,color:"#38bdf8",fontFamily:"system-ui",whiteSpace:"nowrap"}}>Trait</span>
              <div style={{width:20,height:1,background:"#ffffff44"}}/>
            </div>
            {/* Callout: Season → bottom-right of separator */}
            <div style={{position:"absolute",bottom:28,left:"100%",marginLeft:6,display:"flex",alignItems:"center",gap:4}}>
              <div style={{width:20,height:1,background:"#ffffff44"}}/>
              <span style={{fontSize:11,color:BREEDS.Autumn.color,fontFamily:"system-ui",whiteSpace:"nowrap"}}>Season</span>
            </div>
            {/* Callout: Name + sex → bottom center */}
            <div style={{position:"absolute",bottom:6,right:"100%",marginRight:6,display:"flex",alignItems:"center",gap:4}}>
              <span style={{fontSize:11,color:"#e8e6e3aa",fontFamily:"system-ui",whiteSpace:"nowrap"}}>Name ♂♀</span>
              <div style={{width:20,height:1,background:"#ffffff44"}}/>
            </div>
          </div>
        </div>
        <div style={{fontSize:13,color:"#4ade80bb",fontFamily:"system-ui",textAlign:"center",maxWidth:320,lineHeight:1.7,animation:"fadeIn .8s ease-out",fontWeight:600}}>
          Same-season cats score better together.<br/>
          <span style={{color:"#ffffff55",fontSize:11,fontWeight:400}}>Higher power = more chips. Traits add multipliers.</span>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"center",animation:"fadeIn 1s ease-out",marginTop:4}}>
          {["Autumn","Winter","Spring","Summer"].map(s=>{const b=BREEDS[s];return(
            <div key={s} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:1,padding:"4px 8px",borderRadius:6,background:`${b.color}11`,border:`1px solid ${b.color}22`,minWidth:48}}>
              <span style={{fontSize:14}}>{b.icon}</span>
              <span style={{fontSize:10,color:b.color,fontWeight:700}}>{b.name}</span>
            </div>
          );})}
        </div>
      </>);},
      // Page 2: Draft — your 3 picks as the last trained cats
      ()=>(<>
        <div style={{fontSize:36,animation:"fadeIn .6s ease-out",opacity:.7}}>⚔</div>
        <div style={{fontSize:18,fontWeight:700,color:"#fbbf24",letterSpacing:4,fontFamily:"'Cinzel',serif",animation:"fadeIn .8s ease-out"}}>THE BLOODLINES</div>
        <div style={{fontSize:14,color:"#ffffffaa",fontFamily:"system-ui",textAlign:"center",maxWidth:320,lineHeight:1.9,animation:"fadeIn 1s ease-out"}}>
          Three cats still carry the old blood.<br/>
          Trained. Named. <b style={{color:"#fbbf24"}}>Born with gifts the strays don't have.</b>
        </div>
        <div style={{fontSize:12,color:"#ffffff88",fontFamily:"system-ui",textAlign:"center",maxWidth:300,lineHeight:1.7,animation:"fadeIn 1.2s ease-out",marginTop:8}}>
          Choose them. The rest of the colony will follow.
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
        <div style={{fontSize:12,color:"#ffffff66",fontFamily:"system-ui",animation:"fadeIn 2s ease-out",letterSpacing:2}}>{isLast?"Tap to start drafting":"Tap to continue"}</div>
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
    const tierCol=tr.tier==="mythic"?"#c084fc":tr.tier==="legendary"?"#f97316":(tr.tier==="rare"||tr.tier==="rare_neg")?"#38bdf8":"#ffffff55";
    return(<div style={W}><div style={BG}/><style>{CSS}</style>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",zIndex:1,gap:12,padding:20,maxWidth:420}}>
        <div style={{fontSize:10,color:"#ffffff55",letterSpacing:6,fontFamily:"system-ui",animation:"fadeIn .6s ease-out"}}>NAME YOUR CAT</div>
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
            {tierLabel&&<span style={{fontSize:10,color:tierCol,opacity:.6,letterSpacing:1,textTransform:"uppercase"}}>{tierLabel}</span>}
          </div>
          <div style={{fontSize:12,color:"#ffffff77",fontFamily:"system-ui",lineHeight:1.7}}>{detail}</div>
        </div>):(
          <div style={{padding:"10px 16px",borderRadius:10,background:"#ffffff06",border:"1px solid #ffffff11",maxWidth:340,width:"100%",animation:"fadeIn 1s ease-out"}}>
            <div style={{fontSize:12,color:"#ffffff77",fontFamily:"system-ui",lineHeight:1.7}}>No special trait yet. This cat can earn one through events, breeding, or the shop.</div>
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
        <div style={{fontSize:10,color:"#ffffff44",fontFamily:"system-ui",letterSpacing:2}}>TAP TO RENAME</div>
        <button id="nameConfirm" onClick={()=>{
          const inp=document.getElementById("nameInput");
          const defaultName=namingCat.name.split(" ")[0];
          const newName=(inp?.value||defaultName).trim().substring(0,12)||defaultName;
          const fullName=namingCat.name.includes(" ")?`${newName} ${namingCat.name.split(" ").slice(1).join(" ")}`:newName;
          namingCat.name=fullName;
          pendingRenames.current[namingCat.id]=fullName;
          delete namingCat._finalPick;
          if(babyNamingQueue.length>0){
            const remaining=babyNamingQueue.filter(b=>b.id!==namingCat.id);
            setBabyNamingQueue(remaining);
            if(remaining.length>0){
              setNamingCat(remaining[0]);
            }else{
              setNamingCat(null);
              nextBlind();
            }
          }else{
            const isFinal=draftPicked.length>=(3+(getMB().extraDraft||0));
            setNamingCat(null);
            if(isFinal){
              finalizeDraft(draftPicked);
            }else{
              setPh("draft");
            }
          }
        }} style={{...BTN(`linear-gradient(135deg,${b.color},${b.color}cc)`,"#0a0a1a"),padding:"10px 32px",fontSize:14,letterSpacing:2}}>
          {babyNamingQueue.length>0?"Name this kitten":"This is their name"}
        </button>
      </div>
    </div>);
  }

  // ═══════════════════════════════════════════════════════
  // TITLE
  // ═══════════════════════════════════════════════════════
  if(ph==="hearthFlash"&&hearthFlash){
    return(<div style={W}><div style={BG}/><style>{CSS}</style>
      <div onClick={()=>{setHearthFlash(null);setPh("draft");}} style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",zIndex:1,gap:16,padding:20,cursor:"pointer"}}>
        <div style={{fontSize:48,animation:"float 3s ease-in-out infinite",filter:"drop-shadow(0 0 20px #fbbf2444)"}}>🔥</div>
        <div style={{fontSize:12,color:"#fbbf2466",letterSpacing:6,fontFamily:"system-ui",animation:"fadeIn 1s ease-out"}}>THE HEARTH REMEMBERS</div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap",justifyContent:"center",maxWidth:360,animation:"fadeIn 1.5s ease-out"}}>
          {hearthFlash.map((c,i)=>(<span key={i} style={{fontSize:10,color:BREEDS[c.breed]?.color||"#fbbf24",fontFamily:"system-ui",opacity:.5,animation:`fadeIn ${.5+i*.15}s ease-out both`}}>{c.name?.split(" ")[0]||"?"}</span>))}
        </div>
        <div style={{fontSize:11,color:"#ffffff66",fontStyle:"italic",fontFamily:"system-ui",textAlign:"center",maxWidth:300,lineHeight:1.6,animation:"fadeIn 2s ease-out"}}>They watch from the warm side. They can't follow. But they remember.</div>
      </div>
    </div>);
  }

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
        <div style={{fontSize:11,color:"#d9770699",fontStyle:"italic",fontFamily:"system-ui",textAlign:"center",lineHeight:1.7,maxWidth:320,animation:`fadeIn ${isFirstRun?"1s":"0.4s"} ease-out`}}>{storyText}</div>

        {/* ★ Rubber-banding hint. visible after first run — confusing for brand-new players */}
        {!isFirstRun&&draftPicked.length===0&&<div style={{fontSize:12,color:"#fb923c",fontFamily:"system-ui",textAlign:"center",maxWidth:300,lineHeight:1.6,animation:"fadeIn 0.5s ease-out 0.2s both",padding:"6px 12px",borderRadius:6,background:"#fb923c0d",border:"1px solid #fb923c22",fontWeight:700}}>⚖️ Strong cats attract weak strays. Choose wisely.</div>}

        {isFirstRun&&draftPicked.length===0&&<div style={{fontSize:11,color:"#fbbf2466",fontFamily:"system-ui",textAlign:"center",maxWidth:280,lineHeight:1.5,animation:"fadeIn 1s ease-out .3s both"}}>Pick who catches your eye.</div>}
        {draftPicked.length>0&&<div style={{display:"flex",gap:6,alignItems:"center"}}>
          <span style={{fontSize:10,color:"#4ade80bb",letterSpacing:2}}>CHOSEN</span>
          {draftPicked.map((c,i)=>(<CC key={i} cat={c} sm hl/>))}
        </div>}
        {!isFirstRun&&<div style={{fontSize:10,color:"#888",fontFamily:"system-ui",letterSpacing:1,marginTop:4}}>Choose one. The others scatter into the dark.</div>}
        <div style={{display:"flex",gap:14,justifyContent:"center",animation:`fadeIn .4s ease-out ${isFirstRun?"0.8s":"0.3s"} both`}}>
          {draftPool.map((c,i)=>{
            const b=BREEDS[c.breed];
            const voice=getDraftVoice(c);
            return(<div key={c.id} onClick={()=>pickDraft(i)} style={{cursor:"pointer",textAlign:"center",maxWidth:110,
              animation:`fadeIn .3s ease-out ${(isFirstRun?0.9:0.4)+i*.15}s both`,
              transition:"transform .2s, filter .2s",
            }}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-6px)";e.currentTarget.style.filter="brightness(1.15)";}}
            onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.filter="brightness(1)";}}>
              <div style={{animation:`float ${2.5+i*.4}s ease-in-out ${i*.3}s infinite`}}>
                <CC cat={c}/>
              </div>
              <div style={{fontSize:12,fontFamily:"system-ui",color:b.color,marginTop:4,lineHeight:1.3,fontWeight:700}}>{c.name.split(" ")[0]} <span style={{fontWeight:400,opacity:.6,fontSize:10}}>{c.sex==="M"?"\u2642":"\u2640"}</span></div>
              <div style={{fontSize:10,color:"#ffffff99",fontStyle:"italic",fontFamily:"system-ui",lineHeight:1.4,minHeight:28,marginTop:3}}>"{voice}"</div>
              {c.trait.name!=="Plain"&&<div style={{fontSize:10,color:tierColor(c.trait),fontFamily:"system-ui",marginTop:2,lineHeight:1.3,maxWidth:100}}>{c.trait.desc}</div>}
              {c.stats?.par&&<div style={{color:"#c084fc",fontSize:10,fontFamily:"system-ui",fontStyle:"italic",lineHeight:1.3,marginTop:1}}>
                {meta?.cats?.find(h=>c.parentIds?.includes(h.name))?
                  `${c.stats.par.split("×")[0]?.trim()}'s blood. The Hearth remembers.`
                  :`Child of ${c.stats.par}`}
              </div>}
            </div>);
          })}
        </div>
        {!isFirstRun&&draftRejects.length>0&&<div style={{fontSize:10,color:"#555",fontFamily:"system-ui",fontStyle:"italic"}}>The ones you turned away haven't gone far...</div>}
      </div>
    </div>);
  }

  if(ph==="nightCard"&&nightCard){
    const blindNames=["Dusk","Midnight","Boss"];
    const blindKey=nightCard.blind===0?"dusk":nightCard.blind===1?"midnight":"boss";
    const epi=NIGHT_EPI[Math.min(nightCard.ante-1,4)];
    const isMid=nightCard.blind===1;
    const ncTgt=Math.round(getTarget(nightCard.ante,nightCard.blind,isFirstRun,longDark));
    const isFirstEver=meta&&(meta.stats.w===0)&&nightCard.ante===1&&nightCard.blind===0&&!firstHandPlayed;
    const whisper=nightCard.blind===2&&boss?`${boss.icon} ${boss.name} waits.`:pk(BLIND_WHISPER[blindKey]);
    const isBoss=nightCard.blind===2;
    const glowColor=isBoss?"#ef4444":isMid?"#fb923c":"#fbbf24";
    return(<div style={W}><div style={BG}/><style>{CSS}</style>
      <div style={{position:"fixed",top:"10%",left:"50%",transform:"translateX(-50%)",width:"120vw",height:"80vh",borderRadius:"50%",
        background:`radial-gradient(ellipse,${glowColor}${isBoss?"0d":"08"},transparent 55%)`,pointerEvents:"none",zIndex:0}}/>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",zIndex:1,gap:0,padding:20}} onClick={()=>{setNightCard(null);setPh("playing");if(isFirstEver)setTimeout(startAutoPlay,400);}}>
        {/* Night progress */}
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20,animation:"fadeIn .8s ease-out"}}>
          {Array.from({length:MX}).map((_,i)=>{
            const done2=i<nightCard.ante-1;const cur=i===nightCard.ante-1;
            return(<div key={i} style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:cur?10:8,height:cur?10:8,borderRadius:"50%",
                background:done2?"#4ade80":cur?glowColor:"#ffffff08",
                boxShadow:cur?`0 0 12px ${glowColor}66`:done2?"0 0 6px #4ade8022":"none",
                border:cur?`2px solid ${glowColor}66`:"none"}}/>
              {i<MX-1&&<div style={{width:16,height:1,background:done2?"#4ade8033":"#ffffff08"}}/>}
            </div>);
          })}
        </div>

        <div style={{fontSize:isBoss?48:42,fontWeight:900,letterSpacing:14,color:glowColor,fontFamily:"'Cinzel',serif",
          animation:"comboBurst .6s ease-out",textShadow:`0 0 80px ${glowColor}55, 0 0 40px ${glowColor}33`,marginBottom:2}}>
          {blindNames[nightCard.blind].toUpperCase()}</div>

        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,marginTop:6}}>
          <div style={{width:60,height:1,background:`linear-gradient(90deg,transparent,${glowColor}33)`}}/>
          <div style={{fontSize:11,color:"#ffffff55",letterSpacing:8,fontFamily:"system-ui"}}>NIGHT {nightCard.ante}</div>
          <div style={{width:60,height:1,background:`linear-gradient(90deg,${glowColor}33,transparent)`}}/>
        </div>

        {isBoss&&boss&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,padding:"18px 28px",borderRadius:14,
          background:"linear-gradient(160deg,#ef444410,#ef444404,#ef444408)",border:"1.5px solid #ef444422",
          animation:"fadeIn 1s ease-out .2s both",marginBottom:16,maxWidth:340,boxShadow:"0 4px 40px #ef444418"}}>
          <span style={{fontSize:48}}>{boss.icon}</span>
          <div style={{fontSize:20,color:"#ef4444",fontWeight:700,letterSpacing:3,fontFamily:"'Cinzel',serif"}}>{boss.name}</div>
          <div style={{width:80,height:1,background:"linear-gradient(90deg,transparent,#ef444433,transparent)",margin:"4px 0"}}/>
          <div style={{fontSize:11,color:"#ef444466",fontStyle:"italic",fontFamily:"system-ui",textAlign:"center",lineHeight:1.5}}>{boss.lore}</div>
          {boss.tauntFn&&(()=>{const bCtx={fallen:fallen.length,scarred:allC.filter(c=>c.scarred).length,bonded:allC.filter(c=>c.bondedTo).length,colony:allC.length,gold,grudges:0};
            const taunt=boss.tauntFn(bCtx);
            return taunt?<div style={{fontSize:12,color:"#ef4444bb",fontStyle:"italic",fontFamily:"system-ui",textAlign:"center",lineHeight:1.6,marginTop:4}}>"{taunt}"</div>:null;
          })()}
        </div>}

        {/* Non-boss: whisper + epigraph */}
        {!isBoss&&<>
          <div style={{fontSize:14,color:"#ffffff77",fontStyle:"italic",fontFamily:"system-ui",letterSpacing:2,animation:"fadeIn 1s ease-out",textAlign:"center",textShadow:"0 0 20px #ffffff11",maxWidth:320,marginBottom:8}}>{whisper}</div>
          <div style={{fontSize:16,color:"#ffffff44",fontStyle:"italic",fontFamily:"'Cinzel',serif",textAlign:"center",maxWidth:320,lineHeight:1.8,animation:"fadeIn 1.2s ease-out",letterSpacing:1}}>{epi}</div>
          {NIGHT_SUB[Math.min(nightCard.ante-1,4)]&&<div style={{fontSize:11,color:"#ffffff66",fontStyle:"italic",fontFamily:"system-ui",textAlign:"center",maxWidth:280,lineHeight:1.5,animation:"fadeIn 1.5s ease-out",marginTop:4}}>{NIGHT_SUB[Math.min(nightCard.ante-1,4)]}</div>}
        </>}

        {/* Colony whisper */}
        {nightCard.blind===0&&nightCard.ante>1&&(()=>{
          const wFn=WHISPER_NIGHT[Math.min(nightCard.ante-1,WHISPER_NIGHT.length-1)];
          if(!wFn)return null;
          const wCtx={fallen:fallen.length,colony:allC.length};
          const wLine=typeof wFn==="function"?wFn(wCtx):wFn;
          const wSeed=(nightCard.ante*13+gold)%10;
          if(wSeed>3)return null;
          return <div style={{fontSize:11,color:"#fbbf2433",fontStyle:"italic",fontFamily:"system-ui",textAlign:"center",maxWidth:300,lineHeight:1.5,animation:"fadeIn 2s ease-out .5s both",marginTop:8}}>{wLine}</div>;
        })()}

        {isNinthDawn&&<div style={{fontSize:11,color:"#fbbf2466",letterSpacing:5,fontFamily:"system-ui",animation:"fadeIn 1.8s ease-out",marginTop:8}}>THE NINTH DAWN</div>}

        {nightCard.ante>=MX&&nightCard.blind===0&&(fallen.length>0||allC.length>0)&&<div style={{
          animation:"fadeIn 1.8s ease-out .8s both",textAlign:"center",maxWidth:300,
          padding:"10px 14px",borderRadius:12,background:"#ffffff04",border:"1px solid #ffffff08",marginTop:12}}>
          {fallen.length>0&&<div style={{marginBottom:6}}>
            <div style={{fontSize:10,color:"#ef444466",letterSpacing:3,marginBottom:4}}>DID NOT MAKE IT</div>
            {fallen.map((f,i)=><div key={i} style={{fontSize:11,color:BREEDS[f.breed]?.color||"#ef4444",fontFamily:"system-ui",opacity:.6,lineHeight:1.5}}>
              {f.name.split(" ")[0]} <span style={{color:"#ffffff66",fontSize:10}}>Night {f.night}</span>
            </div>)}
          </div>}
          <div style={{fontSize:10,color:"#4ade8066",letterSpacing:3,marginBottom:3}}>{allC.length} STILL HERE</div>
          <div style={{display:"flex",gap:4,flexWrap:"wrap",justifyContent:"center"}}>
            {allC.slice(0,16).map((c,i)=><span key={i} style={{fontSize:10,color:BREEDS[c.breed]?.color||"#888",fontFamily:"system-ui",opacity:.5}}>
              {c.name.split(" ")[0]}{c.scarred?"*":""}
            </span>)}
          </div>
        </div>}

        {(()=>{const ncMb=getMB();const ncHfx=getHeatFx(meta?.heat);const ncDiscs=3+ncMb.discards+(ncHfx.discMod||0);return(
        <div style={{display:"flex",gap:0,alignItems:"stretch",marginTop:20,animation:"fadeIn 1.5s ease-out .3s both",borderRadius:14,overflow:"hidden",border:`1.5px solid ${glowColor}15`,
          background:`linear-gradient(145deg,${glowColor}06,#ffffff02,${glowColor}04)`,boxShadow:`0 4px 30px ${glowColor}11`}}>
          <div style={{textAlign:"center",padding:"16px 24px"}}>
            <div style={{fontSize:10,color:`${glowColor}66`,letterSpacing:3,fontFamily:"system-ui",marginBottom:4}}>TARGET</div>
            <div style={{fontSize:isFirstEver?34:28,fontWeight:900,color:glowColor,textShadow:`0 0 20px ${glowColor}33`}}>{ncTgt.toLocaleString()}</div>
          </div>
          <div style={{width:1,background:"#ffffff08"}}/>
          <div style={{textAlign:"center",padding:"16px 20px"}}>
            <div style={{fontSize:10,color:"#3b82f666",letterSpacing:3,fontFamily:"system-ui",marginBottom:4}}>HANDS</div>
            <div style={{fontSize:isFirstEver?34:28,fontWeight:900,color:"#3b82f6"}}>{hLeft}</div>
          </div>
          <div style={{width:1,background:"#ffffff08"}}/>
          <div style={{textAlign:"center",padding:"16px 20px"}}>
            <div style={{fontSize:10,color:"#ef444466",letterSpacing:3,fontFamily:"system-ui",marginBottom:4}}>DISCARDS</div>
            <div style={{fontSize:isFirstEver?34:28,fontWeight:900,color:"#ef4444"}}>{ncDiscs}</div>
          </div>
        </div>);})()}

        {isFirstEver&&<div style={{fontSize:12,color:"#4ade80bb",fontFamily:"system-ui",animation:"fadeIn 2s ease-out .8s both",marginTop:12}}>Tap cats {"\u2192"} Play Hand {"\u2192"} Beat {ncTgt.toLocaleString()}</div>}
        <div style={{fontSize:10,color:"#ffffff55",fontFamily:"system-ui",marginTop:20,animation:`fadeIn 2s ease-out ${isFirstEver?1.2:.6}s both`}}>tap to begin</div>
      </div>
    </div>);
  }


  if(ph==="colonyFormed"&&colonyData){
    const{chosen,strays,strayOffset}=colonyData;
    const isFirstRun=!meta||meta.stats.r===0;
    const STRAY_ORIGINS={
      Autumn:["Found shivering in a collapsed tunnel. Born when the leaves turned.","Watched from the treeline for three days before coming in.","This one remembered things the others had forgotten.","Came from a colony that didn't make it past harvest."],
      Summer:["Walked out of the dark like it owed them money.","Still warm. Whatever happened to the last colony, this one ran.","Born in the longest day. Burned like it.","The loud one. Showed up yelling. Hasn't stopped."],
      Winter:["Was already in the shelter when they arrived. Said nothing.","Born in the deep cold. The cold never left.","This one watched the dark with something like patience.","The cold didn't bother them. Nothing did."],
      Spring:["Followed the youngest kitten in. Stayed for the rest.","Groomed everyone on arrival. Nobody asked. Nobody refused.","Born when the world thawed. Carried that warmth.","The gentle one. Gentle things survive too. Sometimes."],
    };
    const allDraft=[...chosen,...strays];
    const traitCount=allDraft.filter(c=>(c.trait||PLAIN).name!=="Plain").length;
    const seasonCounts=BK.map(b=>allDraft.filter(c=>c.breed===b).length);
    const dominant=BK[seasonCounts.indexOf(Math.max(...seasonCounts))];
    const colonyThesis=traitCount>=6?`${traitCount} with names worth remembering. The rest have time.`
      :seasonCounts.filter(n=>n>=5).length>=1?`Heavy ${dominant}. ${seasonCounts.filter(n=>n>=5).length>1?"Two seasons dominate.":"One season leads."} Build around it.`
      :chosen.every(c=>(c.trait||PLAIN).name!=="Plain")?`Three with traits. Fifteen without. The fifteen are watching.`
      :`Three by choice. Fifteen by survival. None by accident.`;
    const colonyCounts={};chosen.forEach(c=>{colonyCounts[c.breed]=(colonyCounts[c.breed]||0)+1;});strays.forEach(c=>{colonyCounts[c.breed]=(colonyCounts[c.breed]||0)+1;});
    const totalPow=[...chosen,...strays].reduce((s,c)=>s+c.power,0);
    const avgPow=(totalPow/16).toFixed(1);
    // Assign each stray a unique origin
    const strayOrigins=strays.map(c=>pk(STRAY_ORIGINS[c.breed]||STRAY_ORIGINS.Autumn));
    const enterNight=()=>{try{setColonyData(null);setNightCard({ante:1,blind:0});setPh("nightCard");}catch(e){console.error(e);setPh("nightCard");}};
    return(<div style={W} onClick={enterNight}><div style={BG}/><style>{CSS}</style>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",zIndex:1,gap:14,padding:20,maxWidth:600}}>
        {isNinthDawn&&<div style={{fontSize:10,color:"#fbbf24",letterSpacing:6,fontFamily:"system-ui",animation:"float 3s ease-in-out infinite",marginBottom:-4}}>「 THE NINTH DAWN 」</div>}
        {!isFirstRun&&<div onClick={e=>e.stopPropagation()} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,animation:"fadeIn 1s ease-out"}}>
          <div style={{fontSize:11,color:"#fbbf24",letterSpacing:4,fontFamily:"'Cinzel',serif",fontWeight:700}}>NAME YOUR COLONY</div>
          <input value={colonyName} onChange={e=>setColonyName(e.target.value.slice(0,20))} placeholder="..." onClick={e=>e.stopPropagation()}
            style={{background:"#ffffff08",border:`2px solid ${(meta?.achv||[]).includes("five_wins")?"#fbbf24":"#fbbf2444"}`,borderRadius:8,padding:"8px 14px",color:"#fbbf24",fontSize:16,fontFamily:"'Cinzel',serif",letterSpacing:3,width:220,outline:"none",textAlign:"center",boxShadow:(meta?.achv||[]).includes("five_wins")?"0 0 16px #fbbf2433":"none"}}/>
        </div>}

        {isFirstRun?<>
          <div style={{fontSize:10,color:"#77777799",letterSpacing:6,fontFamily:"system-ui",animation:"fadeIn 1.5s ease-out"}}>YOUR COLONY</div>
          <div style={{display:"flex",gap:16,justifyContent:"center",marginTop:8}}>
            {chosen.map((c,i)=>{const b=BREEDS[c.breed];return(
              <div key={c.id} style={{textAlign:"center",animation:`fadeIn .6s ease-out ${.3+i*.4}s both`}}>
                <CC cat={c} hl/>
                <div style={{fontSize:12,color:b.color,fontFamily:"system-ui",marginTop:4,fontWeight:700}}>{c.name.split(" ")[0]}</div>
                <div style={{fontSize:10,color:"#ffffff77",fontStyle:"italic",fontFamily:"system-ui",lineHeight:1.4,marginTop:2,maxWidth:100}}>"{getDraftVoice(c)}"</div>
              </div>);
            })}
          </div>
          <div style={{fontSize:12,color:"#888",fontStyle:"italic",fontFamily:"system-ui",textAlign:"center",lineHeight:1.6,maxWidth:340,marginTop:8,animation:"fadeIn .8s ease-out .5s both"}}>
            Three you chose. Fifteen strays who were already here.<br/>
            <span style={{color:"#77777799"}}>Sixteen souls against the dark.</span>
          </div>
        </>
        /* ★ RETURNING PLAYERS. full composition breakdown */
        :<>
          <div style={{fontSize:10,color:"#77777799",letterSpacing:6,fontFamily:"system-ui",animation:"epicReveal 1.2s ease-out forwards"}}>SURVIVE {MX} NIGHTS</div>
          {meta&&meta.stats.r>0&&<div style={{fontSize:10,color:"#777777bb",fontFamily:"system-ui",letterSpacing:3}}>{(()=>{const n=(meta.stats.r||0)+1;const w=meta.stats.w||0;if(n<=2)return`Colony #${n}. You know more than the first one did.`;if(n<=5)return`Colony #${n}. The dark keeps counting too.`;if(w>=3)return`Colony #${n}. The Hearth is big enough to cast a shadow now.`;return`Colony #${n}. ${n} names. ${n} chances.`;})()}</div>}
          <div style={{fontSize:11,color:"#888",letterSpacing:4,fontFamily:"system-ui",animation:"fadeIn .6s ease-out .2s both"}}>THE COLONY</div>
          <div style={{fontSize:15,color:"#d97706bb",fontStyle:"italic",fontFamily:"system-ui",textAlign:"center",lineHeight:1.6,maxWidth:360,animation:"fadeIn .8s ease-out .15s both"}}>
            {colonyThesis}
          </div>

          {bloodMemMsg&&<div style={{padding:"8px 16px",borderRadius:8,background:"linear-gradient(135deg,#7a665208,#ef444408)",border:"1px solid #c084fc22",animation:"fadeIn 1s ease-out .3s both",textAlign:"center",maxWidth:380}}>
            <div style={{fontSize:10,color:"#c084fc",fontFamily:"system-ui",fontStyle:"italic",lineHeight:1.6}}>
              🩸 <b>{bloodMemMsg.heir.split(" ")[0]}</b> carries something old. {bloodMemMsg.trait.icon} <span style={{color:"#e8e6e3"}}>{bloodMemMsg.trait.name}</span>. inherited from <span style={{color:"#fbbf24"}}>{bloodMemMsg.ancestor}</span> of the Hearth.
              {bloodMemMsg.scarred&&<span style={{color:"#d97706"}}> The scar came with it.</span>}
            </div>
          </div>}

          <div style={{display:"flex",gap:20,justifyContent:"center",animation:"fadeIn 1s ease-out .25s both"}}>
            <div style={{textAlign:"center"}}><div style={{fontSize:32,fontWeight:900,color:"#fbbf24",letterSpacing:2,animation:"comboBurst .6s ease-out .35s both"}}>{14}</div><div style={{fontSize:10,color:"#555",letterSpacing:2,fontFamily:"system-ui"}}>SOULS</div></div>
            <div style={{width:1,height:40,background:"#ffffff0a"}}/>
            <div style={{textAlign:"center"}}><div style={{fontSize:32,fontWeight:900,color:"#ef4444",letterSpacing:2,animation:"comboBurst .6s ease-out .45s both"}}>{MX}</div><div style={{fontSize:10,color:"#555",letterSpacing:2,fontFamily:"system-ui"}}>NIGHTS</div></div>
          </div>
          {strayOffset&&strayOffset!==0&&<div style={{fontSize:10,color:strayOffset>0?"#4ade80aa":"#fb923caa",fontStyle:"italic",fontFamily:"system-ui",textAlign:"center",animation:"fadeIn 1s ease-out .6s both",maxWidth:340,lineHeight:1.5}}>
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
                <span style={{fontSize:10,color:"#666",fontFamily:"system-ui"}}>15 strays · all Plain</span>
              </div>
            </div>
          </div>
        </>}

        {hearthDust>0&&<div style={{display:"flex",alignItems:"center",gap:6,padding:"8px 16px",borderRadius:8,background:"#c084fc0a",border:"1px solid #c084fc22",animation:"fadeIn 1.5s ease-out 1.4s both"}}>
          <span style={{fontSize:14}}>🏠</span>
          <span style={{fontSize:11,color:"#c084fc",fontFamily:"system-ui"}}>The Hearth radiates <span style={{fontWeight:700}}>+{hearthDust}✦</span></span>
        </div>}

        <button onClick={e=>{e.stopPropagation();enterNight();}} style={{background:"linear-gradient(135deg,#fbbf24,#f59e0b)",color:"#0a0a1a",border:"none",borderRadius:10,padding:"14px 44px",fontSize:17,fontWeight:900,cursor:"pointer",letterSpacing:4,fontFamily:"'Cinzel',serif",marginTop:8,boxShadow:"0 0 40px #fbbf2433",textTransform:"uppercase",zIndex:2}}>Enter the Night</button>
        <div style={{fontSize:10,color:"#ffffff55",fontFamily:"system-ui",marginTop:4}}>tap anywhere to continue</div>
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
    const showLongDark=meta&&meta.stats.w>=3;
    const showStats=hasRun;
    const availTabs=["play"];if(showUpgrades)availTabs.push("✦ upgrades");if(showHearth)availTabs.push("hearth");
    const safeTab=availTabs.includes(tab)?tab:"play";
    return(<div style={W}><div style={BG}/><Dust/><style>{CSS}</style>
      <div style={{position:"fixed",top:10,right:10,zIndex:200,display:"flex",gap:6,alignItems:"center"}}>
        <span style={{fontSize:10,color:"#ffffff55",fontFamily:"system-ui",letterSpacing:1}}>v0.61</span>
        {meta&&meta.stats.r>=1&&<button onClick={async()=>{const sums=[];for(let i=1;i<=SLOT_COUNT;i++)sums.push(await getSlotSummary(i));setSlotSummaries(sums);setShowSlots(!showSlots);}} style={{background:"none",border:"1px solid #ffffff15",borderRadius:6,fontSize:10,cursor:"pointer",opacity:.5,padding:"3px 8px",color:"#888",fontFamily:"system-ui"}} title="Save Slots">💾 {activeSlot}</button>}
        <button onClick={toggleMute} style={{background:"none",border:"none",fontSize:16,cursor:"pointer",opacity:.4,padding:4}} title={muted?"Unmute":"Mute"}>{muted?"🔇":"🔊"}</button>
      </div>
      {showSlots&&slotSummaries&&<div style={{position:"fixed",top:40,right:10,zIndex:300,background:"#0d1117ee",border:"1px solid #ffffff15",borderRadius:12,padding:14,width:220,animation:"fadeIn .2s ease-out",fontFamily:"system-ui"}}>
        <div style={{fontSize:10,color:"#888",letterSpacing:2,marginBottom:8}}>SAVE SLOTS</div>
        {slotSummaries.map((s,i)=>{const n=i+1;const isActive=n===activeSlot;return(
          <div key={n} onClick={async()=>{if(!isActive){await setActiveSlot(n);const d=await loadS(n);setMeta(d);const r=await loadRun();setSavedRun(r);setShowSlots(false);}}} style={{padding:"8px 10px",borderRadius:8,marginBottom:4,cursor:isActive?"default":"pointer",
            background:isActive?"#fbbf2412":"#ffffff06",border:`1px solid ${isActive?"#fbbf2433":"#ffffff0a"}`,transition:"all .2s"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:12,fontWeight:isActive?700:400,color:isActive?"#fbbf24":"#888"}}>Slot {n}{isActive?" ✦":""}</span>
              {!s.empty&&<span style={{fontSize:10,color:"#555"}}>{s.wins}W / {s.runs}R</span>}
            </div>
            {s.empty?<div style={{fontSize:10,color:"#555",fontStyle:"italic"}}>Empty</div>
            :<div style={{fontSize:10,color:"#666",marginTop:2}}>🏠{s.cats} cats · ✦{s.dust} · {s.heat>0?`🔥H${s.heat}`:""}</div>}
          </div>);
        })}
        <div style={{borderTop:"1px solid #ffffff0a",marginTop:6,paddingTop:6,display:"flex",gap:4,flexWrap:"wrap"}}>
          <button onClick={async()=>{const json=await exportSlot(activeSlot);navigator.clipboard?.writeText(json);toast("📋","Save copied to clipboard","#4ade80");}} style={{fontSize:10,background:"none",border:"1px solid #ffffff15",borderRadius:4,color:"#4ade80",cursor:"pointer",padding:"3px 8px"}}>Export Slot {activeSlot}</button>
          <button onClick={()=>setShowImport(!showImport)} style={{fontSize:10,background:"none",border:"1px solid #ffffff15",borderRadius:4,color:"#fb923c",cursor:"pointer",padding:"3px 8px"}}>Import</button>
        </div>
        {showImport&&<div style={{marginTop:6}}>
          <textarea value={importText} onChange={e=>setImportText(e.target.value)} placeholder="Paste save JSON..." onClick={e=>e.stopPropagation()} style={{width:"100%",height:50,background:"#0a0a1a",border:"1px solid #ffffff15",borderRadius:4,color:"#e8e6e3",fontSize:10,fontFamily:"monospace",padding:4,resize:"none"}}/>
          <button onClick={async()=>{if(!importText.trim())return;const d=await importSlot(importText,activeSlot);if(d){setMeta(d);toast("✅","Save imported","#4ade80");setShowImport(false);setImportText("");setShowSlots(false);}else{toast("❌","Invalid save data","#ef4444");}}} style={{fontSize:10,background:"#fb923c",border:"none",borderRadius:4,color:"#0a0a1a",cursor:"pointer",padding:"3px 10px",marginTop:3,fontWeight:700}}>Import to Slot {activeSlot}</button>
        </div>}
      </div>}
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",zIndex:1,gap:12,padding:20,textAlign:"center",maxWidth:600}}>
        <div style={{fontSize:15,color:"#ffffffbb",fontStyle:"italic",fontFamily:"system-ui",textAlign:"center",maxWidth:360,lineHeight:1.7,animation:"fadeIn 2s ease-out",textShadow:"0 0 20px #ffffff08"}}>{getEpigraph(meta)}</div>
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
        <h1 style={{fontSize:"clamp(32px,7vw,52px)",fontWeight:900,letterSpacing:6,lineHeight:1.1,background:(meta?.achv||[]).includes("completionist")?"linear-gradient(135deg,#c084fc,#fef08a,#4ade80,#67e8f9)":"linear-gradient(135deg,#b85c2c,#fbbf24,#fef08a)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",margin:0}}>NINTH LIFE{meta?.ninthDawnCleared?" 🌅":""}</h1>
        <div style={{fontSize:10,color:"#888888bb",letterSpacing:3,fontFamily:"system-ui",lineHeight:1.6,animation:"fadeIn 2.5s ease-out"}}>Cats are cards. Seasons are suits. Survive the dark.</div>
        {(()=>{const ch=getChapterTitle(meta);return ch?<div style={{fontSize:10,color:"#c084fc66",letterSpacing:4,fontFamily:"'Cinzel',serif",animation:"fadeIn 3s ease-out"}}>Chapter {ch.num} · {ch.name}</div>:null;})()}

        {meta&&meta.stats.r>=1&&(()=>{
          const earned=(meta.achv||[]).length;const total=ACHIEVEMENTS.length;
          return(<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,animation:"fadeIn 2s ease-out"}}>
          <div style={{fontSize:10,color:"#555",letterSpacing:2,fontFamily:"system-ui"}}>ACHIEVEMENTS {earned}/{total}</div>
          <div style={{display:"flex",gap:3,flexWrap:"wrap",justifyContent:"center",maxWidth:200}}>
            {ACHIEVEMENTS.map(a=>{const e=(meta.achv||[]).includes(a.id);return(
              <div key={a.id} onClick={()=>toast(a.icon,`${a.name}: ${a.desc}${e?" ✓ "+a.reward:""}`,e?"#fbbf24":"#555")} style={{width:8,height:8,borderRadius:"50%",cursor:"pointer",
                background:e?"#fbbf24":"#ffffff0a",
                boxShadow:e?`0 0 6px #fbbf2466`:"none",
                border:e?"1px solid #fbbf2466":"1px solid #ffffff12",
                transition:"all .3s"}} title={`${a.name}: ${a.desc}`}/>);
            })}
          </div></div>);
        })()}

        {hasRun&&meta&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
          <div style={{display:"flex",gap:12,alignItems:"center"}}>
            <div style={{color:"#c084fc",fontSize:13,fontWeight:700}}>✦ {sd} Stardust</div>
            {sd>0&&!showUpgrades&&<span style={{fontSize:10,color:"#c084fc66",fontFamily:"system-ui"}}>earned from the Hearth</span>}
            {sd>0&&showUpgrades&&<span style={{fontSize:10,color:"#c084fc66",fontFamily:"system-ui",cursor:"pointer"}} onClick={()=>setTab("✦ upgrades")}>spend on upgrades ▸</span>}
            {meta.cats.length>0&&<div style={{fontSize:10,color:"#c084fcbb",fontFamily:"system-ui"}}>🏠 +{calcTotalHearthDust(meta.cats,getMB().dustBonus||0,getHeatFx(meta?.heat).dustMult||1).total}/run</div>}
          </div>
          {showHeat&&(meta.heat||0)>0&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <div style={{display:"flex",gap:2,alignItems:"center"}}>{Array.from({length:meta.heat}).map((_,i)=>(<span key={i} style={{fontSize:10,filter:"drop-shadow(0 0 3px #ef4444)"}}>🔥</span>))}<span style={{fontSize:10,color:"#ef4444",fontFamily:"system-ui"}}>Heat {meta.heat}</span><span style={{fontSize:10,color:"#4ade80",fontFamily:"system-ui"}}>+{(meta.heat)*25}% hearth</span></div>
          </div>}
        </div>}


        {availTabs.length>1&&<div style={{display:"flex",gap:3,background:"#ffffff08",borderRadius:8,padding:2}}>
          {availTabs.map(t=>(<button key={t} onClick={()=>setTab(t)} style={{padding:"5px 14px",fontSize:10,border:"none",borderRadius:6,cursor:"pointer",background:safeTab===t?"#ffffff12":"transparent",color:safeTab===t?"#e8e6e3":"#666",fontFamily:"'Cinzel',serif",letterSpacing:1,textTransform:"uppercase",fontWeight:safeTab===t?700:400}}>{t}</button>))}
        </div>}

        {safeTab==="play"&&<>
          {hc&&<div style={{width:"100%"}}>
            <div style={{fontSize:10,color:"#888",letterSpacing:2,marginBottom:5}}>WHO WALKS WITH YOU INTO THE DARK?</div>
            <div style={{fontSize:10,color:"#555",fontFamily:"system-ui",marginBottom:4}}>Tap a Hearth cat to choose a companion. They start in your colony.</div>
            <div style={{display:"flex",gap:5,overflowX:"auto",justifyContent:"center",flexWrap:"wrap"}}>
              {meta.cats.slice(-8).map((c,i)=>{const tr=TRAITS.find(t=>t.name===c.trait.name)||c.trait;const cat={...c,id:`ct${i}`,trait:tr};const isSel=starter&&starter._i===i;
                return(<div key={i} style={{cursor:"pointer"}} onClick={()=>setStarter(isSel?null:{...c,trait:tr,_i:i})}><CC cat={cat} sm sel={isSel}/></div>);})}
            </div>
          </div>}
          {savedRun&&<button onClick={()=>{Audio.init();resumeRun(savedRun);}} style={{...BTN("linear-gradient(135deg,#4ade80,#22c55e)","#0a0a1a"),padding:"14px 48px",fontSize:18,letterSpacing:3,textTransform:"uppercase",boxShadow:"0 0 30px #4ade8044",animation:"float 3s ease-in-out infinite",marginBottom:2}}>Continue Colony <span style={{fontSize:11,opacity:.7}}>Night {savedRun.ante}</span></button>}
          <button onClick={()=>{try{Audio.init();if(!meta?.stats?.r){setGuide({step:0,msg:""});startGame(starter);setPh("coldOpen");}else{startGame(starter);}}catch(e){console.error("Start error:",e);}}} style={{...BTN(savedRun?"#1a1a2e":"linear-gradient(135deg,#fbbf24,#f59e0b)",savedRun?"#fbbf24":"#0a0a1a"),padding:savedRun?"10px 32px":"14px 48px",fontSize:savedRun?13:18,letterSpacing:savedRun?2:3,textTransform:"uppercase",boxShadow:savedRun?"none":"0 0 30px #fbbf2444",border:savedRun?"1px solid #fbbf2444":"none"}}>{savedRun?"New Colony":"Enter the Night"}</button>
          {meta&&canUnlockNinthDawn(meta)&&!meta.ninthDawnCleared&&<button onClick={()=>{Audio.init();startNinthDawn();}} style={{...BTN("linear-gradient(135deg,#fbbf24,#fef08a)","#0a0a1a"),padding:"10px 36px",fontSize:13,letterSpacing:4,textTransform:"uppercase",boxShadow:"0 0 20px #fbbf2444",animation:"float 3s ease-in-out infinite"}}>「 THE NINTH DAWN 」</button>}
          {meta?.ninthDawnCleared&&<div style={{fontSize:11,color:"#fbbf2466",fontFamily:"system-ui",fontStyle:"italic"}}>🌅 The dawn holds.</div>}
          {showLongDark&&!isFirstRun&&<button onClick={()=>setLongDark(v=>!v)} style={{padding:"6px 16px",fontSize:10,border:`1px solid ${longDark?"#818cf8":"#ffffff22"}`,borderRadius:6,cursor:"pointer",background:longDark?"#818cf822":"transparent",color:longDark?"#818cf8":"#666",fontFamily:"system-ui",letterSpacing:1,marginTop:2}}>
            {longDark?"🌑 THE LONG DARK — 9 nights":"🌑 The Long Dark"}
          </button>}
          {longDark&&<div style={{fontSize:10,color:"#818cf8aa",fontStyle:"italic",fontFamily:"system-ui"}}>Nine nights. Nine colonies. The full weight of the dark.</div>}
          {showHeat&&(meta.heat||0)>0&&HEAT_FLAVOR[meta.heat]&&<div style={{fontSize:11,color:"#ef4444bb",fontStyle:"italic",fontFamily:"system-ui"}}>{HEAT_FLAVOR[meta.heat]}</div>}
          {(meta?.relics||[]).length>0&&<div style={{display:"flex",gap:4,flexWrap:"wrap",justifyContent:"center"}}>
            {(meta.relics||[]).sort().map(h=>{const r=HEAT_RELICS[h];return r?(<div key={h} style={{padding:"3px 8px",borderRadius:5,background:"#fbbf2408",border:"1px solid #fbbf2422",fontSize:10,color:"#fbbf24",fontFamily:"system-ui"}} title={`${r.name}: ${r.desc}
"${r.flavor}"`}>{r.icon} {r.name}</div>):null;})}
          </div>}
          {(!meta||meta.stats.r===0)&&<div style={{fontSize:11,color:"#fbbf2466",fontFamily:"system-ui",lineHeight:1.5,textAlign:"center",maxWidth:300}}>3 nights. 18 cats. The game teaches as you play.</div>}
          {meta&&<div style={{display:"flex",gap:14,fontFamily:"system-ui",fontSize:10,color:"#555",alignItems:"center",flexWrap:"wrap"}}><button onClick={()=>setSeen(s=>({...s,howToPlay:!s.howToPlay}))} style={{background:"none",border:"1px solid #ffffff12",borderRadius:12,color:"#555",fontSize:10,cursor:"pointer",padding:"2px 8px",fontFamily:"system-ui"}}>How to Play</button><span>{meta.stats.r} runs</span><span>{meta.stats.w} wins</span></div>}
          {seen.howToPlay&&<div style={{padding:"10px 16px",borderRadius:10,background:"#ffffff06",border:"1px solid #ffffff0a",maxWidth:400,fontSize:13,fontFamily:"system-ui",color:"#aaa",lineHeight:1.6,animation:"fadeIn .4s ease-out",textAlign:"left"}}>
            <div style={{fontWeight:700,color:"#fbbf24",marginBottom:4}}>Quick Rules</div>
            Draw 6 cats. Pick up to 5 — match 3+ of one season for Clowder or Colony. Discard to swap cards (free). Recruit to draw extra cats (costs 🐟). Unplayed cats give bench bonuses. Chips × Mult = score. Beat the target.
            <div style={{marginTop:6}}>Scars (×1.25) and Bonds (×1.5) multiply your score. Nerve builds every blind you clear — fast boss clears give more. In the Den, shelter a ♂+♀ pair to breed. Everyone else enters the wilds.</div>
            <div style={{marginTop:6,color:"#67e8f9"}}>🎯 Match seasons for Clowder or Colony hands. Stack traits for big multipliers. Unplayed cats in your hand give bench bonuses.</div>
            <div style={{marginTop:6,color:"#34d399"}}>👪 Shelter a parent with their child to teach traits. Save a M/F pair to the Hearth — their descendants begin your next colony.</div>
          </div>}
          {meta&&(mb.gold>0||mb.hands>0||mb.discards>0||mb.fervor>0)&&<div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center",fontFamily:"system-ui",fontSize:10}}>
            {mb.gold>0&&<span style={{color:"#fbbf24"}}>+{mb.gold}🐟</span>}{mb.hands>0&&<span style={{color:"#3b82f6"}}>+{mb.hands}H</span>}{mb.discards>0&&<span style={{color:"#ef4444"}}>+{mb.discards}D</span>}{mb.fervor>0&&<span style={{color:"#d97706"}}>N+{mb.fervor}</span>}</div>}
        </>}

        {safeTab==="✦ upgrades"&&meta&&<div style={{width:"100%",display:"flex",flexDirection:"column",gap:6}}>
          {(()=>{
            const totalLevels=Object.values(meta.ups||{}).reduce((s,v)=>s+v,0);
            const tierReq={1:0,2:2,3:4,4:6};
            const tierName={1:"Fundamentals",2:"Strategic",3:"Power",4:"Endgame"};
            const tierColor={1:"#888",2:"#60a5fa",3:"#c084fc",4:"#fbbf24"};
            const tiers=[1,2,3,4];
            return tiers.map(t=>{
              const tierUps=UPGRADES.filter(u=>u.tier===t);
              const unlocked=totalLevels>=tierReq[t];
              const allMaxed=tierUps.every(u=>(meta.ups[u.id]||0)>=u.max);
              const defaultOpen=unlocked&&!allMaxed;
              return(<details key={t} open={defaultOpen}>
                <summary style={{fontSize:11,color:unlocked?tierColor[t]:tierColor[t]+"66",letterSpacing:2,fontWeight:700,marginTop:t>1?8:0,marginBottom:4,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",listStyle:"none"}}>
                  <span>{unlocked?"":"🔒 "}{tierName[t].toUpperCase()} <span style={{fontSize:10,fontWeight:400,color:"#555"}}>({tierUps.filter(u=>(meta.ups[u.id]||0)>=u.max).length}/{tierUps.length})</span></span>
                  {!unlocked?<span style={{fontSize:10,color:"#555",fontWeight:400}}>Unlocks at {tierReq[t]} upgrades ({totalLevels}/{tierReq[t]})</span>
                  :allMaxed?<span style={{fontSize:10,color:"#4ade80",fontWeight:400}}>✓ COMPLETE</span>
                  :<span style={{fontSize:10,color:"#555"}}>▾</span>}
                </summary>
                {tierUps.map(u=>{const o=meta.ups[u.id]||0,mx=o>=u.max,can=unlocked&&meta.dust>=u.cost&&!mx;
                  return(<div key={u.id} onClick={()=>can&&buyUpg(u)} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderRadius:8,background:mx?"#4ade8008":!unlocked?"#ffffff02":"#ffffff04",border:`1px solid ${mx?"#4ade8033":can?tierColor[t]+"44":"#ffffff0a"}`,cursor:can?"pointer":"default",opacity:!unlocked?0.35:can||mx?1:.5}}>
                    <span style={{fontSize:18}}>{u.icon}</span>
                    <div style={{flex:1,textAlign:"left"}}><div style={{fontSize:11,fontWeight:700,color:mx?"#4ade80":tierColor[t]}}>{u.name}{o>0?` (${o}/${u.max})`:""}</div><div style={{fontSize:10,color:"#888",fontFamily:"system-ui"}}>{u.desc}</div></div>
                    <div style={{fontSize:11,color:mx?"#4ade80":"#c084fc",fontWeight:700}}>{mx?"MAX":`✦${u.cost}`}</div>
                  </div>);
                })}
              </details>);
            });
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
                {(()=>{const n=meta.cats.length;const tier=n>=15?{name:"THE CONSTELLATION",icon:"⭐",color:"#fef08a",bonus:"+30% stardust"}:n>=6?{name:"THE CIRCLE",icon:"🔥",color:"#fb923c",bonus:"+15% stardust"}:{name:"THE EMBER",icon:"🕯️",color:"#b8956a",bonus:""};
                  return <div style={{fontSize:10,color:tier.color+"88",letterSpacing:3,fontFamily:"system-ui",marginBottom:4}}>{tier.icon} {tier.name}{tier.bonus?` · ${tier.bonus}`:""}</div>;
                })()}
                <div style={{fontSize:10,color:"#c084fcbb",letterSpacing:3,fontFamily:"system-ui"}}>STARDUST PER RUN</div>
                <div style={{fontSize:24,fontWeight:900,color:"#c084fc",textShadow:"0 0 20px #c084fc44"}}>+{hd.total}✦</div>
                <div style={{fontSize:10,color:"#c084fc66",fontFamily:"system-ui",lineHeight:1.6}}>
                  {(dustBonus>0||heatMult>1||hd.maintenance>0)&&<>
                    <span>Gross {hd.gross}✦</span>
                    {dustBonus>0&&<span> (×{1+dustBonus} bonus)</span>}
                    {heatMult>1&&<span> (×{heatMult} heat)</span>}
                    {hd.maintenance>0&&<span style={{color:"#ef4444bb"}}> − {hd.maintenance}✦ upkeep ({hd.activeCats-8} above 8)</span>}
                  </>}
                </div>
                <div style={{fontSize:10,color:"#666",fontFamily:"system-ui"}}>Each saved cat radiates stardust when you enter the night</div>
              </div>
              {/* Active Hearth cats */}
              {activeCats.length>0&&<>
                <div style={{fontSize:10,color:"#888",letterSpacing:2,fontFamily:"system-ui"}}>HEARTH ({activeCats.length} cats{hd.maintenance>0?`. ${hd.maintenance}✦ upkeep`:""})</div>
                {(()=>{const whisperCat=activeCats[Math.floor(Date.now()/8000)%activeCats.length];if(!whisperCat)return null;
                  const fn=whisperCat.name?.split(" ")[0]||"Someone";
                  const templates=whisperCat.scarred?[`"The scar still itches. I'd do it again."`,`"I remember the fight. I remember winning."`,`"Scars don't fade here. Good."`]
                    :whisperCat.bonded?[`"I hear them sometimes. The ones who didn't make it."`,`"We made it. Together."`,`"The fire is warm enough for two."`]
                    :whisperCat.stats?.tp>=10?[`"${ante||5} nights is nothing. I'd go back."`,`"They tell stories about us. I've heard them."`,`"We earned this warmth."`]
                    :[`"It's warm here. Warmer than I expected."`,`"I watch the new ones leave. I hope they come back."`,`"The fire never goes out. That means something."`];
                  return <div style={{fontSize:11,color:"#fbbf2444",fontStyle:"italic",fontFamily:"system-ui",textAlign:"center",lineHeight:1.5,animation:"fadeIn 2s ease-out",marginBottom:4}}>
                    <span style={{color:BREEDS[whisperCat.breed]?.color||"#888",fontWeight:600}}>{fn}:</span> {templates[Math.floor(Date.now()/8000)%templates.length]}
                  </div>;
                })()}
                <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"center"}}>
                  {activeCats.map((c,i)=>{const tr=TRAITS.find(t=>t.name===c.trait.name)||c.trait;const perCat=calcHearthDust([c])[0].dust;
                    return(<div key={`h${i}`} style={{textAlign:"center",position:"relative"}} onClick={()=>{if(c.story)toast(BREEDS[c.breed]?.icon||"🐱",c.story,BREEDS[c.breed]?.color||"#fbbf24");}}>
                      <CC cat={{...c,id:`ht${i}`,trait:tr}} sm/>
                      <div style={{fontSize:10,fontWeight:700,color:"#c084fc",fontFamily:"system-ui",marginTop:1,textShadow:"0 0 6px #c084fc44"}}>+{perCat}✦</div>
                      {meta.cats.length>=20&&<button onClick={()=>{
                        const u={...meta,cats:meta.cats.map(x=>x.name===c.name&&x.savedAt===c.savedAt?{...x,enshrined:true}:x)};
                        setMeta(u);saveS(u);toast("🌟",`${c.name.split(" ")[0]} enshrined. Their light is permanent now.`,"#fbbf24");
                      }} style={{fontSize:10,color:"#fbbf24bb",background:"transparent",border:"1px solid #fbbf2422",borderRadius:3,padding:"1px 4px",cursor:"pointer",marginTop:1}}>Enshrine</button>}
                    </div>);
                  })}
                </div>
              </>}
              {enshrinedCats.length>0&&<>
                <div style={{fontSize:10,color:"#fbbf24bb",letterSpacing:2,fontFamily:"system-ui",marginTop:4}}>🌟 ENSHRINED ({enshrinedCats.length}). eternal, no upkeep</div>
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
            <span style={{color:"#c084fcbb",fontSize:10}}>Each saved cat will generate ✦ Stardust at the start of every run.</span>
          </div>}
          <div style={{display:"flex",gap:6,justifyContent:"center"}}>
            {BK.map(b=>{const has=(meta.stats.disc||[]).some(d=>d.startsWith(b));return(<span key={b} style={{fontSize:12,opacity:has?1:.2,filter:has?"none":"grayscale(1)"}} title={has?`${b} saved`:`${b} needed`}>{BREEDS[b].icon}</span>);})}
            {BK.every(b=>(meta.stats.disc||[]).some(d=>d.startsWith(b)))&&<span style={{fontSize:10,color:"#4ade80",fontFamily:"system-ui",fontWeight:700}}>✓ All seasons!</span>}
          </div>
          {(meta.achv||[]).length>0&&<div>
            <div style={{fontSize:10,color:"#888",letterSpacing:2,marginBottom:3}}>ACHIEVEMENTS ({(meta.achv||[]).length}/{ACHIEVEMENTS.length})</div>
            <div style={{display:"flex",gap:4,flexWrap:"wrap",justifyContent:"center"}}>
              {ACHIEVEMENTS.filter(a=>(meta.achv||[]).includes(a.id)).map(a=>(<span key={a.id} onClick={()=>toast(a.icon,`${a.name}: ${a.reward}`,"#fbbf24")} style={{fontSize:10,padding:"3px 8px",borderRadius:5,background:"#fbbf2411",border:"1px solid #fbbf2422",color:"#fbbf24",fontFamily:"system-ui",cursor:"pointer"}} title={`${a.desc} → ${a.reward}`}>{a.icon} {a.name}</span>))}
            </div>
          </div>}
          <div style={{display:"flex",gap:4,flexWrap:"wrap",justifyContent:"center",opacity:.4}}>
            {ACHIEVEMENTS.filter(a=>!(meta.achv||[]).includes(a.id)).map(a=>(<span key={a.id} onClick={()=>toast(a.icon,`${a.name}: ${a.desc}`,"#555")} style={{fontSize:10,padding:"2px 6px",borderRadius:4,background:"#ffffff04",border:"1px solid #ffffff08",color:"#555",fontFamily:"system-ui",cursor:"pointer"}} title={a.desc}>{a.icon} {a.name}</span>))}
          </div>
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
                return(<div key={i} title={`${c.name}. P${c.power} ${c.breed} ${c.trait?.icon||""} ${c.trait?.name||"Plain"}${c.bonded?" 💕":""}${c.scarred?" ⚔":""}
Saved from Night ${c.fromAnte||"?"}`} style={{
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
            {/* Name list — with epithets */}
            <div style={{display:"flex",gap:3,flexWrap:"wrap",justifyContent:"center",marginTop:8}}>
              {meta.cats.map((c,i)=>{const hasPair=c.pairId&&meta.cats.some((x,j)=>j!==i&&x.pairId===c.pairId);const fullN=c.epithet?`${c.name.split(" ")[0]} ${c.epithet}`:c.name.split(" ")[0];return(<span key={i} title={`${fullN} — ${c.breed}, P${c.power}, ${c.trait?.name||"Plain"}${c.story?.length?"\n"+c.story.join(", "):""}`} style={{fontSize:10,color:BREEDS[c.breed]?.color||"#888",fontFamily:"system-ui",padding:"2px 6px",borderRadius:3,background:c.enshrined?"#fbbf2411":"#ffffff06",border:c.enshrined?"1px solid #fbbf2433":hasPair?"1px solid #34d39933":"none",cursor:"help"}}>{c.enshrined?"🌟 ":""}{hasPair?"👪 ":""}{fullN} {c.sex==="M"?"♂":"♀"}</span>);})}
            </div>
            <div style={{fontSize:11,color:"#77777799",fontFamily:"system-ui",textAlign:"center",marginTop:8,fontStyle:"italic"}}>Nine colonies. One survived. Not because it was the strongest. Because someone remembered all the rest.</div>
          </div>}
        </div>}


      </div>
    </div>);
  }

  // v10: ANTE TRANSITION
  if(anteUp){
    return(<div style={W}><div style={BG}/><style>{CSS}</style>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",zIndex:1,gap:16,padding:20}}>
        <div style={{fontSize:13,color:"#ffffffbb",fontStyle:"italic",fontFamily:"'Cinzel',serif",textAlign:"center",maxWidth:300,lineHeight:1.6,animation:"fadeIn 1.5s ease-out",letterSpacing:1}}>{NIGHT_EPI[Math.min(anteUp.to-1,4)]}</div>
        <div style={{fontSize:72,fontWeight:900,background:"linear-gradient(135deg,#f59e0b,#fef08a)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",animation:"scorePop .6s ease-out",letterSpacing:8,marginTop:8}}>{anteUp.to}</div>
        <ProgressMap ante={anteUp.to} blind={0} mx={MX}/>
        <div style={{fontFamily:"system-ui",fontSize:10,color:"#666",marginTop:4}}>Threshold: <span style={{color:"#e8e6e3",fontWeight:700}}>{anteUp.target.toLocaleString()}</span></div>
        {ANTE_ESCALATION[Math.min(anteUp.to-1,4)]&&<div style={{fontSize:12,color:"#fbbf2466",fontStyle:"italic",fontFamily:"system-ui",animation:"fadeIn 1.4s ease-out",textAlign:"center",maxWidth:320,lineHeight:1.6,textShadow:"0 0 15px #fbbf2422"}}>{ANTE_ESCALATION[Math.min(anteUp.to-1,4)]}</div>}
        {anteUp.to>1&&<div style={{fontSize:11,color:"#d97706bb",fontStyle:"italic",fontFamily:"system-ui",animation:"fadeIn 1.2s ease-out",textAlign:"center"}}>⚡ The night deepens. The colony holds.</div>}
        
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
    const bossCtx={fallen:fallen.length,fallenName:fallen.length>0?fallen[fallen.length-1].name.split(" ")[0]:"",scarred:allC.filter(c=>c.scarred).length,bonded:allC.filter(c=>c.bondedTo).length,colony:allC.length,clutch:false,grudges:allC.reduce((s,c)=>(c.grudgedWith||[]).length+s,0)/2,deathless:fallen.length===0,gold};
    const dynamicTaunt=b.tauntFn?b.tauntFn(bossCtx):null;
    const bRec=(meta?.stats?.bossRecord||{})[b.id];
    const bWins=bRec?.w||0;const bLoss=bRec?.l||0;
    const mastery=BOSS_MASTERY[b.id];
    const hasMastery=mastery&&bWins>=mastery.wins;
    const careerTaunt=bWins>=5?pk([`${bWins} times you've beaten me. You think that changes anything?`,`We've done this ${bWins} times. I remember every one. Do you?`])
      :bWins>=3?pk([`Three times. You know my shape now. But shapes change.`,`You've beaten me before. The dark doesn't care about before.`])
      :bLoss>=3&&bWins===0?pk([`Every time, you come back. Every time, I remind you.`,`${bLoss} attempts. Zero victories. I admire the stubbornness.`])
      :null;
    return(<div style={W}><div style={BG}/><style>{CSS}</style>
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",zIndex:1,gap:vw<500?10:20,padding:vw<500?16:20,maxWidth:500}}>
      {BOSS_PORTRAITS[b.id]?<div style={{width:vw<500?120:200,height:vw<500?168:280,borderRadius:14,overflow:"hidden",animation:"fadeIn 1.2s ease-out",boxShadow:"0 0 60px #ef444433, 0 0 120px #ef444411",border:"1px solid #ef444422"}}>
        <img src={BOSS_PORTRAIT_BASE+BOSS_PORTRAITS[b.id]} alt={b.name} style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>{e.target.style.display="none";e.target.nextSibling.style.display="flex";}}/>
        <div style={{display:"none",width:"100%",height:"100%",alignItems:"center",justifyContent:"center",fontSize:72,background:"#0d1117"}}>{b.icon}</div>
      </div>:<div style={{fontSize:vw<500?48:72,filter:"drop-shadow(0 0 30px #ef444488)",animation:"fadeIn 1.2s ease-out"}}>{b.icon}</div>}
      <h2 style={{fontSize:30,color:"#ef4444",letterSpacing:8,margin:0,textShadow:"0 0 40px #ef444488",animation:"tierReveal 1s ease-out",fontFamily:"'Cinzel',serif"}}>{b.name}</h2>
      {hasMastery&&<div style={{fontSize:11,color:"#fbbf24",letterSpacing:4,fontFamily:"system-ui",fontWeight:700,animation:"fadeIn 1.2s ease-out"}}>YOU ARE THE {mastery.title}</div>}
      {(bWins>0||bLoss>0)&&<div style={{fontSize:10,color:"#ef444466",fontFamily:"system-ui",letterSpacing:2,animation:"fadeIn 1.5s ease-out"}}>{bWins}W / {bLoss}L</div>}
      <div style={{fontSize:17,color:"#ef4444",fontFamily:"system-ui",fontStyle:"italic",textAlign:"center",opacity:.8,animation:"fadeIn 1.5s ease-out",lineHeight:1.6,maxWidth:360,textShadow:"0 0 20px #ef444422"}}>"{b.taunt}"</div>
      {careerTaunt&&<div style={{fontSize:13,color:"#ef4444aa",fontFamily:"system-ui",fontStyle:"italic",textAlign:"center",animation:"fadeIn 2s ease-out",lineHeight:1.5,maxWidth:340}}>"{careerTaunt}"</div>}
      {dynamicTaunt&&!careerTaunt&&<div style={{fontSize:14,color:"#ef4444bb",fontFamily:"system-ui",fontStyle:"italic",textAlign:"center",animation:"fadeIn 2s ease-out"}}>"{dynamicTaunt}"</div>}
      {bossTraits.length>0&&<div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"center",animation:"fadeIn 1.8s ease-out",maxWidth:400}}>
        {bossTraits.map((t,i)=>(<div key={i} style={{padding:"8px 14px",borderRadius:8,background:"#ef444415",border:"1px solid #ef444433",textAlign:"center",minWidth:120,maxWidth:180}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
            <span style={{fontSize:16}}>{t.icon}</span>
            <span style={{fontSize:11,color:"#ef4444",fontWeight:700,letterSpacing:1}}>{t.name}</span>
          </div>
          <div style={{fontSize:13,color:"#ef4444cc",fontFamily:"system-ui",marginTop:3,lineHeight:1.3}}>{t.desc}</div>
          <div style={{fontSize:10,color:"#ef4444bb",fontStyle:"italic",fontFamily:"system-ui",marginTop:2}}>{t.flavor}</div>
        </div>))}
      </div>}
      <div style={{fontSize:11,color:"#ef4444bb",fontStyle:"italic",fontFamily:"system-ui",letterSpacing:2,animation:"fadeIn 2.5s ease-out"}}>{b.lore}</div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"center",marginTop:4}}>{curses.map((c,i)=>(<div key={i} style={{padding:"6px 10px",borderRadius:8,background:"#ef444408",border:"1px solid #ef444433",textAlign:"center",minWidth:90}}><span style={{fontSize:16}}>{c.icon}</span><div style={{fontSize:10,color:"#ef4444",fontWeight:600,marginTop:1}}>{c.name}</div><div style={{fontSize:12,color:"#ef4444bb",fontFamily:"system-ui",marginTop:1}}>{c.desc}</div></div>))}</div>
      {cfx.exileBreed&&<div style={{fontSize:11,color:"#ef4444bb",fontFamily:"system-ui"}}>{BREEDS[cfx.exileBreed].icon} {cfx.exileBreed} exiled</div>}
      <div style={{fontSize:12,color:"#666",fontFamily:"system-ui",marginTop:8}}>Threshold: <span style={{color:"#ef4444",fontWeight:700,fontSize:16}}>{eTgt().toLocaleString()}</span>
        {(meta?.heat||0)>0&&<span style={{color:"#ef4444bb",fontSize:10}}> (Heat +{(meta.heat||0)*10}%)</span>}
      </div>
      {hasRelic(3)&&<div style={{fontSize:10,color:"#4ade8066",fontFamily:"system-ui",fontStyle:"italic",textAlign:"center",maxWidth:300,lineHeight:1.5,animation:"fadeIn 2.5s ease-out",padding:"4px 12px",borderRadius:6,background:"#4ade8008",border:"1px solid #4ade8018"}}>
        👁️ The Vigil whispers: {b.id==="hunger"?"Bonds score double here. Fill every hand.":b.id==="territory"?"Scars make you stronger. The Territory respects fighters.":b.id==="mother"?"Don't spread thin. Pick your best five and commit.":b.id==="swarm"?"Nerve is everything. Build it before you get here.":b.id==="forgetting"?"Every name matters. Play your bonded pairs.":b.id==="fraying"?"Resolve your grudges before you get here. Every grudge is −2 mult.":b.id==="eclipse"?"Don't rest. Momentum carries through.":b.id==="ember"?"Give everything. One more hand is all it takes.":"Trust the colony."}
      </div>}
      <button onClick={()=>{
        if(bossTraits.some(bt=>bt.fx.marked)){
          const eligible=[...hand,...draw,...disc].filter(c=>!c.scarred);
          if(eligible.length>0){
            const victim=pk(eligible);
            [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>x.id===victim.id?{...x,scarred:true}:x));});
            victim.scarred=true;assignEpithet(victim);
            if(victim._newEpithet){delete victim._newEpithet;toast("🏷️",`${victim.name.split(" ")[0]} earned: "${victim.epithet}"`,BREEDS[victim.breed]?.color||"#fbbf24",2500);Audio.epithetEarned();}
            [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>x.id===victim.id?{...x,epithet:victim.epithet}:x));});
            toast("🪞",`${victim.name.split(" ")[0]} was scarred before the fight began.`,"#ef4444",2000);
          }
        }
        setPh("playing");
      }} style={{...BTN("linear-gradient(135deg,#ef4444,#dc2626)","#fff"),padding:"12px 40px",fontSize:15}}>Defend</button>
    </div></div>);}


  // ═══════════════════════════════════════════════════
  // v15: COLONY EVENT SCREEN
  // ═══════════════════════════════════════════════════
  if(ph==="event"&&colEvent){
    const evt=colEvent,tgts=colTargets;
    const allC2=[...hand,...draw,...disc];
    const evtCtx={
      all:allC2,colony:allC2.length,fallen,night:ante,ante,nerve:NERVE[ferv].name,
      scarred:allC2.filter(c=>c.scarred).length,injured:allC2.filter(c=>c.injured).length,
      bonded:allC2.filter(c=>c.bondedTo).length,grudges:allC2.reduce((s,c)=>(c.grudgedWith||[]).length+s,0)/2,
      gold,isNinthDawn,eventHistory,seasons:BK.map(b=>({name:b,count:allC2.filter(c=>c.breed===b).length})).filter(s=>s.count>0).sort((a,b)=>b.count-a.count),
    };
    const evtText=evt.textFn?evt.textFn(tgts,evtCtx):evt.text;
    const evtGlow=evt.tag==="survival"?"#ef4444":evt.tag==="memory"?"#c084fc":evt.tag==="bond"?"#4ade80":evt.tag==="growth"?"#fbbf24":evt.tag==="conflict"?"#fb923c":"#ffffff";
    return(<div style={W}><div style={BG}/><style>{CSS}</style>
      <div style={{position:"fixed",top:"12%",left:"50%",transform:"translateX(-50%)",width:350,height:350,borderRadius:"50%",background:`radial-gradient(circle,${evtGlow}06,transparent 70%)`,pointerEvents:"none",zIndex:0}}/>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",zIndex:1,gap:0,padding:20,maxWidth:480}}>
        <div style={{fontSize:10,color:"#ffffff12",letterSpacing:8,fontFamily:"system-ui",marginBottom:16,animation:"fadeIn 1.2s ease-out",textTransform:"uppercase"}}>Night {ante} {"\u00B7"} {["Dusk","Midnight","After the Boss"][blind]}</div>
        <div style={{fontSize:64,marginBottom:8,animation:"fadeIn .6s ease-out",filter:`drop-shadow(0 0 40px ${evtGlow}22)`}}>{evt.icon}</div>
        <h2 style={{fontSize:20,color:"#e8e6e3",letterSpacing:6,margin:"0 0 6px 0",fontWeight:600,animation:"fadeIn .8s ease-out",fontFamily:"'Cinzel',serif"}}>{evt.title}</h2>
        {evt.tag&&<div style={{fontSize:10,color:evtGlow+"66",fontFamily:"system-ui",letterSpacing:4,padding:"3px 12px",borderRadius:12,border:`1px solid ${evtGlow}15`,marginBottom:16,animation:"fadeIn 1s ease-out",textTransform:"uppercase"}}>{evt.tag}</div>}
        <div style={{fontSize:15,color:"#c8c2bbdd",fontFamily:"system-ui",textAlign:"center",lineHeight:2.1,maxWidth:360,fontStyle:"italic",animation:"fadeIn 1.2s ease-out",marginBottom:16,padding:"0 8px"}}>{evtText}</div>
        {meta&&meta.cats.length>0&&tgts.length>0&&(()=>{
          const tgtBreeds=new Set(tgts.map(t=>t.breed));
          const match=meta.cats.find(c=>tgtBreeds.has(c.breed));
          if(!match||Math.random()>0.25)return null; // 25% chance
          const fn=match.name?.split(" ")[0]||"Someone";
          const templates=match.scarred?[`${fn} carried a scar like this. From a colony that fell before yours.`,`The Hearth remembers ${fn}. Same season. Same wariness.`]
            :match.bonded?[`${fn} would have known what to do here. They always did.`,`Something about this reminds you of ${fn}. The way the light falls.`]
            :[`${fn}'s shadow falls across this moment. They survived something like this.`,`The Hearth flickers. ${fn} is watching.`];
          return <div style={{fontSize:11,color:"#c084fc44",fontStyle:"italic",fontFamily:"system-ui",textAlign:"center",maxWidth:300,lineHeight:1.5,animation:"fadeIn 2s ease-out",marginBottom:8}}>
            {pk(templates)}
          </div>;
        })()}
        {tgts.length>0&&<div style={{display:"flex",gap:14,justifyContent:"center",marginBottom:20,animation:"fadeIn 1s ease-out 0.3s both"}}>
          {tgts.map((t,i)=>(<div key={t.id} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
            <CC cat={t}/>
            <div style={{fontSize:11,color:BREEDS[t.breed]?.color||"#888",fontFamily:"system-ui",letterSpacing:1,fontWeight:700}}>{t.name.split(" ")[0]}</div>
            {t.trait&&t.trait.name!=="Plain"&&<div style={{fontSize:10,color:"#ffffff44",fontFamily:"system-ui"}}>{t.trait.icon} {t.trait.name}</div>}
          </div>))}
        </div>}
        <div style={{width:60,height:1,background:`linear-gradient(90deg,transparent,${evtGlow}22,transparent)`,marginBottom:16}}/>
        <div style={{display:"flex",flexDirection:"column",gap:10,width:"100%",maxWidth:vw<500?vw-32:380}}>
          {evt.choices.map((ch,i)=>{
            const canAfford=!ch.fx.gold||ch.fx.gold>=0||gold>=Math.abs(ch.fx.gold);
            const label=ch.labelFn?ch.labelFn(tgts):ch.label;
            const hint=(()=>{
              const fx=ch.fx;const hints=[];
              if(fx.gold&&fx.gold<0)hints.push({t:"Costly",c:"#fbbf24",ic:"🐟"});
              if(fx.injure||fx.scar||fx.scarTarget||fx.lose)hints.push({t:"Risky",c:"#ef4444",ic:"\u26A0"});
              if(fx.nerve&&fx.nerve<0||fx.fervMod&&fx.fervMod<0)hints.push({t:"Risky",c:"#ef4444",ic:"\u26A0"});
              if(fx.heal||fx.healAll||fx.denSafe||fx.shelter)hints.push({t:"Safe",c:"#4ade80",ic:"🛡️"});
              if(fx.trait||fx.addNamedTrait||fx.specificTrait||fx.rareTrait||fx.addWard)hints.push({t:"Growth",c:"#c084fc",ic:"\u2726"});
              if(fx.gold&&fx.gold>0)hints.push({t:"Rations",c:"#fbbf24",ic:"🐟"});
              if(!hints.length&&(fx.nerve>0||fx.fervor>0))hints.push({t:"Bold",c:"#fb923c",ic:"🔥"});
              return hints[0]||null;
            })();
            return(<button key={i} onClick={()=>canAfford&&chooseEvent(i)} style={{
              padding:"16px 22px",borderRadius:14,
              background:canAfford?"linear-gradient(145deg,#ffffff08,#ffffff03)":"#0a0a0a",
              border:`1.5px solid ${canAfford?"#ffffff1a":"#ffffff06"}`,cursor:canAfford?"pointer":"not-allowed",
              fontFamily:"'Cinzel',serif",transition:"all .3s",opacity:canAfford?1:.25,
              textAlign:"left",
              animation:`fadeIn .5s ease-out ${1+i*0.2}s both`,
              boxShadow:canAfford?"0 4px 20px #00000044":"none"
            }}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
                <span style={{fontSize:15,color:canAfford?"#e8e6e3":"#555",fontWeight:500,letterSpacing:1,lineHeight:1.4}}>{label}</span>
                {hint&&canAfford&&<span style={{fontSize:10,color:hint.c,fontFamily:"system-ui",letterSpacing:1,flexShrink:0,padding:"3px 8px",borderRadius:6,background:hint.c+"11",border:`1px solid ${hint.c}22`,display:"flex",alignItems:"center",gap:3}}>{hint.ic} {hint.t}</span>}
              </div>
              {!canAfford&&<span style={{fontSize:10,color:"#ef4444bb",fontFamily:"system-ui",display:"block",marginTop:4}}>Need {Math.abs(ch.fx.gold||0)}🐟</span>}
            </button>);
          })}
          {hasRelic(1)&&<button onClick={()=>{setFerv(f=>Math.min(NERVE_MAX,f+1));setEventOutcome({title:evt.title,icon:evt.icon,choice:"Stoke the First Flame",desc:[{text:"The first light anyone carried out of the dark. +1 Nerve.",color:"#fbbf24",icon:"🕯️"}],targets:[]});setPh("eventResult");}} style={{
            padding:"16px 22px",borderRadius:14,background:"linear-gradient(145deg,#fbbf2408,#fbbf2402)",border:"1.5px solid #fbbf2420",cursor:"pointer",fontFamily:"'Cinzel',serif",
            animation:`fadeIn .5s ease-out ${1+evt.choices.length*0.2}s both`
          }}>
            <span style={{fontSize:15,color:"#fbbf24",fontWeight:500,letterSpacing:1}}>{"🕯️"} Stoke the First Flame</span>
          </button>}
        </div>
        <div style={{display:"flex",gap:12,marginTop:16,animation:"fadeIn 1.5s ease-out 0.8s both",alignItems:"center"}}>
          {(()=>{const allCount=[...hand,...draw,...disc].length;const scarCount=allC2.filter(c=>c.scarred).length;
            return(<>
              <span style={{fontSize:10,color:"#ffffff55",fontFamily:"system-ui"}}>{allCount} cats</span>
              {scarCount>0&&<span style={{fontSize:10,color:"#fb923c33",fontFamily:"system-ui"}}>{scarCount} scarred</span>}
              <span style={{fontSize:10,color:"#fbbf24",fontFamily:"system-ui",fontWeight:700}}>{gold}🐟</span>
            </>);
          })()}
        </div>
      </div>
    </div>);
  }


  // EVENT OUTCOME
  if(ph==="eventResult"&&eventOutcome){
    const eo=eventOutcome;
    const advanceEvent=()=>{
      const wasScavenge=eventOutcome?.title==="Scavenge";
      const wasCamp=eventOutcome?.title==="Camp";
      setEventOutcome(null);
      if(wasScavenge&&blind<=1){fireEvent();}
      else if(wasCamp){nextBlind();} // Camp skips market AND event
      else{nextBlind();}
    };
    const resGlow=eo.desc.length>0?(eo.desc[0].color||"#ffffff"):"#ffffff";
    return(<div style={W}><div style={BG}/><style>{CSS}</style>
      <div style={{position:"fixed",top:"10%",left:"50%",transform:"translateX(-50%)",width:350,height:350,borderRadius:"50%",background:`radial-gradient(circle,${resGlow}08,transparent 60%)`,pointerEvents:"none",zIndex:0}}/>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",zIndex:1,gap:0,padding:20,maxWidth:480}}>
        {/* Icon — big, glowing */}
        <div style={{fontSize:56,animation:"fadeIn .4s ease-out",filter:`drop-shadow(0 0 40px ${resGlow}22)`,marginBottom:8}}>{eo.icon}</div>
        {/* Title */}
        <h2 style={{fontSize:20,color:"#e8e6e3cc",letterSpacing:5,margin:"0 0 6px",fontWeight:500,animation:"fadeIn .6s ease-out",fontFamily:"'Cinzel',serif"}}>{eo.title}</h2>
        {/* Choice made — styled quote */}
        <div style={{fontSize:13,color:"#ffffff66",fontFamily:"'Cinzel',serif",fontStyle:"italic",letterSpacing:2,animation:"fadeIn .8s ease-out",padding:"8px 20px",borderRadius:12,background:"linear-gradient(145deg,#ffffff05,#ffffff02)",border:"1px solid #ffffff0a",marginBottom:16}}>"{eo.choice}"</div>
        {/* Cats involved — full size */}
        {eo.targets&&eo.targets.length>0&&<div style={{display:"flex",gap:14,justifyContent:"center",marginBottom:16,animation:"fadeIn .6s ease-out 0.2s both"}}>
          {eo.targets.map((t,i)=>{
            const updated=[...hand,...draw,...disc].find(c=>c.id===t.id)||t;
            return(<div key={t.id} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
              <CC cat={updated}/>
              <div style={{fontSize:11,color:BREEDS[updated.breed]?.color||"#888",fontFamily:"system-ui",fontWeight:700}}>{updated.name.split(" ")[0]}</div>
            </div>);
          })}
        </div>}
        {/* Divider */}
        <div style={{width:80,height:1,background:`linear-gradient(90deg,transparent,${resGlow}22,transparent)`,marginBottom:14}}/>
        {/* Consequences — dramatic cards */}
        <div style={{display:"flex",flexDirection:"column",gap:10,width:"100%",maxWidth:vw<500?vw-32:380}}>
          {eo.desc.map((d,i)=>(
            <div key={i} style={{display:"flex",gap:12,alignItems:"center",padding:"14px 18px",borderRadius:14,
              background:`linear-gradient(145deg,${d.color}0a,${d.color}03)`,border:`1.5px solid ${d.color}22`,
              boxShadow:`0 4px 20px ${d.color}11`,
              animation:`fadeIn .6s ease-out ${0.4+i*0.25}s both`}}>
              <span style={{fontSize:26,flexShrink:0,filter:`drop-shadow(0 0 10px ${d.color}44)`}}>{d.icon}</span>
              <span style={{fontSize:14,color:d.color,fontWeight:600,fontFamily:"system-ui",lineHeight:1.6}}>{d.text}</span>
            </div>
          ))}
        </div>
        {/* Continue */}
        <button onClick={advanceEvent} style={{...BTN("linear-gradient(135deg,#fbbf24,#f59e0b)","#0a0a1a"),marginTop:20,padding:"12px 40px",fontSize:14,letterSpacing:2,animation:`fadeIn .5s ease-out ${0.4+eo.desc.length*0.25+0.3}s both`,boxShadow:"0 0 24px #fbbf2422"}}>Continue {"\u2192"}</button>
      </div>
    </div>);
  }
  // OVERFLOW
  if(ph==="overflow"&&oData){const o=oData;
    const pctClear=o.tgt>0?Math.round(o.fs/o.tgt*100):100;
    const clearLine=blind>=2?null:getThresholdClear(ante,blind,clutch,pctClear);
    return(<div style={{...W,animation:clutch?"flash .6s ease-out":"none"}}><div style={BG}/><style>{CSS}</style>
    {clutch&&<div style={{position:"fixed",inset:0,zIndex:50,background:"radial-gradient(circle,#fbbf2433,transparent 70%)",pointerEvents:"none",animation:"flash 1.5s ease-out"}}/>}
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",zIndex:1,gap:10,padding:20}}>
      {clutch&&<div style={{fontSize:22,fontWeight:900,color:"#fbbf24",letterSpacing:8,textShadow:"0 0 30px #fbbf24cc",animation:"clutchBurst .8s ease-out",fontFamily:"'Cinzel',serif",marginBottom:4}}>CLUTCH</div>}
      <div style={{fontSize:14,color:blind>=2?"#4ade80":"#fbbf24",letterSpacing:3}}>{blind>=2?(clutch?"Survived. Barely.":"Survived."):"The threshold breaks."}</div>
      {clearLine&&<div style={{fontSize:13,color:"#ffffffbb",fontStyle:"italic",fontFamily:"system-ui",textAlign:"center",maxWidth:320,lineHeight:1.6,animation:"fadeIn 1.2s ease-out",textShadow:"0 0 15px #ffffff11"}}>{clearLine}</div>}
      {blind>=2&&boss&&(()=>{
        const dCtx={fallen:fallen.length,fallenName:fallen.length>0?fallen[fallen.length-1].name.split(" ")[0]:"",scarred:allC.filter(c=>c.scarred).length,bonded:allC.filter(c=>c.bondedTo).length,colony:allC.length,clutch:clutch,grudges:allC.reduce((s,c)=>(c.grudgedWith||[]).length+s,0)/2,deathless:fallen.length===0};
        const dLine=boss.defeatFn?boss.defeatFn(dCtx):null;
        return(<div style={{textAlign:"center"}}>
          <div style={{fontSize:13,color:"#4ade80bb",fontStyle:"italic",fontFamily:"system-ui",marginTop:4,lineHeight:1.5}}>"{boss.defeat}"</div>
          {dLine&&<div style={{fontSize:11,color:"#4ade80bb",fontStyle:"italic",fontFamily:"system-ui",marginTop:2}}>"{dLine}"</div>}
        </div>);
      })()}
      {blind===1&&<div style={{fontSize:13,color:"#ef4444",fontWeight:700,letterSpacing:3,fontFamily:"system-ui",animation:"fpp 1s ease infinite"}}>Something approaches...</div>}
      {ante>=4&&blind<2&&(clutch||o.fs<o.tgt*1.3)&&boss&&(()=>{
        const bCtx={fallen:fallen.length,fallenName:fallen.length>0?fallen[fallen.length-1].name.split(" ")[0]:"",scarred:allC.filter(c=>c.scarred).length,bonded:allC.filter(c=>c.bondedTo).length,colony:allC.length,clutch,grudges:allC.reduce((s,c)=>(c.grudgedWith||[]).length+s,0)/2,deathless:fallen.length===0,gold};
        const earlyTaunt=boss.tauntFn?boss.tauntFn(bCtx):null;
        return earlyTaunt?(<div style={{textAlign:"center",animation:"fadeIn 1.5s ease-out",padding:"6px 14px",borderRadius:8,background:"#ef444408",border:"1px solid #ef444418",maxWidth:340}}>
          <span style={{fontSize:14}}>{boss.icon}</span>
          <div style={{fontSize:11,color:"#ef4444bb",fontStyle:"italic",fontFamily:"system-ui",lineHeight:1.5}}>"{earlyTaunt}"</div>
          <div style={{fontSize:10,color:"#ef444433",fontFamily:"system-ui",marginTop:2}}>{boss.name} watches.</div>
        </div>):null;
      })()}
      {(()=>{
        const scoreSize=pctClear>=300?52:pctClear>=200?44:pctClear>=150?40:36;
        const tgtSize=pctClear>=300?16:pctClear>=200?14:13;
        const scoreColor=pctClear>=300?"#c084fc":pctClear>=200?"#fef08a":pctClear>=150?"#4ade80":"#fbbf24";
        const glowSize=pctClear>=300?60:pctClear>=200?40:30;
        const shakeAnim=pctClear>=300?"bigShake .6s ease-out":pctClear>=200?"comboBurst .5s ease-out":"";
        return(<>
          <div style={{fontSize:scoreSize,fontWeight:900,color:scoreColor,textShadow:`0 0 ${glowSize}px ${scoreColor}44`,animation:shakeAnim||"fadeIn .6s ease-out",letterSpacing:pctClear>=200?3:1}}>{o.fs.toLocaleString()}</div>
          <div style={{fontSize:tgtSize,color:pctClear>=200?"#888":"#666",fontFamily:"system-ui"}}>Threshold: {o.tgt.toLocaleString()}</div>
        </>);
      })()}
      <div style={{display:"flex",flexDirection:"column",gap:5,background:"#ffffff06",borderRadius:12,padding:"14px 22px",border:"1px solid #ffffff0a",minWidth:260}}>
        <div onClick={()=>toast("📊","The higher you score above the target, the more rations you earn. Survived: 2🐟, Comfortable: 3🐟, Crushing: 4🐟, Dominating: 5-6🐟, Legendary: 6🐟. Boss rounds give +2🐟 extra.","#fbbf24")} style={{display:"flex",justifyContent:"space-between",fontFamily:"system-ui",fontSize:11,cursor:"help"}}><span style={{color:"#888"}}>Performance</span><span style={{color:pctClear>=300?"#c084fc":pctClear>=200?"#fbbf24":pctClear>=150?"#4ade80":"#888",fontWeight:700}}>{pctClear>=300?"Legendary":pctClear>=200?"Dominating":pctClear>=150?"Crushing":pctClear>=120?"Comfortable":"Survived"} ({pctClear}%)</span></div>
        {o.uh>0&&<div style={{display:"flex",justifyContent:"space-between",fontFamily:"system-ui",fontSize:11}}><span style={{color:"#888"}}>{o.uh} Unused Hand{o.uh>1?"s":""}</span><span style={{color:"#3b82f6"}}>saved</span></div>}
        <div style={{borderTop:"1px solid #ffffff0a",paddingTop:4,display:"flex",justifyContent:"space-between",fontFamily:"system-ui",fontSize:11}}><span style={{color:"#888"}}>Rations Earned</span><span style={{color:"#fbbf24",fontWeight:700}}>+{o.gR} 🐟</span></div>
        {o.interest>0&&<div style={{display:"flex",justifyContent:"space-between",fontFamily:"system-ui",fontSize:11}}><span style={{color:"#4ade80"}}>Stores (interest)</span><span style={{color:"#4ade80",fontWeight:700}}>+{o.interest} 🐟</span></div>}
      </div>
      {(()=>{const overflowLines=[
        "The colony eats. Not well, but enough.",
        "Rations counted. Names remembered. Another round survived.",
        "The dark doesn't care about your budget. But you have to.",
        "Food is a number. Hunger is a feeling. Both matter.",
        "They divide it evenly. Nobody asks for more. Not tonight.",
        "Every ration is borrowed time. Spend it wisely.",
        "The pantry's lighter than yesterday. The colony's heavier.",
        "Interest compounds. So does hope.",
        "You count rations. The dark counts nights. Different math, same question.",
        "Enough for one more round. That's always the answer.",
      ];
      // ★ Colony whisper: 30% chance to thread mythology through bookkeeping
      const seed=(ante*7+blind*3+gold)%10;
      const whisperPool=blind>=2?WHISPER_OVERFLOW.boss:pctClear>=200?WHISPER_OVERFLOW.crush:pctClear<130?WHISPER_OVERFLOW.scrape:null;
      const line=(seed<3&&whisperPool)?whisperPool[seed%whisperPool.length]:overflowLines[((ante-1)*3+blind)%overflowLines.length];
      return <div style={{fontSize:11,color:seed<3&&whisperPool?"#fbbf2444":"#ffffff44",fontStyle:"italic",fontFamily:"system-ui",textAlign:"center",maxWidth:280,lineHeight:1.5,marginTop:8,animation:"fadeIn 1.5s ease-out"}}>{line}</div>;})()}
      {blind>=2?(()=>{
        // Generate 3 reward choices if not already set
        if(bossRewardChoices.length===0){
          const picks=pickBossRewards(ante,prevRewardIdsRef.current);
          setBossRewardChoices(picks);
          prevRewardIdsRef.current=[...prevRewardIdsRef.current,...picks.map(r=>r.id)].slice(-6);
        }
        const choices=bossRewardChoices.length>0?bossRewardChoices:pickBossRewards(ante,[]);
        function claimReward(rw){
          const all=[...hand,...draw,...disc];
          if(rw.type==="gold")setGold(g=>g+rw.value);
          if(rw.type==="gold_nerve"){setGold(g=>g+rw.value);setFerv(f=>Math.min(NERVE_MAX,f+1));}
          if(rw.type==="gold_sacrifice"){setGold(g=>g+rw.value);const w=[...all].sort((a,b)=>a.power-b.power)[0];if(w&&all.length>MIN_DECK){[setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.filter(x=>x.id!==w.id));});setFallen(f=>[...f,{name:w.name,breed:w.breed,night:ante}]);}}
          if(rw.type==="hands")setRunBonus(b=>({...b,hands:b.hands+rw.value}));
          if(rw.type==="freeRecruits")setTempMods(m=>({...m,freeRecruits:(m.freeRecruits||0)+rw.value}));
          if(rw.type==="temp_both")setTempMods(m=>({...m,hands:m.hands+1,freeRecruits:(m.freeRecruits||0)+2}));
          if(rw.type==="power"){[setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>({...x,power:Math.min(15,x.power+rw.value)})));});}
          if(rw.type==="elite_power"){const best=[...all].sort((a,b)=>b.power-a.power)[0];const worst=[...all].sort((a,b)=>a.power-b.power)[0];if(best){[setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>{if(x.id===best.id)return{...x,power:Math.min(15,x.power+3)};if(worst&&x.id===worst.id)return{...x,power:Math.max(1,x.power-1)};return x;}));});};}
          if(rw.type==="surge"){[setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>({...x,power:Math.min(15,x.power+2)})));});}
          if(rw.type==="trait"){const best=[...all].sort((a,b)=>b.power-a.power)[0];if(best){const rt=pk(RARE_TRAITS);[setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>{if(x.id===best.id){addTrait(x,rt);return{...x};}return x;}));});};}
          if(rw.type==="mass_trait"){const plains=all.filter(c=>catIsPlain(c)).slice(0,3);plains.forEach(c=>{const t=pk(COMMON_TRAITS);[setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>{if(x.id===c.id){addTrait(x,t);return{...x};}return x;}));});});}
          if(rw.type==="power_all"){[setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>({...x,power:Math.min(15,x.power+1)})));});toast("★","Battle-forged. All cats +1 Power.","#fbbf24");}
          if(rw.type==="thin"){const maxRemove=Math.max(0,all.length-MIN_DECK);const sorted=[...draw].sort((a,b)=>a.power-b.power).slice(0,Math.min(rw.value,maxRemove));setDraw(d=>d.filter(x=>!sorted.find(r=>r.id===x.id)));}
          if(rw.type==="recruit"){for(let i=0;i<2;i++){const nc=gC({trait:pk(COMMON_TRAITS),power:3+Math.floor(Math.random()*4)});setDraw(d=>[...d,nc]);}}
          if(rw.type==="shelter")setEventDenBonus(b=>b+1);
          if(rw.type==="nerve")setFerv(f=>Math.min(NERVE_MAX,f+rw.value));
          if(rw.type==="nerve_surge"){setFerv(f=>Math.min(NERVE_MAX,f+4));toast("🛡️","+4 Nerve! Unbreakable.","#c084fc");}
          if(rw.type==="ward"){const avail=FAMS.filter(w=>!fams.find(f=>f.id===w.id));if(avail.length>0&&fams.length<MF){setFams(fs=>[...fs,pk(avail)]);}else{setGold(g=>g+5);}}
          if(rw.type==="heal_safe"){[setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>({...x,injured:false,injuryTimer:0})));});setEventDenSafe(true);}
          if(rw.type==="gamble"){if(Math.random()<0.55)setGold(g=>g+10);else setGold(g=>Math.floor(g/2));}
          if(rw.type==="blood_price"){const best=[...all].sort((a,b)=>b.power-a.power)[0];if(best){[setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>{if(x.id===best.id)return{...x,scarred:true};return{...x,power:Math.min(15,x.power+2)};}));});};}
          logEvent("reward",{name:rw.name,desc:rw.desc});setBossRewardChoices([]);setOData(null);genShop();setPh("shop");
        }
        return(<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,marginTop:4}}>
          <div style={{fontSize:10,color:"#4ade80bb",letterSpacing:2,fontFamily:"system-ui"}}>CHOOSE YOUR REWARD</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center"}}>
            {choices.map((rw,i)=>(
              <button key={rw.id||i} onClick={()=>claimReward(rw)} style={{
                padding:"12px 14px",borderRadius:10,
                background:"linear-gradient(145deg,#1b2e1b,#0d0d1a)",
                border:"1px solid #4ade8044",textAlign:"center",
                cursor:"pointer",minWidth:110,maxWidth:130,
                transition:"all .2s",
              }}
              onMouseEnter={e=>{e.currentTarget.style.border="1px solid #4ade80aa";e.currentTarget.style.transform="scale(1.05)";}}
              onMouseLeave={e=>{e.currentTarget.style.border="1px solid #4ade8044";e.currentTarget.style.transform="scale(1)";}}>
                <div style={{fontSize:22}}>{rw.icon}</div>
                <div style={{fontSize:11,fontWeight:700,color:"#4ade80",letterSpacing:.5,marginTop:4,lineHeight:1.3}}>{rw.name}</div>
                <div style={{fontSize:10,color:"#888",fontFamily:"system-ui",marginTop:3,lineHeight:1.3}}>{rw.desc}</div>
              </button>
            ))}
          </div>
        </div>);
      })()
        :<>
        <div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap",justifyContent:"center"}}>
          {/* MARKET */}
          <button onClick={()=>{setOData(null);setSkipShop(false);genShop();setPh("shop");}} style={{
            ...BTN(isFirstRun&&!seen.shop?"linear-gradient(135deg,#4ade80,#22d3ee)":"linear-gradient(135deg,#fbbf24,#f59e0b)","#0a0a1a"),
            padding:isFirstRun&&!seen.shop?"12px 28px":"10px 20px",fontSize:isFirstRun&&!seen.shop?15:12,
            animation:isFirstRun&&!seen.shop?"breathe 2s ease-in-out infinite":"none",
            boxShadow:isFirstRun&&!seen.shop?"0 0 20px #4ade8066":"none",
            display:"flex",flexDirection:"column",alignItems:"center",gap:2,minWidth:100,
          }}>
            <span style={{fontSize:16}}>🏪</span>
            <span>{isFirstRun&&!seen.shop?"Enter the Market ✦":"Market"}</span>
            <span style={{fontSize:10,fontWeight:400,opacity:.6,fontFamily:"system-ui"}}>buy wards, cats, scrolls</span>
          </button>
          {/* SCAVENGE — hidden until first market visit on first run */}
          {(seen.shop||!isFirstRun)&&<button onClick={()=>{
            const baseG=3+ante;const results=[];let bonusG=0;
            results.push({text:`The colony scavenges. +${baseG}🐟 rations found.`,color:"#fbbf24",icon:"🐟"});
            // 25% chance of a bonus find
            if(Math.random()<0.25){
              const r=Math.random();
              if(r<0.35){
                bonusG=2+Math.floor(Math.random()*3);
                results.push({text:`Dug through the ruins. +${bonusG}🐟 extra.`,color:"#fbbf24",icon:"🪙"});
              }else if(r<0.65){
                const nc=gC({trait:PLAIN,power:3+Math.floor(Math.random()*3)});nc.power=Math.min(6,nc.power);
                setDraw(d=>[...d,nc]);
                results.push({text:`A stray named ${nc.name.split(" ")[0]} followed them back. (${BREEDS[nc.breed]?.icon} P${nc.power})`,color:"#4ade80",icon:"🐱"});
              }else{
                const injured=[...hand,...draw,...disc].filter(c=>c.injured);
                if(injured.length>0){
                  const h=pk(injured);[setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(c=>c.id===h.id?{...c,injured:false,injuryTimer:0}:c));});
                  results.push({text:`Found wild herbs. ${h.name.split(" ")[0]} healed.`,color:"#4ade80",icon:"🌿"});
                }else{bonusG=2;results.push({text:`Nothing special in the ruins. +2🐟.`,color:"#888",icon:"🪨"});}
              }
            }else{
              const flavors=["The dark left nothing behind. But the rations are enough.",
                "Slim pickings. The colony eats, at least.",
                "They came back quiet. No finds. But no losses either.",
                "The ruins had nothing left to give. The colony carries on."];
              results.push({text:pk(flavors),color:"#ffffff44",icon:"🌙"});
            }
            setGold(g=>g+baseG+bonusG);
            setOData(null);
            setEventOutcome({title:"Scavenge",icon:"🌿",choice:"The colony spread out to search.",desc:results,targets:[]});
            setPh("eventResult");
            // ★ After eventResult dismiss, it calls advanceEvent → fireEvent or nextBlind
          }} style={{
            ...BTN("#1a2e1a","#4ade80"),padding:"10px 20px",fontSize:12,
            border:"1px solid #4ade8044",display:"flex",flexDirection:"column",alignItems:"center",gap:2,minWidth:100,
          }}>
            <span style={{fontSize:16}}>🌿</span>
            <span>Scavenge</span>
            <span style={{fontSize:10,fontWeight:400,opacity:.6,fontFamily:"system-ui"}}>+{3+ante}🐟, maybe more</span>
          </button>}
          {/* CAMP — hidden until first market visit on first run */}
          {(seen.shop||!isFirstRun)&&<button onClick={()=>{setCampMode(true);setDen([]);setOData(null);setPh("denSelect");}} style={{
            ...BTN("#1a1a2e","#c084fc"),padding:"10px 20px",fontSize:12,
            border:"1px solid #c084fc44",display:"flex",flexDirection:"column",alignItems:"center",gap:2,minWidth:100,
          }}>
            <span style={{fontSize:16}}>🏕</span>
            <span>Camp</span>
            <span style={{fontSize:10,fontWeight:400,opacity:.6,fontFamily:"system-ui"}}>heal, +2 nerve, bond</span>
          </button>}
        </div>
        </>}
    </div></div>);}

  // v13: BOSS REWARD — now handled by overflow screen pick-1-of-3 system
  // Legacy bossReward phase disabled

  if(ph==="defeat"&&defeatData){
    return(<div style={W}><div style={BG}/><style>{CSS}</style>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",zIndex:1,gap:16,padding:20,maxWidth:500}}>
        <div style={{fontSize:64,opacity:.6,animation:"fadeIn 1s ease-out",filter:"drop-shadow(0 0 30px #ef444488)"}}>💀</div>
        <h2 style={{fontSize:28,color:"#ef4444",letterSpacing:6,margin:0,textShadow:"0 0 40px #ef444444",animation:"tierReveal 1s ease-out",fontFamily:"'Cinzel',serif"}}>COLONY FELL</h2>
        <div style={{fontSize:16,color:"#ef4444aa",fontFamily:"system-ui",fontStyle:"italic",textAlign:"center",maxWidth:360,lineHeight:1.7,animation:"fadeIn 1.5s ease-out"}}>{defeatData.line}</div>
        <div style={{display:"flex",gap:12,fontFamily:"system-ui",fontSize:13,color:"#666",animation:"fadeIn 2s ease-out"}}>
          <span>Night {ante}</span>
          <span style={{color:"#ef4444"}}>{defeatData.blind}</span>
        </div>
        <div style={{display:"flex",gap:2,alignItems:"baseline",animation:"fadeIn 2s ease-out"}}>
          <span style={{fontSize:28,fontWeight:900,color:"#ef4444bb"}}>{defeatData.score.toLocaleString()}</span>
          <span style={{fontSize:12,color:"#555",fontFamily:"system-ui"}}> / {defeatData.target.toLocaleString()} threshold</span>
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
    const totalScored=runLog.filter(e=>e.type==="hand").reduce((s,e)=>s+(e.data?.score||0),0);
    const handsPlayed=runLog.filter(e=>e.type==="hand").length;
    const bestHand=runLog.filter(e=>e.type==="hand").reduce((best,e)=>Math.max(best,e.data?.score||0),0);
    const catsLost=fallen.length;
    const catsBonded=allC.filter(c=>c.bondedTo).length;
    const statItems=won?[
      {label:"TOTAL SCORED",val:totalScored.toLocaleString(),color:"#fbbf24"},
      {label:"HANDS PLAYED",val:handsPlayed,color:"#3b82f6"},
      {label:"BEST HAND",val:bestHand.toLocaleString(),color:"#c084fc"},
      ...(catsLost>0?[{label:"CATS LOST",val:catsLost,color:"#ef4444"}]:[]),
      ...(catsBonded>0?[{label:"BONDS FORMED",val:Math.floor(catsBonded/2),color:"#4ade80"}]:[]),
      {label:"PEAK NERVE",val:NERVE[rMaxF].name,color:NERVE[rMaxF].color},
    ]:[];
    return(<div style={W}><div style={BG}/><style>{CSS}</style>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",zIndex:1,gap:12,padding:20,maxWidth:550}}>
        <div style={{fontSize:48,animation:"comboBurst .8s ease-out"}}>{won?(isNinthDawn?"🌅":"👑"):"💀"}</div>
        <h2 style={{fontSize:won&&isNinthDawn?42:28,letterSpacing:won&&isNinthDawn?12:6,margin:0,color:won?undefined:"#ef4444",background:won?"linear-gradient(135deg,#f59e0b,#fef08a)":undefined,WebkitBackgroundClip:won?"text":undefined,WebkitTextFillColor:won?"transparent":undefined,animation:"comboBurst .6s ease-out",fontFamily:"'Cinzel',serif"}}>{won?(isNinthDawn?"DAWN":"THEY MADE IT"):"THE DARK WON"}</h2>
        {(()=>{const breath=won
          ?(fallen.length===0?`${MX} night${MX>1?"s":""}. All of them.`
           :ante>=MX?`${MX} nights. ${allC.length} still breathing.`
           :`${ante} night${ante>1?"s":""}. Enough to earn a name.`)
          :(ante>=MX?`Night ${ante}. So close to dawn.`
           :ante>=3?`Night ${ante}. They learned the dark's shape. The dark learned theirs.`
           :`Night ${ante}. It ends where it began.`);
        return <div style={{fontSize:11,color:won?"#fbbf2466":"#ef444466",fontStyle:"italic",fontFamily:"system-ui",letterSpacing:2,animation:"fadeIn 1.5s ease-out",marginTop:4}}>{breath}</div>;})()}
        {!isNinthDawn&&<div style={{fontSize:12,color:won?"#fbbf2444":"#ef444433",fontStyle:"italic",fontFamily:"'Cinzel',serif",letterSpacing:2,animation:"fadeIn 2s ease-out .5s both"}}>{won?"Nine colonies. One survived.":"Eight colonies fell. Now nine."}</div>}
        {won&&isNinthDawn&&<div style={{fontSize:14,color:"#fbbf24aa",fontStyle:"italic",fontFamily:"system-ui",textAlign:"center",maxWidth:360,lineHeight:1.7,animation:"fadeIn 2s ease-out"}}>Nine colonies. One survived. Not because it was the strongest. Because someone remembered all the rest.</div>}
        {won&&statItems.length>0&&<div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"center",maxWidth:400,marginTop:4}}>
          {statItems.map((st,i)=>(<div key={i} style={{textAlign:"center",padding:"6px 12px",borderRadius:8,background:`${st.color}08`,border:`1px solid ${st.color}22`,animation:`scorePop .4s ease-out ${0.8+i*0.3}s both`,minWidth:80}}>
            <div style={{fontSize:10,color:`${st.color}88`,letterSpacing:2,fontFamily:"system-ui"}}>{st.label}</div>
            <div style={{fontSize:16,fontWeight:900,color:st.color,fontFamily:"system-ui"}}>{st.val}</div>
          </div>))}
        </div>}
        {won&&isNinthDawn&&meta&&meta.cats.length>0&&<div style={{display:"flex",gap:2,flexWrap:"wrap",justifyContent:"center",maxWidth:400,animation:"fadeIn 3s ease-out 1s both"}}>
          {meta.cats.map((c,i)=>(<span key={i} style={{width:4,height:4,borderRadius:"50%",background:BREEDS[c.breed]?.color||"#fbbf24",boxShadow:`0 0 4px ${BREEDS[c.breed]?.color||"#fbbf24"}`,animation:`fadeIn ${0.5+i*0.1}s ease-out ${1+i*0.05}s both`}} title={c.name}/>))}
        </div>}
        {fallen.length>0&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,marginTop:4}}>
          <div style={{fontSize:10,color:"#ef4444bb",letterSpacing:3}}>THEY WERE HERE</div>
          <div style={{display:"flex",flexDirection:"column",gap:3,alignItems:"center"}}>
            {fallen.map((f,i)=>(<div key={i} style={{textAlign:"center"}}>
              <span style={{fontSize:11,color:BREEDS[f.breed]?.color||"#888",fontFamily:"'Cinzel',serif",fontWeight:700}}>{f.name.split(" ")[0]}</span>
              {f.memorial&&<div style={{fontSize:10,color:"#ffffff66",fontStyle:"italic",fontFamily:"system-ui",lineHeight:1.3,maxWidth:260}}>{f.memorial}</div>}
            </div>))}
          </div>
        </div>}
        {!won&&allC.length>0&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,marginTop:4}}>
          <div style={{fontSize:10,color:"#ffffff44",letterSpacing:3}}>{allC.length} STILL STANDING</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"center",maxWidth:340}}>
            {allC.map((c,i)=>(<span key={i} style={{fontSize:10,color:BREEDS[c.breed]?.color||"#888",fontFamily:"system-ui",opacity:.4}}>{c.name.split(" ")[0]}{c.scarred?"*":""}</span>))}
          </div>
        </div>}
        <div style={{fontSize:14,color:won?"#fbbf24bb":"#ef4444bb",fontStyle:"italic",fontFamily:"system-ui",textAlign:"center",maxWidth:320,lineHeight:1.6,marginTop:4}}>{won?(
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
        {runLog.length>2&&<div style={{padding:"10px 16px",borderRadius:10,background:"#ffffff04",border:"1px solid #ffffff08",maxWidth:360,animation:"fadeIn 1.5s ease-out 1s both"}}>
          <div style={{fontSize:10,color:"#888888aa",letterSpacing:3,marginBottom:6,textAlign:"center"}}>THE CHRONICLE</div>
          {genChronicle(won).map((p,i)=>(<div key={i} style={{fontSize:11,color:"#999",fontFamily:"system-ui",fontStyle:"italic",lineHeight:1.6,marginBottom:i<2?6:0,animation:`fadeIn .6s ease-out ${1.5+i*0.4}s both`}}>{p}</div>))}
        </div>}
        {newUnlocks.length>0&&<div style={{display:"flex",flexDirection:"column",gap:4,padding:"8px 16px",borderRadius:10,background:"#fbbf2408",border:"1px solid #fbbf2433",animation:"fadeIn .6s ease-out"}}>
          <div style={{fontSize:10,color:"#fbbf24",letterSpacing:2,fontWeight:700}}>NEW UNLOCKS</div>
          {newUnlocks.map((msg,i)=>(<div key={i} style={{fontSize:10,color:"#fbbf24",fontFamily:"system-ui",animation:`fadeIn .4s ease-out ${i*0.2}s both`}}>{msg}</div>))}
        </div>}
        {meta&&meta.stats.w===1&&won&&<>
          {/* Stardust shower particles */}
          <div style={{position:"fixed",top:0,left:0,right:0,height:"100vh",pointerEvents:"none",zIndex:0,overflow:"hidden"}}>
            {Array.from({length:20}).map((_,i)=><div key={i} style={{position:"absolute",top:-10,left:`${5+i*4.5}%`,width:4,height:4,borderRadius:"50%",
              background:["#fbbf24","#c084fc","#4ade80","#67e8f9","#fef08a"][i%5],
              boxShadow:`0 0 6px ${["#fbbf24","#c084fc","#4ade80","#67e8f9","#fef08a"][i%5]}88`,
              animation:`starFall ${2+i*0.3}s ease-in ${0.5+i*0.15}s both`}}/>)}
          </div>
          <div style={{padding:"12px 20px",borderRadius:12,background:"linear-gradient(135deg,#4ade8008,#fbbf2408)",border:"1px solid #4ade8033",animation:"comboBurst .8s ease-out",textAlign:"center",maxWidth:340}}>
            <div style={{fontSize:14,color:"#4ade80",fontWeight:900,letterSpacing:4,marginBottom:6,animation:"tierReveal 1s ease-out"}}>🌅 YOU UNLOCKED THE FULL GAME</div>
            <div style={{fontSize:12,color:"#4ade80cc",fontFamily:"system-ui",lineHeight:1.6,marginBottom:8}}>Your next colony faces <b>5 nights</b> of darkness. New events. New bosses. New systems. Everything you survived in 3 nights was the prelude.</div>
            <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap",fontSize:10,fontFamily:"system-ui"}}>
              <span style={{color:"#fbbf24",padding:"3px 8px",borderRadius:5,background:"#fbbf2411"}}>✦ Upgrades</span>
              <span style={{color:"#c084fc",padding:"3px 8px",borderRadius:5,background:"#c084fc11"}}>🏠 The Hearth</span>
              <span style={{color:"#ef4444",padding:"3px 8px",borderRadius:5,background:"#ef444411"}}>🔥 Heat</span>
            </div>
          </div>
        </>}
        {hearthPair!==null&&cands.length>0&&(()=>{
          const picked=hearthPair;const needSex=picked.length===0?null:picked[0].sex==="M"?"F":"M";
          const availCands=needSex?cands.filter(c=>c.sex===needSex):cands;
          const pickedIds=picked.map(p=>p.id||p.name);
          const noMate=needSex&&availCands.filter(c=>!pickedIds.includes(c.id)&&!pickedIds.includes(c.name)).length===0;
          return(<div style={{width:"100%",textAlign:"center"}}>
          <div style={{fontSize:12,color:"#fbbf24",letterSpacing:3,marginBottom:4,fontFamily:"'Cinzel',serif"}}>
            {picked.length===0?"CHOOSE THE FIRST SOUL":"CHOOSE THEIR MATE"}
          </div>
          <div style={{fontSize:10,color:"#c084fcbb",fontFamily:"system-ui",marginBottom:6}}>
            {picked.length===0?"A male and female carry the story to the Hearth. Their descendants begin the next colony."
            :<><span style={{color:"#fbbf24",fontWeight:700}}>{getFullName(picked[0])}</span>{` (${picked[0].sex==="M"?"♂":"♀"}) will be remembered. Now pick a ${needSex==="M"?"male":"female"} companion.`}</>}
          </div>
          {noMate&&<div style={{fontSize:11,color:"#fb923c",fontFamily:"system-ui",marginBottom:8}}>No {needSex==="M"?"males":"females"} survived. {picked[0].name.split(" ")[0]} goes alone.
            <button onClick={async()=>{
              // Save single cat without pair
              const u={...meta,cats:[...meta.cats,picked[0]],stats:{...meta.stats,disc:[...new Set([...meta.stats.disc,`${picked[0].breed}-${(picked[0].trait||PLAIN).name}`])]}};
              setMeta(u);await saveS(u);setHearthPair(null);
            }} style={{...BTN("#333","#fb923c"),padding:"4px 12px",fontSize:10,marginLeft:8}}>Save alone</button>
          </div>}
          <div style={{display:"flex",gap:5,flexWrap:"wrap",justifyContent:"center",maxHeight:300,overflowY:"auto"}}>
            {availCands.filter(c=>!pickedIds.includes(c.id)&&!pickedIds.includes(c.name)).slice(0,12).map(c=>{const b=BREEDS[c.breed];
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
        {hearthPair===null&&<button onClick={()=>setPh("title")} style={{...BTN("linear-gradient(135deg,#fbbf24,#f59e0b)","#0a0a1a"),padding:"10px 36px",fontSize:15}}>{won?"Carry Their Names":"The Hearth Still Burns"}</button>}
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
    const mob=vw<500;
    const denCardW=mob?Math.max(44,Math.min(64,Math.floor((vw-40)/Math.max(6,Math.ceil(dAll.length/3))))):80;
    return(<div style={W}><div style={BG}/><style>{CSS}</style>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-start",minHeight:"100vh",zIndex:1,gap:10,padding:mob?"16px 12px":"20px",maxWidth:600,paddingTop:mob?40:60}}>
        <h2 style={{fontSize:mob?18:20,color:campMode?"#fbbf24":"#c084fc",letterSpacing:4,margin:0,fontFamily:"'Cinzel',serif"}}>{campMode?"🏕 CAMP":"THE DEN"}</h2>
        <div style={{fontSize:mob?11:12,color:"#ffffff55",fontStyle:"italic",fontFamily:"system-ui",textAlign:"center",maxWidth:320,lineHeight:1.6}}>{campMode?"Pick 2 cats for the watch. The rest sleep by the fire.":nightText}</div>

        {campMode?<div style={{padding:"10px 14px",borderRadius:10,background:"#fbbf2408",border:"1px solid #fbbf2422",fontSize:12,fontFamily:"system-ui",color:"#fbbf24cc",lineHeight:1.7,textAlign:"center",maxWidth:380,animation:"fadeIn .6s ease-out"}}>
          <b>Pick 2 cats for the watch.</b> Unbonded ♂+♀ may bond. Grudged pairs may reconcile. Others gain +1 Power.
        </div>
        :!seen.den&&<div style={{padding:"10px 14px",borderRadius:10,background:"#c084fc08",border:"1px solid #c084fc22",fontSize:12,fontFamily:"system-ui",color:"#c084fccc",lineHeight:1.7,textAlign:"center",maxWidth:380,animation:"fadeIn .6s ease-out"}}>
          <b>Shelter a ♂ + ♀ pair to breed safely.</b> Everyone else enters the wilds — they train, bond, or fight.
          <div style={{marginTop:6}}><button onClick={()=>setSeen(s=>({...s,den:true}))} style={{fontSize:10,background:"none",border:"1px solid #c084fc33",borderRadius:4,color:"#c084fc",cursor:"pointer",padding:"3px 10px",fontFamily:"system-ui"}}>Got it</button></div>
        </div>}

        <div style={{display:"flex",flexDirection:mob?"column":"row",gap:12,width:"100%"}}>
          {/* SHELTER section */}
          <div style={{flex:1,padding:"8px 10px",borderRadius:10,background:"#4ade8006",border:"1px solid #4ade8022",minHeight:mob?80:120}}>
            <div style={{fontSize:10,color:campMode?"#fbbf24":"#4ade80",letterSpacing:2,fontWeight:700,marginBottom:6}}>{campMode?"🔥 THE WATCH":"🛡 SHELTER"} ({isolated.length}/{MAX_ISOLATE})</div>
            {eventDenSafe&&<div style={{fontSize:10,color:"#4ade80aa",fontFamily:"system-ui",marginBottom:4}}>🕊️ Shrine protection active</div>}
            {isolated.length===0?<div style={{fontSize:10,color:"#4ade8044",fontFamily:"system-ui",fontStyle:"italic"}}>Tap cats below to shelter them</div>
            :<>
              <div style={{display:"flex",gap:3,flexWrap:"wrap",justifyContent:"center"}}>
                {isolated.map(c=><div key={c.id} onClick={()=>toggleDen(c)} style={{cursor:"pointer",position:"relative"}}>
                  <CC cat={c} sm cw={denCardW} sel onTraitClick={ct=>setTraitTip(ct)}/>
                </div>)}
              </div>
              {/* Shelter pair info */}
              {(()=>{
                let breedPairs=0;
                for(let i=0;i<isolated.length;i++)for(let j=i+1;j<isolated.length;j++){
                  if(isolated[i].sex!==isolated[j].sex&&!isolated[i].injured&&!isolated[j].injured){
                    const isFamily=isolated[i].parentIds?.includes(isolated[j].id)||isolated[j].parentIds?.includes(isolated[i].id)||(isolated[i].parentIds&&isolated[j].parentIds&&isolated[i].parentIds.some(p=>isolated[j].parentIds.includes(p)));
                    if(!isFamily)breedPairs++;
                  }
                }
                return breedPairs>0?<div style={{fontSize:10,color:"#4ade80",fontFamily:"system-ui",textAlign:"center",marginTop:4}}>🤝 {breedPairs} breeding pair{breedPairs>1?"s":""}</div>
                :isolated.length>=2?<div style={{fontSize:10,color:"#4ade8066",fontFamily:"system-ui",textAlign:"center",marginTop:4}}>No M/F pairs to breed</div>:null;
              })()}
            </>}
          </div>

          {/* WILDS section */}
          <div style={{flex:2,padding:"8px 10px",borderRadius:10,background:"#fb923c06",border:"1px solid #fb923c22",minHeight:mob?100:120}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <div style={{fontSize:10,color:"#fb923c",letterSpacing:2,fontWeight:700}}>🌲 WILDS ({denCats.length})</div>
                {(()=>{
                const risk=denCats.length<=4?"Calm":denCats.length<=8?"Active":denCats.length<=12?"Volatile":"Dangerous";
                const riskColor=denCats.length<=4?"#4ade80":denCats.length<=8?"#fbbf24":denCats.length<=12?"#fb923c":"#ef4444";
                return <span style={{fontSize:10,color:riskColor,fontWeight:600,fontFamily:"system-ui"}}>{risk}</span>;
              })()}
              </div>
              <button onClick={()=>setSeen(s=>({...s,denSort:s.denSort==="power"?"season":"power"}))} style={{background:"#ffffff08",border:"1px solid #ffffff15",borderRadius:5,padding:"3px 10px",fontSize:10,color:"#aaa",fontFamily:"system-ui",cursor:"pointer",fontWeight:600}}>{(seen.denSort||"season")==="season"?"🍂 Season":"⚡ Power"}</button>
            </div>
            <div style={{display:"flex",gap:3,flexWrap:"wrap",justifyContent:"center"}}>
              {(()=>{
                const sOrder={Autumn:0,Winter:1,Spring:2,Summer:3};
                const sorted=(seen.denSort||"season")==="season"
                  ?[...denCats].sort((a,b)=>(sOrder[a.breed]||0)-(sOrder[b.breed]||0)||b.power-a.power)
                  :[...denCats].sort((a,b)=>b.power-a.power);
                return sorted.map(c=><div key={c.id} onClick={den.length<MAX_ISOLATE?()=>toggleDen(c):undefined} style={{cursor:den.length<MAX_ISOLATE?"pointer":"default",opacity:den.length>=MAX_ISOLATE?.6:1,position:"relative"}}>
                <CC cat={c} sm cw={denCardW} denMode onTraitClick={ct=>setTraitTip(ct)}/>
              </div>);
              })()}
            </div>
            {injured.length>0&&<div style={{marginTop:6}}>
              <div style={{fontSize:10,color:"#fb923c88",letterSpacing:1,fontFamily:"system-ui",marginBottom:3}}>🩹 RESTING ({injured.length})</div>
              <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                {injured.map(c=><div key={c.id} style={{position:"relative"}}><CC cat={c} sm cw={denCardW} dis onTraitClick={ct=>setTraitTip(ct)}/></div>)}
              </div>
            </div>}
          </div>
        </div>

        {/* Action buttons */}
        {(()=>{
          let campHint="",campHintColor="#888";
          if(campMode&&den.length>=2){
            const[a,b]=den;
            const isGrudged=a.grudgedWith?.includes(b.id)||b.grudgedWith?.includes(a.id);
            const canBond=a.sex!==b.sex&&!a.bondedTo&&!b.bondedTo;
            const bothDevoted=catHas(a,"Devoted")&&catHas(b,"Devoted");
            if(isGrudged){campHint="30% chance to reconcile";campHintColor="#c084fc";}
            else if(canBond&&bothDevoted){campHint="Devoted pair — guaranteed bond 💕";campHintColor="#f472b6";}
            else if(canBond){campHint="40% chance to bond";campHintColor="#f472b6";}
            else{campHint="70% +1P, or rations, or quiet night";campHintColor="#fbbf24";}
          }
          return <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,marginTop:4}}>
          {campMode&&campHint&&<div style={{fontSize:10,color:campHintColor,fontFamily:"system-ui",letterSpacing:1,animation:"fadeIn .3s ease-out"}}>{campHint}</div>}
          <div style={{display:"flex",gap:8}}>
          <button onClick={campMode?()=>{
            const results=[];
            // Heal all injured: -1 timer
            [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>x.injured?{...x,injuryTimer:Math.max(0,(x.injuryTimer||2)-1),injured:(x.injuryTimer||2)<=1?false:x.injured}:x));});
            results.push({text:"Injuries tended. The colony rests.",color:"#4ade80",icon:"🩹"});
            // +1 Nerve (nerfed from +2)
            setFerv(f=>Math.min(NERVE_MAX,f+1));Audio.nerveUp();setFFlash("up");setTimeout(()=>setFFlash(null),400);
            results.push({text:"+1 Nerve. Rest builds resolve.",color:"#d97706",icon:"🔥"});
            // Watch pair resolution
            if(den.length>=2){
              const[a,b]=den;
              const isGrudged=a.grudgedWith?.includes(b.id)||b.grudgedWith?.includes(a.id);
              const canBond=a.sex!==b.sex&&!a.bondedTo&&!b.bondedTo;
              const bothDevoted=catHas(a,"Devoted")&&catHas(b,"Devoted");
              const bondChance=bothDevoted?1.0:0.40;
              if(isGrudged&&Math.random()<0.30){
                [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>{
                  if(x.id===a.id)return{...x,grudgedWith:(x.grudgedWith||[]).filter(id=>id!==b.id)};
                  if(x.id===b.id)return{...x,grudgedWith:(x.grudgedWith||[]).filter(id=>id!==a.id)};return x;
                }));});
                results.push({text:`${a.name.split(" ")[0]} and ${b.name.split(" ")[0]} made peace by the fire.`,color:"#c084fc",icon:"🕊️"});
                a._grudgeResolved=true;b._grudgeResolved=true;assignEpithet(a);assignEpithet(b);
                if(a._newEpithet){delete a._newEpithet;toast("🏷️",`${a.name.split(" ")[0]} earned: "${a.epithet}"`,BREEDS[a.breed]?.color||"#fbbf24",2500);Audio.epithetEarned();}
                if(b._newEpithet){delete b._newEpithet;toast("🏷️",`${b.name.split(" ")[0]} earned: "${b.epithet}"`,BREEDS[b.breed]?.color||"#fbbf24",2500);Audio.epithetEarned();}
                [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>x.id===a.id?{...x,epithet:a.epithet}:x.id===b.id?{...x,epithet:b.epithet}:x));});
                Audio.denBond();
              }else if(canBond&&!isGrudged&&Math.random()<bondChance){
                [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>{
                  if(x.id===a.id)return{...x,bondedTo:b.id};if(x.id===b.id)return{...x,bondedTo:a.id};return x;
                }));});
                results.push({text:`${a.name.split(" ")[0]} and ${b.name.split(" ")[0]} bonded under the stars. 💕`,color:"#f472b6",icon:"💕"});
                a.bondedTo=b.id;b.bondedTo=a.id;assignEpithet(a);assignEpithet(b);
                if(a._newEpithet){delete a._newEpithet;toast("🏷️",`${a.name.split(" ")[0]} earned: "${a.epithet}"`,BREEDS[a.breed]?.color||"#fbbf24",2500);Audio.epithetEarned();}
                if(b._newEpithet){delete b._newEpithet;toast("🏷️",`${b.name.split(" ")[0]} earned: "${b.epithet}"`,BREEDS[b.breed]?.color||"#fbbf24",2500);Audio.epithetEarned();}
                [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>x.id===a.id?{...x,epithet:a.epithet,bondedTo:b.id}:x.id===b.id?{...x,epithet:b.epithet,bondedTo:a.id}:x));});
                Audio.denBond();
              }else{
                const aCamped=a._camped,bCamped=b._camped;
                if(aCamped&&bCamped){
                  results.push({text:`${a.name.split(" ")[0]} and ${b.name.split(" ")[0]} shared the fire. They've grown all they can this way.`,color:"#888",icon:"🌙"});
                }else{
                  const roll=Math.random();
                  if(roll<0.70){
                    // +1P to uncamped cats
                    [setHand,setDraw,setDisc].forEach(s=>{s(arr=>arr.map(x=>{
                      if((x.id===a.id&&!aCamped)||(x.id===b.id&&!bCamped))return{...x,power:Math.min(15,x.power+1),_camped:true};
                      return x;
                    }));});
                    const who=[!aCamped?a.name.split(" ")[0]:null,!bCamped?b.name.split(" ")[0]:null].filter(Boolean).join(" and ");
                    results.push({text:`${who} grew stronger on the watch. (+1P)`,color:"#fbbf24",icon:"⚔"});
                  }else if(roll<0.85){
                    // Found rations
                    const found=1+Math.floor(Math.random()*3);
                    setGold(g=>g+found);
                    results.push({text:`${a.name.split(" ")[0]} found ${found}🐟 stashed near the fire.`,color:"#fbbf24",icon:"🐟"});
                  }else{
                    // Quiet night — flavor only
                    const quiet=pk([
                      `${a.name.split(" ")[0]} and ${b.name.split(" ")[0]} sat in silence. Sometimes that's enough.`,
                      `The fire crackled. Neither spoke. Both understood.`,
                      `${b.name.split(" ")[0]} fell asleep first. ${a.name.split(" ")[0]} kept watch alone.`,
                    ]);
                    results.push({text:quiet,color:"#888",icon:"🌙"});
                  }
                }
              }
            }else{results.push({text:"No watch pair chosen. The colony sleeps uneasy.",color:"#888",icon:"🌙"});}
            setDen([]);setCampMode(false);
            setEventOutcome({title:"Camp",icon:"🏕",choice:"No market. No strangers. Just the colony and the fire.",desc:results,targets:[]});
            setPh("eventResult");
          }:endNight} style={{...BTN(campMode?"linear-gradient(135deg,#fbbf24,#f59e0b)":"linear-gradient(135deg,#c084fc,#a855f7)","#fff"),padding:mob?"12px 24px":"10px 28px",fontSize:14}}>{campMode?(den.length>=2?"Make Camp":"Skip Watch — Rest Only"):"End Night"}</button>
          {!campMode&&<button onClick={()=>{setDen([]);nextBlind();}} style={{...BTN("#1a1a2e","#888"),padding:mob?"12px 16px":"10px 20px",fontSize:11,border:"1px solid #ffffff12"}}>Skip</button>}
          {campMode&&<button onClick={()=>{setCampMode(false);setDen([]);setOData({excess:0,uh:0,gR:0,fs:0,tgt:0,interest:0,excessGold:0});setPh("overflow");}} style={{...BTN("#1a1a2e","#888"),padding:mob?"12px 16px":"10px 20px",fontSize:11,border:"1px solid #ffffff12"}}>Back</button>}
          </div></div>;
        })()}
      </div>
    </div>);
  }

  // DEN RESULTS
  if(ph==="denResults"&&denRes){
    const mob=vw<500;
    const majorEvents=denRes.filter(r=>r.type==="breed"||r.type==="death"||r.type==="phoenix");
    const n=c=>c.name.split(" ")[0];
    const bMult=(typeof getMB==="function")?getMB():{};
    const bondStr=bMult.bondBoost?"×1.75":"×1.5";
    const groups={life:[],bonds:[],conflict:[],growth:[]};
    denRes.forEach(r=>{
      if(r.type==="breed")groups.life.push({icon:"🐣",text:`${n(r.baby)} born to ${n(r.c1)} & ${n(r.c2)}${r.twins?" (twins!)":""}`,tip:`P${r.baby.power} ${r.baby.breed} ${(r.baby.trait||PLAIN).icon}${(r.baby.trait||PLAIN).name}`,color:"#4ade80"});
      if(r.type==="wanderer")groups.life.push({icon:"🐱",text:`${n(r.cat)} wandered in`,tip:`P${r.cat.power} ${r.cat.breed}`,color:"#67e8f9"});
      if(r.type==="death")groups.conflict.push({icon:"💀",text:`${n(r.victim)} was lost`,tip:"gone from the colony",color:"#ef4444",bold:true});
      if(r.type==="fight")groups.conflict.push({icon:"⚔",text:`${n(r.loser)} ${r.wasInjured?"injured":"scarred"} (−${r.dmg}P)`,tip:r.wasInjured?"heals in 2 rounds":"×1.25 mult",color:"#ef4444"});
      if(r.type==="grudge")groups.conflict.push({icon:"⚡",text:`${n(r.c1)} & ${n(r.c2)} grudge`,tip:"−2M when together",color:"#fb923c"});
      if(r.type==="bond")groups.bonds.push({icon:"💕",text:`${n(r.c1)} & ${n(r.c2)} bonded`,tip:`${bondStr} mult together`,color:"#f472b6"});
      if(r.type==="reconcile_bond")groups.bonds.push({icon:"💕",text:`${n(r.c1)} & ${n(r.c2)} reconciled + bonded`,tip:`${bondStr} mult together`,color:"#f472b6"});
      if(r.type==="reconcile")groups.bonds.push({icon:"🕊️",text:`${n(r.c1)} & ${n(r.c2)} made peace`,tip:"grudge cleared",color:"#67e8f9"});
      if(r.type==="growth")groups.growth.push({icon:"⭐",text:`${n(r.cat)} +1P`,color:"#4ade80"});
      if(r.type==="mentor")groups.growth.push({icon:"📖",text:`${n(r.elder)} mentored ${n(r.young)}`,tip:"+1P",color:"#c084fc"});
      if(r.type==="training")groups.growth.push({icon:"⚔️",text:`${n(r.c1)} & ${n(r.c2)} sparred`,tip:"+1P each",color:"#60a5fa"});
      if(r.type==="phoenix")groups.life.push({icon:"🔥",text:`${n(r.risen)} rose from ashes`,tip:"now Eternal",color:"#fbbf24",bold:true});
      if(r.type==="teach")groups.growth.push({icon:"👪",text:`${n(r.parent)} taught ${n(r.child)} ${r.trait.icon}`,tip:r.trait.name,color:"#34d399",bold:true});
      if(r.type==="found")groups.growth.push({icon:"🐟",text:`${n(r.cat)} found ${r.gold}🐟`,color:"#fbbf24"});
      if(r.traitGained)groups.growth.push({icon:"✨",text:`${n(r.traitGained.cat)} gained ${r.traitGained.trait.icon} ${r.traitGained.trait.name}`,tip:r.traitGained.trait.desc,color:"#fbbf24",bold:true});
    });
    const sections=[
      {key:"life",title:"🐣 New Life",items:groups.life,border:"#4ade8033"},
      {key:"bonds",title:"💕 Bonds",items:groups.bonds,border:"#f472b633"},
      {key:"conflict",title:"⚔ Conflict",items:groups.conflict,border:"#ef444433"},
      {key:"growth",title:"⭐ Growth",items:groups.growth,border:"#60a5fa33"},
    ].filter(s=>s.items.length>0);
    return(<div style={W}><div style={BG}/><style>{CSS}</style>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-start",minHeight:"100vh",zIndex:1,gap:10,padding:mob?"16px 12px":"20px",maxWidth:550,overflowY:"auto",paddingTop:mob?30:40}}>
        <h2 style={{fontSize:mob?16:18,color:"#c084fc",letterSpacing:4,margin:0,fontFamily:"'Cinzel',serif"}}>WHAT HAPPENED IN THE DARK</h2>
        {denRes.length===0&&<div style={{color:"#666",fontSize:13,fontStyle:"italic",fontFamily:"system-ui",textAlign:"center",lineHeight:1.6,maxWidth:340}}>{pk(DEN_QUIET)()}</div>}

        {majorEvents.map((r,i)=>(
          <div key={i} style={{width:"100%",padding:mob?"8px 10px":"10px 14px",borderRadius:10,
            background:r.type==="breed"?"linear-gradient(145deg,#1b2e1b,#0d0d1a)":r.type==="death"?"linear-gradient(145deg,#2e1111,#0d0d1a)":"linear-gradient(145deg,#2e2211,#0d0d1a)",
            border:`1px solid ${r.type==="breed"?"#4ade8044":r.type==="death"?"#ef4444bb":"#fbbf2466"}`,
            animation:`scorePop .4s ease-out ${i*.2}s both`
          }}>
            {r.type==="breed"&&<div>
              <div style={{fontStyle:"italic",color:"#4ade80bb",fontSize:12,lineHeight:1.5,fontFamily:"system-ui",marginBottom:6}}>{pk(DEN_BREED)(n(r.c1),n(r.c2),n(r.baby))}</div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <CC cat={r.c1} sm/><span style={{color:"#4ade80bb"}}>+</span><CC cat={r.c2} sm/><span style={{color:"#4ade80bb"}}>=</span><CC cat={r.baby} sm hl/>
                {r.twins&&r.twin2&&<><span style={{color:"#fbbf24bb"}}>+</span><CC cat={r.twin2} sm hl/></>}
              </div>
              <div style={{fontSize:10,color:"#888",fontFamily:"system-ui",marginTop:3}}>
                {BREEDS[r.baby.breed].icon} {r.baby.name} P{r.baby.power} {(r.baby.trait||PLAIN).icon} {(r.baby.trait||PLAIN).name} {r.baby.sex==="M"?"♂":"♀"}
                {(r.baby.trait||PLAIN).tier!=="common"&&(r.baby.trait||PLAIN).name!=="Plain"&&<span style={{color:traitTierLabel(r.baby.trait).color,fontWeight:700}}> ★ {traitTierLabel(r.baby.trait).label.toUpperCase()}</span>}
              </div>
            </div>}
            {r.type==="death"&&<div>
              <div style={{fontStyle:"italic",color:"#ef4444bb",fontSize:13,lineHeight:1.5,fontFamily:"system-ui",marginBottom:6}}>{pk(DEN_DEATH)(n(r.c1),n(r.c2),n(r.victim))}</div>
              <div style={{textAlign:"center",padding:"8px 12px",borderRadius:8,background:"#ef444411",border:"1px solid #ef444422"}}>
                <div style={{fontSize:14,color:"#ef4444",fontWeight:700}}>{r.victim.name}</div>
                <div style={{fontSize:10,color:"#888",fontFamily:"system-ui",marginTop:2}}>P{r.victim.power} {BREEDS[r.victim.breed]?.icon} {r.victim.breed} {(r.victim.trait||PLAIN).icon} {(r.victim.trait||PLAIN).name}</div>
                <div style={{fontSize:11,color:"#ef4444bb",fontFamily:"system-ui",marginTop:2}}>{r.victim.stats?.tp>0?`Played ${r.victim.stats.tp} hands. Best: ${r.victim.stats.bs?.toLocaleString()}.`:"Never got to play."}</div>
              </div>
            </div>}
            {r.type==="phoenix"&&<div>
              <div style={{fontSize:13,color:"#fbbf24",fontWeight:700,marginBottom:4}}>🔥 {n(r.risen)} RISES FROM THE ASHES!</div>
              <div style={{fontStyle:"italic",color:"#fbbf24bb",fontSize:11,fontFamily:"system-ui"}}>{pk(DEN_PHOENIX)(r.c1.name,r.c2.name,r.risen.name)}</div>
              <div style={{fontSize:10,color:"#fbbf24",fontFamily:"system-ui",marginTop:4}}>Now Eternal at P1. The fire changes everything.</div>
            </div>}
          </div>
        ))}

        {sections.length>0&&<div style={{display:"flex",flexDirection:"column",gap:5,width:"100%",maxWidth:420,animation:`fadeIn .5s ease-out ${majorEvents.length*.2+.3}s both`}}>
          <div style={{width:"100%",height:1,background:"linear-gradient(90deg,transparent,#c084fc44,transparent)"}}/>
          <div style={{fontSize:10,color:"#c084fc88",letterSpacing:4,textAlign:"center",fontFamily:"system-ui",fontWeight:700}}>DEN REPORT</div>
          {sections.map((sec,si)=>(
            <div key={sec.key} style={{padding:"5px 12px",borderRadius:8,background:"#ffffff04",borderLeft:`3px solid ${sec.border}`,display:"flex",flexDirection:"column",gap:1}}>
              <div style={{fontSize:10,color:"#888",fontWeight:700,letterSpacing:1}}>{sec.title}</div>
              {sec.items.map((l,i)=><div key={i} style={{fontSize:11,fontFamily:"system-ui",color:l.color,fontWeight:l.bold?700:500,lineHeight:1.4}}>{l.icon} {l.text}{l.tip&&<span style={{fontSize:10,color:"#ffffff55",fontWeight:400,marginLeft:4}}>— {l.tip}</span>}</div>)}
            </div>
          ))}
        </div>}

        {/* Continue button */}
        <button onClick={()=>{
          const babies=[];
          denRes.filter(r=>r.type==="breed").forEach(r=>{babies.push(r.baby);if(r.twin2)babies.push(r.twin2);});
          setBabyNames({});setBabyNamingQueue([]);
          if(denStRef.current)clearTimeout(denStRef.current);setDenRes(null);setDenStep(-1);
          if(babies.length>0){setBabyNamingQueue(babies);setNamingCat(babies[0]);setPh("naming");}
          else{nextBlind();}
        }} style={{...BTN("linear-gradient(135deg,#fbbf24,#f59e0b)","#0a0a1a"),marginTop:8,padding:"10px 32px",fontSize:14}}>The Sun Comes Up</button>
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
    return(<div style={W}><div style={BG}/><Dust/><style>{CSS}</style>
      {/* Toast overlay */}
      {toasts.length>0&&<div style={{position:"fixed",top:12,right:12,zIndex:250,display:"flex",flexDirection:"column",gap:6,pointerEvents:"none",maxWidth:280}}>
        {toasts.map(t=>(<div key={t.id} style={{display:"flex",gap:8,alignItems:"center",padding:t.big?"12px 18px":"8px 14px",borderRadius:t.big?10:8,background:"#1a1a2eee",border:`1.5px solid ${t.color}${t.big?"66":"44"}`,boxShadow:`0 4px 16px #00000066,0 0 ${t.big?16:8}px ${t.color}${t.big?"44":"22"}`,animation:"slideIn .3s ease-out",fontFamily:"system-ui"}}>
          <span style={{fontSize:t.big?22:16,flexShrink:0}}>{t.icon}</span>
          <span style={{fontSize:t.big?14:12,color:t.color,fontWeight:t.big?700:600,lineHeight:1.3}}>{t.text}</span>
        </div>))}
      </div>}
      <div style={{width:"100%",maxWidth:700,padding:"10px 16px",zIndex:1,display:"flex",flexDirection:"column",gap:8,alignItems:"center",paddingBottom:100}}>
        <div style={{display:"flex",justifyContent:"space-between",width:"100%",alignItems:"center"}}>
          <h2 style={{fontSize:20,color:"#fbbf24",letterSpacing:4,margin:0,fontFamily:"'Cinzel',serif"}}>THE MARKET</h2>
          <ProgressMap ante={ante} blind={blind} mx={MX}/>
        </div>
        <FM level={ferv} prev={pFerv}/>
        {(()=>{const wSeed=(ante*11+blind*7+gold)%10;if(wSeed>2||isFirstRun)return null;
          return <div style={{fontSize:11,color:"#fbbf2433",fontStyle:"italic",fontFamily:"system-ui",textAlign:"center",maxWidth:320,lineHeight:1.4,animation:"fadeIn 1.5s ease-out"}}>{WHISPER_SHOP[(ante*3+blind)%WHISPER_SHOP.length]}</div>;
        })()}

        {/* First-encounter shop hint — explain rations, scrolls, devotion */}
        {!seen.shop&&<div style={{padding:"12px 18px",borderRadius:10,background:"linear-gradient(145deg,#fbbf2408,#f59e0b04)",border:"1px solid #fbbf2433",fontSize:12,fontFamily:"system-ui",color:"#e8e6e3cc",lineHeight:1.7,textAlign:"left",maxWidth:400,animation:"fadeIn .6s ease-out"}}>
          <div style={{fontSize:13,fontWeight:700,color:"#fbbf24",marginBottom:6,letterSpacing:1}}>THE MARKET</div>
          <div><span style={{color:"#fbbf24"}}>🐟 Rations</span> are currency. Save them for <span style={{color:"#4ade80"}}>interest</span> (every 5🐟 = +1 per round) or spend on:</div>
          <div style={{marginTop:6,display:"flex",flexDirection:"column",gap:3}}>
            <div><span style={{color:"#fbbf24"}}>🐱 Cats</span> — stronger cats with traits boost your score</div>
            <div><span style={{color:"#fbbf24"}}>📜 Scrolls</span> — level up hand types for bigger base scores</div>
            <div><span style={{color:"#fbbf24"}}>🛡️ Wards</span> — passive bonuses that trigger every hand</div>
          </div>
          <div style={{marginTop:8,padding:"6px 10px",borderRadius:6,background:"#ffffff06",border:"1px solid #ffffff0a"}}>
            <div style={{fontSize:11,color:"#fbbf24bb"}}>💡 <b>Season Devotion</b>: The more cats of one season you play, the stronger that season becomes. Check your progress in the Upgrades tab.</div>
          </div>
          <div style={{marginTop:8,textAlign:"center"}}><button onClick={()=>setSeen(s=>({...s,shop:true}))} style={{fontSize:11,background:"linear-gradient(135deg,#fbbf24,#f59e0b)",border:"none",borderRadius:5,color:"#0a0a1a",cursor:"pointer",padding:"5px 16px",fontWeight:700}}>Got it</button></div>
        </div>}

        <div style={{display:"flex",gap:0,width:"100%",borderBottom:"1px solid #ffffff0a"}}>
          {[["cats","🐱 Cats"],["upgrades","⚡ Upgrades"],["colony","👥 Colony"]].map(([id,label])=>{
            const isNudge=(id==="upgrades"&&shopTab!=="upgrades"&&((sFams.some(f=>f._starter)||sScrolls.length>0)&&fams.length===0))||(id==="upgrades"&&shopTab!=="upgrades"&&isFirstRun&&fams.length===0);
            return(<button key={id} onClick={()=>{setShopTab(id);if(id!=="colony")setSellMode(false);}} style={{flex:1,padding:vw<500?"12px 4px":"8px 4px",fontSize:12,fontFamily:"system-ui",fontWeight:shopTab===id?700:400,color:shopTab===id?"#fbbf24":isNudge?"#fbbf24":"#666",background:shopTab===id?"#fbbf2408":isNudge?"#fbbf2406":"transparent",border:"none",borderBottom:shopTab===id?"2px solid #fbbf24":isNudge?"2px solid #fbbf2466":"2px solid transparent",cursor:"pointer",transition:"all .2s",animation:isNudge?"breathe 2s ease-in-out infinite":"none"}}>{label}{isNudge?" ✦":""}</button>);
          })}
        </div>

        {/* ═══ CATS TAB ═══ */}
        {shopTab==="cats"&&<div style={{width:"100%",animation:"fadeIn .3s ease-out"}}>
          {/* ★ Compact colony summary — see your deck while shopping */}
          <div style={{display:"flex",gap:3,flexWrap:"wrap",justifyContent:"center",padding:"4px 0 8px",borderBottom:"1px solid #ffffff08",marginBottom:8}}>
            {(()=>{const uAll2=[...hand,...draw,...disc];const bCounts={};uAll2.forEach(c=>{bCounts[c.breed]=(bCounts[c.breed]||0)+1;});
              return Object.entries(bCounts).sort(([,a],[,b])=>b-a).map(([br,ct])=>
                <span key={br} style={{fontSize:10,color:BREEDS[br]?.color||"#888",fontFamily:"system-ui",padding:"1px 5px",borderRadius:3,background:BREEDS[br]?.color+"11",border:"1px solid "+BREEDS[br]?.color+"22"}}>{BREEDS[br]?.icon}{ct}</span>
              );})()}
            <span style={{fontSize:10,color:"#666",fontFamily:"system-ui",padding:"1px 5px"}}>{[...hand,...draw,...disc].length} cats · avg P{Math.round([...hand,...draw,...disc].reduce((s,c)=>s+c.power,0)/Math.max(1,[...hand,...draw,...disc].length))}</span>
          </div>
          {(()=>{
            const featured=sCats.find(c=>c.trait.tier==="mythic")||sCats.find(c=>c.trait.tier==="legendary")||sCats.find(c=>c.trait.tier==="rare")||sCats.find(c=>c.trait.name!=="Plain")||sCats[0];
            const rest=featured?sCats.filter(c=>c!==featured):[];
            const ftl=featured?traitTierLabel(featured.trait):null;
            return(<div>
              {featured&&ftl&&<div style={{marginBottom:8,animation:"scorePop .5s ease-out .1s both"}}>
                <div style={{fontSize:10,color:featured.trait.name==="Plain"?"#4ade80":ftl.color,letterSpacing:2,marginBottom:4,animation:"fadeIn .4s ease-out"}}>{featured.trait.tier==="mythic"?"✨ MYTHIC FIND":featured.trait.tier==="legendary"?"⭐ LEGENDARY FIND":featured.trait.tier==="rare"?"★ RARE FIND":featured.trait.tier==="rare_neg"?"⚡ RISKY BET":featured.trait.name!=="Plain"?"★ TRAINED CAT":"FOR SALE"}</div>
                <div onClick={()=>buyCat(sCats.indexOf(featured))} style={{cursor:gold>=(featured._price||4)?"pointer":"not-allowed",display:"flex",flexDirection:vw<500?"column":"row",gap:vw<500?6:12,alignItems:"center",padding:vw<500?"12px 10px":"8px 12px",borderRadius:10,background:isHighTier(featured.trait)?`linear-gradient(135deg,${ftl.color}08,${ftl.color}02)`:"#ffffff04",border:`1px solid ${isHighTier(featured.trait)?ftl.color+"33":"#ffffff0a"}`,transition:"all .2s"}}>
                  <CC cat={featured} dis={gold<(featured._price||4)} onTraitClick={ct=>setTraitTip(ct)} cw={vw<500?70:undefined}/>
                  <div style={{flex:1,textAlign:vw<500?"center":"left"}}>
                    <div style={{fontSize:11,fontWeight:700,color:BREEDS[featured.breed]?.color,fontFamily:"'Cinzel',serif"}}>{featured.name}</div>
                    <div style={{fontSize:12,color:"#888",fontFamily:"system-ui",marginTop:2}}>Power {featured.power} {BREEDS[featured.breed]?.icon} {featured.breed} {featured.sex==="M"?"♂":"♀"}</div>
                    <div style={{fontSize:12,color:featured.trait.name==="Plain"?"#555":tierColor(featured.trait),fontFamily:"system-ui",marginTop:3}}>{featured.trait.name==="Plain"?"No trait yet":featured.trait.icon+" "+featured.trait.name+": "+featured.trait.desc}</div>
                    {(featured.extraTraits||[]).map((t,ti)=><div key={ti} style={{fontSize:12,color:tierColor(t),fontFamily:"system-ui",marginTop:1}}>+{t.icon} {t.name}: {t.desc}</div>)}
                    <div style={{fontSize:10,color:"#fbbf24",fontWeight:700,marginTop:4}}>{featured._price||4}🐟</div>
                  </div>
                </div>
              </div>}
              {rest.length>0&&<div style={{marginTop:4}}>
                <div style={{borderTop:"1px solid #ffffff08",paddingTop:8,marginTop:4}}>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{rest.map((c2,ri2)=>{const ri=sCats.indexOf(c2);const p=c2._price||4;const gI=c2.sex==="M"?"♂":"♀";const gC2=c2.sex==="M"?"#60a5fa":"#f472b6";return(<div key={c2.id} onClick={()=>buyCat(ri)} style={{cursor:gold>=p?"pointer":"not-allowed",textAlign:"center",maxWidth:110,animation:`scorePop .4s ease-out ${0.2+ri2*0.15}s both`}}><CC cat={c2} dis={gold<p} onTraitClick={ct=>setTraitTip(ct)}/><div style={{fontSize:10,color:c2.trait.tier==="rare_neg"?"#ef4444":BREEDS[c2.breed].color,marginTop:1,fontFamily:"system-ui"}}>{c2.name} <span style={{color:gC2}}>{gI}</span> <span style={{color:"#fbbf24"}}>{p}🐟</span></div></div>);})}
                </div>
                </div>
              </div>}
              {!sCats.length&&<div style={{color:"#555",fontSize:10,fontFamily:"system-ui",textAlign:"center",padding:16}}>Sold out</div>}
              <div style={{display:"flex",justifyContent:"center",marginTop:8}}>
                <button onClick={reroll} disabled={gold<rc} style={{...BTN("#1a1a2e","#fbbf24",gold>=rc),border:`1px solid ${gold>=rc?"#fbbf2444":"#222"}`,fontSize:11}}>Reroll ({rc}🐟)</button>
              </div>
            </div>);
          })()}
        </div>}

        {/* ═══ UPGRADES TAB — scrolls + wards + devotion in one view ═══ */}
        {(shopTab==="upgrades"||shopTab==="scrolls"||shopTab==="wards")&&<div style={{width:"100%",animation:"fadeIn .3s ease-out"}}>

          {/* ★ First-time intro */}
          {!seen.shop2&&<div style={{padding:"10px 14px",borderRadius:8,background:"#fbbf2408",border:"1px solid #fbbf2422",marginBottom:10,animation:"fadeIn .6s ease-out"}}>
            <div style={{fontSize:11,color:"#fbbf24cc",fontFamily:"system-ui",lineHeight:1.6}}>
              <b>🛡️ Wards</b> give passive bonuses every hand. <b>📜 Scrolls</b> level up hand types. Both shape your strategy.
            </div>
            <div style={{marginTop:6,textAlign:"center"}}><button onClick={()=>setSeen(s=>({...s,shop2:true}))} style={{fontSize:10,background:"#fbbf24",border:"none",borderRadius:4,color:"#0a0a1a",cursor:"pointer",padding:"3px 12px",fontWeight:700}}>Got it</button></div>
          </div>}

          {/* ═══ WARDS SECTION ═══ */}
          {fams.length===0&&sFams.length>0&&<div style={{padding:"8px 14px",borderRadius:8,background:"#4ade8008",border:"1px solid #4ade8033",marginBottom:8,animation:"breathe 2s ease-in-out infinite"}}>
            <div style={{fontSize:11,color:"#4ade80",fontFamily:"system-ui",fontWeight:700}}>💡 Buy a ward! Wards boost your score every hand, all run long.</div>
          </div>}
          <div style={{fontSize:10,color:"#c084fcbb",letterSpacing:2,marginBottom:6}}>🛡️ WARDS FOR SALE</div>
          {sFams.length>0?<div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
            {sFams.map((f,i)=>{const wp=famPrice(f);const can=gold>=wp&&fams.length<MF;
              const isHtWard=!!f.htBonus;
              return(<div key={f.id} onClick={()=>can&&buyFam(i)} style={{flex:"1 1 140px",maxWidth:180,padding:"10px 12px",borderRadius:10,
                background:can?(isHtWard?"linear-gradient(145deg,#c084fc06,#818cf804)":"#ffffff06"):"#ffffff03",
                border:`1px solid ${can?(isHtWard?"#c084fc33":"#ffffff15"):"#ffffff08"}`,
                cursor:can?"pointer":"default",opacity:can?1:.4,transition:"all .2s",
                animation:`scorePop .4s ease-out ${0.1+i*0.15}s both`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:16}}>{f.icon}</span>
                  <span style={{fontSize:11,color:can?"#fbbf24":"#555",fontWeight:700}}>{wp}🐟{f._starter?" ★":""}</span>
                </div>
                <div style={{fontSize:12,fontWeight:700,color:isHtWard?"#c084fc":"#e8e6e3cc",marginTop:4}}>{f.name}</div>
                <div style={{fontSize:10,color:"#888",fontFamily:"system-ui",lineHeight:1.4,marginTop:2}}>{f.desc}</div>
                {isHtWard&&<div style={{fontSize:10,color:"#c084fc66",fontFamily:"system-ui",marginTop:3,letterSpacing:1}}>HAND TYPE BONUS</div>}
              </div>);
            })}
          </div>:(!ul.fams&&!isFirstRun?<div style={{color:"#555",fontSize:10,fontFamily:"system-ui",fontStyle:"italic",textAlign:"center",padding:12,marginBottom:12}}>🔒 Complete a run to unlock Wards</div>
          :<div style={{color:"#555",fontSize:10,fontFamily:"system-ui",textAlign:"center",padding:12,marginBottom:12}}>No wards available</div>)}

          {/* ═══ YOUR WARDS (equipped) ═══ */}
          {fams.length>0&&<div style={{marginBottom:12}}>
            <div style={{fontSize:10,color:"#888",letterSpacing:2,marginBottom:4}}>EQUIPPED ({fams.length}/{MF})</div>
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
              {fams.map(f=><div key={f.id} onClick={()=>toast(f.icon,`${f.name}: ${f.desc}`,"#fbbf24")} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 8px",borderRadius:6,background:"#ffffff06",border:"1px solid #ffffff0a",cursor:"pointer"}}>
                <span style={{fontSize:14}}>{f.icon}</span>
                <div style={{flex:1}}><span style={{fontSize:10,color:"#aaa",fontFamily:"system-ui"}}>{f.name}</span><div style={{fontSize:10,color:"#666",fontFamily:"system-ui"}}>{f.desc}</div></div>
                <button onClick={e=>{e.stopPropagation();sellFam(f);}} style={{fontSize:10,color:"#ef4444aa",background:"none",border:"none",cursor:"pointer",padding:0,fontFamily:"system-ui"}}>✕</button>
              </div>)}
            </div>
          </div>}

          {/* ═══ SCROLLS SECTION — hidden on first run ═══ */}
          {runCount>=1&&sScrolls.length>0&&<>
          <div style={{fontSize:10,color:"#fbbf24bb",letterSpacing:2,marginBottom:6}}>📜 SCROLLS</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
            {sScrolls.map((s,i)=>{const can=gold>=s.price;
              return(<div key={s.name} onClick={()=>can&&buyScroll(i)} style={{flex:"1 1 140px",maxWidth:180,padding:"10px 12px",borderRadius:10,
                background:can?"linear-gradient(145deg,#fbbf2406,#f59e0b04)":"#ffffff04",
                border:`1px solid ${can?"#fbbf2433":"#ffffff0a"}`,
                cursor:can?"pointer":"default",opacity:can?1:.4,transition:"all .2s"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:13,fontWeight:700,color:"#fbbf24"}}>{s.name}</span>
                  <span style={{fontSize:11,color:can?"#fbbf24":"#555",fontWeight:700}}>{s.price}🐟</span>
                </div>
                <div style={{fontSize:10,color:"#888",fontFamily:"system-ui",marginTop:3}}>
                  Lv{s.lv} {"→"} Lv{s.nextLv}
                  {s.nextBase&&<span style={{color:"#4ade80"}}> ({s.nextBase.c}C × {s.nextBase.m}M)</span>}
                </div>
              </div>);
            })}
          </div>
          </>}

          {/* ═══ HAND LEVELS — compact ═══ */}
          <div style={{borderTop:"1px solid #ffffff0a",paddingTop:8,marginBottom:8}}>
            <div style={{fontSize:10,color:"#888",letterSpacing:2,marginBottom:4}}>HAND LEVELS</div>
            <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
              {HT.filter(h=>!h.hidden).map(h=>{const lv=getHtLevel(h.name,htLevels);const sc=getHtScaled(h,lv);
                return(<div key={h.name} style={{padding:"2px 6px",borderRadius:4,background:lv>1?"#fbbf2408":"transparent",border:lv>1?"1px solid #fbbf2422":"1px solid #ffffff08",fontSize:10,fontFamily:"system-ui",color:lv>1?"#fbbf24":"#555"}}>
                  {h.name}{lv>1?` Lv${lv}`:""} <span style={{color:lv>1?"#4ade80":"#444"}}>{sc.c}×{sc.m}</span>
                </div>);
              })}
            </div>
          </div>

          {/* ═══ SEASON DEVOTION — progress with milestone details ═══ */}
          <div style={{borderTop:"1px solid #ffffff0a",paddingTop:8}}>
            <div style={{fontSize:10,color:"#888",letterSpacing:2,marginBottom:6}}>SEASON DEVOTION</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {Object.keys(DEVOTION_MILESTONES).map(breed=>{
                const dev=getDevotionLevel(breed,devotion);
                const color=BREEDS[breed]?.color||"#888";
                const icon=BREEDS[breed]?.icon||"?";
                return(<div key={breed} style={{padding:"6px 10px",borderRadius:8,background:dev.count>0?color+"08":"transparent",border:`1px solid ${dev.count>0?color+"22":"#ffffff08"}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                    <span style={{fontSize:11,color,fontWeight:700,fontFamily:"system-ui"}}>{icon} {breed}</span>
                    <span style={{fontSize:10,color:color+"88",fontFamily:"system-ui"}}>{dev.count} played</span>
                  </div>
                  {/* Progress segments */}
                  <div style={{display:"flex",gap:2,marginBottom:4}}>
                    {(DEVOTION_MILESTONES[breed]||[]).map((m,i)=>{
                      const unlocked=dev.count>=m.at;
                      const pct=unlocked?100:Math.min(100,dev.count/m.at*100);
                      return(<div key={i} style={{flex:1,height:4,borderRadius:2,background:"#ffffff0a",overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${pct}%`,background:unlocked?color:color+"44",borderRadius:2,transition:"width .3s"}}/>
                      </div>);
                    })}
                  </div>
                  {/* Show unlocked + next milestone */}
                  {dev.unlocked.map((m,i)=><div key={i} style={{fontSize:10,color:color+"99",fontFamily:"system-ui"}}>{"✓ "+m.name+": "+m.desc}</div>)}
                  {dev.next&&<div style={{fontSize:10,color:"#555",fontFamily:"system-ui"}}>{"○ "+dev.next.at+" plays: "+dev.next.name+" — "+dev.next.desc}</div>}
                </div>);
              })}
            </div>
          </div>
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
          {sellMode&&<div style={{fontSize:10,color:"#c084fcbb",fontFamily:"system-ui",marginBottom:6,fontStyle:"italic"}}>Each departure leaves something behind. Tap a cat to release them.</div>}
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
      <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:100,background:"linear-gradient(180deg,transparent,#0a0a1a 8px,#0a0a1a)",padding:"8px 16px 12px",display:"flex",justifyContent:"center"}}>
        <div style={{maxWidth:700,width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
          <div style={{display:"flex",flexDirection:"column",gap:2}}>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <span onClick={()=>toast("🐟",`Rations: ${gold}🐟. Spend in the Market on cats, wards, scrolls. Earn more by scoring higher. Save 5+ for interest.`,"#fbbf24")} style={{color:"#fbbf24",fontSize:14,fontWeight:700,cursor:"help"}}>🐟{gold}</span>
              {runCount>=1&&interestPreview>0&&<span onClick={()=>toast("📈",`Interest: +${interestPreview}🐟 next round (floor of rations÷5, max 5). Save rations to earn more.`,"#4ade80")} style={{color:"#4ade80",fontSize:10,fontFamily:"system-ui",cursor:"help"}}>+{interestPreview} stores{interestPreview>=5?" MAX":""}</span>}
              <span onClick={()=>toast("✦",`Stardust: ${meta?.dust||0}✦. Meta-currency from Hearth cats. Spend on permanent upgrades between runs.`,"#c084fc")} style={{color:"#c084fc",fontSize:10,cursor:"help"}}>✦{meta?.dust||0}</span>
            </div>
            <div style={{fontSize:10,fontFamily:"system-ui",color:"#888"}}>
              {nt?<span onClick={()=>toast("🎯",`Target: ${nt.target.toLocaleString()}. Score this much total across all hands to clear ${nt.blindName}. Boss blinds injure cats on failed hands.`,"#fbbf24")} style={{cursor:"help"}}>{nt.blind===2?<span style={{color:"#ef4444",fontWeight:700}}>{boss?.icon||"👁️"} {nt.blindName} approaches</span>:<span style={{color:"#fbbf24"}}>{nt.blindName} falls</span>} · Night {nt.ante} · <span style={{color:"#e8e6e3",fontWeight:700}}>{nt.target.toLocaleString()}</span> to survive</span>
              :<span style={{color:"#4ade80",fontWeight:700}}>Dawn approaches...</span>}
            </div>
          </div>
          {blind>=2?
            <button onClick={()=>{setDen([]);setPh("denSelect");}} style={{...BTN("linear-gradient(135deg,#c084fc,#a855f7)","#fff"),padding:"10px 20px",fontSize:12}}>🌙 Into the Den</button>
            :<button onClick={()=>{fireEvent();}} style={{...BTN("linear-gradient(135deg,#fbbf24,#f59e0b)","#0a0a1a"),padding:"10px 20px",fontSize:12}}>{nt?nt.blindName+" awaits →":"Face the dawn →"}</button>}
        </div>
      </div>
    </div>);
  }

  // ═══════════════════════════════════════════════════════
  // MAIN PLAY
  // ═══════════════════════════════════════════════════════
  const isNL=ferv===NERVE_MAX;
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

      {toasts.length>0&&<div style={{position:"fixed",top:12,right:12,zIndex:250,display:"flex",flexDirection:"column",gap:6,pointerEvents:"none",maxWidth:280}}>
        {toasts.map(t=>(<div key={t.id} style={{display:"flex",gap:8,alignItems:"center",padding:t.big?"12px 18px":"8px 14px",borderRadius:t.big?10:8,background:"#1a1a2eee",border:`1.5px solid ${t.color}${t.big?"66":"44"}`,boxShadow:`0 4px 16px #00000066,0 0 ${t.big?16:8}px ${t.color}${t.big?"44":"22"}`,animation:"slideIn .3s ease-out",fontFamily:"system-ui"}}>
          <span style={{fontSize:t.big?22:16,flexShrink:0}}>{t.icon}</span>
          <span style={{fontSize:t.big?14:12,color:t.color,fontWeight:t.big?700:600,lineHeight:1.3}}>{t.text}</span>
        </div>))}
      </div>}

      {autoPlay&&ph==="playing"&&(()=>{
        const step=autoPlay.step;
        const isUiTour=step<0;
        // UI Tour highlight positions
        const tourSteps=[
          {step:-3,title:"YOUR FIRST NIGHT",msg:"Welcome. I'll play the first hand to show you how scoring works. Just watch.",highlight:null,pos:"center"},
          {step:-2,title:"SCORE & TARGET",msg:"This is your score target. Score enough total across your hands to survive each round.",highlight:"score",pos:"top"},
          {step:-1,title:"YOUR COLONY",msg:"These are your cats. Same-season cats score better together. Watch — I'll pick the best match now.",highlight:"hand",pos:"bottom"},
        ];
        const tour=tourSteps.find(t=>t.step===step);

        if(isUiTour&&tour)return(<>
          {/* Dim overlay */}
          <div style={{position:"fixed",inset:0,background:"#000000dd",zIndex:140,pointerEvents:"auto"}} onClick={()=>setAutoPlay(a=>a?{...a,step:a.step+1}:null)}/>
          {/* Highlight box — glow effect on relevant UI element */}
          {tour.highlight==="score"&&<div style={{position:"fixed",top:0,left:"30%",right:"30%",height:60,border:"2px solid #fbbf2466",borderRadius:12,boxShadow:"0 0 20px #fbbf2444,inset 0 0 20px #fbbf2422",zIndex:141,pointerEvents:"none",animation:"guidePulse 1.5s ease-in-out infinite"}}/>}
          {tour.highlight==="hand"&&<div style={{position:"fixed",top:"40%",left:"5%",right:"5%",height:180,border:"2px solid #4ade8066",borderRadius:12,boxShadow:"0 0 20px #4ade8044,inset 0 0 20px #4ade8022",zIndex:141,pointerEvents:"none",animation:"guidePulse 1.5s ease-in-out infinite"}}/>}
          {/* Tour message */}
          <div style={{position:"fixed",top:tour.pos==="center"?"35%":tour.pos==="top"?80:"auto",bottom:tour.pos==="bottom"?240:"auto",left:"50%",transform:"translateX(-50%)",zIndex:142,
            padding:"20px 28px",borderRadius:14,background:"#0d1117",border:"1.5px solid #fbbf2444",maxWidth:360,animation:"fadeIn .5s ease-out",textAlign:"center",fontFamily:"system-ui",boxShadow:"0 12px 48px #00000099"}}>
            <div style={{fontSize:10,color:"#fbbf2488",letterSpacing:4,marginBottom:6}}>{tour.title}</div>
            <div style={{fontSize:14,color:"#e8e6e3",lineHeight:1.6}}>{tour.msg}</div>
            <button onClick={()=>setAutoPlay(a=>a?{...a,step:a.step+1}:null)} style={{marginTop:12,fontSize:12,background:"linear-gradient(135deg,#fbbf24,#f59e0b)",border:"none",borderRadius:6,color:"#0a0a1a",cursor:"pointer",padding:"8px 20px",fontWeight:700,fontFamily:"system-ui",letterSpacing:1}}>
              {step===-1?"Show me →":"Next →"}
            </button>
            <div style={{marginTop:8}}><button onClick={()=>{if(autoRef.current)clearTimeout(autoRef.current);if(stRef.current)clearTimeout(stRef.current);setSel(new Set());setAutoPlay(null);setGuide({step:3,msg:""});}} style={{fontSize:10,background:"none",border:"none",color:"#ffffff66",cursor:"pointer",padding:"3px 10px"}}>Skip tutorial</button></div>
          </div>
        </>);

        // Auto-play steps (0+) — trigger card selection cascade when transitioning from tour
        if(step===0&&!autoRef.current){
          autoRef.current=setTimeout(()=>{
            let ci=0;
            function selectNext(){
              if(ci>=autoPlay.idxs.length){
                // All cats selected — pause, then play
                setAutoPlay(a=>a?{...a,step:3}:null);
                autoRef.current=setTimeout(()=>{
                  const cats=autoPlay.idxs.map(i=>hand[i]).filter(Boolean);
                  if(cats.length>=1){
                    setScoringCats(cats);setAftermath([]);setFirstHandPlayed(true);Audio.cardPlay();
                    const beatingPace=rScore>=eTgt()*0.4;
                    const activeBT=blind===2?bossTraits:[];
                    const result=calcScore(cats,fams,ferv,cfx,{gold,deckSize:allC.length,discSize:disc.length,handSize:hs(),beatingPace,bossTraitFx:activeBT,scarMult:getMB().scarMult||0,grudgeWisdom:getMB().grudgeWisdom||0,hasMastery:!!(getMB().xp),bondBoost:getMB().bondBoost||0,comboBoost:getMB().comboBoost||0,doubleBench:getMB().doubleBench||0,lastHandIds,lastHandLost,htLevels,devotion,bench:hand.filter(c=>!cats.find(x=>x.id===c.id))});
                    advancingRef.current=false;
                    setSRes(result);setSStep(-1);setPh("scoring");setRunChips(0);setRunMult(0);setNewBest(null);setHandDiscovery([]);
                    let rC=0,rM=0;
                    const stepTotals=result.bd.map(s=>{rC+=s.chips||0;rM+=s.mult||0;if(s.xMult)rM=Math.round(rM*s.xMult);return{chips:Math.max(0,rC),mult:Math.max(1,rM),total:Math.max(0,rC)*Math.max(1,rM)};});
                    const aft=[];
                    cats.forEach(c=>{
                      const oldXP=getCatXP(c.stats.tp,!!(getMB().xp));const newXP=getCatXP(c.stats.tp+1,!!(getMB().xp));
                      if(newXP&&oldXP&&newXP.label!==oldXP.label&&newXP.bonus.mult>0)aft.push({icon:newXP.icon,text:`${c.name.split(" ")[0]}: ${newXP.label}!`,color:newXP.color});
                      if(result.total>c.stats.bs&&c.stats.bs>0)aft.push({icon:"🏆",text:`${c.name.split(" ")[0]} PB: ${result.total.toLocaleString()}`,color:"#fbbf24"});
                    });
                    const catSteps=result.bd.filter(s=>s.catIdx!==undefined&&s.type!=="xp_rank");
                    if(catSteps.length>0&&cats.length>=2){
                      const contribs=catSteps.map(s=>{const t=stepTotals[result.bd.indexOf(s)]?.total||0;const prev=result.bd.indexOf(s)>0?stepTotals[result.bd.indexOf(s)-1]?.total||0:0;return{cat:cats[s.catIdx],delta:t-prev};});
                      const totalDelta=contribs.reduce((s,c)=>s+c.delta,0);
                      const best2=contribs.sort((a,b)=>b.delta-a.delta)[0];
                      if(best2&&totalDelta>0&&best2.delta/totalDelta>0.45){
                        const fn2=best2.cat.name.split(" ")[0];const pct2=Math.round(best2.delta/totalDelta*100);
                        aft.push({icon:"💪",text:pk(CAT_REACTIONS.carry(fn2,pct2)),color:BREEDS[best2.cat.breed]?.color||"#fbbf24"});
                      }
                    }
                    const bondedInHand=cats.filter(c=>c.bondedTo&&cats.find(x=>x.id===c.bondedTo));
                    if(bondedInHand.length>=2){
                      const a2=bondedInHand[0].name.split(" ")[0],bN2=bondedInHand[1].name.split(" ")[0];
                      aft.push({icon:"💕",text:pk(CAT_REACTIONS.bond(a2,bN2)),color:"#f472b6"});
                    }
                    scoreEndRef.current={chips:result.chips,mult:result.mult,total:result.total,ht:result.ht,combo:result.combo,aft,shk:getShakeIntensity(result.total),isFirstCascade:true,stepTotals};
                    let stp=-1;const tot=result.bd.length;
                    function getAutoStepDelay2(s){
                      const tempo=Math.max(0.5,Math.min(1.4,7/tot));const slow=1.8;
                      const st=result.bd[s];const isLast=s===tot-1;const isPenult=s===tot-2;
                      if(st&&(st.mult<0||st.type==="curse"||st.type==="grudge_tension"))return Math.round(200*tempo*slow);
                      if(st&&st.xMult&&st.xMult>=2)return Math.round(Math.max(900,1100*Math.max(0.7,tempo))*slow);
                      if(st&&st.xMult)return Math.round(Math.max(700,900*Math.max(0.7,tempo))*slow);
                      if(st&&st.type==="nerve")return Math.round(Math.max(650,850*Math.max(0.7,tempo))*slow);
                      if(st&&(st.type==="bond"||st.type==="lineage"))return Math.round(Math.max(450,600*tempo)*slow);
                      if(st&&st.type==="fam")return Math.round(Math.max(400,550*tempo)*slow);
                      if(isPenult)return Math.round(Math.max(370,520*tempo)*slow);
                      if(isLast)return Math.round(Math.max(470,670*tempo)*slow);
                      if(s===0)return Math.round(1200*tempo*slow); // hand type holds extra long
                      if(st?.isBigCat)return Math.round(Math.max(450,580*tempo)*slow);
                      if(s===1)return Math.round(500*tempo*slow);
                      if(s<=3)return Math.round(420*tempo*slow);
                      return Math.round(Math.max(100,(250-s*5)*tempo)*slow);
                    }
                    function animStep2(){
                      stp++;
                      if(stp<tot){
                        setSStep(stp);setRunChips(stepTotals[stp].chips);setRunMult(stepTotals[stp].mult);
                        const progress=stepTotals[stp].total/(result.total||1);const s2=result.bd[stp];
                        if(s2){
                          if(s2.xMult){
                            Audio.xMultSlam(s2.xMult);setScoreShake(Math.ceil(s2.xMult));setTimeout(()=>setScoreShake(0),300);
                            setScoringFlash(s2.xMult>=1.5?"#fef08a":"#fbbf24");setTimeout(()=>setScoringFlash(null),150);
                            setMultPop({val:s2.xMult,label:s2.label,mode:"xmult"});setTimeout(()=>setMultPop(null),1200);
                          }
                          else if(s2.type==="hand"){Audio.comboHit();setScoringFlash("#fbbf24");setScoreShake(2);setTimeout(()=>{setScoreShake(0);setScoringFlash(null);},250);}
                          else if(s2.type==="combo"){Audio.comboHit();setScoreShake(3);setScoringFlash("#c084fc");setTimeout(()=>{setScoreShake(0);setScoringFlash(null);},300);}
                          else if(s2.type==="grudge_tension")Audio.grudgeTense();
                          else if(s2.type==="grudge_prove")Audio.grudgeProve();
                          else if(s2.type==="bond"||s2.type==="lineage")Audio.bondChime();
                          else if(s2.type==="xp_rank")Audio.bondChime();
                          else if(s2.isBigCat)Audio.bigCatHit(progress);
                          else if(s2.mult>0)Audio.multHit(s2.mult,progress);
                          else if(s2.chips>0)Audio.chipUp(s2.chips,progress);
                        }
                        stRef.current=setTimeout(animStep2,getAutoStepDelay2(stp));
                      }else{
                        const end=scoreEndRef.current;
                        setRunChips(end.chips);setRunMult(end.mult);
                        setScoreShake(end.shk);setTimeout(()=>setScoreShake(0),400+end.shk*100);
                        const prev=handBests[end.ht]||0;
                        if(end.total>prev){setHandBests(b=>({...b,[end.ht]:end.total}));setNewBest(end.ht);}
                        checkHandDiscovery(end.ht,end.combo);
                        setAftermath(end.aft);setScoringDone(true);
                        const tier=getScoreTier(end.total);
                        if(tier&&tier.label)Audio.tierReveal(Math.min(5,Math.floor(end.total/5000)));
                      }
                    }
                    stRef.current=setTimeout(()=>{
                      {const _hti=HT.findIndex(h=>h.name===result.ht);Audio.handType(Math.min(3,Math.floor((_hti>=0?_hti:4)/2)));}
                      animStep2();
                    },800);
                  }
                },2500);
                return;
              }
              const idx=autoPlay.idxs[ci];
              const cat=hand[idx];
              setSel(prev=>{const ns=new Set(prev);ns.add(idx);return ns;});
              Audio.cardSelect();
              if(cat)toast(BREEDS[cat.breed]?.icon||"🐱",`${cat.name.split(" ")[0]} selected (${cat.breed})`,BREEDS[cat.breed]?.color||"#fbbf24",1500);
              setAutoPlay(a=>a?{...a,step:ci===0?1:2}:null);
              ci++;
              autoRef.current=setTimeout(selectNext,1200);
            }
            autoRef.current=setTimeout(selectNext,1000);
          },1500);
        }

        // Auto-play banner (step 0+)
        return(<>
          <div style={{position:"fixed",inset:0,zIndex:130,pointerEvents:"auto",background:"transparent"}} onClick={e=>e.stopPropagation()}/>
          <div style={{position:"fixed",bottom:mob?70:60,left:"50%",transform:"translateX(-50%)",zIndex:150,padding:"16px 28px",borderRadius:14,background:"#0a0a1aee",border:"1.5px solid #4ade8044",maxWidth:360,animation:"fadeIn .6s ease-out",textAlign:"center",fontFamily:"system-ui",boxShadow:"0 8px 32px #00000088"}}>
          <div style={{fontSize:10,color:"#4ade8066",letterSpacing:3,marginBottom:4}}>👀 WATCHING THE DEMO</div>
          <div style={{fontSize:15,color:"#4ade80",fontWeight:700,marginBottom:6}}>{
            step===0?"Selecting same-season cats..."
            :step<=2?`Selecting cats... (${Math.min(sel.size,autoPlay.idxs.length)}/${autoPlay.idxs.length})`
            :"Playing the hand..."
          }</div>
          <div style={{fontSize:11,color:"#4ade80aa",lineHeight:1.5}}>{
            step<=2?"Same season = stronger hand. Watch which cards light up."
            :"Now watch how chips × mult builds the score..."
          }</div>
          <div style={{fontSize:10,color:"#ffffff66",marginTop:6,fontStyle:"italic"}}>Sit back — you'll play the next hand yourself.</div>
          <button onClick={()=>{if(autoRef.current)clearTimeout(autoRef.current);if(stRef.current)clearTimeout(stRef.current);setSel(new Set());setAutoPlay(null);setGuide({step:3,msg:""});}} style={{marginTop:8,fontSize:10,background:"none",border:"1px solid #4ade8033",borderRadius:4,color:"#4ade8066",cursor:"pointer",padding:"3px 10px"}}>Skip demo →</button>
        </div></>);
      })()}
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
          msg=`${bIcon} Your turn! Select same-season cats`;
          sub="Tap the highlighted cards, then hit Play.";
        }else if(guide.step===1){
          const ht=evalH?.(selCats);
          msg=`✨ ${ht?.name||"Hand"} ready! Hit Play ▶`;
          sub="Watch how chips × mult builds your score.";
        }else if(guide.step===2){
          msg="Score builds from each cat's power + traits.";
          sub="Matching seasons multiply everything. That's the whole game.";
        }else if(guide.step===3){
          const need=Math.max(0,tgt-rScore);
          const postAuto=!autoPlay&&isFirstRun&&ante===1&&blind===0&&hLeft>=2;
          msg=postAuto?"Your turn! 🎮":need>0?(hLeft===1?"⚠ LAST HAND":"Need "+need.toLocaleString()+" more"):"Cleared! 🎉";
          sub=postAuto?"Select same-season cats → Play":"";
        }
        return(<div style={{position:"fixed",bottom:guide.step>=2?280:220,left:"50%",transform:"translateX(-50%)",zIndex:150,padding:"10px 18px",borderRadius:10,background:"#0a0a1aee",border:"1px solid #fbbf2444",maxWidth:300,animation:"fadeIn .6s ease-out",textAlign:"center",fontFamily:"system-ui",boxShadow:"0 8px 32px #00000088"}}>
          <div style={{fontSize:14,color:"#fbbf24",fontWeight:700}}>{msg}</div>
          {sub&&<div style={{fontSize:11,color:"#fbbf24aa",marginTop:2}}>{sub}</div>}
          <button onClick={()=>{setGuide(null);setSeen(s=>({...s,guided:true}));}} style={{marginTop:4,fontSize:10,background:"none",border:"none",color:"#ffffff55",cursor:"pointer",padding:"2px 8px"}}>dismiss</button>
        </div>);
      })()}

      {/* Header */}
      <div style={{width:"100%",maxWidth:700,padding:mob?"6px 12px":"8px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",zIndex:1,borderBottom:`1px solid ${isBoss?"#ef444422":"#ffffff0a"}`}}>
        <div><div style={{fontSize:11,color:"#888",letterSpacing:2}}>NIGHT {ante}/{MX}{!mob&&<span style={{color:"#555"}}> Round {blind+1}/3</span>}</div><div style={{fontSize:mob?13:14,fontWeight:700,color:isBoss?"#ef4444":"#fbbf24"}}>{blindN[blind]}</div>{!mob&&<ProgressMap ante={ante} blind={blind} mx={MX}/>}</div>
        <div style={{textAlign:"center"}}><div style={{fontSize:11,color:"#888",letterSpacing:2}}>SCORE</div><div style={{fontSize:mob?16:18,fontWeight:900}}><span style={{color:rScore>=tgt?"#4ade80":"#e8e6e3"}}>{rScore.toLocaleString()}</span><span style={{color:"#555",fontSize:12}}> / {tgt.toLocaleString()}</span></div>
            {!mob&&rScore<tgt&&hLeft>0&&(()=>{const nph=Math.ceil((tgt-rScore)/hLeft);return (<div style={{fontSize:12,color:nph>45000?"#ef4444":nph>24000?"#fb923c":"#aaa",fontFamily:"system-ui",fontWeight:700,animation:nph>45000?"fpp 2s ease infinite":"none"}}>🎯 {nph.toLocaleString()}/hand</div>);})()}
        </div>
        <div style={{textAlign:"right"}}><div style={{color:"#fbbf24",fontWeight:700,fontSize:13}}>🐟{gold}</div>{runCount>=1&&<div style={{fontSize:10,color:"#4ade80",fontFamily:"system-ui"}}>{Math.min(5,Math.floor(gold/5))>0?`+${Math.min(5,Math.floor(gold/5))} stores`:""}</div>}</div>
        <div style={{display:"flex",gap:4,alignItems:"center"}}>
          <button onClick={e=>{e.stopPropagation();toggleMute();}} style={{background:"none",border:"none",fontSize:14,cursor:"pointer",opacity:.4,padding:4}} title={muted?"Unmute":"Mute"}>{muted?"🔇":"🔊"}</button>
        </div>
      </div>
      {mob&&rScore<tgt&&hLeft>0&&(()=>{const nph=Math.ceil((tgt-rScore)/hLeft);return(
        <div style={{textAlign:"center",padding:"3px 0",zIndex:1,maxWidth:700,width:"100%"}}>
          <span style={{fontSize:13,color:nph>45000?"#ef4444":nph>24000?"#fb923c":"#aaa",fontFamily:"system-ui",fontWeight:800,letterSpacing:1}}>🎯 {nph.toLocaleString()} per hand</span>
        </div>);})()}

      {mob?<div style={{display:"flex",gap:4,padding:"2px 12px",zIndex:1,maxWidth:700,width:"100%",justifyContent:"center",alignItems:"center",flexWrap:"nowrap"}}>
        {!seen.mobBar&&(fams.length>0||Object.values(devotion).some(v=>v>0))&&runCount>=1&&<span onClick={()=>{setSeen(s=>({...s,mobBar:true}));toast("ℹ️","Tap any icon for details","#fbbf24");}} style={{fontSize:10,color:"#fbbf2466",fontFamily:"system-ui",cursor:"pointer",animation:"breathe 2s ease-in-out infinite",marginRight:2}}>ℹ️</span>}
        {/* Season devotion — hidden on first run */}
        {runCount>=1&&Object.keys(DEVOTION_MILESTONES).map(breed=>{
          const dev=getDevotionLevel(breed,devotion);
          if(breed==="Mixed"&&dev.count===0)return null;
          const icon=breed==="Mixed"?"🌈":(BREEDS[breed]?.icon||"?");
          const color=breed==="Mixed"?"#e8e6e3":(BREEDS[breed]?.color||"#888");
          const pct=dev.next?Math.min(100,dev.count/dev.next.at*100):100;
          return(<span key={breed} onClick={()=>toast(icon,`${breed}: ${dev.count}${dev.next?"/"+dev.next.at+" → "+dev.next.name:"✓ ALL"}`,color)} style={{fontSize:12,cursor:"pointer",opacity:pct>=100?1:.5,position:"relative"}}>
            {icon}
            <div style={{position:"absolute",bottom:-1,left:"50%",transform:"translateX(-50%)",width:10,height:2,background:"#ffffff0a",borderRadius:1,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${pct}%`,background:color,borderRadius:1}}/>
            </div>
          </span>);
        })}
        {/* Divider */}
        {fams.length>0&&<div style={{width:1,height:14,background:"#ffffff0a",margin:"0 2px"}}/>}
        {/* Wards — icons only, tap for detail */}
        {fams.map(f=>(<span key={f.id} onClick={()=>toast(f.icon,`${f.name}: ${f.desc}`,"#fbbf24")} style={{fontSize:13,opacity:cfx.silence?.3:1,cursor:"pointer"}}>{f.icon}</span>))}
        {cfx.silence&&<span style={{fontSize:11,color:"#ef4444bb"}}>🤐</span>}
        {/* Curses — icons only, tap for detail */}
        {isBoss&&curses.length>0&&<div style={{width:1,height:14,background:"#ffffff0a",margin:"0 2px"}}/>}
        {isBoss&&curses.map((c,i)=>(<span key={i} onClick={()=>toast(c.icon,`${c.name}: ${c.desc}`,"#ef4444")} style={{fontSize:12,cursor:"pointer"}}>{c.icon}</span>))}
      </div>:<>
      {/* Desktop: full devotion tracker — hidden on first run */}
      {runCount>=1&&<div style={{display:"flex",gap:3,padding:"2px 16px",zIndex:1,maxWidth:700,width:"100%",justifyContent:"center",flexWrap:"wrap"}}>
        {Object.keys(DEVOTION_MILESTONES).map(breed=>{
          const dev=getDevotionLevel(breed,devotion);
          if(breed==="Mixed"&&dev.count===0)return null;
          const icon=breed==="Mixed"?"🌈":(BREEDS[breed]?.icon||"?");
          const color=breed==="Mixed"?"#e8e6e3":(BREEDS[breed]?.color||"#888");
          const pct=dev.next?Math.min(100,dev.count/dev.next.at*100):100;
          const lastUnlocked=dev.unlocked.length>0?dev.unlocked[dev.unlocked.length-1]:null;
          return(<div key={breed} title={dev.next?`${breed}: ${dev.count}/${dev.next.at} → ${dev.next.name}: ${dev.next.desc}`:`${breed}: ALL UNLOCKED`} style={{display:"flex",alignItems:"center",gap:2,fontSize:10,color:color+"88",fontFamily:"system-ui"}}>
            <span style={{fontSize:10}}>{icon}</span>
            <span>{dev.count}</span>
            <div style={{width:20,height:3,background:"#ffffff0a",borderRadius:2,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${pct}%`,background:color,borderRadius:2,transition:"width .3s"}}/>
            </div>
            {lastUnlocked&&<span style={{fontSize:10,color:color+"66"}}>✓{dev.unlocked.length}</span>}
          </div>);
        })}
      </div>}

      {isBoss&&curses.length>0&&<div style={{display:"flex",gap:4,padding:"3px 16px",zIndex:1,maxWidth:700,width:"100%",flexWrap:"wrap"}}>
        {curses.map((c,i)=>(<div key={i} title={c.desc} style={{display:"flex",alignItems:"center",gap:2,padding:"2px 6px",borderRadius:5,background:"#ef444411",border:"1px solid #ef444433",fontSize:10,color:"#ef4444",fontFamily:"system-ui"}}>{c.icon} <span style={{fontWeight:600}}>{c.name}</span></div>))}
        {cfx.exileBreed&&<div style={{display:"flex",alignItems:"center",gap:2,padding:"2px 6px",borderRadius:5,background:"#ef444411",border:"1px solid #ef444433",fontSize:10,color:"#ef4444",fontFamily:"system-ui"}}>{BREEDS[cfx.exileBreed].icon} Exiled</div>}
      </div>}
      </>}
      {hLeft<=2&&rScore<tgt&&ph==="playing"&&<div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:hLeft===1?"6px 16px":"4px 16px",zIndex:1,maxWidth:700,width:"100%",animation:hLeft===1?"fpp 1.2s ease infinite":"none",background:hLeft===1?"#ef444418":"#fb923c08",borderRadius:6,border:`1px solid ${hLeft===1?"#ef444444":"#fb923c22"}`}}>
        <span style={{fontSize:hLeft===1?12:10,fontWeight:900,color:hLeft===1?"#ef4444":"#fb923c",letterSpacing:hLeft===1?4:2,fontFamily:"system-ui"}}>{hLeft===1?"⚠ LAST HAND — WIN OR FALL ⚠":"⚡ 2 HANDS REMAINING"}</span>
      </div>}

      <div style={{width:"100%",maxWidth:700,zIndex:1,padding:"3px 0"}}><FM level={ferv} prev={pFerv}/></div>

      {!mob&&fams.length>0&&<div style={{display:"flex",gap:3,padding:"0 16px",zIndex:1,maxWidth:700,width:"100%",justifyContent:"center",alignItems:"center",flexWrap:"wrap"}}>
        {fams.map(f=>(<span key={f.id} title={`${f.name}: ${f.desc}`} onClick={()=>toast(f.icon,`${f.name}: ${f.desc}`,"#fbbf24")} style={{fontSize:14,opacity:cfx.silence?.3:1,cursor:"pointer",padding:"2px"}}>{f.icon}</span>))}
        {cfx.silence&&<span style={{fontSize:12,color:"#ef4444bb",fontFamily:"system-ui"}}>🤐</span>}
      </div>}

      {/* ★ Level-up / Grow-up / Devotion notifications — persist on playing screen */}
      {denNews.length>0&&ph==="playing"&&<div style={{display:"flex",gap:4,padding:"4px 16px",zIndex:1,maxWidth:700,width:"100%",justifyContent:"center",flexWrap:"wrap"}}>
        {denNews.slice(-3).map((n,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 10px",borderRadius:6,
          background:n.color+"11",border:`1px solid ${n.color}33`,animation:"fadeIn .4s ease-out",fontFamily:"system-ui"}}>
          <span style={{fontSize:14}}>{n.icon}</span>
          <span style={{fontSize:11,color:n.color,fontWeight:700}}>{n.text}</span>
        </div>))}
        <button onClick={()=>setDenNews([])} style={{background:"none",border:"none",color:"#555",fontSize:10,cursor:"pointer",padding:"2px 4px"}}>✕</button>
      </div>}


      <div style={{width:"100%",maxWidth:700,padding:"0 16px",zIndex:1}}><div style={{height:3,background:"#1a1a2e",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(100,(rScore/tgt)*100)}%`,background:isNL?"linear-gradient(90deg,#b85c2c,#f59e0b,#fef08a,#ffffffcc)":"linear-gradient(90deg,#fbbf24,#4ade80)",borderRadius:2,transition:"width .5s ease-out"}}/></div></div>

      {/* Scoring overlay with running counter */}
      {ph==="scoring"&&sRes&&(
        <div onClick={scoringDone?advanceFromScoring:skipScoring} style={{cursor:"pointer",position:"fixed",inset:0,background:"#000000cc",zIndex:100,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:0,
          animation:scoreShake>0?`bigShake ${0.2+scoreShake*0.08}s ease`:"none"}}>
          {scoringFlash&&<div style={{position:"absolute",inset:0,background:scoringFlash,opacity:.08,pointerEvents:"none",transition:"opacity .15s",zIndex:101}}/>}
          {/* ★ ×MULT POP — big, centered, source clearly labeled */}
          {multPop&&multPop.mode==="xmult"&&(()=>{
            const srcColor=multPop.label.includes("Bond")?"#4ade80":multPop.label.includes("Nerve")||multPop.label.includes("Blazing")||multPop.label.includes("Fury")||multPop.label.includes("NINTH")||multPop.label.includes("Undying")||multPop.label.includes("Defiant")||multPop.label.includes("Burning")||multPop.label.includes("Cornered")?"#fb923c":multPop.label.includes("Phoenix")||multPop.label.includes("Eternal")?"#fef08a":multPop.label.includes("Chimera")?"#c084fc":multPop.label.includes("Alpha")?"#60a5fa":multPop.label.includes("Scarred")?"#fb923c":"#fbbf24";
            return(<div style={{position:"absolute",top:"12%",left:0,right:0,zIndex:102,pointerEvents:"none",textAlign:"center",animation:"multFlash .7s ease-out forwards"}}>
              {/* Source label — ABOVE the number so you see WHY first */}
              <div style={{fontSize:18,color:srcColor,fontFamily:"system-ui",letterSpacing:3,fontWeight:700,marginBottom:8,textShadow:`0 0 20px ${srcColor}44`}}>{multPop.label}</div>
              {/* The number — enormous */}
              <div style={{fontSize:multPop.val>=2?110:multPop.val>=1.5?90:72,fontWeight:900,color:multPop.val>=2?"#fef08a":"#fbbf24",
                textShadow:`0 0 80px ${multPop.val>=2?"#fef08a":"#fbbf24"}bb, 0 0 160px ${multPop.val>=2?"#fef08a":"#fbbf24"}44, 0 6px 0 #00000088`,
                fontFamily:"'Cinzel',serif",letterSpacing:12,lineHeight:1}}>{"×"}{multPop.val}</div>
            </div>);
          })()}

          {/* ═══ FOCAL POINT 1: THE COUNTER BLOCK ═══ */}
          {/* Everything the eye needs lives here. No separate zones. */}
          {(()=>{
            const s=sStep>=0&&sStep<sRes.bd.length?sRes.bd[sStep]:null;
            const done=sStep>=sRes.bd.length-1;
            const curTotal=done?sRes.total:((runChips||0)*Math.max(1,runMult||0));
            const pct=tgt>0?Math.min(100,(curTotal+rScore)/tgt*100):0;
            const nearMiss=pct>=70&&pct<100;
            const tier=done?getScoreTier(sRes.total):null;
            const _fc=scoreEndRef.current?.isFirstCascade;
            const _earlyRun=meta&&meta.stats.w<2;
            const stepTotalsRef=scoreEndRef.current?.stepTotals||[];
            let annotation=null;
            if(s&&!done&&(_fc||_earlyRun)){
              const t=s.type;
              if(t==="hand"&&!fcSeenRef.current.hand){fcSeenRef.current.hand=true;annotation="Matching seasons = stronger hand type";}
              else if(t==="cat"&&!fcSeenRef.current.cat){fcSeenRef.current.cat=true;annotation=`Power ${s.chips||0} → +${s.chips||0} chips`;}
              else if((t==="trait"||t==="scar")&&!fcSeenRef.current.trait){fcSeenRef.current.trait=true;annotation=s.mult>0?`Trait adds +${s.mult} mult`:"Traits stack on top of power";}
              else if(t==="trait_rare"&&!fcSeenRef.current.rare){fcSeenRef.current.rare=true;annotation="Rare traits MULTIPLY everything";}
              else if(t==="bond"&&!fcSeenRef.current.bond){fcSeenRef.current.bond=true;annotation="Bonded pair → everything ×"+((s.xMult||1.5));}
              else if(t==="nerve"&&!fcSeenRef.current.nerve){fcSeenRef.current.nerve=true;annotation=`Nerve ${NERVE[ferv]?.name} → all scores ×${NERVE[ferv]?.xM}`;}
              else if(t==="grudge_tension"&&!fcSeenRef.current.grudge){fcSeenRef.current.grudge=true;annotation="Grudged cats lose mult when played together";}
              else if(t==="combo"&&!fcSeenRef.current.combo){fcSeenRef.current.combo=true;annotation="Hidden power combo! Bonus on top of your hand.";}
            }

            // Counter color — ★ v52: Simplified to match 4-color palette
            const hasX=s&&!!s.xMult;
            const counterColor=done?(tier?.color||"#e8e6e3")
              :!s?"#e8e6e3"
              :hasX?"#fef08a"
              :s.type==="hand"||s.type==="combo"||s.type==="nerve"||s.type==="fam"?"#fbbf24"
              :s.type==="bond"||s.type==="lineage"||s.type==="grudge_prove"?"#4ade80"
              :s.type==="grudge_tension"||s.type==="curse"||(s.mult<0)?"#ef4444"
              :s.type==="cat"||s.type==="trait"||s.type==="scar"?"#60a5fa"
              :s.chips&&!s.mult?"#60a5fa"
              :"#e8e6e3";

            // Counter scale: ★ DOPAMINE: responds to % jump in total, not just xMult
            const prevStepTotal=sStep>0&&sStep<stepTotalsRef.length?(stepTotalsRef[sStep-1]?.total??stepTotalsRef[sStep-1]??0):0;
            const curStepTotal=sStep>=0&&sStep<stepTotalsRef.length?(stepTotalsRef[sStep]?.total??stepTotalsRef[sStep]??0):0;
            const jumpPct=prevStepTotal>0?(curStepTotal-prevStepTotal)/prevStepTotal:0;
            const counterScale=done?1.1
              :hasX?(s.xMult>=2?1.5:s.xMult>=1.5?1.35:1.25)
              :jumpPct>0.5?1.22
              :jumpPct>0.2?1.12
              :s?.isBigCat?1.1
              :1;

            // Flavor pools — variable ratio reinforcement (prevents habituation)
            const pools={
              bond:["Love multiplies.","Together, more.","The bond holds.","Stronger as one."],
              lineage:["Blood remembers.","Family fights harder.","Generations deep."],
              grudge_prove:["Something to prove.","Rage is fuel.","They'll show them.","Spite burns bright."],
              grudge_tension:["Old wounds fester.","They can't focus.","History weighs."],
              nerve:NERVE[ferv]?.desc?[NERVE[ferv].desc]:[],
              fam:["A ward watches.","Silent guardian."],
              cat:["Holding the line.","Every cat counts.","Power becomes chips.","They add up."],
              trait:["Instinct kicks in.","Bred for this.","It's in their nature.","Training pays off."],
              trait_rare:["Power compounds.","The engine roars.","It keeps stacking.","Transcendent."],
              scar:["What doesn't kill…","Battle-hardened.","Scars are armor.","Earned, not given."],
              curse:["The dark pushes back.","A price paid."],
              gold:["Fortune favors them."],
              provider:["Resourceful."],
              xp_rank:["The colony remembers.","Their name carries weight.","Known by all.","Stories told by firelight.","A living legend.","They change everything.","Written into the Hearth."],
            };
            let pool=null;
            if(s){
              if(s.type==="cat")pool=pools.cat;
              else if(s.type==="xp_rank")pool=pools.xp_rank;
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

            // Step label color — ★ v52: Simplified to 4-color palette (gold=system, blue=cats, green=bonds, red=negative)
            const stepColor=!s?"#888"
              :s.type==="hand"||s.type==="combo"||s.type==="nerve"||s.type==="gold"||s.type==="xp_rank"||s.type==="fam"?"#fbbf24"
              :s.type==="cat"||s.type==="trait"||s.type==="trait_rare"||s.type==="scar"?"#60a5fa"
              :s.type==="bond"||s.type==="lineage"||s.type==="grudge_prove"||s.type==="provider"?"#4ade80"
              :s.type==="grudge_tension"||s.type==="boss_trait"||s.type==="curse"||s.mult<0?"#ef4444"
              :"#888";

            return(<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:0,
              transform:`scale(${counterScale})`,transition:"transform .3s ease-out",
              padding:"8px 20px",borderRadius:16,
              background:nearMiss&&!done?"#ef444408":hasX?"#fbbf2408":"transparent",
              boxShadow:nearMiss&&!done?`0 0 40px #ef444422`:hasX?`0 0 60px ${counterColor}22`:"none",
              border:nearMiss&&!done?"1px solid #ef444422":hasX?"1px solid #fbbf2422":"1px solid transparent",
            }}>

              {/* Hand type + power combo. establishes context */}
              {(()=>{
                const dh=meta?.stats?.dh||[];
                const disc=handDiscovery||[];
                // Primary hand
                const htObj=HT.find(h=>h.name===sRes.ht)||POWER_COMBOS.find(p=>p.name===sRes.ht);
                const isHidden=htObj&&htObj.hidden;
                const wasKnown=!isHidden||dh.includes(sRes.ht);
                const justDisc=disc.includes(sRes.ht);
                const showName=wasKnown||justDisc;
                // Combo
                const hasCombo=sRes.combo;
                const comboKnown=hasCombo&&dh.includes(sRes.combo);
                const comboJustDisc=hasCombo&&disc.includes(sRes.combo);
                const showCombo=hasCombo&&(comboKnown||comboJustDisc);
                const anyDisc=justDisc||comboJustDisc;
                const displayPrimary=showName?sRes.ht:"????";
                const displayCombo=hasCombo?(showCombo?sRes.combo:"????"):null;
                const isReveal=sStep===-1;
                // Extract level from breakdown label
                const htBd=sRes.bd.find(b=>b.type==="hand");
                const htLvMatch=htBd?.label?.match(/Lv(\d+)$/);
                return(<>
                  <div style={{display:"flex",alignItems:"center",gap:8,justifyContent:"center",marginTop:isReveal?20:0,marginBottom:isReveal?12:0,transition:"margin .4s"}}>
                    <div style={{fontSize:done?14:isReveal?26:20,fontWeight:900,letterSpacing:done?3:isReveal?10:6,
                      color:anyDisc?"#c084fc":sRes.bd.some(b=>b.type==="nerve")?NERVE[ferv].color:"#fbbf24",
                      textShadow:`0 0 ${isReveal?40:20}px ${anyDisc?"#c084fc":sRes.bd.some(b=>b.type==="nerve")?NERVE[ferv].color:"#fbbf24"}${isReveal?"77":"44"}`,
                      fontFamily:"'Cinzel',serif",
                      transition:"font-size .3s, letter-spacing .3s",
                      opacity:done?.6:1,
                      animation:isReveal?"comboBurst .6s ease-out":anyDisc?"newBestPop .6s ease-out":"none",
                    }}>{displayPrimary}{displayCombo?<span style={{color:"#c084fc"}}>{" + "}{displayCombo}</span>:""}</div>
                    {htLvMatch&&!done&&<span style={{fontSize:isReveal?13:11,fontWeight:700,color:"#fbbf24",background:"#fbbf2418",padding:isReveal?"3px 9px":"2px 7px",borderRadius:6,fontFamily:"system-ui",letterSpacing:1,border:"1px solid #fbbf2433",animation:isReveal?"fadeIn .8s ease-out":"none"}}>LV{htLvMatch[1]}</span>}
                  </div>
                  {!isReveal&&<div style={{marginBottom:done?2:4}}/>}
                  {anyDisc&&done&&<div style={{fontSize:10,color:"#c084fc",fontWeight:700,letterSpacing:2,fontFamily:"system-ui",animation:"fadeIn .5s ease-out",marginBottom:4}}>✨ SECRET COMBO DISCOVERED ✨</div>}
                  {done&&!anyDisc&&(()=>{const eo=htObj?.echo;return eo?<div style={{fontSize:10,color:"#ffffff66",fontStyle:"italic",fontFamily:"system-ui",letterSpacing:2,animation:"fadeIn 1s ease-out",marginBottom:2}}>{eo}</div>:null;})()}
                </>);
              })()}

              {/* THE NUMBER — chips × mult = score, always labeled. Hidden during reveal beat. */}
              {(()=>{
                const isReveal=sStep===-1;
                const isChipStep=s&&(s.chips>0)&&!s.xMult;
                const isMultStep=s&&(s.mult>0||s.mult<0)&&!s.xMult;
                const isXStep=s&&!!s.xMult;
                const isFirstStep=sStep===0;
                const displayChips=runChips||0;
                const displayMult=runMult||1;
                const displayTotal=curTotal;
                if(isReveal)return null;
                return(<div style={{display:"flex",gap:10,alignItems:"center",animation:isFirstStep?"fadeIn .4s ease-out":"none"}}>
                <div style={{textAlign:"center",transition:"transform .2s",transform:(isChipStep||isFirstStep)&&!done?"scale(1.2)":"scale(1)"}}>
                  <span style={{color:"#3b82f6",fontWeight:900,fontSize:done?26:22,transition:"font-size .2s",textShadow:(isChipStep||isFirstStep)&&!done?"0 0 12px #3b82f644":"none",animation:isFirstStep?"countUp .4s ease-out":"none"}}>{displayChips}</span>
                  <div style={{fontSize:10,color:"#3b82f666",fontFamily:"system-ui",letterSpacing:2}}>CHIPS</div>
                </div>
                <span style={{color:"#ffffff55",fontSize:16,fontFamily:"'Cinzel',serif"}}>{"×"}</span>
                <div style={{textAlign:"center",transition:"transform .2s",transform:(isMultStep||isFirstStep)&&!done?"scale(1.2)":"scale(1)"}}>
                  <span style={{color:"#ef4444",fontWeight:900,fontSize:done?26:22,transition:"font-size .2s",textShadow:(isMultStep||isFirstStep)&&!done?"0 0 12px #ef444444":"none",animation:isFirstStep?"countUp .4s ease-out":"none"}}>{displayMult}</span>
                  <div style={{fontSize:10,color:"#ef444466",fontFamily:"system-ui",letterSpacing:2}}>MULT</div>
                </div>
                <span style={{color:"#ffffff55",fontSize:16,fontFamily:"'Cinzel',serif"}}>=</span>
                <div style={{textAlign:"center"}}>
                  <span style={{fontWeight:900,
                    fontSize:done?38:28,
                    color:counterColor,
                    textShadow:`0 0 20px ${counterColor}66${done?", 0 0 60px "+counterColor+"33":""}`,
                    animation:done?"scorePop .5s ease-out":isFirstStep?"countUp .4s ease-out":isXStep?"multFlash .4s ease-out":"none",
                    transition:"all .15s",fontFamily:"system-ui",
                  }}>{displayTotal.toLocaleString()}</span>
                  <div style={{fontSize:10,color:counterColor+"44",fontFamily:"system-ui",letterSpacing:2}}>SCORE</div>
                </div>
              </div>);
              })()}

              {/* Flavor + attribution. subtitle OF the counter, not a separate zone */}
              {!done&&s?.reason&&<div style={{fontSize:10,color:stepColor+"cc",fontFamily:"system-ui",letterSpacing:.5,marginTop:1,animation:"fadeIn .15s ease-out",maxWidth:280,textAlign:"center",lineHeight:1.3}}>{s.reason}</div>}
              {!done&&flavor&&!s?.reason&&<div style={{fontSize:11,color:counterColor+"bb",fontFamily:"system-ui",fontStyle:"italic",letterSpacing:1.5,marginTop:2,animation:"fadeIn .15s ease-out",maxWidth:260,textAlign:"center",lineHeight:1.3}}>{flavor}</div>}
              {!done&&annotation&&<div style={{fontSize:10,color:"#4ade80",fontFamily:"system-ui",marginTop:4,padding:"3px 12px",borderRadius:8,background:"#4ade800a",border:"1px solid #4ade8022",animation:"fadeIn .3s ease-out",maxWidth:280,textAlign:"center",lineHeight:1.4,letterSpacing:.5}}>💡 {annotation}</div>}

              {/* Step label. footnote OF the counter */}
              {s&&!done&&<div style={{marginTop:2,textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:1}}>
                {(s.type==="hand"||s.type==="combo")?<>
                  {(()=>{
                    const htIdx=s.type==="hand"?HT.findIndex(h=>s.label.startsWith(h.name)):-1;
                    const rarity=s.type==="combo"?4:Math.max(0,htIdx); // combos = rare tier
                    const nameSize=rarity>=6?30:rarity>=4?24:rarity>=2?20:16; // Litter=30, Colony=24, Clowder=20, Kin=16
                    const numSize=rarity>=6?26:rarity>=4?22:rarity>=2?18:15;
                    const glowSize=rarity>=4?40:rarity>=2?25:15;
                    const shakeAnim=rarity>=6?"bigShake .5s ease-out":rarity>=4?"comboBurst .6s ease-out":"comboBurst .5s ease-out";
                    const htColor=s.type==="combo"?"#c084fc":rarity>=6?"#fef08a":rarity>=4?"#fbbf24":"#fbbf24";
                    return(<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,animation:shakeAnim}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{
                          fontSize:nameSize,fontFamily:"'Cinzel',serif",letterSpacing:rarity>=4?6:4,fontWeight:900,
                          color:htColor,
                          textShadow:`0 0 ${glowSize}px ${htColor}66, 0 0 ${glowSize*2}px ${htColor}22`,
                        }}>{s.type==="combo"?"⚡ ":rarity>=6?"🌟 ":rarity>=4?"🃏 ":""}{s.label.replace(/ Lv\d+$/,"")}</div>
                        {(()=>{const lvMatch=s.label.match(/Lv(\d+)$/);return lvMatch?<span style={{fontSize:rarity>=4?14:12,fontWeight:700,color:htColor,background:`${htColor}18`,padding:"2px 8px",borderRadius:6,fontFamily:"system-ui",letterSpacing:1,border:`1px solid ${htColor}33`}}>LV{lvMatch[1]}</span>:null;})()}
                      </div>
                      {(s.chips||s.mult)?<div style={{fontSize:numSize,fontWeight:900,display:"flex",gap:12,animation:`scorePopFade .5s ease-out .1s both`}}>
                        {s.chips>0&&<span style={{color:"#3b82f6"}}>+{s.chips}<span style={{fontSize:Math.max(10,numSize-8),opacity:.7,letterSpacing:1,marginLeft:2}}>CHIPS</span></span>}
                        {s.mult>0&&<span style={{color:"#ef4444"}}>+{s.mult}<span style={{fontSize:Math.max(10,numSize-8),opacity:.7,letterSpacing:1,marginLeft:2}}>MULT</span></span>}
                      </div>:null}
                    </div>);
                  })()}
                </>:<>
                  <div style={{
                    fontSize:hasX?14:s.type==="nerve"?13:s.isBigCat?12:s.type==="bond"?11:10,
                    fontFamily:hasX?"'Cinzel',serif":"system-ui",
                    letterSpacing:hasX?2:1,
                    fontWeight:900,color:stepColor,opacity:.85,
                    animation:hasX?"multFlash .4s ease-out":s.type==="nerve"?"comboBurst .4s ease-out":s.isBigCat?"comboBurst .35s ease-out":"fadeIn .15s ease-out",
                  }}>{s.label}</div>
                  {hasX&&(()=>{
                    const xColor=s.type==="bond"?"#4ade80":s.type==="nerve"?"#fb923c":s.type==="fam"?"#c084fc":"#fef08a";
                    return(<div style={{fontSize:s.xMult>=2?30:s.xMult>=1.5?24:20,fontWeight:900,color:xColor,letterSpacing:s.xMult>=2?6:4,
                      animation:"multFlash .5s ease-out",
                      textShadow:`0 0 ${s.xMult>=2?30:20}px ${xColor}cc`,
                    }}>{"×"}{s.xMult}</div>);
                  })()}
                  {/* Per-cat and other non-hand/combo steps show their contribution */}
                  {s.type!=="hand"&&s.type!=="combo"&&!hasX&&(s.chips||s.mult)?<div style={{fontSize:11,fontFamily:"system-ui",fontWeight:700,display:"flex",gap:6}}>
                    {s.chips>0&&<span style={{color:"#3b82f6"}}>+{s.chips}</span>}
                    {s.mult>0&&<span style={{color:"#ef4444"}}>+{s.mult}</span>}
                    {s.mult<0&&<span style={{color:"#ef4444"}}>{s.mult}</span>}
                  </div>:null}
                </>}
              </div>}

              {/* ★ Progress bar — only shown on final result, not during cascade */}
              {done&&<div style={{width:200,height:6,background:"#ffffff0a",borderRadius:3,overflow:"hidden",marginTop:6}}>
                <div style={{height:"100%",width:`${pct}%`,borderRadius:3,
                  background:pct>=100?"linear-gradient(90deg,#4ade80,#22d3ee)":"linear-gradient(90deg,#fb923c,#ef4444)",
                  boxShadow:pct>=100?"0 0 16px #4ade8088":"0 0 12px #ef444488"
                }}/>
              </div>}
              {done&&pct>=100&&<div style={{fontSize:14,color:"#4ade80",fontFamily:"system-ui",letterSpacing:4,fontWeight:900,animation:"comboBurst .6s ease-out",marginTop:4,textShadow:"0 0 16px #4ade8066"}}>TARGET PASSED ✦</div>}
              {done&&pct<100&&<div style={{fontSize:12,color:"#ef4444",fontFamily:"system-ui",letterSpacing:3,fontWeight:900,animation:"fpp 1.5s ease infinite",marginTop:4}}>BELOW THRESHOLD</div>}

              {/* Near miss indicator during cascade — subtle, not a celebration */}
              {!done&&nearMiss&&pct<100&&<div style={{fontSize:10,color:"#ef4444aa",fontFamily:"system-ui",letterSpacing:2,animation:"fpp 1.5s ease infinite",marginTop:2}}>CLOSE...</div>}

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

              {done&&_fc&&<div style={{fontSize:11,color:"#4ade80",fontFamily:"system-ui",marginTop:6,padding:"8px 16px",borderRadius:8,background:"#4ade800a",border:"1px solid #4ade8022",animation:"fadeIn .6s ease-out .3s both",maxWidth:320,textAlign:"center",lineHeight:1.6}}>
                <div style={{fontWeight:700,marginBottom:4}}>Chips × Mult = Score</div>
                <div style={{color:"#4ade80bb",fontSize:10}}>Each cat's <span style={{color:"#3b82f6"}}>Power adds Chips</span>. Traits and bonds add <span style={{color:"#ef4444"}}>Mult</span>. More same-season cats = stronger hand type = bigger base numbers. Stack everything.</div>
              </div>}

            </div>);
          })()}

          {/* ═══ THE BREATH ═══ */}
          {/* Empty space between counter and cats. The anticipation gap. */}
          <div style={{height:scoringDone?8:16}}/>

          {/* Skip hint. whisper in the breath */}
          {!scoringDone&&sStep>=2&&<div style={{fontSize:10,color:"#ffffff55",fontFamily:"system-ui",letterSpacing:2,animation:"fadeIn 1.5s ease-out"}}>TAP TO SKIP ⏭</div>}

          {/* Continue. replaces the breath */}
          {scoringDone&&(
            <button onClick={e=>{e.stopPropagation();advanceFromScoring();}} style={{background:"linear-gradient(135deg,#fbbf24,#f59e0b)",color:"#0a0a1a",border:"none",borderRadius:10,padding:"10px 32px",fontSize:13,fontWeight:700,cursor:"pointer",letterSpacing:1,fontFamily:"system-ui",boxShadow:"0 0 24px #fbbf2444",animation:"fadeIn .3s ease-out"}}>Continue</button>
          )}

          {/* v16: Visual Cat Scoring - Balatro-style: highlight involved cats per step */}
          <div style={{display:"flex",gap:mob?4:8,justifyContent:"center",alignItems:"flex-start",padding:"4px 8px",flexWrap:"wrap",maxWidth:"100%",opacity:sStep<0?0:1,transition:"opacity .3s",animation:sStep===0?"fadeIn .4s ease-out":"none"}}>
            {scoringCats.map((cat,ci)=>{
              const curStep=sStep>=0&&sStep<sRes.bd.length?sRes.bd[sStep]:null;
              const mySteps=sRes.bd.filter((s,si)=>s.catIdx===ci&&si<=sStep);
              const isActive=curStep?.catIdx===ci;
              const activeStep=isActive?curStep:null;
              const hasFired=mySteps.length>0;
              const isInvolved=curStep&&!isActive&&(curStep.allCats||(curStep.catIdxs&&curStep.catIdxs.includes(ci)));
              const totalC=mySteps.reduce((a,s)=>a+(s.chips||0),0);
              const totalM=mySteps.reduce((a,s)=>a+(s.mult||0),0);
              const xVals=mySteps.filter(s=>s.xMult).map(s=>s.xMult);
              const hlColor=isActive?"#fbbf24":isInvolved?(
                curStep.type==="hand"?"#fbbf24":
                curStep.type==="bond"?"#4ade80":
                curStep.type==="grudge_tension"?"#ef4444":
                curStep.type==="combo"?"#c084fc":
                curStep.type==="bench"?"#67e8f9":
                curStep.type==="nerve"?(NERVE[ferv].color||"#fbbf24"):
                "#fbbf24"
              ):null;
              return(
                <div key={cat.id} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,
                  transform:isActive?"scale(1.1)":isInvolved?"scale(1.04)":"scale(1)",
                  transition:"transform .25s ease, opacity .3s",
                  opacity:isActive?1:isInvolved?0.95:hasFired?0.65:0.12,flexShrink:0}}>
                  <div style={{position:"relative"}}>
                    <CC cat={cat} sel={isActive||isInvolved} hl={hasFired&&!isActive&&!isInvolved} sm={scoringCats.length>4} cw={vw<500?56:undefined}/>
                    {(isActive||isInvolved)&&<div style={{position:"absolute",inset:-3,borderRadius:14,border:`2px solid ${hlColor}`,boxShadow:`0 0 ${isActive?20:12}px ${hlColor}66,0 0 ${isActive?40:20}px ${hlColor}22`,pointerEvents:"none",animation:isActive?"glow 1s ease infinite":"none"}}/>}
                  </div>
                  <div style={{minHeight:20,display:"flex",flexDirection:"column",alignItems:"center",gap:0}}>
                    {hasFired&&<div style={{display:"flex",gap:4,alignItems:"center",animation:isActive?"countUp .3s ease-out":"none"}}>
                      {totalC!==0&&<span style={{fontSize:11,color:"#3b82f6",fontWeight:700,fontFamily:"system-ui"}}>{totalC>0?"+":""}{totalC}</span>}
                      {totalM!==0&&<span style={{fontSize:12,color:"#ef4444",fontWeight:800,fontFamily:"system-ui"}}>{totalM>0?"+":""}{totalM}</span>}
                    </div>}
                    {xVals.map((x,xi)=><span key={xi} style={{fontSize:14,color:"#fbbf24",fontWeight:900,fontFamily:"'Cinzel',serif",animation:"scorePop .3s ease",textShadow:"0 0 10px #fbbf2466"}}>{"×"}{x}</span>)}
                  </div>
                  {isActive&&activeStep?.reason&&<div style={{fontSize:10,color:"#ffffff66",fontFamily:"system-ui",textAlign:"center",maxWidth:100,lineHeight:1.3,animation:"fadeIn .2s ease-out"}}>{activeStep.reason}</div>}
                </div>
              );
            })}
          </div>

          {/* Global effects (bonds, grudges, wards, nerve, devotion) */}
          <div style={{display:"flex",gap:4,flexWrap:"wrap",justifyContent:"center",maxWidth:400,marginTop:4}}>
            {sRes.bd.slice(0,sStep+1).filter(s=>s.catIdx===undefined&&s.type!=="hand"&&s.type!=="combo"&&s.type!=="boss_trait").map((s,i)=>{
              const isCurrentStep=sRes.bd.indexOf(s)===sStep;
              const color=s.type==="nerve"?"#fbbf24":s.type==="bond"||s.type==="lineage"||s.type==="grudge_prove"?"#4ade80":s.type==="grudge_tension"?"#ef4444":s.type==="fam"||s.type==="devotion"?"#fbbf24":"#888";
              return(
              <div key={i} style={{display:"flex",gap:4,alignItems:"center",
                animation:isCurrentStep?"slideIn .3s ease-out":"none",
                fontSize:isCurrentStep?12:10,fontFamily:"system-ui",
                padding:isCurrentStep?"4px 10px":"2px 6px",borderRadius:6,
                background:color+"11",border:`1px solid ${color}33`,
                transform:isCurrentStep?"scale(1.05)":"scale(1)",transition:"all .2s"}}>
                <span style={{color,fontWeight:700}}>{s.label}</span>
                {s.xMult&&<span style={{color:"#fbbf24",fontWeight:900,fontSize:isCurrentStep?14:11}}>×{s.xMult}</span>}
                {!s.xMult&&s.mult>0&&<span style={{color:"#ef4444",fontWeight:700}}>+{s.mult}M</span>}
                {!s.xMult&&s.mult<0&&<span style={{color:"#ef4444",fontWeight:700}}>{s.mult}M</span>}
                {s.chips>0&&<span style={{color:"#3b82f6",fontWeight:700}}>+{s.chips}C</span>}
              </div>);
            })}
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
            {/* Season Devotion progress */}
            {(()=>{const dev=getDevotionLevel(traitTip.breed,devotion);return dev.count>0||dev.next?<div style={{marginTop:10,padding:"8px 12px",borderRadius:8,background:"#ffffff06",border:"1px solid #ffffff0a"}}>
              <div style={{fontSize:10,color:"#888",letterSpacing:2,marginBottom:3}}>SEASON DEVOTION · {dev.count} played</div>
              {dev.unlocked.map((m,i)=><div key={i} style={{fontSize:11,color:BREEDS[traitTip.breed]?.color||"#888",fontFamily:"system-ui"}}>✓ {m.name}: {m.desc}</div>)}
              {dev.next&&<div style={{fontSize:11,color:"#555",fontFamily:"system-ui"}}>○ {dev.next.at} plays: {dev.next.name} — {dev.next.desc}</div>}
            </div>:null;})()}
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
              {(()=>{const xp=getCatXP(traitTip.stats.tp,!!(getMB().xp));return xp?<span style={{color:xp.color,fontWeight:700}}>{xp.icon} {xp.label}</span>:null;})()}
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
          if(blind===2&&bossTraits.some(bt=>bt.fx.noStrength)){
            return(<div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:13,fontWeight:700,color:"#fbbf24",letterSpacing:2}}>{preview.type.name}</span>
              <span style={{fontSize:10,color:"#ef4444bb",fontStyle:"italic",fontFamily:"system-ui"}}>👁️ Watchful. it sees your hand</span>
            </div>);
          }
          let baseC=preview.type.base.c+(preview.combo?.bonus?.c||0);
          let baseM=preview.type.base.m+(preview.combo?.bonus?.m||0);
          if(preview.combo&&preview.comboIdxs){
            const pComboCats=preview.comboIdxs.map(i=>selC[i]).filter(Boolean);
            if(pComboCats.length>=2&&pComboCats.every(c=>c.breed===pComboCats[0].breed)){
              baseC=preview.type.base.c+Math.round(preview.combo.bonus.c*1.5);
              baseM=preview.type.base.m+Math.round(preview.combo.bonus.m*1.5);
            }
          }
          const catPow=selC.reduce((s,c)=>s+(c.injured?0:c.power),0);
          const traitCount=selC.filter(c=>!catIsPlain(c)).length;
          const bondedInHand=selC.filter(c=>c.bondedTo&&selC.find(x=>x.id===c.bondedTo)).length;
          const injuredCount=selC.filter(c=>c.injured).length;
          const scarredCount=selC.filter(c=>c.scarred&&!c.injured).length;
          const scarredXM=Math.pow(1.25,scarredCount);
          const bondPairCount=selC.filter(c=>c.bondedTo&&selC.find(x=>x.id===c.bondedTo)).length/2;
          const ubActive=getMB().bondBoost||0;
          const bondPairXM=bondPairCount>=2?(ubActive?1.75*1.4:1.5*1.25):bondPairCount>=1?(ubActive?1.75:1.5):1;
          const sig=(baseC+catPow+0)*(baseM+traitCount*2)*Math.max(1,NERVE[ferv].xM)*scarredXM*bondPairXM;
          const tgt2=eTgt();const need=Math.max(0,tgt2-rScore);
          const pacePerHand=hLeft>0?need/hLeft:need;
          const ratio=pacePerHand>0?sig/pacePerHand:99;
          const tier=ratio>=3?{w:"Crushing",c:"#fbbf24",p:100}:ratio>=1.8?{w:"Strong",c:"#4ade80",p:80}:ratio>=1?{w:"Decent",c:"#e8e6e3",p:55}:ratio>=0.5?{w:"Risky",c:"#fb923c",p:35}:{w:"Weak",c:"#ef4444",p:15};
          return(<>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:15,fontWeight:700,color:"#fbbf24",letterSpacing:2}}>{preview.type.name}</span>
              {preview.combo&&<span style={{fontSize:12,fontWeight:700,color:"#c084fc",letterSpacing:1}}>+ {(meta?.stats?.dh||[]).includes(preview.combo.name)?preview.combo.name:"????"}</span>}
              <span style={{fontSize:11,color:"#888",fontFamily:"system-ui"}}>{baseC}×{baseM}</span>
              <span style={{fontSize:14,fontWeight:900,color:tier.c,letterSpacing:1,fontFamily:"system-ui",textShadow:`0 0 8px ${tier.c}44`}}>{tier.w}</span>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <div style={{width:100,height:4,background:"#1a1a2e",borderRadius:3,overflow:"hidden",border:"1px solid #ffffff08"}}>
                <div style={{height:"100%",width:`${tier.p}%`,borderRadius:3,background:`linear-gradient(90deg,${tier.c}66,${tier.c})`,transition:"width .3s"}}/>
              </div>
              {need>0&&hLeft>0&&<span style={{fontSize:14,fontWeight:700,color:ratio>=1?"#4ade80":"#ef4444",fontFamily:"system-ui",letterSpacing:0.5}}>🎯 {Math.ceil(pacePerHand).toLocaleString()}/hand</span>}
            </div>
            {sel.size>1&&<button onClick={()=>setSel(new Set())} style={{background:"none",border:"1px solid #ffffff12",borderRadius:4,color:"#555",fontSize:10,cursor:"pointer",padding:"2px 8px",fontFamily:"system-ui"}}>Clear</button>}
            {hLeft<=1&&need>0&&<div style={{fontSize:10,color:"#ef4444",fontWeight:700,fontFamily:"system-ui",animation:"fpp 1.5s ease infinite"}}>LAST HAND</div>}
            {(()=>{
              const warnings=[];
              const injured=selC.filter(c=>c.injured);
              if(injured.length)warnings.push({icon:"🩹",text:`${injured.map(c=>c.name.split(" ")[0]).join(", ")} injured (half power)`,color:"#ef4444"});
              const grudgePairs=getGrudges(selC);
              if(grudgePairs.length)warnings.push({icon:"⚡",text:`${grudgePairs.map(([a,b])=>a.name.split(" ")[0]+"+"+b.name.split(" ")[0]).join(", ")} grudge (gamble!)`,color:"#fb923c"});
              const cursedNotAlone=selC.filter(c=>catHas(c,"Cursed")&&selC.some(x=>x.id!==c.id&&getCatBreeds(x).some(b=>getCatBreeds(c).includes(b))));
              if(cursedNotAlone.length)warnings.push({icon:"💀",text:`${cursedNotAlone[0].name.split(" ")[0]} Cursed, not alone (penalty)`,color:"#ef4444"});
              return warnings.length>0?<div style={{display:"flex",flexDirection:"column",gap:1}}>
                {warnings.map((w,i)=><div key={i} style={{fontSize:10,color:w.color,fontFamily:"system-ui"}}>{w.icon} {w.text}</div>)}
              </div>:null;
            })()}
          </>);
        })():(<div style={{textAlign:"center"}}><span style={{color:"#555",fontSize:10}}>Select up to 5 cats to play</span></div>)}
      </div>

      {/* Play preview strip + bench info */}
      {sel.size>=1&&(()=>{
        const ordered=[...sel].map(idx=>hand[idx]).filter(Boolean);
        const benchCats=hand.filter(c=>!ordered.find(x=>x.id===c.id));
        const benchTraited=benchCats.filter(c=>!catIsPlain(c)&&!catIsKitten(c));
        return(
          <div style={{display:"flex",gap:6,padding:"4px 16px",zIndex:1,maxWidth:700,width:"100%",justifyContent:"center",alignItems:"center"}}>
            <div style={{display:"flex",gap:3,alignItems:"flex-end"}}>
              {ordered.map((cat,pos)=>{
                if(!cat)return null;const b=BREEDS[cat.breed];
                return(<div key={cat.id} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:0}}>
                  <span style={{fontSize:10,color:"#fbbf24",fontFamily:"system-ui",fontWeight:700}}>{pos+1}</span>
                  <div style={{width:24,height:28,borderRadius:4,background:b.bg,border:`1px solid ${b.color}44`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontSize:10}}>
                    <span>{b.icon}</span><span style={{fontSize:10,color:b.color,fontWeight:700}}>{cat.power}</span>
                  </div>
                </div>);
              })}
            </div>
            {benchTraited.length>0&&<div style={{display:"flex",gap:2,alignItems:"center",padding:"2px 6px",borderRadius:4,background:"#ffffff06",border:"1px solid #ffffff0a"}}>
              <span style={{fontSize:10,color:"#888",fontFamily:"system-ui"}}>🪑</span>
              {benchTraited.slice(0,3).map(c=><span key={c.id} style={{fontSize:10}} title={`${c.name.split(" ")[0]}: bench bonus`}>{(c.trait||{}).icon||"·"}</span>)}
            </div>}
          </div>);
      })()}


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
        const _gHL=new Set();
        if(guide&&!autoPlay&&guide.step===0&&ante===1&&blind===0){
          const bc={};hand.forEach((c,i)=>{bc[c.breed]=(bc[c.breed]||0)+1;});
          const best=Object.entries(bc).sort((a,b)=>b[1]-a[1]).find(([,v])=>v>=2);
          if(best)hand.forEach((c,i)=>{if(c.breed===best[0]&&_gHL.size<best[1])_gHL.add(i);});
        }
        // Stash for card rendering
        hand._guideHL=_gHL;
        return null;
      })()}
      <div style={{display:"flex",gap:mob?2:3,padding:"0 4px",zIndex:1,justifyContent:"center",flexWrap:"nowrap",maxWidth:mob?(vw-8):840,width:"100%",overflowX:"visible"}}>
        {(()=>{
          // Sort display order but preserve original indices for selection
          const seasonOrder={Autumn:0,Winter:1,Spring:2,Summer:3};
          const indexed=hand.map((c,i)=>({c,i}));
          const sorted=handSort==="season"
            ?[...indexed].sort((a,b)=>(seasonOrder[a.c.breed]||0)-(seasonOrder[b.c.breed]||0)||b.c.power-a.c.power)
            :[...indexed].sort((a,b)=>b.c.power-a.c.power);
          const _cw=mob?Math.max(48,Math.min(80,Math.floor((vw-32)/Math.max(5,hand.length)))):0;
          return sorted.map(({c,i})=>{
          const selCats=[...sel].map(idx=>hand[idx]).filter(Boolean);
          const isRelated=!sel.has(i)&&selCats.some(sc=>(sc.bondedTo===c.id)||(c.parentIds?.includes(sc.id))||(sc.parentIds?.includes(c.id))||(c.stats?.par&&c.stats.par.includes(sc.name.split(" ")[0])));
          const relType=isRelated?(selCats.some(sc=>sc.bondedTo===c.id)?"mate":"kin"):null;
          const isGuideHL=hand._guideHL?.has(i)&&!sel.has(i);
          return(<div key={c.id} style={{position:"relative",flexShrink:0,animation:isGuideHL?"guidePulse 1.5s ease-in-out infinite":"none"}}>
            <CC cat={c} sel={sel.has(i)} onClick={()=>toggleS(i)} dis={ph!=="playing"||!!autoPlay} fog={cfx.fog&&!sel.has(i)} chemHint={!sel.has(i)?getHint(c):null} hl={isRelated||isGuideHL} onTraitClick={ct=>setTraitTip(ct)} sm={mob} cw={_cw||undefined}/>
            {isRelated&&<div style={{position:"absolute",top:-10,left:"50%",transform:"translateX(-50%)",fontSize:11,fontWeight:700,fontFamily:"system-ui",background:relType==="mate"?"#f472b622":"#4ade8022",padding:"1px 6px",borderRadius:4,border:`1px solid ${relType==="mate"?"#f472b644":"#4ade8044"}`,whiteSpace:"nowrap",animation:"countUp .3s ease-out",zIndex:10,color:relType==="mate"?"#f472b6":"#4ade80"}}>{relType==="mate"?"💕 mate":"👪 kin"}</div>}
            {isGuideHL&&<div style={{position:"absolute",top:-10,left:"50%",transform:"translateX(-50%)",fontSize:11,fontWeight:700,fontFamily:"system-ui",background:"#fbbf2422",padding:"1px 6px",borderRadius:4,border:"1px solid #fbbf2444",whiteSpace:"nowrap",animation:"guidePulse 1.5s ease-in-out infinite",zIndex:10,color:"#fbbf24"}}>👆 select</div>}
          </div>);
        });})()}
      </div>

      {sel.size>=1&&ph==="playing"&&!autoPlay&&(()=>{
        const selCatsP=[...sel].map(i=>hand[i]).filter(Boolean);
        const evald=evalH?.(selCatsP);
        if(!evald)return null;
        const htLv=getHtLevel?.(evald.name,htLevels||{})||1;
        const scaled=getHtScaled?.(evald,htLv);
        const baseC=scaled?.c||evald.base?.c||0;
        const baseM=scaled?.m||evald.base?.m||0;
        const bonds=selCatsP.filter(c=>c.bondedTo&&selCatsP.find(x=>x.id===c.bondedTo));
        const grudges=selCatsP.filter(c=>(c.grudgedWith||[]).some(gid=>selCatsP.find(x=>x.id===gid)));
        return(<div onClick={()=>{
          const htDescs={Stray:"1 cat played alone",Kin:"2 cats, same season",["Two Kin"]:"2 of one season + 2 of another",Clowder:"3 cats, same season",Colony:"4 cats, same season",Litter:"5 cats, same season",["Full Den"]:"3 of one season + 2 of another",Kindred:"3+ cats with the same trait"};
          toast("🃏",`${evald.name}: ${htDescs[evald.name]||""}${runCount>=1?`. Base ${baseC}C × ${baseM}M = ${baseC*baseM}.`:""}`,"#fbbf24");
        }} style={{textAlign:"center",padding:"2px 0",zIndex:1,animation:"fadeIn .15s ease-out",cursor:"help"}}>
          <span style={{fontSize:13,fontWeight:700,color:"#fbbf24",fontFamily:"'Cinzel',serif",letterSpacing:2}}>{evald.name}{htLv>1?` Lv${htLv}`:""}</span>
          {runCount>=1&&<><span style={{fontSize:11,color:"#3b82f6",fontFamily:"system-ui",fontWeight:700,marginLeft:8}}>{baseC}C</span>
          <span style={{fontSize:11,color:"#ffffff55",margin:"0 2px"}}>×</span>
          <span style={{fontSize:11,color:"#ef4444",fontFamily:"system-ui",fontWeight:700}}>{baseM}M</span></>}
          {bonds.length>0&&<span style={{fontSize:10,color:"#4ade80",marginLeft:6}}>💕×1.5</span>}
          {grudges.length>0&&<span style={{fontSize:10,color:"#fb923c",marginLeft:6}}>⚡−2M</span>}
          {evald.combo&&<span style={{fontSize:10,color:"#c084fc",marginLeft:6}}>+⚡{evald.combo.name}</span>}
        </div>);
      })()}

      <div style={{display:"flex",gap:8,padding:"8px",zIndex:10,alignItems:"center",position:mob?"sticky":"static",bottom:mob?0:"auto",background:mob?"#0a0a1aee":"transparent",borderTop:mob?"1px solid #ffffff0a":"none",justifyContent:"center"}}>
        {/* ★ FIX: If stuck at 0 hands with score below target, show explicit end-run button */}
        {ph==="playing"&&hLeft<=0&&rScore<tgt?(<div style={{textAlign:"center"}}>
          <button onClick={()=>endRun(false,rScore)} style={{...BTN("linear-gradient(135deg,#ef4444,#dc2626)","#fff"),padding:mob?"12px 24px":"10px 20px",fontSize:14,animation:"fpp 1.5s ease infinite"}}>Colony Fell</button>
          <div style={{fontSize:10,color:"#ef4444bb",marginTop:4,fontFamily:"system-ui"}}>No hands remaining</div>
        </div>):(<>
        <div style={{textAlign:"center"}}>
          {runCount>=1?(()=>{const cost=recruitCost();const canRecruit=ph==="playing"&&!autoPlay&&gold>=cost&&(draw.length>0||disc.length>0);
            return(<>
              <button onClick={recruitCat} disabled={!canRecruit} style={{...BTN(canRecruit?"#1a2e1a":"#111",canRecruit?"#4ade80":"#444",canRecruit),border:`1px solid ${canRecruit?"#4ade8044":"#222"}`,minWidth:mob?56:50,padding:mob?"10px 10px":"8px 10px",fontSize:10}}>+1 Cat</button>
              <div onClick={()=>toast("🐱","Recruit: draw an extra cat into your hand. Cost doubles each time (1→2→4→8🐟). More cats = better hands + bench bonuses.","#4ade80")} style={{fontSize:10,color:cost===0?"#4ade80":gold>=cost?"#fbbf24":"#ef4444",marginTop:2,fontFamily:"system-ui",cursor:"help"}}>{cost===0?"Free!":cost+"🐟"}</div>
            </>);
          })():null}
        </div>
        <div style={{textAlign:"center"}}>
          <button onClick={discardH} disabled={!sel.size||sel.size>MAX_DISCARD||dLeft<=0||ph!=="playing"||cfx.noDisc} style={{...BTN(sel.size&&sel.size<=MAX_DISCARD&&dLeft>0&&ph==="playing"&&!cfx.noDisc?"#1a1a2e":"#111",sel.size&&sel.size<=MAX_DISCARD&&dLeft>0&&ph==="playing"&&!cfx.noDisc?"#ef4444":"#444",sel.size>0&&sel.size<=MAX_DISCARD&&dLeft>0&&ph==="playing"&&!cfx.noDisc),border:`1px solid ${sel.size&&sel.size<=MAX_DISCARD&&dLeft>0&&!cfx.noDisc?"#ef444444":"#222"}`,minWidth:mob?56:60,padding:mob?"10px 10px":"8px 14px"}}>Discard{cfx.noDisc?" 🚫":""}</button>
          <div onClick={()=>toast("♻️",`Discard: swap up to ${MAX_DISCARD} selected cats for new draws. Free!`,"#ef4444")} style={{fontSize:10,color:cfx.noDisc?"#ef4444bb":sel.size>MAX_DISCARD?"#ef4444":dLeft<=0?"#ef4444":"#888",marginTop:2,fontFamily:"system-ui",cursor:"help"}}>{cfx.noDisc?"Disabled":sel.size>MAX_DISCARD?`Max ${MAX_DISCARD}`:`${dLeft} left`}</div>
          {sel.size>0&&dLeft>0&&!cfx.noDisc&&ph==="playing"&&(()=>{
            const selCats2=[...sel].map(i=>hand[i]).filter(Boolean);
            const hints=[];
            selCats2.forEach(c=>{
              if(catHas(c,"Scrapper"))hints.push({icon:"🥊",text:"+1 Nerve",color:"#fb923c"});
              else if(catHas(c,"Cursed"))hints.push({icon:"💀",text:"+1 Nerve",color:"#d97706"});
              else if(catHas(c,"Nocturnal"))hints.push({icon:"🌙",text:"+2 Nerve",color:"#c084fc"});
              else if(catHas(c,"Devoted")&&c.bondedTo)hints.push({icon:"🫀",text:"mate +P",color:"#f472b6"});
              else if(catHas(c,"Guardian"))hints.push({icon:"🛡️",text:"heal",color:"#4ade80"});
              else if(catHas(c,"Stubborn"))hints.push({icon:"🪨",text:"+1 Nerve",color:"#9ca3af"});
              else if(catHas(c,"Stray"))hints.push({icon:"🐈",text:"+1 draw",color:"#67e8f9"});
              else if(catHas(c,"Loyal"))hints.push({icon:"🫂",text:"+1M all",color:"#f472b6"});
              else if(catHas(c,"Scavenger"))hints.push({icon:"🌾",text:"+2🐟",color:"#4ade80"});
            });
            return hints.length>0?<div style={{fontSize:10,color:"#4ade80",fontFamily:"system-ui",marginTop:1}}>
              {hints.slice(0,2).map((h,i)=><span key={i} style={{color:h.color}}>{h.icon}{h.text} </span>)}
            </div>:null;
          })()}
        </div>
        <div style={{textAlign:"center"}}>
          <button onClick={playH} disabled={!sel.size||hLeft<=0||ph!=="playing"||!!autoPlay} style={{...BTN(sel.size&&ph==="playing"&&!autoPlay?"linear-gradient(135deg,#fbbf24,#f59e0b)":"#222",sel.size&&ph==="playing"&&!autoPlay?"#0a0a1a":"#555",sel.size>0&&ph==="playing"&&!autoPlay),minWidth:mob?80:70,padding:mob?"12px 18px":"8px 16px",fontSize:mob?15:14,animation:hLeft===1&&rScore<tgt?"fpp 1.2s ease infinite":"none",boxShadow:hLeft===1&&rScore<tgt?"0 0 20px #ef444488":"none"}}>Play{hLeft===1&&rScore<tgt?" ⚠":""}</button>
          <div onClick={()=>toast("🃏",`Hands: ${hLeft} remaining this round. Each hand plays up to 5 cats. Score ≥ threshold to clear.`,"#3b82f6")} style={{fontSize:10,color:hLeft<=1&&rScore<tgt?"#ef4444":"#888",marginTop:2,fontFamily:"system-ui",fontWeight:hLeft<=1&&rScore<tgt?900:400,animation:hLeft<=1&&rScore<tgt?"fpp 1s ease infinite":"none",cursor:"help"}}>{hLeft<=1&&rScore<tgt?"⚠ FINAL":hLeft===0?"Done":`Hands: ${hLeft}`}</div>
        </div>
        {/* Deck view + Sort */}
        <div style={{textAlign:"center"}}>
          <button onClick={()=>setDeckView(true)} style={{...BTN("#1a1a2e","#888"),border:"1px solid #ffffff12",padding:mob?"10px 10px":"8px 10px",fontSize:10,minWidth:mob?44:45}}>Deck</button>
          <div style={{fontSize:10,color:"#555",marginTop:2,fontFamily:"system-ui",cursor:"pointer"}} onClick={()=>setHandSort(s=>s==="season"?"power":"season")}>{handSort==="season"?"☀ szn":"⚡ pwr"}</div>
        </div>
        </>)}
      </div>

      {meta&&meta.stats.w<3&&ph==="playing"&&!autoPlay&&(()=>{
        const isVeryNew=!meta||meta.stats.r<=1;
        const PLAY_HINTS=isVeryNew?[
          "Match season icons (🍂☀️❄️🌱) for bigger scores. More matches = more points!",
          "2 matching = Kin. 3 = Clowder. 4 = Colony. 5 = Litter!",
          "Tap cats to select, then Play. Match 3+ of one season (🍂🍂🍂) for a Clowder — that's your bread and butter.",
          "+1 Cat button: spend 🐟 to draw an extra cat. More cats = better combos + bench bonuses!",
          "Discard swaps selected cats for new ones — it's free! Use it to fish for better matches.",
        ]:[
          "Match season icons for bigger scores. 3+ of one season = Clowder or Colony.",
          "Bonded cats (♡) score ×1.5 when played together.",
          "Scarred cats (⚔) score ×1.25 — scars are power, not damage.",
          "Wards boost your score every hand. Buy one at the Market.",
          "Nerve grows every time you clear a blind. Boss clears give more if you're fast.",
          "Unplayed cats in your hand give bench bonuses. Traits work from the bench too.",
          "Unspent rations earn interest. Save 5+ for a bonus each round.",
          "+1 Cat: spend rations to recruit extra cats. Great for boss rounds!",
          "Shelter a ♂ + ♀ pair in the den to breed kittens. Check the sex symbols!",
          "Cats earn epithets from events — scars, bonds, boss clears. Check the Hearth.",
        ];
        const hIdx=Math.floor(((ante-1)*3+blind+Math.floor(rScore/2000))%PLAY_HINTS.length);
        return <div style={{textAlign:"center",padding:"4px 16px",maxWidth:400,margin:"0 auto",animation:"fadeIn 1s ease-out"}}>
          <div style={{fontSize:isVeryNew?12:10,color:isVeryNew?"#fbbf24aa":"#ffffff44",fontFamily:"system-ui",lineHeight:1.5,padding:isVeryNew?"4px 12px":"0",borderRadius:8,background:isVeryNew?"#fbbf2408":"transparent",border:isVeryNew?"1px solid #fbbf2415":"none"}}>{isVeryNew?"🎯 ":""}{PLAY_HINTS[hIdx]}</div>
        </div>;
      })()}

      <div style={{maxWidth:700,width:"100%",padding:"2px 16px",zIndex:1,marginTop:"auto"}}>
        <details style={{cursor:"pointer"}}><summary style={{fontSize:10,color:"#555",letterSpacing:2}}>REFERENCE</summary>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:2,marginTop:4}}>
            {HT.slice(1).map(h=>{const best=handBests[h.name];const isHidden=h.hidden;const discovered=(meta?.stats?.dh||[]).includes(h.name);const show=!isHidden||discovered;return(<div key={h.name} style={{fontSize:10,fontFamily:"system-ui",color:show?"#555":"#333"}}>{show?<><span style={{color:discovered?"#c084fc":"#888",fontWeight:600}}>{h.name}{discovered?" ✨":""}</span> <span style={{color:"#3b82f6"}}>{h.base.c}</span>x<span style={{color:"#ef4444"}}>{h.base.m}</span> {h.ex}{best?<span style={{color:"#fbbf24bb"}}> best:{best.toLocaleString()}</span>:""}</>:<><span style={{color:"#555",fontWeight:600}}>????</span> <span style={{fontStyle:"italic",color:"#444444bb"}}>Trait combo</span></>}</div>);})}
            <div style={{fontSize:10,color:"#555",letterSpacing:1,marginTop:4,borderTop:"1px solid #ffffff08",paddingTop:3}}>POWER COMBOS <span style={{color:"#555",fontStyle:"italic"}}>(stack on season hands)</span></div>
            {POWER_COMBOS.map(p=>{const best=handBests[p.name];const discovered=(meta?.stats?.dh||[]).includes(p.name);return(<div key={p.name} style={{fontSize:10,fontFamily:"system-ui",color:discovered?"#555":"#333"}}>{discovered?<><span style={{color:"#c084fc",fontWeight:600}}>{p.name} ✨</span> +<span style={{color:"#3b82f6"}}>{p.bonus.c}</span>C +<span style={{color:"#ef4444"}}>{p.bonus.m}</span>M {p.ex}{best?<span style={{color:"#fbbf24bb"}}> best:{best.toLocaleString()}</span>:""}</>:<><span style={{color:"#555",fontWeight:600}}>????</span> <span style={{fontStyle:"italic",color:"#444444bb"}}>{p.ex.includes("consecutive")?"Consecutive combo":"Matching combo"}</span></>}</div>);})}
          </div>
          <div style={{borderTop:"1px solid #ffffff0a",marginTop:4,paddingTop:4}}>
            <div style={{fontSize:10,color:"#666",letterSpacing:1,marginBottom:2}}>TRAITS</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:1}}>
              {TRAITS.map(t=>{const tl=traitTierLabel(t);return(<div key={t.name} style={{fontSize:10,fontFamily:"system-ui",color:tl.color}}>{t.icon} <span style={{fontWeight:600}}>{t.name}</span> <span style={{opacity:.6,fontSize:10}}>({tl.label})</span> {t.desc}</div>);})}
            </div>
          </div>
          <div style={{display:"flex",gap:8,paddingTop:4,fontSize:10,fontFamily:"system-ui",color:"#666",flexWrap:"wrap"}}>
            <span>⚔ Scarred: ×1.25 mult</span>
            <span>🩹 Injured: Half power, −2 mult (heals in 2 rounds)</span>
            <span>🔥 Nerve: ×1.0 to ×2.2 (every clear +1, boss +hands remaining)</span>
          </div>
          <div style={{display:"flex",gap:8,paddingBottom:4,fontSize:10,fontFamily:"system-ui",color:"#666",flexWrap:"wrap"}}>
            <span>💕 Bonded pair: ×{getMB().bondBoost?"1.75":"1.5"} mult (from den shelter)</span>
            <span>⚡ Grudge: Always −{(getMB().grudgeWisdom||0)>0?"1":"2"} mult when grudged cats play together</span>
            <span>🪑 Bench: Unplayed hand cats give passive bonuses (traits or power as chips)</span>
          </div>
          <div style={{display:"flex",gap:8,paddingBottom:4,fontSize:10,fontFamily:"system-ui",color:"#666",flexWrap:"wrap"}}>
            <span>📣 Recruit: Pay 🐟 to draw extra cats (1→2→4→8🐟). More cards = better combos + bench</span>
            <span>🏷️ Epithets: Cats earn titles from events (scars, bonds, boss clears). Shown in Hearth</span>
          </div>
          <div style={{display:"flex",gap:8,paddingBottom:6,fontSize:10,fontFamily:"system-ui",color:"#666",flexWrap:"wrap"}}>
            {Object.keys(DEVOTION_MILESTONES).map(k=>(<span key={k} style={{color:BREEDS[k]?.color||"#888"}}>{BREEDS[k]?.icon} {k}: Play {k} cats to unlock devotion bonuses</span>))}
          </div>
        </details>
      </div>
      {showAbandon&&<div style={{position:"fixed",top:8,left:8,zIndex:200,display:"flex",gap:4,alignItems:"center"}}>
        <span style={{fontSize:10,color:"#ffffff55",fontFamily:"system-ui",marginRight:2}}>v0.61</span>
        {abandonConfirm?<>
          <button onClick={()=>{setAbandonConfirm(false);setPh("title");setTab("play");}} style={{background:"#ef444433",border:"1px solid #ef4444",borderRadius:6,fontSize:10,cursor:"pointer",padding:"4px 10px",color:"#ef4444",fontFamily:"system-ui",animation:"fadeIn .2s ease-out"}}>Abandon Run</button>
          <button onClick={()=>setAbandonConfirm(false)} style={{background:"none",border:"1px solid #ffffff22",borderRadius:6,fontSize:10,cursor:"pointer",padding:"4px 8px",color:"#888",fontFamily:"system-ui"}}>✕</button>
        </>:<div style={{display:"flex",gap:3}}>
          <button onClick={()=>setAbandonConfirm(true)} style={{background:"#ffffff08",border:"1px solid #ffffff22",borderRadius:8,fontSize:11,cursor:"pointer",padding:"6px 10px",color:"#aaa",fontFamily:"system-ui",display:"flex",alignItems:"center",gap:4}} title="Abandon run"><span style={{fontSize:14}}>☰</span><span style={{fontSize:10,letterSpacing:1}}>MENU</span></button>
          <button onClick={()=>setShowLog(l=>!l)} style={{background:showLog?"#fbbf2412":"#ffffff08",border:`1px solid ${showLog?"#fbbf2444":"#ffffff22"}`,borderRadius:8,fontSize:11,cursor:"pointer",padding:"6px 10px",color:showLog?"#fbbf24":"#aaa",fontFamily:"system-ui",display:"flex",alignItems:"center",gap:4}} title="Run log"><span style={{fontSize:14}}>📋</span><span style={{fontSize:10,letterSpacing:1}}>LOG</span></button>
        </div>}
      </div>}
      {showLog&&<div style={{position:"fixed",top:0,left:0,bottom:0,width:Math.min(320,vw-40),zIndex:250,background:"#0d1117f8",borderRight:"1px solid #ffffff15",overflowY:"auto",padding:"40px 12px 20px",animation:"slideIn .2s ease-out",fontFamily:"system-ui"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div style={{fontSize:11,color:"#fbbf24",letterSpacing:3,fontWeight:700}}>📋 RUN LOG</div>
          <button onClick={()=>setShowLog(false)} style={{background:"none",border:"none",color:"#555",fontSize:14,cursor:"pointer"}}>✕</button>
        </div>
        <div style={{fontSize:10,color:"#555",marginBottom:8}}>Night {ante} · Round {blind+1}/3 · {runLog.length} events</div>
        {runLog.length===0?<div style={{fontSize:11,color:"#555",fontStyle:"italic"}}>Nothing has happened yet.</div>
        :<div style={{display:"flex",flexDirection:"column",gap:3}}>
          {[...runLog].reverse().map((e,i)=>{
            const icons={hand:"🃏",draft:"📦",buy:"🛒",night:"🌙",fight:"⚔",death:"💀",bond:"💕",grudge:"⚡",reconcile:"🕊️",breed:"🐣",mentor:"📖",growth:"⭐",found:"🐟",wanderer:"🐱",trait:"✨",phoenix:"🔥",teach:"👪",reward:"🎁",exile:"🚫",training:"⚔️",sell:"🏷️"};
            const icon=icons[e.type]||"•";
            const colors={hand:"#fbbf24",death:"#ef4444",fight:"#ef4444",grudge:"#fb923c",bond:"#f472b6",breed:"#4ade80",reconcile:"#67e8f9",growth:"#4ade80",phoenix:"#fbbf24",trait:"#fbbf24",buy:"#fbbf24",night:"#888",draft:"#888",mentor:"#c084fc",teach:"#34d399"};
            const color=colors[e.type]||"#666";
            let text="";
            const d=e.data;
            if(e.type==="hand")text=`${d.type}: ${d.score.toLocaleString()} (${d.cats})`;
            else if(e.type==="death")text=`${d.victim} lost`;
            else if(e.type==="fight")text=`${d.loser} hurt (−${d.dmg}P)`;
            else if(e.type==="bond")text=`${d.c1} + ${d.c2} bonded`;
            else if(e.type==="grudge")text=`${d.c1} ⚡ ${d.c2} grudge`;
            else if(e.type==="reconcile")text=`${d.c1} + ${d.c2} reconciled${d.bonded?" + bonded":""}`;
            else if(e.type==="breed")text=`${d.baby} born (${d.parents})`;
            else if(e.type==="buy")text=`Bought ${d.name} (${d.cost}🐟)`;
            else if(e.type==="draft")text=`Drafted: ${d.picked}`;
            else if(e.type==="night")text=`Night ${d.from} → ${d.to}`;
            else if(e.type==="growth")text=`${d.cat} +1P`;
            else if(e.type==="mentor")text=`${d.elder} → ${d.young}`;
            else if(e.type==="found")text=`${d.cat} found ${d.gold}🐟`;
            else if(e.type==="wanderer")text=`${d.cat} joined`;
            else if(e.type==="trait")text=`${d.cat} gained ${d.trait}`;
            else if(e.type==="phoenix")text=`${d.risen} rose!`;
            else if(e.type==="teach")text=`${d.parent} taught ${d.child} ${d.trait}`;
            else if(e.type==="reward")text=`Reward: ${d.name}`;
            else if(e.type==="exile")text=d.victim;
            else if(e.type==="training")text=`${d.c1} & ${d.c2} sparred`;
            else text=JSON.stringify(d).slice(0,40);
            return(<div key={i} style={{fontSize:10,color,lineHeight:1.4,padding:"2px 0",borderBottom:"1px solid #ffffff06"}}>
              <span style={{opacity:.5}}>{icon}</span> {text}
              <span style={{fontSize:10,color:"#555",marginLeft:4}}>N{e.ante}.{e.blind+1}</span>
            </div>);
          })}
        </div>}
      </div>}
      {toasts.length>0&&<div style={{position:"fixed",top:12,right:12,zIndex:300,display:"flex",flexDirection:"column",gap:6,pointerEvents:"none",maxWidth:280}}>
        {toasts.map(t=>(<div key={t.id} style={{display:"flex",gap:8,alignItems:"center",padding:t.big?"12px 18px":"8px 14px",borderRadius:t.big?10:8,background:"#1a1a2eee",border:`1.5px solid ${t.color}${t.big?"66":"44"}`,boxShadow:`0 4px 16px #00000066,0 0 ${t.big?16:8}px ${t.color}${t.big?"44":"22"}`,animation:"slideIn .3s ease-out",fontFamily:"system-ui"}}>
          <span style={{fontSize:t.big?22:16,flexShrink:0}}>{t.icon}</span>
          <span style={{fontSize:t.big?14:12,color:t.color,fontWeight:t.big?700:600,lineHeight:1.3}}>{t.text}</span>
        </div>))}
      </div>}
    </div>
  );
}

const _root = ReactDOM.createRoot(document.getElementById("root"));
_root.render(React.createElement(NinthLife));
