function Legend(selector, { selectedLocations } = {}) {
  const el = document.querySelector(selector);

  const legendContainer = d3
    .select(el)
    .append('div')
    .attr('class', 'color-legend');

  const colorScale = d3
    .scaleOrdinal()
    .domain(selectedLocations)
    .range(['#66C5CC', '#F6CF71', '#F89C74', '#DCB0F2', '#87C55F'])
    .unknown('#B3B3B3');

  redraw();

  function redraw() {
    if (selectedLocations.length === 0) return;

    legendContainer
      .selectAll('.legend-item')
      .data(selectedLocations)
      .join((enter) => enter.append('div').attr('class', 'legend-item'))
      .style('color', (d) => colorScale(d))
      .text((d) => d);
  }

  function updateLocations(newLocations) {
    selectedLocations = newLocations;
    colorScale.domain(selectedLocations);
  }

  return {
    updateLocations,
    redraw,
  };
}
