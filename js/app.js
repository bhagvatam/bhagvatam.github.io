// Global variables
let chapters = [];
let verses = [];
let timelineData = null;
let translations = {}; // {chapterNumber: [translations]}
let currentChapter = null;
let currentVerse = null;
let currentLang = 'english'; // 'english', 'hindi', or 'gujarati' - for verse translations
let startX = 0;
let endX = 0;
let previousScreen = null; // Track where user came from

// DOM elements
const chaptersScreen = document.getElementById('chapters-screen');
const versesScreen = document.getElementById('verses-screen');
const verseDetailScreen = document.getElementById('verse-detail-screen');
const settingsScreen = document.getElementById('settings-screen');
const bookmarksScreen = document.getElementById('bookmarks-screen');
const chaptersList = document.getElementById('chapters-list');
const versesList = document.getElementById('verses-list');
const chapterTitle = document.getElementById('chapter-title');
const backBtn = document.getElementById('back-btn');
const mainFloatingBtn = document.getElementById('main-floating-btn');
const floatingMenu = document.getElementById('floating-menu');
const bookmarkBtn = document.getElementById('header-bookmark-btn');
const timelineBtn = document.getElementById('header-timeline-btn');
const timelineScreen = document.getElementById('timeline-screen');
const headerTitle = document.getElementById('header-title');

// Initialize app
async function init() {
    try {
        // Load data from assets folder
        chapters = await fetch('./assets/chapters.json').then(r => r.json());
        verses = await fetch('./assets/verse.json').then(r => r.json());
        try {
            timelineData = await fetch('./assets/timeline.json').then(r => r.json());
        } catch (e) {
            console.warn('Timeline data not available:', e);
        }

        // Initialize translations cache
        translations = {};

        // Load saved translation language preference
        const savedTranslationLang = localStorage.getItem('translationLanguage');
        if (savedTranslationLang) {
            currentLang = savedTranslationLang;
        }

        // Initialize settings
        initSettings();

        // Setup chapter controls (view mode and language selector)
        setupChapterControls();

        // Initialize floating menu
        initFloatingMenu();

        // Render chapters
        renderChapters();
        checkAndShowBookmarkResume();

        // Setup navigation
        setupNavigation();
        setupSwipeGestures();
        setupTimelineButton();
    } catch (error) {
        console.error('Error loading data:', error);
        document.getElementById('main-content').innerHTML = '<div class="glass-card" style="text-align:center; padding:30px;"><p>Error loading scriptures data. Please refresh or try again.</p></div>';
    }
}

// Render chapters list
function renderChapters() {
    chaptersList.innerHTML = '';
    chapters.forEach(chapter => {
        const card = document.createElement('div');
        card.className = 'chapter-card';
        card.innerHTML = `
            <div class="chapter-header">
                <span class="chapter-number">${chapter.chapter_number}</span>
                <div class="chapter-info">
                    <h3>${chapter.name}</h3>
                    <div class="chapter-meaning">(${chapter.name_meaning})</div>
                </div>
                <div class="chapter-stats">
                    <span class="verse-count">${chapter.verses_count} Verses</span>
                </div>
            </div>
            <p>${chapter.chapter_summary.substring(0, 160)}...</p>
        `;
        card.addEventListener('click', () => showChapter(chapter));
        chaptersList.appendChild(card);
    });
}

// Show chapter verses
function showChapter(chapter, viewModeOverride = null) {
    currentChapter = chapter;
    chapterTitle.innerHTML = `
        <div class="chapter-title-name">${chapter.name}</div>
        <div class="chapter-title-meaning">(${chapter.name_meaning})</div>
    `;

    const viewMode = viewModeOverride || localStorage.getItem('defaultChapterView') || 'list';
    updateChapterToggles(viewMode);

    const chapterVerses = verses.filter(v => v.chapter_number === chapter.chapter_number).sort((a, b) => a.verse_number - b.verse_number);
    versesList.innerHTML = '';

    const summaryCard = document.getElementById('chapter-summary-card');
    const summaryText = document.getElementById('chapter-summary-text');

    if (chapterVerses.length === 0) {
        if (summaryCard) summaryCard.style.display = 'none';
        // Render unseeded chapters with a summary view
        const item = document.createElement('div');
        item.className = 'glass-card';
        item.style.padding = '35px 25px';
        item.style.lineHeight = '1.7';
        item.innerHTML = `
            <div class="sloka-number-pill" style="margin-bottom: 20px;">Chapter Summary</div>
            <p style="margin-bottom: 20px; font-size: 1.05rem; color: var(--color-text-main); font-weight: 500; text-align: justify;">
                ${chapter.chapter_summary}
            </p>
            <p style="font-size: 1rem; color: var(--color-text-muted); text-align: justify;">
                ${chapter.chapter_summary_hindi}
            </p>
        `;
        versesList.appendChild(item);
    } else {
        if (summaryCard && summaryText && chapter.chapter_summary) {
            let shortSummary = chapter.chapter_summary;
            if (shortSummary.length > 220) {
                shortSummary = shortSummary.substring(0, 210) + '...';
                summaryText.innerHTML = `${shortSummary} <span class="read-more-toggle" style="color: var(--color-electric-blue); font-weight: 600; cursor: pointer; margin-left: 5px;">Read More</span>`;
                
                const toggle = summaryText.querySelector('.read-more-toggle');
                if (toggle) {
                    toggle.onclick = (e) => {
                        e.stopPropagation();
                        summaryText.innerHTML = `${chapter.chapter_summary} <span class="read-less-toggle" style="color: var(--color-electric-blue); font-weight: 600; cursor: pointer; margin-left: 5px;">Read Less</span>`;
                        const lessToggle = summaryText.querySelector('.read-less-toggle');
                        if (lessToggle) {
                            lessToggle.onclick = (ev) => {
                                ev.stopPropagation();
                                showChapter(chapter, viewMode); // Reset
                            };
                        }
                    };
                }
            } else {
                summaryText.textContent = shortSummary;
            }
            summaryCard.style.display = 'block';
        } else if (summaryCard) {
            summaryCard.style.display = 'none';
        }

        if (viewMode === 'scroll') {
            renderScrollMode(chapter, chapterVerses);
        } else {
            chapterVerses.forEach(verse => {
                const item = document.createElement('div');
                item.className = 'verse-item';
                const cleanedText = verse.text.replace(/\n\s*([०-९0-9\s\-–]+)॥/g, ' $1॥').replace(/\n/g, '<br>');
                item.innerHTML = `
                    <span class="verse-number">${verse.verse_number}</span>
                    <div class="verse-text">${cleanedText}</div>
                `;
                item.addEventListener('click', () => showVerse(verse));
                versesList.appendChild(item);
            });
        }
    }

    switchScreen(versesScreen);
    backBtn.style.display = 'block';

    // Scroll to top of verses list
    setTimeout(() => {
        const main = document.querySelector('main');
        if (main) {
            main.scrollTop = 0;
        }
    }, 0);
}

