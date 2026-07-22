<p align="center">
  <img alt="OoTMM Logo" with="256" height="256" src="https://raw.githubusercontent.com/OoTMM/OoTMM/master/packages/web/src/assets/logo.png"/>
  <p align="center">The Ocarina of Time/Majora's Mask Combo Randomizer</p>
</p>

![badge-version](https://img.shields.io/github/v/tag/OoTMM/OoTMM?label=version&sort=semver)
![badge-license](https://img.shields.io/github/license/OoTMM/OoTMM)
![badge-build](https://img.shields.io/github/actions/workflow/status/OoTMM/OoTMM/ci.yml?branch=master)
![badge-stars](https://img.shields.io/github/stars/OoTMM/OoTMM)
![badge-discord](https://discordapp.com/api/guilds/1004394204992118935/widget.png?style=shield)

## Overview

OoTMM is a randomizer for the N64 games Ocarina of Time and Majora's Mask.
It combines both games into a single rom and randomizes the placement of most items in the games.
A large number of settings are available to customize the experience.

## What's new?

We maintain a comprehensive [changelog](CHANGELOG.md) that details all the changes in each release.

## Usage

We **strongly** recommend that you use the [Web-based generator](https://ootmm.com).

## OoTMM PC

This fork powers the [OoTMM PC ports](https://github.com/OotMM-PC). It builds and
runs natively on Windows. No Docker or WSL.

### Install

This part is done once. You need all of the following installed:

 * [Node](https://nodejs.org) 22 or newer
 * [pnpm](https://pnpm.io)
 * [Git](https://git-scm.com)
 * [Visual Studio](https://visualstudio.microsoft.com/vs/community/) with the "Desktop development with C++" workload

Open the "x64 Native Tools Command Prompt for VS" from the start menu and run
these commands. The first one moves you to your user folder, `C:\Users\<your name>`.
If you would rather keep OoTMM somewhere else, go there instead. The curl lines
download the N64 compiler (about 90 MB), prebuilt by the libdragon project, and
the Ninja build tool; the build finds both in `third_party\n64-toolchain` by
itself.

    cd %USERPROFILE%
    git clone https://github.com/OotMM-PC/OoTMM
    cd OoTMM
    git clone --depth=1 https://github.com/decompals/ultralib third_party/ultralib
    curl -L -o n64-toolchain.zip https://github.com/DragonMinded/libdragon/releases/download/toolchain-continuous-prerelease/gcc-toolchain-mips64-win64.zip
    mkdir third_party\n64-toolchain
    tar -xf n64-toolchain.zip -C third_party\n64-toolchain
    del n64-toolchain.zip
    curl -L -o ninja-win.zip https://github.com/ninja-build/ninja/releases/latest/download/ninja-win.zip
    tar -xf ninja-win.zip -C third_party\n64-toolchain\bin
    del ninja-win.zip

Now copy your roms into the `roms` folder inside the OoTMM folder: Ocarina of
Time (U or J, 1.0) named `oot.z64` and Majora's Mask (U only) named `mm.z64`.
The roms need to be in native byte order (big endian); programs such as Tool 64
can convert them. The build reads them in its last step.

Back in the command prompt:

    pnpm install
    cd packages\core
    pnpm run build
    cd ..\tools
    pnpm run build
    cd ..\generator
    npx tsx ./lib/build.ts

That is the whole install.

### Generating seeds

Every time you want the generator, open any command prompt and run:

    cd %USERPROFILE%\OoTMM\packages\gui
    pnpm dev

Then open the printed URL in your browser. If you put OoTMM somewhere else,
start from that folder instead.

You can also generate PC seeds from the command line. From `packages\generator`:

    npx tsx ./lib/pc-seed-cli.ts --seed MYSEED

## Support

If you need help, you can ask for help on our [Discord server](https://discord.gg/4QdtPBP6wf).

## Manual Setup

You need the following roms:

 * Ocarina of Time (U or J, 1.0)
 * Majora's Mask (U only)

The roms need to be in their native byte-order (big endian). You can use programs such as Tool 64 to convert the roms to the correct format.
The roms need to be named `oot.z64` and `mm.z64` respectively and placed in the `roms` folder.

## Build

You can build OoTMM with either a DevContainer or your native environment.

### DevContainer (recommended)

You need:

 * Docker
 * Visual Studio Code
 * Remote - Containers extension

Open the project in Visual Studio Code and click on the "Reopen in Container" button that appears in the bottom right corner.
That's it.

### Native

You need:

 * A C/C++ toolchain for your system
 * CMake
 * Ninja
 * [n64-ultra](https://github.com/glankk/n64)
 * Node 22 or newer
 * Git

On windows, we recommend using [WSL2](https://learn.microsoft.com/en-us/windows/wsl/install) to build OoTMM.

Install everything you need:

    ./scripts/setup.sh

### Using the build

You can generate a seed:

    pnpm start:config

The output will be `out/OoTMM.z64`.

## License

This project is licensed under the [MIT license](LICENSE).

## Author

This project was created by [Maxime Bacoux "Nax"](https://github.com/Nax).
