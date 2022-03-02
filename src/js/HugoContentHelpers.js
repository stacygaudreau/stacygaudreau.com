//  Custom <blockquote> and <code> block content helpers for
//  rendering Hugo static content pages

class HugoContentHelpers {
  static replaceBlockquoteTitles() {
    let blockquotes = Array.from(
      document.getElementsByTagName('blockquote')
    ).forEach(quote => {
      HugoContentHelpers._queryPrevElementForTitleString(
        quote,
        'blockquote__title'
      );
      HugoContentHelpers._addShadowLayersToPane(quote);
    });
    let codeblocks = Array.from(document.getElementsByTagName('pre')).forEach(
      block => {
        HugoContentHelpers._addShadowLayersToPane(block);
        HugoContentHelpers._queryPrevElementForTitleString(
          block,
          'codeblock__title'
        );
      }
    );
  }

  static _queryPrevElementForTitleString(
    elem,
    classToApply,
    parentClass = 'highlight'
  ) {
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
  }

  static _addShadowLayersToPane(paneElem, nLayers = 2) {
    paneElem.style.position = 'relative';
    for (let n = nLayers; n > 0; n--) {
      let shadow = document.createElement('div');
      shadow.classList.add('pane__shadow', 'pane__shadow--corner-t-r');
      paneElem.appendChild(shadow);
    }
  }
}

export default HugoContentHelpers;
