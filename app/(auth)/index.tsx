import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Text, TouchableWithoutFeedback, View, Image, TouchableHighlight, ActivityIndicator, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Svg, { Path } from "react-native-svg";

export default function Login() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true); // To handle initial token check

  useEffect(() => {


    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          setCheckingAuth(false);
          return;
        }

        // Verify token with the backend
        const response = await fetch("http://192.168.52.61:3000/verify-token", { // Replace with your local IP
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();
        if (response.ok) {
          router.replace("/(home)"); // Redirect to home page
        } else {
          await AsyncStorage.removeItem("token"); // Remove invalid token
        }
      } catch (error) {
        console.log("Token verification failed:", error);
      }
      setCheckingAuth(false);
    };

    checkAuth();
  }, []);

  const handleRegister = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push("/register");
    }, 1500);
  };

  const handleLogin = () => {
    router.push("/login");
  };

  if (checkingAuth) {
    return (
      <View className="flex-1 justify-center items-center bg-[#1A4041]">
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#1A4041] justify-evenly items-stretch">
      {/* Help Button */}
      <TouchableWithoutFeedback onPress={() => router.push("/(driver)/register")}>
        <Text  className="absolute top-5 left-5 font-semibold text-white text-lg opacity-90">Help?</Text>
      </TouchableWithoutFeedback>

      {/* Close Button */}
      <TouchableWithoutFeedback onPress={() => console.log("Close button clicked")}>
        <View className="absolute top-5 right-5 my-1">
          <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M18 6L6 18M6 6l12 12" />
          </Svg>
        </View>
      </TouchableWithoutFeedback>

      {/* Center Content */}
      <View className="items-center">
        <Image source={require('@/assets/images/logo-main.png')} />
        <Text className="text-white text-center font-bold text-4xl font-[Inter]">WE ENSURE YOUR LIFE</Text>
      </View>

      {/* Buttons */}
      <View className="mx-14">
        <TouchableHighlight
          className="bg-slate-100 px-10 py-3 rounded"
          underlayColor="#fff"
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="large" className="h-8" color="#1A4041" />
          ) : (
            <Text className="text-3xl font-bold text-[#1A4041] text-center">Register</Text>
          )}
        </TouchableHighlight>

        <TouchableWithoutFeedback onPress={handleLogin}>
          <Text className="text-white text-2xl font-bold text-center p-2">Log In</Text>
        </TouchableWithoutFeedback>
      </View>
    </View>
  );
}
