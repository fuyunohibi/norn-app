/**
 * Regular expression for validating usernames.
 *
 * Rules:
 * - Must only contain lowercase letters (a-z), numbers (0-9), underscores (_), or dots (.).
 * - Must contain at least one letter (a-z).
 * - Cannot start with a dot (.).
 * - Cannot end with a dot (.).
 * - Cannot contain consecutive dots (e.g., "..").
 * - Can start or end with an underscore (_).
 * - Cannot be only numbers.
 * - Must be between 3 and 30 characters long when used with additional length validation.
 *
 * Example Valid Usernames:
 * - "username"
 * - "_user.name"
 * - "user_name123"
 * - "user.name_"
 * - "user.name._"
 * - "user123"
 *
 * Example Invalid Usernames:
 * - "12345" (contains only numbers)
 * - ".username" (starts with a dot)
 * - "username." (ends with a dot)
 * - "user..name" (contains consecutive dots)
 * - "12.34" (no letters present)
 */
export const USERNAME_REGEX =
  /^(?!.*\.\.)(?!.*\.$)(?=.*[a-z])[a-z0-9_]+(?:\.[a-z0-9_]+)*$/;

/**
 * Regular expression for validating passwords.
 *
 * Rules enforced by this regex:
 * - Must contain at least 1 letter (uppercase or lowercase).
 * - Must contain at least 1 number or 1 symbol from the allowed set (+ # ? ! @ %).
 * - Does not enforce length (length validation, e.g., 8-20 characters, must be handled separately).
 *
 * Example Valid Passwords (if length validation is also applied separately):
 * - "abc123!!" (8 characters, contains letters, numbers, and a symbol)
 * - "password1!" (10 characters, contains letters, numbers, and a symbol)
 * - "my_pass+123" (11 characters, contains letters, symbols, and numbers)
 *
 * Example Invalid Passwords:
 * - "123456" (no letters)
 * - "abcdef" (no numbers or symbols)
 * - "abc123!" (only 7 characters if length validation is applied)
 *
 * Notes:
 * - This regex is designed to work with additional length validation in the schema or logic.
 */
export const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*[\d+#?!@%])/;
