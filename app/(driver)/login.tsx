import { SERVER_API_URL,SOCKET_API_URL } from "@env";


import { useState } from "react";
import { useRouter } from "expo-router";
import { 
  Text, 
  View, 
  TextInput, 
  TouchableHighlight, 
  ActivityIndicator, 
  Alert, 
  Image, 
  TouchableOpacity 
} from "react-native";
import Svg, { Path } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DriverLogin = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm]: any = useState({
    email: "",
    password: "",
  });

  const handleLogin = async () => {
    if (!form.email || !form.password) {
      Alert.alert("Error", "Both fields are required.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(SERVER_API_URL+"/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert("Success", "Login successful!");
        router.replace("/(driver)"); // Redirect to the driver dashboard

        await AsyncStorage.setItem("token", data.token);
        
      } else {
        Alert.alert("Error", data.message || "Login failed");
      }
    } catch (error) {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-[#1A4041] justify-evenly p-6">
      {/* Close Button */}
      <TouchableOpacity onPress={() => router.back()} className="absolute top-5 right-5">
        <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M18 6L6 18M6 6l12 12" />
        </Svg>
      </TouchableOpacity>

      {/* Logo */}
      <View className="items-center">
        <Image source={require("@/assets/images/logo-small.png")} className="h-40 w-40" resizeMode="contain" />
      </View>

      {/* Login Form */}
      <View className="mx-6">
        <TextInput
          placeholder="Email"
          keyboardType="email-address"
          className="bg-gray-200 text-gray-800 text-lg px-4 py-3 rounded-lg mb-3"
          value={form.email}
          onChangeText={(text) => setForm({ ...form, email: text })}
        />

        <TextInput
          placeholder="Password"
          secureTextEntry
          className="bg-gray-200 text-gray-800 text-lg px-4 py-3 rounded-lg mb-3"
          value={form.password}
          onChangeText={(text) => setForm({ ...form, password: text })}
        />

        {/* Forgot Password */}
        <TouchableOpacity onPress={() => router.push("/forgot-password")}>
          <Text className="text-white text-right opacity-80">Forgot Password?</Text>
        </TouchableOpacity>
      </View>

      {/* Login Button */}
      <View className="mb-7">
        <TouchableHighlight
          className="bg-white px-10 py-3 rounded-lg mx-6 mt-4"
          underlayColor="#ddd"
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="large" className="h-8" color="#1A4041" />
          ) : (
            <Text className="text-2xl font-bold text-[#1A4041] text-center">Login</Text>
          )}
        </TouchableHighlight>
      </View>
    </View>
  );
};

export default DriverLogin;
