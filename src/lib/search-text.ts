/** "/" joins words in names ("Dish/Spoon", "Author/Illustrator"). Search reads it as a space. */
export function foldSearchText(value: string) {
  return value.toLowerCase().replaceAll("/", " ").replace(/\s+/g, " ").trim();
}
