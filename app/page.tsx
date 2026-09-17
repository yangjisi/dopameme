// app/page.tsx 파일에 이 코드를 복사하세요

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ────────────────────────────────────────────────────────────
// 콜렉션 오픈 조건: 같은 태그를 가진 이미지가 N장 모이면
// ────────────────────────────────────────────────────────────
const OPEN_THRESHOLD = 3;

// ────────────────────────────────────────────────────────────
// 더미 이미지 + 더미 태그
// 실제로는 서버에서 내려주고, 태그는 사용자에게 절대 노출 안 됨
// ────────────────────────────────────────────────────────────
const RAW = [
  ['img01', ['aaa', 'bbb']],
  ['img02', ['aaa', 'ccc']],
  ['img03', ['bbb', 'ddd']],
  ['img04', ['aaa', 'eee']],
  ['img05', ['ccc', 'fff']],
  ['img06', ['bbb', 'ccc']],
  ['img07', ['ddd', 'eee']],
  ['img08', ['aaa', 'fff']],
  ['img09', ['bbb', 'eee']],
  ['img10', ['ccc', 'ddd']],
  ['img11', ['aaa', 'ggg']],
  ['img12', ['eee', 'fff']],
  ['img13', ['bbb', 'ggg']],
  ['img14', ['ccc', 'eee']],
  ['img15', ['ddd', 'fff']],
  ['img16', ['aaa', 'hhh']],
  ['img17', ['bbb', 'fff']],
  ['img18', ['ccc', 'ggg']],
  ['img19', ['ddd', 'hhh']],
  ['img20', ['eee', 'ggg']],
  ['img21', ['aaa', 'ddd']],
  ['img22', ['bbb', 'hhh']],
  ['img23', ['ccc', 'hhh']],
  ['img24', ['ddd', 'ggg']],
  ['img25', ['eee', 'hhh']],
  ['img26', ['fff', 'ggg']],
  ['img27', ['fff', 'hhh']],
  ['img28', ['ggg', 'hhh']],
  ['img29', ['aaa', 'bbb']],
  ['img30', ['ccc', 'fff']],
  ['img31', ['ddd', 'eee']],
  ['img32', ['bbb', 'ggg']],
  ['img33', ['aaa', 'ccc']],
  ['img34', ['eee', 'fff']],
  ['img35', ['ddd', 'hhh']],
  ['img36', ['bbb', 'eee']],
];

const imagePool = RAW.map(([seed, tags], i) => ({
  id: i + 1,
  seed,
  tags,
  src: `https://picsum.photos/seed/${seed}/600/900`,
}));

