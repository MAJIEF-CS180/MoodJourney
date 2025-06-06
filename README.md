# MoodJourney
**MoodJourney is a modern, digital and user-friendly journaling application that promotes self-reflection through features such as sentiment analysis and mood trend visualization. The application has the following features:**
* Provides a secure and accessible platform for users to create and store journal entries
* Promotes self-reflection through visualizing “mood trends” from sentiment analysis
* Dynamic calendar that showcases emotions
* Generates AI suggestions for Journal Entries to provide feedback
* Dictation to transcribe audio into text
* Chat with AI Assistant with context from the Journal

This project was developed by Michael Tin, Augustine Ayoub, James Krejci, Isaias Bernal, Eddie Nguyen, and Falak Tulsi for CS180 (Software Engineering) at the University of California, Riverside for the Spring 2025 term.

## Minimum System Requirements

- Intel Core i5 Processor or AMD Ryzen 5 Processor
- 8GB RAM
- 256GB SSD (NVMe or SATA)
- Windows 10 21H2 (64-bit), macOS 10.15 Catalina, or a modern Linux distribution (i.e. Ubuntu 20.04)
- Internet Connection

## Prerequisites

- Git - [Installation](https://git-scm.com/downloads)
- Python - [Installation](https://www.python.org/downloads/)
- Visual Studio Code - [Installation](https://code.visualstudio.com/download)
- Node.js - [Installation](https://nodejs.org/en)
    - To verify installation, open a Command Prompt/Terminal and run `node -v` and then `npm -v`.
- Rust - [Installation](https://www.rust-lang.org/tools/install)
    - To verify installation, open a Command Prompt/Terminal and run `rustc --version` and then `cargo --version`.

On Windows, you can download Git, Python, and Visual Studio Code through [Ninite](https://ninite.com/) to simplify the installation process.

## Platform-Specific Dependencies

### Windows

- Visual Studio 2022 - [Installation](https://learn.microsoft.com/en-us/cpp/build/vscpp-step-0-installation?view=msvc-170)
    - **When prompted by the installer, select the "Desktop development with C++" workload.**
- LLVM 18.1.8 - [Installation](https://github.com/llvm/llvm-project/releases/tag/llvmorg-18.1.8)
    - **When prompted by the installer, ensure to select "Add LLVM to the system PATH for all users".**
    - To verify installation, open a Command Prompt and run `clang -v`.
- CMake - [Installation](https://cmake.org/download/)
    - **When prompted by the installer, ensure to select "Add CMake to the system PATH for all users".**
    - To verify installation, open a Command Prompt and run `cmake --version`.

### macOS

- Xcode Command Line Tools
    - Open a Terminal and run `xcode-select --install`.
- Homebrew - [Installation](https://brew.sh/)
- LLVM
    - Open a Terminal and run `brew install llvm`.
- CMake
    - Open a Terminal and run `brew install cmake`.

### Linux

- Essential Build Tools
    - Open a Terminal and run `sudo apt-get update` then `sudo apt-get install -y build-essential`.
- LLVM
    - Open a Terminal and run `sudo apt-get install -y llvm`.
- CMake
    - Open a Terminal and run `sudo apt-get install -y cmake`.
- GLib Development Libraries
    - Open a Terminal and run `sudo apt-get install -y libglib2.0-dev`.
- GTK 3.0 Development Libraries
    - Open a Terminal and run `sudo apt-get install -y libgtk-3-dev`.
- WebKitGTK Development Libraries
    - Open a Terminal and run `sudo apt-get install -y libwebkit2gtk-4.1-dev`.
- libsoup Development Libraries
    - Open a Terminal and run `sudo apt-get install -y libsoup-3.0-dev`.


## Installation

**IMPORTANT: If you are on Windows, please use a Developer Command Prompt for VS 2022 for the installation.**

1. Download and install the necessary Python packages to run the application. **Ensure that these three commands are run from the home directory in your Command Prompt/Terminal.**

```
pip install requests
pip install transformers
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
```

2. Clone the repository and navigate to the project folder directory.

```
git clone https://github.com/MAJIEF-CS180/MoodJourney.git
cd MoodJourney
```

3. Download the WhisperAI dictation model and the DistilRoBERTa sentiment analysis model from HuggingFace.

```
cd scripts
python download_model_dictation.py
python download_model_emotion.py
cd ..
```

4. Navigate to the `src-tauri\src` directory. You will find a file named `config_template.rs`. Make a copy of this file and name the new file `config.rs`.

5. You will need to generate a Gemini 2.0 Flash API key in order to run the Assistant feature. This API key can be generated from the [Google AI Studio](https://aistudio.google.com/app/apikey) website. You will need a Google Account.

6. In `config.rs`, replace `YOUR_GEMINI_API_KEY_GOES_HERE` with the API key that you generated.

7. Navigate to the project folder directory again. Download and install the Tauri CLI. Verify the installation.

```
npm install -g @tauri-apps/cli
tauri --version
```

8. Download and install the Node.js dependencies.

```
npm install
```

9. Build and run the application.

```
npm run tauri dev
```
