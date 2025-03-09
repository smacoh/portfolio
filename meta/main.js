let data = [];
let commits = [];
let selectedCommits = [];
let visibleCommits = [];
let visibleFileCommits = [];
let visibleFileLines = [];
let visibleLines = [];
let fileTypeColors = d3.scaleOrdinal(d3.schemeTableau10);
let xScale, yScale;
let NUM_ITEMS;
let ITEM_HEIGHT = 120;
let VISIBLE_COUNT = 14;
let totalHeight;
const itemsContainer = d3.select("#items-container");
const fileItemsContainer = d3.select("#file-items-container");

async function loadData() {
    data = await d3.csv('loc.csv', (row) => ({
        ...row,
        line: Number(row.line),
        depth: Number(row.depth),
        length: Number(row.length),
        date: new Date(row.date + 'T00:00' + row.timezone),
        datetime: new Date(row.datetime),
    }));
    displayStats();
}

function processCommits() {
    commits = d3
        .groups(data, (d) => d.commit)
        .map(([commit, lines]) => {
            let first = lines[0];
            let { author, date, time, timezone, datetime } = first;
            let ret = {
                id: commit,
                url: 'https://github.com/smacoh/portfolio/commit/' + commit,
                author,
                date,
                time,
                timezone,
                datetime,
                hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
                totalLines: lines.length,
                linesEdited: lines.length,
            };
            Object.defineProperty(ret, 'lines', { value: lines, enumerable: false, writable: false, configurable: false });
            return ret;
        });
    commits = d3.sort(commits, (a, b) => d3.ascending(a.datetime, b.datetime));
}

function displayStats() {
    processCommits();
    if (visibleCommits.length === 0) {
        visibleCommits = commits;
        visibleLines = data;
    }
    const dl = d3.select('#stats').append('dl').attr('class', 'stats');
    dl.append('dt').text('Total commits');
    dl.append('dd').text(visibleCommits.length);
    dl.append('dt').text('Files');
    dl.append('dd').text(d3.groups(visibleLines, (d) => d.file).length);
    dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
    dl.append('dd').text(visibleLines.length);
    dl.append('dt').text('Max File Length');
    dl.append('dd').text(d3.max(visibleLines, (d) => d.line));
    dl.append('dt').text('Avg File Length');
    dl.append('dd').text(d3.mean(d3.rollups(visibleLines, (v) => d3.max(v, (d) => d.line), (d) => d.file), (d) => d[1]).toFixed(2));
    const workByPeriod = d3.rollups(visibleLines, (v) => v.length, (d) => new Date(d.datetime).toLocaleString('en', { dayPeriod: 'short' }));
    const maxPeriod = d3.greatest(workByPeriod, (d) => d[1])?.[0];
    dl.append('dt').text('Most Active');
    dl.append('dd').text(maxPeriod);
}

function displayCommitFiles() {
    visibleFileLines = visibleFileCommits.flatMap(commit => commit.lines || []);
    let files = d3.groups(visibleFileLines, d => d.file).map(([name, lines]) => ({ name, lines }));
    files = d3.sort(files, (a, b) => d3.descending(a.lines.length, b.lines.length));
    d3.select('.files').selectAll('div').remove();
    let filesContainer = d3.select('.files').selectAll('div').data(files).enter().append('div');
    filesContainer.append('dt').html(d => `<code>${d.name}</code><small>${d.lines.length} lines</small>`);
    let dd = filesContainer.append('dd');
    dd.selectAll('.line').data(d => d.lines).enter().append('div').attr('class', 'line').style('background', d => fileTypeColors(d.type));
}

function renderFileItems(sliceEndIndex) {
    const endIndex = sliceEndIndex;
    let newCommitSlice = visibleFileCommits.slice(0, endIndex);
    displayCommitFiles(newCommitSlice);
}

function renderItems(sliceEndIndex) {
    const endIndex = sliceEndIndex;
    let newCommitSlice = commits.slice(0, endIndex);
    d3.select('.brush').call(d3.brush().clear);
    d3.select('.brush').remove();
    updateScatterPlot(newCommitSlice);
}

