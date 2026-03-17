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
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Mock next/dynamic to render the component directly
vi.mock("next/dynamic", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: (loader: () => Promise<{ default?: React.ComponentType<any> } & Record<string, unknown>>) => {
    let Component: React.ComponentType | null = null;
    loader().then((mod) => {
      Component = (mod.default || mod) as React.ComponentType;
    });
    return function DynamicWrapper(props: Record<string, unknown>) {
      if (!Component) return null;
      return <Component {...props} />;
    };
  },
}));
