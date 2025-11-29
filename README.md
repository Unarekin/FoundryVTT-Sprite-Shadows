![GitHub package.json version](https://img.shields.io/github/package-json/v/Unarekin/FoundryVTT-Sprite-Shadows)
![Supported Foundry Version](https://img.shields.io/endpoint?url=https%3A%2F%2Ffoundryshields.com%2Fversion%3Fstyle%3Dflat%26url%3Dhttps%3A%2F%2Fraw.githubusercontent.com%2FUnarekin%2FFoundryVTT-Sprite-Shadows%2Frefs%2Fheads%2Fmain%2Fmodule.json)
![Supported Game Systems](https://img.shields.io/endpoint?url=https%3A%2F%2Ffoundryshields.com%2Fsystem%3FnameType%3Dfull%26showVersion%3D1%26style%3Dflat%26url%3Dhttps%3A%2F%2Fraw.githubusercontent.com%2FUnarekin%2FFoundryVTT-Sprite-Shadows%2Frefs%2Fheads%2Fmain%2Fmodule.json)

![GitHub Downloads (specific asset, latest release)](https://img.shields.io/github/downloads/Unarekin/FoundryVTT-Sprite-Shadows/latest/module.zip)
[![Forge Installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2FSprite-Shadows)](https://forge-vtt.com/bazaar#package=Sprite-Shadows) 


[![Discord](https://img.shields.io/badge/Discord-%235865F2.svg?&logo=discord&logoColor=white)](https://discord.gg/MdvvxtnCRJ)

<img width="800" height="175" alt="image" src="https://github.com/user-attachments/assets/206fde0c-2993-41cc-b403-14a92fc8c772" />

- [Sprite Shadows](#sprite-shadows)
- [Installation](#installation)
- [Usage](#usage)
  - [Blob Shadows](#blob-shadows)
  - [Stencil Shadows](#stencil-shadows)
  - [Size and Position Adjustments](#size-and-position-adjustments)
- [Sprite Animations](#sprite-animations)

# Sprite Shadows
Sprite Shadows adds the option to automatically add shadows to your tokens and tiles, making it easier to have dynamic, immersive shadows for your scene elements.

# Installation
You can install this module by copying and pasting the following manifest URL in the text field at the bottom of the Foundry module installer:
```
https://github.com/Unarekin/FoundryVTT-Battle-Transitions/releases/latest/download/module.json
```

# Usage

Configuring a shadow for a given token or tile can be done via the "Shadows" tab on the object's configuration application.  Most of the options should be fairly self-explanatory.

## Blob Shadows
<img width="300" align="right" alt="image" src="https://github.com/user-attachments/assets/900fcc9e-895f-47ff-9d4b-24648663860a" />


A blob shadow adds a circular shadow  underneath the token or tile.  This shadow can be configured to be automatically adjusted based on the token or tile's elevation, allowing for either the shadow to be shifted down or the token itself to be shifted up as it raises and lowers.

<img width="500" alt="image" src="https://github.com/user-attachments/assets/ed882ba1-5d35-4ac8-9082-92e9ec002a59" />


## Stencil Shadows
<img width="300" align="right" alt="image" src="https://github.com/user-attachments/assets/f723eb82-ca4e-4341-b9e9-cb33876fd2d8" />


Stencil shadows use the token or tile's texture image, skewed to fake a 3d projection.

<img width="500"  alt="image" src="https://github.com/user-attachments/assets/c756e3a6-b15f-4fbe-940a-2875d137ea93" />


## Size and Position Adjustments
Both blob and stencil shadows support some simple size and position adjustments, to fine-tune just how they're positioned on the canvas.  In the case of tokens, these values are scaled based on the grid dimensions of the token.

# Sprite Animations
- [Sprite Animations](https://foundryvtt.com/packages/sprite-animations) 1.4.0+ has built-in support for updating a stencil shadow when animating a token or tile.
