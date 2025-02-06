import type { CompilerOptions } from 'typescript';

const config = {
  compilerOptions: {
    target: "ES2020" as const,
    useDefineForClassFields: true,
    lib: ["ES2020", "DOM", "DOM.Iterable"],
    module: "ESNext" as const,
    skipLibCheck: true,
    moduleResolution: "bundler" as const,
    allowImportingTsExtensions: true,
    resolveJsonModule: true,
    isolatedModules: true,
    noEmit: true,
    jsx: "react-jsx" as const,
    strict: true,
    noUnusedLocals: true,
    noUnusedParameters: true,
    noFallthroughCasesInSwitch: true,
    allowJs: true,
    esModuleInterop: true,
    baseUrl: ".",
    paths: {
      "@/*": ["src/*"]
    }
  },
  include: ["src"],
} as const;

export default config;
