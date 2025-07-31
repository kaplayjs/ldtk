import type { KAPLAYCtx } from "kaplay";
import { LDTKProject, type LDTKOptions } from "./LDTK";

export * from "./LDTK";
export * from "./LDTKFormat";

export default function LDTK(k: KAPLAYCtx) {
  return {
    addLDTKProject(options?: LDTKOptions) {
      return new LDTKProject(k, options);
    },
  };
}
