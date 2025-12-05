import { set } from './utils/dom.js';
import { hash, qs } from './utils/routing.js';
import { Create } from './views/create.js';
import { Edit } from './views/edit.js';
import { Vote } from './views/vote.js';

function resolveRoute() {
  const currentHash = hash();
  const query = qs();
  if (currentHash === '#/vote') return Vote(query);
  if (currentHash === '#/edit') return Edit(query);
  return Create(query);
}

export function initRouter(appElement) {
  const render = () => set(appElement, resolveRoute());

  window.addEventListener('hashchange', render);
  render();
}
