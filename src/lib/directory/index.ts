import { config } from "@/lib/config";
import type { DirectoryProvider } from "./types";
import { bamboohrProvider } from "./adapters/bamboohr";

/** No directory configured — sync is unavailable. */
const disabledProvider: DirectoryProvider = {
  name: "none",
  enabled: false,
  async fetchEmployees() {
    throw new Error("No directory provider configured (set DIRECTORY_MODE).");
  },
};

function resolveProvider(): DirectoryProvider {
  switch (config.directory.mode) {
    case "bamboohr":
      return bamboohrProvider;
    default:
      return disabledProvider;
  }
}

export const directory: DirectoryProvider = resolveProvider();
export type { DirectoryProvider, DirectoryEmployee } from "./types";
