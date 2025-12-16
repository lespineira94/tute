# Tute por Parejas

Juego de cartas español multijugador online usando React, TypeScript, Tailwind CSS y PartyKit.

## Características

- 🃏 Baraja española de 40 cartas renderizada en CSS puro
- 👥 Multijugador para 4 jugadores (2 equipos)
- 🔗 Sistema de salas con códigos para unirse
- ⚡ Tiempo real con WebSockets (PartyKit)
- 📱 Diseño responsive

## Reglas del Tute

- Cada jugador recibe 10 cartas
- El triunfo se determina por la última carta repartida
- Juego en sentido antihorario
- Sistema de cantes: 20, 40 y Tute
- Gana el equipo que llegue primero a 3 rondas

## Desarrollo

### Requisitos

- Node.js 18+
- npm

### Instalación

```bash
npm install
```

### Ejecutar en desarrollo

```bash
# Ejecutar frontend y servidor PartyKit simultáneamente
npm run dev:all

# O por separado:
npm run dev         # Frontend (Vite) en http://localhost:5173
npm run dev:party   # Servidor PartyKit en http://localhost:1999
```

### Build de producción

```bash
npm run build
```

### Desplegar servidor PartyKit

```bash
npm run deploy:party
```

## Estructura del proyecto

```
tute/
├── src/
│   ├── components/     # Componentes React
│   │   ├── Card.tsx           # Carta española CSS
│   │   ├── PlayerHand.tsx     # Mano del jugador
│   │   ├── GameBoard.tsx      # Tablero de juego
│   │   ├── Lobby.tsx          # Pantalla inicial
│   │   ├── WaitingRoom.tsx    # Sala de espera
│   │   └── ...
│   ├── hooks/          # Hooks personalizados
│   │   └── useGameConnection.ts  # Conexión WebSocket
│   ├── types/          # Tipos TypeScript
│   ├── utils/          # Utilidades
│   │   ├── deck.ts     # Lógica del mazo
│   │   └── rules.ts    # Reglas del Tute
│   └── constants/      # Constantes (valores de cartas)
├── party/
│   └── server.ts       # Servidor PartyKit (lógica multijugador)
└── package.json
```

## Tecnologías

- **Frontend**: React 19, TypeScript, Tailwind CSS 4
- **Backend**: PartyKit (WebSockets en edge)
- **Build**: Vite 7
