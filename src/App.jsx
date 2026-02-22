import { useState, useEffect, useRef, useCallback } from "react";

const QUESTION_TYPES = {
  FREE: "free",
  FOUR: "four",
  MULTI: "multi",
};

function typeLabel(type) {
  if (type === QUESTION_TYPES.FOUR) return "4択";
  if (type === QUESTION_TYPES.MULTI) return "多肢選択";
  return "自由記入";
}

function normalizeCard(card) {
  if (card.questionType) return card;
  return {
    ...card,
    questionType: QUESTION_TYPES.FREE,
    answerText: card.answer || "",
    choices: [],
    correctChoiceIndex: null,
  };
}

function answerPreview(card) {
  if (card.questionType === QUESTION_TYPES.FREE) return card.answerText || card.answer || "";
  const idx = card.correctChoiceIndex ?? -1;
  return card.choices?.[idx] || "";
}

function sm2(card, quality) {
  let { repetitions = 0, easeFactor = 2.5, interval = 1 } = card;
  const ef = Math.max(1.3, easeFactor + 0.1 - (3 - quality) * (0.08 + (3 - quality) * 0.02));
  let newInterval;
  let newReps;
  if (quality < 1) {
    newReps = 0;
    newInterval = 1;
  } else {
    newReps = repetitions + 1;
    if (newReps === 1) newInterval = 1;
    else if (newReps === 2) newInterval = 3;
    else newInterval = Math.round(interval * ef);
  }
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + newInterval);
  return { repetitions: newReps, easeFactor: ef, interval: newInterval, nextReview: nextReview.toISOString() };
}

function isDueToday(card) {
  if (!card.nextReview) return true;
  return new Date(card.nextReview) <= new Date();
}

function loadCards() {
  try {
    const data = localStorage.getItem("memocurve-v1");
    const parsed = data ? JSON.parse(data) : [];
    return parsed.map(normalizeCard);
  } catch {
    return [];
  }
}

function saveCards(cards) {
  try {
    localStorage.setItem("memocurve-v1", JSON.stringify(cards));
  } catch (e) {
    console.error(e);
  }
}

