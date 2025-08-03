import {
  type Vec2,
  type DrawSpriteOpt,
  type SpriteData,
  type GameObj,
  type KAPLAYCtx,
  type PosComp,
  type Asset,
  type Quad,
  type RotateComp,
  type ScaleComp,
} from "kaplay";
import {
  LDTKJSONRoot,
  Level,
  LayerInstance,
  WorldLayout,
  World,
  FieldInstance,
  TilesetRectangle,
  TileInstance,
  ReferenceToAnEntityInstance,
  Type,
} from "./LDTKFormat";

/* 
INFO FOR LAJBEL!!!!!!!!
./LDTKFormat was made using https://app.quicktype.io/
The schema is available here https://ldtk.io/files/JSON_SCHEMA.json
*/

async function safe<Result>(
  promise: Promise<Result>
): Promise<[Result, null] | [null, Error]> {
  try {
    const value = await promise;
    return [value, null];
  } catch (error) {
    let returnedError: Error;
    if (error instanceof Error) {
      returnedError = error;
    } else if (error instanceof Object) {
      returnedError = new Error(JSON.stringify(error));
    } else {
      returnedError = new Error(String(error));
    }
    return [null, returnedError];
  }
} // shorter version of my safe function just for this, to eliminate the need for an extra dep

// Types
export type LDTKOptions = {
  rootUrl?: string;
  levelFolder?: string;
  pos?: Vec2;
  world?: number;
  levelOffset?: number;
};

export type LDTKTile = {
  sprite: Asset<SpriteData>;
  quad: Quad;
};

export type LDTKAsset = {
  name: string;
  size: Vec2;
  tileSize: Vec2;
  spacing: number;
  padding: number;
  uid: number;
  data: Asset<SpriteData>;
};

// Internal Types
type EntityScript = {
  [entityName: string]: {
    init: (data: LDTKEntity) => void;
    postInit?: (data: LDTKEntity) => void;
  };
};

type EntityPostProcessScript = {
  [entityName: string]: {
    entityClass: LDTKEntity;
    postInit: (data: LDTKEntity) => void;
  };
};

// Classes

/**
 * Represents an IntGrid tile in a LDTK level.
 *
 * @class LDTKIntGridTile
 * @property {string} id - The unique identifier for the IntGrid tile.
 * @property {Vec2} pos - The position of the tile in the level.
 * @property {number} value - The value of the IntGrid tile.
 * @property {Vec2} size - The size of the tile.
 * @property {GameObj<PosComp>} LDTKSceneObject - The KAPLAY game object for the LDTK project.
 * @property {LDTKAssetStorage} assets - The asset storage containing the tile's assets.
 */
export class LDTKIntGridTile {
  public id: string;
  public pos: Vec2;
  public value: number;
  public size: Vec2;
  public LDTKSceneObject: GameObj<PosComp>;
  public assets: LDTKAssetStorage;

  constructor({
    id,
    pos,
    value,
    size,
    LDTKSceneObject,
    assets,
  }: {
    id: string;
    pos: Vec2;
    value: number;
    size: Vec2;
    LDTKSceneObject: GameObj<PosComp>;
    assets: LDTKAssetStorage;
  }) {
    this.id = id;
    this.pos = pos;
    this.value = value;
    this.size = size;
    this.LDTKSceneObject = LDTKSceneObject;
    this.assets = assets;
  }
}

/**
 * Represents an entity in a LDTK level.
 *
 * @class LDTKEntity
 * @property {string} name - The name of the entity.
 * @property {Vec2} pos - The position of the entity in the level.
 * @property {Record<string, any>} fields - The fields of the entity, containing data from LDTK.
 * @property {Vec2} size - The size of the entity.
 * @property {FieldInstance[]} fieldsRaw - The raw data for the fields.
 * @property {GameObj<PosComp>} LDTKSceneObject - The KAPLAY game object for the ldtk level, when adding, instead of k.add, do data.LDTKSceneObject.add.
 * @property {string} id - The unique identifier for the entity, use this in your add function as a tag to make sure other entities
 * can reference this using the LDTK editor.
 * @property {Record<string, any>} persistedData - Data that persists across the initializer and the post processing scripts.
 * @property {LDTKAssetStorage} assets - The asset storage containing the entity's assets if they are needed.
 */
