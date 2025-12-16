# Tute Mobile (React Native)

Guía rápida para crear un repositorio separado con la versión móvil en React Native.

## Cómo crear el nuevo repositorio

1. Crea un repositorio vacío llamado `tute-mobile`.
2. Inicializa el proyecto con Expo y TypeScript:

   ```bash
   npx create-expo-app tute-mobile --template expo-template-blank-typescript
   cd tute-mobile
   npm install partysocket
   ```

3. Copia la lógica compartida desde este proyecto web (mazo, reglas y tipos):
   - `src/utils/deck.ts`
   - `src/utils/rules.ts`
   - `src/types/*`

4. Configura la URL del servidor PartyKit usando variables de entorno:

   ```env
   PARTYKIT_HOST=ws://localhost:1999 # o la URL desplegada
   ```

## Ejemplo mínimo de `App.tsx`

```tsx
import { useEffect, useState } from "react";
import { SafeAreaView, Text, Button } from "react-native";
import PartySocket from "partysocket";

export default function App() {
  const [status, setStatus] = useState("Conectando...");

  useEffect(() => {
    const socket = new PartySocket({
      host: process.env.PARTYKIT_HOST ?? "ws://localhost:1999",
      room: "lobby",
    });

    socket.addEventListener("open", () => setStatus("Conectado al lobby"));
    socket.addEventListener("close", () => setStatus("Desconectado"));
    socket.addEventListener("message", (event) => {
      console.log("Mensaje", event.data);
    });

    return () => socket.close();
  }, []);

  return (
    <SafeAreaView
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0b132b",
      }}
    >
      <Text style={{ color: "#f0f4f8", fontSize: 20, marginBottom: 12 }}>
        Tute móvil (React Native)
      </Text>
      <Text style={{ color: "#f0f4f8" }}>{status}</Text>
      <Button title="Refrescar estado" onPress={() => {}} />
    </SafeAreaView>
  );
}
```

Con estos pasos tienes un punto de partida para la app móvil reutilizando el backend y lógica del proyecto principal.
