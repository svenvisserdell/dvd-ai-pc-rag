/*
 Copyright © 2024 Dell Inc. or its subsidiaries. All Rights Reserved.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at
      http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/

import path from 'path'
import { app, ipcMain } from 'electron'
import serve from 'electron-serve'
import { createWindow } from './helpers'
import { fork } from 'child_process';
import fs from 'fs';
require('dotenv').config()

const env = {
  // parse process.env.DEMO string as boolean
  DEMO: process.env.DEMO === 'true',
  QUALCOMM: process.env['PROCESSOR_IDENTIFIER'].includes('Qualcomm'),
  INTEL: process.env['PROCESSOR_IDENTIFIER'].includes('Intel'),
  INTEL_LLM_PATH: process.env.INTEL_LLM_PATH,
  INTEL_LLM: process.env.INTEL_LLM,
  QUALCOMM_LLM_PATH: process.env.QUALCOMM_LLM_PATH,
  QUALCOMM_LLM: process.env.QUALCOMM_LLM,
  INTEL_USE_GPU: process.env.INTEL_USE_GPU === 'true',
}

const isProd = process.env.NODE_ENV === 'production'

// rag processes
let embedProcess: any = null
let ingestProcess: any = null
let genaiProcess: any = null

let embedReady: Boolean = false
let ingestReady: Boolean = false
let genaiReady: Boolean = false

let mainWindow: Electron.BrowserWindow | null

const RAG_QUERY = 'rag-query'
const RAG_RETRIEVAL = 'rag-retrieval'
const RAG_INGEST = 'rag-ingest'
const RAG_INGEST_RESPONSE = 'rag-ingest-response'
const GENERATE_REQUEST = 'genai-request'
const GENERATE_RESULT = 'genai-result'
const STATUS_REQUEST = 'status'
const STATUS_UPDATE = 'status-update'
const STATUS_READINESS = 'status-reply'
const RAG_SUGGESTIONS_WRITE = 'suggestions-write'
const GET_ENVIRONMENT = 'get-environment'
const GET_ENVIRONMENT_RESPONSE = 'get-environment-response'

if (isProd) {
  serve({ directory: 'app' })
} else {
  app.setPath('userData', `${app.getPath('userData')} (development)`)
}

;(async () => {
  
  if (!app.requestSingleInstanceLock()) {
    app.quit()
  }

  await app.whenReady()

  mainWindow = createWindow('main', {
    width: 1920,
    height: 1080,
    autoHideMenuBar: true,
    title: "Dell Validated Design for AI PC - RAG",
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  mainWindow.maximize()

  if (isProd) {
    await mainWindow.loadURL('app://./home')
  } else {
    const port = process.argv[2]
    await mainWindow.loadURL(`http://localhost:${port}/home`)
    if (!env.DEMO) {
      mainWindow.webContents.openDevTools()
    }
  }
})()

app.on('window-all-closed', () => {
  app.quit()
})

ipcMain.on(STATUS_REQUEST, async (event, arg) => {
  if (ingestProcess === null) {
    event.reply(STATUS_READINESS, { embedReady: embedReady, genaiReady: genaiReady })
  } else {
    event.reply(STATUS_READINESS, { embedReady: embedReady, genaiReady: genaiReady, ingestReady: ingestReady })
  }
})

ipcMain.on(RAG_QUERY, function (event, query) {
  console.log(`rag query ${JSON.stringify(query)}`);
  if (embedProcess == null) {
    embedProcess = fork(__dirname + '/../main/modules/rag.js');
    embedProcess.on('message', (data: any) => {
      // split data into lines and process
      for (const line of data.split('\n')) {
        try {
          if (line.trim() === '') {
            continue;
          }
          console.debug(`Retrieval response: ${decodeURIComponent(line)}`);
          
          const d = JSON.parse(decodeURIComponent(line).trim());
          if ((d?.retrieval ?? null) !== null) {
            event.reply(STATUS_UPDATE, "Retrieved RAG Result")
            event.reply(RAG_RETRIEVAL, d)
          } else if (d?.status !== 'error'){
            console.log(`\x1b[31mReceived updated RAG embed status: \x1b[0m${d.status}`);
            event.reply(STATUS_UPDATE, d?.status)
            embedReady = true
            console.log("\x1b[31mEmbed ready\x1b[0m")
          } else {
            console.log(`\x1b[31mError in RAG embed status: \x1b[0m${d.message}`);
            event.reply(STATUS_UPDATE, d?.message)
            embedReady = false
          }
        } catch (error) {
          event.reply(STATUS_UPDATE, line)
        }
      }
    });

    embedProcess.on('exit', function() {
      embedProcess = null
      embedReady = false
    });
  }

  if (!query || query === '') {
    embedProcess.send({'state': true, 'query': false, 'mode': 'embed','dev': true});
    event.reply(STATUS_UPDATE, "Started RAG Process")
  // check if query is a string
  } else if (typeof query === 'string') {
    embedProcess.send({'state': true, 'query': query, 'mode': 'embed','dev': true});
    event.reply(STATUS_UPDATE, "Getting RAG Documents for request")
  } else {
    embedProcess.send({'state': true, ...query, 'mode': 'embed','dev': true});
    if (query?.dataset) {
      event.reply(STATUS_UPDATE, `Switching RAG Vector Store to ${query?.dataset}`)
      embedReady = false
    } else {
      event.reply(STATUS_UPDATE, `Configuring RAG process with ${JSON.stringify(query)}`)
    }
  }
});

ipcMain.on(RAG_INGEST, function (event, query) {
  console.log(`rag ingest ${JSON.stringify(query)}`);
  if (ingestProcess == null) {
    ingestProcess = fork(__dirname + '/../main/modules/rag-ingest.js');
    ingestProcess.on('message', (data: any) => {
      // split data into lines and process
      for (const line of data.split('\n')) {
        if (line.trim() === '') {
          continue
        }
        // console.debug(`Ingest response: ${line}`);
        try {
          const d = JSON.parse(decodeURIComponent(line));
          if (d?.status) {
            console.log(`\x1b[34mReceived updated RAG ingest status: \x1b[0m${d.status}`);
            event.reply(STATUS_UPDATE, d?.status)
            if (d?.status.trim().startsWith('Ingest process has completed')) {
              console.log("Ingest ready")
              ingestReady = true
              event.reply(RAG_INGEST_RESPONSE, d?.status)
            }
          }
        } catch (error) {
          event.reply(STATUS_UPDATE, line)
          // event.reply(RAG_INGEST_RESPONSE, data.slice(0,2000))
          console.log(`\x1b[34mReceived updated RAG ingest status: \x1b[0m${line}`);
          if (line.trim().startsWith('Ingest process has completed')) {
            event.reply(RAG_INGEST_RESPONSE, line)
            ingestReady = true
            console.log("Ingest ready")
          }
        }
      }
    });
  }

  ingestProcess.on('exit', function() {
    ingestProcess = null
  })

  // Shut down retrieval process to unlock vectorstores
  embedProcess.send({'state': false, 'query': false, 'mode': 'embed','dev': true});
  ingestProcess.send({'state': true, ...query, 'mode': 'embed','dev': true});
  if (query?.dataset) {
    event.reply(STATUS_UPDATE, `Creating RAG Vector Store to ${query?.dataset}`)
    ingestReady = false
  }
});

ipcMain.on(GENERATE_REQUEST, function (event, req) {
  console.log(`generate request ${JSON.stringify(req)}`);
  if (genaiProcess == null) {
    genaiProcess = fork(__dirname + '/../main/modules/genai.js');
    genaiProcess.on('message', (data: any) => {
      if (data.trim().startsWith('STATE:') || data.trim().startsWith('[INFO]') || data.trim().startsWith('[KPIS]')) {
        console.log(`Received updated GenAI status: ${data}`);
        let upd = ''
        if (data.trim().startsWith('STATE:')) {
          upd = data.trim().slice("STATE: ".length)
          if (upd.startsWith("Finished")) {
            event.reply(STATUS_UPDATE, "Finished")
            upd = upd.slice("Finished".length)
          }
        } else {
          upd = data.trim()
        }
        event.reply(STATUS_UPDATE, upd)
        if (upd.startsWith("Model Loaded:")) {
          genaiReady = true
          console.log("GenAI ready")
        }
      } else {
        event.reply(GENERATE_RESULT, data)
      }
    });
  }

  genaiProcess.on('exit', function() {
    genaiProcess = null
    genaiReady = false
  })

  if (!req?.prompt || req?.prompt == '') {
    genaiProcess.send({'state': true, 'mode': 'embed','dev': true, ...req, 'prompt': false});
    event.reply(STATUS_UPDATE, `Loading LLM with ${JSON.stringify(req)}`)
  } else{
    genaiProcess.send({'state': true, 'mode': 'embed','dev': true, ...req});
    event.reply(STATUS_UPDATE, `Sending LLM request with ${req.prompt.trim().split(/\s+/).length} word prompt`)
  }
});

ipcMain.on(RAG_SUGGESTIONS_WRITE, (_event, arg) => {
  console.log(`Writing suggestions update: ${JSON.stringify(arg)}, cwd: ${process.cwd()}`)
  fs.writeFileSync(arg.path, arg.suggestions)
})

ipcMain.on(GET_ENVIRONMENT, (_event, arg) => {
  _event.reply(GET_ENVIRONMENT_RESPONSE, env)
})