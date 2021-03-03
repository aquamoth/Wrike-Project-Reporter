import React, { useState } from 'react';
import logo from './logo.svg';
import './App.css';
import axios from 'axios';
import { WrikeResponse, Folder, Task } from './types';
import { useCookies } from 'react-cookie'

const ONE_MONTH_IN_SECONDS = 30*24*60*60
  
// import ClientOAuth2 from 'client-oauth2'

// const wrikeAuth = new ClientOAuth2({
//   clientId: '0IbwXYmK',
//   clientSecret: '9sKTPsWAkwoD5RY51WS1OaKe7uS0KtOs9NeHycKvxutAKTt1w9hHRJ1XWFHmmMKn',
//   accessTokenUri: 'https://login.wrike.com/oauth2/token',
//   authorizationUri: 'https://login.wrike.com/oauth2/authorize/v4',
//   redirectUri: 'http://localhost:3000',
//   scopes: ['wsReadOnly']
// });

// (window as any).oauth2Callback = async function (uri: string) {
//   console.log('Calling wrike for access token', uri)
//   const user = await wrikeAuth.token.getToken(uri);
//   console.log(user)
// }

// window.open(wrikeAuth.token.getUri())


function App() {

  const [cookies, setCookies, removeCookies] = useCookies()
  const oauthToken = cookies['oauthToken'] || ''
  // console.log('cookies', oauthToken)

  const [lastError, setLastError] = useState('')
  const [folders, setFolders] = useState<{ [id: string]: Folder }>({})
  const [projects, setProjects] = useState<Folder[]>([])


  const onCallWrike = async () => {
    setLastError('')
    setProjects([])

    try {
      const wrike = await receiveDataFromWrike(oauthToken);
      setFolders(wrike.folderDictionary)
      setProjects(wrike.projectsWithoutTasks)
    }
    catch (ex) {
      if (ex.isAxiosError) {
        setLastError(`(${ex.response.status}) ${JSON.stringify(ex.response.data)}`)
      }
      else {
        console.error(ex)
        setLastError('An unhandled exception occurred. See the console for details!')
      }
    }
  }

  const items = projects?.map(p => {
    let path: string[] = []
    let walker = p
    while (walker) {
      path.unshift(walker.title)
      walker = folders[walker.parentIds[0]]
    }

    return ({
      id: p.id,
      title: p.title,
      permalink: p.permalink,
      path: path.join('/')
    })
  })

  const onAuthTokenChanged = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCookies('oauthToken', e.target.value, { maxAge: ONE_MONTH_IN_SECONDS })
  }
  
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />

        <textarea onChange={onAuthTokenChanged}>{oauthToken}</textarea>

        <button disabled={oauthToken === ''} onClick={onCallWrike}>Call Wrike</button>

        <div style={{color:'red'}}>{lastError}</div>

        <ul>
          {items.map(p => (
            <li key={p.id}><a href={p.permalink} target="_blank" rel="noopener noreferrer">{p.path}</a></li>
          ))}
        </ul>

      </header>
    </div>
  );
}

export default App;



async function receiveDataFromWrike(oauthToken: string) {
  console.log('Calling Wrike');

  const httpClient = axios.create({
    baseURL: 'https://www.wrike.com/api/v4/',
    headers: { authorization: 'Bearer ' + oauthToken }
  })

  const projectsResponse = await httpClient.get<WrikeResponse<Folder>>("folders?project=true&deleted=false");
  const projects = projectsResponse.data.data;
  console.log(`Received ${projects.length} projects`);

  const activeTasksResponse = await httpClient.get<WrikeResponse<Task>>("tasks?status=Active&fields=['parentIds','superParentIds']");
  const activeTasks = activeTasksResponse.data.data;
  console.log(`Received ${activeTasks.length} tasks`);

  const foldersResponse = await httpClient.get<WrikeResponse<Folder>>("folders?project=false&deleted=false");
  const folders = foldersResponse.data.data;
  console.log(`Received ${folders.length} folders`);

  const folderDictionary: { [id: string]: Folder; } = {};
  for (const folder of folders) {
    folderDictionary[folder.id] = folder;
  }

  const projectsInProgress = filterProjectsInProgress(projects);
  console.log(`${projectsInProgress.length} projects in progress`);

  const tasksPerProject = mapTasksPerProject(activeTasks);
  const projectsWithoutTasks = projectsInProgress.filter(folder => !(folder.id in tasksPerProject));
  console.log(`${projectsWithoutTasks.length} projects have no tasks`);

  // console.dir(projectsWithoutTasks)
  return { folderDictionary, projectsWithoutTasks };
}

function filterProjectsInProgress(projects: Folder[]) {
  return projects
    .filter(folder => folder.workflowId === 'IEAEEOG5K7733RZD') // Default Workflow
    .filter(folder => folder.project.customStatusId === 'IEAEEOG5JMBYF5CY');
}

function mapTasksPerProject(tasks: Task[]) {
  const dictionary: { [id: string]: string[] } = {};

  for (const task of tasks) {

    for (const id of task.parentIds) {
      if (!(id in dictionary))
        dictionary[id] = [];
      dictionary[id].push(task.id);
    }

    for (const id of task.superParentIds) {
      if (!(id in dictionary))
        dictionary[id] = [];
      dictionary[id].push(task.id);
    }

  }

  // console.dir(dictionary)
  return dictionary;
}