export class LDTKEntity {
  public name: string;
  public pos: Vec2;
  public fields: Record<string, any>;
  public size: Vec2;
  public fieldsRaw: FieldInstance[];
  public LDTKSceneObject: GameObj<PosComp>;
  public id: string;
  public persistedData: Record<string, any> = {};
  public assets: LDTKAssetStorage;
  protected k: KAPLAYCtx;

  constructor({
    name,
    pos,
    fields,
    size,
    fieldsRaw,
    LDTKSceneObject,
    id,
    assets,
    k,
  }: {
    name: string;
    pos: Vec2;
    fields: Record<string, any>;
    size: Vec2;
    fieldsRaw: FieldInstance[];
    LDTKSceneObject: GameObj<PosComp>;
    id: string;
    assets: LDTKAssetStorage;
    k: KAPLAYCtx;
  }) {
    this.name = name;
    this.pos = pos;
    this.fields = fields;
    this.size = size;
    this.fieldsRaw = fieldsRaw;
    this.LDTKSceneObject = LDTKSceneObject;
    this.id = id;
    this.assets = assets;
    this.k = k;
  }

  /**
   * Gets an entity from the LDTK scene based on its reference in LDTK.
   * To use this, make a field that has an Entity type in LDTK.
   *
   * @example
   * ```ts
   * /// assuming that "PlayerRef" is a field in LDTK that references the player entity
   * const player = data.getEntity(data.getField("PlayerRef"));
   * ```
   *
   * @param ref - The reference to the entity instance, containing the entity's unique ID.
   * @returns An array of GameObj<any> representing the entity, or undefined if the entity is not found.
   */
  public getEntity(
    ref: ReferenceToAnEntityInstance | undefined
  ): GameObj<any>[] | undefined {
    if (!ref || !ref.entityIid) {
      return undefined;
    }
    return this.LDTKSceneObject.get(ref.entityIid);
  }

  /**
   * Gets a tile from the tileset based on the provided TilesetRectangle reference.
   *
   * @example
   * ```ts
   * // assuming that "TileRef" is a field in LDTK that references a tile
   * const tile = data.getTile(data.getField("TileRef"));
   *
   * k.add([
   *  k.sprite(tile.sprite, { quad: tile.quad })
   * ])
   *
   * @param ref - The TilesetRectangle reference containing the tileset UID and coordinates.
   * @returns An LDTKTile object if found, otherwise undefined.
   */
  public getTile(ref: TilesetRectangle | undefined): LDTKTile | undefined {
    if (!ref) {
      return undefined;
    }
    const asset = this.assets.getAssetByUid(ref.tilesetUid);
    if (!asset) {
      console.warn(`Tileset with UID ${ref.tilesetUid} not found.`);
      return undefined;
    }
    const quad = this.assets.getQuad(
      asset.name,
      this.k.vec2(ref.x / asset.tileSize.x, ref.y / asset.tileSize.y)
    );
    if (!quad) {
      console.warn(
        `Quad for tileset "${asset.name}" at position (${ref.x}, ${ref.y}) not found.`
      );
      return undefined;
    }
    return {
      sprite: asset.data,
      quad: quad,
    };
  }

  /**
   * Retrieves the value from a field in LDTK on this entity.
   *
   * @template T The expected type of the field's value. Defaults to `any`.
   * @param {string} field The name of the field to get.
   * @returns {T | undefined} The value of the field, or `undefined` if the field is not found.
   *
   * @example
   * ```typescript
   * const health = entity.getField<number>("InitialHealth");
   * if (health !== undefined) {
   *   console.log("Health:", health);
   * }
   * ```
   */
  public getField<T = any>(field: string): T | undefined {
    if (!(field in this.fields)) {
      console.warn(`Field "${field}" not found in entity "${this.name}".`);
      return undefined;
    }
    return this.fields[field] as T;
  }

  /**
   * Lists the fields available.
   * @returns {string[]} An array of strings representing the keys of the fields.
   */
  public listFields(): string[] {
    return Object.keys(this.fields);
  }

  /**
   * Gets the type of a field in LDTK.
   * This is useful for checking what kind of data you can expect from a field.
   *
   * @param {string} field The name of the field to get the type of.
   * @returns {string | undefined} The type of the field, or `undefined` if the field does not exist.
   */
  public getFieldType(field: string): string | undefined {
    if (!this.listFields().includes(field)) {
      console.warn(`Field "${field}" not found in entity "${this.name}".`);
      return undefined;
    }
    return (
      this.fieldsRaw.find((f: FieldInstance) => f.__identifier === field)
        ?.__type ?? "unknown"
    );
  }
}

