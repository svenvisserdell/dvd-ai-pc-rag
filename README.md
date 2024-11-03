<!-- Prompt Template based on https://github.com/othneildrew/Best-README-Template-->
<a id="readme-top"></a>

[![Issues][issues-shield]][issues-url]
[![Apache 2.0 License][license-shield]][license-url]



<!-- PROJECT LOGO -->
<br />
<h3 align="center">Dell Validated Designs for AI PCs<br /><strong>RAG</strong></h3>

<p>
    Dell <a href="https://www.dell.com/en-us/lp/dt/workloads-validated-designs">Validated Designs</a> for AI PCs 
    are open-source reference guides that streamline development of AI applications meant to run on Dell AI PCs with NPU (neural processing unit) technology. 
    <br /><br />
    This project showcases <strong>Offline RAG</strong> (Retrieval Augmented Generation) capabilities by merging retrieval-based methods with generative models to improve content relevance and quality.
</p>


<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#validated-configurations">Validated Configurations</a></li>
        <li><a href="#drivers">Drivers</a></li>
        <li><a href="#software-prerequisites">Software Prerequesites</a></li>
        <li><a href="#installation">Installation</a></li>
        <li><a href="#model-preparation">Model Preparation</a></li>
        <li><a href="#configure-app">Configure App</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#acknowledgements">Acknowledgements</a></li>
  </ol>
</details>



<!-- ABOUT THE PROJECT -->
## About The Project