// Update verse content based on current language
function updateVerseContent() {
    if (!currentVerse) return;

    const verseTranslation = document.getElementById('verse-translation');

    // Find translation for current verse from the appropriate chapter
    const chapterTranslations = translations[currentVerse.chapter_number] || [];
    const translation = chapterTranslations.find(t => t.verse_id === currentVerse.id);

    if (translation && translation.languages && translation.languages[currentLang]) {
        verseTranslation.innerHTML = translation.languages[currentLang].description;
    } else {
        verseTranslation.innerHTML = 'Translation not available locally.';
    }
}

// Show verse detail
async function showVerse(verse) {
    currentVerse = verse;
    window.currentVerse = verse;

    // Load translations dynamically if not already loaded
    const chNum = verse.chapter_number;
    if (!translations[chNum]) {
        try {
            translations[chNum] = await fetch(`./assets/verse_translation/chapter_${chNum}.json`).then(r => r.json());
        } catch (error) {
            console.warn(`Failed to load translations for chapter ${chNum}:`, error);
            translations[chNum] = [];
        }
    }

    // Clean the text to avoid numbers starting on a new line (coming in the middle)
    const cleanedText = verse.text.replace(/\n\s*([०-९0-9\s\-–]+)॥/g, ' $1॥').replace(/\n/g, '<br>');

    // Update Sanskrit card elements statically
    document.getElementById('verse-pill').textContent = `Verse 10.${verse.chapter_number}.${verse.verse_number}`;
    document.getElementById('verse-text').innerHTML = cleanedText;
    document.getElementById('verse-transliteration').innerHTML = verse.transliteration.replace(/\n/g, '<br>');

    updateVerseContent();

    // Setup interactive controls
    setupVerseNavigation();
    setupLanguagePills();
    setupFavoriteButton();
    setupBookmarkButton();
    setupShareButton();

    // Toggle multi-sloka layout class for combined/long verses
    const delimiterCount = (verse.text.match(/॥/g) || []).length;
    const isMultiSloka = delimiterCount > 2 || verse.text.length > 200;
    if (isMultiSloka) {
        verseDetailScreen.classList.add('multi-sloka-layout');
    } else {
        verseDetailScreen.classList.remove('multi-sloka-layout');
    }

    switchScreen(verseDetailScreen);
}

// Setup verse navigation slider/buttons
function setupVerseNavigation() {
    if (!currentVerse || !currentChapter) return;

    const chapterVerses = verses.filter(v => v.chapter_number === currentVerse.chapter_number).sort((a, b) => a.verse_number - b.verse_number);
    const currentIndex = chapterVerses.findIndex(v => v.id === currentVerse.id);

    // Update slider and counter
    const verseSlider = document.getElementById('verse-slider');
    const verseCounter = document.getElementById('verse-counter');
    const prevBtn = document.getElementById('prev-verse-btn');
    const nextBtn = document.getElementById('next-verse-btn');

    verseSlider.max = chapterVerses.length;
    verseSlider.value = currentIndex + 1;
    verseCounter.textContent = `${currentIndex + 1}/${chapterVerses.length}`;

    // Update button states
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex === chapterVerses.length - 1;

    // Remove existing listeners
    prevBtn.removeEventListener('click', handlePrevVerse);
    nextBtn.removeEventListener('click', handleNextVerse);
    verseSlider.removeEventListener('input', handleVerseSliderChange);

    // Add new listeners
    prevBtn.addEventListener('click', handlePrevVerse);
    nextBtn.addEventListener('click', handleNextVerse);
    verseSlider.addEventListener('input', handleVerseSliderChange);
}

function handlePrevVerse() {
    goToPreviousVerse();
}

function handleNextVerse() {
    goToNextVerse();
}

