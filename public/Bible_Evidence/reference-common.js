export const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const bookOf = passage => passage.replace(/\s+\d.*$/,'').trim();
export const bibleLink = passage => `<a href="https://www.biblegateway.com/passage/?search=${encodeURIComponent(passage)}&amp;version=KJV" target="_blank" rel="noopener noreferrer">${escape(passage)}</a>`;
export const sourceLink = source => `<a href="${escape(source.url)}" target="_blank" rel="noopener noreferrer">${escape(source.title)}</a>`;
export function pointUrl(id, book='', from='') {
  const params=new URLSearchParams({id});if(book)params.set('book',book);if(from)params.set('from',from);return `/Bible_Evidence/discovery.html?${params}`;
}
export function quoteMarkup(quote, full=false) {
  return `<blockquote class="scripture-quote"><p>“${escape(full?quote.fullText:quote.text)}”</p><cite>${escape(quote.reference)} · ${escape(quote.translation)}${!full&&quote.isExcerpt?' · excerpt':''}</cite></blockquote>`;
}
export async function loadData() {
  const response=await fetch('/Bible_Evidence/reference-data.json');if(!response.ok)throw new Error('Dataset unavailable');return response.json();
}