class LDTKAssetStorage {
  protected k: KAPLAYCtx;
  protected assets: Record<string, LDTKAsset> = {};

  constructor(k: KAPLAYCtx) {
    this.k = k;
  }

  public addAsset(name: string, asset: LDTKAsset) {
    if (this.assets[name]) {
      return;
    }
    this.assets[name] = asset;
  }

  public assetExists(name: string): boolean {
    return !!this.assets[name];
  }

  public getAsset(name: string): LDTKAsset | undefined {
    return this.assets[name];
  }

  public getAssetByUid(uid: number): LDTKAsset | undefined {
    return Object.values(this.assets).find((asset) => asset.uid === uid);
  }

  public getSprite(name: string): Asset<SpriteData> | undefined {
    const asset = this.assets[name];
    if (!asset) {
      console.warn(`Asset "${name}" not found.`);
      return undefined;
    }
    return asset.data;
  }

  public getQuad(spriteName: string, pos: Vec2): Quad | undefined {
    const asset = this.assets[spriteName];
    if (!asset) {
      console.warn(`Asset "${spriteName}" not found.`);
      return undefined;
    }
    const tileSize = asset.tileSize;
    const quadX =
      (pos.x * tileSize.x + asset.spacing * pos.x + asset.padding) /
      asset.size.x;
    const quadY =
      (pos.y * tileSize.y + asset.spacing * pos.y + asset.padding) /
      asset.size.y;
    const quadWidth = tileSize.x / asset.size.x;
    const quadHeight = tileSize.y / asset.size.y;

    return this.k.quad(quadX, quadY, quadWidth, quadHeight);
  }
}

/**
 * The LDTK project loader and manager.
 *
 * This class is for loading, parsing, and spawning a LDTK project
 * into a KAPLAY game.
 *
 * @class LDTKProject
 * @property {GameObj<PosComp | RotateComp | ScaleComp>} rootEntity - The root entity for the LDTK project.
 * @property {LDTKJSONRoot} data - The parsed LDTK JSON data.
 *
 * @example
 * ```ts
 * import kaplay from "kaplay";
 * import LDTK from "ldtk";
 *
 * const k = kaplay({
 *   plugins: [LDTK], // Register the LDTK plugin
 * });
 *
 * const p = k.addLDTKProject(); // Setup the project for use
 * await p.loadFromURL("./showcaseLevel.ldtk"); // Load the project
 * // You could also do: p.loadFromObject(someLDTKJsonObjectThatWasParsed);
 *
 * // The "Player" variable is the type of entity that were registering
 * p.registerEntity("Player", (data) => {
 *   // This function is run when the Player entity is placed in the level, so here is the perfect place to add them to the scene
 *   const player = data.LDTKSceneObject.add([
 *     k.rect(data.size.x, data.size.y),
 *     k.pos(data.pos.x, data.pos.y),
 *     k.body(),
 *     k.area(),
 *     data.id,
 *   ]);
 *
 *   player.onUpdate(() => {
 *     let moveVec = k.vec2(0, 0);
 *     if (k.isKeyDown("left")) {
 *       moveVec.x -= 1;
 *     }
 *     if (k.isKeyDown("right")) {
 *       moveVec.x += 1;
 *     }
 *     if (k.isKeyDown("up")) {
 *       moveVec.y -= 1;
 *     }
 *     if (k.isKeyDown("down")) {
 *       moveVec.y += 1;
 *     }
 *
 *     moveVec = moveVec.unit();
 *     const MoveSpeed = data.getField<number>("MoveSpeed") ?? 160; // Get "MoveSpeed" from LDTK, this is how fast we will go
 *     player.pos.x += moveVec.x * MoveSpeed * k.dt();
 *     player.pos.y += moveVec.y * MoveSpeed * k.dt();
 *   });
 * });
 *
 * p.spawn(); // Add the level to the scene
 *
 * // p can be used now like any kind of object in kaplay
 * ```
 */
