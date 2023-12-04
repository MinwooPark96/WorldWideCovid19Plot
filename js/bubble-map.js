// Adapted from https://observablehq.com/@d3/bubble-map/2
// https://observablehq.com/@d3/zoom-to-bounding-box
// https://observablehq.com/@d3/world-map-svg

function BubbleMap(
  selector,
  {
    data,
    dates,
    world,
    selectedMetric,
    selectedDateIndex,
    selectedLocations,
  } = {}
) {
  const el = document.querySelector(selector);

  const width = el.clientWidth;
  const height = el.clientHeight;
  const margin = 100;

  const radiusScale = d3
    .scaleSqrt()
    .domain([0, data.get(selectedMetric).maxValue])
    .range([0, 120]);

  const colorScale = d3
    .scaleOrdinal()
    .domain(selectedLocations)
    .range(['#66C5CC', '#F6CF71', '#F89C74', '#DCB0F2', '#87C55F'])
    .unknown('#B3B3B3');

  const projection = d3.geoNaturalEarth1().fitExtent(
    [
      [margin, margin],
      [width - margin, height - margin],
    ],
    { type: 'Sphere' }
  );
  const path = d3.geoPath(projection);

  const zoom = d3.zoom().scaleExtent([0.5, 8]).on('zoom', zoomed);

  let transform = d3.zoomIdentity;

  const container = d3.select(el).attr('class', 'bubble-map');
  const svg = container
    .append('svg')
    .attr('width', width)
    .attr('height', height);
  const g = svg.append('g');

  // Add land layer
  g.append('path')
    .attr('class', 'land')
    .datum(topojson.feature(world, world.objects.land))
    .attr('d', path);

  // Add borders layer
  g.append('path')
    .attr('class', 'borders')
    .datum(topojson.mesh(world, world.objects.countries, (a, b) => a !== b))
    .attr('d', path);

  let bubble = g.append('g').attr('class', 'bubbles').selectAll('.bubble');

  svg.call(zoom);

  const tooltip = d3
    .select('body')
    .append('div')
    .attr('class', 'tooltip')
    .style('display', 'none');

  redraw();

  function zoomed(event) {
    transform = event.transform;
    g.attr('transform', transform).attr('stroke-width', 1 / transform.k);
    bubble.attr(
      'r',
      (d) => radiusScale(d.values[selectedDateIndex]) / transform.k
    );
  }

  function redraw() {
    bubble = bubble
      .data([...data.get(selectedMetric).values()], (d) => d.location)
      .join((enter) =>
        enter
          .append('circle')
          .attr('class', 'bubble')
          .on('mouseover', overed)
          .on('mouseout', outed)
          .on('click', clicked)
      )
      .attr('r', (d) => radiusScale(d.values[selectedDateIndex]) / transform.k)
      .attr('transform', (d) => `translate(${projection([d.long, d.lat])})`)
      .attr('fill', (d) => colorScale(d.location));
  }

  function overed(event, d) {
    tooltip
      .datum(d)
      .style('left', event.pageX + 10 + 'px')
      .style('top', event.pageY + 10 + 'px')
      .style('display', 'block');
    updateTooltipContent();
  }

  function outed() {
    tooltip.datum(undefined).style('display', 'none');
  }

  function clicked(event, d) {
    const foundLocationIndex = selectedLocations.indexOf(d.location);
    let newLocations;
    if (foundLocationIndex === -1) {
      // Clicked location isn't in selected locations
      if (selectedLocations.length < 5) {
        // Less than max number of locations, add the clicked location
        newLocations = [...selectedLocations, d.location];
      } else {
        // Already max number of locations, replace the last one with the new noe
        newLocations = [...selectedLocations.slice(0, -1), d.location];
      }
    } else {
      // Clicked location is in selected locations, remove it
      newLocations = selectedLocations.filter(
        (d, i) => i !== foundLocationIndex
      );
    }
    container.dispatch('locationschange', { detail: newLocations });
  }

  function updateTooltipContent() {
    tooltip.html(
      (d) =>
        `<div>${d.location}</div><div>${
          dates[selectedDateIndex].toISOString().split('T')[0]
        }</div><div>${d3.format(',')(
          d.values[selectedDateIndex]
        )} ${selectedMetric}</div>`
    );
  }

  function updateMetric(newMetric) {
    selectedMetric = newMetric;
    radiusScale.domain([0, data.get(selectedMetric).maxValue]);
  }

  function updateDateIndex(newDateIndex) {
    selectedDateIndex = newDateIndex;
    // When the user is hovering over a bubble, and the animation is playing, we need to update the tooltip content to be in sync with the new date
    if (tooltip.datum() !== undefined) updateTooltipContent();
  }

  function updateLocations(newLocations) {
    selectedLocations = newLocations;
    colorScale.domain(selectedLocations);
  }

  return {
    updateMetric,
    updateDateIndex,
    updateLocations,
    redraw,
  };
}
