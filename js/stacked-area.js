// Adapted from https://observablehq.com/@d3/normalized-stacked-area-chart/2

function StackedArea(
  selector,
  { data, dates, selectedMetric, selectedDateIndex, selectedLocations } = {}
) {
  const el = document.querySelector(selector);

  const outerContainer = d3.select(el);

  const title = outerContainer.append('h2');

  const container = outerContainer.append('div').attr('class', 'stacked-area');

  const width = container.node().clientWidth;
  const height = 200;
  const marginTop = 30;
  const marginRight = 20;
  const marginBottom = 20;
  const marginLeft = 50;

  const stack = d3
    .stack()
    .offset(d3.stackOffsetExpand)
    .value(
      (dateIndex, location) =>
        data.get(selectedMetric).get(location).values[dateIndex]
    );

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

  const area = d3
    .area()
    .x((d) => xScale(dates[d.data]))
    .y0((d) => yScale(d[0]))
    .y1((d) => yScale(d[1]));

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
  svg
    .append('g')
    .attr('transform', `translate(${marginLeft},0)`)
    .call(d3.axisLeft(yScale).ticks(height / 50, '%'))
    .call((g) => g.select('.domain').remove());

  let areaPath = svg.append('g').attr('class', 'areas').selectAll('.area');

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

    title.text(`% of ${selectedMetric} from selected countries over time`);

    stack.keys(selectedLocations);
    const series = stack(d3.range(dates.length));

    areaPath = areaPath
      .data(series, (d) => d.key)
      .join((enter) => enter.append('path').attr('class', 'area'))
      .attr('fill', (d) => colorScale(d.key))
      .attr('d', area);

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
        .data(areaPath.data())
        .join((enter) =>
          enter.append('circle').attr('class', 'highlight-circle').attr('r', 6)
        )
        .attr('fill', (d) => colorScale(d.key))
        .attr('cy', (d) => yScale(d[i][1]));
    }
    tooltip
      .style('left', event.pageX - 10 + 'px')
      .style('top', event.pageY + 'px')
      .style('transform', 'translate(-100%,-100%)'); // Move the tooltip to the left of the mouse so it doesn't overflow the page's right edge
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
      ${areaPath
        .data()
        .map((d) => {
          const percentage = d[i][1] - d[i][0];
          return `<tr style="color: ${colorScale(d.key)}">
          <td>${d.key}</td>
          <td>${d3.format('.1%')(percentage)}</td>
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
