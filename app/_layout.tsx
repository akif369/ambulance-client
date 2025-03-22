import { Stack, Redirect } from "expo-router";
import { useState } from "react";
import "./global.css"
export default function RootLayout() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  

  
  return (
    <Stack screenOptions={{headerShown:false}}>
      {isLoggedIn ? (
        <Stack.Screen name="(home)" options={{ headerShown: false }} />
      ) : (
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      )}
    </Stack>
  );
}