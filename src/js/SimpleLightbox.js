/* -------------------------------------------------------------------------- */
/*                               Simple Lightbox                              */
/* -------------------------------------------------------------------------- */

class Lightbox {
  /**
   * Simple responsive image thumbnail/lightbox with close button, ESC
   * key binding and basic parameters.
   */
  constructor(containerElem) {
    this.target = containerElem;
  }

  /** Initialises the lightbox instance */
  init() {
    this.createBackdrop();
    this.attachEventListeners();
  }

  /** Select a potential sibling <figcaption> element from the target */
  getCaptionIfExists() {
    let caption = this.target.nextElementSibling;
    if (caption !== null) {
      if (caption.nodeName === 'FIGCAPTION')
        return caption !== 'undefined' ? caption : false;
      else return false;
    }
  }

  /** Returns a clone of the container element to be inserted into
   * the lightbox.
   */
  cloneContainer() {
    let clone = this.target.cloneNode(true);
    clone.classList.remove('lightbox__target');
    clone.classList.add('lightbox__media');
    return clone;
  }

  /** Closes the lightbox */
  close() {
    this.bd.classList.remove('lightbox__backdrop--visible');
    this.bd.classList.add('lightbox__backdrop--hidden');
  }

  /** Opens the lightbox */
  open() {
    this.bd.classList.remove('lightbox__backdrop--hidden');
    this.bd.classList.add('lightbox__backdrop--visible');
  }

  createBackdrop() {
    this.bd = Lightbox._genBackdropElement();
    this.closeBtn = Lightbox._genCloseBtnElement();
    this.bd.appendChild(
      Lightbox._genContent(
        this.cloneContainer(),
        Lightbox._genBackdropFooterRow(
          this.closeBtn,
          Lightbox._genCaptionElemOrDiv(this.getCaptionIfExists())
        )
      )
    );
    document.body.appendChild(this.bd);
  }

  attachEventListeners() {
    this.bd.addEventListener('click', e => {
      if (e.target === this.bd) {
        this.close();
      }
    });
    this.closeBtn.addEventListener('click', e => {
      e.stopPropagation();
      this.close();
    });
    this.target.addEventListener('click', () => {
      this.open();
    });
    document.addEventListener('keydown', ({ key }) => {
      if (key === 'Escape') this.close();
    });
  }

  /** Call after DOM loads to initialise all instances present on DOM.*/
  static initAll() {
    let lightboxes = Lightbox._getAllElementsByClassName().map(
      elem => new Lightbox(elem)
    );
    lightboxes.forEach(lightbox => lightbox.init());
  }

  static _genBackdropElement() {
    let bd = document.createElement('div');
    bd.classList.add('lightbox__backdrop');
    // bd.classList.add('lightbox__backdrop', 'lightbox__backdrop--hidden');
    return bd;
  }

  static _genBackdropFooterRow(closeBtnElem, captionElem) {
    let row = document.createElement('div');
    row.classList.add('lightbox__row');
    row.appendChild(captionElem);
    row.appendChild(closeBtnElem);
    return row;
  }

  static _genCaptionElemOrDiv(captionElem) {
    let caption = document.createElement(captionElem ? 'figcaption' : 'div');
    caption.classList.add('lightbox__caption');
    caption.innerHTML = captionElem ? captionElem.innerHTML : '';
    return caption;
  }

  static _genContent(media, row) {
    let content = document.createElement('div');
    content.classList.add('lightbox__content');
    content.appendChild(media);
    content.appendChild(row);
    return content;
  }

  static _genCloseBtnElement() {
    let btn = document.createElement('button');
    btn.classList.add('lightbox__close-btn');
    return btn;
  }

  /** Retrieves all Lightboxes as an array by classname */
  static _getAllElementsByClassName(className = 'lightbox__target') {
    return Array.from(document.getElementsByClassName(className));
  }
}

export default Lightbox;
