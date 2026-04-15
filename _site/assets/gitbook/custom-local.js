function initStarfield() {
    const starfield = document.querySelector('.starfield');
    if (!starfield) return;   // page has no starfield — do nothing

    // Clear any stars left from a previous visit to this page
    starfield.querySelectorAll('div').forEach(el => el.remove());

    const sizes = [1, 1, 2, 3, 4];

    function randomPosition(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    for (let i = 0; i < 300; i++) {
        const top  = randomPosition(1, 100);
        const left = randomPosition(1, 100);
        const randomSize = sizes[Math.floor(Math.random() * sizes.length)];
        const div = document.createElement('div');
        div.style.position        = 'absolute';
        div.style.top             = top  + '%';
        div.style.left            = left + '%';
        div.style.height          = randomSize + 'px';
        div.style.width           = randomSize + 'px';
        div.style.backgroundColor = '#FFFFFF';
        div.style.borderRadius    = '50%';

        if      (i <=  50) div.classList.add('star1');
        else if (i <= 100) div.classList.add('star2');
        else if (i <= 150) div.classList.add('star3');
        else if (i <= 200) div.classList.add('star4');
        else if (i <= 250) div.classList.add('star5');
        else               div.classList.add('star6');

        starfield.appendChild(div);
    }
}

gitbook.events.on('page.change', initStarfield);

function initHeadingAnchors() {
    document.querySelectorAll('.markdown-section h2, .markdown-section h3').forEach(function(heading) {
        if (!heading.id || heading.querySelector('.heading-anchor')) return;
        var a = document.createElement('a');
        a.className = 'heading-anchor';
        a.href = '#' + heading.id;
        a.setAttribute('aria-label', 'Link to this section');
        var icon = document.createElement('i');
        icon.className = 'fa fa-link';
        a.appendChild(icon);
        a.addEventListener('click', function(e) {
            e.preventDefault();
            var url = window.location.origin + window.location.pathname + '#' + heading.id;
            history.pushState(null, '', '#' + heading.id);
            if (navigator.clipboard) {
                navigator.clipboard.writeText(url).then(function() {
                    a.classList.add('copied');
                    setTimeout(function() { a.classList.remove('copied'); }, 1500);
                });
            }
        });
        heading.appendChild(a);
    });
}

gitbook.events.on('page.change', initHeadingAnchors);