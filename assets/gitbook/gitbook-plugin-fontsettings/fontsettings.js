require(['gitbook', 'jquery'], function(gitbook, $) {
    // Font size configuration
    var MAX_SIZE = 4,
        MIN_SIZE = 0;

    // Current state
    var fontState;

    // Theme IDs (matching GitBook's color-theme-N class convention)
    var THEME = {
        light: 0,  // default — no color-theme class applied
        dark:  2   // color-theme-2 = night
    };

    // ---------------------------------------------------------------------------
    // Font size
    // ---------------------------------------------------------------------------

    function enlargeFontSize(e) {
        if (e && e.preventDefault) e.preventDefault();
        if (fontState.size >= MAX_SIZE) return;
        fontState.size++;
        saveFontSettings();
    }

    function reduceFontSize(e) {
        if (e && e.preventDefault) e.preventDefault();
        if (fontState.size <= MIN_SIZE) return;
        fontState.size--;
        saveFontSettings();
    }

    // ---------------------------------------------------------------------------
    // Theme
    // ---------------------------------------------------------------------------

    function setLightTheme(e) {
        if (e && e instanceof Event) e.preventDefault();
        applyColorTheme(THEME.light);
    }

    function setDarkTheme(e) {
        if (e && e instanceof Event) e.preventDefault();
        applyColorTheme(THEME.dark);
    }

    function applyColorTheme(themeId) {
        var $book   = gitbook.state.$book;
        var $header = $('.book-body > .book-header');

        // Strip any existing color-theme class
        $book[0].className   = $book[0].className.replace(/\bcolor-theme-\S+/g, '');
        $header[0] && ($header[0].className = $header[0].className.replace(/\bcolor-theme-\S+/g, ''));

        fontState.theme = themeId;

        if (themeId !== 0) {
            $book.addClass('color-theme-' + themeId);
            if ($header.length) $header.addClass('color-theme-' + themeId);
        }

        saveFontSettings();
        updateToggleUI();
    }

    // ---------------------------------------------------------------------------
    // Persistence & DOM update
    // ---------------------------------------------------------------------------

    function saveFontSettings() {
        gitbook.storage.set('fontState', fontState);
        update();
    }

    function update() {
        var $book = gitbook.state.$book;

        // Font size + family classes
        $book[0].className = $book[0].className.replace(/\bfont-\S+/g, '');
        $book.addClass('font-size-'   + fontState.size);
        $book.addClass('font-family-' + (fontState.family || 0));

        // Re-apply stored color theme
        if (fontState.theme !== 0) {
            $book[0].className = $book[0].className.replace(/\bcolor-theme-\S+/g, '');
            $book.addClass('color-theme-' + fontState.theme);
        }
    }

    // ---------------------------------------------------------------------------
    // HTML toggle buttons — wire up static elements in the layout
    // ---------------------------------------------------------------------------

    function updateToggleUI() {
        $('#btn-light').toggleClass('active', fontState.theme === THEME.light);
        $('#btn-dark').toggleClass('active',  fontState.theme === THEME.dark);

        // Disable font buttons at extremes
        $('#btn-font-decrease').prop('disabled', fontState.size <= MIN_SIZE);
        $('#btn-font-increase').prop('disabled', fontState.size >= MAX_SIZE);
    }

    function wireHtmlButtons() {
        $('#btn-light').off('click.fontsettings').on('click.fontsettings', function(e) {
            setLightTheme(e);
        });

        $('#btn-dark').off('click.fontsettings').on('click.fontsettings', function(e) {
            setDarkTheme(e);
        });

        $('#btn-font-decrease').off('click.fontsettings').on('click.fontsettings', function(e) {
            reduceFontSize(e);
            updateToggleUI();
        });

        $('#btn-font-increase').off('click.fontsettings').on('click.fontsettings', function(e) {
            enlargeFontSize(e);
            updateToggleUI();
        });

        updateToggleUI();
    }

    // ---------------------------------------------------------------------------
    // Initialisation
    // ---------------------------------------------------------------------------

    function init(config) {
        fontState = gitbook.storage.get('fontState', {
            size:   config.size  || 2,
            family: 0,
            theme:  config.theme === 'night' ? THEME.dark : THEME.light
        });
        update();
    }

    gitbook.events.bind('start', function (e, config) {
        init(config.fontsettings || {});
        wireHtmlButtons();
    });

    gitbook.events.bind('page.change', function() {
        update();
        wireHtmlButtons();
    });

    // Public API
    gitbook.fontsettings = {
        enlargeFontSize: enlargeFontSize,
        reduceFontSize:  reduceFontSize,
        setLightTheme:   setLightTheme,
        setDarkTheme:    setDarkTheme
    };
});
