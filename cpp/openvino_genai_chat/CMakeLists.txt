# Copyright (C) 2023-2024 Intel Corporation
# SPDX-License-Identifier: Apache-2.0

find_package(OpenVINOGenAI REQUIRED PATHS
    "${CMAKE_BINARY_DIR}"  # Reuse the package from the build.
    ${OpenVINO_DIR}  # GenAI may be installed alogside OpenVINO.
)

add_executable(openvino_genai_chat openvino_genai_chat.cpp)
target_link_libraries(openvino_genai_chat PRIVATE openvino::genai)
set_target_properties(openvino_genai_chat PROPERTIES
    COMPILE_PDB_NAME openvino_genai_chat
    # Ensure out of box LC_RPATH on macOS with SIP
    INSTALL_RPATH_USE_LINK_PATH ON)
target_compile_features(openvino_genai_chat PRIVATE cxx_std_11)

install(TARGETS openvino_genai_chat
        RUNTIME DESTINATION samples_bin/
        COMPONENT samples_bin
        EXCLUDE_FROM_ALL)
