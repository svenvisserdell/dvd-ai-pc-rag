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

let running = false;

var spawn = require('child_process').spawn;
var ingest_process = null;
const cwdDev = '.';
const cwdProd = '.';

process.on('message', (result) => {
    console.log(result);
    if (result?.state === 'quit') {
        console.log("received shutdown message:", result);
        process.exit(); // shut down on main process close
    } else if (result?.state === true) {
        if (!running) {
            console.log("received start rag, spawning python process..", result);
            process.send(JSON.stringify({ status: `Initializing vectorstore ingest for ${result?.dataset}`}));
            ingest_process = spawn('lc_venv\\Scripts\\python.exe', ['python\\wiki_loader.py', result?.dataset ?? ""], { cwd: result?.dev ? cwdDev : cwdProd, maxBuffer: 1024 * 5000 });
            running = true;

            ingest_process.stdout.on('data', function (data) {
                try {
                    process.send(data.toString());
                } catch (e) {
                    console.error(JSON.stringify({ error: e, data }));
                }
            });

            ingest_process.stderr.on('data', function(data) {
                try {
                    process.send(data.toString());
                } catch (e) {
                    console.error(JSON.stringify({ error: e, data }));
                }
            })

            ingest_process.on('exit', function () {
                process.send(JSON.stringify({ status: `Ingest process has completed`}));
                process.exit()
            })
        }
    } else if (result?.state === false) {
        running = false;
        ingest_process?.kill('SIGINT');
    }
});