export class LDTKProject {
  protected k: KAPLAYCtx;
  protected rootUrl: string = "./"; // Assets url, strips the file since ldtk gets relative files to the ldtk file
  protected LDTKLFolder: string = "./ldtk"; // Folder for where LDTKL files are stored, old feature but not deprecated so i must support it
  public rootEntity: GameObj<PosComp | RotateComp | ScaleComp>;
  public data?: LDTKJSONRoot;
  protected options: LDTKOptions = {};
  protected entities: EntityScript = {};
  protected postProcessEntities: EntityPostProcessScript = {};
  protected intGridTiles: ((data: LDTKIntGridTile) => void)[] = [];
  protected layout?: WorldLayout;
  protected worldIndex: number = 0;
  protected worlds: World[] = [];
  protected world?: World;
  protected levelid: string = crypto.randomUUID();
  protected levelOffset: number = 48;
  protected assets: LDTKAssetStorage;

  constructor(_k: KAPLAYCtx, options?: LDTKOptions) {
    this.k = _k;
    this.options = options || {};

    this.rootEntity = this.k.add([
      this.k.pos(0, 0),
      this.k.rotate(0),
      this.k.scale(1),
    ]);

    if (this.options.pos) {
      this.rootEntity.pos = this.options.pos;
    }

    if (this.options.world) {
      this.worldIndex = this.options.world;
    }

    if (this.options.levelOffset) {
      this.levelOffset = this.options.levelOffset;
    }

    this.assets = new LDTKAssetStorage(this.k);
  }

  /**
   * Registers an entity for use in the LDTK project.
   * This allows you to define custom init and post-init logic for entities.
   *
   * @param {string} entityName - The name of the entity to register. This should match the entity's name in the LDTK level editor.
   * @param {(data: LDTKEntity) => void} initializer - A function that will be called when an entity of this type is created.
   *   This function receives the entity's data as an option, allowing you to set up the entity.
   * @param {(data: LDTKEntity) => void} [postInit] - An optional function that will be called after the level is done loading.
   *   This can be used for editing other entities, as all entities are spawned in now, thus accessing them shouldn't give null.
   */
  public registerEntity(
    entityName: string,
    initializer: (data: LDTKEntity) => void,
    postInit?: (data: LDTKEntity) => void
  ) {
    this.entities[entityName] = {
      init: initializer,
    };
    if (postInit) {
      this.entities[entityName].postInit = postInit;
    }
  }

  /**
   * Registers an init function for creating custom IntGrid tiles.
   * This function is called when a new IntGrid tile is created, allowing you to choose what it does.
   *
   * @param {(data: LDTKIntGridTile) => void} initializer A function that is called when a new IntGrid tile is created.
   */
  public registerIntGrid(initializer: (data: LDTKIntGridTile) => void) {
    this.intGridTiles.push(initializer);
  }

  protected getSafeString(context: string) {
    return `kapldtk-${this.levelid}-${context}`;
  }

  protected throwError(error: Error) {
    this.k.debug.error(
      `Failed to load LDTK project: ${error.name}: ${error.message}`
    );
    console.error(error);
  }

  protected getLevelSize(world: World, level: Level): Vec2 {
    if (this.layout == WorldLayout.GridVania) {
      return this.k.vec2(world.worldGridWidth, world.worldGridHeight);
    }
    return this.k.vec2(level.pxWid, level.pxHei);
  }

  protected loadLayerEntities(
    layer: LayerInstance,
    levelPos: Vec2,
    level: Level
  ) {
    for (const ent of layer.entityInstances) {
      const fields = level.fieldInstances;
      fields.push(...ent.fieldInstances);
      const entity = new LDTKEntity({
        name: ent.__identifier,
        pos: this.k.vec2(ent.px[0], ent.px[1]).add(levelPos),
        size: this.k.vec2(ent.width ?? 0, ent.height ?? 0),
        fieldsRaw: fields,
        LDTKSceneObject: this.rootEntity,
        id: ent.iid,
        assets: this.assets,
        k: this.k,
        fields: fields.reduce(
          (acc, field) => ({ ...acc, [field.__identifier]: field.__value }),
          {}
        ),
      });
      let entityScripts = this.entities[entity.name];
      if (entityScripts) {
        entityScripts.init(entity);
        if (entityScripts.postInit) {
          this.postProcessEntities[entity.id] = {
            postInit: entityScripts.postInit,
            entityClass: entity,
          };
        }
      } else {
        this.throwError(new Error(`No entity registered for ${entity.name}`));
      }
    }
  }

