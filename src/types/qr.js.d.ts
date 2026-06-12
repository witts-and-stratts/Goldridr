declare module "qr.js/lib/ErrorCorrectLevel" {
  const levels: Record<"L" | "M" | "Q" | "H", number>;
  export default levels;
}

declare module "qr.js/lib/QRCode" {
  export default class QRCodeGenerator {
    modules: boolean[][];

    constructor( typeNumber: number, errorCorrectLevel: number );
    addData( value: string ): void;
    make(): void;
  }
}
