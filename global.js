console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// // CODE FOR STEP 2. CAN DELETE:
// let navLinks = $$("nav a");

// let currentLink = navLinks.find(
//   (a) => a.host === location.host && a.pathname === location.pathname
// );

// console.log([1, 2, 3, 4].find(n => n > 2))
// console.log(navLinks)
// console.log(currentLink)

// if (currentLink) {
//     // or if (currentLink !== undefined)
//     currentLink.classList.add('current');
// }



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
