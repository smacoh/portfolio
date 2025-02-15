let data = [];
let commits = [];
let brushSelection = null;

document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    createScatterplot();
});

function processCommits() {
    commits = d3
        .groups(data, (d) => d.commit)
        .map(([commit, lines]) => {
            let first = lines[0];
            let { author, date, time, timezone, datetime } = first;
            let ret = {
                id: commit,
                url: 'https://github.com/vis-society/lab-7/commit/' + commit,
                author,
                date,
                time,
                timezone,
                datetime,
                hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
                totalLines: lines.length,
            };

            Object.defineProperty(ret, 'lines', {
                value: lines,
                configurable: false,
                writable: false,
            });

            return ret;
        });
}

function displayStats() {
    // Process commits first
    processCommits();

    // Create the dl element
    const dl = d3.select('#stats').append('dl').attr('class', 'stats');

    // Add total LOC
    dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
    dl.append('dd').text(data.length);

    // Add total commits
    dl.append('dt').text('Total commits');
    dl.append('dd').text(commits.length);

    // Number of files in the codebase
    const numFiles = new Set(data.map(d => d.file)).size;
    dl.append('dt').text('Number of files')
    dl.append('dd').text(numFiles);

    // Average file length (in lines)
    const fileLineCounts = d3.rollups(
        data,
        (v) => d3.max(v, (d) => d.line),
        (d) => d.file
    );
    const avgFileLengthLines = d3.mean(fileLineCounts, (d) => d[1]);
    dl.append('dt').text('Average file length (in lines)');
    dl.append('dd').text(avgFileLengthLines.toFixed(2));

    // Average file length (in characters)
    const fileCharCounts = d3.rollups(
        data,
        (v) => d3.sum(v, (d) => d.length), // Sum of all line lengths per file
        (d) => d.file
    );
    const avgFileLengthChars = d3.mean(fileCharCounts, (d) => d[1]);
    dl.append('dt').text('Average file length (in characters)');
    dl.append('dd').text(avgFileLengthChars.toFixed(2));

    // Longest file (in lines)
    const longestFileLines = d3.max(
        d3.rollups(
            data,
            (v) => v.length, // Total lines per file
            (d) => d.file
        ),
        (d) => d[1] // Get the max line count
    );
    dl.append('dt').text('Longest file (by lines)');
    dl.append('dd').text(longestFileLines);
}

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


// Lab 6: Step 2: Visualizing time and day of commits in a scatterplot
let xScale;
let yScale;
function createScatterplot() {
    const width = 1000;
    const height = 600;
    const margin = { top: 10, right: 10, bottom: 30, left: 20 };
    const svg = d3
        .select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');
    xScale = d3
        .scaleTime()
        .domain(d3.extent(commits, (d) => d.datetime))
        .range([0, width])
        .nice();
    yScale = d3.scaleLinear().domain([0, 24]).range([height, 0]);
    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };
    // Update scales with new ranges
    xScale.range([usableArea.left, usableArea.right]);
    yScale.range([usableArea.bottom, usableArea.top]);
    // Add gridlines BEFORE the axes
    const gridlines = svg
        .append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`);
    // Create gridlines as an axis with no labels and full-width ticks
    gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));
    // Create the axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3
        .axisLeft(yScale)
        .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');
    // Add X axis
    svg
        .append('g')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .call(xAxis);
    // Add Y axis
    svg
        .append('g')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(yAxis);

    const colorScale = d3.scaleSequential(d3.interpolateRdYlBu).domain([0, 24]);
    const dots = svg.append('g').attr('class', 'dots');
    const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
    const rScale = d3
        .scaleSqrt() // Change only this line
        .domain([minLines, maxLines])
        .range([2, 30]);
    const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

    // Use sortedCommits in your selection instead of commits
    dots
        .selectAll('circle')
        .data(sortedCommits)
        .join('circle')
        .attr('cx', (d) => xScale(d.datetime))
        .attr('cy', (d) => yScale(d.hourFrac))
        .attr('fill', (d) => colorScale(d.hourFrac))
        .attr('r', (d) => rScale(d.totalLines))
        .style('fill-opacity', 0.7) // Add transparency for overlapping dots
        .on('mouseenter', (event, commit) => {
            d3.select(event.currentTarget).style('fill-opacity', 1); // Full opacity on hover
            updateTooltipContent(commit);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on('mouseleave', () => {
            d3.select(event.currentTarget).style('fill-opacity', 0.7); // Restore transparency
            updateTooltipContent({});
            updateTooltipVisibility(false);
        });
    brushSelector();
}

function updateTooltipContent(commit) {
    const link = document.getElementById('commit-link');
    const date = document.getElementById('commit-date');
    const time = document.getElementById('commit-time');
    const author = document.getElementById('commit-author');
    const lines = document.getElementById('commit-lines');

    if (Object.keys(commit).length === 0) return;

    link.href = commit.url;
    link.textContent = commit.id;
    date.textContent = commit.datetime?.toLocaleString('en', {
        dateStyle: 'full',
    });
    time.textContent = commit.time;
    author.textContent = commit.author;
    lines.textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.style.left = `${event.clientX + 10}px`;
    tooltip.style.top = `${event.clientY + 10}px`;
}

// Lab 6: Step 5: Brushing
function brushSelector() {
    const svg = document.querySelector('svg');
    // Create brush
    d3.select(svg).call(d3.brush());

    // Raise dots and everything after overlay
    d3.select(svg).selectAll('.dots, .overlay ~ *').raise();
    d3.select(svg).call(d3.brush().on('start brush end', brushed));
}

function brushed(event) {
    brushSelection = event.selection;
    updateSelection();
    updateSelectionCount();
    updateLanguageBreakdown();
}

function isCommitSelected(commit) {
    if (!brushSelection) return false;
    const min = {
        x: brushSelection[0][0],
        y: brushSelection[0][1]
    };
    const max = {
        x: brushSelection[1][0],
        y: brushSelection[1][1]
    };
    const x = xScale(commit.date);
    const y = yScale(commit.hourFrac);
    return x >= min.x && x <= max.x && y >= min.y && y <= max.y;
}

function updateSelection() {
    // Update visual state of dots based on selection
    d3.selectAll('circle').classed('selected', (d) => isCommitSelected(d));
}

function updateSelectionCount() {
    const selectedCommits = brushSelection
        ? commits.filter(isCommitSelected)
        : [];

    const countElement = document.getElementById('selection-count');
    countElement.textContent = `${selectedCommits.length || 'No'
        } commits selected`;

    return selectedCommits;
}

function updateLanguageBreakdown() {
    const selectedCommits = brushSelection
        ? commits.filter(isCommitSelected)
        : [];
    const container = document.getElementById('language-breakdown');

    if (selectedCommits.length === 0) {
        container.innerHTML = '';
        return;
    }
    const requiredCommits = selectedCommits.length ? selectedCommits : commits;
    const lines = requiredCommits.flatMap((d) => d.lines);

    // Use d3.rollup to count lines per language
    const breakdown = d3.rollup(
        lines,
        (v) => v.length,
        (d) => d.type
    );

    // Update DOM with breakdown
    container.innerHTML = '';

    for (const [language, count] of breakdown) {
        const proportion = count / lines.length;
        const formatted = d3.format('.1~%')(proportion);

        container.innerHTML += `
              <dt>${language}</dt>
              <dd>${count} lines (${formatted})</dd>
          `;
    }

    return breakdown;
}