export type ParsedRiotId = {
  gameName: string;
  tagLine: string;
};

export function parseRiotId(value: string): ParsedRiotId {
  const separator = value.lastIndexOf('#');
  const gameName = value.slice(0, separator).trim();
  const tagLine = value.slice(separator + 1).trim();
  if (
    separator < 1 ||
    gameName.length < 3 ||
    gameName.length > 16 ||
    tagLine.length < 3 ||
    tagLine.length > 5 ||
    !/^[\p{L}\p{N}]+(?: [\p{L}\p{N}]+)*$/u.test(tagLine)
  ) {
    throw new Error(`Riot ID inválido: ${value}`);
  }
  return { gameName, tagLine };
}