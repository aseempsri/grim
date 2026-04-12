/** Client-side delete confirmation phrase. Not a substitute for server auth. */
export const DELETE_CONFIRMATION_PASSWORD = "garimarealty";

export function isDeletePasswordValid(input: string): boolean {
  return input === DELETE_CONFIRMATION_PASSWORD;
}
