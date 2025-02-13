import { fetchJSON, renderProjects, fetchGitHubData } from '../global.js';
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
if (projectsContainer) {
  renderProjects(projects, projectsContainer, 'h2');
}
else {
  console.error("projectsContainer is empty")
}

// Lab 5: Step 1.3: Drawing our circle path with D3
let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
let searchInput = document.querySelector('.searchBar');
let selectedIndex = -1;

// Refactor all plotting into one function
function renderPieChart(projectsGiven) {
  let svg = d3.select('svg');
  svg.selectAll('path').remove();
  let legend = d3.select('.legend');
  legend.selectAll('li').remove();

  // re-calculate rolled data
  let rolledData = d3.rollups(
    projectsGiven,
    (v) => v.length,
    (d) => d.year,
  );
  // re-calculate data
  let data = rolledData.map(([year, count]) => {
    return { value: count, label: year };
  });
  // re-calculate slice generator, arc data, arc, etc.
  let sliceGenerator = d3.pie().value((d) => d.value);

  let arcData = sliceGenerator(data);
  let arcs = arcData.map((d) => arcGenerator(d));
  let colors = d3.scaleOrdinal(d3.schemeTableau10);

  arcs.forEach((arc, idx) => {
    svg
      .append('path')
      .attr('d', arc)
      .attr('fill', colors(idx))
      .on('click', () => {
        selectedIndex = selectedIndex === idx ? -1 : idx;

        svg
          .selectAll('path')
          .attr('class', (_, idx) => (
            idx === selectedIndex ? 'selected' : ''
          ));
        legend
          .selectAll('li')
          .attr('class', (_, idx) => (
            idx === selectedIndex ? 'selected' : ''
          ));
        if (selectedIndex === -1) {
          renderProjects(projects, projectsContainer, 'h2');
        } else {
          let selectedYear = data[selectedIndex].label;
          let filteredProjects = projects.filter(project => project.year === selectedYear);
          renderProjects(filteredProjects, projectsContainer, 'h2');
        }
      });
  });

  // update paths and legends, refer to steps 1.4 and 2.2
  data.forEach((d, idx) => {
    legend.append('li')
      .attr('style', `--color:${colors(idx)}`) // set the style attribute while passing in parameters
      .attr('class', 'legend-element')
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`) // set the inner html of <li>
      .on('click', () => {
        selectedIndex = selectedIndex === idx ? -1 : idx;

        svg
          .selectAll('path')
          .attr('class', (_, idx) => (
            idx === selectedIndex ? 'selected' : null
          ));
        legend
          .selectAll('li')
          .attr('class', (_, idx) => (
            idx === selectedIndex ? 'selected' : null
          ));
        if (selectedIndex === -1) {
          renderProjects(projects, projectsContainer, 'h2');
        } else {
          let selectedYear = data[selectedIndex].label;
          let filteredProjects = projects.filter(project => project.year === selectedYear);
          renderProjects(filteredProjects, projectsContainer, 'h2');
        }
      });
  });
}

// Call this function on page load
renderPieChart(projects);

searchInput.addEventListener('input', (event) => {
  let query = event.target.value;
  let filteredProjects = projects.filter((project) => {
    let values = Object.values(project).join('\n').toLowerCase();
    return values.includes(query.toLowerCase());
  });
  // re-render legends and pie chart when event triggers
  renderProjects(filteredProjects, projectsContainer, 'h2');
  renderPieChart(filteredProjects);
});
