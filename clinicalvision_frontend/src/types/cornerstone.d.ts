// Type declarations for Cornerstone.js medical imaging libraries
// These libraries don't have official TypeScript definitions

declare module 'cornerstone-core' {
  export interface Viewport {
    scale: number;
    translation: { x: number; y: number };
    voi: {
      windowWidth: number;
      windowCenter: number;
    };
    invert: boolean;
    pixelReplication: boolean;
    rotation: number;
    hflip: boolean;
    vflip: boolean;
    modalityLUT?: any;
    voiLUT?: any;
  }

  export interface Image {
    imageId: string;
    minPixelValue: number;
    maxPixelValue: number;
    slope: number;
    intercept: number;
    windowCenter: number;
    windowWidth: number;
    render: any;
    getPixelData: () => any;
    rows: number;
    columns: number;
    height: number;
    width: number;
    color: boolean;
    columnPixelSpacing: number;
    rowPixelSpacing: number;
    sizeInBytes: number;
  }

  export function enable(element: HTMLElement): void;
  export function disable(element: HTMLElement): void;
  export function displayImage(element: HTMLElement, image: Image, viewport?: Viewport): void;
  export function loadImage(imageId: string): Promise<Image>;
  export function getViewport(element: HTMLElement): Viewport | undefined;
  export function setViewport(element: HTMLElement, viewport: Viewport): void;
  export function reset(element: HTMLElement): void;
  export function resize(element: HTMLElement, forcedResize?: boolean): void;
  export function draw(element: HTMLElement): void;
  export function getEnabledElement(element: HTMLElement): any;
  export function invalidate(element: HTMLElement): void;
  
  export const events: {
    IMAGE_RENDERED: string;
    NEW_IMAGE: string;
    IMAGE_LOADED: string;
    ELEMENT_ENABLED: string;
    ELEMENT_DISABLED: string;
  };
}

declare module 'cornerstone-tools' {
  export const external: {
    cornerstone: any;
    cornerstoneMath: any;
    Hammer: any;
  };

  export function init(config?: any): void;
  export function addTool(tool: any, options?: any): void;
  export function setToolActive(toolName: string, options?: any): void;
  export function setToolPassive(toolName: string): void;
  export function setToolEnabled(toolName: string): void;
  export function setToolDisabled(toolName: string): void;
  export function addStackStateManager(element: HTMLElement, tools: string[]): void;
  export function addToolState(element: HTMLElement, toolType: string, data: any): void;
  export function getToolState(element: HTMLElement, toolType: string): any;
  export function removeToolState(element: HTMLElement, toolType: string, data: any): void;
  export function clearToolState(element: HTMLElement, toolType: string): void;

  export class PanTool {
    static toolName: string;
  }

  export class ZoomTool {
    static toolName: string;
  }

  export class WwwcTool {
    static toolName: string;
  }

  export class LengthTool {
    static toolName: string;
  }

  export class AngleTool {
    static toolName: string;
  }

  export class MagnifyTool {
    static toolName: string;
  }

  export class RectangleRoiTool {
    static toolName: string;
  }

  export class EllipticalRoiTool {
    static toolName: string;
  }
}

declare module 'cornerstone-wado-image-loader' {
  export const external: {
    cornerstone: any;
    dicomParser: any;
  };

  export function configure(config: {
    useWebWorkers?: boolean;
    decodeConfig?: {
      convertFloatPixelDataToInt?: boolean;
      use16BitDataType?: boolean;
    };
    beforeSend?: (xhr: XMLHttpRequest) => void;
    errorInterceptor?: (error: any) => any;
  }): void;

  export const wadouri: {
    fileManager: {
      add: (file: File) => string;
      get: (imageId: string) => File;
      remove: (imageId: string) => void;
      purge: () => void;
    };
    dataSetCacheManager: any;
    register: (cornerstone: any) => void;
  };

  export function loadImage(imageId: string, options?: any): Promise<any>;
}

declare module 'dicom-parser' {
  export interface DataSet {
    byteArray: Uint8Array;
    elements: any;
    warnings: string[];
    string(tag: string): string | undefined;
    uint16(tag: string): number | undefined;
    uint32(tag: string): number | undefined;
    float(tag: string): number | undefined;
    double(tag: string): number | undefined;
  }

  export function parseDicom(byteArray: Uint8Array, options?: any): DataSet;
  export function readEncapsulatedPixelData(dataSet: DataSet, pixelDataElement: any, frame?: number): any;
  export function readEncapsulatedImageFrame(dataSet: DataSet, pixelDataElement: any, frame: number): any;
}

declare module 'cornerstone-math' {
  export interface Vector2 {
    x: number;
    y: number;
  }

  export interface Vector3 {
    x: number;
    y: number;
    z: number;
  }

  export namespace point {
    function distance(from: Vector2, to: Vector2): number;
    function distanceSquared(from: Vector2, to: Vector2): number;
  }

  export namespace lineSegment {
    function distanceToPoint(start: Vector2, end: Vector2, point: Vector2): number;
  }

  export namespace rectangle {
    function distanceToPoint(rect: any, point: Vector2): number;
  }
}

declare module 'hammerjs' {
  export default class Hammer {
    constructor(element: HTMLElement, options?: any);
    on(events: string, handler: (event: any) => void): void;
    off(events: string, handler?: (event: any) => void): void;
    destroy(): void;
    get(recognizer: string): any;
    set(options: any): this;
    add(recognizer: any): any;
    remove(recognizer: any): void;
  }

  export namespace Hammer {
    export class Manager {
      constructor(element: HTMLElement, options?: any);
    }
    export class Tap {}
    export class Pan {}
    export class Swipe {}
    export class Pinch {}
    export class Rotate {}
    export class Press {}
  }
}
