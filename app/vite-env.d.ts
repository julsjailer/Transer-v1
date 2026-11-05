/// <reference types="vite/client" />

declare module "react-dom/server.browser" {
  export * from "react-dom/server";
  export { default } from "react-dom/server";
}

declare module "@tabler/icons-react/dist/esm/icons/*.mjs" {
  import type { ComponentType, SVGProps } from "react";
  const Icon: ComponentType<Omit<SVGProps<SVGSVGElement>, "stroke"> & { size?: string | number; stroke?: string | number }>;
  export default Icon;
}
