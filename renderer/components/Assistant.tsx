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

"use client";
import React, { FC } from 'react'

import { useExternalStoreRuntime, ThreadMessageLike, AppendMessage, SimpleTextAttachmentAdapter, ThreadPrimitive, Composer, ThreadWelcome, ThreadConfig, ComposerPrimitive, MessagePrimitive, AssistantRuntimeProvider } from "@assistant-ui/react";
import { Thread } from "@assistant-ui/react";
import { makeMarkdownText } from "@assistant-ui/react-markdown";
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Button } from './ui/button';
import ThreadSuggestion from './ui/assistant-ui/ThreadSuggestion';

let defaultDatasetSuggestions: Map<string, string[]> = require('../data/suggestions.json');

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

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

const CUSTOM_DATASET_ADD = 'Add new dataset'
const DATASET_NONE = 'None'

const MarkdownText = makeMarkdownText();

const convertMessage = (message: Message): ThreadMessageLike => {
  return {
    role: message.role,
    content: [{ type: "text", text: message.content }],
  };
};

console.log(defaultDatasetSuggestions)

export function Assistant() {
  const [isRunning, setIsRunning] = React.useState(false)
  const [isReady, setIsReady] = React.useState(false)
  const [messages, setMessages] = React.useState<Message[]>([])
  const [useRAG, setUseRAG] = React.useState(Object.keys(defaultDatasetSuggestions).length > 0 ? true : false)
  const [datasetSuggestions, setDatasetSuggestions] = React.useState(() => {
    let ds = new Map<string, string[]>()
    Object.entries(defaultDatasetSuggestions).forEach((e) => ds.set(e[0], e[1]))
    console.log(defaultDatasetSuggestions, Object.entries(defaultDatasetSuggestions), ds)
    return ds
  })
  const [dataset, setDataset] = React.useState(Object.keys(defaultDatasetSuggestions)[0] ?? DATASET_NONE)
  const [customDataset, setCustomDataset] = React.useState('')
  const [ragDataset, setRagDataset] = React.useState(Object.keys(defaultDatasetSuggestions)[0] ?? DATASET_NONE)
  const [status, setStatus] = React.useState("Initializing")
  const [manufacturer, setManufacturer] = React.useState<string>("")
  const isInitialMount = React.useRef(true);

  const onNew = React.useCallback(async (message: AppendMessage) => {
    if (message.content[0]?.type !== "text")
      throw new Error("Only text messages are supported");

    const input = message.content[0].text;
    setMessages((currentConversation) => {
      const mess = [
        ...currentConversation,
        { role: "user", content: input } as Message,
      ]

      const history_prompt = currentConversation?.length > 0 ? `Use the following message history as context:\n${JSON.stringify(currentConversation)}\nRespond to the following request:\n` : ''
      const active_prompt = `${input}`

      if (useRAG) {
        console.log(`Sending RAG request: ${input}`)
        window.ipc.send(RAG_QUERY, input)
      } else {
        // let prompt = history_prompt + active_prompt
        let prompt = active_prompt
        console.log(`Sending GenAI request: ${prompt}`)
        window.ipc.send(GENERATE_REQUEST, { prompt: prompt })
      }

      return mess
    });

    setIsRunning(true);
    // const assistantMessage = await backendApi(input);
  }, [useRAG]);


  const handleDatasetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDataset(e.target.value);
    if (e.target.value == CUSTOM_DATASET_ADD) {
      setIsReady(false)
    }
    setIsRunning(false)
    
    if (e.target.value != DATASET_NONE) {
      setUseRAG(true)
    } else if (e.target.value == DATASET_NONE) {
      setUseRAG(false)
    }
  };

  const handleDatasetNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomDataset(e.target.value);
    e.preventDefault();
    // setDataset(e.target.value);
  };

  const keyPressInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key == 'Enter') {
      submitDatasetNameChange()
      console.log("Submitting new custom dataset")
    }
  }

  const submitDatasetNameChange = React.useCallback(() => {
    if (customDataset == "") {
      return
    }
    const newDataset = customDataset
    setDatasetSuggestions((ds: Map<string, string[]>) => {
      if (!ds.has(newDataset)) {
        ds.set(newDataset, [])
      }
      const exportDs = Object.fromEntries(ds)
      console.log("Adding new dataset with name", newDataset, JSON.stringify(exportDs))
      window.ipc.send(RAG_SUGGESTIONS_WRITE, { suggestions: JSON.stringify(exportDs, null, 2), path: 'renderer/data/suggestions-source.json' })
      return ds
    })

    console.log(`Submitting new custom dataset for RAG ingestion: ${newDataset}`)
    // datasetSuggestions.set(newDataset, [])
    // setDataset(newDataset);
    // setCustomDataset('')
    window.ipc.send(RAG_INGEST, { dataset: newDataset })
    // setDataset(e.target.value);
  }, [customDataset]);

  // const runtime = useEdgeRuntime({ api: "/api/chat" });
  // const runtime = useLocalRuntime(MyModelAdapter);
  const runtime = useExternalStoreRuntime({
    isRunning,
    messages,
    convertMessage,
    onNew
  });

  React.useEffect(() => {
    setRagDataset(dataset == CUSTOM_DATASET_ADD ? customDataset : dataset)
  }, [dataset, customDataset])

  React.useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false

      //// Initialize all IPC hooks on first page load
      window.ipc.on('message', (messages: Message[] | any) => {
        setMessages(messages)
      })

      window.ipc.on(GENERATE_RESULT, (res: any) => {
        console.debug(GENERATE_RESULT, res)
        setMessages((currentConversation) => {
          if (!currentConversation || currentConversation[currentConversation.length - 1]?.role === 'user') {
            // Instantiate new message
            return [
              ...currentConversation,
              { role: 'assistant', content: res },
            ]
          } else {
            // Update current message with streamed tokens
            return [
              ...currentConversation.slice(0, -1),
              { role: 'assistant', content: (currentConversation[currentConversation.length - 1]?.content ?? '') + res },
            ]
          }
        });
      })

      window.ipc.on('rag-result', (messages: any) => {
        console.log('rag-result', messages)

        setMessages((currentConversation) => {
          console.log(currentConversation, messages)
          return [
            ...currentConversation,
            messages,
          ]
        });
      })

      window.ipc.on(RAG_INGEST_RESPONSE, (res: any) => {
        console.log(RAG_INGEST_RESPONSE, res)
        setCustomDataset((cds) => {
          setDataset(cds);
          return ''
        })
        window.ipc.send(STATUS_REQUEST, '')
      })

      window.ipc.on(STATUS_READINESS, (res: any) => {
        console.debug(STATUS_READINESS, res)
        // check if res is an object and every value in res is truthy
        if (typeof res === 'object') {
          setIsReady(Object.values(res).every(value => Boolean(value))) || ((res['embedReady'] || !useRAG) && res['genaiReady'] && (res['ingestReady'] ?? true))
        }
      })

      window.ipc.on(STATUS_UPDATE, (res: any) => {
        console.debug(STATUS_UPDATE, res)
        // text += res
        setStatus(res);
        if (res.trim().startsWith("Model Loaded:") || res.trim().startsWith("Loaded vectorstore") || res.trim().startsWith("Ingest process has completed")) {
          // setIsReady(true);
          window.ipc.send(STATUS_REQUEST, '')
        }

        if (res.trim().startsWith("Updated source title to ")) {
          const newDataset = res.trim().slice("Updated source title to ".length)
          setCustomDataset(oldDataset => {
            setDatasetSuggestions((ds: Map<string, string[]>) => {
              if (!ds.has(newDataset)) {
                ds.set(newDataset, [])
              }
              if (ds.get(oldDataset)?.length === 0) {
                delete ds[oldDataset]
              }
              const exportDs = Object.fromEntries(ds)
              console.log("Updating dataset with name", newDataset, JSON.stringify(exportDs))
              window.ipc.send(RAG_SUGGESTIONS_WRITE, { suggestions: JSON.stringify(exportDs, null, 2), path: 'renderer/data/suggestions-source.json' })
              return ds
            })
            return newDataset
          })
        }

        if (res.trim() === "Finished") {
          setIsRunning(false);
          setStatus('');
        }

        if (res.indexOf("[KPIS]") !== -1) {
          // find 'Token Generation Rate' index in res
          const index = res.indexOf("Token Generation Rate");
          if (index !== -1) {
            setStatus(res.slice(index));
          }
        }
      })

      window.ipc.on(GET_ENVIRONMENT_RESPONSE, (res: any) => {
        console.debug(GET_ENVIRONMENT_RESPONSE, res)
        if (res['INTEL']) {
          setManufacturer('Intel')
        } else if (res['QUALCOMM']) {
          setManufacturer('Qualcomm')
        }
      })

      window.ipc.on(RAG_RETRIEVAL, RAG_CALLBACK)

      window.ipc.send(GENERATE_REQUEST, { prompt: '', max_tokens: 1024 })
      
      if (useRAG) {
        window.ipc.send(RAG_QUERY, { dataset: ragDataset })
      }

      window.ipc.send(STATUS_REQUEST, '')
      window.ipc.send(GET_ENVIRONMENT, '')
    } else {
      setIsReady(false)
      // window.ipc.send(RAG_QUERY, { state: false })
      if (dataset !== CUSTOM_DATASET_ADD && dataset !== DATASET_NONE) {
        window.ipc.send(RAG_QUERY, { dataset: dataset })
      }
    }
  }, [dataset])

  const RAG_CALLBACK = React.useCallback(async (messages: any) => {
    console.log(RAG_RETRIEVAL, messages)

    window.ipc.send(GENERATE_REQUEST, { prompt: messages['retrieval'] })

    // filter to unique sources
    const sources = [...new Set(messages['sources'])]

    let source_list = []
    for (const source of sources) {
      source_list.push(`https://wikipedia.org/wiki/${source.replace(/ /g, '_')}`)
    }
    console.log(`RAG sources:\n${source_list.join('\n')}`)
  }, [])

  const Composer: FC = () => {
    return (
      <ComposerPrimitive.Root className="relative flex w-full items-end rounded-lg border transition-shadow focus-within:shadow-sm">
        <ComposerPrimitive.Input
          autoFocus={dataset !== CUSTOM_DATASET_ADD}
          placeholder="Write a message..."
          rows={1}
          className="placeholder:text-muted-foreground size-full max-h-40 resize-none bg-transparent p-4 pr-12 text-sm outline-none"
        />
        <ComposerPrimitive.Send asChild>
          <Button
            size="icon"
            className={cn(
              "absolute bottom-0 right-0 m-2.5 size-8 p-2 transition-opacity",
            )}
          >
            {/* <SendHorizontalIcon /> */}
            <span className="sr-only">Send</span>
          </Button>
        </ComposerPrimitive.Send>
      </ComposerPrimitive.Root>
    );
  };

  const UserMessage: FC = () => {
    return (
      <MessagePrimitive.Root className="my-4 grid w-full max-w-6xl auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] gap-y-2">
        <div className="bg-muted text-foreground col-start-2 row-start-1 max-w-4xl break-words rounded-3xl px-5 py-2.5 bg-blue-700 rounded-3xl text-white">
          <MessagePrimitive.Content />
        </div>
      </MessagePrimitive.Root>
    );
  };

  const AssistantMessage: FC = () => {
    return (
      <MessagePrimitive.Root className="relative my-4 grid w-full max-w-6xl grid-cols-[auto_1fr] grid-rows-[auto_1fr]">
        <Avatar className="col-start-1 row-span-full row-start-1 mr-4 bg-gray-700 rounded-3xl text-white my-auto">
          <AvatarFallback>A</AvatarFallback>
        </Avatar>

        <div className="text-foreground col-start-2 row-start-1 my-1.5 max-w-4xl break-words leading-7 bg-gray-700 text-white rounded-3xl px-5 py-2.5">
          <MessagePrimitive.Content components={{ Text: MarkdownText }} />
        </div>
      </MessagePrimitive.Root>
    );
  };

  return (
    <div style={{ height: '100%' }} className="h-full bg-white text-black">
      <div
        className='fixed top-0 inset-x-10 center opacity-30 hover:opacity-100 mr-2 ml-2'
        style={{
          position: "absolute",
          // top: 0,
          // left: 0,
          zIndex: "1",
          // width: "100%",
          backgroundColor: "white",
          padding: "10px",
          borderRadius: "5px",
          boxShadow: "0px 0px 10px rgba(0, 0, 0, 0.1)",
          // opacity: "0.3",
        }}
      >
        <select
          value={dataset}
          onChange={handleDatasetChange}
          className='mr-2 bg-gray-200'
          style={{
            marginRight: "10px",
          }}
        >
          {[...datasetSuggestions.keys(), DATASET_NONE, CUSTOM_DATASET_ADD].map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
        {dataset == CUSTOM_DATASET_ADD && <input
          type="text"
          value={customDataset}
          onChange={handleDatasetNameChange}
          onKeyDown={keyPressInput}
          className='bg-gray-200'
          style={{
            marginRight: "10px",
          }}
        />}
        <div
          className="r-0 t-0 mr-2 text-right max-w-xl overflow-hidden whitespace-nowrap float-right text-gray-500"
          style={{
            textOverflow: 'ellipsis',
            color: isReady ? 'green' : 'red',
          }}
        >{`${(isReady ? 'Ready' : 'Not Ready')}${status ? ': ' + status : ''}`}</div>
      </div>
      <AssistantRuntimeProvider runtime={runtime}>
        {/* <Thread config={config}> */}
        <ThreadPrimitive.Root className="h-full">
          <ThreadPrimitive.Viewport className="flex h-full flex-col items-center overflow-y-scroll scroll-smooth px-4 pt-8">
            <ThreadPrimitive.If empty={true}>
              <div className="sticky bottom-0 mt-4 flex w-full max-w-4xl flex-grow flex-col items-center justify-end rounded-t-lg bg-white pb-4 text-center text-2xl whitespace-pre">
                 Dell Validated Design for AI PC
                 <br />Retrieval Augmented Generation
                {manufacturer !== '' ? `\nRunning on ${manufacturer} silicon` : ''}
              </div>
            </ThreadPrimitive.If>
            <ThreadPrimitive.Messages
              components={{
                UserMessage,
                AssistantMessage,
              }}
            />
            <div className="sticky bottom-0 mt-4 flex w-full flex-grow flex-col items-center justify-end rounded-t-lg bg-white pb-4">
              <div className="mb-4 mt-4 w-full max-w-5xl px-4">
                <div className="flex flex-wrap justify-center gap-2 mb-2">
                  <ThreadPrimitive.If running={false}>
                    {" "}
                    {/*Important to wrap Thread suggestion into if statement since the original message is streamed and we don't want to generate buttons ahead of time*/}
                    {/* <AI_ThreadSuggestion></AI_ThreadSuggestion> */}
                    {datasetSuggestions?.get(ragDataset)?.filter(suggestion => !messages.some(m => m.content === suggestion) && isReady).slice(0, 3).map((suggestion, i) => (
                      <ThreadSuggestion
                        key={i}
                        prompt={suggestion}
                      >
                        <p className="font-semibold text-">{suggestion}</p>
                      </ThreadSuggestion>
                    ))}
                  </ThreadPrimitive.If>
                </div>
                <Thread.ScrollToBottom />
                <Composer />
              </div>
            </div>
          </ThreadPrimitive.Viewport>
        </ThreadPrimitive.Root>
      </AssistantRuntimeProvider>
    </div>
  );
}
