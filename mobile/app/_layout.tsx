import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <Stack>
          <Stack.Screen name="(tabs)"    options={{ headerShown: false }} />
          <Stack.Screen name="auth"      options={{ headerShown: false }} />
          <Stack.Screen name="product/[id]" options={{ title: 'Product Details' }} />
          <Stack.Screen name="vendor/[id]"  options={{ title: 'Vendor Store'    }} />
          <Stack.Screen name="checkout"  options={{ title: 'Checkout' }} />
          <Stack.Screen name="payment"   options={{ title: 'Payment'  }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
