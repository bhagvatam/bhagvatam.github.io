// Global variables
let chapters = [];
let verses = [];
let translations = {}; // {chapterNumber: [translations]}
let currentChapter = null;
let currentVerse = null;
let currentLang = 'english'; // 'english', 'hindi', or 'gujarati' - for verse translations
let startX = 0;
let endX = 0;
let previousScreen = null; // Track where user came from

// DOM elements
const cantoScreen = document.getElementById('canto-screen');
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
const bookmarkBtn = document.getElementById('bookmark-btn');
const headerTitle = document.getElementById('header-title');

// Initialize app
async function init() {
    try {
        // Load data from assets folder
        chapters = await fetch('./assets/chapters.json').then(r => r.json());
        verses = await fetch('./assets/verse.json').then(r => r.json());

        // Initialize translations cache
        translations = {};

        // Load saved translation language preference
        const savedTranslationLang = localStorage.getItem('translationLanguage');
        if (savedTranslationLang) {
            currentLang = savedTranslationLang;
        }

        // Initialize settings
        initSettings();

        // Initialize floating menu
        initFloatingMenu();

        // Render chapters
        renderChapters();

        // Setup Canto 10 Card click handler
        const canto10Card = document.getElementById('canto-10-card');
        if (canto10Card) {
            canto10Card.addEventListener('click', () => {
                switchScreen(chaptersScreen);
            });
        }

        // Setup navigation
        setupNavigation();
        setupSwipeGestures();
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
                    <span class="verse-count">${chapter.verses_count} श्लोक</span>
                </div>
            </div>
            <p>${chapter.chapter_summary.substring(0, 160)}...</p>
        `;
        card.addEventListener('click', () => showChapter(chapter));
        chaptersList.appendChild(card);
    });
}

// Show chapter verses
function showChapter(chapter) {
    currentChapter = chapter;
    chapterTitle.innerHTML = `
        <div class="chapter-title-name">${chapter.name}</div>
        <div class="chapter-title-meaning">(${chapter.name_meaning})</div>
    `;

    const chapterVerses = verses.filter(v => v.chapter_number === chapter.chapter_number).sort((a, b) => a.verse_number - b.verse_number);
    versesList.innerHTML = '';

    if (chapterVerses.length === 0) {
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
    document.getElementById('verse-pill').textContent = `श्लोक 10.${verse.chapter_number}.${verse.verse_number}`;
    document.getElementById('verse-text').innerHTML = cleanedText;
    document.getElementById('verse-transliteration').innerHTML = verse.transliteration.replace(/\n/g, '<br>');

    updateVerseContent();

    // Setup interactive controls
    setupVerseNavigation();
    setupLanguagePills();
    setupBookmarkButton();
    setupShareButton();

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

    const shareText = `श्रीमद्भागवत पुराण १०.${currentVerse.chapter_number}.${currentVerse.verse_number}\n\n${currentVerse.text}\n\nअनुवाद (${currentLang}):\n${transText}\n\nपढ़ें: ${window.location.origin}${window.location.pathname}`;

    try {
        if (navigator.share) {
            await navigator.share({
                title: `श्लोक १०.${currentVerse.chapter_number}.${currentVerse.verse_number}`,
                text: shareText,
                url: window.location.href
            });
        } else {
            await navigator.clipboard.writeText(shareText);
            showToast('श्लोक कॉपी कर लिया गया है!');
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
    } else if (currentActiveScreen === chaptersScreen) {
        switchScreen(cantoScreen);
    } else if (currentActiveScreen === settingsScreen || currentActiveScreen === bookmarksScreen) {
        switchScreen(cantoScreen);
    }
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
    document.body.classList.remove('canto-active', 'verse-detail-active', 'chapters-active', 'verses-active', 'settings-active', 'bookmarks-active');
    
    if (screen === cantoScreen) {
        document.body.classList.add('canto-active');
        document.getElementById('verse-navigation').style.display = 'none';
        document.getElementById('floating-settings-btn').style.display = 'block';
        if (headerTitle) headerTitle.textContent = 'श्रीमद्भागवत पुराण';
    } else if (screen === chaptersScreen) {
        document.body.classList.add('chapters-active');
        document.getElementById('verse-navigation').style.display = 'none';
        document.getElementById('floating-settings-btn').style.display = 'block';
        if (headerTitle) headerTitle.textContent = 'श्रीमद्भागवत पुराण';
    } else if (screen === versesScreen) {
        document.body.classList.add('verses-active');
        document.getElementById('verse-navigation').style.display = 'none';
        document.getElementById('floating-settings-btn').style.display = 'block';
        if (headerTitle) headerTitle.textContent = 'श्रीमद्भागवत पुराण';
    } else if (screen === verseDetailScreen) {
        document.body.classList.add('verse-detail-active');
        document.getElementById('verse-navigation').style.display = 'flex';
        document.getElementById('floating-settings-btn').style.display = 'none';
        if (headerTitle) headerTitle.textContent = 'श्रीमद्भागवत पुराण';
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
    }

    // Hide back button only on home screen
    if (screen === cantoScreen) {
        backBtn.style.display = 'none';
    } else {
        backBtn.style.display = 'block';
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
}

// Local Storage Bookmarking
function getBookmarks() {
    const bookmarks = localStorage.getItem('bhagavatam_bookmarks');
    return bookmarks ? JSON.parse(bookmarks) : [];
}

function saveBookmarks(bookmarks) {
    localStorage.setItem('bhagavatam_bookmarks', JSON.stringify(bookmarks));
}

// Check if a verse is bookmarked
function isBookmarked(verseId) {
    const bookmarks = getBookmarks();
    return bookmarks.some(bookmark => bookmark.verseId === verseId);
}

function addBookmark(verse) {
    const bookmarks = getBookmarks();
    const chapterTranslations = translations[verse.chapter_number] || [];
    const translation = chapterTranslations.find(t => t.verse_id === verse.id);

    const bookmark = {
        verseId: verse.id,
        chapterNumber: verse.chapter_number,
        verseNumber: verse.verse_number,
        text: verse.text,
        transliteration: verse.transliteration,
        translation: translation ? translation.languages[currentLang]?.description || 'Translation not available' : 'Translation not available',
        language: currentLang,
        dateAdded: new Date().toISOString()
    };

    bookmarks.push(bookmark);
    saveBookmarks(bookmarks);
    updateBookmarkButton();
}

function removeBookmark(verseId) {
    const bookmarks = getBookmarks();
    const filteredBookmarks = bookmarks.filter(bookmark => bookmark.verseId !== verseId);
    saveBookmarks(filteredBookmarks);
    updateBookmarkButton();
}

function updateBookmarkButton() {
    if (!currentVerse || !bookmarkBtn) return;

    if (isBookmarked(currentVerse.id)) {
        bookmarkBtn.classList.add('bookmarked');
        bookmarkBtn.innerHTML = '<i class="fas fa-heart"></i>';
    } else {
        bookmarkBtn.classList.remove('bookmarked');
        bookmarkBtn.innerHTML = '<i class="far fa-heart"></i>';
    }
}

// Render Bookmarks
function renderBookmarks() {
    const bookmarksList = document.getElementById('bookmarks-list');
    const bookmarks = getBookmarks();

    if (bookmarks.length === 0) {
        bookmarksList.innerHTML = `
            <div class="glass-card" style="text-align: center; padding: 40px; margin: 20px;">
                <i class="fas fa-heart" style="font-size: 48px; color: rgba(255, 255, 255, 0.15); margin-bottom: 20px;"></i>
                <h3 style="color: var(--color-gold); margin-bottom: 10px;">No Bookmarks Yet</h3>
                <p style="color: var(--color-text-muted);">Start bookmarking your favorite verses to see them here.</p>
            </div>
        `;
        return;
    }

    bookmarksList.innerHTML = '';
    bookmarks.reverse().forEach(bookmark => {
        const bookmarkItem = document.createElement('div');
        bookmarkItem.className = 'bookmark-item';
        const cleanedText = bookmark.text.replace(/\n\s*([०-९0-9\s\-–]+)॥/g, ' $1॥').replace(/\n/g, '<br>');
        bookmarkItem.innerHTML = `
            <div class="bookmark-header">
                <span class="bookmark-sloka-number">श्लोक 10.${bookmark.chapterNumber}.${bookmark.verseNumber}</span>
                <button class="remove-bookmark-btn" data-verse-id="${bookmark.verseId}">
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
            removeBookmark(bookmark.verseId);
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

// Settings initialization
function initSettings() {
    displayCacheVersion();
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
