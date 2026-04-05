import type { Metadata } from "next";
import { DocsClient } from "./docs-client";

export const metadata: Metadata = {
  title: "LightBird Docs",
  description:
    "Documentation for LightBird — a client-side video player engine.",
};

export default function DocsPage() {
  return <DocsClient />;
}