function updateScatterPlot(visibleCommits) {
    const svg = d3.select('#chart').select('svg');
    xScale.domain(d3.extent(visibleCommits, (d) => d.datetime));
    svg.select('.x-axis').call(d3.axisBottom(xScale));
    const yScale = d3.scaleLinear().domain([0, 24]).range([600, 0]);
    const rScale = d3.scaleSqrt().domain(d3.extent(visibleCommits, (d) => d.totalLines)).range([6, 20]);
    const dots = svg.select('g.dots').selectAll('circle').data(visibleCommits, (d) => d.id);
    const enter = dots.enter().append('circle').attr('cx', (d) => xScale(d.datetime)).attr('cy', (d) => yScale(d.hourFrac)).attr('r', (d) => rScale(d.totalLines)).style('fill-opacity', 0.7).attr('fill', 'steelblue').on('mouseenter', function (event, commit) {
        d3.select(event.currentTarget).classed('selected', isCommitSelected(commit));
        d3.select(event.currentTarget).style('fill-opacity', 1);
        updateTooltipContent(commit);
        updateTooltipVisibility(true);
        updateTooltipPosition(event);
    }).on('mouseleave', function (event, commit) {
        d3.select(event.currentTarget).classed('selected', isCommitSelected(commit));
        d3.select(event.currentTarget).style('fill-opacity', 0.7);
        updateTooltipContent({});
        updateTooltipVisibility(false);
    });
    // Change durations below if you want to see transitions
    dots.transition().duration(1).ease(d3.easeCubic).attr('cx', (d) => xScale(d.datetime)).attr('cy', (d) => yScale(d.hourFrac)).attr('r', (d) => rScale(d.totalLines));
    dots.exit().transition().duration(1).attr('r', 0).remove();
    brushSelector();
}

function createScatterPlot() {
    const width = 1000;
    const height = 600;
    const margin = { top: 10, right: 10, bottom: 30, left: 20 };
    const sortedCommits = d3.sort(commits, (d) => -d.totalLines);
    xScale = d3.scaleTime().domain(d3.extent(commits, (d) => d.datetime)).range([0, width]).nice();
    yScale = d3.scaleLinear().domain([0, 24]).range([height, 0]);
    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };
    xScale.range([usableArea.left, usableArea.right]);
    yScale.range([usableArea.bottom, usableArea.top]);
    const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
    const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([6, 20]);
    const svg = d3.select('#chart').append('svg').attr('viewBox', `0 0 ${width} ${height}`).style('overflow', 'visible');
    const dots = svg.append('g').attr('class', 'dots');
    dots.selectAll('circle').data(sortedCommits).data(commits).join('circle').attr('cx', (d) => xScale(d.datetime)).attr('cy', (d) => yScale(d.hourFrac)).attr('r', (d) => rScale(d.totalLines)).style('fill-opacity', 0.7).attr('fill', 'steelblue').on('mouseenter', function (event, commit) {
        d3.select(event.currentTarget).classed('selected', isCommitSelected(commit));
        d3.select(event.currentTarget).style('fill-opacity', 1);
        updateTooltipContent(commit);
        updateTooltipVisibility(true);
        updateTooltipPosition(event);
    }).on('mouseleave', function (event, commit) {
        d3.select(event.currentTarget).classed('selected', isCommitSelected(commit));
        d3.select(event.currentTarget).style('fill-opacity', 0.7);
        updateTooltipContent({});
        updateTooltipVisibility(false);
    });
    const gridlines = svg.append('g').attr('class', 'gridlines').attr('transform', `translate(${usableArea.left}, 0)`);
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale).tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');
    svg.append('g').attr('class', 'x-axis').attr('transform', `translate(0, ${usableArea.bottom})`).call(xAxis);
    svg.append('g').attr('transform', `translate(${usableArea.left}, 0)`).call(yAxis);
    gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));
    gridlines.selectAll('line').style('stroke', (d) => d < 6 || d > 18 ? 'steelblue' : 'orange');
    brushSelector();
}

