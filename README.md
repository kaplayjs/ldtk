# LDTK Level Loader Plugin for KAPLAY

This plugin allows you to load levels from the [LDTK](https://ldtk.io/) editor into your KAPLAY game. It also contains functions to assist you in creating your own Entities for these levels.

## Installation

```sh
pnpm install @kaplay/ldtk
```

## Usage

```ts
import kaplay from "kaplay";
import LDTK from "ldtk";

const k = kaplay({
  plugins: [LDTK], // Register the LDTK plugin
});

const p = k.addLDTKProject(); // Setup the project for use
await p.loadFromURL("./showcaseLevel.ldtk"); // Load the project
// You could also do: p.loadFromObject(someLDTKJsonObjectThatWasParsed);

// The "Player" variable is the type of entity that were registering
p.registerEntity("Player", (data) => {
  // This function is run when the Player entity is placed in the level, so here is the perfect place to add them to the scene
  const player = data.LDTKSceneObject.add([
    k.rect(data.size.x, data.size.y),
    k.pos(data.pos.x, data.pos.y),
    k.body(),
    k.area(),
    data.id,
  ]);

  player.onUpdate(() => {
    let moveVec = k.vec2(0, 0);
    if (k.isKeyDown("left")) {
      moveVec.x -= 1;
    }
    if (k.isKeyDown("right")) {
      moveVec.x += 1;
    }
    if (k.isKeyDown("up")) {
      moveVec.y -= 1;
    }
    if (k.isKeyDown("down")) {
      moveVec.y += 1;
    }

    moveVec = moveVec.unit();
    const MoveSpeed = data.getField<number>("MoveSpeed") ?? 160; // Get "MoveSpeed" from LDTK, this is how fast we will go
    player.pos.x += moveVec.x * MoveSpeed * k.dt();
    player.pos.y += moveVec.y * MoveSpeed * k.dt();
  });
});

p.spawn(); // Add the level to the scene

// p can be used now like any kind of object in kaplay
```

## Showcase

![Showcase](/public/showcaseImage.png)
