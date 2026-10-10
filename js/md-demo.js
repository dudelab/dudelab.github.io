// Live Markdown preview rendered with the same parser used by MD Viewer.
(() => {
  const root = document.querySelector('[data-md-demo]');
  if (!root || !window.marked) return;
  const input = root.querySelector('textarea');
  const output = root.querySelector('[data-md-output]');
  marked.setOptions({ gfm: true, breaks: false });

  let frame = 0;
  const render = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      output.innerHTML = marked.parse(input.value);
      output.querySelectorAll('script, iframe, object, embed').forEach((el) => el.remove());
      output.querySelectorAll('*').forEach((el) => {
        for (const a of [...el.attributes]) if (/^on/i.test(a.name)) el.removeAttribute(a.name);
      });
      output.querySelectorAll('a').forEach((a) => {
        a.target = '_blank';
        a.rel = 'noopener';
      });
    });
  };
  input.addEventListener('input', render);
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    input.setRangeText('  ', input.selectionStart, input.selectionEnd, 'end');
    render();
  });
  render();
})();