  protected postProcessEntitiesOnSpawn() {
    for (const entity of Object.values(this.postProcessEntities)) {
      entity.postInit(entity.entityClass);
    }
    this.postProcessEntities = {};
  }

  protected loadIntGridTiles(layer: LayerInstance, levelPos: Vec2) {
    let p = 0;
    for (const tile of layer.intGridCsv) {
      for (const tileScript of this.intGridTiles) {
        const posMax = layer.__cWid * layer.__gridSize;
        const xPos = (p * layer.__gridSize) % posMax;
        const yPos =
          Math.floor((p * layer.__gridSize) / posMax) * layer.__gridSize;
        const pos = this.k.vec2(xPos, yPos).add(levelPos);

        tileScript(
          new LDTKIntGridTile({
            id: layer.__identifier,
            pos: pos,
            size: this.k.vec2(layer.__gridSize, layer.__gridSize),
            value: tile,
            LDTKSceneObject: this.rootEntity,
            assets: this.assets,
          })
        );
      }
      p++;
    }
  }

  protected async loadTiles(layer: LayerInstance, levelPos: Vec2) {
    let tiles: TileInstance[] = [];

    if (layer.__type == Type.Tiles) tiles = layer.gridTiles;
    if (layer.__type == Type.AutoLayer) tiles = layer.autoLayerTiles;

    if (!this.assets.assetExists(layer.__tilesetRelPath!)) {
      this.throwError(
        new Error(
          `Tileset "${layer.__tilesetRelPath}" not found for layer "${layer.__identifier}".`
        )
      );
      return;
    }

    for (const tile of tiles) {
      let flipint = tile.f;
      // f=0 (no flip), f=1 (X flip only), f=2 (Y flip only), f=3 (both flips)
      let flipX = flipint & 1 ? true : false;
      let flipY = flipint & 2 ? true : false;

      const texAsset = this.assets.getSprite(layer.__tilesetRelPath!);

      if (!texAsset) {
        this.throwError(
          new Error(
            `Sprite for tileset "${layer.__tilesetRelPath}" not found for layer "${layer.__identifier}".`
          )
        );
        return;
      }

      const pos = this.k.vec2(tile.px[0], tile.px[1]).add(levelPos);

      this.rootEntity.onDraw(() =>
        this.k.drawSprite({
          sprite: texAsset,
          quad: this.assets.getQuad(
            layer.__tilesetRelPath!,
            this.k.vec2(
              tile.src[0] / layer.__gridSize,
              tile.src[1] / layer.__gridSize
            )
          )!,
          flipX,
          flipY,
          pos,
          opacity: tile.a,
          width: layer.__gridSize,
          height: layer.__gridSize,
        })
      );
    }
  }

  protected setRootUrl(url: string) {
    this.rootUrl = (
      (url.includes("/") ? url.replace(/\/[^\/]*$/, "/") : "") || "./"
    ).replace(/^(?!\/)(\/)/, "./$1");
  }

  protected setLDTKLFolder(url: string) {
    this.LDTKLFolder = url.replace(/\.[^/.]+$/, "");
  }

  protected loadTileSets() {
    for (const tileset of this.data?.defs.tilesets || []) {
      if (tileset.relPath) {
        this.assets.addAsset(tileset.relPath, {
          name: tileset.relPath,
          size: this.k.vec2(tileset.pxWid, tileset.pxHei),
          tileSize: this.k.vec2(
            tileset.pxWid / tileset.__cWid,
            tileset.pxHei / tileset.__cHei
          ),
          spacing: tileset.spacing,
          padding: tileset.padding,
          uid: tileset.uid,
          data: new this.k.Asset<SpriteData>(
            this.k.SpriteData.from(this.rootUrl + tileset.relPath)
          ),
        });
      }
    }
  }

  /**
   * Loads an LDTK project from an object that you provide.
   *
   * @param ldtkProject The LDTK project data variable object.
   */
  public async loadFromObject(ldtkProject: LDTKJSONRoot) {
    this.data = ldtkProject;

    if (this.data.externalLevels) {
      let LDTKLLevels: string[] = [];
      for (const level of this.data.levels) {
        LDTKLLevels.push(level.externalRelPath!);
      }

      let levels: Level[] = [];

      for (const level of LDTKLLevels) {
        const [data, error] = await safe(fetch(this.rootUrl + level));
        if (error) {
          this.throwError(error);
          return;
        }

        const json = await data.json();

        const ldtkldata: Level = json;
        levels.push(ldtkldata);
      }
      this.data.levels = levels;
    }

    this.loadTileSets();
  }

