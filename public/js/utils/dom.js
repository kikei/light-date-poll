/**
 * Create a DOM element with attributes and children.
 * Avoids side effects beyond constructing the element so it can be tested in isolation.
 * @param {string} tag - Tag name to create.
 * @param {Record<string, any>} attrs - Attributes or event handlers.
 * @param {...(Node|string)} children - Child nodes or text.
 * @returns {HTMLElement}
 */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') node.className = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    // Booleans need property assignment; setAttribute('disabled', false) still disables the element.
    else if (typeof value === 'boolean')
      key in node ? (node[key] = value) : value && node.setAttribute(key, '');
    else node.setAttribute(key, value);
  }
  for (const child of children)
    node.append(child.nodeType ? child : document.createTextNode(child));
  return node;
}

/**
 * Replace all children of the target node with the provided content.
 * @param {HTMLElement} target
 * @param {Node} content
 */
export function set(target, content) {
  target.innerHTML = '';
  target.append(content);
}
