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

const { assert } = require('console');

require('dotenv').config()
var spawn = require('child_process').spawn;
let running = false;

var genai_process = null;
const qualcomm = process.env['PROCESSOR_IDENTIFIER'].includes('Qualcomm');
const intel = process.env['PROCESSOR_IDENTIFIER'].includes('Intel');

const defaultModel = "llama3.2:3b";
let model = "";
let model_path = "";
let cwdDev = "";
let device = "CPU";
let exe;

if (intel) {
    model = process.env['INTEL_LLM'] ?? defaultModel;
    model_path = process.env['INTEL_LLM_PATH'];
    device = process.env['INTEL_USE_GPU'] === 'true' ? 'GPU' : 'NPU';
    cwdDev = 'openvino_genai_chat';
    exe = 'openvino_genai_chat.exe';
} else if (qualcomm) {
    model = process.env['QUALCOMM_LLM'] ?? defaultModel;
    model_path = process.env['QUALCOMM_LLM_PATH'];
    device = 'NPU';
    cwdDev = 'qnn_genai_chat';
    exe = 'ChatApp.exe';
} else {
    console.error(`Unknown platform ${process.env['PROCESSOR_IDENTIFIER']}`);
    return
}

assert(model_path, `Model path not found for ${model}`)

const cwdProd = '';

process.on('message', (result) => {
    // console.log(result);
    if (result?.state === 'quit') {
        console.log("received shutdown message:", result);
        process.exit(); // shut down on main process close
    } else if (result?.state === true) {
        if (!running) {
            console.log("received start genai, spawning chat process..", result);
            process.send(`STATE: Initializing language model ${model}`);

            genai_process = spawn(exe,
                [
                    '..\\' + model_path,
                    result?.device ?? "CPU", // device
                    result?.max_tokens ?? "200" // max tokens
                ], { cwd: result?.dev ? cwdDev : cwdProd });

            running = true;

            genai_process.stdout.on('data', function (data) {
                try {
                    data = data.toString()

                    if (data.trim().startsWith("STATE: Model Loaded:")) {
                        data = `STATE: Model Loaded: ${model}`
                    }
                    process.send(data);
                } catch (e) {
                    console.error(JSON.stringify({ tree: 'stdout', error: e, data }));
                }
            });

            genai_process.stderr.on('data', function (data) {
                try {
                    process.send(data.toString());
                    console.error(JSON.stringify({ tree: 'err', error: data.toString(), data }));
                } catch (e) {
                    console.error(JSON.stringify({ tree: 'err', error: e, data }));
                }
            })

            if (result?.prompt) {
                console.log("Sending prompt:\n", result?.prompt.replace(/\n/g, '\r') + '\n');
                genai_process.stdin.write(result?.prompt.replace(/\n/g, '\r') + '\n');
            }
        } else {
            if (result?.prompt) {
                genai_process.stdin.write(result?.prompt.replace(/\n/g, '\r') + '\n');
            } else {
                console.log("received new request", result);
            }
        }

    } else if (result?.state === false) {
        running = false;
        genai_process?.kill('SIGINT');
    }
});