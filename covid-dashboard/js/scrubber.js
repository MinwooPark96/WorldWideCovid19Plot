// Adapted from https://observablehq.com/@mbostock/scrubber
function Scrubber(
  selector,
  values,
  {
    format = (value) => value,
    initial = 0,
    direction = 1,
    delay = null,
    autoplay = true,
    loop = true,
    loopDelay = null,
    alternate = false,
  } = {}
) {
  values = Array.from(values);
  const el = document.querySelector(selector);
  el.innerHTML = `<form
    style="font: 12px var(--sans-serif); font-variant-numeric: tabular-nums; display: flex; height: 33px; align-items: center;"
  >
    <button
      name="b"
      type="button"
      style="margin-right: 0.4em; width: 5em;"
    ></button>
    <label style="display: flex; align-items: center; flex: 1;">
      <input
        name="i"
        type="range"
        min="0"
        max=${values.length - 1}
        value=${initial}
        step="1"
        style="flex: 1;"
      />
      <output name="o" style="margin-left: 0.4em;"></output>
    </label>
  </form>`;
  const form = el.querySelector('form');
  let frame = null;
  let timer = null;
  let interval = null;
  function start() {
    form.b.textContent = 'Pause';
    if (delay === null) frame = requestAnimationFrame(tick);
    else interval = setInterval(tick, delay);
  }
  function stop() {
    form.b.textContent = 'Play';
    if (frame !== null) cancelAnimationFrame(frame), (frame = null);
    if (timer !== null) clearTimeout(timer), (timer = null);
    if (interval !== null) clearInterval(interval), (interval = null);

    // Update the selected date index when the scrubber is stopped
    const selectedDateIndex = form.i.valueAsNumber;
    updateSelectedDateIndex(selectedDateIndex);
  }
  function running() {
    return frame !== null || timer !== null || interval !== null;
  }
  function tick() {
    if (
      form.i.valueAsNumber ===
      (direction > 0 ? values.length - 1 : direction < 0 ? 0 : NaN)
    ) {
      if (!loop) return stop();
      if (alternate) direction = -direction;
      if (loopDelay !== null) {
        if (frame !== null) cancelAnimationFrame(frame), (frame = null);
        if (interval !== null) clearInterval(interval), (interval = null);
        timer = setTimeout(() => (step(), start()), loopDelay);
        return;
      }
    }
    if (delay === null) frame = requestAnimationFrame(tick);
    step();
  }
  function step() {
    form.i.valueAsNumber =
      (form.i.valueAsNumber + direction + values.length) % values.length;
    form.i.dispatchEvent(new CustomEvent('input', { bubbles: true }));
  }
  form.i.oninput = (event) => {
    if (event && event.isTrusted && running() && !autoplay) stop();
    form.value = values[form.i.valueAsNumber];
    form.o.value = format(form.value, form.i.valueAsNumber, values);
  };
  form.b.onclick = () => {
    if (running()) return stop();
    direction =
      alternate && form.i.valueAsNumber === values.length - 1 ? -1 : 1;
    form.i.valueAsNumber = (form.i.valueAsNumber + direction) % values.length;
    form.i.dispatchEvent(new CustomEvent('input', { bubbles: true }));
    start();
  };
  form.i.oninput();
  if (autoplay) start();
  else stop();
  return form;
}
