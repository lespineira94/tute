// Tipos para los palos de la baraja española
export type Suit = 'oros' | 'copas' | 'espadas' | 'bastos';

// Números válidos en baraja de 40 cartas (sin 8 y 9)
export type CardNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 10 | 11 | 12;

// Representa una carta individual
export interface Card {
  id: string;           // Ej: "oros-1", "copas-12"
  suit: Suit;
  number: CardNumber;
  value: number;        // Puntos: As=11, 3=10, Rey=4, Caballo=3, Sota=2, resto=0
}

// Nombres de las figuras
export type FigureName = 'As' | 'Sota' | 'Caballo' | 'Rey';

// Información de una carta para mostrar
export interface CardDisplay {
  card: Card;
  faceUp: boolean;
  playable: boolean;
  selected: boolean;
}
