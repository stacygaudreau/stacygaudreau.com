/* -------------------------------------------------------------------------- */
/*                                MAIN SCRIPTS                                */
/* -------------------------------------------------------------------------- */

/* ------------------------------ NavBar State ------------------------------ */
let state = {
  isScrolled: false,
};
let navBar;

import HugoContentHelpers from './HugoContentHelpers';
import Lightbox from './SimpleLightbox';

/* ------------------------------ Document Load ----------------------------- */
window.addEventListener('DOMContentLoaded', e => {
  // init
  navBar = document.getElementById('navbar');
  window.onscroll = scrollHandler;
  HugoContentHelpers.replaceBlockquoteTitles();
  if (scrollY > 0) {
    setScrollTrue();
  }
  Lightbox.initAll();
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
