import { fetchJSON, renderProjects, fetchGitHubData } from '../global.js';
const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
if (projectsContainer) {
    renderProjects(projects, projectsContainer, 'h2');
} 
else {
    console.error("projectsContainer is empty")
}