This simple RAG reference application uses [Llama](https://www.llama.com/) language models from Meta running on both Intel and Qualcomm AI PC silicon. It uses [LangChain](https://www.langchain.com/), [Chroma](https://www.trychroma.com/), and a [Nomic](https://www.nomic.ai/) embeddings model to integrate with a local vector store and do [RAG](https://huggingface.co/docs/transformers/model_doc/rag) entirely on device.

For ease of use in evaluation and proof of concept work, we've built a small vector store creation utility that integrates with Wikipedia to ingest new topics. But with the flexibility available through frameworks like LangChain, it is easier than ever to connect the datasets you care about into AI workflows.

<p align="right">(<a href="#readme-top">back to top</a>)</p>


### Built With

* [Nextron](https://github.com/saltyshiomix/nextron)
* [![React][React.js]][React-url]
* [Assistant-UI](https://github.com/Yonom/assistant-ui)
* [Electron](https://github.com/electron/electron)
* [Llama Models](https://github.com/meta-llama/llama-models)
* [OpenVINO™ GenAI](https://github.com/openvinotoolkit/openvino.genai)
* [Qualcomm AI Hub](https://aihub.qualcomm.com/)
* [Qualcomm AI Engine Direct SDK](https://www.qualcomm.com/developer/software/qualcomm-ai-engine-direct-sdk)
* [LangChain](https://www.langchain.com)
* [Chroma](https://www.trychroma.com/)


[Nextron]: https://img.shields.io/badge/Nextron-000000?style=for-the-badge
[Nextron-url]: https://github.com/saltyshiomix/nextron
[Assistant-UI]: https://img.shields.io/badge/Assistant--UI-000000?style=for-the-badge
[Assistant-UI-url]: https://github.com/Yonom/assistant-ui
[Electron.js]: https://img.shields.io/badge/electron-000000?style=for-the-badge&logo=electrondotjs&logoColor=white
[Electron-url]: https://github.com/electron/electron
[Llama-url]: https://github.com/meta-llama/llama-models
[OpenVINO-url]: https://github.com/openvinotoolkit/openvino.genai
[QNN-url]: https://www.qualcomm.com/developer/software/qualcomm-ai-engine-direct-sdk
[QAIH-url]: https://aihub.qualcomm.com/
[LangChain-url]: https://www.langchain.com
[Chroma-url]: https://www.trychroma.com/

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- GETTING STARTED -->
## Getting Started

This project requires AI PC hardware, driver installation and verification, software dependencies, and AI model preparation.

While several of the steps are specific to Intel or Qualcomm, this guide is constructed to allow for a single application codebase to be built for use on both Intel and Qualcomm AI PCs. If you are initially targeting use on only one of these platforms, feel free to skip the steps that are specific to other platforms.

### Validated Configurations

This Dell Validated Design has been tested on Dell AI PCs with Intel(R) Core(TM) Ultra 200V Series and Qualcomm(R) Snapdragon(R) X Elite processors with at least 16 GB of RAM running Windows 11.

### Drivers

#### Intel

Follow Driver guidance for using OpenVINO on Intel AI PCs [here](https://github.com/openvinotoolkit/openvino_notebooks/wiki/Windows#2-install-drivers-for-gpu-and-npu-ai-pc)

#### Qualcomm

Incorporated in Windows Update.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Software Prerequisites

Core Software Packages:
- [Python](https://www.python.org/downloads/) (Python 3.10 recommended)
- [Node](https://nodejs.org/en/download/package-manager) and yarn (`npm install -g yarn`)

#### Intel Specific Software

Use Step 1 from [this guide](https://medium.com/openvino-toolkit/how-to-build-openvino-genai-app-in-c-32dcbe42fa67#e2a3) to install CMake 3.23+, Visual Studio 2022+, and OpenVINO with GenAI 2024.4 from OpenVINO Archive.

#### Qualcomm Specific Software

Using [this guide](https://github.com/quic/ai-hub-apps/tree/main/apps/windows/cpp/ChatApp#requirements), install Visual Studio 22 and QNN SDK 2.28+ to build Qualcomm [ai-hub-apps](https://github.com/quic/ai-hub-apps).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Installation

1. (Recommended) Fork the repo so that you can save any changes that you make
1. Clone the repo
   ```sh
   git clone https://github.com/<your fork>/dvd-ai-pc-rag.git
   cd dvd-ai-pc-rag
   ```
1. Install NPM packages
   ```sh
   yarn
   ```
1. Initialize and activate a Python virtual environment for the project
    ```sh
    python -m venv lc_venv
    lc_venv\Scripts\activate
    ```
1. Install the Python dependencies
    ```sh
    pip install -r requirements.txt
    ```
1. Configure the application settings
    ```sh
    cp .env.example .env
    <editor> .env
    ```
1. Intel-specific build steps:
    1. Install Intel-specific Python dependencies
        ```sh
        pip install -r requirements-intel.txt
        ```
    1. Follow step 2 from [this guide](https://medium.com/openvino-toolkit/how-to-build-openvino-genai-app-in-c-32dcbe42fa67) to build the Intel OpenVINO GenAI samples.
    1. Copy the included `cpp\openvino_genai_chat` directory into the samples directory and rebuild
        ```sh
        cp -r cpp\openvino_genai_chat $env:OpenVINO_DIR\..\..\samples\cpp\
        build_samples.ps1
        ```
    1. Gather necessary libraries and your executable into the `<project root>/openvino_chat` directory
        ```sh
        cd <project root>
        mkdir openvino_genai_chat
        cp $env:USERPROFILE\Documents\IntelOpenVINO\openvino_cpp_samples_build\intel64\Release\openvino_genai_chat.exe openvino_genai_chat\
        cp $env:OpenVINO_DIR\..\bin\intel64\Release\*.dll openvino_genai_chat\
        cp $env:OpenVINO_DIR\..\3rdparty\tbb\bin\tbb*.dll openvino_genai_chat\
        ```
1. Qualcomm-specific build steps:
    1. Open and build the `cpp\qnn_genai_chat\ChatApp.sln` (modified from the Qualcomm AI Hub Chat App sample [here](https://github.com/quic/ai-hub-apps/tree/main/apps/windows/cpp/ChatApp#build-app).
    1. Copy the ChatApp.exe 
    
<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Model Preparation

Most AI Models must be transformed for use on AI PC NPU silicon. These transformations include model conversion, optimization, and quantization and are specific to the hardware target.

#### Model Preparation for Intel AI PCs

1. Prepare a language model for use with OpenVINO GenAI on Intel AI PCs with Optimum. We recommend that you start with Llama-v3.2-3B-Chat. This will take several minutes and requires a substantial amount of system RAM. This model preparation step does not need to happen on an Intel AI PC. The `optimum` configuration used below is detailed in this [guide](https://medium.com/openvino-toolkit/how-to-run-llama-3-2-locally-with-openvino-60a0f3674549) and incorporates some more advanced model preparation techniques used to retain better task accuracy of the model after quantization.
    ```
    optimum-cli export openvino --model meta-llama/Llama-3.2-3B-Instruct --task text-generation-with-past --weight-format int4 --group-size 64 --ratio 1.0 --sym --awq --scale-estimation --dataset "wikitext2" --all-layers llama-3.2-3b-instruct-INT4
    ```
1. Copy the resulting model directory into the `<project root>\models\` directory.

#### Model Preparation for Qualcomm AI PCs

1. Complete the steps in the `llm_on_genie` Qualcomm AI Hub tutorial to prepare a language model for use. We recommend that you start with Llama-v3.2-3B-Chat. This is likely to take a couple of hours with processing on Qualcomm AI Hub. The Qualcomm AI Hub model preparation jobs use several advanced model preparation techniques to retain better task accuracy during conversion.

1. Move the resulting `genie_bundle` directory under `<project root>\models\`.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Configure App

1. ```sh
    cp .env.example .env
    ```

1. Set the `INTEL_LLM_PATH` in the `.env` to match the model path above (ex: `models/llama-3.2-3b-instruct-INT4`).

1. Set the `QUALCOMM_LLM_PATH` in the `.env` to match the model path above (ex: `models/genie_bundle`).

1. Set `DEMO` to `false` for evaluation use or `true` to suppress the Electron Developer Tools.

## Usage

1. Start the DVD with:
    ```
    yarn dev
    ```

1. For initial use, load the initial sample vector store built from the Wikipedia page `2024 NBA Cup` and its linked pages by navigating to the upper left dropdown menu, selecting `Add new dataset`, entering `2024 NBA Cup` in the text box that appears to the right of the dropdown, and pressing the `Enter` key to start ingestion.

    1. <strong>Note</strong> - this integration with Wikipedia as a data source is built for <strong>evaluation usage only</strong>. Please refer to [MediaWiki API Etiquette guidelines](https://www.mediawiki.org/wiki/API:Etiquette) for broader usage.

    1. More datasets may be loaded either through the app interface or directly with the included `wiki_loader` utility:
        ```sh
        python python\wiki_loader.py "<Wikipedia page title>"
        ```
    
    1. The `renderer/data/suggestions-source.json` file keys are used to set the dropdown menu list in the interface and entries in the list are used as Suggested Prompts when that vector store is loaded.

1. Once the language model and vector store have loaded, use the text box and Suggested Prompts at the bottom of the interface to send requests through the RAG pipeline (triggering similarity search against the loaded vector store, retrieval of the top results, prompt creation using those results and the original query, and generation from the local language model).

![RAG DVD Demo on Intel AI PC](https://github.com/dell/dvd-ai-pc-rag/raw/main/assets/dvd-ai-pc-rag-demo-intel.gif "Demo on Intel AI PC")

![RAG DVD Demo on Qualcomm AI PC](https://github.com/dell/dvd-ai-pc-rag/raw/main/assets/dvd-ai-pc-rag-demo-qualcomm.gif "Demo on Qualcomm AI PC")

<p align="right">(<a href="#readme-top">back to top</a>)</p>


<!-- LICENSE -->
## License

Distributed under the Apache 2.0 License. See `LICENSE` for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>


<!-- ACKNOWLEDGEMENTS -->
## Acknowledgements

As this project is intended to help developers on their journey with AI PCs, we built off of several great projects and reference guides.

* [How to run Llama 3.2 locally with OpenVINO™](https://medium.com/openvino-toolkit/how-to-run-llama-3-2-locally-with-openvino-60a0f3674549)
* [Qualcomm AI Hub Chat App](https://github.com/quic/ai-hub-apps/tree/main/apps/windows/cpp/ChatApp)
* [Assistant UI Sample](https://github.com/Yonom/assistant-ui/tree/main/examples/with-external-store)
* [Nextron Sample - TailwindCSS](https://github.com/saltyshiomix/nextron/tree/main/examples/with-tailwindcss)

<p align="right">(<a href="#readme-top">back to top</a>)</p>


<!-- AUTHORS -->
## Authors

Tyler Cox, Aayooshi Dharmadhikari

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<h3 align="center">
    <a href="https://dell.com/ai">Learn more about Dell AI Solutions and the Dell AI Factory »</a>
</h3>

<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[contributors-shield]: https://img.shields.io/github/contributors/dell/dvd-ai-pc-rag.svg?style=for-the-badge
[contributors-url]: https://github.com/dell/dvd-ai-pc-rag/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/dell/dvd-ai-pc-rag.svg?style=for-the-badge
[forks-url]: https://github.com/dell/dvd-ai-pc-rag/network/members
[stars-shield]: https://img.shields.io/github/stars/dell/dvd-ai-pc-rag.svg?style=for-the-badge
[stars-url]: https://github.com/dell/dvd-ai-pc-rag/stargazers
[issues-shield]: https://img.shields.io/github/issues/dell/dvd-ai-pc-rag.svg?style=for-the-badge
[issues-url]: https://github.com/dell/dvd-ai-pc-rag/issues
[license-shield]: https://img.shields.io/github/license/dell/dvd-ai-pc-rag.svg?style=for-the-badge
[license-url]: https://github.com/dell/dvd-ai-pc-rag/blob/main/LICENSE
[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=555
[linkedin-url]: https://linkedin.com/in/linkedin_username
[product-screenshot]: images/screenshot.png
[Next.js]: https://img.shields.io/badge/next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white
[Next-url]: https://nextjs.org/
[React.js]: https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB
[React-url]: https://reactjs.org/
[Vue.js]: https://img.shields.io/badge/Vue.js-35495E?style=for-the-badge&logo=vuedotjs&logoColor=4FC08D
[Vue-url]: https://vuejs.org/
[Angular.io]: https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white
[Angular-url]: https://angular.io/
[Svelte.dev]: https://img.shields.io/badge/Svelte-4A4A55?style=for-the-badge&logo=svelte&logoColor=FF3E00
[Svelte-url]: https://svelte.dev/
[Laravel.com]: https://img.shields.io/badge/Laravel-FF2D20?style=for-the-badge&logo=laravel&logoColor=white
[Laravel-url]: https://laravel.com
[Bootstrap.com]: https://img.shields.io/badge/Bootstrap-563D7C?style=for-the-badge&logo=bootstrap&logoColor=white
[Bootstrap-url]: https://getbootstrap.com
[JQuery.com]: https://img.shields.io/badge/jQuery-0769AD?style=for-the-badge&logo=jquery&logoColor=white
[JQuery-url]: https://jquery.com 
