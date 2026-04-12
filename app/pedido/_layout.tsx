import { Stack } from 'expo-router';

export default function PedidoLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="novo" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="editar/[id]" />
    </Stack>
  );
}
