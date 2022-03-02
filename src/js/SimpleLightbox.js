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
    this.caption = this.getCaptionIfExists();
    this.createBackdrop();
    this.attachHandlers();
  }

  /** Select a potential sibling <figcaption> element from the target */
  getCaptionIfExists() {
    let caption = this.target.nextElementSibling;
    if (caption.nodeName === 'FIGCAPTION')
      return caption != 'undefined' ? caption : false;
    else return false;
  }

  /** Returns a clone of the container element to be inserted into
   * the lightbox.
   */
  cloneContainer() {
    let clone = this.target.cloneNode(true);
    clone.classList.remove('lightbox__target');
    clone.classList.add('lightbox__content');
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
    this.bd.appendChild(this.closeBtn);
    this.bd.appendChild(this.cloneContainer());
    document.body.appendChild(this.bd);
  }

  attachHandlers() {
    this.bd.addEventListener('click', () => {
      console.log('backdrop clicked');
    });
    this.closeBtn.addEventListener('click', () => {
      this.close();
    });
    this.target.addEventListener('click', () => {
      this.open();
    });
  }

  /** Call after DOM loads to initialise all instances present on DOM. */
  static initAll() {
    let lightboxes = Lightbox._getAllElementsByClassName().map(
      elem => new Lightbox(elem)
    );
    lightboxes.forEach(lightbox => lightbox.init());
  }

  static _genBackdropElement() {
    let bd = document.createElement('div');
    bd.classList.add('lightbox__backdrop');
    return bd;
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