function handleVerseSliderChange(e) {
    const chapterVerses = verses.filter(v => v.chapter_number === currentVerse.chapter_number).sort((a, b) => a.verse_number - b.verse_number);
    const selectedIndex = parseInt(e.target.value) - 1;

    if (selectedIndex >= 0 && selectedIndex < chapterVerses.length) {
        showVerse(chapterVerses[selectedIndex]);
    }
}

// Setup language dropdown
function setupLanguagePills() {
    const languageDropdown = document.getElementById('language-dropdown');

    if (languageDropdown) {
        languageDropdown.value = currentLang;
        languageDropdown.removeEventListener('change', handleLanguageChange);
        languageDropdown.addEventListener('change', handleLanguageChange);
    }
}

function handleLanguageChange(e) {
    const newLang = e.target.value;
    if (currentLang !== newLang) {
        currentLang = newLang;
        localStorage.setItem('translationLanguage', newLang);
        if (currentVerse) {
            updateVerseContent();
        }
    }
}

// Setup bookmark button
function setupBookmarkButton() {
    updateBookmarkButton();
    bookmarkBtn.removeEventListener('click', handleBookmarkClick);
    bookmarkBtn.addEventListener('click', handleBookmarkClick);
}

function handleBookmarkClick() {
    if (!currentVerse) return;

    if (isBookmarked(currentVerse.id)) {
        removeBookmark(currentVerse.id);
    } else {
        addBookmark(currentVerse);
    }
}

// Setup share button
function setupShareButton() {
    const shareBtn = document.getElementById('share-btn');
    if (shareBtn) {
        shareBtn.removeEventListener('click', handleShareClick);
        shareBtn.addEventListener('click', handleShareClick);
    }
}

async function handleShareClick() {
    if (!currentVerse) return;

    const chapterTranslations = translations[currentVerse.chapter_number] || [];
    const translation = chapterTranslations.find(t => t.verse_id === currentVerse.id);
    const transText = translation ? translation.languages[currentLang]?.description || '' : '';

    const shareText = `Shrimad Bhagavatam 10.${currentVerse.chapter_number}.${currentVerse.verse_number}\n\n${currentVerse.text}\n\nTranslation (${currentLang}):\n${transText}\n\nRead: ${window.location.origin}${window.location.pathname}`;

    try {
        if (navigator.share) {
            await navigator.share({
                title: `Verse 10.${currentVerse.chapter_number}.${currentVerse.verse_number}`,
                text: shareText,
                url: window.location.href
            });
        } else {
            await navigator.clipboard.writeText(shareText);
            showToast('Verse copied to clipboard!');
        }
    } catch (err) {
        console.warn('Error sharing:', err);
    }
}

function showToast(message) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = 'show';
    setTimeout(() => {
        toast.className = '';
    }, 2500);
}

// Setup swipe gestures for verse navigation and screen navigation
function setupSwipeGestures() {
    setupGlobalSwipeGestures();

    const verseScreen = document.getElementById('verse-detail-screen');
    verseScreen.removeEventListener('touchstart', handleTouchStart);
    verseScreen.removeEventListener('touchend', handleTouchEnd);
    verseScreen.addEventListener('touchstart', handleTouchStart);
    verseScreen.addEventListener('touchend', handleTouchEnd);
}

function setupGlobalSwipeGestures() {
    const body = document.body;
    body.removeEventListener('touchstart', handleGlobalTouchStart);
    body.removeEventListener('touchend', handleGlobalTouchEnd);
    body.addEventListener('touchstart', handleGlobalTouchStart);
    body.addEventListener('touchend', handleGlobalTouchEnd);
}

let globalStartX = 0;
let globalEndX = 0;

function handleGlobalTouchStart(e) {
    globalStartX = e.touches[0].clientX;
}

function handleGlobalTouchEnd(e) {
    globalEndX = e.changedTouches[0].clientX;
    handleGlobalSwipe();
}

function handleGlobalSwipe() {
    const deltaX = globalEndX - globalStartX;
    const threshold = 100;
    const screenWidth = window.innerWidth;
    const edgeThreshold = screenWidth * 0.1;

    // Only trigger back navigation if swipe starts from the left edge and goes right
    if (globalStartX <= edgeThreshold && deltaX > threshold) {
        goToPreviousScreen();
    }
}

function goToPreviousScreen() {
    const currentActiveScreen = document.querySelector('.screen.active');
    if (!currentActiveScreen) return;

    if (currentActiveScreen === verseDetailScreen) {
        if (previousScreen === bookmarksScreen) {
            switchScreen(bookmarksScreen);
        } else {
            switchScreen(versesScreen);
        }
    } else if (currentActiveScreen === versesScreen) {
        switchScreen(chaptersScreen);
    } else if (currentActiveScreen === settingsScreen || currentActiveScreen === bookmarksScreen || currentActiveScreen === timelineScreen) {
        switchScreen(chaptersScreen);
    }
}

// Timeline (Krishna Lifetime) screen
function setupTimelineButton() {
    if (!timelineBtn) return;
    timelineBtn.addEventListener('click', () => {
        renderTimeline();
        switchScreen(timelineScreen);
    });
}

