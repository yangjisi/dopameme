// app/page.tsx 파일에 이 코드를 복사하세요

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// 더미 데이터 (실제 서비스에서는 9:16 AI 영상으로 교체)
const videoLibrary = [
  { id: 1, prompt: '회의실에서 고양이가 스트레칭하기', youtubeId: 'ATKxsgriVGY' },
  { id: 2, prompt: '지하철에서 개가 짖기', youtubeId: '3075AkO8cM0' },
  { id: 3, prompt: '펍에서 펭귄이 미끄러지기', youtubeId: 'RMqZVDiJAP8' },
  { id: 4, prompt: '백화점에서 사자가 포효하기', youtubeId: 'mzsRB48lLCg' },
  { id: 5, prompt: '도서관에서 앵무새가 헤드뱅잉하기', youtubeId: 'PngXQ2x8AwM' },
  { id: 6, prompt: '웨딩홀에서 원숭이가 옆돌기', youtubeId: 'Gsv4q_Q43Mk' },
  { id: 7, prompt: '공원에서 백조가 목을 펴기', youtubeId: '1doEyvyJBh4' },
  { id: 8, prompt: '병원에서 돌고래가 점프하기', youtubeId: '063A8qJ_uTM' },
  { id: 9, prompt: '영화관에서 너구리가 손을 비비기', youtubeId: 'UjK27PhoQMs' },
  { id: 10, prompt: '운동장에서 독수리가 날개짓하기', youtubeId: 'BcTBplMMVdM'  },
  { id: 11, prompt: '사무실에서 거북이가 기어가기', youtubeId: 'HYCGIFmJ1LE' },
  { id: 12, prompt: '버스에서 고양이가 스트레칭하기', youtubeId: 'q3hTSTh9cAo'  },
  { id: 13, prompt: '콘서트홀에서 개가 짖기', youtubeId: 'xSGIwEsouHc' },
  { id: 14, prompt: '골프장에서 사자가 포효하기', youtubeId: 'IMp99MgNuPI' },
  { id: 15, prompt: '카페에서 앵무새가 헤드뱅잉하기', youtubeId: 'q3hTSTh9cAo' },
  { id: 16, prompt: '소방서에서 재미있게 웃기', youtubeId: 'bKyZXDaVxpw' },
  { id: 17, prompt: '학교에서 신나서 쇼핑하기', youtubeId: 'ATKxsgriVGY' },
  { id: 18, prompt: '장례식장에서 거북이가 기어가기', youtubeId: 'k31qwVzzE8E' },
  { id: 19, prompt: '놀이공원에서 열심히 운동하기', youtubeId: 'mzsRB48lLCg'  },
  { id: 20, prompt: '박물관에서 독수리가 날개짓하기', youtubeId: 'h6KUzhK93lI'  },
];

// 16:9 더미 영상을 9:16 프레임에 꽉 채우기 위한 클래스
// (실제 9:16 영상으로 교체하면 [&>iframe]:w-full 로 바꾸면 됨)
const COVER_IFRAME =
  '[&>iframe]:absolute [&>iframe]:top-1/2 [&>iframe]:left-1/2 ' +
  '[&>iframe]:-translate-x-1/2 [&>iframe]:-translate-y-1/2 ' +
  '[&>iframe]:h-full [&>iframe]:w-[320%] [&>iframe]:max-w-none';
 
