import { config } from "@/lib/config";
import type { DirectoryProvider, DirectoryEmployee } from "../types";

/**
 * BambooHR directory adapter. Pulls the workforce in one call via the custom
 * report endpoint, requesting the fields KarmaLMS needs — including
 * `supervisorEId` so reporting lines map onto `users.managerId`.
 *
 * Config: BAMBOOHR_SUBDOMAIN, BAMBOOHR_API_KEY (HTTP Basic, key as username).
 */
export const bamboohrProvider: DirectoryProvider = {
  name: "bamboohr",
  enabled:
    config.directory.mode === "bamboohr" &&
    Boolean(
      config.directory.bamboohr.subdomain && config.directory.bamboohr.apiKey,
    ),

  async fetchEmployees(): Promise<DirectoryEmployee[]> {
    const { subdomain, apiKey } = config.directory.bamboohr;
    const auth = Buffer.from(`${apiKey}:x`).toString("base64");

    const res = await fetch(
      `https://api.bamboohr.com/api/gateway.php/${subdomain}/v1/reports/custom?format=JSON`,
      {
        method: "POST",
        headers: {
          authorization: `Basic ${auth}`,
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          fields: ["workEmail", "displayName", "department", "supervisorEId"],
        }),
      },
    );

    if (!res.ok) {
      throw new Error(
        `BambooHR request failed (${res.status}): ${await res.text()}`,
      );
    }

    const data = (await res.json()) as {
      employees?: {
        id?: string | number;
        workEmail?: string;
        displayName?: string;
        department?: string;
        supervisorEId?: string | number;
      }[];
    };

    return (data.employees ?? [])
      .filter((e) => e.id != null && e.workEmail)
      .map((e) => ({
        externalId: String(e.id),
        email: String(e.workEmail),
        name: e.displayName ? String(e.displayName) : undefined,
        department: e.department ? String(e.department) : undefined,
        managerExternalId:
          e.supervisorEId != null ? String(e.supervisorEId) : undefined,
      }));
  },
};