function renderTimeline() {
    const container = document.getElementById('timeline-content');
    if (!container) return;
    if (!timelineData || !timelineData.phases || !timelineData.nodes) {
        container.innerHTML = '<div class="glass-card" style="text-align:center; padding:30px;"><p>Timeline data unavailable.</p></div>';
        return;
    }

    // Skip re-render if already populated
    if (container.dataset.rendered === 'true') return;

    const chapterMap = new Map(chapters.map(c => [c.chapter_number, c]));
    const nodesByPhase = new Map();
    timelineData.nodes.forEach(n => {
        if (!nodesByPhase.has(n.phase)) nodesByPhase.set(n.phase, []);
        nodesByPhase.get(n.phase).push(n);
    });

    const html = timelineData.phases.map(phase => {
        const nodes = (nodesByPhase.get(phase.id) || []).sort((a, b) => a.chapter - b.chapter);
        const nodeHtml = nodes.map((node, idx) => {
            const ch = chapterMap.get(node.chapter);
            const title = ch ? ch.name_translation : `Chapter ${node.chapter}`;
            const meaning = ch ? ch.name_meaning : '';
            const sanskrit = ch ? ch.name : '';
            const side = idx % 2 === 0 ? 'left' : 'right';
            return `
                <div class="tl-node tl-node-${side}" data-chapter="${node.chapter}">
                    <div class="tl-dot" style="background:${phase.tint};"></div>
                    <div class="tl-card glass-card" style="border-left-color:${phase.tint};">
                        <div class="tl-card-head">
                            <span class="tl-chapter-pill" style="background:${phase.tint};">Ch ${node.chapter}</span>
                            <span class="tl-title">${title}</span>
                        </div>
                        ${sanskrit ? `<div class="tl-sanskrit">${sanskrit} <span class="tl-meaning">(${meaning})</span></div>` : ''}
                        <p class="tl-hook">${node.hook}</p>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <section class="tl-phase" data-phase="${phase.id}">
                <div class="tl-phase-header" style="--phase-tint:${phase.tint};">
                    <span class="tl-phase-icon">${phase.icon}</span>
                    <div class="tl-phase-text">
                        <h3>${phase.title}</h3>
                        <span class="tl-phase-range">Chapters ${phase.range[0]}–${phase.range[1]}</span>
                    </div>
                </div>
                <div class="tl-nodes" style="--phase-tint:${phase.tint};">
                    <div class="tl-spine" style="background:${phase.tint};"></div>
                    ${nodeHtml}
                </div>
            </section>
        `;
    }).join('');

    container.innerHTML = html;
    container.dataset.rendered = 'true';

    container.querySelectorAll('.tl-node').forEach(el => {
        el.addEventListener('click', () => {
            const chNum = parseInt(el.getAttribute('data-chapter'), 10);
            const chapter = chapters.find(c => c.chapter_number === chNum);
            if (chapter) showChapter(chapter);
        });
    });
}

function handleTouchStart(e) {
    startX = e.touches[0].clientX;
}

function handleTouchEnd(e) {
    endX = e.changedTouches[0].clientX;
    if (document.getElementById('verse-detail-screen').classList.contains('active')) {
        handleVerseSwipe();
    }
}

function handleVerseSwipe() {
    if (!currentVerse) return;

    const deltaX = endX - startX;
    const threshold = 50;
    const screenWidth = window.innerWidth;
    const edgeThreshold = screenWidth * 0.1;

    // Don't handle verse swipe if it was an edge swipe (reserved for back navigation)
    if (startX <= edgeThreshold) return;

    if (Math.abs(deltaX) > threshold) {
        if (deltaX > 0) {
            goToPreviousVerse();
        } else {
            goToNextVerse();
        }
    }
}

function goToNextVerse() {
    if (!currentVerse) return;

    const chapterVerses = verses.filter(v => v.chapter_number === currentVerse.chapter_number).sort((a, b) => a.verse_number - b.verse_number);
    const currentIndex = chapterVerses.findIndex(v => v.id === currentVerse.id);

    if (currentIndex >= 0 && currentIndex < chapterVerses.length - 1) {
        showVerse(chapterVerses[currentIndex + 1]);
    }
}

// Go to previous verse
function goToPreviousVerse() {
    if (!currentVerse) return;

    const chapterVerses = verses.filter(v => v.chapter_number === currentVerse.chapter_number).sort((a, b) => a.verse_number - b.verse_number);
    const currentIndex = chapterVerses.findIndex(v => v.id === currentVerse.id);

    if (currentIndex > 0) {
        showVerse(chapterVerses[currentIndex - 1]);
    }
}

// Navigation Screen Switcher
function setupNavigation() {
    backBtn.addEventListener('click', () => {
        goToPreviousScreen();
    });
}

function switchScreen(screen) {
    const currentActiveScreen = document.querySelector('.screen.active');
    if (currentActiveScreen && currentActiveScreen !== screen) {
        previousScreen = currentActiveScreen;
    }

    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    screen.classList.add('active');

    // Add CSS classes for active state styling
    document.body.classList.remove('canto-active', 'verse-detail-active', 'chapters-active', 'verses-active', 'settings-active', 'bookmarks-active', 'timeline-active');
    
    if (screen === chaptersScreen) {
        document.body.classList.add('chapters-active');
        document.getElementById('verse-navigation').style.display = 'none';
        document.getElementById('floating-settings-btn').style.display = 'block';
        if (headerTitle) headerTitle.innerHTML = '<img src="images/app-navbar-logo-yellow-transparent.png" alt="श्रीमद्भागवत पुराण" id="header-logo">';
    } else if (screen === versesScreen) {
        document.body.classList.add('verses-active');
        document.getElementById('verse-navigation').style.display = 'none';
        document.getElementById('floating-settings-btn').style.display = 'none';
        if (headerTitle) headerTitle.innerHTML = '<img src="images/app-navbar-logo-yellow-transparent.png" alt="श्रीमद्भागवत पुराण" id="header-logo">';
    } else if (screen === verseDetailScreen) {
        document.body.classList.add('verse-detail-active');
        document.getElementById('verse-navigation').style.display = 'flex';
        document.getElementById('floating-settings-btn').style.display = 'none';
        if (headerTitle) headerTitle.innerHTML = '<img src="images/app-navbar-logo-yellow-transparent.png" alt="श्रीमद्भागवत पुराण" id="header-logo">';
    } else if (screen === settingsScreen) {
        document.body.classList.add('settings-active');
        document.getElementById('verse-navigation').style.display = 'none';
        document.getElementById('floating-settings-btn').style.display = 'none';
        if (headerTitle) headerTitle.textContent = 'Settings';
    } else if (screen === bookmarksScreen) {
        document.body.classList.add('bookmarks-active');
        document.getElementById('verse-navigation').style.display = 'none';
        document.getElementById('floating-settings-btn').style.display = 'none';
        if (headerTitle) headerTitle.textContent = 'Bookmarks';
    } else if (screen === timelineScreen) {
        document.body.classList.add('timeline-active');
        document.getElementById('verse-navigation').style.display = 'none';
        document.getElementById('floating-settings-btn').style.display = 'none';
        if (headerTitle) headerTitle.textContent = "Krishna's Lifetime";
    }

    // Show timeline button only on home screen
    if (timelineBtn) {
        timelineBtn.style.display = (screen === chaptersScreen) ? 'flex' : 'none';
    }

    // Hide back button only on home screen
    if (screen === chaptersScreen) {
        backBtn.style.display = 'none';
        checkAndShowBookmarkResume();
    } else {
        backBtn.style.display = 'block';
    }

    // Show header bookmark button only on verse detail screen
    if (screen === verseDetailScreen) {
        bookmarkBtn.style.display = 'flex';
    } else {
        bookmarkBtn.style.display = 'none';
    }
}

// Floating Menu logic
function initFloatingMenu() {
    const updatedMainFloatingBtn = document.getElementById('main-floating-btn');
    const updatedFloatingMenu = document.getElementById('floating-menu');

    updatedMainFloatingBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = updatedFloatingMenu.classList.contains('show');

        if (isOpen) {
            updatedFloatingMenu.classList.remove('show');
            updatedMainFloatingBtn.classList.remove('opened');
            updatedMainFloatingBtn.innerHTML = '<i class="fas fa-cog"></i>';
        } else {
            updatedFloatingMenu.classList.add('show');
            updatedMainFloatingBtn.classList.add('opened');
            updatedMainFloatingBtn.innerHTML = '<i class="fas fa-times"></i>';
        }
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.floating-settings-btn')) {
            updatedFloatingMenu.classList.remove('show');
            updatedMainFloatingBtn.classList.remove('opened');
            updatedMainFloatingBtn.innerHTML = '<i class="fas fa-cog"></i>';
        }
    });

    document.getElementById('settings-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        switchScreen(settingsScreen);
        updatedFloatingMenu.classList.remove('show');
        updatedMainFloatingBtn.classList.remove('opened');
        updatedMainFloatingBtn.innerHTML = '<i class="fas fa-cog"></i>';
    });

    document.getElementById('bookmarks-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        switchScreen(bookmarksScreen);
        renderBookmarks();
        updatedFloatingMenu.classList.remove('show');
        updatedMainFloatingBtn.classList.remove('opened');
        updatedMainFloatingBtn.innerHTML = '<i class="fas fa-cog"></i>';
    });

    document.getElementById('floating-bookmark-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        updatedFloatingMenu.classList.remove('show');
        updatedMainFloatingBtn.classList.remove('opened');
        updatedMainFloatingBtn.innerHTML = '<i class="fas fa-cog"></i>';

        const activeB = getActiveBookmark();
        if (activeB) {
            const verseObj = verses.find(v => v.id === activeB.verseId);
            if (verseObj) {
                const chapterObj = chapters.find(c => c.chapter_number === verseObj.chapter_number);
                if (chapterObj) currentChapter = chapterObj;
                showVerse(verseObj);
            } else {
                showToast("Bookmarked verse not found.");
            }
        } else {
            showToast("No bookmark set. Press the bookmark icon at the top of the verse screen.");
        }
    });
}

