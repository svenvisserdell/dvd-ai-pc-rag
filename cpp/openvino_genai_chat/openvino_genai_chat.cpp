// Copyright (C) 2023-2024 Intel Corporation
// SPDX-License-Identifier: Apache-2.0

#include "openvino/genai/llm_pipeline.hpp"
#include "openvino/openvino.hpp"
#include <stdlib.h>  // for strtol

int main(int argc, char* argv[]) try {
    if (argc < 2) {
        throw std::runtime_error(std::string{"Usage: "} + argv[0] + " <MODEL_DIR>");
    }
    std::string prompt;
    std::string model_path = argv[1];
    std::string device;
    if (argc < 3) {
        device = "CPU";  // GPU, NPU can be used as well
    } else {
        device = argv[2];
    }

    ov::AnyMap properties;

    // Set pipeline with caching enabled for subsequent loads
    properties[ov::cache_dir.name()] = "ov_cache";
    
    ov::genai::LLMPipeline pipe(model_path, device, properties);
    
    ov::genai::GenerationConfig config;
    if (argc < 4) {
        config.max_new_tokens = 100;
    } else {
        config.max_new_tokens = strtol(argv[3], NULL, 10);
    }
    std::function<bool(std::string)> streamer = [](std::string word) { 
        std::cout << word << std::flush;
        // Return flag corresponds whether generation should be stopped.
        // false means continue generation.
        return false; 
    };

    pipe.start_chat();
    std::cout << "STATE: Model Loaded: " << model_path << "\n";
    // std::cout << "question:\n";
    while (std::getline(std::cin, prompt)) {
        auto result = pipe.generate(prompt, config, streamer);
        // auto perf_metrics = result.perf_metrics;
        std::cout << "\nSTATE: Finished\n";

        // std::cout << std::fixed << std::setprecision(2);
        // std::cout << "Generate duration: " << perf_metrics.get_generate_duration().mean << " ms" << std::endl;
        // std::cout << "TTFT: " << perf_metrics.get_ttft().mean  << " ms" << std::endl;
        // std::cout << "TPOT: " << perf_metrics.get_tpot().mean  << " ms/token " << std::endl;
        // std::cout << "Throughput: " << perf_metrics.get_throughput().mean  << " tokens/s" << std::endl;
        // std::cout << "\n----------\n"
        //     "question:\n";
    }
    pipe.finish_chat();
} catch (const std::exception& error) {
    try {
        std::cerr << error.what() << '\n';
    } catch (const std::ios_base::failure&) {}
    return EXIT_FAILURE;
} catch (...) {
    try {
        std::cerr << "Non-exception object thrown\n";
    } catch (const std::ios_base::failure&) {}
    return EXIT_FAILURE;
}
