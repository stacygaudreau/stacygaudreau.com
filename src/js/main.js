/* -------------------------------------------------------------------------- */
/*                                MAIN SCRIPTS                                */
/* -------------------------------------------------------------------------- */

import HugoContentHelpers from './HugoContentHelpers';
import Lightbox from './SimpleLightbox';
import TableOfContents from './TableOfContents';

/* ------------------------------ NavBar State ------------------------------ */
let state = {
  isScrolled: false,
};
let navBar;
let toc = new TableOfContents();

/* ------------------------------ Document Load ----------------------------- */
window.addEventListener('DOMContentLoaded', e => {
  // init
  navBar = document.getElementById('navbar');
  window.onscroll = scrollHandler;
  HugoContentHelpers.replaceBlockquoteTitles();
  HugoContentHelpers.wrapTablesInContainer();
  if (scrollY > 0) {
    setScrollTrue();
  }
  Lightbox.initAll();
  toc.init();
});

/* ----------------------------- Scroll Handler ----------------------------- */
function setScrollTrue() {
  if (!state.isScrolled) navBar.classList.add('navbar--opaque');
  state.isScrolled = true;
}
function scrollHandler() {
  if (scrollY > 0) {
    setScrollTrue();
  } else {
    navBar.classList.remove('navbar--opaque');
    state.isScrolled = false;
  }
}
