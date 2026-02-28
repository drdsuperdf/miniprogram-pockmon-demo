export interface NamedAPIResource {
  name: string;
  url: string;
}

export interface PokemonListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: NamedAPIResource[];
}

export interface PokemonTypeResponse {
  pokemon: {
    pokemon: NamedAPIResource;
    slot: number;
  }[];
}

export interface PokemonSprites {
  front_default: string;
  // 可根据需要添加其他
}

export interface PokemonAbility {
  ability: NamedAPIResource;
  is_hidden: boolean;
  slot: number;
}

export interface Pokemon {
  id: number;
  name: string;
  sprites: PokemonSprites;
  abilities: PokemonAbility[];
}

export interface Type {
  id: number;
  name: string;
}