// --- DATA & STATE ---
let rawData = [];
let displayData = [];
let currentLevel = "";
let filterMode = "all"; // all, unlearned, learned, liked
let isRandom = false;
let currentModalId = null;

// Mengambil progress dari Local Storage
let userProgress = JSON.parse(localStorage.getItem("choGrammarProgress")) || {};

// --- KAMUS PENERJEMAH ISTILAH ---
function localizeTerm(text) {
  if (!text) return "";
  let result = text;

  const dict = {
    Noun: "Kata Benda",
    Verb: "Kata Kerja",
    "i-Adj": "Kata Sifat-i",
    "na-Adj": "Kata Sifat-na",
    Adj: "Kata Sifat",
    "Masu stem": "Bentuk Masu (tanpa masu)",
    Dictionary: "Bentuk Kamus",
    Kamus: "Bentuk Kamus",
    "Te-form": "Bentuk Te",
    Te: "Bentuk Te",
    Ta: "Bentuk Ta",
    Nai: "Bentuk Nai",
    Volitional: "Bentuk Maksud (Volitional)",
    Potential: "Bentuk Potensial",
    Passive: "Bentuk Pasif",
    Causative: "Bentuk Kausatif",
    Plain: "Bentuk Biasa",
    Biasa: "Bentuk Biasa",
  };

  for (const [key, value] of Object.entries(dict)) {
    result = result.split(key).join(value);
  }
  return result;
}

// --- TTS FUNCTION (Suara Jepang) ---
function playTTS(text) {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ja-JP";
    utterance.rate = 0.8;

    const voices = window.speechSynthesis.getVoices();
    const jpVoice = voices.find((voice) => voice.lang === "ja-JP");
    if (jpVoice) utterance.voice = jpVoice;

    window.speechSynthesis.speak(utterance);
  } else {
    alert("Browser Anda tidak mendukung fitur suara.");
  }
}

// --- NAVIGATION LOGIC ---
function selectLevel(level) {
  currentLevel = level;

  // Update Badge Color in Header
  const badge = document.getElementById("levelBadge");
  badge.textContent = level.toUpperCase();

  // Reset badge classes first
  badge.className = "level-badge";
  // Add specific color class
  const colors = {
    n5: "#2563eb",
    n4: "#059669",
    n3: "#0d9488",
    n2: "#ea580c",
    n1: "#e11d48",
  };
  badge.style.backgroundColor = colors[level] + "20"; // 20 hex opacity
  badge.style.color = colors[level];

  loadData(level);
}

function goBack() {
  const listView = document.getElementById("grammarListView");
  const homeView = document.getElementById("levelSelectionView");

  // FIX: Hapus inline style agar kembali mengikuti CSS class
  listView.style.display = "";
  listView.classList.remove("flex");

  homeView.classList.remove("hidden");

  // Reset filters
  filterMode = "all";
  isRandom = false;
  document.getElementById("randomToggle").checked = false;
  document.getElementById("searchInput").value = "";
  updateFilterUI();
}

async function loadData(level) {
  try {
    const response = await fetch(`data/grammar-${level}.json`);
    if (!response.ok) throw new Error("File not found");

    rawData = await response.json();

    document.getElementById("levelSelectionView").classList.add("hidden");
    const listView = document.getElementById("grammarListView");

    // FIX: Tidak perlu set style.display manual, cukup pakai class
    listView.classList.add("flex");

    applyFilters();
  } catch (error) {
    alert(
      `Data untuk level ${level.toUpperCase()} belum tersedia.\nPastikan file 'data/grammar-${level}.json' ada.`
    );
    console.error(error);
  }
}

// --- MAIN LOGIC ---
function applyFilters() {
  const keyword = document.getElementById("searchInput").value.toLowerCase();

  let filtered = rawData.filter((item) => {
    const key = `${currentLevel}-${item.id}`;
    const progress = userProgress[key] || { learned: false, liked: false };

    const matchText =
      item.grammar_point.toLowerCase().includes(keyword) ||
      item.meaning.toLowerCase().includes(keyword) ||
      item.romaji.toLowerCase().includes(keyword);
    if (!matchText) return false;

    if (filterMode === "learned") return progress.learned;
    if (filterMode === "unlearned") return !progress.learned;
    if (filterMode === "liked") return progress.liked;
    return true;
  });

  if (isRandom) {
    for (let i = filtered.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
    }
  } else {
    filtered.sort((a, b) => a.id - b.id);
  }

  displayData = filtered;
  renderGrid();
}

