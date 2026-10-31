import test from 'node:test';
import assert from 'node:assert/strict';
import { symbolicCardReply, CARD_INVITATION } from './symbolic-cards.mjs';
import { buildReflectionReply } from './persona.mjs';
import { drawTarotCards, TAROT_DECK } from './tarot-deck.mjs';

test('22 Major Arcana have distinct identities and reproducible three-card spreads', () => {
  assert.equal(TAROT_DECK.length,22);
  const reached=new Set();
  for(let round=0;round<200;round++) {
    const id=`saved-invitation-${round}`;
    const spread=drawTarotCards(id);
    assert.equal(spread.length,3);
    assert.equal(new Set(spread.map(card=>card.id)).size,3);
    assert.deepEqual(drawTarotCards(id),spread);
    for(const card of spread) { reached.add(card.id); assert.ok(card.meaning&&card.image&&card.action&&card.numeral); }
    const answer=symbolicCardReply('เราเลือกไพ่ใบที่ 2',[{id,role:'assistant',content:CARD_INVITATION}]);
    assert.ok(answer.includes(spread[1].name));
  }
  assert.equal(reached.size,22);
  assert.notDeepEqual(drawTarotCards('round-a'),drawTarotCards('round-b'));
});

test('fortune requests invite three symbolic choices and one selection gets its matching meaning', () => {
  const invitation = buildReflectionReply('ดูดวงให้หน่อย');
  assert.match(invitation, new RegExp(CARD_INVITATION));
  assert.ok(invitation.split('\n').length>=3);
  for (const [number,name] of [[1,'The Hermit'],[2,'The Star'],[3,'Wheel of Fortune']]) {
    const answer=buildReflectionReply(`เราเลือกไพ่ใบที่ ${number}`,[{role:'assistant',content:invitation}]);
    assert.match(answer,new RegExp(name));
    assert.match(answer,/ภาพ/);
    assert.ok(answer.split('\n').length>=3);
    assert.doesNotMatch(answer,/[?？]|คุณเป็นคน|แน่นอน|แม่นมาก/);
  }
});

test('one choice per own active invitation, invalid choices and assistant narratives cannot reopen it', () => {
  const invitation={role:'assistant',content:CARD_INVITATION};
  const choice={role:'user',content:'เราเลือกไพ่ใบที่ 1'};
  assert.equal(symbolicCardReply('เราเลือกไพ่ใบที่ 2',[invitation,choice]),null);
  assert.equal(symbolicCardReply('เราเลือกไพ่ใบที่ 1',[]),null);
  assert.equal(symbolicCardReply('เราเลือกไพ่ใบที่ 4',[invitation]),null);
  assert.ok(symbolicCardReply('เราเลือกไพ่ใบที่ 3',[invitation,choice,invitation]));
});

test('ordinary problems do not spawn cards, safety and opting out retain priority', () => {
  assert.equal(symbolicCardReply('หัวหน้าสั่งงานเพิ่มจนเหนื่อย'),null);
  assert.equal(symbolicCardReply('ไม่ต้องดูดวง'),null);
  assert.equal(symbolicCardReply('ดูดวงคืออะไร'),null);
  assert.match(buildReflectionReply('อยากตาย ดูดวงให้หน่อย'),/อันตรายทันทีไหม/);
  assert.match(buildReflectionReply('ดูดวงเรื่องเราไม่อยากเรียน'),new RegExp(CARD_INVITATION));
});
