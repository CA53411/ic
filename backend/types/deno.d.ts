
declare namespace Deno {
  export function serve(handler: (req: Request) => Response | Promise<Response>): void;
  export function env(name: string): string | undefined;
}
declare const crypto: Crypto;
