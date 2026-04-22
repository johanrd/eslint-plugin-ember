// Throwaway probe: does the DOM IDL reflection for boolean attrs really
// treat `autoplay="false"` as "on"?  Uses jsdom (already a devDep).
//
// Per the HTML spec:
//   - https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#boolean-attributes
//   - https://html.spec.whatwg.org/multipage/media.html#attr-media-autoplay
//
// Expectation: `element.autoplay === true` whenever the attribute is present,
// regardless of its value (empty string, "false", "autoplay", "hello").

const { JSDOM } = require('jsdom');

const cases = [
  '<audio autoplay></audio>',
  '<audio autoplay=""></audio>',
  '<audio autoplay="autoplay"></audio>',
  '<audio autoplay="false"></audio>',
  '<audio autoplay="hello"></audio>',
  '<audio></audio>',
  '<video autoplay="false" src="x.mp4"></video>',
];

const { document } = new JSDOM('<!doctype html><html><body></body></html>').window;

console.log('case'.padEnd(50), 'hasAttr', 'getAttr       ', '.autoplay IDL');
console.log('-'.repeat(90));

for (const html of cases) {
  document.body.innerHTML = html;
  const el = document.body.firstElementChild;
  console.log(
    html.padEnd(50),
    String(el.hasAttribute('autoplay')).padEnd(7),
    JSON.stringify(el.getAttribute('autoplay')).padEnd(14),
    el.autoplay
  );
}
