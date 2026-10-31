import { test } from "node:test";
import { strict as assert } from "node:assert";
import { getPage, PAGES, MAX_INK } from "./boards";
import { newStory, startPage, finishPage, enterEndless, continueToNextPage, generateOffers, buyOffer, pageRewards, playPlacement, discardTiles } from "./engine";
import { emptyStats, recordStoryEnded, recordEndlessProgress, loadStoryStats, saveStoryStats } from "./stats";
import { loadStory, saveStory } from "./storage";
import { penSlots, shopOfferCount, priceFor, UPGRADES, upgradeAvailable } from "./upgrades";
import { PENS } from "./pens";
import { scorePlacement } from "./scoring";
import { compactNumber } from "./format";
import { totalCountDuration } from "./animation";
import type { StoryState, Enhancement, PlotTwist } from "./types";

function win(): StoryState {
  const run = startPage(newStory(), 8);
  run.page.ink = 5000;
  run.pagesCompleted = 8;
  const result = finishPage(run);
  assert.ok(!("error" in result));
  return result.state;
}
function buy(run: StoryState, id: string): StoryState {
  const def = UPGRADES.find(u => u.id === id);
  assert.ok(def);
  const result = buyOffer({ ...run, coins: 1000, offers: [{kind: "upgrade", upgradeId: id, price: def.price, sold: false}] }, 0);
  assert.ok(!("error" in result) && !("needsLetter" in result));
  return result;
}

test("Chapter 3 finishes in victory with the original reward, and cannot be credited twice", () => {
  const run = win();
  assert.equal(run.phase, "victory"); assert.equal(run.pagesCompleted, 9); assert.equal(run.coins, 32);
  assert.ok("error" in finishPage(run)); assert.equal(run.endlessPensUnlocked, false);
});
test("Enter Endless preserves the same run and board through its first Bookstore", () => {
  const won = win(); const next = enterEndless(won);
  assert.equal(next.phase, "bookstore"); assert.equal(next.runId, won.runId);
  for (const key of ["page", "tiles", "pens", "upgrades", "letterUpgrades", "wordLengthUpgrades", "completedPages"] as const) assert.equal(next[key], won[key]);
  assert.equal(next.coins, won.coins); assert.equal(next.totalInk, won.totalInk);
  const page4 = continueToNextPage(next); assert.equal(page4.pageIndex, 9); assert.equal(page4.endless, true);
});
test("Finish Story prevents later Endless entry and preserves terminal victory", () => {
  const finished = {...win(), completionDismissed: true}; assert.equal(enterEndless(finished), finished); assert.equal(finished.phase, "victory");
});
test("first Endless Bookstore guarantees two new Pens and an Endless Upgrade", () => {
  const run = enterEndless(win()); const offers = run.offers ?? [];
  assert.equal(offers.length, 7);
  assert.equal(offers.filter(o => o.kind === "pen" && PENS.find(p => p.id === o.penId)?.endless).length, 2);
  assert.equal(offers.filter(o => o.kind === "upgrade" && UPGRADES.find(u => u.id === o.upgradeId)?.chapter).length, 1);
});
test("all requested Chapter 4–11 targets and deterministic ×3 growth", () => {
  const targets = [[9000,21000,12000],[25000,58000,35000],[70000,160000,95000],[200000,450000,270000],[600000,1350000,810000],[1800000,4100000,2400000],[5400000,12000000,7300000],[16000000,36000000,22000000]];
  targets.forEach((row, c) => row.forEach((ink, p) => assert.equal(getPage(9+c*3+p).inkTarget, ink)));
  assert.deepEqual([33,34,35].map(i => getPage(i).inkTarget), [48000000,108000000,66000000]);
  assert.equal(getPage(36).inkTarget,144000000); assert.equal(getPage(30000).chapter,10001);
  assert.equal(getPage(30000).inkTarget,MAX_INK); assert.equal(getPage(9).size,13); assert.ok(getPage(11).plotTwist);
  assert.deepEqual(PAGES.map(p=>p.inkTarget),[30,130,90,600,1400,450,3500,8500,5000]);
});
test("Endless Coins follow 32, 36 through 60 plus Page Bonus and Loyalty Card", () => {
  for (const [index, base] of [[9,32],[12,36],[30,60],[99,60]] as const) {
    const run = startPage({...newStory(), endless:true, upgrades:["loyalty-card"]},index);
    run.page.ink = getPage(index).inkTarget*1.5;
    assert.deepEqual(pageRewards(run),{base,royalties:5,goldenPayday:0,loyalty:7,total:base+12});
  }
  const story=newStory(); story.upgrades=["loyalty-card"];assert.equal(pageRewards(story).loyalty,0);
});
for (const [id, chapter, price] of [["endless-pen-slot",4,85],["collectors-edition",7,220],["endless-extra-shelf",4,40],["expanded-bookstore",6,95],["loyalty-card",4,45],["bookstore-discount",4,85]] as const) {
  test(`${id} has its exact price, chapter, prerequisite, one-purchase and run-only rules`,()=>{
    const def=UPGRADES.find(u=>u.id===id);assert.ok(def);assert.equal(def.price,price);
    const prerequisites=def.requires?[def.requires]:[];
    assert.equal(upgradeAvailable(id,prerequisites,false,chapter),false);
    assert.equal(upgradeAvailable(id,prerequisites,true,chapter-1),false);
    assert.equal(upgradeAvailable(id,prerequisites,true,chapter),true);
    if(def.requires)assert.equal(upgradeAvailable(id,[],true,chapter),false);
    const run=startPage({...newStory(),endless:true,upgrades:prerequisites},(chapter-1)*3);
    const result=buy(run,id);assert.ok(result.upgrades.includes(id));
    assert.equal(upgradeAvailable(id,result.upgrades,true,chapter),false);
    const duplicate=buyOffer({...result,offers:[{kind:"upgrade",upgradeId:id,price,sold:false}]},0);assert.ok("error" in duplicate);
    assert.equal(newStory().upgrades.includes(id),false);
  });
}
test("Pen slots expand without changing original Extra Shelf; shop grows 7→8→9",()=>{
  assert.equal(penSlots(["extra-shelf"]),6);
  assert.equal(penSlots(["extra-shelf","endless-pen-slot","collectors-edition"]),8);
  let run=startPage({...enterEndless(win()),upgrades:["endless-pen-slot"]},18);
  run=buy(run,"endless-extra-shelf");assert.equal(shopOfferCount(run.upgrades),8);assert.equal(generateOffers(run).length,8);
  run=buy(run,"expanded-bookstore");assert.equal(shopOfferCount(run.upgrades),9);assert.equal(generateOffers(run).length,9);
});
test("Bookstore Discount costs 85 before applying, then discounts subsequent purchases",()=>{
  const run=buy(startPage(enterEndless(win()),9),"bookstore-discount");assert.equal(run.coins,915);
  assert.equal(priceFor(run.upgrades,85),68);assert.equal(priceFor(["bargain-hunter","bookstore-discount"],100),64);
});

