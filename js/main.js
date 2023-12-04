// Load data
Promise.all([
  d3.csv('data/time_series_covid19_confirmed_global.csv'),
  d3.csv('data/time_series_covid19_difference_global.csv'),
  d3.csv('data/time_series_covid19_deaths_global.csv'),
  d3.csv('data/time_series_covid19_recovered_global.csv'),
  d3.json('data/countries-50m.json'),
]).then(([cases, difference, deaths, recovery, world]) => {
  const data = new Map();
  data.set('cases', processCSVValues(cases));
  data.set('new cases', processCSVValues(difference));
  data.set('deaths', processCSVValues(deaths));
  data.set('recovery', processCSVValues(recovery));
  const dates = processCSVDates(cases);

  let selectedMetric = 'cases';
  let selectedDateIndex = 0;
  let selectedLocations = [];

  const legend = Legend('#legend', {
    selectedLocations,
  });

  const bubbleMap = BubbleMap('#bubbleMap', {
    data,
    dates,
    world,
    selectedMetric,
    selectedDateIndex,
    selectedLocations,
  });

  const multiLine = MultiLine('#multiLine', {
    data,
    dates,
    selectedMetric,
    selectedDateIndex,
    selectedLocations,
  });

  const stackedArea = StackedArea('#stackedArea', {
    data,
    dates,
    selectedMetric,
    selectedDateIndex,
    selectedLocations,
  });

  const scrubber = Scrubber('#scrubber', dates, {
    format: (date) => date.toISOString().split('T')[0],
    initial: selectedDateIndex,
    delay: 350,
    loop: false,
    autoplay: true,
  });

  const footer = d3.select('footer').style('display', 'none');

  // Add event listener to the scrubber's play/pause button
  const playPauseButton = scrubber.querySelector('button[name="b"]');
  playPauseButton.addEventListener('click', () => {
    if (scrubber.running()) {
      scrubber.stop(); // If playing, stop on button click
    } else {
      scrubber.start(); // If paused, start on button click
    }
  });

  // Populate the date selector dropdown
  const dateSelector = document.getElementById('dateSelector');
  dates.forEach((date, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.text = date.toISOString().split('T')[0];
    dateSelector.add(option);
  }); 

  // Add an event listener to handle the selected date
  dateSelector.addEventListener('change', (event) => {
    const selectedDateIndex = parseInt(event.target.value, 10);
    // scrubber.stop();
    updateSelectedDateIndex(selectedDateIndex);
    updateSliderFromDateIndex(selectedDateIndex);
    // // Resume the scrubber if it was playing
    // if (scrubber.running()) {
    //   scrubber.start();
    // }
  });

  // Add event listener to the reset button
  const resetButton = document.getElementById('resetButton');
  resetButton.addEventListener('click', () => {
    resetCharts();
  });

  function resetCharts() {
    selectedLocations = [];

    // Update charts with reset values
    bubbleMap.updateMetric(selectedMetric);
    bubbleMap.updateDateIndex(selectedDateIndex);
    bubbleMap.updateLocations(selectedLocations);
    bubbleMap.redraw();

    multiLine.updateMetric(selectedMetric);
    multiLine.updateDateIndex(selectedDateIndex);
    multiLine.updateLocations(selectedLocations);
    multiLine.redraw();

    stackedArea.updateMetric(selectedMetric);
    stackedArea.updateDateIndex(selectedDateIndex);
    stackedArea.updateLocations(selectedLocations);
    stackedArea.redraw();

    // Hide the footer
    footer.style('display', 'none');
  }
  // Add event listener to update the selected date index when the scrubber is manually adjusted
  d3.select(scrubber).on('input', (event) => {
    updateSelectedDateIndex(event.target.valueAsNumber);
    scrubber.userInteraction = true;
  });

  d3.select(scrubber).on('change', (event) => {
    // Use the change event to listen to the user dragging the slider. The change event only fires when the user stops dragging.
    updateSelectedDateIndex(event.target.valueAsNumber);
    // scrubber.start();
  });

  d3.select('#metric').on('change', (event) => {
    updateSelectedMetric(event.target.value);
  });

  d3.select('#bubbleMap').on('locationschange', (event) => {
    // Listen to custom locationschange event fired by the map component
    updateSelectedLocations(event.detail);
  });

  function updateSelectedDateIndex(newDateIndex) {
    selectedDateIndex = newDateIndex;

    bubbleMap.updateDateIndex(selectedDateIndex);
    bubbleMap.redraw();

    multiLine.updateDateIndex(selectedDateIndex);
    multiLine.redraw();

    stackedArea.updateDateIndex(selectedDateIndex);
    stackedArea.redraw();

    // // Update the dropdown
    // dateSelector.value = selectedDateIndex;
    
    // Update the dropdown only if the change is not from the scrubber
    if (!scrubber.userInteraction) {
      dateSelector.value = selectedDateIndex;
    }
  }

  function updateSliderFromDateIndex(dateIndex) {
    // Update the slider from the selected date index
    scrubber.i.valueAsNumber = dateIndex;
    scrubber.i.dispatchEvent(new Event('input', { bubbles: true }));

  }  

  function updateSelectedMetric(newMetric) {
    selectedMetric = newMetric;
    bubbleMap.updateMetric(selectedMetric);
    multiLine.updateMetric(selectedMetric);
    stackedArea.updateMetric(selectedMetric);

    // Not all locations are in all datasets, if a selected location isn't in the newly selected dataset, we need to remove it
    const newLocations = selectedLocations.filter((d) =>
      data.get(selectedMetric).has(d)
    );
    if (newLocations.length !== selectedLocations.length) {
      updateSelectedLocations(newLocations);
    } else {
      bubbleMap.redraw();
      multiLine.redraw();
      stackedArea.redraw();
    }
  }

  function updateSelectedLocations(newLocations) {
    selectedLocations = newLocations;

    // Hide footer when no location is selected
    footer.style('display', selectedLocations.length > 0 ? null : 'none');

    legend.updateLocations(selectedLocations);
    legend.redraw();

    bubbleMap.updateLocations(selectedLocations);
    bubbleMap.redraw();

    multiLine.updateLocations(selectedLocations);
    multiLine.redraw();

    stackedArea.updateLocations(selectedLocations);
    stackedArea.redraw();
  }
});