function renderGrid() {
  const grid = document.getElementById("grammarGrid");
  const empty = document.getElementById("emptyState");
  grid.innerHTML = "";

  if (displayData.length === 0) {
    empty.classList.add("show");
  } else {
    empty.classList.remove("show");
  }

  displayData.forEach((item) => {
    const key = `${currentLevel}-${item.id}`;
    const progress = userProgress[key] || { learned: false, liked: false };

    const card = document.createElement("div");
    let cardClasses = "grammar-card";
    if (progress.learned) cardClasses += " learned";
    card.className = cardClasses;

    const formattedId = item.id.toString().padStart(3, "0");

    card.innerHTML = `
            <div class="card-header" onclick="openModal(${item.id})">
                <div class="card-top-row">
                    <h3 class="grammar-point jp-text">${item.grammar_point}</h3>
                    <span class="grammar-id">#${formattedId}</span>
                </div>
                <p class="grammar-romaji">${item.romaji}</p>
                <p class="grammar-meaning">${item.meaning}</p>
            </div>

            <div class="card-footer">
                <label class="check-wrapper" title="Tandai Hafal">
                    <input type="checkbox" class="check-input" ${
                      progress.learned ? "checked" : ""
                    } onchange="toggleState(${item.id}, 'learned')">
                    <div class="custom-check">
                        <i data-lucide="check" style="width:18px; height:18px;"></i>
                    </div>
                </label>

                <div style="display:flex; gap: 8px; align-items:center;">
                     <button onclick="openModal(${
                       item.id
                     })" class="btn-detail">Detail</button>
                     <label class="star-label" title="Sukai">
                        <input type="checkbox" class="star-input" ${
                          progress.liked ? "checked" : ""
                        } onchange="toggleState(${item.id}, 'liked')">
                        <i data-lucide="star" class="star-icon"></i>
                    </label>
                </div>
            </div>
        `;
    grid.appendChild(card);
  });

  if (window.lucide) lucide.createIcons();
}

function toggleState(id, type) {
  const key = `${currentLevel}-${id}`;
  if (!userProgress[key]) userProgress[key] = { learned: false, liked: false };

  userProgress[key][type] = !userProgress[key][type];
  localStorage.setItem("choGrammarProgress", JSON.stringify(userProgress));

  if (filterMode !== "all") {
    applyFilters();
  } else {
    renderGrid();
  }
}

function setFilter(mode) {
  filterMode = mode;
  updateFilterUI();
  applyFilters();
}

function updateFilterUI() {
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    if (btn.dataset.filter === filterMode) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}

function toggleRandom() {
  isRandom = document.getElementById("randomToggle").checked;
  applyFilters();
}

document.getElementById("searchInput").addEventListener("input", applyFilters);

// --- MODAL LOGIC ---
function openModal(id) {
  currentModalId = id;
  const item = rawData.find((i) => i.id === id);
  const key = `${currentLevel}-${id}`;
  const progress = userProgress[key] || { learned: false, liked: false };

  // Set Data
  document.getElementById("m-id").textContent = `#${item.id
    .toString()
    .padStart(3, "0")}`;
  document.getElementById("m-level").textContent = currentLevel.toUpperCase();

  const levelColors = {
    n5: "#2563eb",
    n4: "#059669",
    n3: "#0d9488",
    n2: "#ea580c",
    n1: "#e11d48",
  };
  document.getElementById("m-level").style.backgroundColor =
    levelColors[currentLevel];

  document.getElementById("m-title").textContent = item.grammar_point;
  document.getElementById("m-romaji").textContent = item.romaji;
  document.getElementById("m-meaning").textContent = item.meaning;

  // Connection Rule
  const connEl = document.getElementById("m-connection");
  if (Array.isArray(item.connection_rule)) {
    connEl.innerHTML = item.connection_rule
      .map(
        (rule) => `
            <div class="conn-item">
                <span class="bullet">•</span>
                <span class="font-mono" style="color:#78350f">${localizeTerm(
                  rule
                )}</span>
            </div>
        `
      )
      .join("");
  } else {
    connEl.textContent = localizeTerm(item.connection_rule);
  }

  // Notes
  const notes = document.getElementById("m-notes");
  notes.innerHTML = item.usage_notes.map((n) => `<li>${n}</li>`).join("");

  // Examples
  const examples = document.getElementById("m-examples");
  examples.innerHTML = item.examples
    .map(
      (ex) => `
        <div class="example-box">
            <div style="flex:1;">
                <p class="ex-jp jp-text">${ex.japanese}</p>
                <p class="ex-furi">${ex.furigana}</p>
                <p class="ex-trans">"${ex.translation}"</p>
            </div>
            <button onclick="playTTS('${ex.japanese.replace(
              /'/g,
              "\\'"
            )}')" class="btn-audio" title="Dengarkan">
                <i data-lucide="volume-2" style="width:18px;"></i>
            </button>
        </div>
    `
    )
    .join("");

  // Conjugations
  const conjWrapper = document.getElementById("m-conjugation-wrapper");
  const conjTable = document.getElementById("m-conjugations");

  if (item.conjugations && item.conjugations.length > 0) {
    conjWrapper.classList.remove("hidden");
    conjTable.innerHTML = item.conjugations
      .map(
        (c, i) => `
            <tr class="conj-row">
                <td>${c.label}</td>
                <td class="conj-polite jp-text">${c.polite}</td>
                <td class="jp-text">${c.plain}</td>
            </tr>
        `
      )
      .join("");
  } else {
    conjWrapper.classList.add("hidden");
  }

  // Modal Checkbox State
  document.getElementById("m-check").checked = progress.learned;
  document.getElementById("m-star").checked = progress.liked;

  // Show Modal
  const overlay = document.getElementById("modalOverlay");
  overlay.classList.add("active");

  if (window.lucide) lucide.createIcons();
}

function closeModal() {
  document.getElementById("modalOverlay").classList.remove("active");
  setTimeout(renderGrid, 200);
}

function toggleFromModal(type) {
  if (currentModalId !== null) {
    toggleState(currentModalId, type);
  }
}

document.getElementById("modalOverlay").addEventListener("click", (e) => {
  if (e.target === document.getElementById("modalOverlay")) closeModal();
});

// Init
window.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) lucide.createIcons();
  updateFilterUI();
});
