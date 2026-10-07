/** Account-deletion confirmation gate — destructive action requires typing
 *  the phrase explicitly; a stray tap can never trigger it. */
export const DELETE_CONFIRM_PHRASE = 'DELETE';

export function isDeleteConfirmed(input: string): boolean {
  return input.trim().toUpperCase() === DELETE_CONFIRM_PHRASE;
}
