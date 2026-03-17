import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
});

// Mock next/navigation globally
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next/link as a simple anchor
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Mock next/dynamic to render the component directly
vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<any>, _options?: any) => {
    let Component: any = null;
    loader().then((mod: any) => {
      Component = mod.default || mod;
    });
    return function DynamicWrapper(props: any) {
      if (!Component) return null;
      return <Component {...props} />;
    };
  },
}));