export default function DopaMemeGame() {
  const [currentVideo, setCurrentVideo] = useState(videoLibrary[0]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [likes, setLikes] = useState({});
  const [selectedTab, setSelectedTab] = useState('play');
  const [visibleVideoId, setVisibleVideoId] = useState(null);
  const [apiReady, setApiReady] = useState(false);
  const [feedNode, setFeedNode] = useState(null);
  const [soundOn, setSoundOn] = useState(false);
  const [headerH, setHeaderH] = useState(0);
 
  const headerRef = useRef(null);
  const playersRef = useRef({});
  const hostRefs = useRef({});
  const videoIdMap = useRef({});
  const visibleIdRef = useRef(null);
  const soundOnRef = useRef(false);
  const playHostRef = useRef(null);
  const playPlayerRef = useRef(null);
 
  useEffect(() => { soundOnRef.current = soundOn; }, [soundOn]);
 
  // ── 헤더 실제 높이 측정 ─────────────────────────────────
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const update = () => setHeaderH(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
 
  // ── YouTube IFrame API 로드 ──────────────────────────────
  useEffect(() => {
    if (window.YT && window.YT.Player) { setApiReady(true); return; }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prev === 'function') prev();
      setApiReady(true);
    };
    if (!document.getElementById('yt-iframe-api')) {
      const tag = document.createElement('script');
      tag.id = 'yt-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
    }
  }, []);
 
  const applySound = (player) => {
    if (!player || typeof player.unMute !== 'function') return;
    try {
      if (soundOnRef.current) { player.unMute(); player.setVolume(100); }
      else { player.mute(); }
    } catch (_) {}
  };
 
  // ── 피드 플레이어 생성 ───────────────────────────────────
  const createFeedPlayers = useCallback(() => {
    if (!window.YT || !window.YT.Player) return;
    Object.keys(hostRefs.current).forEach((key) => {
      const id = Number(key);
      if (playersRef.current[id]) return;
      const host = hostRefs.current[id];
      const ytId = videoIdMap.current[id];
      if (!host || !ytId) return;
 
      const inner = document.createElement('div');
      host.innerHTML = '';
      host.appendChild(inner);
 
      playersRef.current[id] = new window.YT.Player(inner, {
        width: '100%', height: '100%', videoId: ytId,
        playerVars: {
          autoplay: 0, controls: 0, mute: 1, playsinline: 1,
          modestbranding: 1, rel: 0, loop: 1, playlist: ytId,
        },
        events: {
          onReady: (e) => {
            if (visibleIdRef.current === id) { applySound(e.target); e.target.playVideo(); }
            else { e.target.mute(); }
          },
        },
      });
    });
  }, []);
 
  useEffect(() => { if (apiReady) createFeedPlayers(); }, [apiReady, createFeedPlayers]);
 
  const setHostRef = useCallback((id, ytId) => (el) => {
    if (el) {
      hostRefs.current[id] = el;
      videoIdMap.current[id] = ytId;
      createFeedPlayers();
    } else {
      delete hostRefs.current[id];
    }
  }, [createFeedPlayers]);
 
  // ── 플레이 탭 플레이어 ───────────────────────────────────
  const setPlayHostRef = useCallback((el) => {
    playHostRef.current = el;
    if (!el || !window.YT || !window.YT.Player || playPlayerRef.current) return;
 
    const inner = document.createElement('div');
    el.innerHTML = '';
    el.appendChild(inner);
 
    playPlayerRef.current = new window.YT.Player(inner, {
      width: '100%', height: '100%', videoId: currentVideo.youtubeId,
      playerVars: {
        autoplay: 1, controls: 0, mute: 1, playsinline: 1,
        modestbranding: 1, rel: 0, loop: 1, playlist: currentVideo.youtubeId,
      },
      events: { onReady: (e) => { applySound(e.target); e.target.playVideo(); } },
    });
  }, [currentVideo.youtubeId]);
 
  useEffect(() => {
    if (apiReady && selectedTab === 'play' && playHostRef.current && !playPlayerRef.current) {
      setPlayHostRef(playHostRef.current);
    }
  }, [apiReady, selectedTab, setPlayHostRef]);
 
  useEffect(() => {
    if (selectedTab !== 'play' || isSpinning) return;
    const p = playPlayerRef.current;
    if (!p || typeof p.loadVideoById !== 'function') return;
    try { p.loadVideoById({ videoId: currentVideo.youtubeId }); applySound(p); } catch (_) {}
  }, [currentVideo.youtubeId, isSpinning, selectedTab]);
 
  // ── 탭 전환 정리 ────────────────────────────────────────
  useEffect(() => {
    if (selectedTab === 'feed') {
      if (playPlayerRef.current) {
        try { playPlayerRef.current.destroy(); } catch (_) {}
        playPlayerRef.current = null;
        playHostRef.current = null;
      }
    } else {
      Object.values(playersRef.current).forEach((p) => {
        try { p.destroy(); } catch (_) {}
      });
      playersRef.current = {};
      hostRefs.current = {};
      setVisibleVideoId(null);
      visibleIdRef.current = null;
    }
  }, [selectedTab]);
 
  // ── 소리 토글 반영 ──────────────────────────────────────
  useEffect(() => {
    soundOnRef.current = soundOn;
    if (selectedTab === 'play') applySound(playPlayerRef.current);
    else if (visibleVideoId != null) applySound(playersRef.current[visibleVideoId]);
  }, [soundOn, selectedTab, visibleVideoId]);
 
  // ── 슬롯머신 ────────────────────────────────────────────
  const spinSlot = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    let spins = 0;
    const spinInterval = setInterval(() => {
      setCurrentVideo(videoLibrary[Math.floor(Math.random() * videoLibrary.length)]);
      spins++;
      if (spins > 15) { clearInterval(spinInterval); setIsSpinning(false); }
    }, 80);
  };
 
  const submitTitle = () => {
    if (!titleInput.trim()) return;
    const newSubmission = {
      id: Date.now(),
      videoId: currentVideo.id,
      prompt: currentVideo.prompt,
      youtubeId: currentVideo.youtubeId,
      title: titleInput,
      timestamp: new Date(),
      likes: 0,
    };
    setSubmissions([newSubmission, ...submissions]);
    setTitleInput('');
    setLikes({ ...likes, [newSubmission.id]: false });
  };
 
  const toggleLike = (id) => {
    setLikes((prev) => ({ ...prev, [id]: !prev[id] }));
    setSubmissions((prev) =>
      prev.map((sub) =>
        sub.id === id ? { ...sub, likes: likes[id] ? sub.likes - 1 : sub.likes + 1 } : sub
      )
    );
  };
 
  const formatTime = (date) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };
 
  // ── Intersection Observer ───────────────────────────────
  useEffect(() => {
    if (!feedNode || submissions.length === 0) return;
    visibleIdRef.current = submissions[0].id;
    setVisibleVideoId(submissions[0].id);
 
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = Number(entry.target.dataset.videoId);
            visibleIdRef.current = id;
            setVisibleVideoId(id);
          }
        });
      },
      { root: feedNode, threshold: 0.6 }
    );
    feedNode.querySelectorAll('[data-video-id]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [feedNode, submissions.length]);
 
  useEffect(() => {
    if (selectedTab !== 'feed' || visibleVideoId == null) return;
    visibleIdRef.current = visibleVideoId;
    Object.entries(playersRef.current).forEach(([id, player]) => {
      if (!player || typeof player.playVideo !== 'function') return;
      try {
        if (Number(id) === visibleVideoId) { applySound(player); player.playVideo(); }
        else { player.mute(); player.pauseVideo(); }
      } catch (_) {}
    });
  }, [visibleVideoId, selectedTab, apiReady]);
 
  return (
    <div className="min-h-screen bg-black text-white">
      {/* ── 헤더 ── */}
      <div
        ref={headerRef}
        className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur border-b border-gray-800"
      >
        <div className="max-w-md mx-auto px-4 py-3 relative">
          <div className="text-center">
            <h1 className="text-2xl font-black bg-gradient-to-r from-cyan-400 via-pink-500 to-orange-400 bg-clip-text text-transparent">
              🧠 도파Meme!
            </h1>
            <p className="text-[10px] text-gray-500">제목짓기학원</p>
          </div>
 
          <button
            onClick={() => setSoundOn((v) => !v)}
            className={`absolute right-4 top-3 w-9 h-9 rounded-full flex items-center justify-center text-base transition-all ${
              soundOn ? 'bg-pink-500' : 'bg-gray-800'
            }`}
          >
            {soundOn ? '🔊' : '🔇'}
          </button>
 
          <div className="flex gap-2 mt-2 justify-center">
            <button
              onClick={() => setSelectedTab('play')}
              className={`px-4 py-1 text-sm font-semibold rounded transition-all ${
                selectedTab === 'play' ? 'bg-pink-500 text-white' : 'bg-gray-900 text-gray-400'
              }`}
            >
              🎮 플레이
            </button>
            <button
              onClick={() => setSelectedTab('feed')}
              className={`px-4 py-1 text-sm font-semibold rounded transition-all ${
                selectedTab === 'feed' ? 'bg-pink-500 text-white' : 'bg-gray-900 text-gray-400'
              }`}
            >
              📺 피드 ({submissions.length})
            </button>
          </div>
        </div>
      </div>
 
      <AnimatePresence>
        {selectedTab === 'play' ? (
          /* ── 플레이 탭 (세로 숏폼) ── */
          <motion.div
            key="play"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ paddingTop: headerH }}
          >
            <div
              className="max-w-md mx-auto px-3 py-3"
              style={{ height: `calc(100dvh - ${headerH}px)` }}
            >
              <div className="relative w-full h-full mx-auto bg-gray-900 rounded-2xl overflow-hidden border border-gray-800">
                {/* 영상 */}
                <div className={`absolute inset-0 overflow-hidden ${COVER_IFRAME}`}>
                  <div ref={setPlayHostRef} className="w-full h-full" />
                </div>
                {/* 유튜브 UI 클릭 차단 */}
                <div className="absolute inset-0" />
 
                {/* 유튜브 상단 정보(채널/제목) 가리개 */}
                <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-black via-black/80 to-transparent z-10 pointer-events-none" />
 
                {/* 제목 입력 오버레이 */}
                <div className="absolute bottom-0 left-0 right-0 z-20">
                  <div className="bg-gradient-to-t from-black via-black/85 to-transparent pt-16 pb-4 px-4">
                    <label className="text-xs font-bold text-orange-300 block mb-2">
                      💡 이 영상의 제목은?
                    </label>
                    <div className="flex gap-2 items-end">
                      <textarea
                        value={titleInput}
                        onChange={(e) => setTitleInput(e.target.value.slice(0, 100))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            submitTitle();
                          }
                        }}
                        placeholder="떠오르는 제목을 입력..."
                        className="flex-1 bg-white/10 backdrop-blur text-white rounded-xl px-3 py-2.5 text-base border border-white/20 outline-none focus:outline-none focus:ring-0 resize-none placeholder:text-gray-400"
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                        rows="1"
                        maxLength="100"
                      />
                      <motion.button
                        onClick={submitTitle}
                        disabled={!titleInput.trim()}
                        whileTap={titleInput.trim() ? { scale: 0.92 } : {}}
                        className={`shrink-0 w-12 h-11 rounded-xl font-bold text-lg transition-all ${
                          titleInput.trim()
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-700/70 text-gray-500'
                        }`}
                      >
                        📤
                      </motion.button>
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1.5">
                      {titleInput.length}/100 · Enter로 전송
                    </div>
 
                    {/* 다른 영상 버튼 */}
                    <div className="flex justify-center mt-3">
                      <motion.button
                        onClick={spinSlot}
                        disabled={isSpinning}
                        whileTap={!isSpinning ? { scale: 0.95 } : {}}
                        className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${
                          isSpinning
                            ? 'bg-gray-700/80 text-gray-400'
                            : 'bg-gradient-to-r from-cyan-500 to-pink-500 text-white shadow-lg shadow-pink-500/30'
                        }`}
                      >
                        {isSpinning ? '🎬 스핀 중...' : '🎰 다른 영상'}
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          /* ── 피드 탭 ── */
          <motion.div
            key="feed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed left-0 right-0 bottom-0 bg-black"
            style={{ top: headerH }}
          >
            {submissions.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500 px-6">
                  <p className="text-lg font-semibold">아직 제목이 없어요.</p>
                  <p className="text-sm mt-2">플레이 탭에서 영상을 보고</p>
                  <p className="text-sm">제목을 만들어보세요! 🎮</p>
                </div>
              </div>
            ) : (
              <div
                ref={setFeedNode}
                className="h-full overflow-y-scroll snap-y snap-mandatory scroll-smooth"
              >
                {submissions.map((sub, idx) => (
                  <div
                    key={sub.id}
                    data-video-id={sub.id}
                    className="h-full w-full snap-start snap-always relative bg-black"
                  >
                    <div className={`absolute inset-0 overflow-hidden ${COVER_IFRAME}`}>
                      <div ref={setHostRef(sub.id, sub.youtubeId)} className="w-full h-full" />
                    </div>
 
                    {/* 탭하면 소리 토글 */}
                    <div
                      className="absolute inset-0 cursor-pointer"
                      onClick={() => setSoundOn((v) => !v)}
                    />
 
                    {/* 유튜브 상단 정보(채널/제목) 가리개 */}
                    <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-black via-black/80 to-transparent pointer-events-none" />
 
                    {/* 제목 */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/70 to-transparent pb-8 pt-16 px-4 pointer-events-none">
                      <p className="text-xl font-bold text-white mb-1 break-words pr-20 leading-snug">
                        "{sub.title}"
                      </p>
                      <p className="text-xs text-gray-500">{formatTime(sub.timestamp)}</p>
                    </div>
 
                    {/* 액션 */}
                    <div className="absolute right-3 bottom-28 flex flex-col gap-4 z-10">
                      <motion.button
                        onClick={() => toggleLike(sub.id)}
                        whileTap={{ scale: 0.9 }}
                        className="flex flex-col items-center gap-1"
                      >
                        <div className="w-12 h-12 rounded-full bg-gray-800/60 flex items-center justify-center text-2xl">
                          {likes[sub.id] ? '❤️' : '🤍'}
                        </div>
                        <span className="text-xs font-semibold text-white">{sub.likes}</span>
                      </motion.button>
 
                      <button className="flex flex-col items-center opacity-50" disabled>
                        <div className="w-12 h-12 rounded-full bg-gray-800/60 flex items-center justify-center text-2xl">
                          💬
                        </div>
                      </button>
                      <button className="flex flex-col items-center opacity-50" disabled>
                        <div className="w-12 h-12 rounded-full bg-gray-800/60 flex items-center justify-center text-2xl">
                          📤
                        </div>
                      </button>
                    </div>
 
                    <div className="absolute top-3 right-3 bg-black/60 rounded-full px-3 py-1 text-xs text-white font-semibold pointer-events-none z-10">
                      {idx + 1} / {submissions.length}
                    </div>
 
                    {!soundOn && (
                      <div className="absolute top-3 left-3 bg-black/60 rounded-full px-3 py-1 text-xs text-gray-300 pointer-events-none z-10">
                        🔇 탭하면 소리
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}