// 유틸
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export default function DopaMeme() {
  const [tab, setTab] = useState('play');
  const [collected, setCollected] = useState([]);   // 고른 이미지들
  const [openedDecks, setOpenedDecks] = useState([]); // [{ tag, openedAt }]
  const [candidates, setCandidates] = useState([]);
  const [newDeck, setNewDeck] = useState(null);     // 얼럿에 띄울 deck

  // 태그별 보유 수
  const tagCounts = useMemo(() => {
    const m = {};
    collected.forEach((img) => {
      img.tags.forEach((t) => {
        m[t] = (m[t] || 0) + 1;
      });
    });
    return m;
  }, [collected]);

  // ── 후보 3장 뽑기 ───────────────────────────────────────
  // 사용자에겐 완전 랜덤으로 보이지만,
  // 완성 직전인 태그(N-1장)를 가진 이미지를 한 장 섞어 수렴시킴
  const pickCandidates = useCallback(
    (collectedList, counts, openedList) => {
      const collectedIds = new Set(collectedList.map((c) => c.id));
      const opened = new Set(openedList.map((d) => d.tag));
      const available = imagePool.filter((img) => !collectedIds.has(img.id));

      if (available.length <= 3) return shuffle(available);

      // 완성 직전 태그
      const nearTags = Object.keys(counts).filter(
        (t) => counts[t] === OPEN_THRESHOLD - 1 && !opened.has(t)
      );

      const result = [];

      if (nearTags.length > 0) {
        const targetTag = nearTags[Math.floor(Math.random() * nearTags.length)];
        const hit = shuffle(available.filter((img) => img.tags.includes(targetTag)));
        if (hit.length > 0) result.push(hit[0]);
      }

      // 남은 자리는 태그가 겹치지 않게 랜덤
      const rest = shuffle(available.filter((img) => !result.includes(img)));
      for (const img of rest) {
        if (result.length >= 3) break;
        const usedTags = new Set(result.flatMap((r) => r.tags));
        const overlap = img.tags.some((t) => usedTags.has(t));
        if (!overlap) result.push(img);
      }
      // 그래도 못 채웠으면 아무거나
      for (const img of rest) {
        if (result.length >= 3) break;
        if (!result.includes(img)) result.push(img);
      }

      return shuffle(result);
    },
    []
  );

  // 초기 후보
  useEffect(() => {
    setCandidates(pickCandidates([], {}, []));
  }, [pickCandidates]);

  // 다음 후보 이미지 미리 받아두기
  useEffect(() => {
    imagePool.slice(0, 12).forEach((img) => {
      const el = new Image();
      el.src = img.src;
    });
  }, []);

  // ── 이미지 선택 ─────────────────────────────────────────
  const choose = (img) => {
    const nextCollected = [...collected, img];

    // 태그 카운트 재계산
    const counts = {};
    nextCollected.forEach((c) => {
      c.tags.forEach((t) => {
        counts[t] = (counts[t] || 0) + 1;
      });
    });

    // 새로 열린 deck 확인 (방금 고른 이미지의 태그만 검사)
    const alreadyOpen = new Set(openedDecks.map((d) => d.tag));
    const justOpened = img.tags.find(
      (t) => counts[t] === OPEN_THRESHOLD && !alreadyOpen.has(t)
    );

    setCollected(nextCollected);

    let nextOpened = openedDecks;
    if (justOpened) {
      nextOpened = [{ tag: justOpened }, ...openedDecks];
      setOpenedDecks(nextOpened);
      setNewDeck(justOpened);
      setTab('collection');
    }

    setCandidates(pickCandidates(nextCollected, counts, nextOpened));
  };

  // deck별 이미지
  const deckImages = (tag) => collected.filter((c) => c.tags.includes(tag));

  return (
    <div className="h-[100dvh] bg-black text-white flex flex-col overflow-hidden">
      {/* ── 헤더 ── */}
      <div className="shrink-0 border-b border-neutral-800 px-4 pt-3 pb-2">
        <div className="max-w-md mx-auto">
          <h1 className="text-center text-xl font-black tracking-tight bg-gradient-to-r from-cyan-400 via-pink-500 to-orange-400 bg-clip-text text-transparent">
            도파Meme!
          </h1>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setTab('play')}
              className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
                tab === 'play'
                  ? 'bg-pink-500 text-white'
                  : 'bg-neutral-900 text-neutral-500'
              }`}
            >
              고르기
            </button>
            <button
              onClick={() => setTab('collection')}
              className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
                tab === 'collection'
                  ? 'bg-pink-500 text-white'
                  : 'bg-neutral-900 text-neutral-500'
              }`}
            >
              콜렉션 {collected.length > 0 && `(${collected.length})`}
            </button>
          </div>
        </div>
      </div>

      {/* ── 본문 ── */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === 'play' ? (
          /* ── 고르기: 3장 ── */
          <div className="h-full max-w-md mx-auto px-3 py-3">
            {candidates.length === 0 ? (
              <div className="h-full flex items-center justify-center text-neutral-500 text-sm">
                이미지를 다 봤어요.
              </div>
            ) : (
              <div className="h-full flex flex-col gap-2">
                {candidates.map((img) => (
                  <motion.button
                    key={img.id}
                    onClick={() => choose(img)}
                    whileTap={{ scale: 0.97 }}
                    className="flex-1 min-h-0 relative rounded-xl overflow-hidden bg-neutral-900 active:brightness-110"
                  >
                    <img
                      src={img.src}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                      draggable={false}
                    />
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ── 콜렉션 ── */
          <div className="h-full overflow-y-auto">
            <div className="max-w-md mx-auto px-3 py-4 space-y-6">
              {/* 콜렉션 카드 표지 */}
              {openedDecks.length > 0 && (
                <div>
                  <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                    {openedDecks.map((deck) => {
                      const imgs = deckImages(deck.tag);
                      return (
                        <motion.div
                          key={deck.tag}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="shrink-0 w-32"
                        >
                          <div className="relative w-32 h-44 rounded-xl overflow-hidden border-2 border-amber-400/70 shadow-lg shadow-amber-500/10">
                            <img
                              src={imgs[0]?.src}
                              alt=""
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 p-2.5">
                              <p className="text-[10px] text-amber-300 font-semibold mb-0.5">
                                COLLECTION
                              </p>
                              <p className="text-base font-black leading-tight">
                                {deck.tag}
                              </p>
                              <p className="text-[10px] text-neutral-400 mt-0.5">
                                {imgs.length}장
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 모은 이미지 나열 */}
              <div>
                {collected.length === 0 ? (
                  <div className="py-20 text-center text-neutral-600 text-sm">
                    아직 고른 이미지가 없어요.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5">
                    {[...collected].reverse().map((img, i) => (
                      <motion.div
                        key={`${img.id}-${i}`}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="aspect-[2/3] rounded-lg overflow-hidden bg-neutral-900"
                      >
                        <img
                          src={img.src}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 콜렉션 오픈 얼럿 ── */}
      <AnimatePresence>
        {newDeck && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center px-6"
            onClick={() => setNewDeck(null)}
          >
            <motion.div
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              className="w-full max-w-xs bg-neutral-950 border border-amber-400/40 rounded-2xl p-6 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-3xl mb-3">✨</p>
              <p className="text-xs text-amber-300 font-semibold tracking-widest mb-2">
                NEW COLLECTION
              </p>
              <p className="text-2xl font-black mb-1">{newDeck}</p>
              <p className="text-sm text-neutral-400 mb-5">
                콜렉션이 열렸습니다
              </p>
              <button
                onClick={() => setNewDeck(null)}
                className="w-full py-2.5 rounded-xl bg-amber-400 text-black font-bold text-sm"
              >
                확인
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}