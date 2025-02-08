console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

let pages = [
    { url: '', title: 'Home' },
    { url: 'projects/', title: 'Projects' },
    { url: 'contact/', title: 'Contact' },
    { url: 'resume/', title: 'Resume' },
    { url: 'https://github.com/smacoh', title: 'Github Profile' }
];

let nav = document.createElement('nav');
document.body.prepend(nav);

const ARE_WE_HOME = document.documentElement.classList.contains('home');

for (let p of pages) {
    let url = p.url;
    
    if (!ARE_WE_HOME && !url.startsWith('http')) {
        url = '../' + url;
    }
    let title = p.title;
    // create link and add it to nav:
    let a = document.createElement('a');
    a.href = url;
    a.textContent = title;
    nav.append(a);

    if (a.host === location.host && a.pathname === location.pathname) {
        a.classList.add('current');
    }
    if (a.host != location.host) {
        a.target ="_blank"
    }
}


const automaticDarkLight = matchMedia("(prefers-color-scheme: dark)").matches ? "Automatic (Dark)" : "Automatic (Light)";
document.body.insertAdjacentHTML(
  'afterbegin',
  `
  <label class="color-scheme">
    Theme:
        <select>
            <option value="light dark">${automaticDarkLight}</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
        </select>
  </label>`
);

const select = document.querySelector("select")
select.addEventListener('input', function (event) {
    console.log('color scheme changed to', event.target.value);
    document.documentElement.style.setProperty('color-scheme', event.target.value);
    localStorage.colorScheme = event.target.value;
});

if ("colorScheme" in localStorage) {
    document.documentElement.style.setProperty('color-scheme', localStorage.colorScheme);
    select.value = localStorage.colorScheme;
}

const form = document.querySelector("form")
form?.addEventListener('submit', function (event) {
    event.preventDefault();
    const data = new FormData(form);
    let url = form.action + "?"
    for (let [name, value] of data) {
        url += name + '=' + encodeURIComponent(value) + '&'
        console.log(name, encodeURIComponent(value));
    }
    url = url.slice(0, -1);
    console.log(url)
    location.href = url;
});

// Lab 4: Step 1.2: Importing Project Data into the Projects Page
export async function fetchJSON(url) {
    try {
        // Fetch the JSON file from the given URL
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch projects: ${response.statusText}`);
        }
        console.log(response)
        const data = await response.json();
        console.log(data)
        return data;

    } catch (error) {
        console.error('Error fetching or parsing JSON data:', error);
    }
}


// Step 1.3: Creating a renderProjects Function
export function renderProjects(project, containerElement, headingLevel = 'h2') {
    // write javascript that will allow dynamic heading levels based on previous function
    const headingLevels = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    const dynamicHeadingLevel = headingLevels.includes(headingLevel) ? headingLevel: 'h2';

    containerElement.innerHTML = '';
    for (let p of project) {
        const article = document.createElement('article');
        article.innerHTML = `
            <h3>${p.title}</h3>
            <img src="${p.image}" alt="${p.title}">
            <div class="project-info">
                <p>${p.description}</p>
                <p class="project-year">c. ${p.year}</p>
            </div>
        `;
        containerElement.appendChild(article);
    }

    const projectstitle = document.querySelector('.projects-title');
    if (projectstitle) {
        projectstitle.textContent = `${project.length} Projects`;
    }
}

// Lab 4: Step 3.2: Fetching the data with Javascript
export async function fetchGitHubData(username) {
    return fetchJSON(`https://api.github.com/users/${username}`);
}