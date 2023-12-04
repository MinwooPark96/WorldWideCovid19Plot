// Adapted from https://observablehq.com/@d3/multi-line-chart/2

function MultiLine(
  selector,
  { data, dates, selectedMetric, selectedDateIndex, selectedLocations } = {}
) {
  const el = document.querySelector(selector);

  const outerContainer = d3.select(el);

  const title = outerContainer.append('h2');

  const container = outerContainer.append('div').attr('class', 'multi-line');

  const width = container.node().clientWidth;
  const height = 200;
  const marginTop = 30;
  const marginRight = 20;
  const marginBottom = 20;
  const marginLeft = 50;

  const xScale = d3
    .scaleTime()
    .domain(d3.extent(dates))
    .range([marginLeft, width - marginRight]);

  const yScale = d3
    .scaleLinear()
    .rangeRound([height - marginBottom, marginTop]);

  const colorScale = d3
    .scaleOrdinal()
    .domain(selectedLocations)
    .range(['#66C5CC', '#F6CF71', '#F89C74', '#DCB0F2', '#87C55F'])
    .unknown('#B3B3B3');

  const line = d3
    .line()
    .x((d, i) => xScale(dates[i]))
    .y((d) => yScale(d));

  const svg = container
    .append('svg')
    .attr('width', width)
    .attr('height', height);

  // Add x axis
  svg
    .append('g')
    .attr('transform', `translate(0,${height - marginBottom})`)
    .call(
      d3
        .axisBottom(xScale)
        .ticks(width / 100)
        .tickSizeOuter(0)
    )
    .call((g) => g.select('.domain').remove());

  // Add y axis
  const yAxisGroup = svg
    .append('g')
    .attr('transform', `translate(${marginLeft},0)`);

  // Add y axis title
  const yTitle = svg
    .append('text')
    .attr('class', 'axis-title')
    .attr('y', marginTop - 10);

  let linePath = svg.append('g').attr('class', 'lines').selectAll('.line');

  const dateLine = svg
    .append('line')
    .attr('class', 'date-line')
    .attr('y1', marginTop)
    .attr('y2', height - marginBottom);

  // Add tooltip highlight
  const highlightGroup = svg
    .append('g')
    .attr('class', 'highlight')
    .style('display', 'none');

  highlightGroup
    .append('line')
    .attr('class', 'highlight-line')
    .attr('y1', marginTop)
    .attr('y2', height - marginBottom);

  let highlightCircle = highlightGroup.selectAll('.highlight-circle');

  const tooltip = d3
    .select('body')
    .append('div')
    .attr('class', 'tooltip')
    .style('display', 'none');

  svg.on('mouseenter', entered).on('mousemove', moved).on('mouseleave', left);

  redraw();

  function redraw() {
    if (selectedLocations.length === 0) return;

    title.text(`${selectedMetric} from selected countries over time`);

    const lineData = selectedLocations.map((location) =>
      data.get(selectedMetric).get(location)
    );
    yScale.domain([0, d3.max(lineData, (d) => d.maxValue)]).nice();

    yAxisGroup
      .call(d3.axisLeft(yScale).ticks(height / 50, 's'))
      .call((g) => g.select('.domain').remove());

    yTitle.text(`${selectedMetric} count`);

    linePath = linePath
      .data(lineData, (d) => d.location)
      .join((enter) =>
        enter.append('path').attr('class', 'line').attr('stroke-width', 1.5)
      )
      .attr('stroke', (d) => colorScale(d.location))
      .attr('d', (d) => line(d.values));

    dateLine.attr(
      'transform',
      `translate(${xScale(dates[selectedDateIndex])},0)`
    );
  }

  function entered() {
    highlightGroup.style('display', null);

    tooltip.datum(undefined).style('display', null);
  }

  function moved(event) {
    const [xm] = d3.pointer(event);
    const i = d3.leastIndex(dates, (date) => Math.abs(xScale(date) - xm));
    if (tooltip.datum() !== i) {
      tooltip.datum(i);
      updateTooltipContent();

      highlightGroup.attr('transform', `translate(${xScale(dates[i])},0)`);

      highlightCircle = highlightCircle
        .data(selectedLocations)
        .join((enter) =>
          enter.append('circle').attr('class', 'highlight-circle').attr('r', 6)
        )
        .attr('fill', (location) => colorScale(location))
        .attr('cy', (location) =>
          yScale(data.get(selectedMetric).get(location).values[i])
        );
    }
    tooltip
      .style('left', event.pageX + 10 + 'px')
      .style('top', event.pageY + 'px')
      .style('transform', 'translate(0%,-100%)');
  }

  function left() {
    highlightGroup.style('display', 'none');

    tooltip.datum(undefined).style('display', 'none');
  }

  function updateTooltipContent() {
    tooltip.html(
      (i) => `
      <div>${dates[i].toISOString().split('T')[0]}</div>
      <table><tbody>
      ${selectedLocations
        .map((location) => {
          const value = data.get(selectedMetric).get(location).values[i];
          return `<tr style="color: ${colorScale(location)}">
          <td>${location}</td>
          <td>${d3.format(',')(value)}</td>
        </tr>`;
        })
        .join('')}
      </tbody></table>
      `
    );
  }

  function updateMetric(newMetric) {
    selectedMetric = newMetric;
  }

  function updateDateIndex(newDateIndex) {
    selectedDateIndex = newDateIndex;
    dateLine.attr(
      'transform',
      `translate(${xScale(dates[selectedDateIndex])},0)`
    );
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