// Favorites Database (Heart Icon list)
function getFavorites() {
    let favorites = localStorage.getItem('bhagavatam_favorites');
    if (!favorites) {
        const oldBookmarks = localStorage.getItem('bhagavatam_bookmarks');
        if (oldBookmarks) {
            favorites = oldBookmarks;
            localStorage.setItem('bhagavatam_favorites', oldBookmarks);
        }
    }
    return favorites ? JSON.parse(favorites) : [];
}

function saveFavorites(favorites) {
    localStorage.setItem('bhagavatam_favorites', JSON.stringify(favorites));
}

function isFavorite(verseId) {
    const favorites = getFavorites();
    return favorites.some(fav => fav.verseId === verseId);
}

function addFavorite(verse) {
    const favorites = getFavorites();
    const chapterTranslations = translations[verse.chapter_number] || [];
    const translation = chapterTranslations.find(t => t.verse_id === verse.id);

    const fav = {
        verseId: verse.id,
        chapterNumber: verse.chapter_number,
        verseNumber: verse.verse_number,
        text: verse.text,
        transliteration: verse.transliteration,
        translation: translation ? translation.languages[currentLang]?.description || 'Translation not available' : 'Translation not available',
        language: currentLang,
        dateAdded: new Date().toISOString()
    };

    favorites.push(fav);
    saveFavorites(favorites);
    updateFavoriteButton();
    showToast('Verse added to favorites!');
}