function processCSVValues(csv) {
  const converted = csv.map((d) => {
    const values = csv.columns.slice(4).map((date) => +d[date]);
    return {
      location: [d['Province/State'], d['Country/Region']]
        .filter((d) => d !== '')
        .join(', '),
      lat: +d['Lat'],
      long: +d['Long'],
      values,
      maxValue: d3.max(values),
    };
  });

  // Manually add aggregated for the following countries
  const aggregatedCountries = [
    {
      country: 'Australia',
      lat: -25.2744,
      long: 133.7751,
    },
    {
      country: 'Canada',
      lat: 56.1304,
      long: -106.3468,
    },
    {
      country: 'China',
      lat: 35.8617,
      long: 104.1954,
    },
  ];
  const grouped = d3.group(csv, (d) => d['Country/Region']);
  aggregatedCountries.forEach((d) => {
    const rows = grouped.get(d.country);
    const values = csv.columns
      .slice(4)
      .map((date) => d3.sum(rows, (d) => +d[date]));
    converted.push({
      location: d.country,
      lat: d.lat,
      long: d.long,
      values,
      maxValue: d3.max(values),
    });
  });
  
  // Sort from the largest to the smallest so the large bubbles won't cover the small bubbles
  converted.sort((a, b) => d3.descending(a.maxValue, b.maxValue));

  // Use a Map to store the data so we can easily test whether the data contains a specific location
  const data = new Map(converted.map((d) => [d.location, d]));

  // Add max value to data. This is used to determine the largest bubble size
  data.maxValue = d3.max(converted, (d) => d.maxValue);

  return data;
}

function processCSVDates(csv) {
  const parseDate = d3.timeParse('%-m/%-d/%y');
  return csv.columns.slice(4).map(parseDate);
}