function updateTooltipContent(commit) {
    const link = document.getElementById('commit-link');
    const date = document.getElementById('commit-date');
    const time = document.getElementById('commit-time');
    const author = document.getElementById('commit-author');
    const linesEdited = document.getElementById('commit-lines-edited');
    if (Object.keys(commit).length === 0) return;
    link.href = commit.url;
    link.textContent = commit.id;
    date.textContent = commit.datetime?.toLocaleString('en', { dateStyle: 'full' });
    time.textContent = commit.datetime?.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
    author.textContent = commit.author || 'Unknown Author';
    linesEdited.textContent = commit.linesEdited || 'N/A';
}

function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('commit-tooltip');
    if (tooltip) tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.style.left = `${event.clientX}px`;
    tooltip.style.top = `${event.clientY}px`;
}

function brushSelector() {
    const svg = document.querySelector('svg');
    d3.select(svg).call(d3.brush().on('start brush end', brushed));
    d3.select(svg).selectAll('.dots, .overlay ~ *').raise();
}

function brushed(event) {
    const brushSelection = event.selection;
    selectedCommits = !brushSelection
        ? []
        : commits.filter((commit) => {
            const [[x0, y0], [x1, y1]] = brushSelection;
            return (
                xScale(commit.datetime) >= x0 &&
                xScale(commit.datetime) <= x1 &&
                yScale(commit.hourFrac) >= y0 &&
                yScale(commit.hourFrac) <= y1
            );
        });
    updateSelection();
    updateSelectionCount();
    updateLanguageBreakdown();
}

function isCommitSelected(commit) {
    return selectedCommits.includes(commit);
}

function updateSelection() {
    d3.selectAll('circle').classed('selected', (d) => isCommitSelected(d));
}

function updateSelectionCount() {
    const countElement = document.getElementById('selection-count');
    countElement.textContent = `${selectedCommits.length || 'No'} commits selected`;
}