function removeFavorite(verseId) {
    const favorites = getFavorites();
    const filtered = favorites.filter(fav => fav.verseId !== verseId);
    saveFavorites(filtered);
    updateFavoriteButton();
    showToast('Removed from favorites!');
}

function updateFavoriteButton() {
    const favoriteBtn = document.getElementById('favorite-btn');
    if (!currentVerse || !favoriteBtn) return;

    if (isFavorite(currentVerse.id)) {
        favoriteBtn.classList.add('bookmarked');
        favoriteBtn.innerHTML = '<i class="fas fa-heart"></i>';
    } else {
        favoriteBtn.classList.remove('bookmarked');
        favoriteBtn.innerHTML = '<i class="far fa-heart"></i>';
    }
}

function setupFavoriteButton() {
    const favoriteBtn = document.getElementById('favorite-btn');
    if (favoriteBtn) {
        updateFavoriteButton();
        favoriteBtn.removeEventListener('click', handleFavoriteClick);
        favoriteBtn.addEventListener('click', handleFavoriteClick);
    }
}

function handleFavoriteClick() {
    if (!currentVerse) return;
    if (isFavorite(currentVerse.id)) {
        removeFavorite(currentVerse.id);
    } else {
        addFavorite(currentVerse);
    }
}

// Single Active Bookmark (Navbar Bookmark Icon)
function getActiveBookmark() {
    const activeB = localStorage.getItem('bhagavatam_active_bookmark');
    return activeB ? JSON.parse(activeB) : null;
}

function isBookmarked(verseId) {
    const activeB = getActiveBookmark();
    return activeB && activeB.verseId === verseId;
}

function addBookmark(verse) {
    const activeB = {
        verseId: verse.id,
        chapterNumber: verse.chapter_number,
        verseNumber: verse.verse_number
    };
    localStorage.setItem('bhagavatam_active_bookmark', JSON.stringify(activeB));
    updateBookmarkButton();
    checkAndShowBookmarkResume();
    showToast('Verse bookmarked!');
}

function removeBookmark() {
    localStorage.removeItem('bhagavatam_active_bookmark');
    updateBookmarkButton();
    checkAndShowBookmarkResume();
    showToast('Bookmark removed!');
}

function handleBookmarkClick() {
    if (!currentVerse) return;
    if (isBookmarked(currentVerse.id)) {
        removeBookmark();
    } else {
        addBookmark(currentVerse);
    }
}

function updateBookmarkButton() {
    if (!currentVerse || !bookmarkBtn) return;

    if (isBookmarked(currentVerse.id)) {
        bookmarkBtn.classList.add('bookmarked');
        bookmarkBtn.innerHTML = '<i class="fas fa-bookmark"></i>';
    } else {
        bookmarkBtn.classList.remove('bookmarked');
        bookmarkBtn.innerHTML = '<i class="far fa-bookmark"></i>';
    }
}

function setupBookmarkButton() {
    updateBookmarkButton();
    bookmarkBtn.removeEventListener('click', handleBookmarkClick);
    bookmarkBtn.addEventListener('click', handleBookmarkClick);
}

function checkAndShowBookmarkResume() {
    const resumeBanner = document.getElementById('bookmark-resume-banner');
    const resumeVerseText = document.getElementById('bookmark-resume-verse');
    if (!resumeBanner || !resumeVerseText) return;

    const activeB = getActiveBookmark();
    if (activeB) {
        resumeVerseText.textContent = `Verse 10.${activeB.chapterNumber}.${activeB.verseNumber}`;
        resumeBanner.style.display = 'flex';
        
        resumeBanner.onclick = () => {
            const verseObj = verses.find(v => v.id === activeB.verseId);
            if (verseObj) {
                const chapterObj = chapters.find(c => c.chapter_number === verseObj.chapter_number);
                if (chapterObj) currentChapter = chapterObj;
                showVerse(verseObj);
            }
        };
    } else {
        resumeBanner.style.display = 'none';
    }
}

// Render Bookmarks (Favorite Verses List)
function renderBookmarks() {
    const bookmarksList = document.getElementById('bookmarks-list');
    const favorites = getFavorites();

    if (favorites.length === 0) {
        bookmarksList.innerHTML = `
            <div class="glass-card" style="text-align: center; padding: 40px; margin: 20px;">
                <i class="fas fa-heart" style="font-size: 48px; color: rgba(255, 255, 255, 0.15); margin-bottom: 20px;"></i>
                <h3 style="color: var(--color-gold); margin-bottom: 10px;">No Favorites Yet</h3>
                <p style="color: var(--color-text-muted);">Start marking your favorite verses to see them here.</p>
            </div>
        `;
        return;
    }

    bookmarksList.innerHTML = '';
    favorites.reverse().forEach(bookmark => {
        const bookmarkItem = document.createElement('div');
        bookmarkItem.className = 'bookmark-item';
        const cleanedText = bookmark.text.replace(/\n\s*([०-९0-9\s\-–]+)॥/g, ' $1॥').replace(/\n/g, '<br>');
        bookmarkItem.innerHTML = `
            <div class="bookmark-header">
                <span class="bookmark-sloka-number">Verse 10.${bookmark.chapterNumber}.${bookmark.verseNumber}</span>
                <button class="remove-bookmark-btn" data-verse-id="${bookmark.verseId}" title="Remove from Favorites">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="bookmark-text">${cleanedText}</div>
            <div class="bookmark-translation">${bookmark.translation}</div>
        `;

        bookmarkItem.addEventListener('click', (e) => {
            if (!e.target.closest('.remove-bookmark-btn')) {
                navigateToBookmarkedVerse(bookmark);
            }
        });

        const removeBtn = bookmarkItem.querySelector('.remove-bookmark-btn');
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeFavorite(bookmark.verseId);
            renderBookmarks();
        });

        bookmarksList.appendChild(bookmarkItem);
    });
}

