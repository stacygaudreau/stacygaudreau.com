/* -------------------------------------------------------------------------- */
/*                                MAIN SCRIPTS                                */
/* -------------------------------------------------------------------------- */

/* ------------------------------ Global State ------------------------------ */
let state = {
  isScrolled: false,
};

let navBar;

const queryPrevElementForTitleString = (
  elem,
  classToApply,
  parentClass = 'highlight'
) => {
  const tagNameSought = 'P';
  const delimiter = '\\';
  let elemToUse = elem.parentElement.classList.contains(parentClass)
    ? elem.parentElement
    : elem;
  let prev = elemToUse.previousElementSibling;
  if (
    prev.tagName === tagNameSought &&
    prev.innerHTML.charAt(0) === delimiter
  ) {
    // -> it is indeed a title string, so:
    // 1. rewrite the inner html string
    prev.innerHTML = prev.innerHTML.slice(1).trim();
    // 2. add the style class
    prev.classList.add(classToApply);
    // 3. return the node so that it can be restyled
    return prev;
  } else return false;
};

function replaceBlockquoteTitles() {
  let blockquotes = Array.from(
    document.getElementsByTagName('blockquote')
  ).forEach(quote => {
    queryPrevElementForTitleString(quote, 'blockquote__title');
    addShadowLayersToPane(quote);
  });
  let codeblocks = Array.from(document.getElementsByTagName('pre')).forEach(
    block => {
      addShadowLayersToPane(block);
      queryPrevElementForTitleString(block, 'codeblock__title');
    }
  );
}

function addShadowLayersToPane(paneElem, nLayers = 2) {
  paneElem.style.position = 'relative';
  for (let n = nLayers; n > 0; n--) {
    let shadow = document.createElement('div');
    shadow.classList.add('pane__shadow', 'pane__shadow--corner-t-r');
    paneElem.appendChild(shadow);
  }
}

/* ------------------------------ Document Load ----------------------------- */
window.addEventListener('DOMContentLoaded', e => {
  // init
  navBar = document.getElementById('navbar');
  window.onscroll = scrollHandler;
  replaceBlockquoteTitles();
});

// /* ---------------------------- Open Nav Pulldown --------------------------- */
// function openNavPulldown() {
//   toggleNavPulldown(state.navIsOpen);
//   state.navIsOpen = true;
// }

// /* --------------------------- Close Nav Pulldown --------------------------- */
// function closeNavPulldown() {
//   toggleNavPulldown(state.navIsOpen);
//   state.navIsOpen = false;
// }

// /* ----------------------- Toggle Nav Pulldown Classes ---------------------- */
// function toggleNavPulldown(navIsOpen) {
//   navPulldown.classList.remove(
//     `nav-pulldown--${navIsOpen ? 'open' : 'closed'}`
//   );
//   navPulldown.classList.add(`nav-pulldown--${navIsOpen ? 'closed' : 'open'}`);
// }

/* ----------------------------- Scroll Handler ----------------------------- */
function scrollHandler() {
  if (scrollY > 0) {
    if (!state.isScrolled) navBar.classList.add('navbar--opaque');
    state.isScrolled = true;
  } else {
    navBar.classList.remove('navbar--opaque');
    state.isScrolled = false;
  }
}
