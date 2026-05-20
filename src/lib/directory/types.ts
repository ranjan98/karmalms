/**
 * Directory provider contract — pulls an org's people from an HRIS so users,
 * reporting lines, and departments stay in sync without manual entry.
 * Same bring-your-own pattern as the auth / storage / LLM adapters.
 */

export interface DirectoryEmployee {
  /** Stable id from the HRIS. */
  externalId: string;
  email: string;
  name?: string;
  department?: string;
  /** HRIS id of this employee's manager, if any. */
  managerExternalId?: string;
}

export interface DirectoryProvider {
  readonly name: string;
  readonly enabled: boolean;
  fetchEmployees(): Promise<DirectoryEmployee[]>;
}