interface Spec {word?:string; pen:string; existing?:number[]; enh?:Record<number,Enhancement>; premium?:boolean; edge?:boolean; wordsLeft?:number; discards?:number; lengths?:number[]; chapters?:number; twist?:PlotTwist; retrigger?:boolean; cross?:boolean}
function score(s:Spec){
  const word=s.word??"COAT";const start=s.edge?0:112;const indices=Array.from(word,(_,i)=>start+i);
  const tiles=Array.from(word,(letter,i)=>({id:`t${i}`,letter,enhancement:s.enh?.[i]??null}));
  const board=Array(225).fill(null);const pending=indices.flatMap((index,i)=>{
    if(s.existing?.includes(i)){board[index]={tileId:`t${i}`,letter:word[i],blank:false};return [];}
    return [{index,tileId:`t${i}`,letter:word[i]??"A",blank:false}];
  });
  return scorePlacement({words:[{word,indices},...(s.cross?[{word:"AT",indices:indices.slice(-2)}]:[])],size:15,board,pending,tiles,premiums:s.premium?{[start]:"DL"}:{},usedPremiums:[],plotTwist:s.twist??null,letterUpgrades:{},wordLengthUpgrades:{},pens:[{penId:s.pen,bonus:0},...(s.retrigger?[{penId:"linguist",bonus:0}]:[])],longestThisPage:s.retrigger?0:99,wordsLeft:s.wordsLeft??2,discardsUsed:s.discards??0,primaryWordLengths:s.lengths??[],chaptersCompleted:s.chapters??0});
}
test("Blue Pencil includes enhanced reused letters, with enhancements and Linguist retrigger",()=>{assert.equal(score({pen:"blue-pencil",existing:[0],enh:{0:"DW"}}).words[0]?.mult,18);assert.equal(score({pen:"blue-pencil",existing:[0],enh:{0:"DW"},retrigger:true}).words[0]?.mult,26)});
test("Critic multiplies only primary words of 7+",()=>{assert.equal(score({pen:"critic",word:"RETAINS",cross:true}).words[0]?.mult,84);assert.equal(score({pen:"critic",word:"RETAINS",cross:true}).words[1]?.mult,2);assert.equal(score({pen:"critic"}).words[0]?.mult,5)});
test("Margin Notes uses primary-word board edge only",()=>{assert.equal(score({pen:"margin-notes",edge:true,cross:true}).words[0]?.mult,10);assert.equal(score({pen:"margin-notes",edge:true,cross:true}).words[1]?.mult,2);assert.equal(score({pen:"margin-notes"}).words[0]?.mult,5)});
test("Illuminator adds 10 Base for new board-premium tiles, never reused, and retriggers",()=>{assert.equal(score({pen:"illuminator",premium:true}).words[0]?.base,19);assert.equal(score({pen:"illuminator",premium:true,existing:[0]}).words[0]?.base,6);assert.equal(score({pen:"illuminator",premium:true,retrigger:true}).words[0]?.base,29)});
test("Final Word ×3 only when one available play remains",()=>{assert.equal(score({pen:"final-word",wordsLeft:1}).words[0]?.mult,15);assert.equal(score({pen:"final-word",wordsLeft:2}).words[0]?.mult,5)});
test("Editor ×2 only before Page discards",()=>{assert.equal(score({pen:"editor"}).words[0]?.mult,10);assert.equal(score({pen:"editor",discards:1}).words[0]?.mult,5)});
test("Epilogue ×4 only on Plot Twist Pages",()=>{assert.equal(score({pen:"epilogue",twist:"fading-ink"}).words[0]?.mult,20);assert.equal(score({pen:"epilogue"}).words[0]?.mult,5)});
test("Red Letter ×3 includes a reused rare letter",()=>{assert.equal(score({pen:"red-letter",word:"QUIZ",existing:[0]}).words[0]?.mult,15);assert.equal(score({pen:"red-letter"}).words[0]?.mult,5)});
test("Anthologist counts distinct previous primary lengths, not current length",()=>{assert.equal(score({pen:"anthologist",lengths:[3,3,5]}).words[0]?.mult,13);assert.equal(score({pen:"anthologist"}).words[0]?.mult,5)});
test("Chronicler adds 8 Mult per completed Chapter",()=>{assert.equal(score({pen:"chronicler",chapters:3}).words[0]?.mult,29);assert.equal(score({pen:"chronicler",chapters:0}).words[0]?.mult,5)});
for(const pen of PENS.filter(p=>p.endless))test(`${pen.name} uses existing authoritative retrigger events`,()=>{
  const spec:Spec={pen:pen.id,word:"RETAINS",edge:true,premium:true,enh:{0:"TL"},wordsLeft:1,chapters:3,lengths:[3,5],twist:"fading-ink"};
  const normal=score(spec),repeat=score({...spec,retrigger:true});
  const a=normal.events.filter(e=>(e.type==="pen-base"||e.type==="pen-mult")&&e.penId===pen.id);
  const b=repeat.events.filter(e=>(e.type==="pen-base"||e.type==="pen-mult")&&e.penId===pen.id);
  // Red Letter needs a rare letter; test separately above and use QUIZ for its retrigger.
  if(pen.id==="red-letter")assert.equal(score({...spec,word:"QUIZ",retrigger:true}).words[0]?.mult,45);
  else {assert.ok(a.length>0);assert.equal(b.length,a.length*2);}
});
test("engine tracks previous primary lengths and actual discards on the Page",()=>{
  const run=newStory();const ids=["C-0","A-0","T-0"];run.page.rack=ids;
  const result=playPlacement(run,ids.map((tileId,i)=>({tileId,index:11+i,letter:"CAT"[i]??"A",blank:false})),()=>true);
  assert.ok(!("error" in result));assert.deepEqual(result.state.page.primaryWordLengths,[3]);
  const discarded=discardTiles(result.state,result.state.page.rack.slice(0,1));assert.ok(!("error" in discarded));assert.equal(discarded.page.discardsUsed,1);
});
test("unlock survives refresh/new runs; Story victory remains exactly one through Endless defeat",()=>{
  const store=new Map<string,string>(); const original=Object.getOwnPropertyDescriptor(globalThis,"localStorage");
  Object.defineProperty(globalThis,"localStorage",{configurable:true,value:{getItem:(key:string)=>store.get(key)??null,setItem:(key:string,value:string)=>store.set(key,value),removeItem:(key:string)=>store.delete(key)}});
  try {
    const won=win();let stats=recordStoryEnded(emptyStats(),won,true);saveStoryStats(stats);saveStory(won);
    assert.equal(loadStoryStats().endlessPensUnlocked,false);assert.equal(loadStory()?.phase,"victory");
    const endless=enterEndless(won);stats=recordEndlessProgress(stats,{...endless,pageIndex:9});saveStoryStats(stats);saveStory(endless);
    assert.equal(loadStory()?.runId,won.runId);assert.equal(loadStoryStats().endlessPensUnlocked,true);assert.equal(newStory().endlessPensUnlocked,true);
    const defeat={...continueToNextPage(endless),phase:"defeat" as const};stats=recordStoryEnded(loadStoryStats(),defeat,false);stats=recordStoryEnded(stats,defeat,false);
    assert.equal(stats.storiesWon,1);assert.equal(stats.storiesLost,0);assert.equal(stats.finished.length,1);assert.equal(stats.finished[0]?.result,"victory");assert.equal(stats.highestEndlessChapter,4);
    const fresh=newStory();assert.equal(fresh.endless,undefined);assert.equal(fresh.upgrades.length,0);
  }finally{if(original)Object.defineProperty(globalThis,"localStorage",original);else Reflect.deleteProperty(globalThis,"localStorage");}
});
test("extreme scores stay finite, readable and animation wait stays bounded",()=>{
  assert.equal(compactNumber(1e100),"1.00e100");assert.equal(compactNumber(1250000),"1.25M");assert.equal(totalCountDuration(1e300),4800);
  const s=score({pen:"chronicler",chapters:1e300});assert.ok(Number.isFinite(s.totalInk));assert.ok(s.events.every(e=>e.type!=="pen-mult"||Number.isFinite(e.runningMult)));
});
