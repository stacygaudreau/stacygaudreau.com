/* -------------------------------------------------------------------------- */
/*                           Hugo Table of Contents                           */
/* -------------------------------------------------------------------------- */

class TableOfContents {
  constructor() {
    this.isOpenState = false;
  }

  /** Initialises ToC on DOM if present */
  init() {
    this.nav = document.getElementById('TableOfContents');
    if (this.nav !== null) {
      this._getAllElements();
      this._attachEventListeners();
    }
  }

  _getAllElements() {
    this.pane = this.nav.parentElement;
    this.openBtn = Array.from(this.pane.getElementsByClassName('btn'))[0];
  }

  _attachEventListeners() {
    this.openBtn.addEventListener('click', () => {
      this._setIsOpen(!this.isOpenState);
    });
  }

  _setIsOpen = newIsOpenState => {
    if (newIsOpenState !== this.isOpenState) {
      this.isOpenState = newIsOpenState;
      this._setClasses(this.isOpenState);
    }
  };

  _setClasses(isOpen) {
    this.pane.classList.add(isOpen ? 'toc--is-open' : 'toc--is-closed');
    this.pane.classList.remove(isOpen ? 'toc--is-closed' : 'toc--is-open');
  }
}

export default TableOfContents;
