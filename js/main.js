/* -------------------------------------------------------------------------- */
/*                                MAIN SCRIPTS                                */
/* -------------------------------------------------------------------------- */

/* ------------------------------ Global State ------------------------------ */
let state = {
  isScrolled: false,
};

let navBar;

/* ------------------------------ Document Load ----------------------------- */
window.addEventListener('DOMContentLoaded', e => {
  // init
  navBar = document.getElementById('navbar');
  window.onscroll = scrollHandler;
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
