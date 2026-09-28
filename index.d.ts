// Type definitions for bezelkit — https://www.bezelkit.dev
// The element is registered as a side effect of importing the package.

export type FitMode = 'auto' | 'cover' | 'top' | 'contain' | 'scroll' | 'fill' | 'none';
export type DeviceKind = 'phone' | 'foldable' | 'tablet' | 'watch' | 'laptop' | 'desktop' | 'browser';
export type Side = 'front' | 'back' | 'both';

export interface Box { w: number; h: number }

export interface BezelFitDetail {
  requested: FitMode;
  /** The fit actually applied after `auto` resolution. */
  fit: Exclude<FitMode, 'auto'>;
  media: Box;
  screen: Box;
  mediaRatio: number;
  screenRatio: number;
  /** mediaRatio ÷ screenRatio. 1 = same shape; > 1 wider; < 1 taller. */
  mismatch: number;
}
export interface BezelFlipDetail { side: 'front' | 'back' }
export interface BezelFoldDetail { phase: 'start' | 'end'; folded: boolean; from: number; to: number }
export interface BezelLidDetail { angle: number; open: boolean }

export interface ScreenSpec { w: number; h: number; radius?: number }
export type Insets = number | { t?: number; r?: number; b?: number; l?: number };

/** Shape accepted by `defineDevice()`. Sizes are CSS px (Apple points / Android dp). */
export interface DeviceSpec {
  id: string;
  name?: string;
  brand?: string;
  kind?: DeviceKind;
  year?: number;
  dpr?: number;
  status?: string;
  screen: ScreenSpec;
  bezel?: Insets;
  rim?: number;
  bodyRadius?: number;
  pad?: Insets;
  cutout?: { type: 'island' | 'notch' | 'hole' | 'camera' | 'mac-notch'; w?: number; h?: number; d?: number; top?: number; side?: 'top' | 'left' | 'right' };
  safe?: { top?: number; bottom?: number; left?: number; right?: number };
  statusBar?: 'ios' | 'android' | 'ipados' | 'macos' | 'watch' | null;
  home?: 'indicator' | 'pill' | 'button' | null;
  buttons?: Array<{ side: 'left' | 'right' | 'top'; at: number; len: number; w?: number; flush?: boolean; crown?: boolean; color?: string }>;
  /** [name, frameColor, frontColor?, backColor?] — the first entry is the default. */
  colors?: Array<[string, string, string?, string?]>;
  [key: string]: unknown;
}

export declare function defineDevice(spec: DeviceSpec): Readonly<DeviceSpec>;
export declare function getDevice(idOrAlias: string): Readonly<DeviceSpec> | undefined;
export declare function listDevices(): Array<Readonly<DeviceSpec>>;
export declare function resolveFit(requested: FitMode, kind: 'image' | 'video', media: Box | null, box: Box): Exclude<FitMode, 'auto'>;

export declare class BezelDevice extends HTMLElement {
  device: string | null;
  src: string | null;
  type: 'image' | 'video' | 'iframe' | null;
  fit: FitMode | null;
  color: string | null;
  orientation: 'portrait' | 'landscape' | null;
  chrome: 'auto' | 'on' | 'off' | null;
  safeArea: 'auto' | 'pad' | 'none' | null;
  theme: 'light' | 'dark' | null;
  url: string | null;
  viewport: string | null;
  glare: string | null;
  shadow: 'none' | null;
  alt: string | null;
  side: Side | null;
  stack: 'left' | 'right' | null;
  logo: 'none' | 'dot' | null;
  variant: 'flat' | 'deck' | '3d' | null;
  rotateX: string | null;
  rotateY: string | null;
  lidAngle: string | null;
  interactive: string | null;
  folded: boolean;
  coverSrc: string | null;
  foldAngle: string | null;
  foldBox: 'pose' | 'fixed' | null;

  /** The resolved device definition. */
  readonly spec: Readonly<DeviceSpec>;
  /** The fit actually applied after `fit="auto"`. */
  readonly resolvedFit: Exclude<FitMode, 'auto'>;
  /** CSS px available to content in the current orientation. */
  readonly screenSize: Box;
  readonly hingeAngle: number;
  readonly pose: { rotateX: number; rotateY: number; lidAngle: number };

  flip(side?: 'front' | 'back'): Promise<'front' | 'back'>;
  fold(opts?: { duration?: number }): Promise<boolean>;
  unfold(opts?: { duration?: number }): Promise<boolean>;
  toggleFold(opts?: { duration?: number }): Promise<boolean>;
  open(): Promise<void>;
  close(): Promise<void>;

  addEventListener(type: 'bezel-fit', listener: (e: CustomEvent<BezelFitDetail>) => void, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: 'bezel-flip', listener: (e: CustomEvent<BezelFlipDetail>) => void, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: 'bezel-fold', listener: (e: CustomEvent<BezelFoldDetail>) => void, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: 'bezel-lid', listener: (e: CustomEvent<BezelLidDetail>) => void, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
}

declare global {
  interface HTMLElementTagNameMap { 'bezel-device': BezelDevice }
  interface HTMLElementEventMap {
    'bezel-fit': CustomEvent<BezelFitDetail>;
    'bezel-flip': CustomEvent<BezelFlipDetail>;
    'bezel-fold': CustomEvent<BezelFoldDetail>;
    'bezel-lid': CustomEvent<BezelLidDetail>;
  }
}
