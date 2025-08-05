import kaplay from "kaplay";
import LDTK from "../src/plugin";

const k = kaplay({
  plugins: [LDTK],
  width: 320,
  height: 320,
  letterbox: true,
  crisp: true,
});

const p = k.addLDTKProject();
await p.loadFromURL("./showcaseLevel.ldtk");
// You could also do: p.loadFromObject(someLDTKJsonObjectThatWasParsed);

p.registerEntity("Player", (data) => {
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
    const MoveSpeed = data.getField<number>("MoveSpeed") ?? 160;
    player.pos.x += moveVec.x * MoveSpeed * k.dt();
    player.pos.y += moveVec.y * MoveSpeed * k.dt();
  });
});

k.onUpdate(() => {
  if (k.isKeyPressed("escape")) {
    k.scene("cool", async () => {
      const p = k.addLDTKProject();
      await p.loadFromURL("./autolayershowcase.ldtk");

      p.spawn();
    });

    k.go("cool");
  }
});

p.spawn();
