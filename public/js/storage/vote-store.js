const PREFIX = 'voted:';

const getKey = formId => PREFIX + formId;

const persist = (formId, votes) => {
  try {
    localStorage.setItem(getKey(formId), JSON.stringify(votes));
  } catch {
    /* ignore write errors */
  }
};

export function get(formId) {
  if (!formId) return [];
  try {
    return JSON.parse(localStorage.getItem(getKey(formId)) || '[]');
  } catch {
    return [];
  }
}

export function add(formId, date) {
  if (!formId || !date) return;
  const votes = get(formId);
  if (votes.includes(date)) return;
  votes.push(date);
  persist(formId, votes);
}

export function remove(formId, date) {
  if (!formId || !date) return;
  const votes = get(formId).filter(d => d !== date);
  persist(formId, votes);
}