function updateLanguageBreakdown() {
    const container = document.getElementById('language-breakdown');
    if (selectedCommits.length === 0) {
        container.innerHTML = '';
        return;
    }
    const lines = selectedCommits.flatMap((d) => d.lines);
    const breakdown = d3.rollup(lines, (v) => v.length, (d) => d.type);
    container.innerHTML = '';
    for (const [language, count] of breakdown) {
        const proportion = count / lines.length;
        const formatted = d3.format('.1~%')(proportion);
        container.innerHTML += `<dt>${language}</dt><dd>${count} lines (${formatted})</dd>`;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    processCommits();
    visibleCommits = commits;
    visibleLines = data;
    let allLines = visibleCommits.flatMap(commit => commit.lines || []);
    let files = d3.groups(allLines, (d) => d.file).map(([name, lines]) => ({ name, lines }));
    files = d3.sort(files, (a, b) => d3.descending(a.lines.length, b.lines.length));
    d3.select('.files').selectAll('div').remove();
    let filesContainer = d3.select('.files').selectAll('div').data(files).enter().append('div');
    filesContainer.append('dt').html(d => `<code>${d.name}</code><small>${d.lines.length} lines</small>`);
    let dd = filesContainer.append('dd');
    dd.selectAll('.line').data(d => d.lines).enter().append('div').attr('class', 'line').style('background', d => fileTypeColors(d.type));

    const fileScrollContainer = d3.select("#file-scroll-container");
    const fileSpacer = d3.select("#file-spacer");
    let NUM_ITEMS_FILES = commits.length;
    let VISIBLE_COUNT_FILES = 14;
    let totalHeightFiles = (NUM_ITEMS_FILES - 1) * ITEM_HEIGHT;
    fileSpacer.style("height", `${totalHeightFiles}px`);
    visibleFileCommits = commits;
    visibleFileCommits = data;
    let scrolledFiles = new Set();
    fileItemsContainer.selectAll('div').data(commits).enter().append('div').attr('class', 'file-item').html((commit, index) => {
        // Get the list of files in the current commit
        const currentFiles = new Set(commit.lines.map(line => line.file));
    
        // Get the list of files in all previous commits
        const previousFiles = new Set();
        for (let i = 0; i < index; i++) {
            commits[i].lines.forEach(line => previousFiles.add(line.file));
        }
    
        // Find new files created in this commit
        const newFiles = Array.from(currentFiles).filter(file => !previousFiles.has(file));
    
        // Generate the narrative
        let newFilesText = '';
        if (newFiles.length > 0) {
            newFilesText = ` This commit introduced ${newFiles.length} new file${newFiles.length > 1 ? 's' : ''}: 
                            ${newFiles.map(file => `<code>${file}</code>`).join(', ')}.`;
        }
    
        return `
            <p>
            On ${commit.datetime.toLocaleString("en", { dateStyle: "short", timeStyle: "short" })}, I made changes to 
            <a href="${commit.url}" style="text-decoration:none; color:#0000EE;" target="_blank">
                ${index > 0 ? 'several files' : 'the initial set of files'}.
            </a> This commit affected ${d3.rollups(commit.lines, D => D.length, d => d.file).length} files, including 
            ${d3.rollups(commit.lines, D => D.length, d => d.type).map(([type, count]) => `${count} ${type} lines`).join(', ')}.
            ${newFilesText} The changes were aimed at optimizing the code structure and improving maintainability.
            </p>
        `;
    }).style('top', (_, idx) => `${idx * ITEM_HEIGHT}px`);

    fileScrollContainer.on("scroll", () => {
        const scrollTop = fileScrollContainer.property("scrollTop");
        let startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
        startIndex = Math.max(0, Math.min(startIndex, visibleFileCommits.length - VISIBLE_COUNT_FILES));
        let scrolledCommits = Math.floor(scrollTop / ITEM_HEIGHT);
        scrolledCommits = 3 + scrolledCommits;
        let sliceEndIndex = scrolledCommits;
        if (scrollTop > 1190) sliceEndIndex = sliceEndIndex + 1;
        visibleFileCommits = commits.slice(0, sliceEndIndex);
        visibleFileCommits = d3.sort(visibleFileCommits, (a, b) => d3.ascending(a.datetime, b.datetime));
        visibleFileLines = data.filter(d => visibleFileCommits.some(commit => commit.id === d.commit));
        renderFileItems(sliceEndIndex);
    });

    const scrollContainer = d3.select("#scroll-container");
    const spacer = d3.select("#spacer");
    NUM_ITEMS = commits.length;
    VISIBLE_COUNT = commits.length;
    totalHeight = (NUM_ITEMS - 1) * ITEM_HEIGHT;
    spacer.style("height", '${totalHeight}px');

    itemsContainer.selectAll('div').data(commits).enter().append('div')
    .attr('class', 'item')
    .html((commit, index) => {
        return `
            <p>
            On ${commit.datetime.toLocaleString("en", { dateStyle: "short", timeStyle: "short" })}, I made 
            <a href="${commit.url}" style="text-decoration:none; color:#0000EE;" target="_blank">
                ${index > 0 ? 'a commit' : 'my first commit'}.
            </a> This commit involved editing ${commit.totalLines} lines across
            ${d3.rollups(commit.lines, D => D.length, d => d.file).length} files. The changes included updates to 
            ${d3.rollups(commit.lines, D => D.length, d => d.type).map(([type, count]) => `${count} ${type} lines`).join(', ')}.
            This commit was part of the ongoing effort to improve the codebase and address specific issues.
            </p>
        `;
    })
    .style('top', (_, idx) => `${idx * ITEM_HEIGHT}px`);

    scrollContainer.on("scroll", () => {
        const scrollTop = scrollContainer.property("scrollTop");
        let startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
        startIndex = Math.max(0, Math.min(startIndex, visibleCommits.length - VISIBLE_COUNT));
        let scrolledCommits = Math.floor(scrollTop / ITEM_HEIGHT);
        scrolledCommits = 3 + scrolledCommits;
        d3.select('.brush').call(d3.brush().clear);
        d3.select('.brush').remove();
        let sliceEndIndex = scrolledCommits;
        if (scrollTop > 1190) sliceEndIndex = sliceEndIndex + 1;
        visibleCommits = commits.slice(0, sliceEndIndex);
        visibleCommits = d3.sort(visibleCommits, (a, b) => d3.ascending(a.datetime, b.datetime));
        visibleLines = data.filter(d => visibleCommits.some(commit => commit.id === d.commit));
        d3.select("#stats").selectAll("*").remove();
        displayStats();
        renderItems(sliceEndIndex);
    });

    createScatterPlot();
    updateTooltipVisibility(false);
});