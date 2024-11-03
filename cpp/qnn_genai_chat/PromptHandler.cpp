// ---------------------------------------------------------------------
// Copyright (c) 2024 Qualcomm Innovation Center, Inc. All rights reserved.
// SPDX-License-Identifier: BSD-3-Clause
// ---------------------------------------------------------------------
#include "PromptHandler.hpp"
#include "ChatApp.hpp"

using namespace AppUtils;

constexpr const std::string_view c_first_prompt_prefix_part_1 = "[INST] <<SYS>>\nYour name is ";
constexpr const std::string_view c_first_prompt_prefix_part_2 =
    "and you are a helpful AI assistant. Please keep answers consice and to the point. \n<</SYS>>\n\n";
constexpr const std::string_view c_prompt_prefix = "[INST] ";
constexpr const std::string_view c_end_of_prompt = " [/INST] ";

Llama2PromptHandler::Llama2PromptHandler()
    : m_is_first_prompt(true)
{
}

std::string Llama2PromptHandler::GetPromptWithTag(const std::string& user_prompt)
{
    // Ref: https://www.llama.com/docs/model-cards-and-prompt-formats/meta-llama-2/
    if (m_is_first_prompt)
    {
        m_is_first_prompt = false;
        return std::string(c_first_prompt_prefix_part_1) + App::c_bot_name.data() +
               c_first_prompt_prefix_part_2.data() + user_prompt + c_end_of_prompt.data();
    }
    return std::string(c_prompt_prefix) + user_prompt.data() + c_end_of_prompt.data();
}


constexpr const std::string_view c_3_first_prompt_prefix_part_1 =
    "<|begin_of_text|>\n<|start_header_id|>system<|end_header_id|>\n\n";
constexpr const std::string_view c_3_first_prompt_prefix_part_2 =
    "You are a helpful AI assistant. Please keep answers concise and to the point.<|eot_id|>\n";
constexpr const std::string_view c_3_prompt_prefix = "<|start_header_id|>user<|end_header_id|>\n\n";
constexpr const std::string_view c_3_end_of_prompt = "<|eot_id|>\n<|start_header_id|>assistant<|end_header_id|>\n\n";
constexpr const std::string_view c_3_end_of_text = " <|end_of_text|> ";

Llama3PromptHandler::Llama3PromptHandler()
    : m_is_first_prompt(true)
{
}

std::string Llama3PromptHandler::GetPromptWithTag(const std::string& user_prompt)
{
    // Ref: https://www.llama.com/docs/model-cards-and-prompt-formats/meta-llama-3/
    if (m_is_first_prompt)
    {
        m_is_first_prompt = false;
        return std::string(c_3_first_prompt_prefix_part_1) + c_3_first_prompt_prefix_part_2.data() + user_prompt +
               c_3_end_of_prompt.data();
    }
    return std::string(c_3_prompt_prefix) + user_prompt.data() + c_3_end_of_prompt.data();
}