const Icon = ({ d, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const icons = {
  plus: "M12 5v14M5 12h14",
  study: "M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11",
  list: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  trash: "M3 6h18M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2",
  img: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
  close: "M18 6L6 18M6 6l12 12",
};

export default function App() {
  const [cards, setCards] = useState([]);
  const [view, setView] = useState("study");
  const [selected, setSelected] = useState(new Set());
  const [toast, setToast] = useState(null);

  useEffect(() => {
    setCards(loadCards());
  }, []);

  const persist = useCallback((updated) => {
    setCards(updated);
    saveCards(updated);
  }, []);

  const showToast = (msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const addCard = (card) => {
    const newCard = {
      id: Date.now().toString(),
      ...card,
      repetitions: 0,
      easeFactor: 2.5,
      interval: 1,
      nextReview: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    persist([...cards, newCard]);
    showToast("カードを追加しました");
    setView("study");
  };

  const reviewCard = (id, quality) => {
    persist(cards.map((c) => (c.id === id ? { ...c, ...sm2(c, quality) } : c)));
  };

  const deleteCard = (id) => {
    persist(cards.filter((c) => c.id !== id));
    showToast("削除しました", "warn");
  };

  const deleteSelected = () => {
    if (selected.size === 0) return;
    persist(cards.filter((c) => !selected.has(c.id)));
    setSelected(new Set());
    showToast(`${selected.size}件削除しました`, "warn");
  };

  const deleteAll = () => {
    persist([]);
    setSelected(new Set());
    showToast("全て削除しました", "warn");
  };

  const dueCards = cards.filter(isDueToday);

  return (
    <div style={S.root}>
      <style>{css}</style>
      <header style={S.header}>
        <div style={S.logo}>
          <span style={S.logoIcon}>曲</span>
          <div>
            <div style={S.logoTitle}>MemoCurve</div>
            <div style={S.logoSub}>忘却曲線暗記アプリ</div>
          </div>
        </div>
        <div style={S.badge}>
          {dueCards.length > 0 && <span style={S.dueBadge}>{dueCards.length}問 今日</span>}
          <span style={S.totalBadge}>{cards.length}枚</span>
        </div>
      </header>

      <nav style={S.nav}>
        {[
          { id: "study", label: "今日の問題", icon: icons.study },
          { id: "add", label: "追加", icon: icons.plus },
          { id: "manage", label: "管理", icon: icons.list },
        ].map(({ id, label, icon }) => (
          <button key={id} style={{ ...S.navBtn, ...(view === id || (view === "quiz" && id === "study") ? S.navBtnActive : {}) }} onClick={() => setView(id)}>
            <Icon d={icon} size={16} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <main style={S.main}>
        {view === "study" && <StudyView cards={cards} dueCards={dueCards} onStudy={() => setView("quiz")} />}
        {view === "quiz" && <QuizView dueCards={dueCards} onRate={reviewCard} onDone={() => setView("study")} />}
        {view === "add" && <AddView onAdd={addCard} onCancel={() => setView("study")} />}
        {view === "manage" && <ManageView cards={cards} selected={selected} setSelected={setSelected} onDelete={deleteCard} onDeleteSelected={deleteSelected} onDeleteAll={deleteAll} />}
      </main>

      {toast && <div style={{ ...S.toast, ...(toast.type === "warn" ? S.toastWarn : S.toastOk) }} className="toast-in">{toast.msg}</div>}
    </div>
  );
}

function StudyView({ cards, dueCards, onStudy }) {
  const upcoming = cards.filter((c) => !isDueToday(c)).sort((a, b) => new Date(a.nextReview) - new Date(b.nextReview)).slice(0, 5);

  return (
    <div style={S.studyWrap}>
      <div style={S.heroCard}>
        <div style={S.heroNum}>{dueCards.length}</div>
        <div style={S.heroLabel}>今日解くべき問題</div>
        {dueCards.length > 0 ? <button style={S.startBtn} onClick={onStudy} className="pulse-btn">学習を始める →</button> : <div style={S.doneMsg}>🎉 今日の問題は全て完了！</div>}
      </div>

      <div style={S.statsRow}>
        {[
          { num: cards.length, label: "総カード数" },
          { num: cards.filter((c) => c.repetitions > 0).length, label: "学習済み" },
          { num: cards.filter((c) => c.interval > 7).length, label: "定着済み" },
        ].map(({ num, label }) => (
          <div key={label} style={S.statBox}>
            <div style={S.statNum}>{num}</div>
            <div style={S.statLabel}>{label}</div>
          </div>
        ))}
      </div>

      {upcoming.length > 0 && (
        <div style={S.section}>
          <div style={S.sectionTitle}>次の復習予定</div>
          {upcoming.map((c) => {
            const days = Math.ceil((new Date(c.nextReview) - new Date()) / 86400000);
            return (
              <div key={c.id} style={S.upcomingRow}>
                <div style={S.upcomingThumb}>{c.questionImage ? <img src={c.questionImage} style={S.thumbImg} alt="" /> : <Icon d={icons.img} size={14} />}</div>
                <div style={S.upcomingTitle}>{answerPreview(c).slice(0, 30)}{answerPreview(c).length > 30 ? "..." : ""}</div>
                <div style={S.upcomingDay}>{days}日後</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function QuizView({ dueCards, onRate, onDone }) {
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [freeInput, setFreeInput] = useState("");
  const card = dueCards[idx];

  if (!card) {
    return <div style={{ textAlign: "center", padding: "60px 20px" }}><div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div><div style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", marginBottom: 8 }}>全問完了！</div><div style={{ fontSize: 14, color: "#64748b", marginBottom: 24 }}>お疲れ様でした</div><button style={S.startBtn} onClick={onDone}>トップに戻る</button></div>;
  }

  const handleRate = (q) => {
    onRate(card.id, q);
    setRevealed(false);
    setSelectedChoice(null);
    setFreeInput("");
    if (idx + 1 >= dueCards.length) onDone();
    else setIdx(idx + 1);
  };

  const nextIntervals = [1, 1, Math.round((card.interval || 1) * (card.easeFactor || 2.5)), Math.round((card.interval || 1) * (card.easeFactor || 2.5) * 1.3)];
  const isChoiceType = card.questionType !== QUESTION_TYPES.FREE;
  const canReveal = isChoiceType ? selectedChoice !== null : freeInput.trim().length > 0;

  return (
    <div style={S.quizWrap}>
      <div style={S.progressBar}><div style={{ ...S.progressFill, width: `${(idx / dueCards.length) * 100}%` }} /></div>
      <div style={S.progressLabel}>{idx + 1} / {dueCards.length}</div>
      <div style={S.quizCard} className="card-appear">
        <div style={S.quizSection}>
          <div style={S.quizSectionLabel}>問題（{typeLabel(card.questionType)}）</div>
          {card.questionImage ? <img src={card.questionImage} style={S.quizImg} alt="question" /> : <div style={S.noImg}>📷 画像なし</div>}
          {card.questionText && <div style={S.quizText}>{card.questionText}</div>}

          {isChoiceType ? (
            <div style={S.choicesWrap}>
              {card.choices.map((choice, i) => (
                <button key={`${choice}-${i}`} style={{ ...S.choiceBtn, ...(selectedChoice === i ? S.choiceBtnActive : {}) }} onClick={() => setSelectedChoice(i)}>
                  {choice}
                </button>
              ))}
            </div>
          ) : (
            <textarea style={{ ...S.textarea, marginTop: 12 }} value={freeInput} onChange={(e) => setFreeInput(e.target.value)} rows={3} placeholder="回答を入力..." />
          )}
        </div>

        {!revealed ? (
          <button style={{ ...S.revealBtn, ...(!canReveal ? S.submitDisabled : {}) }} disabled={!canReveal} onClick={() => setRevealed(true)} className="reveal-btn">答えを見る</button>
        ) : (
          <div className="answer-reveal">
            {isChoiceType && (
              <div style={{ ...S.resultChip, ...(selectedChoice === card.correctChoiceIndex ? S.resultChipOk : S.resultChipNg) }}>
                {selectedChoice === card.correctChoiceIndex ? "正解！" : "不正解"}
              </div>
            )}
            <div style={S.answerBox}>
              <div style={S.answerLabel}>答え</div>
              <div style={S.answerText}>{answerPreview(card)}</div>
              {!isChoiceType && <div style={S.userInputNote}>あなたの入力: {freeInput.trim()}</div>}
            </div>
            <div style={S.rateLabel}>理解度を評価してください</div>
            <div style={S.rateRow}>
              {[{ q: 0, label: "全然", color: "#ef4444" }, { q: 1, label: "難しい", color: "#f97316" }, { q: 2, label: "普通", color: "#eab308" }, { q: 3, label: "簡単", color: "#22c55e" }].map(({ q, label, color }) => (
                <button key={q} style={{ ...S.rateBtn, borderColor: color }} className="rate-btn" onClick={() => handleRate(q)}>
                  <span style={{ ...S.rateBtnLabel, color }}>{label}</span>
                  <span style={S.rateBtnSub}>{nextIntervals[q]}日後</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AddView({ onAdd, onCancel }) {
  const [image, setImage] = useState(null);
  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState(QUESTION_TYPES.FREE);
  const [answerText, setAnswerText] = useState("");
  const [choices, setChoices] = useState(["", "", "", ""]);
  const [correctChoiceIndex, setCorrectChoiceIndex] = useState(0);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef();

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => setImage(e.target.result);
    reader.readAsDataURL(file);
  };

  const isChoiceType = questionType !== QUESTION_TYPES.FREE;
  const normalizedChoices = choices.map((c) => c.trim()).filter(Boolean);
  const canSubmit = isChoiceType ? normalizedChoices.length >= 2 && normalizedChoices[correctChoiceIndex] : !!answerText.trim();

  const setChoiceCount = (count) => {
    setChoices((prev) => {
      const next = [...prev];
      if (count > next.length) while (next.length < count) next.push("");
      return next.slice(0, count);
    });
    setCorrectChoiceIndex((prev) => Math.min(prev, count - 1));
  };

  return (
    <div style={S.addWrap}>
      <div style={S.addTitle}>新しいカードを追加</div>

      <div style={S.field}>
        <label style={S.label}>出題形式</label>
        <div style={S.typeRow}>
          {[
            { id: QUESTION_TYPES.FREE, label: "自由記入" },
            { id: QUESTION_TYPES.FOUR, label: "4択" },
            { id: QUESTION_TYPES.MULTI, label: "多肢選択" },
          ].map((item) => (
            <button key={item.id} style={{ ...S.typeBtn, ...(questionType === item.id ? S.typeBtnActive : {}) }} onClick={() => {
              setQuestionType(item.id);
              if (item.id === QUESTION_TYPES.FOUR) setChoiceCount(4);
              if (item.id === QUESTION_TYPES.MULTI && choices.length < 2) setChoiceCount(4);
            }}>{item.label}</button>
          ))}
        </div>
      </div>

      <div style={{ ...S.dropZone, ...(drag ? S.dropZoneActive : {}), ...(image ? S.dropZoneHasImg : {}) }} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }} onClick={() => fileRef.current?.click()}>
        {image ? (
          <div style={S.previewWrap}>
            <img src={image} style={S.previewImg} alt="preview" />
            <button style={S.removeImgBtn} onClick={(e) => { e.stopPropagation(); setImage(null); }}><Icon d={icons.close} size={14} /></button>
          </div>
        ) : (
          <div style={S.dropContent}><div style={{ fontSize: 40 }}>📸</div><div style={S.dropText}>スクリーンショットをドロップ</div><div style={S.dropSub}>またはクリックしてファイルを選択</div></div>
        )}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files[0])} />
      </div>

      <div style={S.field}><label style={S.label}>問題文（任意）</label><input style={S.input} value={questionText} onChange={(e) => setQuestionText(e.target.value)} placeholder="問題文や補足説明..." /></div>

      {isChoiceType ? (
        <div style={S.field}>
          <label style={S.label}>選択肢（正解を1つ選択）</label>
          {questionType === QUESTION_TYPES.MULTI && (
            <div style={S.choiceCountRow}>
              <button style={S.countBtn} onClick={() => setChoiceCount(Math.max(2, choices.length - 1))}>-</button>
              <span style={S.metaText}>{choices.length}択</span>
              <button style={S.countBtn} onClick={() => setChoiceCount(Math.min(8, choices.length + 1))}>+</button>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {choices.map((choice, i) => (
              <div key={i} style={S.choiceInputRow}>
                <input type="radio" checked={correctChoiceIndex === i} onChange={() => setCorrectChoiceIndex(i)} style={{ accentColor: "#f59e0b" }} />
                <input style={{ ...S.input, margin: 0 }} value={choice} onChange={(e) => setChoices((prev) => prev.map((v, idx) => idx === i ? e.target.value : v))} placeholder={`選択肢 ${i + 1}`} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={S.field}><label style={S.label}>答え <span style={{ color: "#ef4444" }}>*</span></label><textarea style={S.textarea} value={answerText} onChange={(e) => setAnswerText(e.target.value)} placeholder="答えを入力してください..." rows={4} /></div>
      )}

      <div style={S.addActions}>
        <button style={S.cancelBtn} onClick={onCancel}>キャンセル</button>
        <button style={{ ...S.submitBtn, ...(!canSubmit ? S.submitDisabled : {}) }} onClick={() => canSubmit && onAdd({ questionImage: image, questionText, questionType, answerText: answerText.trim(), choices: choices.map((c) => c.trim()), correctChoiceIndex })} disabled={!canSubmit}>カードを追加する</button>
      </div>
    </div>
  );
}

function ManageView({ cards, selected, setSelected, onDelete, onDeleteSelected, onDeleteAll }) {
  const [confirm, setConfirm] = useState(null);
  const [search, setSearch] = useState("");
  const filtered = cards.filter((c) => answerPreview(c).toLowerCase().includes(search.toLowerCase()) || (c.questionText || "").toLowerCase().includes(search.toLowerCase()));
  const toggleSelect = (id) => {
    const n = new Set(selected);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelected(n);
  };

  return (
    <div style={S.manageWrap}>
      <div style={S.manageHeader}>
        <input style={{ ...S.input, flex: 1, margin: 0 }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 検索..." />
        <div style={{ display: "flex", gap: 6 }}>
          {selected.size > 0 && <button style={S.dangerBtn} onClick={() => setConfirm("selected")}><Icon d={icons.trash} size={13} /> ({selected.size})</button>}
          {cards.length > 0 && <button style={S.dangerBtnGhost} onClick={() => setConfirm("all")}>全削除</button>}
        </div>
      </div>

      {filtered.length > 0 && <div style={S.selectAllRow}><label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}><input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={() => selected.size === filtered.length ? setSelected(new Set()) : setSelected(new Set(filtered.map((c) => c.id)))} style={{ accentColor: "#f59e0b" }} /><span style={{ fontSize: 12, color: "#94a3b8" }}>全て選択</span></label><span style={{ fontSize: 12, color: "#64748b" }}>{filtered.length}枚</span></div>}

      {filtered.length === 0 ? <div style={{ textAlign: "center", color: "#475569", padding: "48px 0", fontSize: 14 }}>{search ? "検索結果なし" : "カードがありません"}</div> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((c) => {
            const due = isDueToday(c);
            const days = c.nextReview ? Math.ceil((new Date(c.nextReview) - new Date()) / 86400000) : 0;
            return (
              <div key={c.id} style={{ ...S.cardItem, ...(selected.has(c.id) ? S.cardItemSelected : {}) }} className="card-item">
                <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} style={{ accentColor: "#f59e0b", flexShrink: 0 }} />
                <div style={S.cardItemThumb}>{c.questionImage ? <img src={c.questionImage} style={S.thumbImgMd} alt="" /> : <div style={S.noThumb}><Icon d={icons.img} size={16} /></div>}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={S.cardItemAnswer}>{answerPreview(c).slice(0, 40)}{answerPreview(c).length > 40 ? "..." : ""}</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4, flexWrap: "wrap" }}>
                    <span style={S.typeBadge}>{typeLabel(c.questionType)}</span>
                    <span style={{ ...S.metaChip, ...(due ? S.metaChipDue : S.metaChipOk) }}>{due ? "今日" : `${days}日後`}</span>
                    <span style={S.metaText}>間隔: {c.interval}日</span>
                  </div>
                </div>
                <button style={S.itemDeleteBtn} className="item-del" onClick={() => onDelete(c.id)}><Icon d={icons.trash} size={14} /></button>
              </div>
            );
          })}
        </div>
      )}

      {confirm && <div style={S.overlay}><div style={S.dialog} className="card-appear"><div style={S.dialogTitle}>{confirm === "all" ? "全てのカードを削除しますか？" : `${selected.size}件を削除しますか？`}</div><div style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>この操作は取り消せません</div><div style={{ display: "flex", gap: 10 }}><button style={S.cancelBtn} onClick={() => setConfirm(null)}>キャンセル</button><button style={S.confirmDeleteBtn} onClick={() => { if (confirm === "all") onDeleteAll(); else onDeleteSelected(); setConfirm(null); }}>削除する</button></div></div></div>}
    </div>
  );
}

const S = {
  root: { minHeight: "100dvh", background: "#0b0f1a", color: "#e2e8f0", fontFamily: "'Noto Sans JP', 'Hiragino Sans', sans-serif", display: "flex", flexDirection: "column", maxWidth: 480, margin: "0 auto", position: "relative" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "env(safe-area-inset-top, 20px) 20px 12px", paddingTop: "max(env(safe-area-inset-top), 20px)", borderBottom: "1px solid #1e293b" },
  logo: { display: "flex", alignItems: "center", gap: 12 },
  logoIcon: { fontSize: 28, background: "linear-gradient(135deg, #f59e0b, #ef4444)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: 900 },
  logoTitle: { fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: "#f1f5f9" },
  logoSub: { fontSize: 10, color: "#64748b", letterSpacing: "0.05em" },
  badge: { display: "flex", gap: 6 },
  dueBadge: { background: "#ef4444", color: "#fff", padding: "3px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600 },
  totalBadge: { background: "#1e293b", color: "#94a3b8", padding: "3px 10px", borderRadius: 99, fontSize: 12 },
  nav: { display: "flex", background: "#0f172a", borderBottom: "1px solid #1e293b" },
  navBtn: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "10px 4px", background: "none", border: "none", borderBottom: "2px solid transparent", color: "#475569", fontSize: 11, cursor: "pointer", transition: "all 0.2s" },
  navBtnActive: { color: "#f59e0b", borderBottomColor: "#f59e0b" },
  main: { flex: 1, overflowY: "auto", paddingBottom: "env(safe-area-inset-bottom, 0px)" },
  studyWrap: { padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 },
  heroCard: { background: "linear-gradient(135deg, #1e1a0a, #1a1400)", border: "1px solid #3d2f00", borderRadius: 16, padding: "32px 24px", textAlign: "center" },
  heroNum: { fontSize: 72, fontWeight: 900, color: "#f59e0b", lineHeight: 1, textShadow: "0 0 40px rgba(245,158,11,0.4)" },
  heroLabel: { fontSize: 14, color: "#92400e", marginTop: 4, marginBottom: 20 },
  startBtn: { background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#0b0f1a", border: "none", padding: "12px 28px", borderRadius: 99, fontSize: 15, fontWeight: 700, cursor: "pointer" },
  doneMsg: { fontSize: 16, color: "#a3e635", fontWeight: 600 },
  statsRow: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 },
  statBox: { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: "14px 10px", textAlign: "center" },
  statNum: { fontSize: 28, fontWeight: 800, color: "#e2e8f0" },
  statLabel: { fontSize: 11, color: "#475569", marginTop: 2 },
  section: { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 16 },
  sectionTitle: { fontSize: 12, color: "#f59e0b", fontWeight: 600, letterSpacing: "0.08em", marginBottom: 12, textTransform: "uppercase" },
  upcomingRow: { display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #1e293b" },
  upcomingThumb: { width: 36, height: 36, borderRadius: 8, background: "#1e293b", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#475569" },
  thumbImg: { width: "100%", height: "100%", objectFit: "cover" },
  upcomingTitle: { flex: 1, fontSize: 13, color: "#94a3b8" },
  upcomingDay: { fontSize: 12, color: "#64748b", background: "#1e293b", padding: "2px 8px", borderRadius: 99 },
  quizWrap: { padding: 16 },
  progressBar: { height: 4, background: "#1e293b", borderRadius: 99, overflow: "hidden", marginBottom: 8 },
  progressFill: { height: "100%", background: "linear-gradient(90deg, #f59e0b, #ef4444)", borderRadius: 99, transition: "width 0.4s ease" },
  progressLabel: { fontSize: 12, color: "#64748b", textAlign: "right", marginBottom: 16 },
  quizCard: { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, overflow: "hidden" },
  quizSection: { padding: 20, borderBottom: "1px solid #1e293b" },
  quizSectionLabel: { fontSize: 11, color: "#f59e0b", fontWeight: 600, letterSpacing: "0.08em", marginBottom: 12, textTransform: "uppercase" },
  quizImg: { width: "100%", borderRadius: 10, maxHeight: 300, objectFit: "contain", background: "#1e293b" },
  quizText: { marginTop: 12, fontSize: 15, color: "#cbd5e1", lineHeight: 1.6 },
  noImg: { color: "#475569", fontSize: 14, textAlign: "center", padding: "20px 0" },
  choicesWrap: { marginTop: 12, display: "flex", flexDirection: "column", gap: 8 },
  choiceBtn: { textAlign: "left", background: "#0b1220", border: "1px solid #334155", borderRadius: 10, color: "#cbd5e1", padding: "10px 12px", cursor: "pointer" },
  choiceBtnActive: { borderColor: "#f59e0b", background: "#211700", color: "#fcd34d" },
  revealBtn: { display: "block", width: "calc(100% - 40px)", margin: "20px auto", background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", padding: 14, borderRadius: 10, fontSize: 15, cursor: "pointer" },
  answerBox: { margin: "20px 20px 0", background: "#0a1628", border: "1px solid #1e3a5f", borderRadius: 12, padding: 16 },
  answerLabel: { fontSize: 11, color: "#60a5fa", fontWeight: 600, letterSpacing: "0.08em", marginBottom: 8, textTransform: "uppercase" },
  answerText: { fontSize: 16, color: "#e2e8f0", lineHeight: 1.7, whiteSpace: "pre-wrap" },
  userInputNote: { marginTop: 8, color: "#94a3b8", fontSize: 13 },
  resultChip: { margin: "14px 20px 0", borderRadius: 8, padding: "8px 12px", fontSize: 13, fontWeight: 700, textAlign: "center" },
  resultChipOk: { background: "#14532d", color: "#86efac" },
  resultChipNg: { background: "#7f1d1d", color: "#fca5a5" },
  rateLabel: { padding: "16px 20px 8px", fontSize: 12, color: "#64748b", textAlign: "center" },
  rateRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "0 20px 20px" },
  rateBtn: { border: "1px solid", background: "#0b1220", borderRadius: 10, padding: "10px 8px", cursor: "pointer", display: "flex", flexDirection: "column", gap: 4, alignItems: "center" },
  rateBtnLabel: { fontSize: 13, fontWeight: 700 },
  rateBtnSub: { fontSize: 11, color: "#64748b" },
  addWrap: { padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 },
  addTitle: { fontSize: 18, fontWeight: 700, color: "#f1f5f9" },
  typeRow: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 },
  typeBtn: { background: "#0f172a", border: "1px solid #1e293b", color: "#94a3b8", borderRadius: 8, padding: "10px 8px", cursor: "pointer" },
  typeBtnActive: { borderColor: "#f59e0b", color: "#fcd34d", background: "#201505" },
  dropZone: { border: "2px dashed #1e293b", borderRadius: 14, padding: 24, textAlign: "center", cursor: "pointer", transition: "all 0.2s", minHeight: 140, display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a" },
  dropZoneActive: { borderColor: "#f59e0b", background: "#1a1200" },
  dropZoneHasImg: { border: "2px solid #1e293b", padding: 8 },
  dropContent: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6 },
  dropText: { fontSize: 14, color: "#94a3b8", fontWeight: 600 },
  dropSub: { fontSize: 12, color: "#475569" },
  previewWrap: { position: "relative", width: "100%" },
  previewImg: { width: "100%", maxHeight: 220, objectFit: "contain", borderRadius: 10, display: "block" },
  removeImgBtn: { position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.7)", border: "none", color: "#fff", width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 12, color: "#94a3b8", fontWeight: 600 },
  input: { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "10px 12px", color: "#e2e8f0", fontSize: 14, outline: "none", fontFamily: "inherit" },
  textarea: { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "10px 12px", color: "#e2e8f0", fontSize: 14, outline: "none", resize: "vertical", fontFamily: "inherit" },
  choiceCountRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 8 },
  countBtn: { width: 28, height: 28, borderRadius: 6, border: "1px solid #334155", background: "#0f172a", color: "#cbd5e1", cursor: "pointer" },
  choiceInputRow: { display: "flex", alignItems: "center", gap: 8 },
  addActions: { display: "flex", gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, background: "#1e293b", border: "none", color: "#94a3b8", padding: "12px 0", borderRadius: 10, fontSize: 14, cursor: "pointer" },
  submitBtn: { flex: 2, background: "linear-gradient(135deg, #f59e0b, #d97706)", border: "none", color: "#0b0f1a", padding: "12px 0", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" },
  submitDisabled: { opacity: 0.4, cursor: "not-allowed" },
  manageWrap: { padding: 16 },
  manageHeader: { display: "flex", gap: 8, marginBottom: 12, alignItems: "center" },
  selectAllRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 4px", marginBottom: 6 },
  cardItem: { display: "flex", alignItems: "center", gap: 10, background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: "10px 10px 10px 14px", transition: "all 0.2s" },
  cardItemSelected: { borderColor: "#f59e0b", background: "#1a1200" },
  cardItemThumb: { width: 48, height: 48, borderRadius: 8, overflow: "hidden", flexShrink: 0 },
  thumbImgMd: { width: "100%", height: "100%", objectFit: "cover" },
  noThumb: { width: "100%", height: "100%", background: "#1e293b", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569" },
  cardItemAnswer: { fontSize: 14, color: "#e2e8f0", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  typeBadge: { fontSize: 10, color: "#fcd34d", border: "1px solid #92400e", background: "#2b1807", borderRadius: 99, padding: "1px 6px" },
  metaChip: { fontSize: 11, padding: "1px 7px", borderRadius: 99, fontWeight: 600 },
  metaChipDue: { background: "#7f1d1d", color: "#fca5a5" },
  metaChipOk: { background: "#14532d", color: "#86efac" },
  metaText: { fontSize: 11, color: "#475569" },
  itemDeleteBtn: { background: "none", border: "none", color: "#475569", cursor: "pointer", padding: 6, borderRadius: 6, flexShrink: 0 },
  dangerBtn: { background: "#7f1d1d", border: "none", color: "#fca5a5", padding: "8px 10px", borderRadius: 8, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" },
  dangerBtnGhost: { background: "none", border: "1px solid #7f1d1d", color: "#f87171", padding: "8px 10px", borderRadius: 8, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(4px)" },
  dialog: { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, padding: 24, margin: 20, maxWidth: 320, width: "100%" },
  dialogTitle: { fontSize: 16, fontWeight: 700, color: "#f1f5f9", marginBottom: 8 },
  confirmDeleteBtn: { flex: 1, background: "#dc2626", border: "none", color: "#fff", padding: "12px 0", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" },
  toast: { position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)", padding: "10px 20px", borderRadius: 99, fontSize: 13, fontWeight: 600, zIndex: 200, whiteSpace: "nowrap" },
  toastOk: { background: "#14532d", color: "#86efac", border: "1px solid #166534" },
  toastWarn: { background: "#7f1d1d", color: "#fca5a5", border: "1px solid #991b1b" },
};

const css = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;600;700;900&display=swap');
* { box-sizing: border-box; }
html, body { margin: 0; background: #0b0f1a; }
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 99px; }
@keyframes fadeInUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
@keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
@keyframes pulse { 0%,100% { box-shadow: 0 4px 20px rgba(245,158,11,0.3); } 50% { box-shadow: 0 4px 36px rgba(245,158,11,0.6); } }
.card-appear { animation: fadeInUp 0.3s ease both; }
.toast-in { animation: toastIn 0.3s ease both; }
.pulse-btn { animation: pulse 2s infinite; }
.answer-reveal { animation: fadeInUp 0.25s ease both; }
.reveal-btn:hover { background: #1e293b !important; color: #e2e8f0 !important; }
.rate-btn:hover { transform: translateY(-2px); filter: brightness(1.15); }
.item-del:hover { color: #ef4444 !important; }
.card-item:hover { border-color: #334155 !important; }
`;