  /**
   * Loads an LDTK project from the internet.
   *
   * @param url The URL of the LDTK project file (JSON).
   */
  public async loadFromURL(url: string) {
    if (!this.options.rootUrl) {
      this.setRootUrl(url);
    }

    if (!this.options.levelFolder) {
      this.setLDTKLFolder(url);
    }

    const [data, error] = await safe(fetch(url));

    if (error) {
      this.throwError(error);
      return;
    }

    const [json, err] = await safe(data.json());

    if (err) {
      this.throwError(err);
      return;
    }

    await this.loadFromObject(json);
  }

  /**
   * Spawns the LDTK level in the Scene.
   *
   * @remarks
   * This function requires that all LDTK data has been loaded using `loadFromObject` or `loadFromURL`.
   * It also requires that entities have already been registered using `registerEntity`
   * and IntGrids have been registered using `registerIntGrid`.
   *
   * @throws {Error} If LDTK data has not been loaded.
   */
  public spawn() {
    if (!this.data) {
      this.throwError(
        new Error(
          "LDTK data not loaded. Call loadFromObject or loadFromURL first."
        )
      );
      return;
    }

    if (this.data.worlds.length === 0) {
      this.worlds = [
        {
          iid: crypto.randomUUID(),
          identifier: "World",
          worldGridWidth: this.data.worldGridWidth ?? 256,
          worldGridHeight: this.data.worldGridHeight ?? 256,
          worldLayout: this.data.worldLayout as WorldLayout,
          levels: this.data.levels,
          defaultLevelHeight: this.data.defaultLevelHeight ?? 256,
          defaultLevelWidth: this.data.defaultLevelWidth ?? 256,
        },
      ];
    } else {
      this.worlds = this.data.worlds;
    }
    this.world = this.worlds[this.worldIndex];
    this.layout = this.world.worldLayout as WorldLayout; // it wants null for some reason, so go ahead

    let levels = this.world.levels;
    levels.sort((a, b) => a.worldDepth - b.worldDepth);

    for (const level of levels) {
      let levelPos = this.k.vec2(level.worldX, level.worldY);

      if (this.layout == WorldLayout.LinearHorizontal) {
        levelPos = this.k.vec2(0, 0);
        for (const l of levels) {
          if (l.iid == level.iid) break;
          levelPos.x += l.pxWid;
          levelPos.x += this.levelOffset;
        }
      }

      if (this.layout == WorldLayout.LinearVertical) {
        levelPos = this.k.vec2(0, 0);
        for (const l of levels) {
          if (l.iid == level.iid) break;
          levelPos.y += l.pxHei;
          levelPos.y += this.levelOffset;
        }
      }

      this.rootEntity.onDraw(() => {
        this.k.drawRect({
          pos: levelPos,
          width: level.pxWid,
          height: level.pxHei,
          //@ts-expect-error
          color: this.k.color(level.__bgColor).color, // Laj, please please please, HEX codes are colours
        });
      });
      if (level.bgRelPath) {
        const spr = new this.k.Asset<SpriteData>(
          this.k.SpriteData.from(this.rootUrl + level.bgRelPath)
        );
        this.rootEntity.onDraw(() => {
          const opt: DrawSpriteOpt = {
            pos: this.k.vec2(
              levelPos.x + (level.__bgPos?.topLeftPx[0] ?? 0),
              levelPos.y + (level.__bgPos?.topLeftPx[1] ?? 0)
            ),
            scale: this.k.vec2(
              level.__bgPos?.scale[0] ?? 1,
              level.__bgPos?.scale[1] ?? 1
            ),
            sprite: spr, //this.getSafeString(`${level.iid}-level_bgimg`),
          };
          this.k.drawSprite(opt);
        });
      }
      for (const layer of level.layerInstances?.reverse() || []) {
        if (layer.__type == Type.Entities)
          this.loadLayerEntities(layer, levelPos, level);
        if (layer.__type == Type.IntGrid)
          this.loadIntGridTiles(layer, levelPos);
        if (layer.__type == Type.Tiles || layer.__type == Type.AutoLayer)
          this.loadTiles(layer, levelPos);
      }
    }
    this.postProcessEntitiesOnSpawn();
  }
}
