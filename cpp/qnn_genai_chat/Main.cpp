// ---------------------------------------------------------------------
// Copyright (c) 2024 Qualcomm Innovation Center, Inc. All rights reserved.
// SPDX-License-Identifier: BSD-3-Clause
// ---------------------------------------------------------------------
#include <filesystem>
#include <fstream>
#include <iostream>
#include <string>

#include "ChatApp.hpp"

namespace
{

constexpr const std::string_view c_option_genie_config = "--genie-config";
constexpr const std::string_view c_option_base_dir = "--base-dir";
constexpr const std::string_view c_option_help = "--help";
constexpr const std::string_view c_option_help_short = "-h";

void PrintHelp()
{
    std::cout << "\n:::::::: Chat with " << App::c_bot_name << " options ::::::::\n\n";
    std::cout << c_option_genie_config << " <Local file path>: [Required] Path to local Genie config for model.\n";
    std::cout << c_option_base_dir
              << " <Local directory path>: [Required] Base directory to set as the working directory.\n";
    std::cout << "\nDuring chat with " << App::c_bot_name << ", please type " << App::c_exit_prompt
              << " as a prompt to terminate chat.\n ";
}

void PrintWelcomeMessage()
{
    std::cout << "\n:::::::: Welcome to Chat with " << App::c_bot_name << " ::::::::\n ";
    std::cout << App::c_bot_name << " will use provided configuration file for conversation.\n";
    std::cout << "At any time during chat, please type `" << App::c_exit_prompt
              << "` to terminate the conversation.\n\n";
    std::cout << "Let's begin with an introduction,\n";
    std::cout << "I'm `" << App::c_bot_name << "`! What's your name? ";
}

} // namespace

int main(int argc, char* argv[])
try
{
    if (argc < 2)
    {
        throw std::runtime_error(std::string{"Usage: "} + argv[0] + " <MODEL_DIR>");
    }
    std::string prompt;
    std::string model_path = argv[1];
    std::string device;
    std::string genie_config_path = std::filesystem::path(argv[1]).concat("\\genie_config.json").string();
    std::string base_dir = argv[1];
    std::string config;
    if (argc < 3)
    {
        device = "NPU"; // GPU, NPU can be used as well
    }
    else
    {
        device = argv[2];
    }

    try
    {
        // Load genie_config_path into std::string config before changing directory
        std::ifstream config_file(genie_config_path);
        if (!config_file)
        {
            throw std::runtime_error("Failed to open Genie config file: " + genie_config_path);
        }

        config.assign((std::istreambuf_iterator<char>(config_file)), std::istreambuf_iterator<char>());

        std::filesystem::current_path(base_dir);

        App::ChatApp app(config, base_dir);

        // Get user name to chat with
        // PrintWelcomeMessage();
        // std::getline(std::cin, user_name);

        // Interactive chat
        app.ChatWithUser("");
    }
    catch (const std::exception& e)
    {
        std::cerr << "Error: " << e.what() << "\n";
        return 1;
    }
    catch (...)
    {
        std::cerr << "Unknown error.\n";
        return 1;
    }
    return 0;
}
catch (const std::exception& error)
{
    try
    {
        std::cerr << error.what() << '\n';
    }
    catch (const std::ios_base::failure&)
    {
    }
    return EXIT_FAILURE;
}
catch (...)
{
    try
    {
        std::cerr << "Non-exception object thrown\n";
    }
    catch (const std::ios_base::failure&)
    {
    }
    return EXIT_FAILURE;
}