function navigateToBookmarkedVerse(bookmark) {
    const chapter = chapters.find(c => c.chapter_number === bookmark.chapterNumber);
    const verse = verses.find(v => v.id === bookmark.verseId);

    if (chapter && verse) {
        currentChapter = chapter;
        currentVerse = verse;
        window.currentVerse = verse;
        showVerse(verse);
    }
}

// Render all verses in full reader scroll mode
async function renderScrollMode(chapter, chapterVerses) {
    const chNum = chapter.chapter_number;
    if (!translations[chNum]) {
        versesList.innerHTML = '<div class="glass-card" style="text-align:center; padding:30px;"><p><i class="fas fa-spinner fa-spin"></i> Loading translations... / अनुवाद लोड हो रहे हैं...</p></div>';
        try {
            translations[chNum] = await fetch(`./assets/verse_translation/chapter_${chNum}.json`).then(r => r.json());
        } catch (error) {
            console.warn(`Failed to load translations for chapter ${chNum}:`, error);
            translations[chNum] = [];
        }
    }
    
    versesList.innerHTML = '';
    const chapterTranslations = translations[chNum] || [];

    chapterVerses.forEach(verse => {
        const item = document.createElement('div');
        item.className = 'reader-verse-card glass-card';
        item.setAttribute('data-verse-id', verse.id);
        
        const cleanedText = verse.text.replace(/\n\s*([०-९0-9\s\-–]+)॥/g, ' $1॥').replace(/\n/g, '<br>');
        const trans = chapterTranslations.find(t => t.verse_id === verse.id);
        const translationText = trans && trans.languages && trans.languages[currentLang] 
            ? trans.languages[currentLang].description 
            : 'Translation not available locally.';

        const isFav = isFavorite(verse.id);
        const isBmk = isBookmarked(verse.id);

        item.innerHTML = `
            <div class="reader-card-header">
                <span class="sloka-number-pill">Verse 10.${verse.chapter_number}.${verse.verse_number}</span>
                <div class="reader-card-actions">
                    <button class="reader-action-btn favorite-btn ${isFav ? 'bookmarked' : ''}" title="Favorite">
                        <i class="${isFav ? 'fas' : 'far'} fa-heart"></i>
                    </button>
                    <button class="reader-action-btn bookmark-btn ${isBmk ? 'bookmarked' : ''}" title="Bookmark">
                        <i class="${isBmk ? 'fas' : 'far'} fa-bookmark"></i>
                    </button>
                    <button class="reader-action-btn share-btn" title="Share">
                        <i class="fas fa-share-alt"></i>
                    </button>
                </div>
            </div>
            <div class="reader-sanskrit">${cleanedText}</div>
            <div class="reader-transliteration">${verse.transliteration.replace(/\n/g, '<br>')}</div>
            <div class="reader-translation">${translationText}</div>
        `;

        // Add event listeners for buttons
        const favBtn = item.querySelector('.favorite-btn');
        favBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isFavorite(verse.id)) {
                removeFavorite(verse.id);
                favBtn.classList.remove('bookmarked');
                favBtn.innerHTML = '<i class="far fa-heart"></i>';
            } else {
                addFavorite(verse);
                favBtn.classList.add('bookmarked');
                favBtn.innerHTML = '<i class="fas fa-heart"></i>';
            }
        });

        const bmkBtn = item.querySelector('.bookmark-btn');
        bmkBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const allBmkBtns = versesList.querySelectorAll('.bookmark-btn');
            if (isBookmarked(verse.id)) {
                removeBookmark();
                bmkBtn.classList.remove('bookmarked');
                bmkBtn.innerHTML = '<i class="far fa-bookmark"></i>';
            } else {
                allBmkBtns.forEach(btn => {
                    btn.classList.remove('bookmarked');
                    btn.innerHTML = '<i class="far fa-bookmark"></i>';
                });
                addBookmark(verse);
                bmkBtn.classList.add('bookmarked');
                bmkBtn.innerHTML = '<i class="fas fa-bookmark"></i>';
            }
        });

        const shareBtn = item.querySelector('.share-btn');
        shareBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            shareVerseDirectly(verse, translationText);
        });

        versesList.appendChild(item);
    });
}

