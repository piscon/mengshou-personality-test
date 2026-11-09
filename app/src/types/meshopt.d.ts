// @types/three 0.152 未给 meshopt 解码器模块提供类型，这里补一个够用的声明
declare module "three/examples/jsm/libs/meshopt_decoder.module.js" {
  export const MeshoptDecoder: {
    ready: Promise<void>;
    supported: boolean;
    decodeBuffer: (result: Uint8Array, count: number, size: number, source: Uint8Array, mode: string, filter?: string) => void;
    decodeGltfBuffer: (result: Uint8Array, count: number, size: number, source: Uint8Array, mode: string, filter?: string) => void;
    decodeGltfBufferAsync: (count: number, size: number, source: Uint8Array, mode: string, filter?: string) => Promise<Uint8Array>;
  };
}
