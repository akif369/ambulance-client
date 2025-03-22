import { useState } from "react";
import { useRouter } from "expo-router";
import { Text, TouchableWithoutFeedback, View, Image, TouchableHighlight, ActivityIndicator } from "react-native";
import Svg, { Path } from "react-native-svg";

export default function Login() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleRegister = () => {
    setLoading(true);
    // setTimeout(() => {
      setLoading(false);
      router.push("/register");
    // }, 2400);
  };

  const handleLogin = () => {
    router.push("/login");
  };

  const handleClose = () => {
    console.log("Close button clicked");
  };

  return (
    <View className="flex-1 bg-[#1A4041] justify-evenly items-stretch">
      {/* Help Button */}
      <TouchableWithoutFeedback onPress={() => console.log("Help box is opened")}>
        <Text className="absolute top-5 left-5 font-semibold text-white text-lg opacity-90">Help?</Text>
      </TouchableWithoutFeedback>

      {/* Close Button with SVG */}
      <TouchableWithoutFeedback onPress={handleClose}>
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
          className="bg-slate-100 px-10 py-safe-offset-3 rounded"
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