// Update translations in-place for scroll mode (no re-render)
function updateScrollModeTranslations(chapterNumber) {
    const chapterTranslations = translations[chapterNumber] || [];
    const verseCards = document.querySelectorAll('.reader-verse-card');

    verseCards.forEach(card => {
        const verseId = card.getAttribute('data-verse-id');
        if (!verseId) return;

        const verseIdNum = parseInt(verseId, 10);
        const trans = chapterTranslations.find(t => t.verse_id === verseIdNum);
        const translationText = trans && trans.languages && trans.languages[currentLang]
            ? trans.languages[currentLang].description
            : 'Translation not available locally.';

        const translationEl = card.querySelector('.reader-translation');
        if (translationEl) {
            translationEl.textContent = translationText;
        }
    });
}

// Settings initialization
function initSettings() {
    displayCacheVersion();

    // Default view setting
    const defaultScrollToggle = document.getElementById('default-scroll-toggle');
    if (defaultScrollToggle) {
        const isScrollDefault = localStorage.getItem('defaultChapterView') === 'scroll';
        defaultScrollToggle.checked = isScrollDefault;
        
        defaultScrollToggle.addEventListener('change', (e) => {
            const mode = e.target.checked ? 'scroll' : 'list';
            localStorage.setItem('defaultChapterView', mode);
            showToast(mode === 'scroll' ? 'Default View: Reader Mode' : 'Default View: List Mode');
        });
    }

    // Translation language setting
    const settingsLangDropdown = document.getElementById('settings-language-dropdown');
    if (settingsLangDropdown) {
        settingsLangDropdown.value = currentLang;
        settingsLangDropdown.addEventListener('change', (e) => {
            const newLang = e.target.value;
            if (currentLang !== newLang) {
                currentLang = newLang;
                localStorage.setItem('translationLanguage', newLang);
                
                // Sync settings dropdown with chapter-level dropdown if active
                const chapterLangDropdown = document.getElementById('chapter-language-dropdown');
                if (chapterLangDropdown) {
                    chapterLangDropdown.value = newLang;
                }

                showToast(`Translation Language: ${newLang === 'english' ? 'English' : newLang === 'hindi' ? 'Hindi' : 'Gujarati'}`);
            }
        });
    }
}

// Setup chapter level control handlers (View Mode toggles & Language dropdown)
function setupChapterControls() {
    const btnList = document.getElementById('view-mode-list');
    const btnScroll = document.getElementById('view-mode-scroll');
    const chapterLangDropdown = document.getElementById('chapter-language-dropdown');

    if (btnList) {
        btnList.addEventListener('click', () => {
            if (currentChapter) {
                showChapter(currentChapter, 'list');
            }
        });
    }

    if (btnScroll) {
        btnScroll.addEventListener('click', () => {
            if (currentChapter) {
                showChapter(currentChapter, 'scroll');
            }
        });
    }

    if (chapterLangDropdown) {
        chapterLangDropdown.addEventListener('change', (e) => {
            const newLang = e.target.value;
            if (currentLang !== newLang) {
                currentLang = newLang;
                localStorage.setItem('translationLanguage', newLang);
                
                // Keep settings language dropdown in sync
                const settingsLangDropdown = document.getElementById('settings-language-dropdown');
                if (settingsLangDropdown) {
                    settingsLangDropdown.value = newLang;
                }

                // Update translations in-place without re-rendering
                if (currentChapter) {
                    updateScrollModeTranslations(currentChapter.chapter_number);
                }
            }
        });
    }
}

// Update state of view mode controls at the chapter level
function updateChapterToggles(viewMode) {
    const btnList = document.getElementById('view-mode-list');
    const btnScroll = document.getElementById('view-mode-scroll');
    const stickyControls = document.getElementById('reader-sticky-controls');
    const chapterLangDropdown = document.getElementById('chapter-language-dropdown');

    if (!btnList || !btnScroll || !stickyControls || !chapterLangDropdown) return;

    if (viewMode === 'scroll') {
        btnList.classList.remove('active');
        btnScroll.classList.add('active');
        stickyControls.style.display = 'flex';
        chapterLangDropdown.value = currentLang;
    } else {
        btnList.classList.add('active');
        btnScroll.classList.remove('active');
        stickyControls.style.display = 'none';
    }
}

// Directly share a verse from scroll view
async function shareVerseDirectly(verse, translationText) {
    const shareText = `Shrimad Bhagavatam 10.${verse.chapter_number}.${verse.verse_number}\n\n${verse.text}\n\nTranslation (${currentLang}):\n${translationText}\n\nRead: ${window.location.origin}${window.location.pathname}`;

    try {
        if (navigator.share) {
            await navigator.share({
                title: `Verse 10.${verse.chapter_number}.${verse.verse_number}`,
                text: shareText,
                url: window.location.href
            });
        } else {
            await navigator.clipboard.writeText(shareText);
            showToast('Verse copied to clipboard!');
        }
    } catch (err) {
        console.warn('Error sharing:', err);
    }
}

// Display cache version from sw.js
async function displayCacheVersion() {
    try {
        const response = await fetch('./sw.js');
        const swContent = await response.text();
        const match = swContent.match(/CACHE_NAME\s*=\s*['"]([^'"]+)['"]/);

        if (match && match[1]) {
            document.getElementById('cache-version').textContent = `App Version: ${match[1]}`;
        } else {
            document.getElementById('cache-version').textContent = 'App Version: 1.0.0';
        }
    } catch (e) {
        document.getElementById('cache-version').textContent = 'App Version: 1.0.0';
    }
}

// Register PWA service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => {
                console.log('ServiceWorker registered successfully');
            })
            .catch(err => {
                console.warn('ServiceWorker registration failed:', err);
            });
    });
}

// Run init on load
init();
